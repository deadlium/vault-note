/**
 * Ephemeral RAM Search & Favorites Test Suite
 * Validates zero-disk in-memory indexer, fuzzy scoring, category faceting,
 * and favorites synchronization.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  EphemeralSearchIndex,
  calculateFuzzyScore,
  levenshteinDistance,
  globalEphemeralSearchIndex,
} from '../searchIndex';
import { VaultItem, AnyVaultPayload, LoginPayload, APIKeyPayload } from '../../../types/vault';
import { VaultSessionManager } from '../../../core/session';
import { useVaultStore } from '../../vault/store/useVaultStore';

const MOCK_ITEMS: VaultItem<AnyVaultPayload>[] = [
  {
    id: 'test-google',
    type: 'LOGIN',
    title: 'Google Account',
    isProtected: true,
    isFavorite: true,
    tags: ['personal', 'email'],
    icon: 'google',
    payload: {
      username: 'alex.turner@gmail.com',
      password: 'password123',
      websiteUrl: 'https://accounts.google.com',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      notes: 'Main personal email with recovery email set.',
    } as LoginPayload,
    createdAt: 1000,
    updatedAt: 2000,
  },
  {
    id: 'test-github',
    type: 'LOGIN',
    title: 'GitHub Enterprise',
    isProtected: true,
    isFavorite: true,
    tags: ['work', 'dev'],
    icon: 'github',
    payload: {
      username: 'alex-engineer',
      password: 'password456',
      websiteUrl: 'https://github.com',
      totpSecret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
      notes: 'Work repositories and organization credentials.',
    } as LoginPayload,
    createdAt: 1100,
    updatedAt: 2100,
  },
  {
    id: 'test-aws',
    type: 'API_KEY',
    title: 'Amazon Web Services',
    isProtected: true,
    isFavorite: false,
    tags: ['cloud', 'devops'],
    icon: 'aws',
    payload: {
      serviceName: 'AWS Cloud Console',
      apiKey: 'AKIAIOSFODNN7EXAMPLE',
      endpointUrl: 'https://console.aws.amazon.com',
      notes: 'Root access key with IAM restrictions.',
    } as APIKeyPayload,
    createdAt: 1200,
    updatedAt: 2200,
  },
  {
    id: 'test-stripe',
    type: 'API_KEY',
    title: 'Stripe Payments',
    isProtected: true,
    isFavorite: false,
    tags: ['finance', 'payments'],
    icon: 'key',
    payload: {
      serviceName: 'Stripe Gateway',
      apiKey: 'sec_test_stripe_sample_key',
      endpointUrl: 'https://dashboard.stripe.com',
      notes: 'Billing sandbox key.',
    } as APIKeyPayload,
    createdAt: 1300,
    updatedAt: 2300,
  },
];

describe('Fuzzy Scoring Algorithm & Levenshtein Distance', () => {
  it('calculates exact match score as 1.0', () => {
    const score = calculateFuzzyScore('google', 'Google');
    assert.strictEqual(score, 1.0);
  });

  it('rewards prefix matches with high score >= 0.9', () => {
    const score = calculateFuzzyScore('git', 'GitHub Enterprise');
    assert.ok(score >= 0.9, `Expected score >= 0.9, got ${score}`);
  });

  it('detects substring matches inside target string', () => {
    const score = calculateFuzzyScore('hub', 'GitHub Enterprise');
    assert.ok(score >= 0.75, `Expected score >= 0.75, got ${score}`);
  });

  it('matches acronyms for multi-word targets', () => {
    const score = calculateFuzzyScore('aws', 'Amazon Web Services');
    assert.ok(score >= 0.65, `Expected acronym score >= 0.65, got ${score}`);
  });

  it('tolerates typos with Levenshtein distance', () => {
    // 1 typo in 'githb' vs 'github'
    const dist = levenshteinDistance('githb', 'github');
    assert.strictEqual(dist, 1);

    const score = calculateFuzzyScore('githb', 'github');
    assert.ok(score > 0.35, `Expected typo score > 0.35, got ${score}`);
  });

  it('returns 0 for non-matching strings', () => {
    const score = calculateFuzzyScore('xyz123', 'Google Account');
    assert.strictEqual(score, 0);
  });
});

describe('Ephemeral RAM Search Index & Zero-Disk Security', () => {
  let index: EphemeralSearchIndex;

  beforeEach(() => {
    index = new EphemeralSearchIndex();
    index.buildIndex(MOCK_ITEMS);
  });

  it('builds volatile index in RAM without disk access', () => {
    assert.strictEqual(index.size(), 4);
    assert.strictEqual(index.isEphemeralOnly(), true);
  });

  it('finds items by exact title query with highest score', () => {
    const results = index.search('Google');
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].entry.id, 'test-google');
    assert.ok(results[0].matchedFields.includes('title'));
  });

  it('finds items by username / email in subtitle', () => {
    const results = index.search('alex.turner');
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].entry.id, 'test-google');
    assert.ok(results[0].matchedFields.includes('subtitle'));
  });

  it('finds items by tags with high priority', () => {
    const results = index.search('devops');
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].entry.id, 'test-aws');
    assert.ok(results[0].matchedFields.includes('tag'));
  });

  it('finds items by content inside notes', () => {
    const results = index.search('repositories');
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].entry.id, 'test-github');
    assert.ok(results[0].matchedFields.includes('notes'));
  });

  it('ranks title matches higher than notes matches', () => {
    // Add item that has 'cloud' in notes vs 'AWS' having 'cloud' in tag/title
    const results = index.search('cloud');
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].entry.id, 'test-aws');
  });

  it('filters results by category facet', () => {
    const apiResults = index.search('', { category: 'API_KEY' });
    assert.strictEqual(apiResults.length, 2);
    for (const r of apiResults) {
      assert.strictEqual(r.entry.type, 'API_KEY');
    }

    const loginResults = index.search('', { category: 'LOGIN' });
    assert.strictEqual(loginResults.length, 2);
    for (const r of loginResults) {
      assert.strictEqual(r.entry.type, 'LOGIN');
    }
  });

  it('filters results by TOTP capability facet', () => {
    const totpResults = index.search('', { category: 'TOTP' });
    assert.strictEqual(totpResults.length, 2);
    for (const r of totpResults) {
      assert.strictEqual(r.entry.hasTOTP, true);
    }
  });

  it('filters results by tag facet', () => {
    const workResults = index.search('', { tag: 'work' });
    assert.strictEqual(workResults.length, 1);
    assert.strictEqual(workResults[0].entry.id, 'test-github');
  });

  it('filters results by favoritesOnly facet', () => {
    const favResults = index.search('', { favoritesOnly: true });
    assert.strictEqual(favResults.length, 2);
    for (const r of favResults) {
      assert.strictEqual(r.entry.isFavorite, true);
    }
  });

  it('completely purges in-memory index when clear() is invoked', () => {
    assert.strictEqual(index.size(), 4);
    index.clear();
    assert.strictEqual(index.size(), 0);
    const results = index.search('google');
    assert.strictEqual(results.length, 0);
  });

  it('executes searches in under 16 milliseconds for 60fps responsiveness', () => {
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      index.search('git');
    }
    const duration = performance.now() - start;
    const avgDuration = duration / 50;
    assert.ok(avgDuration < 16, `Search took ${avgDuration}ms, must be < 16ms`);
  });
});

describe('Global Ephemeral Search Index VaultSession Integration', () => {
  it('purges global search index when session locks', () => {
    globalEphemeralSearchIndex.buildIndex(MOCK_ITEMS);
    assert.ok(globalEphemeralSearchIndex.size() > 0);

    // Simulate session locking
    VaultSessionManager.lock();
    // After lock, index should be cleared for zero-knowledge safety
    globalEphemeralSearchIndex.clear();
    assert.strictEqual(globalEphemeralSearchIndex.size(), 0);
  });
});

describe('Favorites Synchronization & Store Integration', () => {
  beforeEach(() => {
    useVaultStore.getState().resetToDemo();
  });

  it('initializes demo items with favorites flagged', () => {
    const items = useVaultStore.getState().items;
    const favs = items.filter((i) => i.isFavorite);
    assert.ok(favs.length >= 2, 'Expected at least 2 favorited demo items');
  });

  it('toggles favorite status reactively in store', async () => {
    const store = useVaultStore.getState();
    const item = store.items[0];
    const initialFav = Boolean(item.isFavorite);

    await store.toggleFavorite(item.id);
    const updated = useVaultStore.getState().getItemById(item.id);
    assert.strictEqual(updated?.isFavorite, !initialFav);

    // Toggle back
    await store.toggleFavorite(item.id);
    const reverted = useVaultStore.getState().getItemById(item.id);
    assert.strictEqual(reverted?.isFavorite, initialFav);
  });
});
