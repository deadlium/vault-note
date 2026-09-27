/**
 * VaultStore Reactive State & Dashboard Synchronization Tests
 * Validates instant UI reactivity, newly created item appearance,
 * item editing, custom fields preservation, and item deletion.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { useVaultStore, INITIAL_DEMO_VAULT_ITEMS } from '../useVaultStore';
import { VaultItem, LoginPayload, CardPayload } from '../../../../types/vault';

describe('VaultStore Reactive State Machine & Dashboard Visibility', () => {
  beforeEach(() => {
    useVaultStore.getState().resetToDemo();
  });

  it('Initializes with default demo items across all required categories', () => {
    const items = useVaultStore.getState().items;
    assert.strictEqual(items.length >= 8, true);

    const categories = new Set(items.map((i) => i.type));
    assert.strictEqual(categories.has('LOGIN'), true);
    assert.strictEqual(categories.has('API_KEY'), true);
    assert.strictEqual(categories.has('IDENTITY'), true);
    assert.strictEqual(categories.has('SECURE_NOTE'), true);
    assert.strictEqual(categories.has('RECOVERY_CODES'), true);
  });

  it('Instantly prepends newly created item to the top of the vault dashboard', async () => {
    const newItem: VaultItem<LoginPayload> = {
      id: 'custom_item_netflix',
      type: 'LOGIN',
      title: 'Netflix Personal',
      isProtected: true,
      isFavorite: false,
      tags: ['entertainment', 'streaming'],
      icon: 'netflix',
      payload: {
        username: 'user@example.com',
        password: 'UltraSecretPassword2026!',
        websiteUrl: 'https://netflix.com',
        customFields: [
          {
            id: 'cf_pin_1',
            label: 'Profile PIN',
            value: '4829',
            type: 'password',
            isSecret: true,
          },
        ],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await useVaultStore.getState().addItem(newItem);

    const currentItems = useVaultStore.getState().items;
    // Newly created item MUST be at index 0 (top of dashboard)
    assert.strictEqual(currentItems[0].id, 'custom_item_netflix');
    assert.strictEqual(currentItems[0].title, 'Netflix Personal');
    assert.strictEqual((currentItems[0].payload as LoginPayload).username, 'user@example.com');
  });

  it('Retrieves newly created item by ID with full custom fields preserved', async () => {
    const customId = 'item_custom_spotify';
    const spotifyItem: VaultItem<LoginPayload> = {
      id: customId,
      type: 'LOGIN',
      title: 'Spotify Family',
      isProtected: false,
      isFavorite: true,
      tags: ['music'],
      icon: 'spotify',
      payload: {
        username: 'family-admin@domain.com',
        password: 'MusicStreamingPassword99!',
        websiteUrl: 'https://spotify.com',
        customFields: [
          {
            id: 'cf_plan',
            label: 'Plan Type',
            value: 'Family 6-Account Tier',
            type: 'text',
          },
          {
            id: 'cf_admin_pin',
            label: 'Master PIN',
            value: '9921',
            type: 'password',
            isSecret: true,
          },
        ],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await useVaultStore.getState().addItem(spotifyItem);

    const retrieved = useVaultStore.getState().getItemById(customId);
    assert.notStrictEqual(retrieved, undefined);
    assert.strictEqual(retrieved!.id, customId);
    assert.strictEqual(retrieved!.title, 'Spotify Family');
    assert.strictEqual(retrieved!.isFavorite, true);

    const customFields = (retrieved!.payload as LoginPayload).customFields;
    assert.strictEqual(Array.isArray(customFields), true);
    assert.strictEqual(customFields!.length, 2);
    assert.strictEqual(customFields![0].label, 'Plan Type');
    assert.strictEqual(customFields![1].value, '9921');
  });

  it('Updates existing vault item and reflects modifications immediately', async () => {
    const cardId = 'item_custom_visa';
    const visaItem: VaultItem<CardPayload> = {
      id: cardId,
      type: 'CARD',
      title: 'Titanium Debit Card',
      isProtected: true,
      isFavorite: false,
      tags: ['banking'],
      icon: 'card',
      payload: {
        cardholderName: 'Alex Turner',
        cardNumber: '4111 2222 3333 4444',
        expirationMonth: '05',
        expirationYear: '2028',
        cvv: '123',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await useVaultStore.getState().addItem(visaItem);

    // Update title and cardholder name
    await useVaultStore.getState().updateItem(cardId, {
      title: 'Titanium Debit Card (Updated)',
      payload: {
        ...visaItem.payload,
        cardholderName: 'Alexander Turner',
      },
    });

    const updated = useVaultStore.getState().getItemById(cardId);
    assert.strictEqual(updated!.title, 'Titanium Debit Card (Updated)');
    assert.strictEqual((updated!.payload as CardPayload).cardholderName, 'Alexander Turner');
  });

  it('Toggles favorite status reactively', async () => {
    const targetId = 'demo-google';
    const initialFavorite = useVaultStore.getState().getItemById(targetId)!.isFavorite;

    await useVaultStore.getState().toggleFavorite(targetId);
    const toggled = useVaultStore.getState().getItemById(targetId);
    assert.strictEqual(toggled!.isFavorite, !initialFavorite);

    await useVaultStore.getState().toggleFavorite(targetId);
    const toggledBack = useVaultStore.getState().getItemById(targetId);
    assert.strictEqual(toggledBack!.isFavorite, initialFavorite);
  });

  it('Deletes vault item permanently from active dashboard list', async () => {
    const tempId = 'temp_item_to_delete';
    const tempItem: VaultItem<LoginPayload> = {
      id: tempId,
      type: 'LOGIN',
      title: 'Temporary Service',
      isProtected: false,
      isFavorite: false,
      tags: [],
      payload: {
        username: 'temp',
        password: 'pwd',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await useVaultStore.getState().addItem(tempItem);
    assert.strictEqual(useVaultStore.getState().getItemById(tempId) !== undefined, true);

    await useVaultStore.getState().deleteItem(tempId);
    assert.strictEqual(useVaultStore.getState().getItemById(tempId), undefined);
    assert.strictEqual(
      useVaultStore.getState().items.some((i) => i.id === tempId),
      false
    );
  });
});
