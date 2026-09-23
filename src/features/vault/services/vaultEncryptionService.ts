/**
 * Vault Encryption Service
 * Handles field-level authenticated AES-256-GCM encryption and decryption of vault records
 */

import { encrypt, decrypt, encryptObject, decryptObject, validateKey } from '../../../core/crypto/aes';
import { EncryptedVaultItemRecord } from '../../../core/database/types';
import { VaultItem, VaultItemType, AnyVaultPayload } from '../../../types/vault';
import { validateVaultItem } from '../schemas';

export class VaultEncryptionService {
  /**
   * Encrypts a typed VaultItem into an EncryptedVaultItemRecord using a 256-bit key.
   * Generates independent, cryptographically unique 96-bit nonces for both title and payload.
   */
  static encryptVaultItem<T = AnyVaultPayload>(
    item: VaultItem<T>,
    dek: Uint8Array
  ): EncryptedVaultItemRecord {
    validateKey(dek);

    // Validate item against runtime Zod schema
    validateVaultItem(item);

    const titlePayload = encrypt(item.title, dek);
    const dataPayload = encryptObject(item.payload, dek);

    return {
      id: item.id,
      category: item.type as string,
      titlePayload,
      dataPayload,
      tags: item.tags ?? [],
      isFavorite: item.isFavorite ?? false,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Decrypts an EncryptedVaultItemRecord back into a typed VaultItem entity.
   * Verifies 128-bit authentication tags for both title and payload envelopes.
   */
  static decryptVaultItem<T = AnyVaultPayload>(
    record: EncryptedVaultItemRecord,
    dek: Uint8Array
  ): VaultItem<T> {
    validateKey(dek);

    const title = decrypt(record.titlePayload, dek);
    const payload = decryptObject<T>(record.dataPayload, dek);

    return {
      id: record.id,
      type: record.category as VaultItemType,
      title,
      payload,
      tags: record.tags ?? [],
      isFavorite: record.isFavorite,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
