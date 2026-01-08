import React, { useCallback, useRef } from 'react';
import { Detection } from '../../types';
import { useVisionStore } from '../../store/useVisionStore';
import styles from './VisionMode.module.css';

interface DetectionOverlayProps {
  detections: Detection[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight,
}) => {
  const { removeDetection, undoRemoval, addManualDetection, settings } =
    useVisionStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate scale factors for responsive positioning
  const scaleX = containerWidth / videoWidth;
  const scaleY = containerHeight / videoHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (containerWidth - videoWidth * scale) / 2;
  const offsetY = (containerHeight - videoHeight * scale) / 2;

  const handleDetectionClick = useCallback(
    (detection: Detection, e: React.MouseEvent) => {
      e.stopPropagation();

      if (detection.boundingBox.isRemoved) {
        undoRemoval(detection.id);
      } else {
        removeDetection(detection.id);
      }

      // Haptic feedback
      if (settings.hapticFeedback && navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    [removeDetection, undoRemoval, settings.hapticFeedback]
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - offsetX) / scale;
      const clickY = (e.clientY - rect.top - offsetY) / scale;

      // Only add if click is within video bounds
      if (clickX >= 0 && clickX <= videoWidth && clickY >= 0 && clickY <= videoHeight) {
        // Add a default-sized detection at click location
        const size = 60;
        addManualDetection(clickX - size / 2, clickY - size / 2, size, size);

        // Haptic feedback
        if (settings.hapticFeedback && navigator.vibrate) {
          navigator.vibrate([30, 20, 30]);
        }
      }
    },
    [addManualDetection, offsetX, offsetY, scale, videoWidth, videoHeight, settings.hapticFeedback]
  );

  const activeDetections = detections.filter((d) => !d.boundingBox.isRemoved);
  const removedDetections = detections.filter((d) => d.boundingBox.isRemoved);

  return (
    <div
      ref={overlayRef}
      className={styles.detectionOverlay}
      onClick={handleOverlayClick}
    >
      {/* Active detections */}
      {activeDetections.map((detection) => {
        const { x, y, width, height, confidence, label, isManuallyAdded } =
          detection.boundingBox;

        const style: React.CSSProperties = {
          left: `${offsetX + x * scale}px`,
          top: `${offsetY + y * scale}px`,
          width: `${width * scale}px`,
          height: `${height * scale}px`,
        };

        return (
          <div
            key={detection.id}
            className={`${styles.boundingBox} ${
              isManuallyAdded ? styles.manualBox : ''
            }`}
            style={style}
            onClick={(e) => handleDetectionClick(detection, e)}
          >
            <div className={styles.boxCorner} data-position="top-left" />
            <div className={styles.boxCorner} data-position="top-right" />
            <div className={styles.boxCorner} data-position="bottom-left" />
            <div className={styles.boxCorner} data-position="bottom-right" />

            {settings.showConfidenceScores && (
              <div className={styles.confidenceLabel}>
                {isManuallyAdded ? 'Manual' : `${Math.round(confidence * 100)}%`}
              </div>
            )}

            <div className={styles.centerDot} />
          </div>
        );
      })}

      {/* Removed detections (shown with reduced opacity) */}
      {removedDetections.map((detection) => {
        const { x, y, width, height } = detection.boundingBox;

        const style: React.CSSProperties = {
          left: `${offsetX + x * scale}px`,
          top: `${offsetY + y * scale}px`,
          width: `${width * scale}px`,
          height: `${height * scale}px`,
        };

        return (
          <div
            key={detection.id}
            className={`${styles.boundingBox} ${styles.removedBox}`}
            style={style}
            onClick={(e) => handleDetectionClick(detection, e)}
          >
            <div className={styles.removedIcon}>✕</div>
          </div>
        );
      })}

      {/* Tap to add hint */}
      {activeDetections.length === 0 && (
        <div className={styles.tapHint}>
          <p>Tap anywhere to add a detection</p>
        </div>
      )}
    </div>
  );
};
