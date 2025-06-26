// Enhanced CVGO to YTO Converter Script - Complete Fixed Version with UI Updates

// Global variables
let cvgoData = null;
let inventoryData = null;
let posData = null;
let arData = null;
let productMapping = {};
let customerMapping = {};
let posRangeMapping = {};
let warnings = [];
let detectedTransactionTypes = new Set();

// Initialize reconciliation data
let reconciliationData = {
    fuelSale: { count: 0, total: 0 },
    selectSale: { count: 0, total: 0 },
    minusFromSales: { count: 0, total: 0 },
    saleTotal: { count: 0, total: 0 },
    exactPayment: { count: 0, total: 0 },
    paymentGross: { count: 0, total: 0 },
    minusFromPayment: { count: 0, total: 0 },
    oneOfTwoPayments: { count: 0, total: 0 },
    compareAgainstCashSale: { count: 0, total: 0 },
    vatExclude: { count: 0, total: 0 },
    vatTotal: { count: 0, total: 0 }
};

// Custom locations management
let customLocations = [
    { code: "BALOY", name: "Baloy Branch" },
    { code: "LAPASAN", name: "Lapasan Branch" },
    { code: "YACAPIN", name: "Yacapin Branch" },
    { code: "VAMENTA", name: "Vamenta Branch" }
];

// Location prefix mapping
function getLocationPrefix(locationCode) {
    const locationPrefixes = {
        'BALOY': 'BLY',
        'LAPASAN': 'LPN', 
        'YACAPIN': 'YCPN',
        'VAMENTA': 'VMNT'
    };
    return locationPrefixes[locationCode] || locationCode;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing converter...');
    
    setTimeout(() => {
        initializeEventListeners();
        loadConfiguration();
        initializeDefaultTransactionTypes();
        initializeAdvancedDefaults();
    }, 100);
});

function initializeDefaultTransactionTypes() {
    const container = document.getElementById('dynamic-checkboxes');
    if (container) {
        container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; grid-column: 1 / -1; text-align: center;">Upload CVGO file to detect transaction types</p>';
    }
    
    const controls = document.getElementById('transaction-controls');
    if (controls) {
        controls.style.display = 'none';
    }
    
    const infoSpan = document.querySelector('.transaction-types-info');
    if (infoSpan) {
        infoSpan.textContent = 'Auto-detected from your CVGO file';
        infoSpan.style.color = 'var(--text-muted)';
    }
}

// Toggle field edit mode
function toggleFieldEdit(fieldId) {
    const field = document.getElementById(fieldId);
    const editBtn = field.parentElement.querySelector('.edit-field-btn');
    
    if (field.readOnly) {
        field.readOnly = false;
        field.classList.remove('readonly-field');
        field.focus();
        field.select();
        editBtn.textContent = '✅ Save';
        editBtn.style.background = 'linear-gradient(135deg, var(--accent-success), #059669)';
        editBtn.style.color = 'white';
    } else {
        field.readOnly = true;
        field.classList.add('readonly-field');
        editBtn.textContent = '✏️ Edit';
        editBtn.style.background = 'var(--bg-secondary)';
        editBtn.style.color = 'var(--accent-primary)';
    }
}

// Show settings confirmation modal
function confirmAndStartConversion() {
    const location = document.getElementById('location-select').value;
    
    // Check if location is selected
    if (!location) {
        alert('Please select a location before starting conversion');
        document.getElementById('location-select').focus();
        return;
    }
    
    // Prepare settings summary
    const selectedTypes = [];
    const typeCheckboxes = document.querySelectorAll('#dynamic-checkboxes input[type="checkbox"]:checked');
    typeCheckboxes.forEach(checkbox => {
        selectedTypes.push(checkbox.value);
    });
    
    const customerMappingMode = document.getElementById('customer-mapping-mode').value;
    const validationLevel = document.getElementById('validation-level').value;
    const remarksSource = document.getElementById('remarks-source').value;
    
    // Create summary HTML
    let summaryHTML = `
        <div class="settings-group">
            <div class="settings-label">🏪 Location</div>
            <div class="settings-value">${location}</div>
        </div>
        <div class="settings-group">
            <div class="settings-label">👤 Default Customer Code</div>
            <div class="settings-value">${document.getElementById('customer-code').value}</div>
        </div>
        <div class="settings-group">
            <div class="settings-label">💰 Accounts Receivable</div>
            <div class="settings-value">${document.getElementById('ar-account').value}</div>
        </div>
        <div class="settings-group">
            <div class="settings-label">📊 Default Sales Account</div>
            <div class="settings-value">${document.getElementById('sales-account').value}</div>
        </div>
        <div class="settings-group">
            <div class="settings-label">🎯 Transaction Types</div>
            <div class="settings-value">${selectedTypes.length > 0 ? selectedTypes.join(', ') : 'All types'}</div>
        </div>
        <div class="settings-group">
            <div class="settings-label">👤 Customer Code Source</div>
            <div class="settings-value">${customerMappingMode === 'default' ? 'Use Default Value' : 
                                         customerMappingMode === 'account_name' ? 'Use Account_name from CVGO' : 
                                         'Map Via Customer Code Mapping'}</div>
        </div>
        <div class="settings-group">
            <div class="settings-label">✅ Validation Level</div>
            <div class="settings-value">${validationLevel.charAt(0).toUpperCase() + validationLevel.slice(1)}</div>
        </div>
        <div class="settings-group">
            <div class="settings-label">💬 Remarks Source</div>
            <div class="settings-value">${remarksSource === 'empty' ? 'Empty' : 
                                         remarksSource === 'cashier' ? 'Cashier Name' :
                                         remarksSource === 'receipt_id' ? 'Receipt ID' : 
                                         remarksSource === 'custom' ? 'Custom Text' : remarksSource}</div>
        </div>
    `;
    
    document.getElementById('settings-summary').innerHTML = summaryHTML;
    document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

function proceedWithConversion() {
    closeSettingsModal();
    startConversion();
}

function initializeAdvancedDefaults() {
    const advancedDefaults = {
        'customer-mapping-mode': 'account_name', // Changed default to 'Use Account_name from CVGO'
        'validation-level': 'strict',
        'remarks-source': 'empty'
    };
    
    Object.entries(advancedDefaults).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    });
    
    const remarksSelect = document.getElementById('remarks-source');
    const customRemarksInput = document.getElementById('custom-remarks-text');
    
    if (remarksSelect && customRemarksInput) {
        remarksSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customRemarksInput.style.display = 'block';
                customRemarksInput.focus();
            } else {
                customRemarksInput.style.display = 'none';
            }
        });
    }
    
    console.log('Advanced settings initialized with defaults');
}

function initializeEventListeners() {
    const cvgoInput = document.getElementById('cvgo-file');
    const inventoryInput = document.getElementById('inventory-file');
    const posInput = document.getElementById('pos-file');
    const arInput = document.getElementById('ar-file');
    
    if (cvgoInput) cvgoInput.addEventListener('change', handleCVGOUpload);
    if (inventoryInput) inventoryInput.addEventListener('change', handleInventoryUpload);
    if (posInput) posInput.addEventListener('change', handlePOSUpload);
    if (arInput) arInput.addEventListener('change', handleARUpload);
    
    setupDragAndDrop('cvgo-upload-area', 'cvgo-file');
    setupDragAndDrop('inventory-upload-area', 'inventory-file');
    setupDragAndDrop('pos-upload-area', 'pos-file');
    setupDragAndDrop('ar-upload-area', 'ar-file');
    
    console.log('Event listeners initialized');
}

function setupDragAndDrop(areaId, inputId) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    
    if (!area || !input) {
        console.warn(`Drag and drop setup failed: ${areaId} or ${inputId} not found`);
        return;
    }
    
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    
    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });
    
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });
}

// Location Management Functions
function editLocations() {
    const customInput = document.getElementById('custom-location-input');
    if (customInput) {
        customInput.style.display = 'block';
        
        const codeInput = document.getElementById('new-location-code');
        const nameInput = document.getElementById('new-location-name');
        
        if (codeInput) codeInput.value = '';
        if (nameInput) nameInput.value = '';
        if (codeInput) codeInput.focus();
    }
}

function cancelEditLocations() {
    const customInput = document.getElementById('custom-location-input');
    if (customInput) {
        customInput.style.display = 'none';
        
        const codeInput = document.getElementById('new-location-code');
        const nameInput = document.getElementById('new-location-name');
        
        if (codeInput) codeInput.value = '';
        if (nameInput) nameInput.value = '';
    }
}

