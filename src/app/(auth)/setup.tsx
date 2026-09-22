/**
 * VaultNote Master Password Onboarding & First Time Setup Screen
 * Pixel-matched with design/first_time_setup.png
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
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { useMasterPasswordSetup } from '../../features/authentication/hooks/useMasterPasswordSetup';
import { PasswordStrengthBar } from '../../features/authentication/components/PasswordStrengthBar';
import { MnemonicGrid } from '../../features/authentication/components/MnemonicGrid';
import { copyToClipboard } from '../../core/clipboard';

interface SetupProps {
  onComplete?: () => void;
  onNavigateToRestore?: () => void;
}

export default function MasterPasswordSetupScreen({ onComplete, onNavigateToRestore }: SetupProps) {
  const {
    step,
    setStep,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    canProceedFromPassword,
    mnemonicWords,
    quizQuestions,
    quizAnswers,
    answerQuizQuestion,
    error,
    isLoading,
    startSetup,
    submitMasterPassword,
    proceedToVerification,
    finalizeVaultInitialization,
  } = useMasterPasswordSetup();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copiedWords, setCopiedWords] = useState(false);

  const handleCopyWords = async () => {
    if (mnemonicWords && mnemonicWords.length > 0) {
      const phrase = mnemonicWords.join(' ');
      await copyToClipboard(phrase, { isSensitive: true, label: 'Emergency Recovery Kit' });
      setCopiedWords(true);
      setTimeout(() => setCopiedWords(false), 2500);
    }
  };

  const allQuizAnswered = quizQuestions.length > 0 &&
    quizQuestions.every((q) => Boolean(quizAnswers[q.wordNumber]));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================== */}
        {/* STEP 1: WELCOME SCREEN (Pixel-matched to first_time_setup.png) */}
        {/* ========================================================== */}
        {step === 'welcome' && (
          <View style={styles.welcomeContainer}>
            {/* Top Status Badges */}
            <View style={styles.topBadgesRow}>
              <View style={styles.brandPill}>
                <Ionicons name="lock-closed" size={14} color={colors.primaryLight} />
                <Text style={styles.brandPillText}>VAULTNOTE</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v2.4</Text>
                </View>
              </View>

              <View style={styles.enclaveActivePill}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.enclaveActiveText}>Local Enclave Active</Text>
              </View>
            </View>

            {/* Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroIconBox}>
                <Ionicons name="lock-closed" size={24} color={colors.primaryLight} />
              </View>
              <Text style={styles.heroSubText}>
                AIR-GAPPED PROTOCOL • <Text style={styles.heroEmeraldText}>0KB TELEMETRY</Text>
              </Text>
            </View>

            {/* Headline & Subtitle */}
            <View style={styles.heroTitles}>
              <Text style={styles.heroHeading}>Build your private vault</Text>
              <Text style={styles.heroSubtitle}>
                Store passwords, secure notes, TOTP codes and sensitive information directly on your device.
              </Text>
            </View>

            {/* Feature Cards Grid */}
            <View style={styles.featuresList}>
              {/* Feature 1 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="cloud-offline-outline" size={20} color={colors.emerald} />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text style={styles.featureTitle}>Offline by default</Text>
                    <View style={styles.zeroCloudBadge}>
                      <Text style={styles.zeroCloudText}>Zero Cloud</Text>
                    </View>
                  </View>
                  <Text style={styles.featureDesc}>
                    No server ping, zero cloud telemetry, 100% local encrypted storage.
                  </Text>
                </View>
              </View>

              {/* Feature 2 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryLight} />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text style={styles.featureTitle}>End-to-end encrypted</Text>
                    <View style={styles.aesBadge}>
                      <Text style={styles.aesBadgeText}>AES-256</Text>
                    </View>
                  </View>
                  <Text style={styles.featureDesc}>
                    AES-256-GCM + Argon2id cryptographic key derivation.
                  </Text>
                </View>
              </View>

              {/* Feature 3 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="finger-print-outline" size={20} color={colors.gold} />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text style={styles.featureTitle}>Biometric protection</Text>
                    <View style={styles.enclaveBadge}>
                      <Text style={styles.enclaveBadgeText}>Enclave</Text>
                    </View>
                  </View>
                  <Text style={styles.featureDesc}>
                    Seamless Face ID / Fingerprint hardware enclave unlocking.
                  </Text>
                </View>
              </View>

              {/* Feature 4 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="code-slash-outline" size={20} color={colors.cyan} />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text style={styles.featureTitle}>Open source</Text>
                    <View style={styles.auditedBadge}>
                      <Text style={styles.auditedBadgeText}>Audited</Text>
                    </View>
                  </View>
                  <Text style={styles.featureDesc}>
                    Transparent code audited by security researchers.
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.buttonGroup}>
              <Pressable style={styles.createVaultBtn} onPress={startSetup}>
                <Ionicons name="shield-outline" size={18} color="#0D0E11" />
                <Text style={styles.createVaultBtnText}>Create Vault</Text>
              </Pressable>

              <Pressable
                style={styles.restoreVaultBtn}
                onPress={onNavigateToRestore ?? (() => setStep('password'))}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.restoreVaultBtnText}>Restore Existing Vault</Text>
              </Pressable>

              <View style={styles.trustFooter}>
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.emerald} />
                <Text style={styles.trustFooterText}>Zero tracking. No email required.</Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* STEP 2: MASTER PASSWORD DEFINITION */}
        {/* ========================================================== */}
        {step === 'password' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Pressable style={styles.backBtn} onPress={() => setStep('welcome')}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.stepTitle}>Define Master Password</Text>
              <View style={{ width: 32 }} />
            </View>

            <Text style={styles.stepSubtitle}>
              This password is the sole key used to derive your 256-bit Key Encryption Key (KEK) via Argon2id. It never leaves your device.
            </Text>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.crimson} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MASTER PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter high-entropy passphrase..."
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

              {/* Password Strength Scorer */}
              <PasswordStrengthBar password={password} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm passphrase..."
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.primaryActionBtn, !canProceedFromPassword && styles.primaryActionBtnDisabled]}
              disabled={!canProceedFromPassword}
              onPress={submitMasterPassword}
            >
              <Text style={styles.primaryActionBtnText}>Generate Emergency Recovery Kit</Text>
              <Ionicons name="arrow-forward" size={18} color="#0D0E11" />
            </Pressable>
          </View>
        )}

        {/* ========================================================== */}
        {/* STEP 3: BIP-39 24-WORD RECOVERY PHRASE DISPLAY */}
        {/* ========================================================== */}
        {step === 'recovery_phrase' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Pressable style={styles.backBtn} onPress={() => setStep('password')}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.stepTitle}>Emergency Recovery Kit</Text>
              <View style={{ width: 32 }} />
            </View>

            <Text style={styles.stepSubtitle}>
              These 24 words can restore your vault if your device is lost or damaged. Write them down and keep them offline.
            </Text>

            <MnemonicGrid
              words={mnemonicWords}
              onCopy={handleCopyWords}
              copied={copiedWords}
            />

            <Pressable style={styles.primaryActionBtn} onPress={proceedToVerification}>
              <Text style={styles.primaryActionBtnText}>I Have Backed Up These Words</Text>
              <Ionicons name="arrow-forward" size={18} color="#0D0E11" />
            </Pressable>
          </View>
        )}

        {/* ========================================================== */}
        {/* STEP 4: VERIFICATION QUIZ */}
        {/* ========================================================== */}
        {step === 'verify_phrase' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Pressable style={styles.backBtn} onPress={() => setStep('recovery_phrase')}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.stepTitle}>Verify Recovery Phrase</Text>
              <View style={{ width: 32 }} />
            </View>

            <Text style={styles.stepSubtitle}>
              Confirm that you wrote down the words correctly by selecting the matching words below.
            </Text>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.crimson} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {quizQuestions.map((q) => {
              const selected = quizAnswers[q.wordNumber];
              return (
                <View key={q.wordNumber} style={styles.quizCard}>
                  <Text style={styles.quizQuestionLabel}>
                    SELECT WORD #{q.wordNumber.toString().padStart(2, '0')}
                  </Text>
                  <View style={styles.quizOptionsRow}>
                    {q.options.map((opt) => {
                      const isChosen = selected === opt;
                      return (
                        <Pressable
                          key={opt}
                          style={[styles.quizOptionBtn, isChosen && styles.quizOptionBtnSelected]}
                          onPress={() => answerQuizQuestion(q.wordNumber, opt)}
                        >
                          <Text
                            style={[
                              styles.quizOptionText,
                              isChosen && styles.quizOptionTextSelected,
                            ]}
                          >
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <Pressable
              style={[styles.primaryActionBtn, !allQuizAnswered && styles.primaryActionBtnDisabled]}
              disabled={!allQuizAnswered || isLoading}
              onPress={finalizeVaultInitialization}
            >
              {isLoading ? (
                <ActivityIndicator color="#0D0E11" />
              ) : (
                <>
                  <Text style={styles.primaryActionBtnText}>Initialize Secure Vault</Text>
                  <Ionicons name="shield-checkmark" size={18} color="#0D0E11" />
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* ========================================================== */}
        {/* STEP 5: INITIALIZING SPINNER */}
        {/* ========================================================== */}
        {step === 'initializing' && (
          <View style={styles.centeredStep}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.initTitle}>Securing Vault Perimeter</Text>
            <Text style={styles.initSubtitle}>
              Deriving Argon2id keys, generating hardware enclave credentials, and encrypting database...
            </Text>
          </View>
        )}

        {/* ========================================================== */}
        {/* STEP 6: SETUP COMPLETE */}
        {/* ========================================================== */}
        {step === 'complete' && (
          <View style={styles.centeredStep}>
            <View style={styles.successIconBox}>
              <Ionicons name="shield-checkmark" size={48} color={colors.emerald} />
            </View>
            <Text style={styles.initTitle}>Vault Ready & Encrypted</Text>
            <Text style={styles.initSubtitle}>
              Your master key is isolated in hardware. Zero telemetry. 100% offline security active.
            </Text>

            <Pressable style={styles.primaryActionBtn} onPress={onComplete}>
              <Text style={styles.primaryActionBtnText}>Enter Vault</Text>
              <Ionicons name="arrow-forward" size={18} color="#0D0E11" />
            </Pressable>
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  welcomeContainer: {
    gap: spacing.lg,
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    gap: 6,
  },
  brandPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  versionBadge: {
    backgroundColor: colors.surfaceActive,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  versionText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: typography.code.fontFamily,
  },
  enclaveActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    gap: 6,
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  enclaveActiveText: {
    fontSize: 12,
    color: colors.emerald,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderFocus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.code.fontFamily,
    letterSpacing: 0.5,
  },
  heroEmeraldText: {
    color: colors.emerald,
    fontWeight: '700',
  },
  heroTitles: {
    gap: spacing.xs,
  },
  heroHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBody: {
    flex: 1,
    gap: 4,
  },
  featureTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  zeroCloudBadge: {
    backgroundColor: colors.emeraldMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  zeroCloudText: {
    fontSize: 10,
    color: colors.emerald,
    fontFamily: typography.code.fontFamily,
    fontWeight: '600',
  },
  aesBadge: {
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  aesBadgeText: {
    fontSize: 10,
    color: colors.primaryLight,
    fontFamily: typography.code.fontFamily,
    fontWeight: '600',
  },
  enclaveBadge: {
    backgroundColor: colors.amberMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  enclaveBadgeText: {
    fontSize: 10,
    color: colors.amber,
    fontFamily: typography.code.fontFamily,
    fontWeight: '600',
  },
  auditedBadge: {
    backgroundColor: colors.cyanMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  auditedBadgeText: {
    fontSize: 10,
    color: colors.cyan,
    fontFamily: typography.code.fontFamily,
    fontWeight: '600',
  },
  buttonGroup: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  createVaultBtn: {
    flexDirection: 'row',
    backgroundColor: '#8B7BFF', // Lavender purple as in design png
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  createVaultBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0E11',
  },
  restoreVaultBtn: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  restoreVaultBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  trustFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.code.fontFamily,
  },
  stepContainer: {
    gap: spacing.lg,
  },
  stepHeader: {
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
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  quizCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  quizQuestionLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: typography.code.fontFamily,
    fontWeight: '700',
  },
  quizOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quizOptionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quizOptionBtnSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  quizOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.code.fontFamily,
  },
  quizOptionTextSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  centeredStep: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: spacing.md,
  },
  initTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  initSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
