/**
 * VaultNote Encrypted Backup & Restore Types
 * Zero-knowledge .vaultnote file specification, envelope schemas, and restore contracts
 */

import { VaultItem } from '../../types/vault';

export const BACKUP_MAGIC_HEADER = 'VAULTNOTE_BACKUP_V1';
export const BACKUP_SPEC_VERSION = 1;

export type BackupKdfAlgorithm = 'Argon2id' | 'PBKDF2';

export interface BackupKdfParams {
  algorithm: BackupKdfAlgorithm;
  saltHex: string;
  iterations: number;
  memory?: number;
  parallelism?: number;
}

export interface BackupMetadata {
  version: number;
  exportedAt: number;
  itemCount: number;
  categoriesCount: Record<string, number>;
  appVersion: string;
  generator: string;
}

export interface EncryptedBackupEnvelope {
  magic: string;
  version: number;
  createdAt: number;
  kdf: BackupKdfParams;
  cipher: 'AES-256-GCM';
  iv: string; // Base64 96-bit nonce
  tag: string; // Base64 128-bit authentication tag
  ciphertext: string; // Base64 encrypted payload
  checksum?: string; // SHA-256 integrity checksum over saltHex:iv:tag:ciphertext
}

export interface DecryptedBackupPayload {
  metadata: BackupMetadata;
  items: VaultItem[];
}

export type RestoreMode = 'merge' | 'replace';

export interface RestoreSummary {
  totalRestored: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  mode: RestoreMode;
  restoredAt: number;
}

export interface BackupExportOptions {
  appVersion?: string;
  iterations?: number;
  memory?: number;
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export class InvalidBackupFormatError extends BackupError {
  constructor(reason: string) {
    super(`Invalid .vaultnote backup envelope: ${reason}`);
    this.name = 'InvalidBackupFormatError';
  }
}

export class InvalidBackupPasswordError extends BackupError {
  constructor() {
    super('Incorrect backup passphrase. Authentication failed.');
    this.name = 'InvalidBackupPasswordError';
  }
}

export class TamperDetectedError extends BackupError {
  constructor() {
    super('Cryptographic integrity check failed. The backup data has been tampered with or corrupted.');
    this.name = 'TamperDetectedError';
  }
}
