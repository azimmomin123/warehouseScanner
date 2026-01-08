import React from 'react';
import { ObjectTemplate } from '../../types';
import { useVisionStore } from '../../store/useVisionStore';
import styles from './VisionMode.module.css';

interface VisionModeToggleProps {
  onEnterVisionMode: () => void;
}

export const VisionModeToggle: React.FC<VisionModeToggleProps> = ({
  onEnterVisionMode,
}) => {
  const { isActive, selectedTemplate, startVisionMode } = useVisionStore();

  const templates: { id: ObjectTemplate; label: string; icon: string }[] = [
    { id: 'circles', label: 'Pipes/Circles', icon: '⭕' },
    { id: 'rectangles', label: 'Boxes/Rectangles', icon: '🔲' },
    { id: 'custom', label: 'Auto-Detect', icon: '🔍' },
  ];

  const handleTemplateSelect = (template: ObjectTemplate) => {
    startVisionMode(template);
    onEnterVisionMode();
  };

  if (isActive) {
    return null;
  }

  return (
    <div className={styles.toggleContainer}>
      <div className={styles.toggleHeader}>
        <div className={styles.visionIcon}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        </div>
        <h2>AI Vision Count</h2>
        <p>Select object type to detect</p>
      </div>

      <div className={styles.templateGrid}>
        {templates.map((template) => (
          <button
            key={template.id}
            className={styles.templateButton}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <span className={styles.templateIcon}>{template.icon}</span>
            <span className={styles.templateLabel}>{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
