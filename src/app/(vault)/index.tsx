/**
 * Vault Home Screen Dashboard
 * High-craft Obsidian aesthetic inspired by Apple Notes, Linear, and 1Password.
 * Features biometric security brand header, live ephemeral RAM search,
 * category selector with iconography, and rich credentials cards.
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
import { useVaultStore } from '../../features/vault/store/useVaultStore';
import { VaultItemType } from '../../types/vault';
import { useNavbarScroll } from '../../components/navigation/NavbarScrollContext';
import { useVaultSearch } from '../../features/search';
import { useFavorites } from '../../features/favorites';

export interface VaultHomeDashboardProps {
  onLock?: () => void;
  onSelectItem?: (item: VaultItemRowData) => void;
  onAddItem?: () => void;
  onOpenSearch?: () => void;
  onOpenFavorites?: () => void;
  refreshTrigger?: number;
}

export default function VaultHomeScreen({
  onLock,
  onSelectItem,
  onAddItem,
  onOpenSearch,
  onOpenFavorites,
  refreshTrigger,
}: VaultHomeDashboardProps) {
  const scrollContext = useNavbarScroll();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allVaultItems = useVaultStore((state) => state.items);

  // Connect to Ephemeral RAM Search Index
  const {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    results: searchResults,
    categoryCounts,
    isSearching,
    clearSearch,
  } = useVaultSearch();

  // Connect to Favorites synchronization hook
  const { toggleFavorite, favoriteCount } = useFavorites();

  // Calculate items with TOTP enabled
  const totpCount = useMemo(() => {
    return allVaultItems.filter((i) => {
      const payload = i.payload as unknown as Record<string, unknown>;
      return Boolean(payload?.totpSecret);
    }).length;
  }, [allVaultItems]);

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
  const handleToggleFavorite = useCallback(
    async (id: string) => {
      await toggleFavorite(id);
    },
    [toggleFavorite]
  );

  // Map search results or filtered store items to presentation rows
  const filteredItems: VaultItemRowData[] = useMemo(() => {
    return searchResults.map(({ entry }) => ({
      id: entry.id,
      title: entry.title,
      subtitle: entry.subtitle,
      category: entry.type,
      tag: entry.tags?.[0] ? `#${entry.tags[0]}` : entry.type,
      iconType: entry.icon,
      isFavorite: entry.isFavorite,
      isProtected: entry.isProtected,
      hasTOTP: entry.hasTOTP,
      totpLabel: entry.totpLabel,
    }));
  }, [searchResults]);

  // Partition favorites when on 'all' tab without active search query
  const { favoriteItems, otherItems } = useMemo(() => {
    if (activeCategory !== 'all' || isSearching) {
      return { favoriteItems: [], otherItems: filteredItems };
    }
    const favs = filteredItems.filter((i) => i.isFavorite);
    const others = filteredItems.filter((i) => !i.isFavorite);
    return { favoriteItems: favs, otherItems: others };
  }, [filteredItems, activeCategory, isSearching]);

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
        <View style={styles.brandGroup}>
          <View style={styles.brandIconWrapper}>
            <Ionicons name="shield-checkmark" size={19} color="#A78BFA" />
          </View>
          <View style={styles.brandTextGroup}>
            <Text style={styles.brandTitle}>VaultNote</Text>
            <View style={styles.statusRow}>
              <View style={styles.pulsingDot} />
              <Text style={styles.statusText}>Hardware Protected</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {/* Quick Favorites Star Button with Badge */}
          {favoriteCount > 0 && onOpenFavorites && (
            <Pressable
              onPress={onOpenFavorites}
              style={({ pressed }) => [
                styles.headerActionButton,
                styles.starActionButton,
                pressed && styles.headerActionButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Favorites Hub"
            >
              <Ionicons name="star" size={15} color="#FBBF24" />
              <Text style={styles.starBadgeText}>{favoriteCount}</Text>
            </Pressable>
          )}

          {/* Lock Vault Button */}
          <Pressable
            onPress={handleLockPress}
            style={({ pressed }) => [
              styles.headerActionButton,
              pressed && styles.headerActionButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Lock Vault"
          >
            <Ionicons name="lock-closed-outline" size={17} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Instant Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Pressable
            onPress={onOpenSearch}
            accessibilityRole="button"
            accessibilityLabel="Expand search"
          >
            <Ionicons
              name="search"
              size={18}
              color={isSearching ? colors.primaryLight : '#818CF8'}
              style={styles.searchIcon}
            />
          </Pressable>

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search credentials, notes, keys..."
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
          />

          {searchQuery.length > 0 && (
            <Pressable
              onPress={clearSearch}
              style={styles.clearSearchButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          )}

          {onOpenSearch && (
            <Pressable
              onPress={onOpenSearch}
              style={styles.expandSearchButton}
              accessibilityRole="button"
              accessibilityLabel="Open full search screen"
            >
              <Ionicons name="options-outline" size={17} color={colors.primaryLight} />
            </Pressable>
          )}
        </View>

        {isSearching && (
          <View style={styles.ramSearchBanner}>
            <Ionicons name="flash" size={12} color={colors.emerald} />
            <Text style={styles.ramSearchBannerText}>
              {filteredItems.length} {filteredItems.length === 1 ? 'match' : 'matches'} in volatile RAM
            </Text>
          </View>
        )}
      </View>

      {/* Security & Vault Metrics Strip */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Ionicons name="key" size={12} color={colors.primaryLight} />
          </View>
          <Text style={styles.metricLabel}>{allVaultItems.length} Records</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Ionicons name="time" size={12} color={colors.emerald} />
          </View>
          <Text style={styles.metricLabel}>{totpCount} with 2FA</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
            <Ionicons name="shield-checkmark" size={12} color="#60A5FA" />
          </View>
          <Text style={styles.metricLabel}>AES-256-GCM</Text>
        </View>
      </View>

      {/* Category Chip Selector Bar */}
      <View style={styles.categoryBarContainer}>
        <CategoryChipBar
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat as VaultItemType | 'all' | 'TOTP')}
          counts={categoryCounts}
        />
      </View>

      {/* Items Scrollable List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => scrollContext?.notifyScrollStart()}
        onScroll={() => scrollContext?.notifyScrollStart()}
        onScrollEndDrag={() => scrollContext?.notifyScrollEnd()}
        onMomentumScrollEnd={() => scrollContext?.notifyScrollEnd()}
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
            icon={isSearching ? 'search-outline' : 'shield-outline'}
            title={isSearching ? 'No Matching Entries' : 'Your Vault is Ready'}
            description={
              isSearching
                ? `No credentials found matching "${searchQuery}" in volatile RAM index.`
                : 'Start securing your credentials, notes, and 2FA secrets with AES-256-GCM encryption.'
            }
            quickActions={[
              {
                label: 'New Login',
                icon: 'key-outline',
                onPress: () => onAddItem?.(),
              },
              {
                label: 'New Card',
                icon: 'card-outline',
                onPress: () => onAddItem?.(),
              },
              {
                label: 'Secure Note',
                icon: 'document-text-outline',
                onPress: () => onAddItem?.(),
              },
            ]}
            actionLabel={isSearching ? 'Clear Filters' : 'Create First Item'}
            onActionPress={() => {
              if (isSearching) {
                clearSearch();
                setActiveCategory('all');
              } else if (onAddItem) {
                onAddItem();
              }
            }}
            secondaryActionLabel={
              allVaultItems.length === 0 ? 'Load Sample Credentials' : undefined
            }
            onSecondaryActionPress={() => {
              useVaultStore.getState().resetToDemo();
            }}
          />
        ) : (
          <>
            {/* Favorites Section (when applicable) */}
            {favoriteItems.length > 0 && (
              <View style={styles.section}>
                <Pressable
                  style={styles.sectionHeader}
                  onPress={onOpenFavorites}
                  accessibilityRole="button"
                  accessibilityLabel="Open Favorites Hub"
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={styles.sectionTitle}>PINNED FAVORITES</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{favoriteItems.length}</Text>
                    </View>
                  </View>
                  {onOpenFavorites && (
                    <View style={styles.viewHubButton}>
                      <Text style={styles.viewHubText}>Hub</Text>
                      <Ionicons name="chevron-forward" size={12} color={colors.amber} />
                    </View>
                  )}
                </Pressable>

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
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="layers-outline" size={14} color="#94A3B8" />
                  <Text style={styles.sectionTitle}>
                    {activeCategory === 'all'
                      ? 'ALL CREDENTIALS'
                      : `${activeCategory.toUpperCase()} ITEMS`}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {favoriteItems.length > 0 ? otherItems.length : filteredItems.length}
                    </Text>
                  </View>
                </View>
              </View>

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
    paddingBottom: spacing.xs,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(123, 97, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(157, 141, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    fontFamily: typography.fontFamily.sans,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.emerald,
    fontFamily: typography.fontFamily.sans,
    letterSpacing: 0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(22, 24, 34, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starActionButton: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 10,
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  starBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
    fontFamily: typography.fontFamily.sans,
  },
  headerActionButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 22, 32, 0.85)',
    borderWidth: 1.2,
    borderColor: 'rgba(123, 97, 255, 0.22)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    height: 46,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13.5,
    fontFamily: typography.fontFamily.sans,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  expandSearchButton: {
    padding: 6,
    marginLeft: 4,
  },
  ramSearchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  ramSearchBannerText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    color: colors.emerald,
    letterSpacing: 0.2,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  metricIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    fontFamily: typography.fontFamily.sans,
  },
  categoryBarContainer: {
    paddingVertical: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs + 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewHubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  viewHubText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    color: colors.amber,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.1,
  },
  countBadge: {
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countBadgeText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  itemsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
});
