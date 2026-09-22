/**
 * VaultNote SQLite Database Layer Type Definitions
 * Phase 1: Cryptographic Perimeter
 */

import { EncryptedPayload } from '../crypto/types';

export type VaultCategory = 'Login' | 'Secure Note' | 'Card' | 'API Key' | 'Identity';

/**
 * Universal SQLite database interface matching Expo SQLite next-gen API
 */
export interface DatabaseClient {
  execAsync(sql: string): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]>;
  withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
  closeAsync?(): Promise<void>;
}

/**
 * Database representation of an encrypted vault item row
 */
export interface VaultItemRow {
  id: string;
  category: string;
  title_enc: string;     // JSON-serialized EncryptedPayload
  payload_enc: string;   // JSON-serialized EncryptedPayload
  is_favorite: number;   // 0 or 1
  created_at: number;    // epoch timestamp in milliseconds
  updated_at: number;    // epoch timestamp in milliseconds
}

/**
 * Database representation of a tag mapping row
 */
export interface VaultTagRow {
  item_id: string;
  tag: string;
}

/**
 * Database metadata key-value row
 */
export interface VaultMetadataRow {
  key: string;
  value: string;
}

/**
 * High-level domain record representing a secured vault item with encrypted payloads
 */
export interface EncryptedVaultItemRecord {
  id: string;
  category: VaultCategory;
  titlePayload: EncryptedPayload;
  dataPayload: EncryptedPayload;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Migration definition
 */
export interface DatabaseMigration {
  version: number;
  name: string;
  sql: string;
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
