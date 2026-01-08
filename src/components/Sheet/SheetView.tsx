import React from 'react';
import { useSheetStore } from '../../store/useSheetStore';
import styles from './Sheet.module.css';

interface SheetViewProps {
  onStartVisionMode: () => void;
}

export const SheetView: React.FC<SheetViewProps> = ({ onStartVisionMode }) => {
  const { activeSheet, sheets, setActiveSheet, deleteRow } = useSheetStore();

  if (!activeSheet) {
    return (
      <div className={styles.emptyState}>
        <p>No sheet selected</p>
      </div>
    );
  }

  const getColumnValue = (row: typeof activeSheet.rows[0], columnId: string) => {
    return row.values[columnId] ?? '-';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.sheetSelector}>
          <select
            value={activeSheet.id}
            onChange={(e) => setActiveSheet(e.target.value)}
            className={styles.select}
          >
            {sheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name}
              </option>
            ))}
          </select>
        </div>
        <h1 className={styles.title}>{activeSheet.name}</h1>
        <div className={styles.rowCount}>{activeSheet.rows.length} items</div>
      </header>

      {/* Table */}
      <div className={styles.tableContainer}>
        {activeSheet.rows.length === 0 ? (
          <div className={styles.emptyTable}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No items yet</h3>
            <p>Use AI Vision Count to add items</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {activeSheet.columns.map((col) => (
                  <th key={col.id}>{col.name}</th>
                ))}
                <th className={styles.actionsHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeSheet.rows.map((row) => (
                <tr key={row.id}>
                  {activeSheet.columns.map((col) => (
                    <td key={col.id} data-type={col.type}>
                      {col.type === 'quantity' ? (
                        <span className={styles.quantity}>
                          {getColumnValue(row, col.id)}
                        </span>
                      ) : (
                        getColumnValue(row, col.id)
                      )}
                    </td>
                  ))}
                  <td className={styles.actions}>
                    <button
                      onClick={() => deleteRow(row.id)}
                      className={styles.deleteButton}
                      aria-label="Delete row"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Action Button */}
      <button onClick={onStartVisionMode} className={styles.fab}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
        </svg>
        <span>AI Count</span>
      </button>
    </div>
  );
};
