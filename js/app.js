/**
 * Warehouse Scanner - Mobile-Friendly App
 * Main Application JavaScript
 */

(function() {
    'use strict';

    // ===================================
    // App State
    // ===================================
    const state = {
        scans: [],
        isScanning: false,
        currentView: 'scanner',
        stream: null
    };

    // ===================================
    // DOM Elements
    // ===================================
    const elements = {
        // Scanner
        scannerViewport: document.getElementById('scannerViewport'),
        scannerVideo: document.getElementById('scannerVideo'),
        scannerPlaceholder: document.getElementById('scannerPlaceholder'),
        scanBtn: document.getElementById('scanBtn'),
        manualEntryBtn: document.getElementById('manualEntryBtn'),

        // Manual Entry Modal
        manualEntryModal: document.getElementById('manualEntryModal'),
        closeManualEntry: document.getElementById('closeManualEntry'),
        cancelManualEntry: document.getElementById('cancelManualEntry'),
        submitManualEntry: document.getElementById('submitManualEntry'),
        barcodeInput: document.getElementById('barcodeInput'),
        quantityInput: document.getElementById('quantityInput'),
        qtyDecrease: document.getElementById('qtyDecrease'),
        qtyIncrease: document.getElementById('qtyIncrease'),

        // Scans List
        scansList: document.getElementById('scansList'),
        emptyState: document.getElementById('emptyState'),
        clearScansBtn: document.getElementById('clearScansBtn'),

        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        menuBtn: document.getElementById('menuBtn'),

        // Toast
        toast: document.getElementById('toast')
    };

    // ===================================
    // Local Storage
    // ===================================
    const storage = {
        key: 'warehouseScanner_scans',

        save(scans) {
            try {
                localStorage.setItem(this.key, JSON.stringify(scans));
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
            }
        },

        load() {
            try {
                const data = localStorage.getItem(this.key);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
                return [];
            }
        },

        clear() {
            try {
                localStorage.removeItem(this.key);
            } catch (e) {
                console.warn('Failed to clear localStorage:', e);
            }
        }
    };

    // ===================================
    // Toast Notifications
    // ===================================
    function showToast(message, type = 'default') {
        const toast = elements.toast;
        const toastMessage = toast.querySelector('.toast-message');

        // Remove previous type classes
        toast.classList.remove('success', 'error');

        // Add new type class if not default
        if (type !== 'default') {
            toast.classList.add(type);
        }

        toastMessage.textContent = message;
        toast.classList.add('show');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
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
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            state.stream = stream;
            state.isScanning = true;

            // Setup video element
            elements.scannerVideo.srcObject = stream;
            elements.scannerVideo.classList.add('active');
            elements.scannerPlaceholder.classList.add('hidden');

            // Show scanner overlay
            const overlay = elements.scannerViewport.querySelector('.scanner-overlay');
            overlay.classList.add('active');

            // Update button
            elements.scanBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                </svg>
                Stop Scanner
            `;

            showToast('Scanner activated - point at barcode', 'success');

            // Start simulated scanning (in a real app, use a barcode library)
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="7" y1="12" x2="17" y2="12"></line>
            </svg>
            Start Scanner
        `;
    }

    // Simulated barcode detection (replace with real library like QuaggaJS or ZXing)
    function startBarcodeDetection() {
        // In a production app, you would use a library like:
        // - QuaggaJS (https://serratus.github.io/quaggaJS/)
        // - ZXing (https://github.com/nicl/zxing-typescript)
        // - html5-qrcode (https://github.com/mebjas/html5-qrcode)

        // For demo purposes, we'll simulate detection with touch
        elements.scannerVideo.addEventListener('click', simulateScan);
    }

    function simulateScan() {
        if (!state.isScanning) return;

        // Generate a random barcode for demo
        const barcode = generateRandomBarcode();
        addScan(barcode, 1);
        showToast(`Scanned: ${barcode}`, 'success');

        // Provide haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }

    function generateRandomBarcode() {
        const prefixes = ['SKU', 'ITM', 'PRD', 'BOX'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const number = Math.floor(Math.random() * 900000) + 100000;
        return `${prefix}-${number}`;
    }

    // ===================================
    // Scan Management
    // ===================================
    function addScan(code, quantity = 1) {
        const scan = {
            id: Date.now(),
            code: code.toUpperCase().trim(),
            quantity: quantity,
            timestamp: new Date().toISOString()
        };

        // Check if item already exists
        const existingIndex = state.scans.findIndex(s => s.code === scan.code);

        if (existingIndex >= 0) {
            state.scans[existingIndex].quantity += quantity;
            state.scans[existingIndex].timestamp = scan.timestamp;
        } else {
            state.scans.unshift(scan);
        }

        storage.save(state.scans);
        renderScans();
    }

    function removeScan(id) {
        state.scans = state.scans.filter(scan => scan.id !== id);
        storage.save(state.scans);
        renderScans();
        showToast('Item removed');
    }

    function updateScanQuantity(id, delta) {
        const scan = state.scans.find(s => s.id === id);
        if (scan) {
            scan.quantity = Math.max(1, scan.quantity + delta);
            storage.save(state.scans);
            renderScans();
        }
    }

    function clearAllScans() {
        if (confirm('Clear all scanned items?')) {
            state.scans = [];
            storage.clear();
            renderScans();
            showToast('All items cleared');
        }
    }

    // ===================================
    // UI Rendering
    // ===================================
    function renderScans() {
        const container = elements.scansList;

        // Show/hide empty state
        if (state.scans.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.clearScansBtn.style.display = 'none';

            // Remove scan items but keep empty state
            const scanItems = container.querySelectorAll('.scan-item');
            scanItems.forEach(item => item.remove());
            return;
        }

        elements.emptyState.classList.add('hidden');
        elements.clearScansBtn.style.display = '';

        // Clear existing items (except empty state)
        const scanItems = container.querySelectorAll('.scan-item');
        scanItems.forEach(item => item.remove());

        // Render each scan
        state.scans.forEach(scan => {
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
                <div class="scan-item-meta">
                    <span class="scan-item-qty">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                        </svg>
                        Qty: ${scan.quantity}
                    </span>
                    <span>${timeAgo}</span>
                </div>
            </div>
            <div class="scan-item-actions">
                <button class="scan-item-btn edit" aria-label="Edit quantity" data-action="edit">
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

        // Add event listeners
        const editBtn = div.querySelector('[data-action="edit"]');
        const deleteBtn = div.querySelector('[data-action="delete"]');

        editBtn.addEventListener('click', () => {
            const newQty = prompt('Enter new quantity:', scan.quantity);
            if (newQty !== null) {
                const qty = parseInt(newQty, 10);
                if (!isNaN(qty) && qty > 0) {
                    scan.quantity = qty;
                    storage.save(state.scans);
                    renderScans();
                }
            }
        });

        deleteBtn.addEventListener('click', () => removeScan(scan.id));

        return div;
    }

    // ===================================
    // Modal Functions
    // ===================================
    function openManualEntryModal() {
        elements.manualEntryModal.classList.add('active');
        elements.barcodeInput.value = '';
        elements.quantityInput.value = '1';
        elements.barcodeInput.focus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    function closeManualEntryModal() {
        elements.manualEntryModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function submitManualEntry() {
        const code = elements.barcodeInput.value.trim();
        const quantity = parseInt(elements.quantityInput.value, 10) || 1;

        if (!code) {
            showToast('Please enter a barcode or SKU', 'error');
            elements.barcodeInput.focus();
            return;
        }

        addScan(code, quantity);
        showToast(`Added: ${code} (x${quantity})`, 'success');
        closeManualEntryModal();
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

        // Update nav items
        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // In a full app, you would show/hide different sections
        // For now, we just show a toast
        if (view !== 'scanner') {
            showToast(`${capitalize(view)} view coming soon`);
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

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    // ===================================
    // Event Listeners
    // ===================================
    function initEventListeners() {
        // Scanner controls
        elements.scanBtn.addEventListener('click', startScanner);
        elements.scannerPlaceholder.addEventListener('click', startScanner);
        elements.manualEntryBtn.addEventListener('click', openManualEntryModal);

        // Manual entry modal
        elements.closeManualEntry.addEventListener('click', closeManualEntryModal);
        elements.cancelManualEntry.addEventListener('click', closeManualEntryModal);
        elements.submitManualEntry.addEventListener('click', submitManualEntry);
        elements.qtyDecrease.addEventListener('click', () => adjustQuantity(-1));
        elements.qtyIncrease.addEventListener('click', () => adjustQuantity(1));

        // Close modal on backdrop click
        elements.manualEntryModal.querySelector('.modal-backdrop').addEventListener('click', closeManualEntryModal);

        // Submit on Enter key in barcode input
        elements.barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitManualEntry();
            }
        });

        // Clear scans
        elements.clearScansBtn.addEventListener('click', clearAllScans);

        // Navigation
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view));
        });

        // Menu button (placeholder for sidebar)
        elements.menuBtn.addEventListener('click', () => {
            showToast('Menu coming soon');
        });

        // Handle visibility change (stop scanner when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.isScanning) {
                stopScanner();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modal
            if (e.key === 'Escape' && elements.manualEntryModal.classList.contains('active')) {
                closeManualEntryModal();
            }
        });
    }

    // ===================================
    // Initialization
    // ===================================
    function init() {
        // Load saved scans
        state.scans = storage.load();

        // Initialize event listeners
        initEventListeners();

        // Initial render
        renderScans();

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

        console.log('Warehouse Scanner initialized');
    }

    // Start the app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
