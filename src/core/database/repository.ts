/**
 * VaultNote Encrypted SQLite Repository
 * High-level transactional persistence layer for encrypted vault items and metadata
 * Phase 1: Cryptographic Perimeter
 */

import { getDatabaseClient } from './connection';
import {
  DatabaseClient,
  EncryptedVaultItemRecord,
  VaultCategory,
  VaultItemRow,
  VaultTagRow,
  VaultMetadataRow,
  DatabaseError,
} from './types';
import { EncryptedPayload } from '../crypto/types';

/**
 * Inserts or updates an encrypted vault item and synchronizes associated tags within a single transaction.
 */
export async function saveVaultItem(
  item: EncryptedVaultItemRecord,
  client?: DatabaseClient
): Promise<void> {
  const db = client ?? (await getDatabaseClient());

  await db.withTransactionAsync(async () => {
    // 1. Insert or replace vault item record
    await db.runAsync(
      `INSERT INTO vault_items (
        id, category, title_enc, payload_enc, is_favorite, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        title_enc = excluded.title_enc,
        payload_enc = excluded.payload_enc,
        is_favorite = excluded.is_favorite,
        updated_at = excluded.updated_at;`,
      item.id,
      item.category,
      JSON.stringify(item.titlePayload),
      JSON.stringify(item.dataPayload),
      item.isFavorite ? 1 : 0,
      item.createdAt,
      item.updatedAt
    );

    // 2. Refresh tag associations
    await db.runAsync('DELETE FROM vault_tags WHERE item_id = ?;', item.id);
    for (const tag of item.tags) {
      if (tag && tag.trim().length > 0) {
        await db.runAsync(
          'INSERT OR IGNORE INTO vault_tags (item_id, tag) VALUES (?, ?);',
          item.id,
          tag.trim().toLowerCase()
        );
      }
    }
  });
}

/**
 * Retrieves a single encrypted vault item by its unique ID, including all associated tags.
 */
export async function getVaultItemById(
  id: string,
  client?: DatabaseClient
): Promise<EncryptedVaultItemRecord | null> {
  const db = client ?? (await getDatabaseClient());

  const row = await db.getFirstAsync<VaultItemRow>(
    'SELECT * FROM vault_items WHERE id = ?;',
    id
  );

  if (!row) return null;

  const tagRows = await db.getAllAsync<VaultTagRow>(
    'SELECT tag FROM vault_tags WHERE item_id = ? ORDER BY tag ASC;',
    id
  );

  return mapRowToRecord(row, tagRows.map((t) => t.tag));
}

/**
 * Retrieves all encrypted vault items ordered by last update time descending.
 */
export async function getAllVaultItems(
  client?: DatabaseClient
): Promise<EncryptedVaultItemRecord[]> {
  const db = client ?? (await getDatabaseClient());

  const itemRows = await db.getAllAsync<VaultItemRow>(
    'SELECT * FROM vault_items ORDER BY updated_at DESC;'
  );

  if (itemRows.length === 0) return [];

  const tagRows = await db.getAllAsync<VaultTagRow>('SELECT item_id, tag FROM vault_tags;');
  const tagsByItemId = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = tagsByItemId.get(t.item_id) ?? [];
    list.push(t.tag);
    tagsByItemId.set(t.item_id, list);
  }

  return itemRows.map((row) => mapRowToRecord(row, tagsByItemId.get(row.id) ?? []));
}

/**
 * Retrieves encrypted vault items filtered by category.
 */
export async function getVaultItemsByCategory(
  category: VaultCategory,
  client?: DatabaseClient
): Promise<EncryptedVaultItemRecord[]> {
  const db = client ?? (await getDatabaseClient());

  const itemRows = await db.getAllAsync<VaultItemRow>(
    'SELECT * FROM vault_items WHERE category = ? ORDER BY updated_at DESC;',
    category
  );

  if (itemRows.length === 0) return [];

  const tagRows = await db.getAllAsync<VaultTagRow>('SELECT item_id, tag FROM vault_tags;');
  const tagsByItemId = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = tagsByItemId.get(t.item_id) ?? [];
    list.push(t.tag);
    tagsByItemId.set(t.item_id, list);
  }

  return itemRows.map((row) => mapRowToRecord(row, tagsByItemId.get(row.id) ?? []));
}