function addLocation() {
    const codeInput = document.getElementById('new-location-code');
    const nameInput = document.getElementById('new-location-name');
    
    if (!codeInput || !nameInput) {
        alert('Location input fields not found');
        return;
    }
    
    const code = codeInput.value.trim().toUpperCase();
    const name = nameInput.value.trim();
    
    if (!code || !name) {
        alert('Please enter both location code and name');
        return;
    }
    
    const exists = customLocations.some(loc => loc.code === code);
    if (exists) {
        alert(`Location code "${code}" already exists`);
        return;
    }
    
    customLocations.push({ code, name });
    updateLocationDropdown();
    
    const locationSelect = document.getElementById('location-select');
    if (locationSelect) {
        locationSelect.value = code;
    }
    
    cancelEditLocations();
    
    console.log(`Added new location: ${code} - ${name}`);
}

function resetLocationsToDefault() {
    if (confirm('Reset locations to default (BALOY, LAPASAN, YACAPIN, VAMENTA)? This will remove any custom locations.')) {
        customLocations = [
            { code: "BALOY", name: "Baloy Branch" },
            { code: "LAPASAN", name: "Lapasan Branch" },
            { code: "YACAPIN", name: "Yacapin Branch" },
            { code: "VAMENTA", name: "Vamenta Branch" }
        ];
        updateLocationDropdown();
        try {
            localStorage.setItem('cvgo-custom-locations', JSON.stringify(customLocations));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
        console.log('✅ Locations reset to default');
        alert('✅ Locations reset to default branches');
    }
}

function updateLocationDropdown() {
    const select = document.getElementById('location-select');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '';
    
    // Add "Select --" option first
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select --';
    select.appendChild(defaultOption);
    
    customLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.code;
        option.textContent = `${location.code} - ${location.name}`;
        select.appendChild(option);
    });
    
    if (customLocations.some(loc => loc.code === currentValue)) {
        select.value = currentValue;
    }
}

async function loadConfiguration() {
    try {
        // Check if we need to reset to new default locations
        const savedLocations = localStorage.getItem('cvgo-custom-locations');
        if (savedLocations) {
            const parsed = JSON.parse(savedLocations);
            // If saved locations include old branches, reset to new defaults
            const hasOldBranches = parsed.some(loc => 
                ['MAIN', 'BGC', 'AYALA', 'SM', 'MAKATI', 'ORTIGAS'].includes(loc.code)
            );
            
            if (hasOldBranches) {
                console.log('🔄 Resetting to new default locations (removing old branches)');
                // Reset to new defaults and save
                customLocations = [
                    { code: "BALOY", name: "Baloy Branch" },
                    { code: "LAPASAN", name: "Lapasan Branch" },
                    { code: "YACAPIN", name: "Yacapin Branch" },
                    { code: "VAMENTA", name: "Vamenta Branch" }
                ];
                localStorage.setItem('cvgo-custom-locations', JSON.stringify(customLocations));
            } else {
                customLocations = parsed;
            }
        }
        
        updateLocationDropdown();
        
        // Try to load config.json
        try {
            const response = await fetch('config.json');
            const config = await response.json();
            
            if (config.defaultValues) {
                const customerCodeEl = document.getElementById('customer-code');
                const arAccountEl = document.getElementById('ar-account');
                const salesAccountEl = document.getElementById('sales-account');
                
                if (customerCodeEl) customerCodeEl.value = config.defaultValues.customerCode || 'walkin';
                if (arAccountEl) arAccountEl.value = config.defaultValues.accountsReceivable || '500100';
                if (salesAccountEl) salesAccountEl.value = config.defaultValues.salesAccountCode || '5200200';
            }
        } catch (configError) {
            console.warn('Could not load config.json:', configError);
            // Set defaults manually
            const customerCodeEl = document.getElementById('customer-code');
            const arAccountEl = document.getElementById('ar-account');
            const salesAccountEl = document.getElementById('sales-account');
            
            if (customerCodeEl && !customerCodeEl.value) customerCodeEl.value = 'walkin';
            if (arAccountEl && !arAccountEl.value) arAccountEl.value = '500100';
            if (salesAccountEl && !salesAccountEl.value) salesAccountEl.value = '5200200';
        }
        
    } catch (error) {
        console.warn('Error in loadConfiguration:', error);
        updateLocationDropdown();
    }
}

async function handleCVGOUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('cvgo-status');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'file-status';
        statusDiv.textContent = 'Loading CVGO XML...';
    }
    
    try {
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            throw new Error('Invalid XML format');
        }
        
        const rootElement = xmlDoc.documentElement;
        if (!rootElement.tagName.includes('ArrayOfTransaction')) {
            throw new Error('Invalid CVGO XML: Expected ArrayOfTransaction root element');
        }
        
        const transactions = xmlDoc.querySelectorAll('Transaction');
        if (transactions.length === 0) {
            throw new Error('No transactions found in XML');
        }
        
        let totalItems = 0;
        transactions.forEach(transaction => {
            totalItems += transaction.querySelectorAll('TransactionItem').length;
        });
        
        cvgoData = xmlDoc;
        
        if (statusDiv) {
            statusDiv.className = 'file-status success';
            statusDiv.textContent = `✅ CVGO XML loaded successfully (${transactions.length} transactions, ${totalItems} items)`;
        }
        
        detectTransactionTypes(xmlDoc);
        checkReadyToProcess();
    } catch (error) {
        if (statusDiv) {
            statusDiv.className = 'file-status error';
            statusDiv.textContent = `❌ Error loading CVGO XML: ${error.message}`;
        }
        cvgoData = null;
        checkReadyToProcess();
    }
}

