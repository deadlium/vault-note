/**
 * Vault Home Screen Dashboard
 * Fast category filtering, item cards, service brand icons, and floating action button
 * Designed with Obsidian aesthetic inspired by Apple Notes and Linear
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { CategoryChipBar } from '../../components/category/CategoryChipBar';
import { VaultItemRow, VaultItemRowData } from '../../components/item/VaultItemRow';
import { EmptyState } from '../../components/common/EmptyState';
import { VaultSessionManager } from '../../core/session';
import { VaultRepository } from '../../features/vault/repository/vaultRepository';
import { useVaultStore } from '../../features/vault/store/useVaultStore';
import { VaultItemType } from '../../types/vault';

export interface VaultHomeDashboardProps {
  onLock?: () => void;
  onSelectItem?: (item: VaultItemRowData) => void;
  onAddItem?: () => void;
  refreshTrigger?: number;
}

export default function VaultHomeScreen({
  onLock,
  onSelectItem,
  onAddItem,
  refreshTrigger,
}: VaultHomeDashboardProps) {
  const rawVaultItems = useVaultStore((state) => state.items);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Map raw vault items to presentation row data with instant reactivity
  const items: VaultItemRowData[] = useMemo(() => {
    return rawVaultItems.map((record) => {
      const payload = record.payload as unknown as Record<string, unknown>;
      const username =
        (payload?.username as string) ||
        (payload?.accountNumber as string) ||
        (payload?.email as string) ||
        (payload?.cardholderName as string) ||
        (payload?.serviceName as string) ||
        (payload?.fullName as string) ||
        '';

      const websiteUrl =
        (payload?.websiteUrl as string) || (payload?.endpointUrl as string) || '';

      return {
        id: record.id,
        title: record.title,
        subtitle: username || websiteUrl || record.type,
        category: record.type,
        tag: record.tags?.[0] ? `#${record.tags[0]}` : record.type,
        iconType:
          ((record as unknown as Record<string, unknown>).icon as string) ||
          ((payload?.icon as string) || undefined),
        isFavorite: record.isFavorite ?? false,
        isProtected: record.isProtected ?? true,
        hasTOTP: Boolean(payload?.totpSecret),
        totpLabel: payload?.totpSecret ? 'TOTP Active' : undefined,
      };
    });
  }, [rawVaultItems]);

  // Load items from encrypted SQLite database if unlocked with master key
  const loadVaultItems = useCallback(async () => {
    try {
      const masterKey = VaultSessionManager.getMasterKey();
      await useVaultStore.getState().loadItems(masterKey ?? undefined);
    } catch {
      // In-memory or demo fallback
    }
  }, []);

  useEffect(() => {
    loadVaultItems();
  }, [loadVaultItems, refreshTrigger]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadVaultItems();
    setIsRefreshing(false);
  }, [loadVaultItems]);

  // Handle favorite star toggle
  const handleToggleFavorite = useCallback(async (id: string) => {
    await useVaultStore.getState().toggleFavorite(id);
  }, []);

  // Compute item counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: items.length,
      LOGIN: 0,
      SECURE_NOTE: 0,
      CARD: 0,
      TOTP: 0,
      API_KEY: 0,
      IDENTITY: 0,
      RECOVERY_CODES: 0,
    };

    items.forEach((item) => {
      const cat = item.category as string;
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
      if (item.hasTOTP) {
        counts.TOTP = (counts.TOTP || 0) + 1;
      }
    });

    return counts;
  }, [items]);

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'TOTP') {
          if (!item.hasTOTP) return false;
        } else if (item.category !== activeCategory) {
          return false;
        }
      }

      // Search filter
      if (query.length > 0) {
        const titleMatch = item.title.toLowerCase().includes(query);
        const subtitleMatch = (item.subtitle || '').toLowerCase().includes(query);
        const tagMatch = (item.tag || '').toLowerCase().includes(query);
        if (!titleMatch && !subtitleMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeCategory, searchQuery]);

  // Partition favorites when on 'all' tab without search query
  const { favoriteItems, otherItems } = useMemo(() => {
    if (activeCategory !== 'all' || searchQuery.trim().length > 0) {
      return { favoriteItems: [], otherItems: filteredItems };
    }
    const favs = filteredItems.filter((i) => i.isFavorite);
    const others = filteredItems.filter((i) => !i.isFavorite);
    return { favoriteItems: favs, otherItems: others };
  }, [filteredItems, activeCategory, searchQuery]);

  const handleLockPress = () => {
    if (onLock) {
      onLock();
    } else {
      VaultSessionManager.lock();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandPill}>
            <Ionicons name="lock-closed" size={13} color={colors.primaryLight} />
            <Text style={styles.brandPillText}>VAULTNOTE</Text>
          </View>

          <View style={styles.enclaveStatusBadge}>
            <View style={styles.pulsingDot} />
            <Text style={styles.enclaveStatusText}>Enclave Protected</Text>
          </View>
        </View>

        <Pressable
          onPress={handleLockPress}
          style={({ pressed }) => [
            styles.lockButton,
            pressed && styles.lockButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Lock Vault"
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Instant Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search credentials, notes, keys..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Chip Selector Bar */}
      <View style={styles.categoryBarContainer}>
        <CategoryChipBar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          counts={categoryCounts}
        />
      </View>

      {/* Items Scrollable List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
            colors={[colors.primary]}
          />
        }
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={searchQuery.length > 0 ? 'search-outline' : 'folder-open-outline'}
            title={searchQuery.length > 0 ? 'No Matching Items' : 'No Items in Category'}
            description={
              searchQuery.length > 0
                ? `No credentials found matching "${searchQuery}". Try a different term or clear the filter.`
                : 'This category does not have any credentials stored yet. Tap the button below to add your first item.'
            }
            actionLabel={searchQuery.length > 0 ? 'Clear Filter' : 'Add Item'}
            onActionPress={() => {
              if (searchQuery.length > 0) {
                setSearchQuery('');
                setActiveCategory('all');
              } else if (onAddItem) {
                onAddItem();
              }
            }}
          />
        ) : (
          <>
            {/* Favorites Section (when applicable) */}
            {favoriteItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={styles.sectionTitle}>FAVORITES</Text>
                  <Text style={styles.sectionCount}>{favoriteItems.length}</Text>
                </View>

                <View style={styles.itemsList}>
                  {favoriteItems.map((item) => (
                    <VaultItemRow
                      key={item.id}
                      item={item}
                      onPress={() => onSelectItem?.(item)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* All / Category Items Section */}
            <View style={styles.section}>
              {favoriteItems.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.sectionTitle}>ALL ITEMS</Text>
                  <Text style={styles.sectionCount}>{otherItems.length}</Text>
                </View>
              )}

              <View style={styles.itemsList}>
                {(favoriteItems.length > 0 ? otherItems : filteredItems).map((item) => (
                  <VaultItemRow
                    key={item.id}
                    item={item}
                    onPress={() => onSelectItem?.(item)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        onPress={() => onAddItem?.()}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add New Vault Item"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.28)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  brandPillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 1.2,
  },
  enclaveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  enclaveStatusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.emerald,
  },
  lockButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceActive,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body2,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  categoryBarContainer: {
    paddingVertical: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
  },
  sectionCount: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  itemsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
