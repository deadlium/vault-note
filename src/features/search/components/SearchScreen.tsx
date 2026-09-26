/**
 * Dedicated Vault Search Screen
 * Full-screen real-time search powered by Ephemeral RAM Index.
 * Features instant fuzzy matching, category facet filtering, tag filtering,
 * and zero disk persistence.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { useVaultSearch } from '../useVaultSearch';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultItemType } from '../../../types/vault';

export interface SearchScreenProps {
  onBack?: () => void;
  onSelectItem?: (item: VaultItemRowData) => void;
  initialQuery?: string;
  initialCategory?: VaultItemType | 'all' | 'TOTP';
}

export function SearchScreen({
  onBack,
  onSelectItem,
  initialQuery = '',
  initialCategory = 'all',
}: SearchScreenProps) {
  const inputRef = useRef<TextInput>(null);

  const {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    selectedTag,
    setSelectedTag,
    results,
    totalMatches,
    categoryCounts,
    availableTags,
    isSearching,
    clearSearch,
  } = useVaultSearch({
    initialCategory,
  });

  const toggleFavorite = useVaultStore((state) => state.toggleFavorite);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
    // Auto-focus input for rapid search entry
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [initialQuery, setSearchQuery]);

  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Search Header Bar */}
      <View style={styles.searchHeader}>
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

        <View style={styles.inputContainer}>
          <Ionicons name="search" size={18} color={colors.primaryLight} style={styles.inputIcon} />
          <TextInput
            ref={inputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search credentials, notes, keys..."
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Facet Filter Chips */}
      <View style={styles.categoryBarWrapper}>
        <CategoryChipBar
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat as VaultItemType | 'all' | 'TOTP')}
          counts={categoryCounts}
        />
      </View>

      {/* Tag Facets Horizontal Filter Bar */}
      {availableTags.length > 0 && (
        <View style={styles.tagBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagScrollContent}
          >
            {selectedTag && (
              <Pressable
                onPress={() => setSelectedTag(null)}
                style={styles.activeTagResetPill}
              >
                <Text style={styles.activeTagResetText}>Clear Tag</Text>
                <Ionicons name="close" size={12} color={colors.primaryLight} />
              </Pressable>
            )}

            {availableTags.map(({ tag, count }) => {
              const isSelected = selectedTag === tag;
              return (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(isSelected ? null : tag)}
                  style={[
                    styles.tagPill,
                    isSelected ? styles.tagPillActive : styles.tagPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      isSelected ? styles.tagTextActive : styles.tagTextInactive,
                    ]}
                  >
                    #{tag}
                  </Text>
                  <View
                    style={[
                      styles.tagBadge,
                      isSelected ? styles.tagBadgeActive : styles.tagBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagBadgeText,
                        isSelected ? styles.tagBadgeTextActive : styles.tagBadgeTextInactive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search Results Summary Header */}
      <View style={styles.resultSummaryRow}>
        <Text style={styles.resultSummaryText}>
          {isSearching
            ? `${totalMatches} ${totalMatches === 1 ? 'MATCH' : 'MATCHES'} IN RAM`
            : `${totalMatches} TOTAL ENTRIES`}
        </Text>
        <View style={styles.ramBadge}>
          <Ionicons name="flash" size={10} color={colors.emerald} />
          <Text style={styles.ramBadgeText}>Volatile Memory</Text>
        </View>
      </View>

      {/* Search Result List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {results.length > 0 ? (
          <View style={styles.resultsList}>
            {results.map(({ entry }) => {
              const rowItem: VaultItemRowData = {
                id: entry.id,
                title: entry.title,
                subtitle: entry.subtitle,
                category: entry.type,
                tag: entry.tags[0] ? `#${entry.tags[0]}` : entry.type,
                iconType: entry.icon,
                isFavorite: entry.isFavorite,
                isProtected: entry.isProtected,
                hasTOTP: entry.hasTOTP,
                totpLabel: entry.totpLabel,
              };

              return (
                <VaultItemRow
                  key={entry.id}
                  item={rowItem}
                  onPress={() => onSelectItem?.(rowItem)}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="search-outline"
              title="No Matching Entries"
              description={
                searchQuery
                  ? `No vault items matched "${searchQuery}" in volatile RAM index.`
                  : 'No items match the selected category or tag.'
              }
              actionLabel={isSearching ? 'Clear Filters' : undefined}
              onActionPress={isSearching ? clearSearch : undefined}
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  inputContainer: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.2,
    borderColor: 'rgba(157, 141, 255, 0.40)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  categoryBarWrapper: {
    paddingVertical: 2,
  },
  tagBarWrapper: {
    paddingVertical: 4,
  },
  tagScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    alignItems: 'center',
  },
  activeTagResetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.16)',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  activeTagResetText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  tagPillActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.20)',
    borderColor: colors.primaryLight,
  },
  tagPillInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  tagText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
  },
  tagTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tagTextInactive: {
    color: colors.textSecondary,
  },
  tagBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tagBadgeActive: {
    backgroundColor: colors.primaryDark,
  },
  tagBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  tagBadgeTextActive: {
    color: '#FFFFFF',
  },
  tagBadgeTextInactive: {
    color: colors.textTertiary,
  },
  resultSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 4,
  },
  resultSummaryText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textTertiary,
  },
  ramBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  ramBadgeText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.emerald,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    paddingTop: spacing.xs,
  },
  resultsList: {
    gap: spacing.sm,
  },
  emptyContainer: {
    paddingTop: spacing.xxl,
  },
});
