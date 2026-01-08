import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Detection,
  ObjectTemplate,
  VisionModeState,
  AppSettings,
  CountSession,
  SpatialMarker,
} from '../types';

interface VisionStore extends VisionModeState {
  // Settings
  settings: AppSettings;

  // Current session
  currentSession: CountSession | null;

  // Actions
  startVisionMode: (template: ObjectTemplate) => void;
  stopVisionMode: () => void;
  pauseVisionMode: () => void;
  resumeVisionMode: () => void;

  // Detection management
  setDetections: (detections: Detection[]) => void;
  addManualDetection: (x: number, y: number, width: number, height: number) => void;
  removeDetection: (detectionId: string) => void;
  undoRemoval: (detectionId: string) => void;

  // Spatial tracking for deduplication
  addSpatialMarker: (marker: Omit<SpatialMarker, 'id' | 'timestamp'>) => void;
  clearSpatialMarkers: () => void;
  isDuplicate: (worldX: number, worldY: number, worldZ: number) => boolean;

  // Session management
  captureCount: () => number;
  confirmAndSync: (sheetId: string) => CountSession | null;
  resetSession: () => void;

  // Sleep mode
  updateActivity: () => void;
  setSleeping: (isSleeping: boolean) => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  sleepTimeoutMs: 30000, // 30 seconds
  confidenceThreshold: 0.5,
  enableDeduplication: true,
  deduplicationDistanceThreshold: 50, // pixels
  showConfidenceScores: true,
  hapticFeedback: true,
  soundEffects: true,
};

