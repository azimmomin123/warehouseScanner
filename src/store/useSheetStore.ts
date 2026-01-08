import { create } from 'zustand';
import { InventorySheet, SheetRow, CountSession } from '../types';
import { databaseService } from '../services/database';

interface SheetStore {
  sheets: InventorySheet[];
  activeSheet: InventorySheet | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSheets: () => Promise<void>;
  createSheet: (name: string) => Promise<InventorySheet>;
  setActiveSheet: (sheetId: string) => Promise<void>;
  deleteSheet: (sheetId: string) => Promise<void>;

  // Row operations
  addCountToSheet: (session: CountSession, itemName?: string) => Promise<SheetRow>;
  updateRow: (rowId: string, values: Record<string, string | number>) => Promise<void>;
  deleteRow: (rowId: string) => Promise<void>;

  // Clear
  clearError: () => void;
}

export const useSheetStore = create<SheetStore>((set, get) => ({
  sheets: [],
  activeSheet: null,
  isLoading: false,
  error: null,

  loadSheets: async () => {
    try {
      set({ isLoading: true, error: null });
      await databaseService.initialize();
      const sheets = await databaseService.getAllSheets();

      // Create default sheet if none exist
      if (sheets.length === 0) {
        const defaultSheet = await databaseService.createSheet('Inventory');
        sheets.push(defaultSheet);
      }

      set({
        sheets: sheets.reverse(), // Most recent first
        activeSheet: sheets[0] || null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load sheets',
        isLoading: false,
      });
    }
  },

  createSheet: async (name: string) => {
    try {
      set({ isLoading: true, error: null });
      const sheet = await databaseService.createSheet(name);
      set((state) => ({
        sheets: [sheet, ...state.sheets],
        activeSheet: sheet,
        isLoading: false,
      }));
      return sheet;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create sheet',
        isLoading: false,
      });
      throw error;
    }
  },

  setActiveSheet: async (sheetId: string) => {
    const sheet = await databaseService.getSheet(sheetId);
    if (sheet) {
      set({ activeSheet: sheet });
    }
  },

  deleteSheet: async (sheetId: string) => {
    try {
      await databaseService.deleteSheet(sheetId);
      set((state) => {
        const remainingSheets = state.sheets.filter((s) => s.id !== sheetId);
        return {
          sheets: remainingSheets,
          activeSheet:
            state.activeSheet?.id === sheetId
              ? remainingSheets[0] || null
              : state.activeSheet,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete sheet',
      });
    }
  },

  addCountToSheet: async (session: CountSession, itemName?: string) => {
    const { activeSheet } = get();

    if (!activeSheet) {
      throw new Error('No active sheet selected');
    }

    const quantityColumn = activeSheet.columns.find((c) => c.type === 'quantity');
    const nameColumn = activeSheet.columns.find((c) => c.type === 'text');
    const dateColumn = activeSheet.columns.find((c) => c.type === 'date');

    const values: Record<string, string | number> = {};

    if (quantityColumn) {
      values[quantityColumn.id] = session.totalCount;
    }

    if (nameColumn) {
      values[nameColumn.id] =
        itemName ||
        `${session.template === 'circles' ? 'Pipes' : session.template === 'rectangles' ? 'Boxes' : 'Items'} (AI Count)`;
    }

    if (dateColumn) {
      values[dateColumn.id] = new Date().toISOString().split('T')[0];
    }

    const row = await databaseService.addRowToSheet(
      activeSheet.id,
      values,
      session.id
    );

    // Save session to database
    await databaseService.saveSession(session);

    // Refresh active sheet
    const updatedSheet = await databaseService.getSheet(activeSheet.id);
    if (updatedSheet) {
      set((state) => ({
        activeSheet: updatedSheet,
        sheets: state.sheets.map((s) =>
          s.id === updatedSheet.id ? updatedSheet : s
        ),
      }));
    }

    return row;
  },

  updateRow: async (rowId: string, values: Record<string, string | number>) => {
    const { activeSheet } = get();

    if (!activeSheet) {
      throw new Error('No active sheet selected');
    }

    await databaseService.updateRow(activeSheet.id, rowId, values);

    const updatedSheet = await databaseService.getSheet(activeSheet.id);
    if (updatedSheet) {
      set((state) => ({
        activeSheet: updatedSheet,
        sheets: state.sheets.map((s) =>
          s.id === updatedSheet.id ? updatedSheet : s
        ),
      }));
    }
  },

  deleteRow: async (rowId: string) => {
    const { activeSheet } = get();

    if (!activeSheet) {
      throw new Error('No active sheet selected');
    }

    const updatedSheet: InventorySheet = {
      ...activeSheet,
      rows: activeSheet.rows.filter((r) => r.id !== rowId),
      updatedAt: Date.now(),
    };

    await databaseService.updateSheet(updatedSheet);

    set((state) => ({
      activeSheet: updatedSheet,
      sheets: state.sheets.map((s) =>
        s.id === updatedSheet.id ? updatedSheet : s
      ),
    }));
  },

  clearError: () => set({ error: null }),
}));
