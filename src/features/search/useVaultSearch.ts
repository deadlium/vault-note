/**
 * useVaultSearch Hook
 * Real-time reactive search hook powered by Ephemeral RAM Search Index.
 * Guarantees zero disk persistence and wipes search cache on session lock.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useVaultStore } from '../vault/store/useVaultStore';
import { useSessionStore } from '../../core/session';
import {
  globalEphemeralSearchIndex,
  SearchResult,
  SearchOptions,
} from './searchIndex';
import { VaultItemType } from '../../types/vault';

export interface UseVaultSearchOptions {
  initialCategory?: VaultItemType | 'all' | 'TOTP';
  initialTag?: string | null;
  favoritesOnly?: boolean;
}

export interface UseVaultSearchResult {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: VaultItemType | 'all' | 'TOTP';
  setActiveCategory: (cat: VaultItemType | 'all' | 'TOTP') => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  results: SearchResult[];
  totalMatches: number;
  categoryCounts: Record<string, number>;
  availableTags: { tag: string; count: number }[];
  isSearching: boolean;
  clearSearch: () => void;
}

export function useVaultSearch(options: UseVaultSearchOptions = {}): UseVaultSearchResult {
  const items = useVaultStore((state) => state.items);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<VaultItemType | 'all' | 'TOTP'>(
    options.initialCategory || 'all'
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    options.initialTag || null
  );

  // Synchronously ensure ephemeral RAM search index is updated before searching
  useMemo(() => {
    globalEphemeralSearchIndex.buildIndex(items);
  }, [items]);

  // Subscribe to useSessionStore to purge RAM index instantly on lock
  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe((state) => {
      if (state.status !== 'UNLOCKED') {
        globalEphemeralSearchIndex.clear();
      } else {
        globalEphemeralSearchIndex.buildIndex(useVaultStore.getState().items);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Compute available tags with occurrence count
  const availableTags = useMemo(() => {
    const tagCountMap: Record<string, number> = {};
    for (const item of items) {
      if (Array.isArray(item.tags)) {
        for (const t of item.tags) {
          const normalized = t.toLowerCase().trim();
          if (normalized) {
            tagCountMap[normalized] = (tagCountMap[normalized] || 0) + 1;
          }
        }
      }
    }

    return Object.entries(tagCountMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  // Perform search query execution in volatile RAM
  const results = useMemo(() => {
    const searchOptions: SearchOptions = {
      category: activeCategory,
      tag: selectedTag || undefined,
      favoritesOnly: options.favoritesOnly,
      limit: 100,
    };

    return globalEphemeralSearchIndex.search(searchQuery, searchOptions);
  }, [searchQuery, activeCategory, selectedTag, options.favoritesOnly, items]);

  // Compute category facet counts reflecting the current search query
  const categoryCounts = useMemo(() => {
    // Search with category='all' to get universe of matches for current query
    const allMatches = globalEphemeralSearchIndex.search(searchQuery, {
      category: 'all',
      tag: selectedTag || undefined,
      favoritesOnly: options.favoritesOnly,
      limit: 1000,
    });

    const counts: Record<string, number> = {
      all: allMatches.length,
      LOGIN: 0,
      SECURE_NOTE: 0,
      CARD: 0,
      TOTP: 0,
      API_KEY: 0,
      IDENTITY: 0,
      RECOVERY_CODES: 0,
    };

    for (const match of allMatches) {
      const type = match.entry.type;
      if (counts[type] !== undefined) {
        counts[type] += 1;
      }
      if (match.entry.hasTOTP) {
        counts.TOTP = (counts.TOTP || 0) + 1;
      }
    }

    return counts;
  }, [searchQuery, selectedTag, options.favoritesOnly, items]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedTag(null);
  }, []);

  const isSearching = searchQuery.trim().length > 0 || selectedTag !== null;

  return {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    selectedTag,
    setSelectedTag,
    results,
    totalMatches: results.length,
    categoryCounts,
    availableTags,
    isSearching,
    clearSearch,
  };
}
