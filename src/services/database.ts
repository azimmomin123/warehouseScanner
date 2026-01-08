import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { InventorySheet, SheetRow, CountSession, SyncQueueItem, SheetColumn } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface WarehouseScannerDB extends DBSchema {
  sheets: {
    key: string;
    value: InventorySheet;
    indexes: { 'by-updated': number };
  };
  sessions: {
    key: string;
    value: CountSession;
    indexes: { 'by-sheet': string; 'by-time': number };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-status': string };
  };
}

const DB_NAME = 'warehouse-scanner';
const DB_VERSION = 1;

class DatabaseService {
  private db: IDBPDatabase<WarehouseScannerDB> | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<WarehouseScannerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Sheets store
        const sheetStore = db.createObjectStore('sheets', { keyPath: 'id' });
        sheetStore.createIndex('by-updated', 'updatedAt');

        // Sessions store
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-sheet', 'sheetId');
        sessionStore.createIndex('by-time', 'startTime');

        // Sync queue store
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
      },
    });
  }

  private ensureDb(): IDBPDatabase<WarehouseScannerDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // Sheet operations
  async createSheet(name: string, columns?: SheetColumn[]): Promise<InventorySheet> {
    const db = this.ensureDb();

    const defaultColumns: SheetColumn[] = columns || [
      { id: uuidv4(), name: 'Item Name', type: 'text', required: true },
      { id: uuidv4(), name: 'Barcode', type: 'barcode', required: false },
      { id: uuidv4(), name: 'Quantity', type: 'quantity', required: true },
      { id: uuidv4(), name: 'Date Counted', type: 'date', required: false },
    ];

    const sheet: InventorySheet = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      columns: defaultColumns,
      rows: [],
    };

    await db.put('sheets', sheet);
    return sheet;
  }

  async getSheet(id: string): Promise<InventorySheet | undefined> {
    const db = this.ensureDb();
    return db.get('sheets', id);
  }

  async getAllSheets(): Promise<InventorySheet[]> {
    const db = this.ensureDb();
    return db.getAllFromIndex('sheets', 'by-updated');
  }

  async updateSheet(sheet: InventorySheet): Promise<void> {
    const db = this.ensureDb();
    sheet.updatedAt = Date.now();
    await db.put('sheets', sheet);
  }

  async deleteSheet(id: string): Promise<void> {
    const db = this.ensureDb();
    await db.delete('sheets', id);
  }

  async addRowToSheet(
    sheetId: string,
    values: Record<string, string | number>,
    countSessionId?: string
  ): Promise<SheetRow> {
    const db = this.ensureDb();
    const sheet = await this.getSheet(sheetId);

    if (!sheet) {
      throw new Error(`Sheet ${sheetId} not found`);
    }

    const row: SheetRow = {
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      values,
      countSessionId,
    };

    sheet.rows.push(row);
    await this.updateSheet(sheet);

    return row;
  }

  async updateRow(
    sheetId: string,
    rowId: string,
    values: Record<string, string | number>
  ): Promise<void> {
    const db = this.ensureDb();
    const sheet = await this.getSheet(sheetId);

    if (!sheet) {
      throw new Error(`Sheet ${sheetId} not found`);
    }

    const rowIndex = sheet.rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) {
      throw new Error(`Row ${rowId} not found in sheet ${sheetId}`);
    }

    sheet.rows[rowIndex] = {
      ...sheet.rows[rowIndex],
      values: { ...sheet.rows[rowIndex].values, ...values },
      updatedAt: Date.now(),
    };

    await this.updateSheet(sheet);
  }

  // Session operations
  async saveSession(session: CountSession): Promise<void> {
    const db = this.ensureDb();
    await db.put('sessions', session);
  }

  async getSession(id: string): Promise<CountSession | undefined> {
    const db = this.ensureDb();
    return db.get('sessions', id);
  }

  async getSessionsBySheet(sheetId: string): Promise<CountSession[]> {
    const db = this.ensureDb();
    return db.getAllFromIndex('sessions', 'by-sheet', sheetId);
  }

  async getRecentSessions(limit: number = 10): Promise<CountSession[]> {
    const db = this.ensureDb();
    const all = await db.getAllFromIndex('sessions', 'by-time');
    return all.slice(-limit).reverse();
  }

  // Sync queue operations
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
    const db = this.ensureDb();
    const queueItem: SyncQueueItem = {
      ...item,
      id: uuidv4(),
    };
    await db.put('syncQueue', queueItem);
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = this.ensureDb();
    return db.getAllFromIndex('syncQueue', 'by-status', 'pending');
  }

  async updateSyncItem(item: SyncQueueItem): Promise<void> {
    const db = this.ensureDb();
    await db.put('syncQueue', item);
  }

  async removeSyncItem(id: string): Promise<void> {
    const db = this.ensureDb();
    await db.delete('syncQueue', id);
  }

  // Clear all data
  async clearAll(): Promise<void> {
    const db = this.ensureDb();
    await db.clear('sheets');
    await db.clear('sessions');
    await db.clear('syncQueue');
  }
}

export const databaseService = new DatabaseService();
