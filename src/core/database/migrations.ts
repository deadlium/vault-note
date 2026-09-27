/**
 * VaultNote Database Migration Runner
 * Manages incremental SQLite schema versioning and execution
 * Phase 1: Cryptographic Perimeter
 */

import { DatabaseClient, DatabaseMigration, DatabaseError } from './types';
import { getDatabaseClient } from './connection';

/**
 * Ordered list of all database schema migrations
 */
export const MIGRATIONS: DatabaseMigration[] = [
  {
    version: 1,
    name: '001_initial_vault_schema',
    sql: `
      -- Key-value metadata table for vault configuration, salt, and status
      CREATE TABLE IF NOT EXISTS vault_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      -- Encrypted vault items storage
      CREATE TABLE IF NOT EXISTS vault_items (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        title_enc TEXT NOT NULL,
        payload_enc TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Query optimization indexes
      CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
      CREATE INDEX IF NOT EXISTS idx_vault_items_is_favorite ON vault_items(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_vault_items_updated_at ON vault_items(updated_at DESC);

      -- Normalized tag associations with automatic cascade delete
      CREATE TABLE IF NOT EXISTS vault_tags (
        item_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (item_id, tag),
        FOREIGN KEY (item_id) REFERENCES vault_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_vault_tags_tag ON vault_tags(tag);
      CREATE INDEX IF NOT EXISTS idx_vault_tags_item_id ON vault_tags(item_id);
    `,
  },
];

/**
 * Initializes the migrations tracking table and executes any pending schema updates.
 *
 * @param client Optional DatabaseClient. Defaults to singleton.
 * @returns Number of new migrations applied.
 */
export async function runMigrations(client?: DatabaseClient): Promise<number> {
  const db = client ?? (await getDatabaseClient());

  // 1. Ensure migrations bookkeeping table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  // 2. Fetch already applied versions
  const appliedRows = await db.getAllAsync<{ version: number }>('SELECT version FROM _migrations ORDER BY version ASC;');
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  let appliedCount = 0;

  // 3. Execute unapplied migrations within isolated transactions
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      try {
        await db.withTransactionAsync(async () => {
          await db.execAsync(migration.sql);
          await db.runAsync(
            'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?);',
            migration.version,
            migration.name,
            Date.now()
          );
        });
        appliedCount++;
      } catch (error) {
        throw new DatabaseError(
          `Migration ${migration.version} (${migration.name}) failed: ${(error as Error).message}`
        );
      }
    }
  }

  return appliedCount;
}

/**
 * Returns the latest schema version applied to the database.
 */
export async function getCurrentSchemaVersion(client?: DatabaseClient): Promise<number> {
  const db = client ?? (await getDatabaseClient());

  try {
    const row = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM _migrations ORDER BY version DESC LIMIT 1;'
    );
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}
