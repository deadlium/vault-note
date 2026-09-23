/**
 * CategoryChipBar Component
 * Horizontal category selector with count badges and smooth obsidian transitions
 */

import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { VaultItemType, CategoryOption, VAULT_CATEGORY_OPTIONS } from '../../types/vault';

export type { CategoryOption };
export { VAULT_CATEGORY_OPTIONS };

export interface CategoryChipBarProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
  counts?: Record<string, number>;
}

export function CategoryChipBar({
  activeCategory,
  onSelectCategory,
  counts = {},
}: CategoryChipBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {VAULT_CATEGORY_OPTIONS.map((cat) => {
        const isActive = activeCategory.toLowerCase() === cat.id.toLowerCase();
        const count = counts[cat.id.toLowerCase()] ?? counts[cat.id];

        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelectCategory(cat.id)}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                isActive ? styles.chipLabelActive : styles.chipLabelInactive,
              ]}
            >
              {cat.label}
            </Text>

            {count !== undefined && (
              <View
                style={[
                  styles.countBadge,
                  isActive ? styles.countBadgeActive : styles.countBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive ? styles.countTextActive : styles.countTextInactive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  chipActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  chipLabelInactive: {
    color: colors.textSecondary,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.35)',
  },
  countBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
  countTextActive: {
    color: colors.primaryLight,
  },
  countTextInactive: {
    color: colors.textTertiary,
  },
});
