import React from 'react';
import { useVisionStore } from '../../store/useVisionStore';
import styles from './VisionMode.module.css';

interface CountDisplayProps {
  onSync: () => void;
  onCancel: () => void;
}

export const CountDisplay: React.FC<CountDisplayProps> = ({ onSync, onCancel }) => {
  const {
    currentDetections,
    confirmedCount,
    selectedTemplate,
    currentSession,
    captureCount,
    isSleeping,
    resumeVisionMode,
  } = useVisionStore();

  const activeCount = currentDetections.filter((d) => !d.boundingBox.isRemoved).length;
  const totalSessionCount = confirmedCount + activeCount;

  const templateLabels: Record<string, string> = {
    circles: 'Pipes/Circles',
    rectangles: 'Boxes/Rectangles',
    custom: 'Objects',
  };

  if (isSleeping) {
    return (
      <div className={styles.sleepOverlay}>
        <div className={styles.sleepContent}>
          <div className={styles.sleepIcon}>💤</div>
          <h3>Vision Mode Sleeping</h3>
          <p>Tap to resume detection</p>
          <button onClick={resumeVisionMode} className={styles.wakeButton}>
            Wake Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.countContainer}>
      {/* Top bar with template info */}
      <div className={styles.topBar}>
        <button onClick={onCancel} className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className={styles.templateInfo}>
          <span className={styles.templateBadge}>
            {templateLabels[selectedTemplate]}
          </span>
        </div>
        <div className={styles.sessionInfo}>
          {currentSession && (
            <span>
              +{currentSession.manualAdditions} / -{currentSession.manualRemovals}
            </span>
          )}
        </div>
      </div>

      {/* Main count display */}
      <div className={styles.countDisplay}>
        <div className={styles.currentCount}>
          <span className={styles.countNumber}>{activeCount}</span>
          <span className={styles.countLabel}>Detected</span>
        </div>

        {confirmedCount > 0 && (
          <div className={styles.totalCount}>
            <span className={styles.totalNumber}>
              {totalSessionCount} total
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={styles.actionBar}>
        <button onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button
          onClick={onSync}
          className={styles.syncButton}
          disabled={activeCount === 0}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Sync to Sheet ({activeCount})
        </button>
      </div>
    </div>
  );
};
