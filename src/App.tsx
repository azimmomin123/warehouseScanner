import React, { useEffect, useState } from 'react';
import { SheetView } from './components/Sheet';
import { VisionModeScreen } from './components/VisionMode/VisionModeScreen';
import { useSheetStore } from './store/useSheetStore';
import styles from './App.module.css';

type AppScreen = 'sheet' | 'vision';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('sheet');
  const { loadSheets, isLoading, error } = useSheetStore();

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingContent}>
          <div className={styles.appIcon}>📦</div>
          <h1>Warehouse Scanner</h1>
          <div className={styles.spinner} />
          <p>Loading your inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => loadSheets()} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {currentScreen === 'sheet' && (
        <SheetView onStartVisionMode={() => setCurrentScreen('vision')} />
      )}

      {currentScreen === 'vision' && (
        <VisionModeScreen onClose={() => setCurrentScreen('sheet')} />
      )}
    </div>
  );
};

export default App;
