/**
 * CategoryChipBar Component
 * Obsidian-themed horizontal category selector with sleek iconography,
 * glowing active indicators, and high-craft typography.
 */

import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { CategoryOption, VAULT_CATEGORY_OPTIONS } from '../../types/vault';

export type { CategoryOption };
export { VAULT_CATEGORY_OPTIONS };

export interface CategoryChipBarProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
  counts?: Record<string, number>;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: 'apps-outline',
  LOGIN: 'key-outline',
  CARD: 'card-outline',
  SECURE_NOTE: 'document-text-outline',
  TOTP: 'time-outline',
  API_KEY: 'code-slash-outline',
  IDENTITY: 'person-outline',
  RECOVERY_CODES: 'shield-checkmark-outline',
};

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
        const iconName = CATEGORY_ICONS[cat.id] || 'folder-outline';
        const shouldShowBadge = count !== undefined && (count > 0 || isActive);

        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelectCategory(cat.id)}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
              pressed && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${cat.label} category, ${count ?? 0} items`}
          >
            <Ionicons
              name={iconName}
              size={14}
              color={isActive ? colors.primaryLight : colors.textSecondary}
              style={styles.chipIcon}
            />

            <Text
              style={[
                styles.chipLabel,
                isActive ? styles.chipLabelActive : styles.chipLabelInactive,
              ]}
            >
              {cat.label}
            </Text>

            {shouldShowBadge && (
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
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  chipActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.18)',
    borderColor: 'rgba(157, 141, 255, 0.65)',
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
  chipInactive: {
    backgroundColor: 'rgba(22, 24, 34, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  chipIcon: {
    marginRight: 1,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: typography.fontFamily.sans,
    letterSpacing: 0.2,
  },
  chipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipLabelInactive: {
    color: '#94A3B8',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.45)',
  },
  countBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontFamily.sans,
  },
  countTextActive: {
    color: '#E0E7FF',
  },
  countTextInactive: {
    color: colors.textSecondary,
  },
});
