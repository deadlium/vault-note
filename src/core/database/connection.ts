/**
 * VaultNote SQLite Connection Manager
 * Manages database lifecycle, connection pooling, and PRAGMA configurations
 * Phase 1: Cryptographic Perimeter
 */

import { DatabaseClient, DatabaseError } from './types';

export const DATABASE_NAME = 'vaultnote.db';

/**
 * Node.js built-in SQLite adapter for high-speed automated unit testing
 */
class NodeSqliteAdapter implements DatabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor(memory = true) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(memory ? ':memory:' : DATABASE_NAME);
      this.db.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
      `);
    } catch (error) {
      throw new DatabaseError(`Failed to initialize Node SQLite adapter: ${(error as Error).message}`);
    }
  }

  async execAsync(sql: string): Promise<void> {
    try {
      this.db.exec(sql);
    } catch (error) {
      throw new DatabaseError(`SQLite exec failed: ${(error as Error).message}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid ?? 0),
        changes: Number(result.changes ?? 0),
      };
    } catch (error) {
      throw new DatabaseError(`SQLite run failed: ${(error as Error).message}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql);
      const row = stmt.get(...params);
      return (row as T) ?? null;
    } catch (error) {
      throw new DatabaseError(`SQLite getFirst failed: ${(error as Error).message}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql);
      return (stmt.all(...params) as T[]) ?? [];
    } catch (error) {
      throw new DatabaseError(`SQLite getAll failed: ${(error as Error).message}`);
    }
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    await this.execAsync('BEGIN TRANSACTION;');
    try {
      const result = await task();
      await this.execAsync('COMMIT;');
      return result;
    } catch (error) {
      await this.execAsync('ROLLBACK;');
      throw error;
    }
  }

  async closeAsync(): Promise<void> {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Expo SQLite adapter for iOS & Android
 */
class ExpoSqliteAdapter implements DatabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any) {
    this.db = db;
  }

  async execAsync(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    return await this.db.runAsync(sql, ...params);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null> {
    const row = await this.db.getFirstAsync(sql, ...params);
    return (row as T) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]> {
    return await this.db.getAllAsync(sql, ...params);
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    return await this.db.withTransactionAsync(task);
  }

  async closeAsync(): Promise<void> {
    if (typeof this.db?.closeAsync === 'function') {
      await this.db.closeAsync();
    }
  }
}

let activeClient: DatabaseClient | null = null;

/**
 * Initializes and returns the primary SQLite database client.
 * Configures WAL mode, foreign keys, and synchronization pragmas.
 */
export async function getDatabaseClient(forceNew = false): Promise<DatabaseClient> {
  if (activeClient && !forceNew) {
    return activeClient;
  }

  // 1. In Node test environment or environments without native Expo SQLite
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  let expoSqlite: any = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expoSqlite = require('expo-sqlite');
  } catch {
    expoSqlite = null;
  }

  if (isNode && (!expoSqlite || !expoSqlite.openDatabaseAsync)) {
    activeClient = new NodeSqliteAdapter(true);
    return activeClient;
  }

  // 2. In Expo React Native runtime
  try {
    if (expoSqlite && typeof expoSqlite.openDatabaseAsync === 'function') {
      const expoDb = await expoSqlite.openDatabaseAsync(DATABASE_NAME);
      // Configure PRAGMAs
      await expoDb.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 5000;
      `);
      activeClient = new ExpoSqliteAdapter(expoDb);
      return activeClient;
    }
  } catch (error) {
    // Fall back to Node SQLite if on desktop/Node
    if (isNode) {
      activeClient = new NodeSqliteAdapter(true);
      return activeClient;
    }
    throw new DatabaseError(`Failed to open Expo SQLite database: ${(error as Error).message}`);
  }

  if (isNode) {
    activeClient = new NodeSqliteAdapter(true);
    return activeClient;
  }

  throw new DatabaseError('No compatible SQLite runtime found on this platform.');
}

/**
 * Overrides the active database client (used for in-memory isolation during tests)
 */
export function setDatabaseClient(client: DatabaseClient | null): void {
  activeClient = client;
}

/**
 * Closes and resets the current active database connection
 */
export async function resetDatabaseClient(): Promise<void> {
  if (activeClient?.closeAsync) {
    await activeClient.closeAsync();
  }
  activeClient = null;
}