/**
 * Retrieves all favorited vault items.
 */
export async function getFavoriteVaultItems(
  client?: DatabaseClient
): Promise<EncryptedVaultItemRecord[]> {
  const db = client ?? (await getDatabaseClient());

  const itemRows = await db.getAllAsync<VaultItemRow>(
    'SELECT * FROM vault_items WHERE is_favorite = 1 ORDER BY updated_at DESC;'
  );

  if (itemRows.length === 0) return [];

  const tagRows = await db.getAllAsync<VaultTagRow>('SELECT item_id, tag FROM vault_tags;');
  const tagsByItemId = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = tagsByItemId.get(t.item_id) ?? [];
    list.push(t.tag);
    tagsByItemId.set(t.item_id, list);
  }

  return itemRows.map((row) => mapRowToRecord(row, tagsByItemId.get(row.id) ?? []));
}

/**
 * Deletes a vault item by ID. Foreign key cascade automatically purges tag associations.
 */
export async function deleteVaultItem(
  id: string,
  client?: DatabaseClient
): Promise<boolean> {
  const db = client ?? (await getDatabaseClient());
  const result = await db.runAsync('DELETE FROM vault_items WHERE id = ?;', id);
  return result.changes > 0;
}

/**
 * Toggles the favorite status of a vault item.
 */
export async function toggleFavorite(
  id: string,
  client?: DatabaseClient
): Promise<boolean> {
  const db = client ?? (await getDatabaseClient());
  const item = await db.getFirstAsync<{ is_favorite: number }>(
    'SELECT is_favorite FROM vault_items WHERE id = ?;',
    id
  );
  if (!item) return false;

  const newStatus = item.is_favorite === 1 ? 0 : 1;
  await db.runAsync(
    'UPDATE vault_items SET is_favorite = ?, updated_at = ? WHERE id = ?;',
    newStatus,
    Date.now(),
    id
  );
  return newStatus === 1;
}

/**
 * Returns summary counts of the vault items.
 */
export async function getVaultStats(
  client?: DatabaseClient
): Promise<{ totalItems: number; totalFavorites: number }> {
  const db = client ?? (await getDatabaseClient());

  const totalRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vault_items;'
  );
  const favRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vault_items WHERE is_favorite = 1;'
  );

  return {
    totalItems: totalRow?.count ?? 0,
    totalFavorites: favRow?.count ?? 0,
  };
}

/**
 * Stores a metadata key-value pair.
 */
export async function setMetadata(
  key: string,
  value: string,
  client?: DatabaseClient
): Promise<void> {
  const db = client ?? (await getDatabaseClient());
  await db.runAsync(
    'INSERT INTO vault_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    key,
    value
  );
}

/**
 * Retrieves a metadata value by key.
 */
export async function getMetadata(
  key: string,
  client?: DatabaseClient
): Promise<string | null> {
  const db = client ?? (await getDatabaseClient());
  const row = await db.getFirstAsync<VaultMetadataRow>(
    'SELECT value FROM vault_metadata WHERE key = ?;',
    key
  );
  return row?.value ?? null;
}

/**
 * Purges all records from the database upon full vault reset.
 */
export async function clearAllDatabaseData(client?: DatabaseClient): Promise<void> {
  const db = client ?? (await getDatabaseClient());
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM vault_tags;');
    await db.execAsync('DELETE FROM vault_items;');
    await db.execAsync('DELETE FROM vault_metadata;');
  });
}

/**
 * Helper mapping raw database rows to domain records
 */
function mapRowToRecord(row: VaultItemRow, tags: string[]): EncryptedVaultItemRecord {
  try {
    const titlePayload = JSON.parse(row.title_enc) as EncryptedPayload;
    const dataPayload = JSON.parse(row.payload_enc) as EncryptedPayload;

    return {
      id: row.id,
      category: row.category as VaultCategory,
      titlePayload,
      dataPayload,
      tags,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    throw new DatabaseError(`Corrupted database row payload for id ${row.id}: ${(error as Error).message}`);
  }
}