async function handleInventoryUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('inventory-status');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'file-status';
        statusDiv.textContent = 'Loading inventory data...';
    }
    
    try {
        const text = await file.text();
        console.log('Inventory file loaded, size:', text.length);
        
        const lines = text.split('\n').filter(line => line.trim());
        console.log('Inventory lines found:', lines.length);
        
        if (lines.length < 2) {
            throw new Error('File must contain header and data rows');
        }
        
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
        
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        console.log('Headers found:', headers);
        
        const requiredColumns = ['Code', 'Name', 'Costing Method', 'Sales account', "Don't delete"];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            console.error('Missing columns:', missingColumns);
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}\nFound headers: ${headers.join(', ')}`);
        }
        
        const codeIndex = headers.indexOf('Code');
        const salesAccountIndex = headers.indexOf('Sales account');
        const salesCodeIndex = headers.indexOf("Don't delete");
        
        inventoryData = [];
        productMapping = {};
        let processedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const cells = lines[i].split(delimiter).map(cell => cell.trim().replace(/"/g, ''));
                
                if (cells.length >= headers.length) {
                    const productCode = cells[codeIndex]?.trim();
                    const salesAccount = cells[salesAccountIndex]?.trim();
                    const salesCode = cells[salesCodeIndex]?.trim();
                    
                    if (productCode && salesAccount && salesCode) {
                        inventoryData.push({
                            code: productCode,
                            salesAccount: salesAccount,
                            salesCode: salesCode
                        });
                        productMapping[productCode] = salesCode;
                        processedCount++;
                    }
                }
            } catch (rowError) {
                console.warn(`Error processing row ${i}:`, rowError);
            }
        }
        
        console.log('Inventory processing complete:', processedCount, 'products mapped');
        
        if (statusDiv) {
            statusDiv.className = 'file-status success';
            statusDiv.textContent = `✅ Inventory loaded successfully (${processedCount} products mapped)`;
        }
        
        checkReadyToProcess();
    } catch (error) {
        console.error('Inventory upload error:', error);
        if (statusDiv) {
            statusDiv.className = 'file-status error';
            statusDiv.textContent = `❌ Error loading inventory: ${error.message}`;
        }
        inventoryData = null;
        checkReadyToProcess();
    }
}

async function handlePOSUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('pos-status');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'file-status';
        statusDiv.textContent = 'Loading POS data...';
    }
    
    try {
        const text = await file.text();
        console.log('POS file loaded, size:', text.length);
        
        if (text.length > 10000000) {
            throw new Error('File too large. Please use a smaller POS data file.');
        }
        
        const lines = text.split('\n').filter(line => line.trim());
        console.log('POS lines found:', lines.length);
        
        if (lines.length < 2) {
            throw new Error('File must contain header and data rows');
        }
        
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
        
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        console.log('Headers found:', headers);
        
        const dateIndex = headers.findIndex(h => 
            h.toUpperCase().includes('CLOSE') && h.toUpperCase().includes('DATE') ||
            h.toUpperCase().includes('TRANSACTION') && h.toUpperCase().includes('DATE')
        );
        const beginIndex = headers.findIndex(h => 
            h.toUpperCase().includes('BEGINNING') && h.toUpperCase().includes('INVOICE')
        );
        const endIndex = headers.findIndex(h => 
            h.toUpperCase().includes('ENDING') && h.toUpperCase().includes('INVOICE')
        );
        
        if (dateIndex === -1 || beginIndex === -1 || endIndex === -1) {
            console.error('Header indices:', { dateIndex, beginIndex, endIndex });
            throw new Error(`Missing required columns. Found headers: ${headers.join(', ')}\nNeed columns containing: DATE, BEGINNING INVOICE, ENDING INVOICE`);
        }
        
        posData = [];
        posRangeMapping = {};
        let processedCount = 0;
        let mappedInvoices = 0;
        
        const batchSize = 100;
        for (let batchStart = 1; batchStart < lines.length; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, lines.length);
            
            for (let i = batchStart; i < batchEnd; i++) {
                try {
                    const cells = lines[i].split(delimiter).map(cell => cell.trim().replace(/"/g, ''));
                    
                    if (cells.length >= headers.length) {
                        const transactionDate = cells[dateIndex]?.trim();
                        const beginInvoice = cells[beginIndex]?.trim();
                        const endInvoice = cells[endIndex]?.trim();
                        
                        if (transactionDate && beginInvoice && endInvoice) {
                            const beginNum = parseInt(beginInvoice.replace(/\D/g, ''), 10);
                            const endNum = parseInt(endInvoice.replace(/\D/g, ''), 10);
                            
                            if (!isNaN(beginNum) && !isNaN(endNum) && beginNum <= endNum) {
                                posData.push({
                                    date: transactionDate,
                                    beginInvoice: beginNum,
                                    endInvoice: endNum
                                });
                                
                                const rangeSize = endNum - beginNum + 1;
                                if (rangeSize > 10000) {
                                    console.warn(`Large invoice range detected: ${beginNum}-${endNum} (${rangeSize} invoices)`);
                                    continue;
                                }
                                
                                for (let invoiceNum = beginNum; invoiceNum <= endNum; invoiceNum++) {
                                    posRangeMapping[invoiceNum] = transactionDate;
                                    mappedInvoices++;
                                }
                                processedCount++;
                            }
                        }
                    }
                } catch (rowError) {
                    console.warn(`Error processing POS row ${i}:`, rowError);
                }
            }
            
            if (batchEnd < lines.length && statusDiv) {
                statusDiv.textContent = `Processing POS data... ${batchEnd}/${lines.length} rows`;
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        console.log('POS processing complete:', processedCount, 'ranges,', mappedInvoices, 'invoices mapped');
        
        if (statusDiv) {
            statusDiv.className = 'file-status success';
            statusDiv.textContent = `✅ POS data loaded successfully (${processedCount} date ranges, ${mappedInvoices} invoices mapped)`;
        }
        
        checkReadyToProcess();
    } catch (error) {
        console.error('POS upload error:', error);
        if (statusDiv) {
            statusDiv.className = 'file-status error';
            statusDiv.textContent = `❌ Error loading POS data: ${error.message}`;
        }
        posData = null;
        checkReadyToProcess();
    }
}

function checkReadyToProcess() {
    const processButton = document.getElementById('process-button');
    if (!processButton) return;
    
    if (cvgoData && inventoryData && posData) {
        processButton.disabled = false;
        processButton.textContent = '🎯 Start Smart Conversion';
    } else {
        processButton.disabled = true;
        let missing = [];
        if (!cvgoData) missing.push('CVGO XML');
        if (!inventoryData) missing.push('Inventory CSV');
        if (!posData) missing.push('POS Data CSV');
        processButton.textContent = `⚠️ Upload required files: ${missing.join(', ')}`;
    }
}

async function handleARUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('ar-status');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'file-status';
        statusDiv.textContent = 'Loading Customer Code mapping data...';
    }
    
    try {
        const text = await file.text();
        console.log('Customer Code file loaded, size:', text.length);
        
        const lines = text.split('\n').filter(line => line.trim());
        console.log('Customer Code lines found:', lines.length);
        
        if (lines.length < 2) {
            throw new Error('File must contain header and data rows');
        }
        
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
        
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        console.log('Headers found:', headers);
        
        const requiredColumns = ['Customer Name', 'Customer Code', 'AR Account'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            console.error('Missing columns:', missingColumns);
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}\nFound headers: ${headers.join(', ')}`);
        }
        
        const nameIndex = headers.indexOf('Customer Name');
        const codeIndex = headers.indexOf('Customer Code');
        const arIndex = headers.indexOf('AR Account');
        
        arData = [];
        customerMapping = {};
        let processedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const cells = lines[i].split(delimiter).map(cell => cell.trim().replace(/"/g, ''));
                
                if (cells.length >= headers.length) {
                    const customerName = cells[nameIndex]?.trim();
                    const customerCode = cells[codeIndex]?.trim();
                    const arAccount = cells[arIndex]?.trim();
                    
                    if (customerName && customerCode && arAccount) {
                        arData.push({
                            name: customerName,
                            code: customerCode,
                            arAccount: arAccount
                        });
                        
                        customerMapping[customerName.toLowerCase()] = customerCode;
                        customerMapping[customerCode.toLowerCase()] = customerCode;
                        processedCount++;
                    }
                }
            } catch (rowError) {
                console.warn(`Error processing Customer Code row ${i}:`, rowError);
            }
        }
        
        console.log('Customer Code processing complete:', processedCount, 'customers mapped');
        
        if (statusDiv) {
            statusDiv.className = 'file-status success';
            statusDiv.textContent = `✅ Customer Code mapping loaded successfully (${processedCount} customers mapped)`;
        }
        
    } catch (error) {
        console.error('Customer Code upload error:', error);
        if (statusDiv) {
            statusDiv.className = 'file-status error';
            statusDiv.textContent = `❌ Error loading Customer Code mapping: ${error.message}`;
        }
        arData = null;
    }
}

function detectTransactionTypes(xmlDoc) {
    const items = xmlDoc.querySelectorAll('TransactionItem');
    detectedTransactionTypes.clear();
    
    const typeCounts = {};
    
    items.forEach(item => {
        const typeName = getTextContent(item, 'type_name');
        if (typeName) {
            detectedTransactionTypes.add(typeName);
            typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
        }
    });
    
    console.log('Detected transaction types:', Object.entries(typeCounts));
    
    setTimeout(() => {
        updateTransactionTypeCheckboxes(typeCounts);
    }, 100);
}

function updateTransactionTypeCheckboxes(typeCounts) {
    const container = document.getElementById('dynamic-checkboxes');
    const controls = document.getElementById('transaction-controls');
    
    if (!container) {
        console.warn('dynamic-checkboxes container not found, retrying...');
        setTimeout(() => updateTransactionTypeCheckboxes(typeCounts), 200);
        return;
    }
    
    container.innerHTML = '';
    
    if (Object.keys(typeCounts).length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; grid-column: 1 / -1; text-align: center;">No transaction types detected yet</p>';
        if (controls) controls.style.display = 'none';
        return;
    }
    
    container.classList.add('populated');
    if (controls) controls.style.display = 'flex';
    
    // Sort types with PRODUCT and POST PAY DELIVERY first
    const priorityTypes = ['PRODUCT', 'POST PAY DELIVERY'];
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => {
        const aIsPriority = priorityTypes.includes(a[0]);
        const bIsPriority = priorityTypes.includes(b[0]);
        
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        if (aIsPriority && bIsPriority) {
            return priorityTypes.indexOf(a[0]) - priorityTypes.indexOf(b[0]);
        }
        return b[1] - a[1]; // Sort by count for non-priority types
    });
    
    sortedTypes.forEach(([typeName, count]) => {
        const item = document.createElement('div');
        item.className = 'transaction-type-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `type-${typeName.toLowerCase().replace(/\s+/g, '-')}`;
        // Check only PRODUCT and POST PAY DELIVERY by default
        checkbox.checked = priorityTypes.includes(typeName);
        checkbox.value = typeName;
        
        checkbox.addEventListener('change', updateTransactionTypeCounter);
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = typeName;
        
        const badge = document.createElement('span');
        badge.className = 'transaction-type-badge';
        badge.textContent = `${count.toLocaleString()}`;
        
        item.appendChild(checkbox);
        item.appendChild(label);
        item.appendChild(badge);
        container.appendChild(item);
    });
    
    updateTransactionTypeCounter();
}

function updateTransactionTypeCounter() {
    const checkedBoxes = document.querySelectorAll('#dynamic-checkboxes input[type="checkbox"]:checked');
    const totalBoxes = document.querySelectorAll('#dynamic-checkboxes input[type="checkbox"]');
    const infoSpan = document.querySelector('.transaction-types-info');
    
    if (infoSpan && totalBoxes.length > 0) {
        infoSpan.textContent = `${checkedBoxes.length} of ${totalBoxes.length} types selected`;
        
        if (checkedBoxes.length === 0) {
            infoSpan.style.color = 'var(--accent-error)';
        } else if (checkedBoxes.length === totalBoxes.length) {
            infoSpan.style.color = 'var(--accent-success)';
        } else {
            infoSpan.style.color = 'var(--accent-warning)';
        }
    }
}

