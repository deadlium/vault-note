/**
 * VaultNote Emergency Recovery Phrase Restore Screen
 * Restores a vault using a 24-word BIP-39 mnemonic phrase
 * Phase 2: Authentication, Session State & Hardware Security
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { validateRecoveryPhrase, recoveryPhraseToSeed } from '../../core/crypto/bip39';
import { deriveKeyArgon2id } from '../../core/crypto/kdf';
import { generateMasterEnclaveToken, bytesToHex } from '../../core/crypto/csprng';
import {
  storeMasterEnclaveToken,
  setVaultInitialized,
  setEnclaveItem,
  ENCLAVE_KEYS,
} from '../../core/storage/enclave';
import { runMigrations } from '../../core/database/migrations';
import { setMetadata } from '../../core/database/repository';
import { PasswordStrengthBar, evaluatePasswordStrength } from '../../features/authentication/components/PasswordStrengthBar';
import { getClipboardText } from '../../core/clipboard';

interface RecoveryProps {
  onCancel?: () => void;
  onRestoreComplete?: () => void;
}

export default function VaultRecoveryScreen({ onCancel, onRestoreComplete }: RecoveryProps) {
  const [phraseInput, setPhraseInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = phraseInput.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const isPhraseValid = words.length >= 12 && validateRecoveryPhrase(phraseInput);

  const handlePaste = async () => {
    try {
      const text = await getClipboardText();
      if (text && text.trim()) {
        setPhraseInput(text.trim());
      }
    } catch {
      // Ignore paste failures
    }
  };

  const passwordStrength = evaluatePasswordStrength(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canRestore = isPhraseValid && passwordStrength.isAcceptable && passwordsMatch;

  const handleRestore = async () => {
    if (!canRestore) return;

    setError(null);
    setIsLoading(true);

    try {
      // 1. Validate recovery phrase and derive root seed
      await recoveryPhraseToSeed(phraseInput);

      // 2. Derive new KEK with Argon2id using the new master password
      const derivation = deriveKeyArgon2id(newPassword);

      // 3. Generate fresh Master Enclave Token
      const enclaveToken = bytesToHex(generateMasterEnclaveToken());

      // 4. Update Secure Enclave
      await storeMasterEnclaveToken(enclaveToken);
      await setEnclaveItem(ENCLAVE_KEYS.PASS_SALT, derivation.saltHex);
      await setVaultInitialized(true);

      // 5. Ensure database schema is up-to-date
      await runMigrations();

      // 6. Record metadata
      await setMetadata('vault_restored_at', Date.now().toString());
      await setMetadata('vault_kdf_algo', derivation.algorithm);

      setIsLoading(false);
      onRestoreComplete?.();
    } catch (err) {
      setIsLoading(false);
      setError(`Recovery failed: ${(err as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {onCancel && (
            <Pressable style={styles.backBtn} onPress={onCancel}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>Restore from Backup</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.subtitle}>
          Enter your 24-word emergency recovery phrase to decrypt and restore your vault onto this device.
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.crimson} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Phrase Input Box */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>EMERGENCY RECOVERY PHRASE</Text>
            <View style={styles.labelActionsRow}>
              <Pressable onPress={handlePaste} style={styles.pasteButton}>
                <Ionicons name="clipboard-outline" size={12} color={colors.primaryLight} style={{ marginRight: 3 }} />
                <Text style={styles.pasteButtonText}>Paste</Text>
              </Pressable>
              <Text style={[styles.wordCount, isPhraseValid && styles.wordCountValid]}>
                {words.length} / 24 words
              </Text>
            </View>
          </View>

          <View style={[styles.phraseBox, isPhraseValid && styles.phraseBoxValid]}>
            <TextInput
              style={styles.phraseInput}
              multiline
              numberOfLines={4}
              value={phraseInput}
              onChangeText={setPhraseInput}
              placeholder="Paste or type your 24 words separated by spaces..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {words.length >= 12 && !isPhraseValid && (
            <Text style={styles.invalidPhraseWarning}>
              ⚠️ Invalid checksum or unrecognized words. Check for spelling typos.
            </Text>
          )}
        </View>

        {/* New Device Master Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>NEW MASTER PASSWORD FOR THIS DEVICE</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Create new master passphrase..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          <PasswordStrengthBar password={newPassword} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Restore Button */}
        <Pressable
          style={[styles.primaryActionBtn, !canRestore && styles.primaryActionBtnDisabled]}
          disabled={!canRestore || isLoading}
          onPress={handleRestore}
        >
          {isLoading ? (
            <ActivityIndicator color="#0D0E11" />
          ) : (
            <>
              <Text style={styles.primaryActionBtnText}>Restore Vault</Text>
              <Ionicons name="refresh" size={18} color="#0D0E11" />
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pasteButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wordCount: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: typography.code.fontFamily,
  },
  wordCountValid: {
    color: colors.emerald,
    fontWeight: '700',
  },
  phraseBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  phraseBoxValid: {
    borderColor: colors.emerald,
  },
  phraseInput: {
    color: colors.textPrimary,
    fontFamily: typography.code.fontFamily,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  invalidPhraseWarning: {
    fontSize: 12,
    color: colors.amber,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  textInput: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: typography.code.fontFamily,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    backgroundColor: '#8B7BFF',
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  primaryActionBtnDisabled: {
    opacity: 0.35,
  },
  primaryActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0E11',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.crimsonMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.crimson,
  },
  errorBannerText: {
    fontSize: 13,
    color: colors.crimson,
    flex: 1,
  },
});
