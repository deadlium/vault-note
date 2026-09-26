/**
 * TOTPSettings Component
 * Configuration modal for Two-Factor Authentication parameters
 * Supports editing issuer, account, base32 secret, algorithm, digits, period, and detaching
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { isValidBase32 } from '../base32';
import type { TOTPRecord, TOTPUpdateInput, TOTPAlgorithm } from '../types';
import { useTOTP } from '../hooks/useTOTP';
import { CountdownRing } from './CountdownRing';

export interface TOTPSettingsProps {
  /** Whether modal sheet is visible */
  visible: boolean;
  /** Dismiss callback */
  onClose: () => void;
  /** Existing TOTP record or initial parameters */
  record?: TOTPRecord | null;
  /** Credential ID if attached to a login credential */
  credentialId?: string;
  /** Callback to persist updated configuration */
  onSave: (updates: TOTPUpdateInput) => Promise<void> | void;
  /** Callback to detach / purge 2FA from the credential */
  onDetach?: () => Promise<void> | void;
}

export const TOTPSettings: React.FC<TOTPSettingsProps> = ({
  visible,
  onClose,
  record,
  credentialId,
  onSave,
  onDetach,
}) => {
  const [issuer, setIssuer] = useState(record?.issuer || '');
  const [account, setAccount] = useState(record?.account || '');
  const [secret, setSecret] = useState(record?.secret || '');
  const [algorithm, setAlgorithm] = useState<TOTPAlgorithm>(record?.algorithm || 'SHA1');
  const [digits, setDigits] = useState<6 | 8>((record?.digits as 6 | 8) || 6);
  const [period, setPeriod] = useState<number>(record?.period || 30);
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secretError, setSecretError] = useState<string | null>(null);

  // Sync state whenever record or visibility changes
  useEffect(() => {
    if (visible) {
      setIssuer(record?.issuer || '');
      setAccount(record?.account || '');
      setSecret(record?.secret || '');
      setAlgorithm(record?.algorithm || 'SHA1');
      setDigits((record?.digits as 6 | 8) || 6);
      setPeriod(record?.period || 30);
      setShowSecret(false);
      setIsSubmitting(false);
      setSecretError(null);
    }
  }, [visible, record]);

  const cleanSecret = secret.replace(/[\s\-_=]/g, '').toUpperCase();
  const isSecretValid = cleanSecret.length > 0 && isValidBase32(cleanSecret);

  // Live OTP preview for immediate feedback
  const { formattedCode, remainingSeconds, progress } = useTOTP(
    isSecretValid ? cleanSecret : '',
    { algorithm, digits, period }
  );

  const handleSecretChange = (text: string) => {
    setSecret(text);
    if (secretError) setSecretError(null);
  };

  const handleSave = async () => {
    if (cleanSecret.length === 0) {
      setSecretError('Secret key cannot be empty');
      return;
    }
    if (!isValidBase32(cleanSecret)) {
      setSecretError('Invalid Base32 secret string (must use A-Z and 2-7)');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        issuer: issuer.trim() || 'Authenticator',
        account: account.trim(),
        secret: cleanSecret,
        algorithm,
        digits,
        period,
      });
      onClose();
    } catch (err) {
      Alert.alert(
        'Save Error',
        err instanceof Error ? err.message : 'Failed to save authenticator settings'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetachPrompt = () => {
    Alert.alert(
      'Remove Two-Factor Authentication',
      'Are you sure you want to detach 2FA from this credential? The authenticator secret will be permanently purged from encrypted storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              if (onDetach) {
                await onDetach();
              }
              onClose();
            } catch (err) {
              Alert.alert(
                'Removal Error',
                err instanceof Error ? err.message : 'Failed to remove authenticator'
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleGroup}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primaryLight} />
              <Text style={styles.sheetTitle}>2FA Authenticator Settings</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressedState]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close Settings"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Live Preview Card */}
            <View style={styles.previewBox}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewLabel}>LIVE PREVIEW</Text>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>
                    {algorithm} • {digits} Digits • {period}s
                  </Text>
                </View>
              </View>

              <View style={styles.previewCodeRow}>
                <Text
                  style={[
                    styles.previewCodeText,
                    !isSecretValid && styles.previewCodePlaceholder,
                  ]}
                >
                  {isSecretValid ? formattedCode : '------'}
                </Text>

                {isSecretValid && (
                  <CountdownRing
                    remainingSeconds={remainingSeconds}
                    period={period}
                    progress={progress}
                    size={36}
                    strokeWidth={3}
                    showSecondsText={true}
                  />
                )}
              </View>
            </View>

            {/* Field: Issuer */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>ISSUER / SERVICE NAME</Text>
              <TextInput
                style={styles.textInput}
                value={issuer}
                onChangeText={setIssuer}
                placeholder="e.g. GitHub, AWS, Google"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                accessibilityLabel="Issuer name"
              />
            </View>

            {/* Field: Account */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>ACCOUNT / USERNAME</Text>
              <TextInput
                style={styles.textInput}
                value={account}
                onChangeText={setAccount}
                placeholder="e.g. user@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Account username"
              />
            </View>

            {/* Field: Secret Key */}
            <View style={styles.fieldBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>SHARED SECRET KEY (BASE32)</Text>
                <Pressable
                  onPress={() => setShowSecret(!showSecret)}
                  style={styles.toggleSecretButton}
                  hitSlop={6}
                >
                  <Ionicons
                    name={showSecret ? 'eye-off-outline' : 'eye-outline'}
                    size={14}
                    color={colors.primaryLight}
                  />
                  <Text style={styles.toggleSecretText}>
                    {showSecret ? 'Hide' : 'Reveal'}
                  </Text>
                </Pressable>
              </View>

              <View
                style={[
                  styles.secretInputWrapper,
                  Boolean(secretError) && styles.inputErrorBorder,
                ]}
              >
                <TextInput
                  style={[styles.textInput, styles.secretInput]}
                  value={secret}
                  onChangeText={handleSecretChange}
                  placeholder="JBSWY3DPEHPK3PXP"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  secureTextEntry={!showSecret}
                  accessibilityLabel="Base32 shared secret key"
                />
              </View>

              {secretError ? (
                <Text style={styles.fieldErrorMessage}>{secretError}</Text>
              ) : (
                <Text style={styles.fieldHint}>
                  Zero-knowledge: Encrypted with your vault DEK using AES-256-GCM.
                </Text>
              )}
            </View>

            {/* Selector: Algorithm */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>HASH ALGORITHM</Text>
              <View style={styles.chipRow}>
                {(['SHA1', 'SHA256', 'SHA512'] as TOTPAlgorithm[]).map((algo) => {
                  const isSelected = algorithm === algo;
                  return (
                    <Pressable
                      key={algo}
                      onPress={() => setAlgorithm(algo)}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select algorithm ${algo}`}
                    >
                      <Text
                        style={[styles.chipText, isSelected && styles.chipTextActive]}
                      >
                        {algo}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Selector: Digits */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>CODE DIGITS</Text>
              <View style={styles.chipRow}>
                {([6, 8] as const).map((num) => {
                  const isSelected = digits === num;
                  return (
                    <Pressable
                      key={num}
                      onPress={() => setDigits(num)}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${num} digits`}
                    >
                      <Text
                        style={[styles.chipText, isSelected && styles.chipTextActive]}
                      >
                        {num} Digits
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Selector: Period */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>PERIOD / ROTATION INTERVAL</Text>
              <View style={styles.chipRow}>
                {([30, 60] as const).map((sec) => {
                  const isSelected = period === sec;
                  return (
                    <Pressable
                      key={sec}
                      onPress={() => setPeriod(sec)}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${sec} seconds interval`}
                    >
                      <Text
                        style={[styles.chipText, isSelected && styles.chipTextActive]}
                      >
                        {sec} Seconds
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Detach Option (if attached) */}
            {(record || credentialId) && onDetach && (
              <View style={styles.detachBlock}>
                <Pressable
                  onPress={handleDetachPrompt}
                  style={({ pressed }) => [
                    styles.detachButton,
                    pressed && styles.pressedState,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Detach Two-Factor Authentication"
                >
                  <Feather name="trash-2" size={15} color={colors.crimson} />
                  <Text style={styles.detachButtonText}>
                    Detach Two-Factor Authentication
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressedState]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.saveButton,
                isSubmitting && styles.saveButtonDisabled,
                pressed && styles.pressedState,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save TOTP Configuration"
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={colors.textPrimary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Saving...' : 'Save Configuration'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 8, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#16181C',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#24272E',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#20222A',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: '#20222A',
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  previewBox: {
    backgroundColor: '#111216',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#24272E',
    padding: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  previewLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  previewBadge: {
    backgroundColor: '#1C1E24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  previewBadgeText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  previewCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  previewCodeText: {
    fontFamily: typography.fontFamily.mono,
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  previewCodePlaceholder: {
    color: colors.textMuted,
  },
  fieldBlock: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  toggleSecretButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleSecretText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#1A1C23',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#2D303B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    color: colors.textPrimary,
  },
  secretInputWrapper: {
    borderRadius: radius.sm,
  },
  secretInput: {
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 1.2,
  },
  inputErrorBorder: {
    borderColor: colors.crimson,
  },
  fieldErrorMessage: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.crimson,
    marginTop: 2,
  },
  fieldHint: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: '#1A1C23',
    borderWidth: 1,
    borderColor: '#2D303B',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryLight,
  },
  chipText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  detachBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#20222A',
  },
  detachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  detachButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.crimson,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#20222A',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1F2228',
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pressedState: {
    opacity: 0.8,
  },
});
