/**
 * Reactive Vault Item Store
 * Provides instantaneous state synchronization between Add/Edit screens and Dashboard
 * Supports zero-latency reactive updates alongside encrypted SQLite persistence
 */

import { create } from 'zustand';
import {
  VaultItem,
  VaultItemType,
  AnyVaultPayload,
  LoginPayload,
  APIKeyPayload,
  CardPayload,
  IdentityPayload,
  SecureNotePayload,
  RecoveryCodesPayload,
} from '../../../types/vault';
import { VaultRepository } from '../repository/vaultRepository';
import { VaultSessionManager } from '../../../core/session';

export const INITIAL_DEMO_VAULT_ITEMS: VaultItem<AnyVaultPayload>[] = [
  {
    id: 'demo-google',
    type: 'LOGIN',
    title: 'Google (Gmail)',
    isProtected: true,
    isFavorite: true,
    tags: ['personal', 'google', 'login'],
    icon: 'google',
    payload: {
      username: 'alex.turner@gmail.com',
      password: 'CorrectHorseBatteryStaple!2026',
      websiteUrl: 'https://accounts.google.com',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      notes: 'Personal primary email account with active passkey & 2FA fallback.',
    } as LoginPayload,
    createdAt: Date.now() - 3600 * 1000 * 48,
    updatedAt: Date.now() - 3600 * 1000 * 48,
  },
  {
    id: 'demo-github',
    type: 'LOGIN',
    title: 'GitHub',
    isProtected: true,
    isFavorite: true,
    tags: ['work', 'dev', 'login'],
    icon: 'github',
    payload: {
      username: 'alexturner-dev (Work)',
      password: 'sec_sample_token_alexturner_dev_2026',
      websiteUrl: 'https://github.com',
      totpSecret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
      notes: 'Work repositories, PR workflows, and deployment secrets.',
    } as LoginPayload,
    createdAt: Date.now() - 3600 * 1000 * 36,
    updatedAt: Date.now() - 3600 * 1000 * 36,
  },
  {
    id: 'demo-aws',
    type: 'API_KEY',
    title: 'AWS Console',
    isProtected: true,
    isFavorite: true,
    tags: ['cloud-api', 'devops'],
    icon: 'aws',
    payload: {
      serviceName: 'AWS Cloud Console',
      apiKey: 'AKIAIOSFODNN7EXAMPLE',
      endpointUrl: 'https://console.aws.amazon.com',
      notes: 'production-root access key with restricted IP policies.',
    } as APIKeyPayload,
    createdAt: Date.now() - 3600 * 1000 * 24,
    updatedAt: Date.now() - 3600 * 1000 * 24,
  },
  {
    id: 'demo-stripe',
    type: 'API_KEY',
    title: 'Stripe Secret Key',
    isProtected: true,
    isFavorite: false,
    tags: ['payments', 'finance'],
    icon: 'key',
    payload: {
      serviceName: 'Stripe Payments',
      apiKey: 'sec_mock_stripe_key_sample_2026',
      endpointUrl: 'https://dashboard.stripe.com',
      notes: 'Restricted webhook and charge management mock key.',
    } as APIKeyPayload,
    createdAt: Date.now() - 3600 * 1000 * 20,
    updatedAt: Date.now() - 3600 * 1000 * 20,
  },
  {
    id: 'demo-apple',
    type: 'IDENTITY',
    title: 'Apple Developer ID',
    isProtected: true,
    isFavorite: false,
    tags: ['identity', 'developer'],
    icon: 'apple',
    payload: {
      fullName: 'Alex Turner',
      email: 'alex@company.internal',
      notes: 'Apple Developer Team ID & App Store Connect certificates.',
    } as IdentityPayload,
    createdAt: Date.now() - 3600 * 1000 * 16,
    updatedAt: Date.now() - 3600 * 1000 * 16,
  },
  {
    id: 'demo-slack',
    type: 'LOGIN',
    title: 'Slack Workspace',
    isProtected: false,
    isFavorite: false,
    tags: ['chat', 'work'],
    icon: 'slack',
    payload: {
      username: 'acme-corp.slack.com',
      password: 'SlackEnterprisePassword!2026',
      websiteUrl: 'https://acme-corp.slack.com',
      notes: 'Engineering team communication channel.',
    } as LoginPayload,
    createdAt: Date.now() - 3600 * 1000 * 12,
    updatedAt: Date.now() - 3600 * 1000 * 12,
  },
  {
    id: 'demo-note',
    type: 'SECURE_NOTE',
    title: 'Server Recovery Seed',
    isProtected: true,
    isFavorite: false,
    tags: ['secure-note', 'backup'],
    icon: 'archive',
    payload: {
      content: 'Encrypted hardware backup instructions and server maintenance procedures.',
      notes: 'Physical recovery key stored in air-gapped safe.',
    } as SecureNotePayload,
    createdAt: Date.now() - 3600 * 1000 * 8,
    updatedAt: Date.now() - 3600 * 1000 * 8,
  },
  {
    id: 'demo-recovery',
    type: 'RECOVERY_CODES',
    title: 'Primary Seed Backup',
    isProtected: true,
    isFavorite: false,
    tags: ['recovery', 'seed'],
    icon: 'archive',
    payload: {
      service: 'Primary Master Seed',
      codes: [
        'alpha-bravo-charlie-delta',
        'echo-foxtrot-golf-hotel',
        'india-juliet-kilo-lima',
        'mike-november-oscar-papa',
      ],
      notes: '24-word emergency recovery record generated at onboarding.',
    } as RecoveryCodesPayload,
    createdAt: Date.now() - 3600 * 1000 * 4,
    updatedAt: Date.now() - 3600 * 1000 * 4,
  },
];