function selectAllTransactionTypes() {
    const checkboxes = document.querySelectorAll('#dynamic-checkboxes input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateTransactionTypeCounter();
}

function selectNoneTransactionTypes() {
    const checkboxes = document.querySelectorAll('#dynamic-checkboxes input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateTransactionTypeCounter();
}

function selectCommonTransactionTypes() {
    const checkboxes = document.querySelectorAll('#dynamic-checkboxes input[type="checkbox"]');
    const commonTypes = ['PRODUCT', 'POST PAY DELIVERY']; // Updated to match new defaults
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = commonTypes.includes(checkbox.value);
    });
    updateTransactionTypeCounter();
}

function toggleAdvancedSettings() {
    const advancedSettings = document.getElementById('advanced-settings');
    const toggleButton = document.getElementById('advanced-toggle');
    
    if (!advancedSettings || !toggleButton) {
        console.warn('Advanced settings elements not found');
        return;
    }
    
    if (advancedSettings.style.display === 'none' || advancedSettings.style.display === '') {
        advancedSettings.style.display = 'block';
        toggleButton.classList.add('active');
        toggleButton.textContent = '⚙️ Hide Advanced Configuration';
    } else {
        advancedSettings.style.display = 'none';
        toggleButton.classList.remove('active');
        toggleButton.textContent = '⚙️ Advanced Configuration';
    }
}

function downloadARTemplate() {
    const template = `Customer Name\tCustomer Code\tAR Account
John Doe\tCUST001\t500101
Jane Smith\tCUST002\t500102
ABC Company\tCUST003\t500103
XYZ Corp\tCUST004\t500104
Maria Santos\tCUST005\t500105`;
    
    downloadFile(template, 'customer_code_mapping_template.csv', 'text/csv');
}

function downloadInventoryTemplate() {
    const template = `Code\tName\tCosting Method\tSales account\tDon't delete
100000269442\tProduct Example 1\tFIFO\tSales Select\t5200200
100000269443\tProduct Example 2\tFIFO\tSales Shoc+\t5200300
100000269444\tProduct Example 3\tFIFO\tSales Chatime\t5200500`;
    
    downloadFile(template, 'yto_inventory_template.csv', 'text/csv');
}

function downloadPOSTemplate() {
    const template = `MIN\tBRANCH\tBUSINESS GROUP\tCLOSE DATE\tTRANSACTION DATE\tBEGINNING INVOICE\tENDING INVOICE\tBEGINNING BALANCE\tENDING BALANCE\tSALES FOR THE DAY\tVATABLE SALES\tMONTH\tYEAR
1\tMAIN\tFood\t2025-01-24\t2025-01-24\t000-089481\t000-089485\t0\t1500\t1500\t1339.29\t1\t2025
2\tMAIN\tFood\t2025-01-25\t2025-01-25\t000-089486\t000-089490\t1500\t3000\t1500\t1339.29\t1\t2025`;
    
    downloadFile(template, 'pos_data_template.csv', 'text/csv');
}

function downloadFile(content, filename, mimeType = 'text/plain') {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log(`Downloaded template: ${filename}`);
    } catch (error) {
        console.error('Download error:', error);
        alert(`Error downloading ${filename}: ${error.message}`);
    }
}

