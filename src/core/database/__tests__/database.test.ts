import test, { beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  getDatabaseClient,
  resetDatabaseClient,
} from '../connection';
import {
  runMigrations,
  getCurrentSchemaVersion,
} from '../migrations';
import {
  saveVaultItem,
  getVaultItemById,
  getAllVaultItems,
  getVaultItemsByCategory,
  getFavoriteVaultItems,
  deleteVaultItem,
  toggleFavorite,
  getVaultStats,
  setMetadata,
  getMetadata,
  clearAllDatabaseData,
} from '../repository';
import { EncryptedVaultItemRecord } from '../types';
import { encrypt, decrypt, encryptObject, decryptObject } from '../../crypto/aes';
import { deriveKeyArgon2id } from '../../crypto/kdf';
import { getRandomBytes } from '../../crypto/csprng';

beforeEach(async () => {
  await resetDatabaseClient();
  await runMigrations();
  await clearAllDatabaseData();
});

test('Database: Migrations apply cleanly and idempotently', async () => {
  const version = await getCurrentSchemaVersion();
  assert.strictEqual(version, 1);

  // Subsequent runs should apply 0 additional migrations
  const rerunCount = await runMigrations();
  assert.strictEqual(rerunCount, 0);
});

test('Database: Metadata key-value persistence', async () => {
  assert.strictEqual(await getMetadata('test_setting'), null);

  await setMetadata('test_setting', 'enabled');
  assert.strictEqual(await getMetadata('test_setting'), 'enabled');

  // Updating value
  await setMetadata('test_setting', 'disabled');
  assert.strictEqual(await getMetadata('test_setting'), 'disabled');
});

test('Database: Vault item transactional insert, fetch, and tag mapping', async () => {
  const dummyKey = getRandomBytes(32);
  const titlePayload = encrypt('Google Account (Work)', dummyKey);
  const dataPayload = encryptObject({ username: 'alex@company.com', password: 'P@ssword123' }, dummyKey);

  const item: EncryptedVaultItemRecord = {
    id: 'item-uuid-001',
    category: 'Login',
    titlePayload,
    dataPayload,
    tags: ['Work', 'Google', 'Sso'],
    isFavorite: true,
    createdAt: 1716000000000,
    updatedAt: 1716000000000,
  };

  await saveVaultItem(item);

  const retrieved = await getVaultItemById('item-uuid-001');
  assert.ok(retrieved !== null);
  assert.strictEqual(retrieved.id, 'item-uuid-001');
  assert.strictEqual(retrieved.category, 'Login');
  assert.strictEqual(retrieved.isFavorite, true);
  // Tags should be normalized to lowercase
  assert.deepStrictEqual(retrieved.tags, ['google', 'sso', 'work']);
  assert.strictEqual(retrieved.titlePayload.ciphertext, titlePayload.ciphertext);
});

