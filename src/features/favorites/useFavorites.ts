/**
 * useFavorites Hook
 * Starred and pinned vault item synchronization and hub management.
 * Provides instant optimistic updates and encrypted SQLite persistence.
 */

import { useMemo, useCallback } from 'react';
import { useVaultStore } from '../vault/store/useVaultStore';
import { VaultItem, VaultItemType, AnyVaultPayload } from '../../types/vault';

export interface UseFavoritesResult {
  favoriteItems: VaultItem<AnyVaultPayload>[];
  favoriteCount: number;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<boolean>;
  getFavoritesByCategory: (category: VaultItemType | 'all' | 'TOTP') => VaultItem<AnyVaultPayload>[];
}

export function useFavorites(): UseFavoritesResult {
  const items = useVaultStore((state) => state.items);
  const toggleStoreFavorite = useVaultStore((state) => state.toggleFavorite);

  // Filter items marked as favorite, sorted by updated time descending
  const favoriteItems = useMemo(() => {
    return items
      .filter((item) => Boolean(item.isFavorite))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items]);

  const favoriteCount = favoriteItems.length;

  const isFavorite = useCallback(
    (id: string) => {
      const match = items.find((item) => item.id === id);
      return Boolean(match?.isFavorite);
    },
    [items]
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      return await toggleStoreFavorite(id);
    },
    [toggleStoreFavorite]
  );

  const getFavoritesByCategory = useCallback(
    (category: VaultItemType | 'all' | 'TOTP') => {
      if (category === 'all') {
        return favoriteItems;
      }
      if (category === 'TOTP') {
        return favoriteItems.filter((item) => {
          const payload = item.payload as unknown as Record<string, unknown>;
          return Boolean(payload?.totpSecret);
        });
      }
      return favoriteItems.filter((item) => item.type === category);
    },
    [favoriteItems]
  );

  return {
    favoriteItems,
    favoriteCount,
    isFavorite,
    toggleFavorite,
    getFavoritesByCategory,
  };
}