// Fixed displayValidationErrors function
function displayValidationErrors(errors, validationWarnings, processingWarnings = []) {
    const progressContainer = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    
    if (!progressContainer || !progressText || !progressFill) {
        console.error('Required progress elements not found');
        return false;
    }
    
    // Save for export
    window.lastValidationIssues = { errors, validationWarnings, processingWarnings };
    
    // Calculate totals
    const totalErrors = errors.length;
    const totalValidationWarnings = validationWarnings.length;
    const totalProcessingWarnings = processingWarnings.length;
    const totalIssues = totalErrors + totalValidationWarnings + totalProcessingWarnings;
    
    progressText.textContent = `Validation failed: ${totalErrors} error(s), ${totalValidationWarnings + totalProcessingWarnings} warning(s) found`;
    progressFill.style.background = '#dc3545';
    progressFill.style.width = '100%';
    
    // Remove any existing error reports
    const existingReport = document.querySelector('.validation-error-report');
    if (existingReport) {
        existingReport.remove();
    }
    
    const errorReport = document.createElement('div');
    errorReport.className = 'validation-error-report';
    errorReport.style.cssText = `
        margin-top: 20px;
        padding: 20px;
        background: #fef2f2;
        border: 2px solid #fecaca;
        border-radius: 8px;
        max-height: 400px;
        overflow-y: auto;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    let reportHTML = '<h3 style="color: #dc2626; margin-bottom: 15px;">❌ Validation Failed - Strict Mode</h3>';
    reportHTML += `<p style="color: #374151; margin-bottom: 20px; font-weight: 500;">Found ${totalErrors} error(s) and ${totalValidationWarnings + totalProcessingWarnings} warning(s) across your entire dataset. All issues are listed below:</p>`;
    
    // Show Validation Errors
    if (totalErrors > 0) {
        reportHTML += '<h4 style="color: #dc2626; margin-bottom: 10px;">🚨 ERRORS (MUST BE FIXED):</h4>';
        reportHTML += '<ul style="margin-bottom: 20px; color: #dc2626; line-height: 1.5;">';
        
        const maxErrorsToShow = 50;
        const errorsToShow = errors.slice(0, maxErrorsToShow);
        
        errorsToShow.forEach(error => {
            reportHTML += `<li style="margin-bottom: 5px;">${error}</li>`;
        });
        
        if (errors.length > maxErrorsToShow) {
            reportHTML += `<li style="margin-bottom: 5px; font-weight: bold;">... and ${errors.length - maxErrorsToShow} more errors (${errors.length} total)</li>`;
        }
        
        reportHTML += '</ul>';
    }
    
    // Show Validation Warnings
    if (totalValidationWarnings > 0) {
        reportHTML += '<h4 style="color: #d97706; margin-bottom: 10px;">⚠️ VALIDATION WARNINGS:</h4>';
        reportHTML += '<ul style="margin-bottom: 20px; color: #d97706; line-height: 1.5;">';
        
        validationWarnings.forEach(warning => {
            reportHTML += `<li style="margin-bottom: 5px;">${warning}</li>`;
        });
        
        reportHTML += '</ul>';
    }
    
    // Show action guidance
    reportHTML += `
        <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 5px; border-left: 4px solid #dc2626;">
            <strong style="color: #dc2626;">What to do next:</strong>
            <ul style="margin-top: 10px; line-height: 1.6;">
                <li><strong>Fix the ${totalErrors} critical error(s)</strong> in your CVGO XML or inventory/POS data files</li>
                <li><strong>Alternative:</strong> Switch to "Warning" or "Lenient" validation mode to proceed despite errors</li>
            </ul>
        </div>
    `;
    
    errorReport.innerHTML = reportHTML;
    progressContainer.parentNode.insertBefore(errorReport, progressContainer.nextSibling);
    
    return false; // Indicate validation failed
}

// Type name mapping for reconciliation
function getReconciliationCategory(typeName) {
    const mapping = {
        'POST PAY DELIVERY': 'fuelSale',
        'PRODUCT': 'selectSale', 
        'DISCOUNT': 'minusFromSales',
        'SALE TOTAL': 'saleTotal',
        'MOP': 'exactPayment',
        'MOP - AMOUNT TENDER': 'paymentGross',
        'CHANGE': 'minusFromPayment',
        'MOP - PARTIAL TENDER': 'oneOfTwoPayments',
        'SAFEDROP': 'compareAgainstCashSale',
        // Disregarded types (not included in reconciliation)
        'LOYALTY': null,           
        'BUYING COMPANY': null,    
        'SUBTOTAL': null           
    };
    return mapping[typeName] || null;
}

// UPDATED startConversion function with TEST DELIVERY fix
async function startConversion() {
    // Reset warnings at start
    warnings = [];
    
    // Reset reconciliation data
    Object.keys(reconciliationData).forEach(key => {
        reconciliationData[key] = { count: 0, total: 0 };
    });
    
    const requiredElements = [
        'progress-container', 'results-container', 'progress-fill', 'progress-text',
        'location-select', 'customer-code', 'ar-account', 'sales-account'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('Missing required DOM elements:', missingElements);
        alert(`Page not fully loaded. Missing elements: ${missingElements.join(', ')}`);
        return;
    }
    
    const progressContainer = document.getElementById('progress-container');
    const resultsContainer = document.getElementById('results-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    
    // Get configuration
    const location = document.getElementById('location-select').value;
    const customerCode = document.getElementById('customer-code').value || 'walkin';
    const arAccount = document.getElementById('ar-account').value || '500100';
    const defaultSalesAccount = document.getElementById('sales-account').value || '5200200';
    
    // Get advanced settings with fallbacks
    const customerMappingMode = document.getElementById('customer-mapping-mode')?.value || 'default';
    const validationLevel = document.getElementById('validation-level')?.value || 'strict';
    const remarksSource = document.getElementById('remarks-source')?.value || 'empty';
    const customRemarksText = document.getElementById('custom-remarks-text')?.value || '';
    
    // Get selected transaction types
    const selectedTypes = [];
    const typeCheckboxes = document.querySelectorAll('#dynamic-checkboxes input[type="checkbox"]:checked');
    
    if (typeCheckboxes.length === 0) {
        if (detectedTransactionTypes.size > 0) {
            detectedTransactionTypes.forEach(type => selectedTypes.push(type));
        } else {
            selectedTypes.push('PRODUCT', 'DISCOUNT', 'POST PAY DELIVERY');
        }
        
        if (selectedTypes.length === 0) {
            throw new Error('No transaction types available to process. Please upload CVGO file first.');
        }
    } else {
        typeCheckboxes.forEach(checkbox => {
            selectedTypes.push(checkbox.value);
        });
    }
    
    console.log('Processing with settings:', {
        customerMappingMode,
        validationLevel,
        remarksSource,
        customRemarksText,
        selectedTypes
    });
    
    try {
        updateProgress(10, 'Parsing CVGO transactions...');
        
        const transactions = cvgoData.querySelectorAll('Transaction');
        const csvRows = [];
        const validationData = {};
        
        let distributionNumber = 1;
        const processedReceipts = new Set();
        
        const validationErrors = [];
        const validationWarnings = [];
        
        updateProgress(20, 'Processing transactions...');
        
        // First pass: count items per receipt for distribution numbers
        const receiptDistributionCounts = {};
        
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            const receiptId = getTextContent(transaction, 'receipt_identifier') || 
                            getTextContent(transaction, 'transaction_number');
            
            if (!receiptId) continue;
            
            const items = transaction.querySelectorAll('TransactionItem');
            let validItemCount = 0;
            
            for (const item of items) {
                const typeName = getTextContent(item, 'type_name');
                if (selectedTypes.includes(typeName)) {
                    validItemCount++;
                }
            }
            
            if (validItemCount > 0) {
                receiptDistributionCounts[receiptId] = validItemCount;
            }
        }
        
        // Second pass: create CSV rows
        const processingBatchSize = 50;
        for (let batchStart = 0; batchStart < transactions.length; batchStart += processingBatchSize) {
            const batchEnd = Math.min(batchStart + processingBatchSize, transactions.length);
            
            for (let i = batchStart; i < batchEnd; i++) {
                const transaction = transactions[i];
                const receiptId = getTextContent(transaction, 'receipt_identifier') || 
                                getTextContent(transaction, 'transaction_number');
                
                if (!receiptId || processedReceipts.has(receiptId)) continue;
                
                const completedDate = getTextContent(transaction, 'completed_date');
                const cashierName = getTextContent(transaction, 'cashier_name');
                
                // Get date from POS transaction date by default
                let transactionDate;
                const receiptNum = parseInt(receiptId.replace(/\D/g, ''), 10);
                const reconciliationDate = posRangeMapping[receiptNum];
                
                if (!reconciliationDate) {
                    const warning = `Receipt ${receiptId} not found in POS transaction ranges`;
                    warnings.push(warning);
                }
                
                transactionDate = reconciliationDate ? 
                    formatDate(reconciliationDate) : 
                    formatDate(completedDate);
                
                // Determine customer code based on settings
                let finalCustomerCode = customerCode;
                
                const possibleAccountFields = ['Account_name', 'account_name', 'AccountName', 'Customer_name', 'customer_name'];
                let rawAccountName = '';
                
                for (const fieldName of possibleAccountFields) {
                    const fieldValue = getTextContent(transaction, fieldName);
                    if (fieldValue && fieldValue.trim()) {
                        rawAccountName = fieldValue.trim();
                        break;
                    }
                }
                
                if (customerMappingMode === 'account_name' && rawAccountName) {
                    finalCustomerCode = rawAccountName;
                } else if (customerMappingMode === 'customer_mapping' && rawAccountName && customerMapping) {
                    const mappedCode = customerMapping[rawAccountName.toLowerCase().trim()];
                    finalCustomerCode = mappedCode || rawAccountName || customerCode;
                }
                
                // Get location prefix for invoice number
                const locationPrefix = getLocationPrefix(location);
                const prefixedInvoiceNo = `${locationPrefix}-${receiptId}`;
                
                // Get distribution count for this receipt
                const distributionCount = receiptDistributionCounts[receiptId] || 1;
                
                const items = transaction.querySelectorAll('TransactionItem');
                let hasValidItems = false;
                
                // UPDATED SECTION: Collect reconciliation data for ALL transaction items
                const allItems = transaction.querySelectorAll('TransactionItem');
                allItems.forEach(allItem => {
                    const allTypeName = getTextContent(allItem, 'type_name');
                    const allValue = parseFloat(getTextContent(allItem, 'value') || '0');
                    const allTaxAmount = parseFloat(getTextContent(allItem, 'tax_amount') || '0');
                    const allTaxName = getTextContent(allItem, 'tax_name');
                    
                    // Debug logging for tax items
                    if (allTypeName || allTaxAmount !== 0) {
                        console.log('Transaction item found:', {
                            receiptId: receiptId,
                            typeName: allTypeName,
                            taxName: allTaxName,
                            taxAmount: allTaxAmount,
                            value: allValue
                        });
                    }
                    
                    // Map type_name to reconciliation categories
                    const reconciliationCategory = getReconciliationCategory(allTypeName);
                    if (reconciliationCategory && reconciliationData[reconciliationCategory]) {
                        reconciliationData[reconciliationCategory].count++;
                        reconciliationData[reconciliationCategory].total += allValue;
                    }
                    
                    // FIXED VAT LOGIC: 
                    // 1. If type_name is TEST DELIVERY, add tax_amount to vatExclude
                    // 2. Always add ALL tax_amounts to vatTotal (regardless of type_name)
                    // 3. RESPECT NEGATIVE VALUES - don't convert to positive
                    
                    if (allTaxAmount !== 0) {  // Changed from > 0 to !== 0 to include negative values
                        // Always add to VAT Total (respecting the sign)
                        reconciliationData.vatTotal.count++;
                        reconciliationData.vatTotal.total += allTaxAmount;  // Keep original sign
                        console.log(`VAT Total captured: ${allTaxAmount} from type_name: ${allTypeName}`);
                        
                        // Check if type_name is TEST DELIVERY for VAT Exclude
                        const normalizedTypeName = allTypeName ? allTypeName.toUpperCase().trim() : '';
                        if (normalizedTypeName === 'TEST DELIVERY' || normalizedTypeName.includes('TEST DELIVERY')) {
                            reconciliationData.vatExclude.count++;
                            reconciliationData.vatExclude.total += allTaxAmount;  // Keep original sign
                            console.log(`VAT Exclude captured: ${allTaxAmount} from TEST DELIVERY type`);
                        }
                    }
                });

                // Process selected transaction items for CSV generation
                for (const item of items) {
                    const typeName = getTextContent(item, 'type_name');
                    
                    // Filter by selected types
                    if (!selectedTypes.includes(typeName)) {
                        continue;
                    }
                    
                    const productCode = typeName === 'DISCOUNT' ? 
                                      'discount' : 
                                      (getTextContent(item, 'product_code') || getTextContent(item, 'barcode'));
                    const description = getTextContent(item, 'description');
                    const quantity = parseFloat(getTextContent(item, 'quantity') || '1');
                    const price = parseFloat(getTextContent(item, 'price') || '0');
                    const value = parseFloat(getTextContent(item, 'value') || '0');
                    const taxAmount = parseFloat(getTextContent(item, 'tax_amount') || '0');
                    const taxRate = parseFloat(getTextContent(item, 'tax_rate') || '0');
                    
                    // Validation
                    const itemContext = `Receipt: ${receiptId}, Item: ${description || 'Unknown'}, Type: ${typeName}`;
                    
                    if (!description) {
                        const error = `Missing description - ${itemContext}`;
                        if (validationLevel === 'strict') {
                            validationErrors.push(error);
                        } else {
                            validationWarnings.push(error);
                        }
                    }
                    
                    if (isNaN(quantity) || quantity < 0) {
                        const error = `Invalid quantity (${getTextContent(item, 'quantity')}) - ${itemContext}`;
                        if (validationLevel === 'strict') {
                            validationErrors.push(error);
                        } else {
                            validationWarnings.push(error);
                        }
                    }
                    
                    if (isNaN(price)) {
                        const error = `Invalid price (${getTextContent(item, 'price')}) - ${itemContext}`;
                        if (validationLevel === 'strict') {
                            validationErrors.push(error);
                        } else {
                            validationWarnings.push(error);
                        }
                    }
                    
                    if (isNaN(value)) {
                        const error = `Invalid value (${getTextContent(item, 'value')}) - ${itemContext}`;
                        if (validationLevel === 'strict') {
                            validationErrors.push(error);
                        } else {
                            validationWarnings.push(error);
                        }
                    }
                    
                    // Handle discount parsing
                    const itemDiscountText = getTextContent(item, 'item_discount_total') || '0';
                    let itemDiscount = 0;
                    
                    try {
                        const cleanedDiscount = itemDiscountText.replace(/[^\d.-]/g, '');
                        itemDiscount = parseFloat(cleanedDiscount) || 0;
                        
                        if (itemDiscountText && itemDiscountText !== '0' && isNaN(itemDiscount)) {
                            const error = `Invalid discount amount (${itemDiscountText}) - ${itemContext}`;
                            if (validationLevel === 'strict') {
                                validationErrors.push(error);
                            } else {
                                validationWarnings.push(error);
                            }
                        }
                    } catch (discountError) {
                        const error = `Error parsing discount amount (${itemDiscountText}) - ${itemContext}: ${discountError.message}`;
                        if (validationLevel === 'strict') {
                            validationErrors.push(error);
                        } else {
                            validationWarnings.push(error);
                        }
                    }
                    
                    // Apply discount handling
                    let finalValue = value;
                    let finalPrice = price;
                    
                    if (typeName === 'DISCOUNT') {
                        finalValue = -Math.abs(value);
                        finalPrice = -Math.abs(price);
                    }
                    
                    // Get sales account code
                    let salesAccountCode = defaultSalesAccount;
                    if (typeName !== 'DISCOUNT' && productCode && productMapping[productCode]) {
                        salesAccountCode = productMapping[productCode];
                    } else if (typeName !== 'DISCOUNT' && productCode) {
                        const error = `Product ${productCode} not found in inventory mapping - ${itemContext}`;
                        if (validationLevel === 'strict') {
                            validationErrors.push(error);
                        } else {
                            validationWarnings.push(error);
                        }
                    }
                    
                    // Format amounts
                    const formattedPrice = finalPrice.toFixed(2);
                    const formattedAmount = finalValue.toFixed(2);
                    const formattedDiscount = Math.abs(itemDiscount).toFixed(2);
                    
                    // Generate remarks content
                    let remarksContent = '';
                    switch (remarksSource) {
                        case 'cashier':
                            remarksContent = cashierName || '';
                            break;
                        case 'receipt_id':
                            remarksContent = receiptId || '';
                            break;
                        case 'custom':
                            remarksContent = customRemarksText || '';
                            break;
                        default:
                            remarksContent = '';
                            break;
                    }
                    
                    // Create CSV row
                    const csvRow = [
                        prefixedInvoiceNo,
                        transactionDate,
                        transactionDate,
                        finalCustomerCode,
                        location,
                        arAccount,
                        taxRate > 0 ? `${taxRate}% VAT` : '',
                        '',
                        productCode || '',
                        description || '',
                        Math.abs(quantity) || 1,
                        formattedPrice,
                        formattedAmount,
                        '',
                        formattedDiscount,
                        salesAccountCode,
                        remarksContent,
                        'Yes',
                        distributionCount
                    ];
                    
                    csvRows.push(csvRow);
                    hasValidItems = true;
                    
                    // Update validation data
                    if (!validationData[typeName]) {
                        validationData[typeName] = { count: 0, total: 0 };
                    }
                    validationData[typeName].count++;
                    validationData[typeName].total += finalValue;
                }
                
                if (hasValidItems) {
                    processedReceipts.add(receiptId);
                    distributionNumber++;
                }
            }
            
            // Update progress
            const progress = 20 + (batchEnd / transactions.length) * 60;
            updateProgress(progress, `Processing transactions... ${batchEnd}/${transactions.length}`);
            
            // Allow browser to breathe
            if (batchEnd < transactions.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // Log final reconciliation totals
        console.log('=== FINAL RECONCILIATION TOTALS ===');
        console.log('VAT Exclude (TEST DELIVERY):', reconciliationData.vatExclude);
        console.log('VAT Total (VATABLE SALES):', reconciliationData.vatTotal);
        console.log('================================');
        
        // Check validation in strict mode
        if (validationLevel === 'strict' && validationErrors.length > 0) {
            console.log(`Strict validation found ${validationErrors.length} errors`);
            displayValidationErrors(validationErrors, validationWarnings, warnings);
            return;
        }
        
        updateProgress(85, 'Generating CSV file...');
        
        // Create CSV content
        const headers = [
            'Invoice No.', 'Date', 'Due Date', 'Customer Code', 'Location',
            'Accounts Receivable', 'Sales Tax', 'Service', 'Product Code',
            'Description', 'Quantity', 'Price', 'Amount (Gross)', 'Discount',
            'Discount Amount', 'Sales Account Code', 'Remarks', 'Taxable',
            'No. of Distribution'
        ];
        
        let csvContent = headers.join(',') + '\n';
        csvRows.forEach(row => {
            csvContent += row.map(cell => 
                typeof cell === 'string' && cell.includes(',') ? 
                `"${cell}"` : cell
            ).join(',') + '\n';
        });
        
        updateProgress(95, 'Preparing results...');
        
        // Show results
        displayResults(csvContent, validationData, csvRows, warnings, validationWarnings);
        
        updateProgress(100, 'Conversion completed successfully!');
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
            resultsContainer.style.display = 'block';
        }, 1000);
        
    } catch (error) {
        console.error('Conversion error:', error);
        progressText.textContent = `Error: ${error.message}`;
        progressFill.style.background = '#dc3545';
        alert(`Conversion failed: ${error.message}`);
    }
}

function updateProgress(percentage, message) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill && progressText) {
        progressFill.style.width = percentage + '%';
        progressText.textContent = message;
    }
}

// UPDATED displayResults function
function displayResults(csvContent, validationData, csvRows, processingWarnings = [], validationWarnings = []) {
    // Show validation summary first
    const validationContent = document.getElementById('validation-content');
    if (!validationContent) return;
    
    validationContent.innerHTML = '';
    
    let grandTotal = 0;
    
    Object.entries(validationData).forEach(([type, data]) => {
        if (data.count > 0) {
            const row = document.createElement('div');
            row.className = 'validation-row';
            
            const typeCell = document.createElement('div');
            typeCell.textContent = type;
            
            const countCell = document.createElement('div');
            countCell.textContent = `${data.count} items`;
            
            const amountCell = document.createElement('div');
            amountCell.textContent = `₱${data.total.toFixed(2)}`;
            amountCell.className = data.total >= 0 ? 'amount-positive' : 'amount-negative';
            
            row.appendChild(typeCell);
            row.appendChild(countCell);
            row.appendChild(amountCell);
            validationContent.appendChild(row);
            
            grandTotal += data.total;
        }
    });
    
    // Grand total row
    const grandRow = document.createElement('div');
    grandRow.className = 'validation-row';
    
    const grandTypeCell = document.createElement('div');
    grandTypeCell.textContent = 'GRAND TOTAL';
    
    const grandCountCell = document.createElement('div');
    grandCountCell.textContent = `${csvRows.length} rows`;
    
    const grandAmountCell = document.createElement('div');
    grandAmountCell.textContent = `₱${grandTotal.toFixed(2)}`;
    grandAmountCell.className = grandTotal >= 0 ? 'amount-positive' : 'amount-negative';
    
    grandRow.appendChild(grandTypeCell);
    grandRow.appendChild(grandCountCell);
    grandRow.appendChild(grandAmountCell);
    validationContent.appendChild(grandRow);
    
    // Show warnings if any
    const allWarnings = [...(processingWarnings || []), ...(validationWarnings || [])];
    
    if (allWarnings.length > 0) {
        const warningsSection = document.getElementById('warnings-section');
        const warningsList = document.getElementById('warnings-list');
        const warningCount = document.getElementById('warning-count');
        
        if (warningsSection && warningsList) {
            warningsList.innerHTML = '';
            
            allWarnings.forEach(warning => {
                const li = document.createElement('li');
                li.textContent = warning;
                li.style.marginBottom = '5px';
                warningsList.appendChild(li);
            });
            
            if (warningCount) {
                warningCount.textContent = allWarnings.length;
            }
            
            warningsSection.style.display = 'block';
        }
    }
    
    // Setup download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const downloadLink = document.getElementById('download-link');
    
    if (downloadLink) {
        downloadLink.href = url;
        downloadLink.download = `yto_converted_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadLink.style.display = 'inline-block';
    }
    
    // Show preview
    displayPreview(csvRows);
    
    // Add reconciliation report
    let reconciliationContainer = document.getElementById('reconciliation-container');
    if (!reconciliationContainer) {
        reconciliationContainer = document.createElement('div');
        reconciliationContainer.id = 'reconciliation-container';
        document.getElementById('results-container').appendChild(reconciliationContainer);
    }
    generateReconciliationReport(reconciliationData, reconciliationContainer);
}

