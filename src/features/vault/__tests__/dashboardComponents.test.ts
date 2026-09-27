/**
 * Dashboard & Vault UI Component Logic Test Suite
 * Validates category filters, count computations, search queries, and favorites partitioning
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VAULT_CATEGORY_OPTIONS, VaultItemRowData } from '../../../types/vault';

describe('Vault Dashboard Category & Filtering Logic', () => {
  const sampleItems: VaultItemRowData[] = [
    {
      id: 'item-1',
      title: 'Google Account',
      subtitle: 'alice@gmail.com',
      category: 'LOGIN',
      tag: 'Login',
      iconType: 'google',
      isFavorite: true,
      hasTOTP: true,
    },
    {
      id: 'item-2',
      title: 'GitHub Work',
      subtitle: 'alice-org',
      category: 'LOGIN',
      tag: 'Login',
      iconType: 'github',
      isFavorite: false,
      hasTOTP: false,
    },
    {
      id: 'item-3',
      title: 'AWS Secret Token',
      subtitle: 'production',
      category: 'API_KEY',
      tag: 'Cloud',
      iconType: 'aws',
      isFavorite: true,
      hasTOTP: false,
    },
    {
      id: 'item-4',
      title: 'Bank Debit Card',
      subtitle: '•••• 4242',
      category: 'CARD',
      tag: 'Finance',
      iconType: 'card',
      isFavorite: false,
      hasTOTP: false,
    },
    {
      id: 'item-5',
      title: 'Confidential Note',
      subtitle: 'Meeting notes',
      category: 'SECURE_NOTE',
      tag: 'Notes',
      iconType: 'archive',
      isFavorite: false,
      hasTOTP: false,
    },
  ];

  it('Verifies VAULT_CATEGORY_OPTIONS contains all required categories', () => {
    const ids = VAULT_CATEGORY_OPTIONS.map((c) => c.id);
    assert.ok(ids.includes('all'));
    assert.ok(ids.includes('LOGIN'));
    assert.ok(ids.includes('SECURE_NOTE'));
    assert.ok(ids.includes('CARD'));
    assert.ok(ids.includes('TOTP'));
    assert.ok(ids.includes('API_KEY'));
    assert.ok(ids.includes('IDENTITY'));
    assert.ok(ids.includes('RECOVERY_CODES'));
  });

  it('Accurately calculates category counts including TOTP enabled items', () => {
    const counts: Record<string, number> = {
      all: sampleItems.length,
      LOGIN: 0,
      SECURE_NOTE: 0,
      CARD: 0,
      TOTP: 0,
      API_KEY: 0,
      IDENTITY: 0,
      RECOVERY_CODES: 0,
    };

    sampleItems.forEach((item) => {
      const cat = item.category as string;
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
      if (item.hasTOTP) {
        counts.TOTP = (counts.TOTP || 0) + 1;
      }
    });

    assert.strictEqual(counts.all, 5);
    assert.strictEqual(counts.LOGIN, 2);
    assert.strictEqual(counts.API_KEY, 1);
    assert.strictEqual(counts.CARD, 1);
    assert.strictEqual(counts.SECURE_NOTE, 1);
    assert.strictEqual(counts.TOTP, 1);
    assert.strictEqual(counts.IDENTITY, 0);
  });

  it('Filters items by specific category accurately', () => {
    const loginItems = sampleItems.filter((item) => item.category === 'LOGIN');
    assert.strictEqual(loginItems.length, 2);

    const cardItems = sampleItems.filter((item) => item.category === 'CARD');
    assert.strictEqual(cardItems.length, 1);
    assert.strictEqual(cardItems[0].title, 'Bank Debit Card');
  });

  it('Filters items by TOTP capability regardless of primary category', () => {
    const totpItems = sampleItems.filter((item) => item.hasTOTP);
    assert.strictEqual(totpItems.length, 1);
    assert.strictEqual(totpItems[0].title, 'Google Account');
  });

  it('Filters items by search query across title, subtitle, and tags', () => {
    const query = 'gmail';
    const matches = sampleItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query)) ||
        (item.tag && item.tag.toLowerCase().includes(query))
      );
    });

    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].id, 'item-1');
  });

  it('Partitions favorites accurately from remaining items', () => {
    const favorites = sampleItems.filter((item) => item.isFavorite);
    const nonFavorites = sampleItems.filter((item) => !item.isFavorite);

    assert.strictEqual(favorites.length, 2);
    assert.strictEqual(nonFavorites.length, 3);
    assert.deepStrictEqual(
      favorites.map((f) => f.id),
      ['item-1', 'item-3']
    );
  });
});
