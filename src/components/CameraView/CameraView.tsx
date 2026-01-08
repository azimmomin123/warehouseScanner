import React, { useEffect } from 'react';
import { useCamera } from '../../hooks/useCamera';
import styles from './CameraView.module.css';

interface CameraViewProps {
  onFrameCapture?: (imageData: ImageData) => void;
  isProcessing?: boolean;
  children?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onFrameCapture,
  isProcessing = false,
  children,
}) => {
  const {
    videoRef,
    canvasRef,
    isReady,
    isStreaming,
    error,
    startCamera,
    switchCamera,
    captureFrame,
    currentFacingMode,
  } = useCamera({ autoStart: true });

  // Expose capture function for continuous frame processing
  useEffect(() => {
    if (!isReady || !onFrameCapture || isProcessing) return;

    let animationFrameId: number;
    let lastCaptureTime = 0;
    const captureInterval = 100; // Capture every 100ms for performance

    const captureLoop = (timestamp: number) => {
      if (timestamp - lastCaptureTime >= captureInterval) {
        const frame = captureFrame();
        if (frame) {
          onFrameCapture(frame);
        }
        lastCaptureTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(captureLoop);
    };

    animationFrameId = requestAnimationFrame(captureLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReady, onFrameCapture, isProcessing, captureFrame]);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>📷</div>
        <h2>Camera Access Required</h2>
        <p>{error}</p>
        <button onClick={startCamera} className={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} className={styles.hiddenCanvas} />

      {/* Overlay container for AR elements */}
      <div className={styles.overlay}>
        {children}
      </div>

      {/* Camera controls */}
      <div className={styles.controls}>
        <button
          onClick={switchCamera}
          className={styles.switchButton}
          aria-label="Switch camera"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z" />
          </svg>
        </button>
      </div>

      {/* Loading indicator */}
      {!isStreaming && !error && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>Starting camera...</p>
        </div>
      )}
    </div>
  );
};