function displayPreview(csvRows) {
    const previewSection = document.getElementById('preview-section');
    const previewTable = document.getElementById('preview-table');
    
    if (!previewSection || !previewTable) return;
    
    window.currentCsvRows = csvRows;
    window.showingAllRows = false;
    
    renderPreviewTable(csvRows, false);
    previewSection.style.display = 'block';
}

function renderPreviewTable(csvRows, showAll = false) {
    const previewTable = document.getElementById('preview-table');
    if (!previewTable) return;
    
    const headers = [
        'Invoice No.', 'Date', 'Customer Code', 'Location', 'Product Code',
        'Description', 'Quantity', 'Price', 'Amount (Gross)', 'Sales Account Code', 'Distribution'
    ];
    
    previewTable.innerHTML = '';
    
    // Create header
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    previewTable.appendChild(headerRow);
    
    const maxRows = showAll ? csvRows.length : 10;
    const previewRows = csvRows.slice(0, maxRows);
    
    previewRows.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        if (index % 2 === 0) {
            tr.style.backgroundColor = '#f8f9fa';
        }
        
        const previewData = [
            row[0], // Invoice No.
            row[1], // Date
            row[3], // Customer Code
            row[4], // Location
            row[8], // Product Code
            row[9], // Description
            row[10], // Quantity
            formatCurrencyForDisplay(row[11]), // Price
            formatCurrencyForDisplay(row[12]), // Amount
            row[15], // Sales Account Code
            row[18] // Distribution
        ];
        
        previewData.forEach(data => {
            const td = document.createElement('td');
            td.textContent = data;
            tr.appendChild(td);
        });
        
        previewTable.appendChild(tr);
    });
    
    // Update toggle button text
    const toggleText = document.getElementById('preview-toggle-text');
    if (toggleText) {
        toggleText.textContent = showAll ? 'Show First 10 Rows' : 'Show All Rows';
    }
}

