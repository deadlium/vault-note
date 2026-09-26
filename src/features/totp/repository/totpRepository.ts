/**
 * TOTP Repository
 * Encrypted repository integrating authenticator secrets with VaultNote zero-knowledge storage.
 * Ensures TOTP configurations are persisted exclusively inside authenticated AES-256-GCM encrypted envelopes.
 */

import { VaultRepository } from '../../vault/repository/vaultRepository';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultSessionManager } from '../../../core/session';
import { VaultItem, LoginPayload, TOTPPayload, AnyVaultPayload } from '../../../types/vault';
import { TOTPRecord, TOTPUpdateInput, TOTPAlgorithm } from '../types';
import { DatabaseClient } from '../../../core/database/types';

export class TOTPRepository {
  /**
   * Converts a Login VaultItem with TOTP configured into a standardized TOTPRecord
   */
  static toRecordFromLogin(item: VaultItem<AnyVaultPayload>): TOTPRecord | null {
    if (item.type !== 'LOGIN') return null;
    const payload = item.payload as LoginPayload;
    const secret = payload.totpConfig?.secret || payload.totpSecret;
    if (!secret || secret.trim().length === 0) return null;

    return {
      id: `totp-${item.id}`,
      credentialId: item.id,
      issuer: payload.totpConfig?.issuer || item.title || 'Authenticator',
      account: payload.totpConfig?.account || payload.username || '',
      secret: secret.trim(),
      algorithm: (payload.totpConfig?.algorithm as TOTPAlgorithm) || 'SHA1',
      digits: payload.totpConfig?.digits || 6,
      period: payload.totpConfig?.period || 30,
      createdAt: new Date(item.createdAt).toISOString(),
      updatedAt: new Date(item.updatedAt).toISOString(),
    };
  }

  /**
   * Converts a standalone TOTP VaultItem into a standardized TOTPRecord
   */
  static toRecordFromTOTP(item: VaultItem<AnyVaultPayload>): TOTPRecord | null {
    if (item.type !== 'TOTP') return null;
    const payload = item.payload as TOTPPayload;
    if (!payload.secret || payload.secret.trim().length === 0) return null;

    return {
      id: item.id,
      credentialId: undefined,
      issuer: payload.issuer || item.title || 'Authenticator',
      account: payload.accountName || '',
      secret: payload.secret.trim(),
      algorithm: (payload.algorithm as TOTPAlgorithm) || 'SHA1',
      digits: (payload.digits as number) || 6,
      period: payload.period || 30,
      createdAt: new Date(item.createdAt).toISOString(),
      updatedAt: new Date(item.updatedAt).toISOString(),
    };
  }

  /**
   * Retrieves a TOTPRecord by its ID (either standalone item id or credential linked id)
   */
  static async get(
    id: string,
    masterKey?: Uint8Array,
    client?: DatabaseClient
  ): Promise<TOTPRecord | null> {
    const rawId = id.startsWith('totp-') ? id.replace('totp-', '') : id;
    const effectiveKey = masterKey ?? (VaultSessionManager.getMasterKey() ?? undefined);

    // 1. Check in-memory store for instant zero-latency resolution
    const inMemoryItem = useVaultStore.getState().getItemById(rawId);
    if (inMemoryItem) {
      const record =
        inMemoryItem.type === 'LOGIN'
          ? this.toRecordFromLogin(inMemoryItem)
          : this.toRecordFromTOTP(inMemoryItem);
      if (record) return record;
    }

    // 2. Query encrypted SQLite repository if master key is available
    if (effectiveKey) {
      try {
        const item = await VaultRepository.getItemById(rawId, effectiveKey, client);
        if (item) {
          return item.type === 'LOGIN'
            ? this.toRecordFromLogin(item)
            : this.toRecordFromTOTP(item);
        }
      } catch {
        // Fallback to null if not found
      }
    }

    return null;
  }

  /**
   * Retrieves the TOTP configuration attached to a specific credential item
   */
  static async getByCredentialId(
    credentialId: string,
    masterKey?: Uint8Array,
    client?: DatabaseClient
  ): Promise<TOTPRecord | null> {
    return this.get(credentialId, masterKey, client);
  }