export const useVisionStore = create<VisionStore>((set, get) => ({
  // Initial state
  isActive: false,
  isPaused: false,
  isProcessing: false,
  selectedTemplate: 'circles',
  currentDetections: [],
  confirmedCount: 0,
  lastActivityTime: Date.now(),
  isSleeping: false,
  settings: DEFAULT_SETTINGS,
  currentSession: null,

  // Start vision mode
  startVisionMode: (template: ObjectTemplate) => {
    const session: CountSession = {
      id: uuidv4(),
      startTime: Date.now(),
      template,
      totalCount: 0,
      manualAdditions: 0,
      manualRemovals: 0,
      detections: [],
      spatialMarkers: [],
      syncedToSheet: false,
    };

    set({
      isActive: true,
      isPaused: false,
      isProcessing: false,
      selectedTemplate: template,
      currentDetections: [],
      confirmedCount: 0,
      lastActivityTime: Date.now(),
      isSleeping: false,
      currentSession: session,
    });
  },

  // Stop vision mode
  stopVisionMode: () => {
    set({
      isActive: false,
      isPaused: false,
      isProcessing: false,
      currentDetections: [],
      confirmedCount: 0,
      isSleeping: false,
      currentSession: null,
    });
  },

  // Pause/Resume
  pauseVisionMode: () => set({ isPaused: true }),
  resumeVisionMode: () => set({ isPaused: false, lastActivityTime: Date.now() }),

  // Set detections from detection service
  setDetections: (detections: Detection[]) => {
    const state = get();
    if (!state.settings.enableDeduplication) {
      set({ currentDetections: detections, isProcessing: false });
      return;
    }

    // Filter out duplicates based on spatial markers
    const filteredDetections = detections.filter((detection) => {
      const { x, y, width, height } = detection.boundingBox;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      // For now, use 2D spatial tracking (z = 0)
      return !state.isDuplicate(centerX, centerY, 0);
    });

    set({ currentDetections: filteredDetections, isProcessing: false });
  },

  // Add manual detection
  addManualDetection: (x: number, y: number, width: number, height: number) => {
    const detection: Detection = {
      id: uuidv4(),
      boundingBox: {
        id: uuidv4(),
        x,
        y,
        width,
        height,
        confidence: 1.0,
        label: 'manual',
        isManuallyAdded: true,
        isRemoved: false,
      },
      timestamp: Date.now(),
      frameId: 'manual',
    };

    set((state) => ({
      currentDetections: [...state.currentDetections, detection],
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            manualAdditions: state.currentSession.manualAdditions + 1,
          }
        : null,
    }));
  },

  // Remove detection
  removeDetection: (detectionId: string) => {
    set((state) => ({
      currentDetections: state.currentDetections.map((d) =>
        d.id === detectionId
          ? { ...d, boundingBox: { ...d.boundingBox, isRemoved: true } }
          : d
      ),
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            manualRemovals: state.currentSession.manualRemovals + 1,
          }
        : null,
    }));
  },

  // Undo removal
  undoRemoval: (detectionId: string) => {
    set((state) => ({
      currentDetections: state.currentDetections.map((d) =>
        d.id === detectionId
          ? { ...d, boundingBox: { ...d.boundingBox, isRemoved: false } }
          : d
      ),
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            manualRemovals: Math.max(0, state.currentSession.manualRemovals - 1),
          }
        : null,
    }));
  },

  // Spatial tracking
  addSpatialMarker: (marker: Omit<SpatialMarker, 'id' | 'timestamp'>) => {
    const newMarker: SpatialMarker = {
      ...marker,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            spatialMarkers: [...state.currentSession.spatialMarkers, newMarker],
          }
        : null,
    }));
  },

  clearSpatialMarkers: () => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, spatialMarkers: [] }
        : null,
    }));
  },

  isDuplicate: (worldX: number, worldY: number, worldZ: number) => {
    const state = get();
    if (!state.currentSession) return false;

    const threshold = state.settings.deduplicationDistanceThreshold;

    return state.currentSession.spatialMarkers.some((marker) => {
      const distance = Math.sqrt(
        (worldX - marker.worldX) ** 2 +
          (worldY - marker.worldY) ** 2 +
          (worldZ - marker.worldZ) ** 2
      );
      return distance < threshold;
    });
  },

  // Get current count
  captureCount: () => {
    const state = get();
    return state.currentDetections.filter((d) => !d.boundingBox.isRemoved).length;
  },

  // Confirm and prepare for sync
  confirmAndSync: (sheetId: string) => {
    const state = get();
    if (!state.currentSession) return null;

    const activeDetections = state.currentDetections.filter(
      (d) => !d.boundingBox.isRemoved
    );
    const count = activeDetections.length;

    const completedSession: CountSession = {
      ...state.currentSession,
      endTime: Date.now(),
      totalCount: count,
      detections: activeDetections,
      syncedToSheet: true,
      sheetId,
      rowId: uuidv4(),
    };

    // Add spatial markers for confirmed detections
    activeDetections.forEach((detection) => {
      const { x, y, width, height } = detection.boundingBox;
      get().addSpatialMarker({
        worldX: x + width / 2,
        worldY: y + height / 2,
        worldZ: 0,
        detectionId: detection.id,
      });
    });

    set({
      confirmedCount: state.confirmedCount + count,
      currentDetections: [],
      currentSession: {
        ...state.currentSession,
        id: uuidv4(),
        startTime: Date.now(),
        totalCount: 0,
        manualAdditions: 0,
        manualRemovals: 0,
        detections: [],
        syncedToSheet: false,
      },
    });

    return completedSession;
  },

  // Reset session
  resetSession: () => {
    set((state) => ({
      currentDetections: [],
      confirmedCount: 0,
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            id: uuidv4(),
            startTime: Date.now(),
            totalCount: 0,
            manualAdditions: 0,
            manualRemovals: 0,
            detections: [],
            spatialMarkers: [],
            syncedToSheet: false,
          }
        : null,
    }));
  },

  // Activity tracking for sleep mode
  updateActivity: () => {
    set({ lastActivityTime: Date.now(), isSleeping: false });
  },

  setSleeping: (isSleeping: boolean) => {
    set({ isSleeping });
  },

  // Update settings
  updateSettings: (newSettings: Partial<AppSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },
}));