function togglePreviewRows() {
    if (!window.currentCsvRows) return;
    
    window.showingAllRows = !window.showingAllRows;
    renderPreviewTable(window.currentCsvRows, window.showingAllRows);
}

function getTextContent(element, tagName) {
    const node = element.querySelector(tagName);
    if (!node) return '';
    
    if (node.getAttribute('xsi:nil') === 'true') return '';
    
    return node.textContent || '';
}

function formatCurrencyForDisplay(value) {
    if (typeof value === 'number') {
        return `₱${value.toFixed(2)}`;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
        return `₱${numValue.toFixed(2)}`;
    }
    
    return value || '₱0.00';
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        return (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
               date.getDate().toString().padStart(2, '0') + '/' +
               date.getFullYear();
    } catch (error) {
        return '';
    }
}

// Save locations to localStorage
window.addEventListener('beforeunload', function() {
    try {
        localStorage.setItem('cvgo-custom-locations', JSON.stringify(customLocations));
    } catch (error) {
        console.warn('Could not save locations:', error);
    }
});

// UPDATED generateReconciliationReport with black text for labels
function generateReconciliationReport(reconciliationData, container) {
    if (!reconciliationData || !container) {
        console.warn('Missing reconciliation data or container');
        return;
    }

    console.log('📊 Generating reconciliation report...');

    // Calculate Sales Reconciliation
    const fuelSale = reconciliationData.fuelSale?.total || 0;
    const selectSale = reconciliationData.selectSale?.total || 0;
    const minusFromSales = reconciliationData.minusFromSales?.total || 0;
    const saleTotal = reconciliationData.saleTotal?.total || 0;

    // Formula: Fuel Sale + Select Sale + Minus from Sales = Total Computed Sales
    // (minusFromSales is already negative, so we add it)
    const totalComputedSales = fuelSale + selectSale + minusFromSales;
    const salesDifference = totalComputedSales - saleTotal; // Should be 0

    // Calculate Payment Reconciliation
    const exactPayment = reconciliationData.exactPayment?.total || 0;
    const paymentGross = reconciliationData.paymentGross?.total || 0;
    const minusFromPayment = reconciliationData.minusFromPayment?.total || 0;
    const oneOfTwoPayments = reconciliationData.oneOfTwoPayments?.total || 0;

    // Formula: Exact Payment + Payment (gross of change) + Minus from Payment + 1 of 2 payments = Total Computed Payment
    // (minusFromPayment is already negative, so we add it)
    const totalComputedPayment = exactPayment + paymentGross + minusFromPayment + oneOfTwoPayments;

    // Sales less Payment = Total Computed Sales - Total Computed Payment
    const salesLessPayment = totalComputedSales - totalComputedPayment;
    const compareAgainstCashSale = reconciliationData.compareAgainstCashSale?.total || 0;
    
    // Payment Difference = Sales less Payment - Compare against cash sale (should be 0)
    const paymentDifference = salesLessPayment - compareAgainstCashSale;

    // Calculate VAT Reconciliation
    const vatExclude = reconciliationData.vatExclude?.total || 0;
    const vatTotal = reconciliationData.vatTotal?.total || 0;

    // VAT Amount (CVGo) = VAT Total - VAT Amount (exclude)
    const vatAmountCVGo = vatTotal - vatExclude;

    // VAT Computed from Sales = (Sale Total / 1.12) * 0.12
    const vatComputedFromSales = saleTotal > 0 ? (saleTotal / 1.12) * 0.12 : 0;

    // Variance = VAT Amount (CVGo) - VAT Computed from Sales
    const vatVariance = vatAmountCVGo - vatComputedFromSales;

    // Create the reconciliation report HTML
    const reportHTML = `
        <div class="reconciliation-report" style="margin-top: 30px;">
            <h2 style="color: #1e40af; margin-bottom: 25px; text-align: center;">📊 CVGO Reconciliation Report</h2>
            
            <!-- Sales & Payment Reconciliation -->
            <div class="reconciliation-section" style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px solid #0891b2; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                <h3 style="color: #0891b2; margin-bottom: 20px; display: flex; align-items: center;">
                    <span style="background: #0891b2; color: white; padding: 10px; border-radius: 8px; margin-right: 15px;">💰</span>
                    Sales & Payment Reconciliation
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                    <!-- Sales Section -->
                    <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <h4 style="color: #1e40af; margin-bottom: 15px;">📊 Sales Breakdown</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Fuel Sale</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${fuelSale.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Select Sale</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${selectSale.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Minus from Sales</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${minusFromSales.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="background: #f8fafc; border: 2px solid #cbd5e1; font-weight: bold;">
                                <td style="padding: 12px; font-size: 1.1em; color: black;">Total Computed Sales</td>
                                <td style="padding: 12px; text-align: right; font-family: monospace; font-size: 1.15em; color: black;">₱${totalComputedSales.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Sale Total</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${saleTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="background: ${Math.abs(salesDifference) < 0.01 ? '#dcfce7' : '#fef2f2'}; border: 2px solid ${Math.abs(salesDifference) < 0.01 ? '#16a34a' : '#dc2626'};">
                                <td style="padding: 12px; font-weight: bold; font-size: 1.1em; color: black;">Difference</td>
                                <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: bold; font-size: 1.2em; color: black;">
                                    ₱${salesDifference.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                    ${Math.abs(salesDifference) < 0.01 ? ' ✅' : ' ⚠️'}
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Payment Section -->
                    <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <h4 style="color: #7c3aed; margin-bottom: 15px;">💳 Payment Breakdown</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Exact Payment</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${exactPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Payment (gross of change)</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${paymentGross.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Minus from Payment</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${minusFromPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">1 of 2 payments</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${oneOfTwoPayments.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="background: #f8fafc; border: 2px solid #cbd5e1; font-weight: bold;">
                                <td style="padding: 12px; font-size: 1.1em; color: black;">Total Computed Payment</td>
                                <td style="padding: 12px; text-align: right; font-family: monospace; font-size: 1.15em; color: black;">₱${totalComputedPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Sales less Payment</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${salesLessPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 8px; font-weight: 500; color: black;">Compare against cash sale</td>
                                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700; color: black;">₱${compareAgainstCashSale.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                            <tr style="background: ${Math.abs(paymentDifference) < 0.01 ? '#dcfce7' : '#fef2f2'}; border: 2px solid ${Math.abs(paymentDifference) < 0.01 ? '#16a34a' : '#dc2626'};">
                                <td style="padding: 12px; font-weight: bold; font-size: 1.1em; color: black;">Payment Difference</td>
                                <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: bold; font-size: 1.2em; color: black;">
                                    ₱${paymentDifference.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                    ${Math.abs(paymentDifference) < 0.01 ? ' ✅' : ' ⚠️'}
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>

            <!-- VAT Reconciliation -->
            <div class="reconciliation-section" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #d97706; border-radius: 12px; padding: 25px;">
                <h3 style="color: #d97706; margin-bottom: 20px; display: flex; align-items: center;">
                    <span style="background: #d97706; color: white; padding: 10px; border-radius: 8px; margin-right: 15px;">🧾</span>
                    VAT Reconciliation
                </h3>
                
                <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0; max-width: 600px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px; font-weight: 600; color: black;">VAT Amount (exclude)</td>
                            <td style="padding: 12px; text-align: right; font-family: monospace; color: #dc2626; font-weight: 700; font-size: 1.1em;">₱${vatExclude.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr style="background: #dcfce7; border: 1px solid #16a34a;">
                            <td style="padding: 12px; font-weight: 700; color: #166534;">VAT Total</td>
                            <td style="padding: 12px; text-align: right; font-family: monospace; color: #15803d; font-weight: 800; font-size: 1.15em;">₱${vatTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr style="background: #dbeafe; border: 1px solid #2563eb;">
                            <td style="padding: 12px; font-weight: 700; color: #1e40af;">VAT Amount (CVGo)</td>
                            <td style="padding: 12px; text-align: right; font-family: monospace; color: #1d4ed8; font-weight: 800; font-size: 1.15em;">₱${vatAmountCVGo.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px; font-weight: 700; color: #7c3aed;">VAT Computed from Sales</td>
                            <td style="padding: 12px; text-align: right; font-family: monospace; color: #7c3aed; font-weight: 800; font-size: 1.15em;">₱${vatComputedFromSales.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr style="background: ${Math.abs(vatVariance) < 0.01 ? '#dcfce7' : '#fef2f2'}; border: 3px solid ${Math.abs(vatVariance) < 0.01 ? '#16a34a' : '#dc2626'};">
                            <td style="padding: 16px; font-weight: bold; font-size: 1.2em; color: black;">Variance</td>
                            <td style="padding: 16px; text-align: right; font-family: monospace; font-weight: bold; font-size: 1.3em; color: black;">
                                ₱${vatVariance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                ${Math.abs(vatVariance) < 0.01 ? ' ✅' : ' ⚠️'}
                            </td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #64748b;">
                        <div style="font-size: 0.95em; color: #475569; line-height: 1.5;">
                            <div style="margin-bottom: 8px;">
                                <strong>Formula:</strong> VAT Computed = (Sale Total ÷ 1.12) × 0.12
                            </div>
                            <div style="font-family: 'Courier New', monospace; background: #e2e8f0; padding: 8px; border-radius: 4px;">
                                <strong>Calculation:</strong> (₱${saleTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} ÷ 1.12) × 0.12 = ₱${vatComputedFromSales.toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Summary -->
            <div style="text-align: center; margin-top: 25px; padding: 20px; background: ${Math.abs(salesDifference) < 0.01 && Math.abs(vatVariance) < 0.01 && Math.abs(paymentDifference) < 0.01 ? '#dcfce7' : '#fef3c7'}; border: 2px solid ${Math.abs(salesDifference) < 0.01 && Math.abs(vatVariance) < 0.01 && Math.abs(paymentDifference) < 0.01 ? '#16a34a' : '#d97706'}; border-radius: 12px;">
                <h3 style="margin-bottom: 10px;">📋 Reconciliation Summary</h3>
                <p style="font-size: 1.1em; font-weight: 600;">
                    Status: ${Math.abs(salesDifference) < 0.01 && Math.abs(vatVariance) < 0.01 && Math.abs(paymentDifference) < 0.01 ? 
                        '<span style="color: #16a34a;">✅ ALL BALANCED</span>' : 
                        '<span style="color: #d97706;">⚠️ NEEDS REVIEW</span>'}
                </p>
                ${Math.abs(salesDifference) >= 0.01 ? '<p style="color: #dc2626;">• Sales reconciliation difference detected</p>' : ''}
                ${Math.abs(paymentDifference) >= 0.01 ? '<p style="color: #dc2626;">• Payment reconciliation difference detected</p>' : ''}
                ${Math.abs(vatVariance) >= 0.01 ? '<p style="color: #dc2626;">• VAT variance detected</p>' : ''}
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', reportHTML);
    console.log('✅ Reconciliation report generated successfully');
}

// Helper functions for exporting validation issues
function exportAllValidationIssues() {
    if (!window.lastValidationIssues) {
        alert('No validation issues to export');
        return;
    }
    
    const { errors, validationWarnings, processingWarnings } = window.lastValidationIssues;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    
    let content = `CVGO Converter - Validation Issues Report\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `========================================\n\n`;
    
    content += `SUMMARY:\n`;
    content += `- ${errors.length} Critical Errors\n`;
    content += `- ${validationWarnings.length} Validation Warnings\n`;
    content += `- ${processingWarnings.length} Processing Warnings\n`;
    content += `- ${errors.length + validationWarnings.length + processingWarnings.length} Total Issues\n\n`;
    
    if (errors.length > 0) {
        content += `🚨 CRITICAL ERRORS (${errors.length}):\n`;
        content += `${'='.repeat(50)}\n`;
        errors.forEach((error, index) => {
            content += `${index + 1}. ${error}\n`;
        });
        content += `\n`;
    }
    
    if (validationWarnings.length > 0) {
        content += `⚠️ VALIDATION WARNINGS (${validationWarnings.length}):\n`;
        content += `${'='.repeat(50)}\n`;
        validationWarnings.forEach((warning, index) => {
            content += `${index + 1}. ${warning}\n`;
        });
        content += `\n`;
    }
    
    if (processingWarnings.length > 0) {
        content += `📊 PROCESSING WARNINGS (${processingWarnings.length}):\n`;
        content += `${'='.repeat(50)}\n`;
        processingWarnings.forEach((warning, index) => {
            content += `${index + 1}. ${warning}\n`;
        });
        content += `\n`;
    }
    
    content += `\nNOTES:\n`;
    content += `- Critical errors must be fixed before conversion can proceed in strict mode\n`;
    content += `- Validation warnings indicate potential data quality issues\n`;
    content += `- Processing warnings are often normal for partial date ranges or test data\n`;
    
    downloadFile(content, `cvgo-validation-issues-${timestamp}.txt`, 'text/plain');
}

