/**
 * PrivacyShield Component
 * Anti-snapshot privacy shield overlay that conceals sensitive credentials
 * the instant the application enters the background or OS app switcher.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import { useSessionStore } from '../../core/session/useSessionStore';

export interface PrivacyShieldProps {
  /**
   * Optional manual override to force display during security-sensitive actions
   */
  forceVisible?: boolean;
}

export function PrivacyShield({ forceVisible = false }: PrivacyShieldProps) {
  const storeShieldActive = useSessionStore((s) => s.isPrivacyShieldActive);
  const [appStateShield, setAppStateShield] = useState<boolean>(() => {
    const current = AppState.currentState;
    return current === 'background' || current === 'inactive';
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const isHidden = nextState === 'background' || nextState === 'inactive';
      setAppStateShield(isHidden);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const isVisible = forceVisible || storeShieldActive || appStateShield;

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="auto" accessibilityViewIsModal={true}>
      <View style={styles.content}>
        {/* Brand Pill */}
        <View style={styles.brandPill}>
          <Ionicons name="lock-closed" size={13} color={colors.primaryLight} />
          <Text style={styles.brandText}>VAULTNOTE</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>v2.4</Text>
          </View>
        </View>

        {/* Central Shield Squircle */}
        <View style={styles.shieldSquircle}>
          <View style={styles.emblemContainer}>
            <MaterialCommunityIcons name="shield-lock-outline" size={44} color={colors.primaryLight} />
            <View style={styles.fingerprintOverlay}>
              <MaterialCommunityIcons name="fingerprint" size={20} color={colors.primaryLight} />
            </View>
          </View>
          <View style={styles.pulseDot} />
        </View>

        {/* Status Text */}
        <Text style={styles.title}>Privacy Shield Armed</Text>
        <Text style={styles.subtitle}>Sensitive cryptographic assets concealed from system snapshots.</Text>

        {/* Enclave Protection Tag */}
        <View style={styles.enclaveTag}>
          <View style={styles.enclaveDot} />
          <Text style={styles.enclaveText}>Zero-Knowledge Anti-Snapshot</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#090A0F',
    zIndex: 999999,
    elevation: 999999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    maxWidth: 340,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginBottom: spacing['2xl'],
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.2,
  },
  badge: {
    backgroundColor: 'rgba(123, 97, 255, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  shieldSquircle: {
    width: 104,
    height: 104,
    borderRadius: 24,
    backgroundColor: '#0E111B',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  emblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fingerprintOverlay: {
    position: 'absolute',
    bottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.emerald,
    marginTop: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  enclaveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 6,
  },
  enclaveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  enclaveText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.emerald,
  },
});