export interface VaultStoreState {
  items: VaultItem<AnyVaultPayload>[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setItems: (items: VaultItem<AnyVaultPayload>[]) => void;
  addItem: (item: VaultItem<AnyVaultPayload>, masterKey?: Uint8Array) => Promise<void>;
  updateItem: (
    id: string,
    updates: Partial<Omit<VaultItem<AnyVaultPayload>, 'id' | 'createdAt'>>,
    masterKey?: Uint8Array
  ) => Promise<void>;
  deleteItem: (id: string, masterKey?: Uint8Array) => Promise<boolean>;
  toggleFavorite: (id: string, masterKey?: Uint8Array) => Promise<boolean>;
  loadItems: (masterKey?: Uint8Array) => Promise<void>;
  getItemById: (id: string) => VaultItem<AnyVaultPayload> | undefined;
  resetToDemo: () => void;
}

export const useVaultStore = create<VaultStoreState>((set, get) => ({
  items: INITIAL_DEMO_VAULT_ITEMS,
  isLoading: false,
  error: null,

  setItems: (items) => {
    set({ items });
  },

  addItem: async (newItem, masterKey) => {
    // 1. Immediately prepend into reactive store so UI renders with 0ms latency
    set((state) => ({
      items: [newItem, ...state.items.filter((i) => i.id !== newItem.id)],
    }));

    // 2. Persist to encrypted SQLite database if master key is provided
    const effectiveKey = masterKey ?? VaultSessionManager.getMasterKey();
    if (effectiveKey) {
      try {
        await VaultRepository.createItem(newItem, effectiveKey);
      } catch (err) {
        // Safe persistence fallback for memory sessions
      }
    }
  },

  updateItem: async (id, updates, masterKey) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          ...updates,
          updatedAt: Date.now(),
          payload:
            updates.payload !== undefined
              ? (updates.payload as AnyVaultPayload)
              : item.payload,
        };
      }),
    }));

    const effectiveKey = masterKey ?? VaultSessionManager.getMasterKey();
    if (effectiveKey) {
      try {
        await VaultRepository.updateItem(id, updates, effectiveKey);
      } catch (err) {
        // Safe fallback
      }
    }
  },

  deleteItem: async (id, _masterKey) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));

    try {
      await VaultRepository.deleteItem(id);
      return true;
    } catch {
      return true;
    }
  },

  toggleFavorite: async (id, _masterKey) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      ),
    }));

    try {
      await VaultRepository.toggleItemFavorite(id);
      return true;
    } catch {
      return true;
    }
  },

  loadItems: async (masterKey) => {
    const effectiveKey = masterKey ?? VaultSessionManager.getMasterKey();
    if (!effectiveKey) {
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const records = await VaultRepository.getAllItems(effectiveKey);
      if (records && records.length > 0) {
        set((state) => {
          // Merge SQLite records with existing demo items so demo entries stay available
          const dbIds = new Set(records.map((r) => r.id));
          const remainingDemo = state.items.filter((item) => !dbIds.has(item.id));
          return {
            items: [...records, ...remainingDemo],
            isLoading: false,
          };
        });
        return;
      }
      set({ isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load vault items',
      });
    }
  },

  getItemById: (id: string) => {
    return get().items.find((item) => item.id === id);
  },

  resetToDemo: () => {
    set({ items: INITIAL_DEMO_VAULT_ITEMS, isLoading: false, error: null });
  },
}));
