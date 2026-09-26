/**
 * VaultNote Encrypted Backup Engine
 * Provides zero-knowledge export, import, cryptographic verification,
 * tamper detection, and reconciliation restore strategies.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { deriveKeyArgon2id, DEFAULT_ARGON2ID_CONFIG } from '../../core/crypto/kdf';
import { encrypt, decrypt } from '../../core/crypto/aes';
import { bytesToHex, utf8ToBytes } from '../../core/crypto/csprng';
import { DecryptionAuthenticationError } from '../../core/crypto/types';
import { VaultItem } from '../../types/vault';
import { validateVaultItem } from '../vault/schemas';
import {
  BACKUP_MAGIC_HEADER,
  BACKUP_SPEC_VERSION,
  EncryptedBackupEnvelope,
  DecryptedBackupPayload,
  BackupMetadata,
  BackupExportOptions,
  RestoreMode,
  RestoreSummary,
  InvalidBackupFormatError,
  InvalidBackupPasswordError,
  TamperDetectedError,
} from './types';

/**
 * Computes an integrity digest across the cryptographic envelope fields.
 */
export function computeBackupChecksum(
  saltHex: string,
  iv: string,
  tag: string,
  ciphertext: string
): string {
  const content = `${saltHex}:${iv}:${tag}:${ciphertext}`;
  const hashBytes = sha256(utf8ToBytes(content));
  return bytesToHex(hashBytes);
}

/**
 * Serializes and encrypts vault items into a self-contained .vaultnote string.
 * TOTP secrets and sensitive fields are protected by Argon2id + AES-256-GCM.
 */
export async function createEncryptedBackup(
  items: VaultItem[],
  passphrase: string,
  options?: BackupExportOptions
): Promise<string> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new InvalidBackupFormatError('Backup passphrase cannot be empty.');
  }

  const categoriesCount: Record<string, number> = {};
  for (const item of items) {
    categoriesCount[item.type] = (categoriesCount[item.type] || 0) + 1;
  }

  const nowTimestamp = Date.now();
  const metadata: BackupMetadata = {
    version: BACKUP_SPEC_VERSION,
    exportedAt: nowTimestamp,
    itemCount: items.length,
    categoriesCount,
    appVersion: options?.appVersion ?? '1.0.0',
    generator: 'VaultNote Cryptographic Perimeter',
  };

  const payload: DecryptedBackupPayload = {
    metadata,
    items,
  };

  const payloadJson = JSON.stringify(payload);

  const kdfMemory = options?.memory ?? DEFAULT_ARGON2ID_CONFIG.m;
  const kdfIterations = options?.iterations ?? DEFAULT_ARGON2ID_CONFIG.t;

  const derived = deriveKeyArgon2id(passphrase, undefined, {
    m: kdfMemory,
    t: kdfIterations,
    p: DEFAULT_ARGON2ID_CONFIG.p,
    dkLen: 32,
  });

  const encrypted = encrypt(payloadJson, derived.key);

  const checksum = computeBackupChecksum(
    derived.saltHex,
    encrypted.iv,
    encrypted.tag,
    encrypted.ciphertext
  );

  const envelope: EncryptedBackupEnvelope = {
    magic: BACKUP_MAGIC_HEADER,
    version: BACKUP_SPEC_VERSION,
    createdAt: nowTimestamp,
    kdf: {
      algorithm: 'Argon2id',
      saltHex: derived.saltHex,
      iterations: derived.params.iterations,
      memory: derived.params.memory,
      parallelism: derived.params.parallelism,
    },
    cipher: 'AES-256-GCM',
    iv: encrypted.iv,
    tag: encrypted.tag,
    ciphertext: encrypted.ciphertext,
    checksum,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Parses and verifies the outer cryptographic envelope of a .vaultnote file.
 * Detects corruptions or manual tampering before running key derivation.
 */
export function parseAndValidateBackupEnvelope(rawContent: string): EncryptedBackupEnvelope {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new InvalidBackupFormatError('Backup file content is empty or not text.');
  }

  let envelope: EncryptedBackupEnvelope;
  try {
    envelope = JSON.parse(rawContent);
  } catch (error) {
    throw new InvalidBackupFormatError(`JSON parsing error: ${(error as Error).message}`);
  }

  if (envelope.magic !== BACKUP_MAGIC_HEADER) {
    throw new InvalidBackupFormatError(`Unrecognized magic header: ${envelope.magic}`);
  }

  if (envelope.version !== BACKUP_SPEC_VERSION) {
    throw new InvalidBackupFormatError(`Unsupported backup version: ${envelope.version}`);
  }

  if (envelope.cipher !== 'AES-256-GCM') {
    throw new InvalidBackupFormatError(`Unsupported cipher: ${envelope.cipher}`);
  }

  if (
    !envelope.kdf ||
    envelope.kdf.algorithm !== 'Argon2id' ||
    !envelope.kdf.saltHex ||
    typeof envelope.kdf.iterations !== 'number'
  ) {
    throw new InvalidBackupFormatError('Invalid or unsupported key derivation parameters.');
  }

  if (!envelope.iv || !envelope.tag || !envelope.ciphertext) {
    throw new InvalidBackupFormatError('Missing cryptographic envelope components (IV, tag, or ciphertext).');
  }

  if (envelope.checksum) {
    const expectedChecksum = computeBackupChecksum(
      envelope.kdf.saltHex,
      envelope.iv,
      envelope.tag,
      envelope.ciphertext
    );
    if (envelope.checksum !== expectedChecksum) {
      throw new TamperDetectedError();
    }
  }

  return envelope;
}