function copyAllValidationIssues() {
    if (!window.lastValidationIssues) {
        alert('No validation issues to copy');
        return;
    }
    
    const { errors, validationWarnings, processingWarnings } = window.lastValidationIssues;
    
    let content = `CVGO Validation Issues (${new Date().toLocaleString()})\n\n`;
    
    if (errors.length > 0) {
        content += `🚨 ERRORS (${errors.length}):\n`;
        errors.forEach((error, index) => content += `${index + 1}. ${error}\n`);
        content += `\n`;
    }
    
    if (validationWarnings.length > 0) {
        content += `⚠️ VALIDATION WARNINGS (${validationWarnings.length}):\n`;
        validationWarnings.forEach((warning, index) => content += `${index + 1}. ${warning}\n`);
        content += `\n`;
    }
    
    if (processingWarnings.length > 0) {
        content += `📊 PROCESSING WARNINGS (${processingWarnings.length}):\n`;
        processingWarnings.forEach((warning, index) => content += `${index + 1}. ${warning}\n`);
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(content).then(() => {
            alert(`✅ Copied ${errors.length + validationWarnings.length + processingWarnings.length} validation issues to clipboard!`);
        }).catch(() => {
            alert('❌ Failed to copy to clipboard. Please try the export option instead.');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert(`✅ Copied ${errors.length + validationWarnings.length + processingWarnings.length} validation issues to clipboard!`);
        } catch (err) {
            alert('❌ Failed to copy to clipboard. Please try the export option instead.');
        }
        document.body.removeChild(textArea);
    }
}

// Debug function for transaction fields
function debugTransactionFields(transaction) {
    console.log('=== Transaction XML Structure Debug ===');
    const children = transaction.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const value = child.textContent || '';
        console.log(`Field: ${child.tagName} = "${value}"`);
    }
    console.log('=====================================');
}

// Toggle warnings visibility
function toggleWarnings() {
    const warningsList = document.getElementById('warnings-list');
    const toggleText = document.getElementById('warnings-toggle-text');
    
    if (warningsList.style.display === 'none') {
        warningsList.style.display = 'block';
        toggleText.textContent = 'Hide';
    } else {
        warningsList.style.display = 'none';
        toggleText.textContent = 'Show';
    }
}

// Make key functions available globally
window.startConversion = startConversion;
window.confirmAndStartConversion = confirmAndStartConversion;
window.proceedWithConversion = proceedWithConversion;
window.closeSettingsModal = closeSettingsModal;
window.toggleFieldEdit = toggleFieldEdit;
window.editLocations = editLocations;
window.cancelEditLocations = cancelEditLocations;
window.addLocation = addLocation;
window.resetLocationsToDefault = resetLocationsToDefault;
window.selectAllTransactionTypes = selectAllTransactionTypes;
window.selectNoneTransactionTypes = selectNoneTransactionTypes;
window.selectCommonTransactionTypes = selectCommonTransactionTypes;
window.toggleAdvancedSettings = toggleAdvancedSettings;
window.downloadARTemplate = downloadARTemplate;
window.downloadInventoryTemplate = downloadInventoryTemplate;
window.downloadPOSTemplate = downloadPOSTemplate;
window.togglePreviewRows = togglePreviewRows;
window.exportAllValidationIssues = exportAllValidationIssues;
window.copyAllValidationIssues = copyAllValidationIssues;
window.generateReconciliationReport = generateReconciliationReport;
window.toggleWarnings = toggleWarnings;