  /**
   * Lists all TOTP records across the vault (both credential-linked and standalone authenticators)
   */
  static async listAll(
    masterKey?: Uint8Array,
    client?: DatabaseClient
  ): Promise<TOTPRecord[]> {
    const effectiveKey = masterKey ?? (VaultSessionManager.getMasterKey() ?? undefined);
    let items: VaultItem<AnyVaultPayload>[] = [];

    if (effectiveKey) {
      try {
        items = await VaultRepository.getAllItems(effectiveKey, client);
      } catch {
        items = useVaultStore.getState().items;
      }
    } else {
      items = useVaultStore.getState().items;
    }

    const records: TOTPRecord[] = [];
    for (const item of items) {
      if (item.type === 'LOGIN') {
        const rec = this.toRecordFromLogin(item);
        if (rec) records.push(rec);
      } else if (item.type === 'TOTP') {
        const rec = this.toRecordFromTOTP(item);
        if (rec) records.push(rec);
      }
    }

    return records;
  }

  /**
   * Attaches or updates a TOTP configuration on an existing login credential
   */
  static async attachToCredential(
    credentialId: string,
    config: {
      issuer: string;
      account: string;
      secret: string;
      algorithm?: TOTPAlgorithm;
      digits?: number;
      period?: number;
    },
    masterKey?: Uint8Array,
    client?: DatabaseClient
  ): Promise<TOTPRecord> {
    const effectiveKey = masterKey ?? (VaultSessionManager.getMasterKey() ?? undefined);
    const cleanSecret = config.secret.replace(/\s/g, '').toUpperCase();
    const algorithm: TOTPAlgorithm = config.algorithm || 'SHA1';
    const digits = config.digits || 6;
    const period = config.period || 30;

    let targetItem = useVaultStore.getState().getItemById(credentialId);

    if (!targetItem && effectiveKey) {
      targetItem = await VaultRepository.getItemById(credentialId, effectiveKey, client) || undefined;
    }

    if (!targetItem) {
      throw new Error(`Credential with id "${credentialId}" not found in vault`);
    }

    const updatedPayload: LoginPayload = {
      ...(targetItem.payload as LoginPayload),
      totpSecret: cleanSecret,
      totpConfig: {
        issuer: config.issuer,
        account: config.account,
        secret: cleanSecret,
        algorithm,
        digits: digits as 6 | 8,
        period,
      },
    };

    // Update reactive state and persist encrypted ciphertext
    await useVaultStore.getState().updateItem(
      credentialId,
      { payload: updatedPayload },
      effectiveKey
    );

    return {
      id: `totp-${credentialId}`,
      credentialId,
      issuer: config.issuer,
      account: config.account,
      secret: cleanSecret,
      algorithm,
      digits,
      period,
      createdAt: new Date(targetItem.createdAt).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Detaches and permanently purges TOTP configuration from a credential
   */
  static async detachFromCredential(
    credentialId: string,
    masterKey?: Uint8Array
  ): Promise<boolean> {
    const effectiveKey = masterKey ?? (VaultSessionManager.getMasterKey() ?? undefined);
    const targetItem = useVaultStore.getState().getItemById(credentialId);

    if (!targetItem) return false;

    const currentPayload = targetItem.payload as LoginPayload;
    const { totpSecret, totpConfig, ...remainingPayload } = currentPayload;

    await useVaultStore.getState().updateItem(
      credentialId,
      { payload: remainingPayload as LoginPayload },
      effectiveKey
    );

    return true;
  }

  /**
   * Persists a standalone TOTP authenticator item into the encrypted vault
   */
  static async saveStandalone(
    record: Omit<TOTPRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    masterKey?: Uint8Array
  ): Promise<TOTPRecord> {
    const effectiveKey = masterKey ?? (VaultSessionManager.getMasterKey() ?? undefined);
    const cleanSecret = record.secret.replace(/\s/g, '').toUpperCase();
    const now = Date.now();
    const id = record.id || `totp-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const standaloneItem: VaultItem<TOTPPayload> = {
      id,
      type: 'TOTP',
      title: record.issuer,
      isProtected: true,
      isFavorite: false,
      tags: ['totp', '2fa', record.issuer.toLowerCase()],
      payload: {
        issuer: record.issuer,
        accountName: record.account,
        secret: cleanSecret,
        algorithm: record.algorithm,
        digits: record.digits as 6 | 8,
        period: record.period,
      },
      createdAt: now,
      updatedAt: now,
    };

    await useVaultStore.getState().addItem(standaloneItem, effectiveKey);

    return {
      id,
      credentialId: undefined,
      issuer: record.issuer,
      account: record.account,
      secret: cleanSecret,
      algorithm: record.algorithm,
      digits: record.digits,
      period: record.period,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
  }

  /**
   * Updates an existing TOTP record configuration
   */
  static async update(
    id: string,
    updates: TOTPUpdateInput,
    masterKey?: Uint8Array
  ): Promise<TOTPRecord> {
    const effectiveKey = masterKey ?? (VaultSessionManager.getMasterKey() ?? undefined);
    const rawId = id.startsWith('totp-') ? id.replace('totp-', '') : id;
    const targetItem = useVaultStore.getState().getItemById(rawId);

    if (!targetItem) {
      throw new Error(`TOTP item with id "${id}" not found`);
    }

    if (targetItem.type === 'LOGIN') {
      const payload = targetItem.payload as LoginPayload;
      const currentConfig = payload.totpConfig;
      const cleanSecret = updates.secret
        ? updates.secret.replace(/\s/g, '').toUpperCase()
        : currentConfig?.secret || payload.totpSecret || '';

      const updatedPayload: LoginPayload = {
        ...payload,
        totpSecret: cleanSecret,
        totpConfig: {
          issuer: updates.issuer ?? currentConfig?.issuer ?? targetItem.title,
          account: updates.account ?? currentConfig?.account ?? payload.username ?? '',
          secret: cleanSecret,
          algorithm: updates.algorithm ?? (currentConfig?.algorithm as TOTPAlgorithm) ?? 'SHA1',
          digits: (updates.digits ?? currentConfig?.digits ?? 6) as 6 | 8,
          period: updates.period ?? currentConfig?.period ?? 30,
        },
      };

      await useVaultStore.getState().updateItem(
        rawId,
        {
          title: updates.issuer ?? targetItem.title,
          payload: updatedPayload,
        },
        effectiveKey
      );

      return {
        id,
        credentialId: rawId,
        issuer: updatedPayload.totpConfig!.issuer!,
        account: updatedPayload.totpConfig!.account!,
        secret: updatedPayload.totpConfig!.secret,
        algorithm: updatedPayload.totpConfig!.algorithm as TOTPAlgorithm,
        digits: updatedPayload.totpConfig!.digits as number,
        period: updatedPayload.totpConfig!.period as number,
        createdAt: new Date(targetItem.createdAt).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      const payload = targetItem.payload as TOTPPayload;
      const cleanSecret = updates.secret
        ? updates.secret.replace(/\s/g, '').toUpperCase()
        : payload.secret;

      const updatedPayload: TOTPPayload = {
        ...payload,
        issuer: updates.issuer ?? payload.issuer,
        accountName: updates.account ?? payload.accountName,
        secret: cleanSecret,
        algorithm: updates.algorithm ?? payload.algorithm,
        digits: (updates.digits ?? payload.digits ?? 6) as 6 | 8,
        period: updates.period ?? payload.period ?? 30,
      };

      await useVaultStore.getState().updateItem(
        rawId,
        {
          title: updates.issuer ?? targetItem.title,
          payload: updatedPayload,
        },
        effectiveKey
      );

      return {
        id,
        credentialId: undefined,
        issuer: updatedPayload.issuer,
        account: updatedPayload.accountName,
        secret: updatedPayload.secret,
        algorithm: (updatedPayload.algorithm as TOTPAlgorithm) || 'SHA1',
        digits: (updatedPayload.digits as number) || 6,
        period: updatedPayload.period || 30,
        createdAt: new Date(targetItem.createdAt).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Deletes a standalone TOTP item or detaches it from a linked credential
   */
  static async delete(id: string, masterKey?: Uint8Array): Promise<boolean> {
    const rawId = id.startsWith('totp-') ? id.replace('totp-', '') : id;
    const store = useVaultStore.getState();
    const item = store.getItemById(id) || store.getItemById(rawId);

    if (item && item.type === 'LOGIN') {
      return this.detachFromCredential(item.id, masterKey);
    }

    if (item && item.type === 'TOTP') {
      await store.deleteItem(item.id, masterKey);
      return true;
    }

    return store.deleteItem(id, masterKey);
  }
}
