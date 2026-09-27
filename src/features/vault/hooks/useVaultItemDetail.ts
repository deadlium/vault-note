/**
 * useVaultItemDetail Hook
 * Manages item retrieval, decryption, favorite toggles, and item deletion
 */

import { useState, useEffect, useCallback } from 'react';
import { VaultItem, AnyVaultPayload } from '../../../types/vault';
import { VaultRepository } from '../repository/vaultRepository';
import { useVaultStore } from '../store/useVaultStore';
import { VaultSessionManager } from '../../../core/session';

export function useVaultItemDetail(itemId?: string) {
  const storeItem = useVaultStore((s) => (itemId ? s.getItemById(itemId) : undefined));
  const [item, setItem] = useState<VaultItem<AnyVaultPayload> | null>(storeItem ?? null);
  const [isLoading, setIsLoading] = useState(Boolean(itemId && !storeItem));
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!itemId) {
      setItem(null);
      setIsLoading(false);
      return;
    }

    // 1. Check store first for instantaneous 0ms response
    const existingInStore = useVaultStore.getState().getItemById(itemId);
    if (existingInStore) {
      setItem(existingInStore);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const masterKey = VaultSessionManager.getMasterKey();

      if (masterKey) {
        const found = await VaultRepository.getItemById(itemId, masterKey);
        if (found) {
          setItem(found);
          setIsLoading(false);
          return;
        }
      }

      setItem(null);
      setError('Vault item not found');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decrypt vault item');
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (storeItem) {
      setItem(storeItem);
      setIsLoading(false);
    } else {
      loadItem();
    }
  }, [itemId, storeItem, loadItem]);

  const toggleFavorite = useCallback(async (): Promise<boolean> => {
    if (!item) return false;

    const newFavoriteState = !item.isFavorite;
    setItem((prev) => (prev ? { ...prev, isFavorite: newFavoriteState } : null));

    await useVaultStore.getState().toggleFavorite(item.id);
    return true;
  }, [item]);

  const deleteItem = useCallback(async (): Promise<boolean> => {
    if (!item) return false;

    await useVaultStore.getState().deleteItem(item.id);
    return true;
  }, [item]);

  return {
    item,
    isLoading,
    error,
    toggleFavorite,
    deleteItem,
    refresh: loadItem,
  };
}
