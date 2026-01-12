# Warehouse Scanner

A mobile-friendly web application for warehouse inventory scanning and management.

## Features

- Barcode/QR code scanning via device camera
- Manual barcode/SKU entry
- Quantity tracking
- Scan history with local storage persistence
- Touch-friendly interface with large tap targets (48px minimum)
- Responsive design (mobile-first)
- Dark mode support (follows system preference)
- PWA-ready (installable on mobile devices)

## Mobile-Friendly Design

This app is built with mobile-first principles:

- **Responsive viewport**: Proper meta tags prevent unwanted zoom and ensure correct scaling
- **Touch targets**: All interactive elements are at least 48x48px for easy tapping
- **Bottom navigation**: Easy thumb access on mobile devices
- **Safe area support**: Accounts for notches and home indicators on modern phones
- **Modal sheets**: Slide-up modals optimized for mobile interaction
- **Haptic feedback**: Vibration on successful scans (where supported)
- **Camera access**: Uses rear camera by default for scanning

## Getting Started

### Development

```bash
# Serve the app locally
npx serve .

# Or with a specific port
npx serve . -l 3000
```

Then open `http://localhost:3000` in your browser.

### Testing on Mobile

1. Serve the app on your local network
2. Find your computer's local IP address
3. Open `http://YOUR_IP:3000` on your mobile device
4. For camera access, you may need HTTPS (use a tool like ngrok)

## Browser Support

- Chrome/Edge 80+
- Safari 14+
- Firefox 78+

## Project Structure

```
warehouseScanner/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Mobile-first responsive styles
├── js/
│   └── app.js          # Application logic
├── manifest.json       # PWA manifest
├── package.json        # Project configuration
└── README.md           # This file
```

## License

MIT