/**
 * Decrypts and validates the integrity of a .vaultnote backup using the passphrase.
 * Validates decrypted items against individual Zod schemas.
 */
export async function decryptAndVerifyBackup(
  rawContent: string,
  passphrase: string
): Promise<DecryptedBackupPayload> {
  const envelope = parseAndValidateBackupEnvelope(rawContent);

  const derived = deriveKeyArgon2id(passphrase, envelope.kdf.saltHex, {
    m: envelope.kdf.memory,
    t: envelope.kdf.iterations,
    p: envelope.kdf.parallelism,
    dkLen: 32,
  });

  let decryptedJson: string;
  try {
    decryptedJson = decrypt(
      {
        version: envelope.version,
        algorithm: 'AES-256-GCM',
        iv: envelope.iv,
        tag: envelope.tag,
        ciphertext: envelope.ciphertext,
      },
      derived.key
    );
  } catch (error) {
    if (error instanceof DecryptionAuthenticationError) {
      throw new InvalidBackupPasswordError();
    }
    throw error;
  }

  let payload: DecryptedBackupPayload;
  try {
    payload = JSON.parse(decryptedJson);
  } catch (error) {
    throw new InvalidBackupFormatError(`Malformed decrypted payload: ${(error as Error).message}`);
  }

  if (!payload || !payload.metadata || !Array.isArray(payload.items)) {
    throw new InvalidBackupFormatError('Payload missing metadata or items collection.');
  }

  // Validate every restored item through Zod schema contracts
  const validatedItems: VaultItem[] = [];
  for (const rawItem of payload.items) {
    try {
      const validated = validateVaultItem(rawItem);
      validatedItems.push(validated as VaultItem);
    } catch (validationError) {
      throw new InvalidBackupFormatError(
        `Item '${(rawItem as VaultItem)?.title || 'unknown'}' failed schema validation: ${(validationError as Error).message}`
      );
    }
  }

  return {
    metadata: payload.metadata,
    items: validatedItems,
  };
}

/**
 * Merges or replaces current vault items with items from a verified backup.
 * In merge mode, conflict resolution keeps the item with the higher updatedAt timestamp.
 */
export function mergeVaultItems(
  existingItems: VaultItem[],
  backupItems: VaultItem[],
  mode: RestoreMode
): { mergedItems: VaultItem[]; summary: RestoreSummary } {
  const restoredAt = Date.now();

  if (mode === 'replace') {
    return {
      mergedItems: [...backupItems],
      summary: {
        totalRestored: backupItems.length,
        addedCount: backupItems.length,
        updatedCount: 0,
        skippedCount: 0,
        mode: 'replace',
        restoredAt,
      },
    };
  }

  // Merge mode: map existing items by id
  const existingMap = new Map<string, VaultItem>();
  for (const item of existingItems) {
    existingMap.set(item.id, item);
  }

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const backupItem of backupItems) {
    const existing = existingMap.get(backupItem.id);
    if (!existing) {
      existingMap.set(backupItem.id, backupItem);
      addedCount++;
    } else if (backupItem.updatedAt > existing.updatedAt) {
      existingMap.set(backupItem.id, backupItem);
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  const mergedItems = Array.from(existingMap.values());

  return {
    mergedItems,
    summary: {
      totalRestored: addedCount + updatedCount,
      addedCount,
      updatedCount,
      skippedCount,
      mode: 'merge',
      restoredAt,
    },
  };
}
