/**
 * Vault Repository
 * High-level encrypted repository for multi-category vault item CRUD operations
 */

import { DatabaseClient, VaultItemRow, DatabaseError } from '../../../core/database/types';
import { getDatabaseClient } from '../../../core/database/connection';
import {
  saveVaultItem,
  getVaultItemById,
  getAllVaultItems,
  deleteVaultItem,
  toggleFavorite,
} from '../../../core/database/repository';
import { VaultItem, VaultItemType, AnyVaultPayload } from '../../../types/vault';
import { VaultEncryptionService } from '../services/vaultEncryptionService';

export class VaultRepository {
  /**
   * Persists a new or existing VaultItem into encrypted SQLite storage.
   * Payloads and titles are authenticated with AES-256-GCM using unique nonces.
   */
  static async createItem<T = AnyVaultPayload>(
    item: VaultItem<T>,
    dek: Uint8Array,
    client?: DatabaseClient
  ): Promise<void> {
    const encryptedRecord = VaultEncryptionService.encryptVaultItem(item, dek);
    await saveVaultItem(encryptedRecord, client);
  }

  /**
   * Retrieves and decrypts a single VaultItem by its unique ID.
   */
  static async getItemById<T = AnyVaultPayload>(
    id: string,
    dek: Uint8Array,
    client?: DatabaseClient
  ): Promise<VaultItem<T> | null> {
    const record = await getVaultItemById(id, client);
    if (!record) return null;

    return VaultEncryptionService.decryptVaultItem<T>(record, dek);
  }

  /**
   * Retrieves and decrypts all vault items.
   */
  static async getAllItems(
    dek: Uint8Array,
    client?: DatabaseClient
  ): Promise<VaultItem<AnyVaultPayload>[]> {
    const records = await getAllVaultItems(client);
    return records.map((record) => VaultEncryptionService.decryptVaultItem(record, dek));
  }

  /**
   * Retrieves and decrypts vault items filtered by item type.
   */
  static async getItemsByType<T = AnyVaultPayload>(
    type: VaultItemType,
    dek: Uint8Array,
    client?: DatabaseClient
  ): Promise<VaultItem<T>[]> {
    const db = client ?? (await getDatabaseClient());
    const records = await getAllVaultItems(db);
    const filtered = records.filter((r) => r.category === type);

    return filtered.map((record) => VaultEncryptionService.decryptVaultItem<T>(record, dek));
  }

  /**
   * Retrieves and decrypts all favorited vault items.
   */
  static async getFavoriteItems(
    dek: Uint8Array,
    client?: DatabaseClient
  ): Promise<VaultItem<AnyVaultPayload>[]> {
    const records = await getAllVaultItems(client);
    const favorites = records.filter((r) => r.isFavorite);

    return favorites.map((record) => VaultEncryptionService.decryptVaultItem(record, dek));
  }

  /**
   * Updates an existing vault item with partial changes and persists new encrypted ciphertext.
   * Re-encrypts with a fresh AES-GCM nonce and updates updatedAt timestamp.
   */
  static async updateItem<T = AnyVaultPayload>(
    id: string,
    updates: Partial<Omit<VaultItem<T>, 'id' | 'createdAt'>>,
    dek: Uint8Array,
    client?: DatabaseClient
  ): Promise<VaultItem<T>> {
    const existing = await this.getItemById<T>(id, dek, client);
    if (!existing) {
      throw new DatabaseError(`Vault item not found: ${id}`);
    }

    const updatedItem: VaultItem<T> = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
      payload: updates.payload !== undefined ? updates.payload : existing.payload,
    };

    await this.createItem(updatedItem, dek, client);
    return updatedItem;
  }

  /**
   * Permanently deletes a vault item by ID.
   */
  static async deleteItem(id: string, client?: DatabaseClient): Promise<boolean> {
    return await deleteVaultItem(id, client);
  }

  /**
   * Toggles the favorite status of a vault item.
   */
  static async toggleItemFavorite(id: string, client?: DatabaseClient): Promise<boolean> {
    return await toggleFavorite(id, client);
  }

  /**
   * Retrieves raw SQLite row to verify ciphertext-at-rest.
   */
  static async getRawDatabaseRow(
    id: string,
    client?: DatabaseClient
  ): Promise<VaultItemRow | null> {
    const db = client ?? (await getDatabaseClient());
    return await db.getFirstAsync<VaultItemRow>(
      'SELECT * FROM vault_items WHERE id = ?;',
      id
    );
  }
}
