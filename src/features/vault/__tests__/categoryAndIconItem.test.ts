/**
 * Category Tag, Custom Labels, and Site Icon Item Test Suite
 * Validates domain favicon generation, tag normalization, multi-category schemas, and encryption round-trip
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VaultEncryptionService } from '../services/vaultEncryptionService';
import { validateVaultItem } from '../schemas';
import { VaultItem, LoginPayload, CardPayload, SecureNotePayload } from '../../../types/vault';
import { getRandomBytes } from '../../../core/crypto/csprng';

function extractDomain(urlOrHost: string): string {
  if (!urlOrHost) return '';
  let clean = urlOrHost.trim();
  clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
  const domain = clean.split('/')[0].split('?')[0].split(':')[0];
  return domain.toLowerCase();
}

function resolveDynamicIcon(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // 1. Direct image, svg, icon, or data URI
  const isDirectImage =
    trimmed.startsWith('data:image/') ||
    /\.(png|jpg|jpeg|svg|ico|webp|gif)(\?.*)?$/i.test(trimmed) ||
    trimmed.includes('/favicon.ico') ||
    trimmed.includes('gstatic.com/favicon') ||
    trimmed.includes('google.com/s2/favicons');

  if (isDirectImage) {
    return trimmed;
  }

  // 2. Web URL or domain -> Favicon
  const domain = extractDomain(trimmed);
  if (domain && domain.includes('.')) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  return trimmed;
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/^#/, '');
}

describe('Category Tag, Custom Labels, and Site Icon Operations', () => {
  it('extracts domain correctly from diverse URL formats', () => {
    assert.strictEqual(extractDomain('https://github.com/settings'), 'github.com');
    assert.strictEqual(extractDomain('http://www.netflix.com/browse'), 'netflix.com');
    assert.strictEqual(extractDomain('google.com'), 'google.com');
    assert.strictEqual(extractDomain('https://uddeshjaiswal.com/'), 'uddeshjaiswal.com');
    assert.strictEqual(extractDomain('https://sub.domain.co.uk/path?q=1'), 'sub.domain.co.uk');
    assert.strictEqual(extractDomain('invalid-domain'), 'invalid-domain');
    assert.strictEqual(extractDomain(''), '');
  });

  it('constructs high-res favicon URL from domain', () => {
    const faviconUrl = resolveDynamicIcon('https://apple.com/iphone');
    assert.strictEqual(faviconUrl, 'https://www.google.com/s2/favicons?domain=apple.com&sz=128');

    const invalidUrl = resolveDynamicIcon('no-dot-here');
    assert.strictEqual(invalidUrl, 'no-dot-here');
  });

  it('dynamically resolves site links, direct icon links, and image links', () => {
    // Site link -> High-res Favicon URL
    const siteUrl = 'https://uddeshjaiswal.com/';
    assert.strictEqual(
      resolveDynamicIcon(siteUrl),
      'https://www.google.com/s2/favicons?domain=uddeshjaiswal.com&sz=128'
    );

    // Direct icon link -> Preserved directly
    const iconUrl = 'https://uddeshjaiswal.com/favicon.ico';
    assert.strictEqual(resolveDynamicIcon(iconUrl), 'https://uddeshjaiswal.com/favicon.ico');

    // Direct image link -> Preserved directly
    const imageUrl = 'https://assets.example.com/branding/logo.png?v=2';
    assert.strictEqual(resolveDynamicIcon(imageUrl), imageUrl);

    // Data URI -> Preserved directly
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    assert.strictEqual(resolveDynamicIcon(dataUri), dataUri);

    // Known preset string
    assert.strictEqual(resolveDynamicIcon('github'), 'github');
  });

  it('normalizes custom tags and eliminates duplicate labels', () => {
    const rawTags = ['#Personal', 'Work', 'personal', '  FINANCE  ', '#crypto'];
    const normalizedSet = new Set<string>();

    for (const tag of rawTags) {
      const clean = normalizeTag(tag);
      if (clean) normalizedSet.add(clean);
    }

    const uniqueTags = Array.from(normalizedSet);
    assert.deepStrictEqual(uniqueTags, ['personal', 'work', 'finance', 'crypto']);
  });

  it('validates multi-category vault items with custom tags and icon properties', () => {
    // 1. Login with Favicon URL
    const loginItem: VaultItem<LoginPayload> = {
      id: 'item-login-1',
      type: 'LOGIN',
      title: 'GitHub Enterprise',
      isProtected: true,
      isFavorite: true,
      tags: ['work', 'dev', 'git'],
      icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
      payload: {
        username: 'engineer@corp.com',
        password: 'SuperSecretPassword!2026',
        websiteUrl: 'https://github.com',
        icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const parsedLogin = validateVaultItem(loginItem);
    assert.strictEqual(parsedLogin.title, 'GitHub Enterprise');
    assert.strictEqual(parsedLogin.tags.length, 3);
    assert.strictEqual(parsedLogin.icon, 'https://www.google.com/s2/favicons?domain=github.com&sz=128');

    // 2. Card with Preset Icon
    const cardItem: VaultItem<CardPayload> = {
      id: 'item-card-1',
      type: 'CARD',
      title: 'Sapphire Preferred',
      isProtected: true,
      isFavorite: false,
      tags: ['finance', 'travel'],
      icon: 'card',
      payload: {
        cardholderName: 'ALEX SMITH',
        cardNumber: '4111 2222 3333 4444',
        expirationMonth: '11',
        expirationYear: '2029',
        cvv: '987',
        icon: 'card',
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const parsedCard = validateVaultItem(cardItem);
    assert.strictEqual(parsedCard.type, 'CARD');
    assert.strictEqual(parsedCard.tags[0], 'finance');

    // 3. Secure Note with Custom Category Label
    const noteItem: VaultItem<SecureNotePayload> = {
      id: 'item-note-1',
      type: 'SECURE_NOTE',
      title: 'Server Recovery Blueprint',
      isProtected: true,
      isFavorite: false,
      tags: ['infrastructure', 'confidential', 'ops'],
      icon: 'archive',
      payload: {
        content: 'Cluster keys: 0x9812A... emergency hotline: +15550199',
        icon: 'archive',
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const parsedNote = validateVaultItem(noteItem);
    assert.strictEqual(parsedNote.type, 'SECURE_NOTE');
    assert.strictEqual(parsedNote.payload.content.includes('emergency hotline'), true);
  });

  it('preserves icon and custom label tags through AES-256-GCM encryption round-trip', () => {
    const dek = getRandomBytes(32);

    const originalItem: VaultItem<LoginPayload> = {
      id: 'item-roundtrip-test',
      type: 'LOGIN',
      title: 'Netflix Family Account',
      isProtected: true,
      isFavorite: true,
      tags: ['streaming', 'entertainment', 'personal'],
      icon: 'netflix',
      payload: {
        username: 'family@stream.tv',
        password: 'UltraSecurePassword987!',
        websiteUrl: 'https://netflix.com',
        notes: 'Shared profile pin: 1234',
        icon: 'netflix',
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const encryptedRecord = VaultEncryptionService.encryptVaultItem(originalItem, dek);
    assert.deepStrictEqual(encryptedRecord.tags, ['streaming', 'entertainment', 'personal']);

    const decryptedItem = VaultEncryptionService.decryptVaultItem<LoginPayload>(encryptedRecord, dek);
    assert.strictEqual(decryptedItem.title, 'Netflix Family Account');
    assert.strictEqual(decryptedItem.type, 'LOGIN');
    assert.strictEqual(decryptedItem.icon, 'netflix');
    assert.deepStrictEqual(decryptedItem.tags, ['streaming', 'entertainment', 'personal']);
    assert.strictEqual(decryptedItem.payload.username, 'family@stream.tv');
    assert.strictEqual(decryptedItem.payload.icon, 'netflix');
  });

  it('validates and encrypts vault item with dynamic custom fields (text, password, description)', () => {
    const dek = getRandomBytes(32);

    const itemWithCustomFields: VaultItem<LoginPayload> = {
      id: 'item-custom-fields-1',
      type: 'LOGIN',
      title: 'AWS Cloud Console',
      isProtected: true,
      isFavorite: true,
      tags: ['cloud', 'devops'],
      icon: 'amazon',
      payload: {
        username: 'devops-admin@enterprise.internal',
        password: 'RootMasterKeyPass99!',
        websiteUrl: 'https://aws.amazon.com',
        notes: 'Main corporate account',
        icon: 'amazon',
        customFields: [
          {
            id: 'cf-pin-1',
            label: 'Hardware MFA Serial',
            value: 'HW-SERIAL-998231',
            type: 'text',
            isSecret: false,
          },
          {
            id: 'cf-sec-2',
            label: 'Secret Access Key',
            value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            type: 'password',
            isSecret: true,
          },
          {
            id: 'cf-desc-3',
            label: 'Architecture Notes',
            value: 'VPC ID: vpc-0123456789abcdef0\nSubnet: us-east-1a\nGateway: igw-987654321',
            type: 'description',
            isSecret: false,
          },
        ],
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    // Validate against Zod schema
    const parsed = validateVaultItem(itemWithCustomFields);
    assert.strictEqual(parsed.title, 'AWS Cloud Console');
    assert.strictEqual((parsed.payload as LoginPayload).customFields?.length, 3);
    assert.strictEqual((parsed.payload as LoginPayload).customFields?.[0].type, 'text');
    assert.strictEqual((parsed.payload as LoginPayload).customFields?.[1].type, 'password');
    assert.strictEqual((parsed.payload as LoginPayload).customFields?.[2].type, 'description');

    // Round-trip AES-256-GCM encryption & decryption
    const encryptedRecord = VaultEncryptionService.encryptVaultItem(itemWithCustomFields, dek);
    const decrypted = VaultEncryptionService.decryptVaultItem<LoginPayload>(encryptedRecord, dek);

    assert.strictEqual(decrypted.payload.customFields?.length, 3);
    assert.strictEqual(decrypted.payload.customFields?.[0].label, 'Hardware MFA Serial');
    assert.strictEqual(decrypted.payload.customFields?.[0].value, 'HW-SERIAL-998231');
    assert.strictEqual(decrypted.payload.customFields?.[1].label, 'Secret Access Key');
    assert.strictEqual(decrypted.payload.customFields?.[1].type, 'password');
    assert.strictEqual(decrypted.payload.customFields?.[2].type, 'description');
    assert.strictEqual(decrypted.payload.customFields?.[2].value.includes('vpc-0123456789abcdef0'), true);
  });
});
