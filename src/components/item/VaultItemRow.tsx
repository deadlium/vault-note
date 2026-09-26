/**
 * VaultItemRow Component
 * High-craft credentials card row inspired by Apple Notes + Linear + 1Password
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { ServiceIcon } from '../icon/ServiceIcon';
import { VaultItemType, VaultItemRowData } from '../../types/vault';

export type { VaultItemRowData };

export interface VaultItemRowProps {
  item: VaultItemRowData;
  onPress: () => void;
  onToggleFavorite?: (id: string) => void;
}

export function VaultItemRow({
  item,
  onPress,
  onToggleFavorite,
}: VaultItemRowProps) {
  const displaySubtitle = item.subtitle ?? '';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
    >
      {/* Service Icon / Monogram */}
      <ServiceIcon
        iconType={item.iconType}
        category={item.category}
        title={item.title}
        size="md"
      />

      {/* Item Information */}
      <View style={styles.centerInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isProtected && (
            <Ionicons
              name="lock-closed"
              size={12}
              color={colors.primaryLight}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {displaySubtitle.length > 0 && (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {displaySubtitle}
          </Text>
        )}

        {/* Feature Badges & Category Tags */}
        <View style={styles.badgesRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.tag ?? item.category}</Text>
          </View>

          {item.hasTOTP && (
            <View style={styles.totpPill}>
              <View style={styles.totpDot} />
              <Text style={styles.totpText}>{item.totpLabel ?? 'TOTP'}</Text>
            </View>
          )}

          {item.twoFactorLabel && !item.hasTOTP && (
            <View style={styles.twoFactorPill}>
              <Text style={styles.twoFactorText}>{item.twoFactorLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right Actions: Favorite Star & Chevron */}
      <View style={styles.rightActions}>
        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => onToggleFavorite?.(item.id)}
          style={styles.starBtn}
          accessibilityLabel={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Ionicons
            name={item.isFavorite ? 'star' : 'star-outline'}
            size={18}
            color={item.isFavorite ? '#FBBF24' : colors.textTertiary}
          />
        </Pressable>

        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 22, 32, 0.80)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerPressed: {
    backgroundColor: 'rgba(30, 32, 46, 0.95)',
    borderColor: 'rgba(123, 97, 255, 0.45)',
    transform: [{ scale: 0.985 }],
  },
  centerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.2,
    fontFamily: typography.fontFamily.sans,
  },
  subtitleText: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: typography.code.fontFamily,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.sans,
  },
  totpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    gap: 4,
  },
  totpDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.emerald,
  },
  totpText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.emerald,
    fontFamily: typography.fontFamily.sans,
  },
  twoFactorPill: {
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  twoFactorText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.primaryLight,
    fontFamily: typography.fontFamily.sans,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
});
