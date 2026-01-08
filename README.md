# Warehouse Scanner - AI Bulk Item Counting

AI-powered bulk item counting for warehouse inventory management. Use your smartphone camera to count multiple identical items instantly with computer vision.

## Features

### Vision Mode - AI Bulk Counting
- **Real-time Object Detection**: Point your camera at items and see them detected instantly
- **Multiple Templates**:
  - Circles/Pipes - For counting pipe ends, circular items
  - Rectangles/Boxes - For counting boxes, pallets, rectangular items
  - Auto-Detect - Uses COCO-SSD model for general object detection
- **AR Overlay**: Green bounding boxes with confidence scores overlay detected items
- **Manual Corrections**: Tap to add missed items or remove false positives

### Offline-First Architecture
- **Edge AI**: TensorFlow.js runs entirely on-device - no internet required
- **IndexedDB Storage**: All data persists locally
- **PWA Support**: Install as a native-like app on any device

### Battery Optimization
- **Sleep Mode**: Automatically pauses detection after 30 seconds of inactivity
- **Motion Detection**: Uses device accelerometer to wake on movement
- **Efficient Processing**: Frame capture throttled to 100ms intervals

### Spatial Tracking
- **Deduplication**: Prevents double-counting when panning the camera
- **Marker System**: Tracks confirmed items in 3D space

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Fast development and optimized builds
- **TensorFlow.js** + COCO-SSD - On-device object detection
- **Zustand** - Lightweight state management
- **idb** - IndexedDB wrapper for offline storage
- **Vite PWA Plugin** - Service worker and manifest generation

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── CameraView/       # Camera capture and video stream
│   ├── Sheet/            # Inventory sheet management
│   └── VisionMode/       # AI counting interface
│       ├── VisionModeToggle.tsx   # Template selection
│       ├── DetectionOverlay.tsx   # AR bounding boxes
│       ├── CountDisplay.tsx       # Count UI and actions
│       └── VisionModeScreen.tsx   # Main vision mode container
├── hooks/
│   ├── useCamera.ts      # Camera access and frame capture
│   └── useSleepMode.ts   # Battery-saving sleep detection
├── services/
│   ├── objectDetection.ts # TensorFlow.js detection engine
│   └── database.ts        # IndexedDB operations
├── store/
│   ├── useVisionStore.ts  # Vision mode state
│   └── useSheetStore.ts   # Sheet/inventory state
├── types/
│   └── index.ts           # TypeScript type definitions
└── styles/
    └── global.css         # Global styles and CSS variables
```

## User Flow

1. **Open Sheet**: View your inventory sheet with existing items
2. **Tap AI Count**: Enter Vision Mode by tapping the floating action button
3. **Select Template**: Choose Pipes/Circles, Boxes/Rectangles, or Auto-Detect
4. **Frame & Detect**: Point camera at items - green boxes appear on detected items
5. **Refine**: Tap missed items to add, tap false positives to remove
6. **Sync to Sheet**: Confirm count to add to your inventory sheet

## Configuration

### Detection Settings (via useVisionStore)
- `confidenceThreshold`: Minimum confidence score (default: 0.5)
- `enableDeduplication`: Prevent double-counting (default: true)
- `deduplicationDistanceThreshold`: Pixel distance for duplicates (default: 50)
- `sleepTimeoutMs`: Inactivity timeout before sleep (default: 30000)

## Browser Requirements

- Modern browser with camera access (getUserMedia API)
- WebGL support for TensorFlow.js
- IndexedDB support for offline storage

## License

MIT