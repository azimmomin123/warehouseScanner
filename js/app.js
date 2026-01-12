/**
 * Warehouse Scanner - Orca Scan Inspired App
 * Full-featured inventory management with barcode scanning
 * Version 2.0.0
 */

(function() {
    'use strict';

    // ===================================
    // App State
    // ===================================
    const state = {
        scans: [],
        history: [],
        sheets: [{ id: 'default', name: 'Default Inventory' }],
        currentSheet: 'default',
        isScanning: false,
        currentView: 'scanner',
        stream: null,
        searchQuery: '',
        settings: {
            continuousScan: false,
            soundEnabled: true,
            vibrateEnabled: true,
            autoSave: true,
            flashEnabled: false,
            theme: 'auto',
            camera: 'environment'
        }
    };

    // ===================================
    // DOM Elements
    // ===================================
    const elements = {
        // Sidebar
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        sidebarClose: document.getElementById('sidebarClose'),
        sheetDropdown: document.getElementById('sheetDropdown'),
        sheetMenu: document.getElementById('sheetMenu'),
        sheetList: document.getElementById('sheetList'),
        currentSheetName: document.getElementById('currentSheetName'),
        addSheetBtn: document.getElementById('addSheetBtn'),
        sidebarNavItems: document.querySelectorAll('.sidebar-nav-item'),
        exportBtns: document.querySelectorAll('.export-btn'),
        inventoryBadge: document.getElementById('inventoryBadge'),

        // Header
        menuBtn: document.getElementById('menuBtn'),
        viewTitle: document.getElementById('viewTitle'),
        searchToggle: document.getElementById('searchToggle'),
        searchBar: document.getElementById('searchBar'),
        searchInput: document.getElementById('searchInput'),
        searchClear: document.getElementById('searchClear'),

        // Scanner
        scannerViewport: document.getElementById('scannerViewport'),
        scannerVideo: document.getElementById('scannerVideo'),
        scannerPlaceholder: document.getElementById('scannerPlaceholder'),
        scanBtn: document.getElementById('scanBtn'),
        manualEntryBtn: document.getElementById('manualEntryBtn'),
        continuousScan: document.getElementById('continuousScan'),
        soundEnabled: document.getElementById('soundEnabled'),
        vibrateEnabled: document.getElementById('vibrateEnabled'),

        // Manual Entry Modal
        manualEntryModal: document.getElementById('manualEntryModal'),
        closeManualEntry: document.getElementById('closeManualEntry'),
        cancelManualEntry: document.getElementById('cancelManualEntry'),
        submitManualEntry: document.getElementById('submitManualEntry'),
        barcodeInput: document.getElementById('barcodeInput'),
        itemName: document.getElementById('itemName'),
        quantityInput: document.getElementById('quantityInput'),
        itemNotes: document.getElementById('itemNotes'),
        qtyDecrease: document.getElementById('qtyDecrease'),
        qtyIncrease: document.getElementById('qtyIncrease'),

        // Item Detail Modal
        itemDetailModal: document.getElementById('itemDetailModal'),
        closeItemDetail: document.getElementById('closeItemDetail'),
        itemDetailContent: document.getElementById('itemDetailContent'),
        deleteItemBtn: document.getElementById('deleteItemBtn'),
        saveItemBtn: document.getElementById('saveItemBtn'),

        // Views
        scannerView: document.getElementById('scannerView'),
        inventoryView: document.getElementById('inventoryView'),
        historyView: document.getElementById('historyView'),
        settingsView: document.getElementById('settingsView'),

        // Scans List
        scansList: document.getElementById('scansList'),
        emptyState: document.getElementById('emptyState'),
        clearScansBtn: document.getElementById('clearScansBtn'),

        // Inventory
        inventoryList: document.getElementById('inventoryList'),
        totalItems: document.getElementById('totalItems'),
        totalQuantity: document.getElementById('totalQuantity'),
        todayScans: document.getElementById('todayScans'),
        sortBy: document.getElementById('sortBy'),
        filterBtn: document.getElementById('filterBtn'),

        // History
        historyTimeline: document.getElementById('historyTimeline'),

        // Settings
        cameraSelect: document.getElementById('cameraSelect'),
        autoSave: document.getElementById('autoSave'),
        flashEnabled: document.getElementById('flashEnabled'),
        themeSelect: document.getElementById('themeSelect'),
        exportAllData: document.getElementById('exportAllData'),
        clearAllData: document.getElementById('clearAllData'),

        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        fabBtn: document.getElementById('fabBtn'),

        // Toast
        toast: document.getElementById('toast')
    };

    // ===================================
    // Local Storage
    // ===================================
    const storage = {
        keys: {
            scans: 'warehouseScanner_scans',
            history: 'warehouseScanner_history',
            sheets: 'warehouseScanner_sheets',
            currentSheet: 'warehouseScanner_currentSheet',
            settings: 'warehouseScanner_settings'
        },

        save(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
            }
        },

        load(key, defaultValue = []) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
                return defaultValue;
            }
        },

        clear(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('Failed to clear localStorage:', e);
            }
        }
    };

    // ===================================
    // Audio for scan feedback
    // ===================================
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    function playBeep() {
        if (!state.settings.soundEnabled) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    // ===================================
    // Toast Notifications
    // ===================================
    function showToast(message, type = 'default') {
        const toast = elements.toast;
        const toastMessage = toast.querySelector('.toast-message');

        toast.classList.remove('success', 'error', 'show');

        if (type !== 'default') {
            toast.classList.add(type);
        }

        toastMessage.textContent = message;

        // Force reflow
        void toast.offsetWidth;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ===================================
    // Sidebar Functions
    // ===================================
    function openSidebar() {
        elements.sidebar.classList.add('open');
        elements.sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        elements.sidebar.classList.remove('open');
        elements.sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function toggleSheetMenu() {
        elements.sheetDropdown.classList.toggle('open');
        elements.sheetMenu.classList.toggle('open');
    }

    function closeSheetMenu() {
        elements.sheetDropdown.classList.remove('open');
        elements.sheetMenu.classList.remove('open');
    }

    function renderSheets() {
        elements.sheetList.innerHTML = '';
        state.sheets.forEach(sheet => {
            const div = document.createElement('div');
            div.className = `sheet-item ${sheet.id === state.currentSheet ? 'active' : ''}`;
            div.textContent = sheet.name;
            div.addEventListener('click', () => selectSheet(sheet.id));
            elements.sheetList.appendChild(div);
        });
    }

    function selectSheet(sheetId) {
        state.currentSheet = sheetId;
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (sheet) {
            elements.currentSheetName.textContent = sheet.name;
        }
        storage.save(storage.keys.currentSheet, sheetId);
        closeSheetMenu();
        renderSheets();
        loadScansForCurrentSheet();
    }

    function addNewSheet() {
        const name = prompt('Enter sheet name:');
        if (name && name.trim()) {
            const newSheet = {
                id: `sheet_${Date.now()}`,
                name: name.trim()
            };
            state.sheets.push(newSheet);
            storage.save(storage.keys.sheets, state.sheets);
            renderSheets();
            selectSheet(newSheet.id);
            showToast(`Created sheet: ${name}`, 'success');
        }
    }

    function loadScansForCurrentSheet() {
        const allScans = storage.load(storage.keys.scans, {});
        state.scans = allScans[state.currentSheet] || [];
        renderScans();
        renderInventory();
        updateStats();
    }

    function saveScansForCurrentSheet() {
        const allScans = storage.load(storage.keys.scans, {});
        allScans[state.currentSheet] = state.scans;
        storage.save(storage.keys.scans, allScans);
    }

    // ===================================
    // Scanner Functions
    // ===================================
    async function startScanner() {
        if (state.isScanning) {
            stopScanner();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: state.settings.camera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            state.stream = stream;
            state.isScanning = true;

            elements.scannerVideo.srcObject = stream;
            elements.scannerVideo.classList.add('active');
            elements.scannerPlaceholder.classList.add('hidden');

            const overlay = elements.scannerViewport.querySelector('.scanner-overlay');
            overlay.classList.add('active');

            elements.scanBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                </svg>
                Stop Scanner
            `;

            showToast('Scanner activated - point at barcode', 'success');

            startBarcodeDetection();

        } catch (err) {
            console.error('Camera access error:', err);

            if (err.name === 'NotAllowedError') {
                showToast('Camera permission denied', 'error');
            } else if (err.name === 'NotFoundError') {
                showToast('No camera found', 'error');
            } else {
                showToast('Could not access camera', 'error');
            }
        }
    }

    function stopScanner() {
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
            state.stream = null;
        }

        state.isScanning = false;

        elements.scannerVideo.classList.remove('active');
        elements.scannerVideo.srcObject = null;
        elements.scannerPlaceholder.classList.remove('hidden');

        const overlay = elements.scannerViewport.querySelector('.scanner-overlay');
        overlay.classList.remove('active');

        elements.scanBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                <line x1="7" y1="12" x2="17" y2="12"></line>
            </svg>
            Start Scanner
        `;
    }

    function startBarcodeDetection() {
        // For demo, simulate barcode detection on click/tap
        elements.scannerVideo.addEventListener('click', simulateScan);
    }

    function simulateScan() {
        if (!state.isScanning) return;

        const barcode = generateRandomBarcode();
        addScan(barcode, 1, '', '', 'scan');
        showToast(`Scanned: ${barcode}`, 'success');

        playBeep();

        if (state.settings.vibrateEnabled && navigator.vibrate) {
            navigator.vibrate(100);
        }

        if (!state.settings.continuousScan) {
            stopScanner();
        }
    }

    function generateRandomBarcode() {
        const prefixes = ['SKU', 'ITM', 'PRD', 'BOX', 'PLT', 'UPC'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const number = Math.floor(Math.random() * 900000) + 100000;
        return `${prefix}-${number}`;
    }

    // ===================================
    // Scan Management
    // ===================================
    function addScan(code, quantity = 1, name = '', notes = '', type = 'manual') {
        const scan = {
            id: Date.now(),
            code: code.toUpperCase().trim(),
            name: name.trim(),
            quantity: quantity,
            notes: notes.trim(),
            timestamp: new Date().toISOString(),
            sheetId: state.currentSheet
        };

        const existingIndex = state.scans.findIndex(s => s.code === scan.code);

        if (existingIndex >= 0) {
            state.scans[existingIndex].quantity += quantity;
            state.scans[existingIndex].timestamp = scan.timestamp;
            if (name) state.scans[existingIndex].name = name;
            if (notes) state.scans[existingIndex].notes = notes;
        } else {
            state.scans.unshift(scan);
        }

        // Add to history
        addHistoryEntry(type === 'scan' ? 'Scanned' : 'Added', scan.code, quantity);

        saveScansForCurrentSheet();
        renderScans();
        renderInventory();
        updateStats();
    }

    function removeScan(id) {
        const scan = state.scans.find(s => s.id === id);
        if (scan) {
            addHistoryEntry('Deleted', scan.code, scan.quantity);
        }

        state.scans = state.scans.filter(scan => scan.id !== id);
        saveScansForCurrentSheet();
        renderScans();
        renderInventory();
        updateStats();
        showToast('Item removed');
    }

    function updateScan(id, updates) {
        const scan = state.scans.find(s => s.id === id);
        if (scan) {
            Object.assign(scan, updates);
            scan.timestamp = new Date().toISOString();
            saveScansForCurrentSheet();
            renderScans();
            renderInventory();
            addHistoryEntry('Updated', scan.code);
        }
    }

    function clearAllScans() {
        if (confirm('Clear all scanned items? This cannot be undone.')) {
            addHistoryEntry('Cleared', `${state.scans.length} items`);
            state.scans = [];
            saveScansForCurrentSheet();
            renderScans();
            renderInventory();
            updateStats();
            showToast('All items cleared');
        }
    }

    // ===================================
    // History Management
    // ===================================
    function addHistoryEntry(action, item, quantity = null) {
        const entry = {
            id: Date.now(),
            action,
            item,
            quantity,
            timestamp: new Date().toISOString(),
            sheetId: state.currentSheet
        };

        state.history.unshift(entry);

        // Keep only last 100 entries
        if (state.history.length > 100) {
            state.history = state.history.slice(0, 100);
        }

        storage.save(storage.keys.history, state.history);
    }

    function renderHistory() {
        const container = elements.historyTimeline;
        container.innerHTML = '';

        if (state.history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>No history yet</p>
                    <span>Your scan and inventory actions will appear here</span>
                </div>
            `;
            return;
        }

        // Group by date
        const grouped = {};
        state.history.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(entry);
        });

        Object.entries(grouped).forEach(([date, entries]) => {
            const group = document.createElement('div');
            group.className = 'history-date-group';

            const dateHeader = document.createElement('div');
            dateHeader.className = 'history-date';
            dateHeader.textContent = date;
            group.appendChild(dateHeader);

            entries.forEach(entry => {
                const item = document.createElement('div');
                item.className = 'history-item';

                let iconClass = 'scan';
                let iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                    <line x1="7" y1="12" x2="17" y2="12"></line>
                </svg>`;

                if (entry.action === 'Added') {
                    iconClass = 'add';
                    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>`;
                } else if (entry.action === 'Deleted' || entry.action === 'Cleared') {
                    iconClass = 'delete';
                    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>`;
                }

                const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                item.innerHTML = `
                    <div class="history-icon ${iconClass}">${iconSvg}</div>
                    <div class="history-content">
                        <div class="history-action">
                            <strong>${entry.action}</strong> ${escapeHtml(entry.item)}
                            ${entry.quantity ? `(x${entry.quantity})` : ''}
                        </div>
                        <div class="history-time">${time}</div>
                    </div>
                `;

                group.appendChild(item);
            });

            container.appendChild(group);
        });
    }

    // ===================================
    // UI Rendering
    // ===================================
    function renderScans() {
        const container = elements.scansList;

        // Filter by search
        let filteredScans = state.scans;
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            filteredScans = state.scans.filter(scan =>
                scan.code.toLowerCase().includes(query) ||
                (scan.name && scan.name.toLowerCase().includes(query))
            );
        }

        if (filteredScans.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.clearScansBtn.style.display = 'none';

            const scanItems = container.querySelectorAll('.scan-item');
            scanItems.forEach(item => item.remove());
            return;
        }

        elements.emptyState.classList.add('hidden');
        elements.clearScansBtn.style.display = '';

        const scanItems = container.querySelectorAll('.scan-item');
        scanItems.forEach(item => item.remove());

        filteredScans.forEach(scan => {
            const item = createScanItemElement(scan);
            container.appendChild(item);
        });
    }

    function createScanItemElement(scan) {
        const div = document.createElement('div');
        div.className = 'scan-item';
        div.dataset.id = scan.id;

        const timeAgo = getTimeAgo(new Date(scan.timestamp));

        div.innerHTML = `
            <div class="scan-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="7" y1="12" x2="17" y2="12"></line>
                </svg>
            </div>
            <div class="scan-item-content">
                <div class="scan-item-code">${escapeHtml(scan.code)}</div>
                ${scan.name ? `<div class="scan-item-name">${escapeHtml(scan.name)}</div>` : ''}
                <div class="scan-item-meta">
                    <span class="scan-item-qty">Qty: ${scan.quantity}</span>
                    <span>${timeAgo}</span>
                </div>
            </div>
            <div class="scan-item-actions">
                <button class="scan-item-btn edit" aria-label="Edit" data-action="edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="scan-item-btn delete" aria-label="Delete" data-action="delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        div.addEventListener('click', (e) => {
            if (!e.target.closest('.scan-item-btn')) {
                openItemDetail(scan);
            }
        });

        const editBtn = div.querySelector('[data-action="edit"]');
        const deleteBtn = div.querySelector('[data-action="delete"]');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openItemDetail(scan);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeScan(scan.id);
        });

        return div;
    }

    function renderInventory() {
        const container = elements.inventoryList;
        container.innerHTML = '';

        // Get sorted scans
        let sortedScans = [...state.scans];
        const sortValue = elements.sortBy.value;

        if (sortValue === 'name') {
            sortedScans.sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
        } else if (sortValue === 'quantity') {
            sortedScans.sort((a, b) => b.quantity - a.quantity);
        }
        // 'recent' is default, already sorted by timestamp

        // Filter by search
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            sortedScans = sortedScans.filter(scan =>
                scan.code.toLowerCase().includes(query) ||
                (scan.name && scan.name.toLowerCase().includes(query))
            );
        }

        if (sortedScans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    <p>No items in inventory</p>
                    <span>Scan or add items to see them here</span>
                </div>
            `;
            return;
        }

        sortedScans.forEach(scan => {
            const item = createScanItemElement(scan);
            container.appendChild(item);
        });
    }

    function updateStats() {
        const totalItems = state.scans.length;
        const totalQty = state.scans.reduce((sum, scan) => sum + scan.quantity, 0);

        // Count today's scans
        const today = new Date().toDateString();
        const todayCount = state.scans.filter(scan =>
            new Date(scan.timestamp).toDateString() === today
        ).length;

        elements.totalItems.textContent = totalItems;
        elements.totalQuantity.textContent = totalQty;
        elements.todayScans.textContent = todayCount;
        elements.inventoryBadge.textContent = totalItems;
    }

    // ===================================
    // Modal Functions
    // ===================================
    function openManualEntryModal() {
        elements.manualEntryModal.classList.add('active');
        elements.barcodeInput.value = '';
        elements.itemName.value = '';
        elements.quantityInput.value = '1';
        elements.itemNotes.value = '';
        elements.barcodeInput.focus();
        document.body.style.overflow = 'hidden';
    }

    function closeManualEntryModal() {
        elements.manualEntryModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function submitManualEntry() {
        const code = elements.barcodeInput.value.trim();
        const name = elements.itemName.value.trim();
        const quantity = parseInt(elements.quantityInput.value, 10) || 1;
        const notes = elements.itemNotes.value.trim();

        if (!code) {
            showToast('Please enter a barcode or SKU', 'error');
            elements.barcodeInput.focus();
            return;
        }

        addScan(code, quantity, name, notes, 'manual');
        showToast(`Added: ${code} (x${quantity})`, 'success');

        playBeep();
        if (state.settings.vibrateEnabled && navigator.vibrate) {
            navigator.vibrate(50);
        }

        closeManualEntryModal();
    }

    let currentEditItem = null;

    function openItemDetail(scan) {
        currentEditItem = scan;

        elements.itemDetailContent.innerHTML = `
            <div class="form-group">
                <label>Barcode / SKU</label>
                <input type="text" id="editCode" class="form-input" value="${escapeHtml(scan.code)}">
            </div>
            <div class="form-group">
                <label>Item Name</label>
                <input type="text" id="editName" class="form-input" value="${escapeHtml(scan.name || '')}" placeholder="Optional item name">
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <div class="quantity-control">
                    <button class="qty-btn" id="editQtyDecrease">-</button>
                    <input type="number" id="editQuantity" class="form-input qty-input" value="${scan.quantity}" min="1">
                    <button class="qty-btn" id="editQtyIncrease">+</button>
                </div>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="editNotes" class="form-input form-textarea" placeholder="Optional notes" rows="3">${escapeHtml(scan.notes || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Last Updated</label>
                <p style="color: var(--color-gray-500); font-size: var(--font-size-sm);">
                    ${new Date(scan.timestamp).toLocaleString()}
                </p>
            </div>
        `;

        // Bind quantity buttons
        const qtyInput = document.getElementById('editQuantity');
        document.getElementById('editQtyDecrease').addEventListener('click', () => {
            qtyInput.value = Math.max(1, parseInt(qtyInput.value) - 1);
        });
        document.getElementById('editQtyIncrease').addEventListener('click', () => {
            qtyInput.value = parseInt(qtyInput.value) + 1;
        });

        elements.itemDetailModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeItemDetailModal() {
        elements.itemDetailModal.classList.remove('active');
        document.body.style.overflow = '';
        currentEditItem = null;
    }

    function saveItemDetail() {
        if (!currentEditItem) return;

        const code = document.getElementById('editCode').value.trim();
        const name = document.getElementById('editName').value.trim();
        const quantity = parseInt(document.getElementById('editQuantity').value, 10) || 1;
        const notes = document.getElementById('editNotes').value.trim();

        if (!code) {
            showToast('Code is required', 'error');
            return;
        }

        updateScan(currentEditItem.id, {
            code: code.toUpperCase(),
            name,
            quantity,
            notes
        });

        showToast('Item updated', 'success');
        closeItemDetailModal();
    }

    function deleteCurrentItem() {
        if (!currentEditItem) return;

        if (confirm('Delete this item?')) {
            removeScan(currentEditItem.id);
            closeItemDetailModal();
        }
    }

    function adjustQuantity(delta) {
        const input = elements.quantityInput;
        const current = parseInt(input.value, 10) || 1;
        input.value = Math.max(1, current + delta);
    }

    // ===================================
    // Navigation
    // ===================================
    function switchView(view) {
        state.currentView = view;

        // Update view title
        const titles = {
            scanner: 'Scan',
            inventory: 'Inventory',
            history: 'History',
            settings: 'Settings'
        };
        elements.viewTitle.textContent = titles[view] || 'Warehouse Scanner';

        // Update active states
        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        elements.sidebarNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Show/hide views
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.remove('active');
        });

        const viewElement = document.getElementById(`${view}View`);
        if (viewElement) {
            viewElement.classList.add('active');
        }

        // Render view-specific content
        if (view === 'history') {
            renderHistory();
        } else if (view === 'inventory') {
            renderInventory();
        }

        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
            closeSidebar();
        }
    }

    // ===================================
    // Search
    // ===================================
    function toggleSearch() {
        elements.searchBar.classList.toggle('active');
        if (elements.searchBar.classList.contains('active')) {
            elements.searchInput.focus();
        } else {
            elements.searchInput.value = '';
            state.searchQuery = '';
            renderScans();
            renderInventory();
        }
    }

    function handleSearch() {
        state.searchQuery = elements.searchInput.value;
        renderScans();
        renderInventory();
    }

    function clearSearch() {
        elements.searchInput.value = '';
        state.searchQuery = '';
        renderScans();
        renderInventory();
    }

    // ===================================
    // Export Functions
    // ===================================
    function exportData(format) {
        if (state.scans.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        let content = '';
        let filename = '';
        let mimeType = '';

        switch (format) {
            case 'csv':
                content = exportToCSV();
                filename = `inventory_${Date.now()}.csv`;
                mimeType = 'text/csv';
                break;
            case 'json':
                content = JSON.stringify(state.scans, null, 2);
                filename = `inventory_${Date.now()}.json`;
                mimeType = 'application/json';
                break;
            case 'excel':
                content = exportToCSV();
                filename = `inventory_${Date.now()}.csv`;
                mimeType = 'application/vnd.ms-excel';
                break;
            default:
                return;
        }

        downloadFile(content, filename, mimeType);
        showToast(`Exported ${state.scans.length} items as ${format.toUpperCase()}`, 'success');
    }

    function exportToCSV() {
        const headers = ['Code', 'Name', 'Quantity', 'Notes', 'Timestamp'];
        const rows = state.scans.map(scan => [
            scan.code,
            scan.name || '',
            scan.quantity,
            scan.notes || '',
            scan.timestamp
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===================================
    // Settings
    // ===================================
    function applySettings() {
        // Apply theme
        if (state.settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (state.settings.theme === 'light') {
            document.body.classList.remove('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Update UI controls
        elements.continuousScan.checked = state.settings.continuousScan;
        elements.soundEnabled.checked = state.settings.soundEnabled;
        elements.vibrateEnabled.checked = state.settings.vibrateEnabled;
        elements.autoSave.checked = state.settings.autoSave;
        elements.flashEnabled.checked = state.settings.flashEnabled;
        elements.themeSelect.value = state.settings.theme;
        elements.cameraSelect.value = state.settings.camera;
    }

    function saveSettings() {
        storage.save(storage.keys.settings, state.settings);
    }

    function clearAllData() {
        if (confirm('Delete ALL data including scans, history, and sheets? This cannot be undone!')) {
            localStorage.clear();
            location.reload();
        }
    }

    // ===================================
    // Utility Functions
    // ===================================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    // ===================================
    // Event Listeners
    // ===================================
    function initEventListeners() {
        // Sidebar
        elements.menuBtn.addEventListener('click', openSidebar);
        elements.sidebarClose.addEventListener('click', closeSidebar);
        elements.sidebarOverlay.addEventListener('click', closeSidebar);

        // Sheet selector
        elements.sheetDropdown.addEventListener('click', toggleSheetMenu);
        elements.addSheetBtn.addEventListener('click', addNewSheet);

        // Sidebar navigation
        elements.sidebarNavItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view));
        });

        // Export buttons
        elements.exportBtns.forEach(btn => {
            btn.addEventListener('click', () => exportData(btn.dataset.format));
        });

        // Scanner controls
        elements.scanBtn.addEventListener('click', startScanner);
        elements.scannerPlaceholder.addEventListener('click', startScanner);
        elements.manualEntryBtn.addEventListener('click', openManualEntryModal);

        // Quick settings
        elements.continuousScan.addEventListener('change', (e) => {
            state.settings.continuousScan = e.target.checked;
            saveSettings();
        });
        elements.soundEnabled.addEventListener('change', (e) => {
            state.settings.soundEnabled = e.target.checked;
            saveSettings();
        });
        elements.vibrateEnabled.addEventListener('change', (e) => {
            state.settings.vibrateEnabled = e.target.checked;
            saveSettings();
        });

        // Manual entry modal
        elements.closeManualEntry.addEventListener('click', closeManualEntryModal);
        elements.cancelManualEntry.addEventListener('click', closeManualEntryModal);
        elements.submitManualEntry.addEventListener('click', submitManualEntry);
        elements.qtyDecrease.addEventListener('click', () => adjustQuantity(-1));
        elements.qtyIncrease.addEventListener('click', () => adjustQuantity(1));

        elements.manualEntryModal.querySelector('.modal-backdrop').addEventListener('click', closeManualEntryModal);

        elements.barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitManualEntry();
            }
        });

        // Item detail modal
        elements.closeItemDetail.addEventListener('click', closeItemDetailModal);
        elements.itemDetailModal.querySelector('.modal-backdrop').addEventListener('click', closeItemDetailModal);
        elements.saveItemBtn.addEventListener('click', saveItemDetail);
        elements.deleteItemBtn.addEventListener('click', deleteCurrentItem);

        // Clear scans
        elements.clearScansBtn.addEventListener('click', clearAllScans);

        // Navigation
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view));
        });

        // FAB
        elements.fabBtn.addEventListener('click', openManualEntryModal);

        // Search
        elements.searchToggle.addEventListener('click', toggleSearch);
        elements.searchInput.addEventListener('input', handleSearch);
        elements.searchClear.addEventListener('click', clearSearch);

        // Inventory sorting
        elements.sortBy.addEventListener('change', renderInventory);

        // Settings
        elements.cameraSelect.addEventListener('change', (e) => {
            state.settings.camera = e.target.value;
            saveSettings();
        });
        elements.autoSave.addEventListener('change', (e) => {
            state.settings.autoSave = e.target.checked;
            saveSettings();
        });
        elements.flashEnabled.addEventListener('change', (e) => {
            state.settings.flashEnabled = e.target.checked;
            saveSettings();
        });
        elements.themeSelect.addEventListener('change', (e) => {
            state.settings.theme = e.target.value;
            saveSettings();
            applySettings();
        });
        elements.exportAllData.addEventListener('click', () => exportData('json'));
        elements.clearAllData.addEventListener('click', clearAllData);

        // Handle visibility change (stop scanner when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.isScanning) {
                stopScanner();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.manualEntryModal.classList.contains('active')) {
                    closeManualEntryModal();
                } else if (elements.itemDetailModal.classList.contains('active')) {
                    closeItemDetailModal();
                } else if (elements.sidebar.classList.contains('open')) {
                    closeSidebar();
                }
            }
        });

        // Close sheet menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sheet-selector')) {
                closeSheetMenu();
            }
        });
    }

    // ===================================
    // Initialization
    // ===================================
    function init() {
        // Load settings
        state.settings = { ...state.settings, ...storage.load(storage.keys.settings, {}) };

        // Load sheets
        state.sheets = storage.load(storage.keys.sheets, [{ id: 'default', name: 'Default Inventory' }]);
        state.currentSheet = storage.load(storage.keys.currentSheet, 'default');

        // Load history
        state.history = storage.load(storage.keys.history, []);

        // Load scans for current sheet
        loadScansForCurrentSheet();

        // Apply settings
        applySettings();

        // Render UI
        renderSheets();
        renderScans();
        updateStats();

        // Update sheet name
        const currentSheet = state.sheets.find(s => s.id === state.currentSheet);
        if (currentSheet) {
            elements.currentSheetName.textContent = currentSheet.name;
        }

        // Initialize event listeners
        initEventListeners();

        // Check for camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            elements.scanBtn.disabled = true;
            elements.scannerPlaceholder.innerHTML = `
                <svg class="scanner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                <p>Camera not supported</p>
                <span>Use manual entry instead</span>
            `;
        }

        console.log('Warehouse Scanner v2.0.0 initialized');
    }

    // Start the app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
