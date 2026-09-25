/**
 * PasswordGeneratorScreen Component
 * Authenticated tab screen for generating passwords and evaluating entropy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../../theme';
import { PasswordGeneratorView } from './PasswordGeneratorView';

export function PasswordGeneratorScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.headerIconSquircle}>
            <Ionicons name="key" size={18} color={colors.primaryLight} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Password Generator</Text>
            <Text style={styles.headerSubtitle}>
              CSPRNG • Zero Modulo Bias
            </Text>
          </View>
        </View>

        <View style={styles.enclaveBadge}>
          <View style={styles.pulsingDot} />
          <Text style={styles.enclaveBadgeText}>Offline Entropy</Text>
        </View>
      </View>

      <PasswordGeneratorView actionButtonLabel="Copy Generated Secret" />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.25)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  enclaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 5,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  enclaveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald,
    letterSpacing: 0.4,
  },
});
