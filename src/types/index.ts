// Core types for the Bulk Item Counting feature

export type ObjectTemplate = 'circles' | 'rectangles' | 'custom';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
  isManuallyAdded: boolean;
  isRemoved: boolean;
}

export interface Detection {
  id: string;
  boundingBox: BoundingBox;
  timestamp: number;
  frameId: string;
}

export interface SpatialMarker {
  id: string;
  worldX: number;
  worldY: number;
  worldZ: number;
  detectionId: string;
  timestamp: number;
}

export interface CountSession {
  id: string;
  startTime: number;
  endTime?: number;
  template: ObjectTemplate;
  totalCount: number;
  manualAdditions: number;
  manualRemovals: number;
  detections: Detection[];
  spatialMarkers: SpatialMarker[];
  syncedToSheet: boolean;
  sheetId?: string;
  rowId?: string;
}

export interface InventorySheet {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  columns: SheetColumn[];
  rows: SheetRow[];
}

export interface SheetColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'barcode' | 'quantity';
  required: boolean;
}

export interface SheetRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  values: Record<string, string | number>;
  countSessionId?: string;
}

export interface CameraSettings {
  facingMode: 'user' | 'environment';
  resolution: { width: number; height: number };
  frameRate: number;
}

export interface VisionModeState {
  isActive: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  selectedTemplate: ObjectTemplate;
  currentDetections: Detection[];
  confirmedCount: number;
  lastActivityTime: number;
  isSleeping: boolean;
}

export interface AppSettings {
  sleepTimeoutMs: number;
  confidenceThreshold: number;
  enableDeduplication: boolean;
  deduplicationDistanceThreshold: number;
  showConfidenceScores: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface SyncQueueItem {
  id: string;
  sessionId: string;
  sheetId: string;
  count: number;
  status: SyncStatus;
  retryCount: number;
  lastAttempt?: number;
  error?: string;
}
