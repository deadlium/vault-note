/**
 * TOTPEnrollment Component
 * Complete enrollment interface supporting QR camera scanning, manual secret entry,
 * validation error alerts, and live OTP verification confirmation before saving.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { QRScanner } from '../scanner/QRScanner';
import { CountdownRing } from './CountdownRing';
import { useTOTPEnrollment } from '../hooks/useTOTPEnrollment';
import { TOTPAlgorithm, TOTPEnrollmentData } from '../types';

export interface TOTPEnrollmentProps {
  /** Invoked when user confirms and adds the authenticator configuration */
  onEnroll: (data: TOTPEnrollmentData) => void;
  /** Invoked when user cancels the enrollment process */
  onCancel: () => void;
  /** Optional pre-filled service name or account name */
  initialServiceName?: string;
  initialAccountName?: string;
}

export const TOTPEnrollment: React.FC<TOTPEnrollmentProps> = ({
  onEnroll,
  onCancel,
  initialServiceName = '',
  initialAccountName = '',
}) => {
  const {
    mode,
    config,
    previewToken,
    error,
    errorCode,
    isProcessing,
    handleScannedData,
    handleManualSubmit,
    switchMode,
    clearError,
  } = useTOTPEnrollment('scanner');

  // Manual form state
  const [manualIssuer, setManualIssuer] = useState(initialServiceName);
  const [manualAccount, setManualAccount] = useState(initialAccountName);
  const [manualSecret, setManualSecret] = useState('');
  const [manualAlgorithm, setManualAlgorithm] = useState<TOTPAlgorithm>('SHA1');
  const [manualDigits, setManualDigits] = useState<number>(6);
  const [manualPeriod, setManualPeriod] = useState<number>(30);

  const onManualSave = () => {
    handleManualSubmit({
      issuer: manualIssuer,
      account: manualAccount,
      secret: manualSecret,
      algorithm: manualAlgorithm,
      digits: manualDigits,
      period: manualPeriod,
    });
  };

  const handleConfirm = () => {
    if (config) {
      onEnroll(config);
    }
  };

  // ----------------------------------------------------
  // SCREEN 3: Confirmation Screen
  // ----------------------------------------------------
  if (mode === 'confirming' && config && previewToken) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Authenticator</Text>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressedOpacity]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.confirmationContent} showsVerticalScrollIndicator={false}>
          <View style={styles.confirmationCard}>
            <View style={styles.confirmHeaderRow}>
              <View style={styles.confirmIconCircle}>
                <Ionicons name="shield-checkmark" size={24} color={colors.emerald} />
              </View>
              <View style={styles.confirmHeaderText}>
                <Text style={styles.confirmServiceName}>{config.issuer}</Text>
                {config.account ? (
                  <Text style={styles.confirmAccountText}>{config.account}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Spec Details Table */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Algorithm</Text>
              <Text style={styles.detailValue}>{config.algorithm}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Digits</Text>
              <Text style={styles.detailValue}>{config.digits}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rotation Period</Text>
              <Text style={styles.detailValue}>{config.period} seconds</Text>
            </View>

            <View style={styles.divider} />

            {/* Live Current Code Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Current Code</Text>
              <View style={styles.codeRow}>
                <Text style={styles.previewCodeText}>{previewToken.formattedCode}</Text>
                <CountdownRing
                  remainingSeconds={previewToken.remainingSeconds}
                  period={previewToken.period}
                  progress={previewToken.progress}
                  size={36}
                  strokeWidth={3}
                  showSecondsText={true}
                />
              </View>
              <Text style={styles.previewSubtext}>
                Rotates in {previewToken.remainingSeconds}s
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add TOTP"
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Add TOTP</Text>
            </Pressable>

            <Pressable
              onPress={() => switchMode('scanner')}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Scan Another Code</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ----------------------------------------------------
  // SCREENS 1 & 2: Scanner / Manual Entry with Tab Switcher
  // ----------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header with Switcher Tabs */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => switchMode('scanner')}
            style={[
              styles.tabButton,
              mode === 'scanner' && styles.tabButtonActive,
            ]}
          >
            <Ionicons
              name="qr-code-outline"
              size={15}
              color={mode === 'scanner' ? colors.textPrimary : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                mode === 'scanner' && styles.tabButtonTextActive,
              ]}
            >
              Scan QR
            </Text>
          </Pressable>

          <Pressable
            onPress={() => switchMode('manual')}
            style={[
              styles.tabButton,
              mode === 'manual' && styles.tabButtonActive,
            ]}
          >
            <Ionicons
              name="key-outline"
              size={15}
              color={mode === 'manual' ? colors.textPrimary : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                mode === 'manual' && styles.tabButtonTextActive,
              ]}
            >
              Manual Key
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressedOpacity]}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Error Alert Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons
            name="alert-circle"
            size={18}
            color={colors.crimson}
            style={{ marginRight: 8, marginTop: 1 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>
              {errorCode === 'HOTP_NOT_SUPPORTED'
                ? 'Unsupported Authenticator Type'
                : 'Invalid Configuration'}
            </Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
          <Pressable onPress={clearError} style={styles.errorDismiss}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Mode Viewport */}
      {mode === 'scanner' ? (
        <QRScanner
          onScan={handleScannedData}
          onCancel={onCancel}
          isProcessing={isProcessing}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.manualContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formTitle}>Add TOTP Manually</Text>
          <Text style={styles.formSubtitle}>
            Enter the shared secret key provided by your service.
          </Text>

          {/* Service / Issuer */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. GitHub, Google, Discord"
              placeholderTextColor={colors.textMuted}
              value={manualIssuer}
              onChangeText={setManualIssuer}
              autoCapitalize="words"
            />
          </View>

          {/* Account / Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account / Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. user@example.com"
              placeholderTextColor={colors.textMuted}
              value={manualAccount}
              onChangeText={setManualAccount}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Secret Key */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Secret Key (Base32) *</Text>
            <TextInput
              style={[styles.input, styles.monoInput]}
              placeholder="e.g. JBSWY3DPEHPK3PXP"
              placeholderTextColor={colors.textMuted}
              value={manualSecret}
              onChangeText={setManualSecret}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {/* Algorithm Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Algorithm</Text>
            <View style={styles.chipRow}>
              {(['SHA1', 'SHA256', 'SHA512'] as TOTPAlgorithm[]).map((algo) => (
                <Pressable
                  key={algo}
                  onPress={() => setManualAlgorithm(algo)}
                  style={[
                    styles.chip,
                    manualAlgorithm === algo && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      manualAlgorithm === algo && styles.chipTextActive,
                    ]}
                  >
                    {algo}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Digits & Period Rows */}
          <View style={styles.horizontalRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Digits</Text>
              <View style={styles.chipRow}>
                {[6, 8].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setManualDigits(d)}
                    style={[
                      styles.chip,
                      { flex: 1 },
                      manualDigits === d && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        manualDigits === d && styles.chipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.label}>Period</Text>
              <View style={styles.chipRow}>
                {[30, 60].map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setManualPeriod(p)}
                    style={[
                      styles.chip,
                      { flex: 1 },
                      manualPeriod === p && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        manualPeriod === p && styles.chipTextActive,
                      ]}
                    >
                      {p}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={onManualSave}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.manualSaveButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Verify & Continue</Text>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#20232A',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2127',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#16181D',
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: '#262A33',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  pressedOpacity: {
    opacity: 0.7,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: colors.crimson,
    marginBottom: 2,
  },
  errorMessage: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 16,
  },
  errorDismiss: {
    padding: 4,
    marginLeft: spacing.sm,
  },
  manualContent: {
    padding: spacing.lg,
  },
  formTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#16181D',
    borderWidth: 1,
    borderColor: '#262A33',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
  },
  monoInput: {
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: '#16181D',
    borderWidth: 1,
    borderColor: '#262A33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primaryLight,
  },
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualSaveButton: {
    marginTop: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  primaryButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    color: colors.textMuted,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  confirmationContent: {
    padding: spacing.lg,
  },
  confirmationCard: {
    backgroundColor: '#14161B',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#262A33',
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  confirmIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmHeaderText: {
    flex: 1,
  },
  confirmServiceName: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  confirmAccountText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#20242D',
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewSection: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  previewLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  previewCodeText: {
    fontFamily: typography.fontFamily.mono,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 3,
    color: colors.textPrimary,
  },
  previewSubtext: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.textMuted,
  },
  actionSection: {
    gap: spacing.xs,
  },
});