test('Database: Filter items by category and favorites', async () => {
  const dummyKey = getRandomBytes(32);

  const loginItem: EncryptedVaultItemRecord = {
    id: 'item-login',
    category: 'Login',
    titlePayload: encrypt('Gmail', dummyKey),
    dataPayload: encrypt('secret-data', dummyKey),
    tags: ['personal'],
    isFavorite: true,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const noteItem: EncryptedVaultItemRecord = {
    id: 'item-note',
    category: 'Secure Note',
    titlePayload: encrypt('Server Recovery Codes', dummyKey),
    dataPayload: encrypt('recovery-data', dummyKey),
    tags: ['devops'],
    isFavorite: false,
    createdAt: 2000,
    updatedAt: 2000,
  };

  await saveVaultItem(loginItem);
  await saveVaultItem(noteItem);

  const all = await getAllVaultItems();
  assert.strictEqual(all.length, 2);

  const logins = await getVaultItemsByCategory('Login');
  assert.strictEqual(logins.length, 1);
  assert.strictEqual(logins[0].id, 'item-login');

  const notes = await getVaultItemsByCategory('Secure Note');
  assert.strictEqual(notes.length, 1);
  assert.strictEqual(notes[0].id, 'item-note');

  const favorites = await getFavoriteVaultItems();
  assert.strictEqual(favorites.length, 1);
  assert.strictEqual(favorites[0].id, 'item-login');
});

test('Database: Toggle favorite and update item stats', async () => {
  const dummyKey = getRandomBytes(32);

  const item: EncryptedVaultItemRecord = {
    id: 'item-stat',
    category: 'Card',
    titlePayload: encrypt('Visa Corporate', dummyKey),
    dataPayload: encrypt('card-data', dummyKey),
    tags: ['finance'],
    isFavorite: false,
    createdAt: 1000,
    updatedAt: 1000,
  };

  await saveVaultItem(item);

  let stats = await getVaultStats();
  assert.strictEqual(stats.totalItems, 1);
  assert.strictEqual(stats.totalFavorites, 0);

  const newFavStatus = await toggleFavorite('item-stat');
  assert.strictEqual(newFavStatus, true);

  stats = await getVaultStats();
  assert.strictEqual(stats.totalFavorites, 1);
});

test('Database: Delete vault item cascades and purges tag associations', async () => {
  const db = await getDatabaseClient();
  const dummyKey = getRandomBytes(32);

  const item: EncryptedVaultItemRecord = {
    id: 'item-to-delete',
    category: 'API Key',
    titlePayload: encrypt('Stripe Production', dummyKey),
    dataPayload: encrypt('sk_live_12345', dummyKey),
    tags: ['stripe', 'payments', 'backend'],
    isFavorite: false,
    createdAt: 1000,
    updatedAt: 1000,
  };

  await saveVaultItem(item);

  // Verify tags in raw table
  const rawTags = await db.getAllAsync<{ tag: string }>('SELECT tag FROM vault_tags WHERE item_id = ?;', item.id);
  assert.strictEqual(rawTags.length, 3);

  // Delete item
  const deleted = await deleteVaultItem(item.id);
  assert.strictEqual(deleted, true);

  // Item should be gone
  assert.strictEqual(await getVaultItemById(item.id), null);

  // Tags must be cascade deleted
  const remainingTags = await db.getAllAsync<{ tag: string }>('SELECT tag FROM vault_tags WHERE item_id = ?;', item.id);
  assert.strictEqual(remainingTags.length, 0);
});

test('Database & Crypto Integration: End-to-end encryption, storage, retrieval and decryption', async () => {
  // 1. Derive KEK from Master Password using Argon2id
  const masterPassword = 'MySecureMasterPassword!2026';
  const salt = '0123456789abcdef0123456789abcdef';
  const { key } = deriveKeyArgon2id(masterPassword, salt, { t: 2, m: 1024, p: 1 });

  // 2. Encrypt real secret payload
  const secretCreds = {
    service: 'AWS Management Console',
    username: 'root-admin',
    password: 'SuperHighEntropyPassword!#9912',
    totpKey: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
    notes: 'Primary production AWS root account. Biometrics required.',
  };

  const titlePayload = encrypt('AWS Cloud Infrastructure', key);
  const dataPayload = encryptObject(secretCreds, key);

  // 3. Persist into SQLite
  const record: EncryptedVaultItemRecord = {
    id: 'aws-sec-01',
    category: 'Login',
    titlePayload,
    dataPayload,
    tags: ['aws', 'cloud', 'root'],
    isFavorite: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveVaultItem(record);

  // 4. Retrieve encrypted record from SQLite
  const fetched = await getVaultItemById('aws-sec-01');
  assert.ok(fetched !== null);

  // 5. Decrypt using Master Key
  const decryptedTitle = decrypt(fetched.titlePayload, key);
  const decryptedData = decryptObject<typeof secretCreds>(fetched.dataPayload, key);

  assert.strictEqual(decryptedTitle, 'AWS Cloud Infrastructure');
  assert.deepStrictEqual(decryptedData, secretCreds);
});
