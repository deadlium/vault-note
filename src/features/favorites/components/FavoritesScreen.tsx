/**
 * Dedicated Favorites Hub Screen
 * Pinned and starred vault items with category filters and instant star-toggle synchronization.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { CategoryChipBar } from '../../../components/category/CategoryChipBar';
import { VaultItemRow, VaultItemRowData } from '../../../components/item/VaultItemRow';
import { EmptyState } from '../../../components/common/EmptyState';
import { useFavorites } from '../useFavorites';
import { VaultItemType } from '../../../types/vault';

export interface FavoritesScreenProps {
  onBack?: () => void;
  onSelectItem?: (item: VaultItemRowData) => void;
}

export function FavoritesScreen({ onBack, onSelectItem }: FavoritesScreenProps) {
  const { favoriteItems, favoriteCount, toggleFavorite, getFavoritesByCategory } =
    useFavorites();

  const [activeCategory, setActiveCategory] = useState<VaultItemType | 'all' | 'TOTP'>('all');

  // Compute category counts within favorites
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: favoriteCount,
      LOGIN: 0,
      SECURE_NOTE: 0,
      CARD: 0,
      TOTP: 0,
      API_KEY: 0,
      IDENTITY: 0,
      RECOVERY_CODES: 0,
    };

    for (const item of favoriteItems) {
      if (counts[item.type] !== undefined) {
        counts[item.type] += 1;
      }
      const payload = item.payload as unknown as Record<string, unknown>;
      if (payload?.totpSecret) {
        counts.TOTP = (counts.TOTP || 0) + 1;
      }
    }

    return counts;
  }, [favoriteItems, favoriteCount]);

  const displayedFavorites = useMemo(() => {
    return getFavoritesByCategory(activeCategory);
  }, [getFavoritesByCategory, activeCategory]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Navigation Header */}
      <View style={styles.header}>
        {onBack && (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
        )}

        <View style={styles.headerTitleCol}>
          <View style={styles.titleRow}>
            <Ionicons name="star" size={16} color={colors.amber} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Favorites Hub</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {favoriteCount} {favoriteCount === 1 ? 'item pinned' : 'items pinned'} for quick access
          </Text>
        </View>

        <View style={styles.starBadge}>
          <Text style={styles.starBadgeText}>{favoriteCount}</Text>
        </View>
      </View>

      {/* Category Facet Filters */}
      <View style={styles.categoryBarWrapper}>
        <CategoryChipBar
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat as VaultItemType | 'all' | 'TOTP')}
          counts={categoryCounts}
        />
      </View>

      {/* Favorites List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {displayedFavorites.length > 0 ? (
          <View style={styles.list}>
            {displayedFavorites.map((item) => {
              const payload = item.payload as unknown as Record<string, unknown>;
              const username =
                (payload?.username as string) ||
                (payload?.accountNumber as string) ||
                (payload?.email as string) ||
                (payload?.cardholderName as string) ||
                (payload?.serviceName as string) ||
                (payload?.fullName as string) ||
                '';

              const websiteUrl =
                (payload?.websiteUrl as string) ||
                (payload?.endpointUrl as string) ||
                '';

              const rowItem: VaultItemRowData = {
                id: item.id,
                title: item.title,
                subtitle: username || websiteUrl || item.type,
                category: item.type,
                tag: item.tags?.[0] ? `#${item.tags[0]}` : item.type,
                iconType:
                  ((item as unknown as Record<string, unknown>).icon as string) ||
                  ((payload?.icon as string) || undefined),
                isFavorite: true,
                isProtected: Boolean(item.isProtected),
                hasTOTP: Boolean(payload?.totpSecret),
                totpLabel: payload?.totpSecret ? 'TOTP Active' : undefined,
              };

              return (
                <VaultItemRow
                  key={item.id}
                  item={rowItem}
                  onPress={() => onSelectItem?.(rowItem)}
                  onToggleFavorite={() => toggleFavorite(item.id)}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="star-outline"
              title="No Pinned Favorites"
              description={
                favoriteCount === 0
                  ? 'Star your essential login credentials, notes, or cards in the vault for immediate one-tap access.'
                  : `No favorited items in the ${activeCategory} category.`
              }
              actionLabel={activeCategory !== 'all' ? 'View All Favorites' : undefined}
              onActionPress={activeCategory !== 'all' ? () => setActiveCategory('all') : undefined}
            />
          </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerTitleCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  starBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.40)',
  },
  starBadgeText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: colors.amber,
  },
  categoryBarWrapper: {
    paddingVertical: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    paddingTop: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  emptyContainer: {
    paddingTop: spacing.xxl,
  },
});
