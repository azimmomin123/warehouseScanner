import React, { useEffect, useCallback, useState, useRef } from 'react';
import { CameraView } from '../CameraView';
import { DetectionOverlay } from './DetectionOverlay';
import { CountDisplay } from './CountDisplay';
import { VisionModeToggle } from './VisionModeToggle';
import { useVisionStore } from '../../store/useVisionStore';
import { useSheetStore } from '../../store/useSheetStore';
import { useSleepMode } from '../../hooks/useSleepMode';
import { objectDetectionService } from '../../services/objectDetection';
import styles from './VisionMode.module.css';

interface VisionModeScreenProps {
  onClose: () => void;
}

export const VisionModeScreen: React.FC<VisionModeScreenProps> = ({ onClose }) => {
  const {
    isActive,
    isPaused,
    isSleeping,
    selectedTemplate,
    currentDetections,
    settings,
    stopVisionMode,
    setDetections,
    confirmAndSync,
    updateActivity,
  } = useVisionStore();

  const { activeSheet, addCountToSheet } = useSheetStore();
  const { wake } = useSleepMode({ enabled: true });

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 1280, height: 720 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  // Initialize object detection model
  useEffect(() => {
    const initModel = async () => {
      try {
        setIsModelLoading(true);
        setModelError(null);
        await objectDetectionService.initialize();
        setIsModelLoading(false);
      } catch (error) {
        setModelError(
          error instanceof Error ? error.message : 'Failed to load AI model'
        );
        setIsModelLoading(false);
      }
    };

    initModel();
  }, []);

  // Track container size for overlay positioning
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Process frames for object detection
  const handleFrameCapture = useCallback(
    async (imageData: ImageData) => {
      if (!isActive || isPaused || isSleeping || isModelLoading) {
        return;
      }

      setVideoSize({
        width: imageData.width,
        height: imageData.height,
      });

      updateActivity();

      try {
        const detections = await objectDetectionService.detectObjects(
          imageData,
          selectedTemplate,
          settings.confidenceThreshold
        );
        setDetections(detections);
      } catch (error) {
        console.error('Detection error:', error);
      }
    },
    [
      isActive,
      isPaused,
      isSleeping,
      isModelLoading,
      selectedTemplate,
      settings.confidenceThreshold,
      setDetections,
      updateActivity,
    ]
  );

  // Handle sync to sheet
  const handleSync = useCallback(async () => {
    if (!activeSheet) {
      return;
    }

    const session = confirmAndSync(activeSheet.id);

    if (session) {
      try {
        await addCountToSheet(session);
        setSuccessCount(session.totalCount);
        setShowSuccess(true);

        // Hide success message after 2 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);

        // Haptic feedback
        if (settings.hapticFeedback && navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
      } catch (error) {
        console.error('Failed to add count to sheet:', error);
      }
    }
  }, [activeSheet, confirmAndSync, addCountToSheet, settings.hapticFeedback]);

  // Handle cancel/close
  const handleCancel = useCallback(() => {
    stopVisionMode();
    onClose();
  }, [stopVisionMode, onClose]);

  // Show template selection if not active
  if (!isActive) {
    return (
      <div className={styles.screen} ref={containerRef}>
        <div className={styles.selectionContainer}>
          <button onClick={onClose} className={styles.closeButton}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
          <VisionModeToggle onEnterVisionMode={() => {}} />
        </div>
      </div>
    );
  }

  // Show loading state
  if (isModelLoading) {
    return (
      <div className={styles.screen} ref={containerRef}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <h3>Loading AI Model</h3>
          <p>Preparing object detection...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (modelError) {
    return (
      <div className={styles.screen} ref={containerRef}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Model Load Failed</h3>
          <p>{modelError}</p>
          <button onClick={handleCancel} className={styles.retryButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen} ref={containerRef}>
      <CameraView
        onFrameCapture={handleFrameCapture}
        isProcessing={isPaused || isSleeping}
      >
        <DetectionOverlay
          detections={currentDetections}
          videoWidth={videoSize.width}
          videoHeight={videoSize.height}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
        <CountDisplay onSync={handleSync} onCancel={handleCancel} />
      </CameraView>

      {/* Success toast */}
      {showSuccess && (
        <div className={styles.successToast}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span>{successCount} items added to sheet</span>
        </div>
      )}
    </div>
  );
};
