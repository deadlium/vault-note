/**
 * VaultRepository & VaultEncryptionService Test Suite
 * Validates Zod schema validation, AES-256-GCM authenticated encryption,
 * zero-knowledge SQLite storage-at-rest, and full item CRUD lifecycles.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { VaultRepository } from '../vaultRepository';
import { VaultEncryptionService } from '../../services/vaultEncryptionService';
import {
  validateVaultItem,
  loginItemSchema,
  noteItemSchema,
  cardItemSchema,
  totpItemSchema,
} from '../../schemas';
import { VaultItem, LoginPayload, SecureNotePayload, CardPayload, TOTPPayload } from '../../../../types/vault';
import { getRandomBytes } from '../../../../core/crypto/csprng';
import { DecryptionAuthenticationError } from '../../../../core/crypto/types';
import { getDatabaseClient } from '../../../../core/database/connection';
import { runMigrations } from '../../../../core/database/migrations';

describe('Vault Zod Validation Schemas', () => {
  it('Validates and parses well-formed login item', () => {
    const validLogin: VaultItem<LoginPayload> = {
      id: 'login_001',
      type: 'LOGIN',
      title: 'ProtonMail Secure',
      payload: {
        username: 'alice@proton.me',
        password: 'SuperSecretPassword!2026',
        websiteUrl: 'https://mail.proton.me',
        totpSecret: 'JBSWY3DPEHPK3PXP',
        notes: 'Primary personal email',
      },
      tags: ['email', 'privacy'],
      isFavorite: true,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const parsed = validateVaultItem(validLogin);
    assert.strictEqual(parsed.id, 'login_001');
    assert.strictEqual(parsed.type, 'LOGIN');
    assert.strictEqual(parsed.title, 'ProtonMail Secure');
  });

  it('Rejects login items with empty title', () => {
    const invalidLogin = {
      id: 'login_002',
      type: 'LOGIN',
      title: '   ',
      payload: {
        username: 'user',
        password: 'pwd',
      },
      tags: [],
      isFavorite: false,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    assert.throws(() => validateVaultItem(invalidLogin));
  });

  it('Rejects invalid Base32 TOTP secret characters', () => {
    const invalidTotp = {
      id: 'totp_001',
      type: 'TOTP',
      title: 'AWS Auth',
      payload: {
        issuer: 'Amazon',
        accountName: 'ops@company.com',
        secret: 'INVALID_CHARS_890!', // 8 and 9 are not valid Base32
      },
      tags: [],
      isFavorite: false,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    assert.throws(() => validateVaultItem(invalidTotp));
  });

  it('Validates credit card expiration month bounds', () => {
    const invalidCard = {
      id: 'card_001',
      type: 'CARD',
      title: 'Obsidian Card',
      payload: {
        cardholderName: 'Alice Turner',
        cardNumber: '4111 2222 3333 4444',
        expirationMonth: '13', // Invalid month > 12
        expirationYear: '2028',
        cvv: '123',
      },
      tags: [],
      isFavorite: false,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    assert.throws(() => validateVaultItem(invalidCard));
  });
});

describe('VaultEncryptionService & Authenticated Envelopes', () => {
  const mockDek = getRandomBytes(32);

  it('Generates unique 96-bit nonces on successive encryptions', () => {
    const item: VaultItem<SecureNotePayload> = {
      id: 'note_001',
      type: 'SECURE_NOTE',
      title: 'Hardware Wallet Backup Plan',
      payload: {
        content: 'Seed phrase stored in steel capsule buried at GPS coordinates.',
      },
      tags: ['crypto', 'cold-storage'],
      isFavorite: true,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const enc1 = VaultEncryptionService.encryptVaultItem(item, mockDek);
    const enc2 = VaultEncryptionService.encryptVaultItem(item, mockDek);

    // Nonces must be unique
    assert.notStrictEqual(enc1.titlePayload.iv, enc2.titlePayload.iv);
    assert.notStrictEqual(enc1.dataPayload.iv, enc2.dataPayload.iv);
    assert.notStrictEqual(enc1.titlePayload.ciphertext, enc2.titlePayload.ciphertext);
  });

  it('Encrypts and decrypts round-trip with byte-for-byte fidelity', () => {
    const item: VaultItem<LoginPayload> = {
      id: 'login_100',
      type: 'LOGIN',
      title: 'GitHub Enterprise',
      payload: {
        username: 'octocat',
        password: 'CorrectHorseBatteryStaple!9',
        websiteUrl: 'https://github.com',
        notes: 'Organization 2FA recovery token active.',
      },
      tags: ['dev', 'git'],
      isFavorite: true,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const encrypted = VaultEncryptionService.encryptVaultItem(item, mockDek);
    const decrypted = VaultEncryptionService.decryptVaultItem<LoginPayload>(encrypted, mockDek);

    assert.strictEqual(decrypted.id, item.id);
    assert.strictEqual(decrypted.type, 'LOGIN');
    assert.strictEqual(decrypted.title, item.title);
    assert.deepStrictEqual(decrypted.payload, item.payload);
    assert.deepStrictEqual(decrypted.tags, item.tags);
  });
});

describe('Encrypted SQLite VaultRepository CRUD & Zero-Knowledge at Rest', () => {
  const masterKey = getRandomBytes(32);
  const wrongKey = getRandomBytes(32);

  beforeEach(async () => {
    const db = await getDatabaseClient();
    await runMigrations(db);
    await db.execAsync('DELETE FROM vault_tags;');
    await db.execAsync('DELETE FROM vault_items;');
  });

  it('Storage-at-Rest: Raw database rows contain strictly encrypted ciphertext', async () => {
    const sensitivePassword = 'P@sswordSuperSecret123!';
    const item: VaultItem<LoginPayload> = {
      id: 'login_check_enc',
      type: 'LOGIN',
      title: 'Secret Bank Account',
      payload: {
        username: 'alice_wealth',
        password: sensitivePassword,
        websiteUrl: 'https://bank.example.com',
      },
      tags: ['finance'],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await VaultRepository.createItem(item, masterKey);

    // Inspect the raw SQLite row on disk
    const rawRow = await VaultRepository.getRawDatabaseRow('login_check_enc');
    assert.notStrictEqual(rawRow, null);

    // Plaintext values must NOT be present in raw database strings
    assert.strictEqual(rawRow!.title_enc.includes('Secret Bank Account'), false);
    assert.strictEqual(rawRow!.payload_enc.includes(sensitivePassword), false);
    assert.strictEqual(rawRow!.payload_enc.includes('alice_wealth'), false);

    // The stored fields must be valid JSON encrypted payloads
    const parsedPayload = JSON.parse(rawRow!.payload_enc);
    assert.strictEqual(parsedPayload.algorithm, 'AES-256-GCM');
    assert.strictEqual(typeof parsedPayload.ciphertext, 'string');
    assert.strictEqual(typeof parsedPayload.iv, 'string');
    assert.strictEqual(typeof parsedPayload.tag, 'string');
  });

  it('Full CRUD Lifecycle: Create, Read, Update, and Delete multi-category items', async () => {
    // 1. Create Login Item
    const loginItem: VaultItem<LoginPayload> = {
      id: 'item_crud_login',
      type: 'LOGIN',
      title: 'ProtonMail',
      payload: {
        username: 'security@proton.me',
        password: 'InitialPassword1',
      },
      tags: ['mail', 'work'],
      isFavorite: false,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    // 2. Create Card Item
    const cardItem: VaultItem<CardPayload> = {
      id: 'item_crud_card',
      type: 'CARD',
      title: 'Obsidian Black Metal Card',
      payload: {
        cardholderName: 'ALEX TURNER',
        cardNumber: '4532 9801 2345 6789',
        expirationMonth: '08',
        expirationYear: '2029',
        cvv: '999',
      },
      tags: ['banking'],
      isFavorite: true,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    await VaultRepository.createItem(loginItem, masterKey);
    await VaultRepository.createItem(cardItem, masterKey);

    // 3. Read by ID
    const fetchedLogin = await VaultRepository.getItemById<LoginPayload>('item_crud_login', masterKey);
    assert.notStrictEqual(fetchedLogin, null);
    assert.strictEqual(fetchedLogin!.title, 'ProtonMail');
    assert.strictEqual(fetchedLogin!.payload.password, 'InitialPassword1');

    // 4. Filter by Type
    const cards = await VaultRepository.getItemsByType<CardPayload>('CARD', masterKey);
    assert.strictEqual(cards.length, 1);
    assert.strictEqual(cards[0].payload.cardNumber, '4532 9801 2345 6789');

    // 5. Filter Favorites
    const favorites = await VaultRepository.getFavoriteItems(masterKey);
    assert.strictEqual(favorites.length, 1);
    assert.strictEqual(favorites[0].id, 'item_crud_card');

    // 6. Update item with fresh password
    const updated = await VaultRepository.updateItem<LoginPayload>(
      'item_crud_login',
      {
        payload: {
          username: 'security@proton.me',
          password: 'NewRotatedPassword2026!',
        },
      },
      masterKey
    );

    assert.strictEqual(updated.payload.password, 'NewRotatedPassword2026!');

    // Verify update persisted
    const readAfterUpdate = await VaultRepository.getItemById<LoginPayload>('item_crud_login', masterKey);
    assert.strictEqual(readAfterUpdate!.payload.password, 'NewRotatedPassword2026!');

    // 7. Delete item
    const deleted = await VaultRepository.deleteItem('item_crud_login');
    assert.strictEqual(deleted, true);

    const checkGone = await VaultRepository.getItemById('item_crud_login', masterKey);
    assert.strictEqual(checkGone, null);
  });

  it('Rejects decryption when using wrong key', async () => {
    const item: VaultItem<SecureNotePayload> = {
      id: 'tamper_check',
      type: 'SECURE_NOTE',
      title: 'Confidential Notes',
      payload: { content: 'Secret briefing.' },
      tags: [],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await VaultRepository.createItem(item, masterKey);

    // Reading with wrongKey must throw authentication error
    await assert.rejects(
      async () => {
        await VaultRepository.getItemById('tamper_check', wrongKey);
      },
      DecryptionAuthenticationError
    );
  });
});
