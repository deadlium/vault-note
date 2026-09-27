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
import { colors, radius, spacing, typography, useTheme } from '../../theme';
import { useMasterPasswordSetup } from '../../features/authentication/hooks/useMasterPasswordSetup';
import { PasswordStrengthBar } from '../../features/authentication/components/PasswordStrengthBar';
import { MnemonicGrid } from '../../features/authentication/components/MnemonicGrid';
import { copyToClipboard } from '../../core/clipboard';

interface SetupProps {
  onComplete?: () => void;
  onNavigateToRestore?: () => void;
}

export default function MasterPasswordSetupScreen({ onComplete, onNavigateToRestore }: SetupProps) {
  const { colors: themeColors, isDark } = useTheme();
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
    <SafeAreaView
      style={[
        styles.safeArea,
        !isDark && { backgroundColor: themeColors.background },
      ]}
    >
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
              <View
                style={[
                  styles.brandPill,
                  !isDark && {
                    backgroundColor: themeColors.surfaceElevated,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed"
                  size={14}
                  color={isDark ? colors.primaryLight : themeColors.primary}
                />
                <Text
                  style={[
                    styles.brandPillText,
                    !isDark && { color: themeColors.textPrimary },
                  ]}
                >
                  VAULTNOTE
                </Text>
                <View
                  style={[
                    styles.versionBadge,
                    !isDark && { backgroundColor: themeColors.surfaceActive },
                  ]}
                >
                  <Text
                    style={[
                      styles.versionText,
                      !isDark && { color: themeColors.textSecondary },
                    ]}
                  >
                    v2.4
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.enclaveActivePill,
                  !isDark && {
                    backgroundColor: themeColors.emeraldMuted,
                    borderColor: themeColors.emeraldBorder,
                  },
                ]}
              >
                <View style={styles.greenPulseDot} />
                <Text
                  style={[
                    styles.enclaveActiveText,
                    !isDark && { color: themeColors.emerald },
                  ]}
                >
                  Local Enclave Active
                </Text>
              </View>
            </View>

            {/* Hero Card */}
            <View
              style={[
                styles.heroCard,
                !isDark && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.04,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 6,
                  elevation: 1,
                },
              ]}
            >
              <View
                style={[
                  styles.heroIconBox,
                  !isDark && {
                    backgroundColor: themeColors.surfaceElevated,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color={isDark ? colors.primaryLight : themeColors.primary}
                />
              </View>
              <Text
                style={[
                  styles.heroSubText,
                  !isDark && { color: themeColors.textSecondary },
                ]}
              >
                AIR-GAPPED PROTOCOL •{' '}
                <Text
                  style={[
                    styles.heroEmeraldText,
                    !isDark && { color: themeColors.emerald },
                  ]}
                >
                  0KB TELEMETRY
                </Text>
              </Text>
            </View>

            {/* Headline & Subtitle */}
            <View style={styles.heroTitles}>
              <Text
                style={[
                  styles.heroHeading,
                  !isDark && { color: themeColors.textPrimary },
                ]}
              >
                Build your private vault
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  !isDark && { color: themeColors.textSecondary },
                ]}
              >
                Store passwords, secure notes, TOTP codes and sensitive information directly on your device.
              </Text>
            </View>

            {/* Feature Cards Grid */}
            <View style={styles.featuresList}>
              {/* Feature 1 */}
              <View
                style={[
                  styles.featureCard,
                  !isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.borderSubtle,
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 6,
                    elevation: 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    !isDark && { backgroundColor: themeColors.surfaceElevated },
                  ]}
                >
                  <Ionicons name="cloud-offline-outline" size={20} color={colors.emerald} />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text
                      style={[
                        styles.featureTitle,
                        !isDark && { color: themeColors.textPrimary },
                      ]}
                    >
                      Offline by default
                    </Text>
                    <View
                      style={[
                        styles.zeroCloudBadge,
                        !isDark && { backgroundColor: themeColors.emeraldMuted },
                      ]}
                    >
                      <Text
                        style={[
                          styles.zeroCloudText,
                          !isDark && { color: themeColors.emerald },
                        ]}
                      >
                        Zero Cloud
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.featureDesc,
                      !isDark && { color: themeColors.textSecondary },
                    ]}
                  >
                    No server ping, zero cloud telemetry, 100% local encrypted storage.
                  </Text>
                </View>
              </View>

              {/* Feature 2 */}
              <View
                style={[
                  styles.featureCard,
                  !isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.borderSubtle,
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 6,
                    elevation: 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    !isDark && { backgroundColor: themeColors.surfaceElevated },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={isDark ? colors.primaryLight : themeColors.primary}
                  />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text
                      style={[
                        styles.featureTitle,
                        !isDark && { color: themeColors.textPrimary },
                      ]}
                    >
                      End-to-end encrypted
                    </Text>
                    <View
                      style={[
                        styles.aesBadge,
                        !isDark && { backgroundColor: themeColors.primaryMuted },
                      ]}
                    >
                      <Text
                        style={[
                          styles.aesBadgeText,
                          !isDark && { color: themeColors.primary },
                        ]}
                      >
                        AES-256
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.featureDesc,
                      !isDark && { color: themeColors.textSecondary },
                    ]}
                  >
                    AES-256-GCM + Argon2id cryptographic key derivation.
                  </Text>
                </View>
              </View>

              {/* Feature 3 */}
              <View
                style={[
                  styles.featureCard,
                  !isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.borderSubtle,
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 6,
                    elevation: 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    !isDark && { backgroundColor: themeColors.surfaceElevated },
                  ]}
                >
                  <Ionicons name="finger-print-outline" size={20} color={colors.gold} />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text
                      style={[
                        styles.featureTitle,
                        !isDark && { color: themeColors.textPrimary },
                      ]}
                    >
                      Biometric protection
                    </Text>
                    <View
                      style={[
                        styles.enclaveBadge,
                        !isDark && { backgroundColor: themeColors.amberMuted },
                      ]}
                    >
                      <Text
                        style={[
                          styles.enclaveBadgeText,
                          !isDark && { color: themeColors.amber },
                        ]}
                      >
                        Enclave
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.featureDesc,
                      !isDark && { color: themeColors.textSecondary },
                    ]}
                  >
                    Seamless Face ID / Fingerprint hardware enclave unlocking.
                  </Text>
                </View>
              </View>

              {/* Feature 4 */}
              <View
                style={[
                  styles.featureCard,
                  !isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.borderSubtle,
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 6,
                    elevation: 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    !isDark && { backgroundColor: themeColors.surfaceElevated },
                  ]}
                >
                  <Ionicons name="code-slash-outline" size={20} color={colors.cyan} />
                </View>
                <View style={styles.featureBody}>
                  <View style={styles.featureTitleRow}>
                    <Text
                      style={[
                        styles.featureTitle,
                        !isDark && { color: themeColors.textPrimary },
                      ]}
                    >
                      Open source
                    </Text>
                    <View
                      style={[
                        styles.auditedBadge,
                        !isDark && { backgroundColor: themeColors.cyanMuted },
                      ]}
                    >
                      <Text
                        style={[
                          styles.auditedBadgeText,
                          !isDark && { color: themeColors.cyan },
                        ]}
                      >
                        Audited
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.featureDesc,
                      !isDark && { color: themeColors.textSecondary },
                    ]}
                  >
                    Transparent code audited by security researchers.
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.buttonGroup}>
              <Pressable
                style={[
                  styles.createVaultBtn,
                  !isDark && { backgroundColor: '#4F46E5' },
                ]}
                onPress={startSetup}
              >
                <Ionicons
                  name="shield-outline"
                  size={18}
                  color={isDark ? '#0D0E11' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.createVaultBtnText,
                    !isDark && { color: '#FFFFFF' },
                  ]}
                >
                  Create Vault
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.restoreVaultBtn,
                  !isDark && {
                    backgroundColor: themeColors.surfaceElevated,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={onNavigateToRestore ?? (() => setStep('password'))}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={themeColors.textPrimary}
                />
                <Text
                  style={[
                    styles.restoreVaultBtnText,
                    !isDark && { color: themeColors.textPrimary },
                  ]}
                >
                  Restore Existing Vault
                </Text>
              </Pressable>

              <View style={styles.trustFooter}>
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.emerald} />
                <Text
                  style={[
                    styles.trustFooterText,
                    !isDark && { color: themeColors.textSecondary },
                  ]}
                >
                  Zero tracking. No email required.
                </Text>
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
              <Pressable
                style={[
                  styles.backBtn,
                  !isDark && { backgroundColor: themeColors.surfaceElevated },
                ]}
                onPress={() => setStep('welcome')}
              >
                <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
              </Pressable>
              <Text
                style={[
                  styles.stepTitle,
                  !isDark && { color: themeColors.textPrimary },
                ]}
              >
                Define Master Password
              </Text>
              <View style={{ width: 32 }} />
            </View>

            <Text
              style={[
                styles.stepSubtitle,
                !isDark && { color: themeColors.textSecondary },
              ]}
            >
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
              <Text
                style={[
                  styles.inputLabel,
                  !isDark && { color: themeColors.textTertiary },
                ]}
              >
                MASTER PASSWORD
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  !isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.textInput,
                    !isDark && { color: themeColors.textPrimary },
                  ]}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter high-entropy passphrase..."
                  placeholderTextColor={isDark ? colors.textTertiary : themeColors.textTertiary}
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
                    color={themeColors.textSecondary}
                  />
                </Pressable>
              </View>

              {/* Password Strength Scorer */}
              <PasswordStrengthBar password={password} />
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  !isDark && { color: themeColors.textTertiary },
                ]}
              >
                CONFIRM PASSWORD
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  !isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.textInput,
                    !isDark && { color: themeColors.textPrimary },
                  ]}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm passphrase..."
                  placeholderTextColor={isDark ? colors.textTertiary : themeColors.textTertiary}
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
                    color={themeColors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[
                styles.primaryActionBtn,
                !canProceedFromPassword && styles.primaryActionBtnDisabled,
                !isDark && { backgroundColor: '#4F46E5' },
              ]}
              disabled={!canProceedFromPassword}
              onPress={submitMasterPassword}
            >
              <Text
                style={[
                  styles.primaryActionBtnText,
                  !isDark && { color: '#FFFFFF' },
                ]}
              >
                Generate Emergency Recovery Kit
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={isDark ? '#0D0E11' : '#FFFFFF'}
              />
            </Pressable>
          </View>
        )}

        {/* ========================================================== */}
        {/* STEP 3: BIP-39 24-WORD RECOVERY PHRASE DISPLAY */}
        {/* ========================================================== */}
        {step === 'recovery_phrase' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Pressable
                style={[
                  styles.backBtn,
                  !isDark && { backgroundColor: themeColors.surfaceElevated },
                ]}
                onPress={() => setStep('password')}
              >
                <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
              </Pressable>
              <Text
                style={[
                  styles.stepTitle,
                  !isDark && { color: themeColors.textPrimary },
                ]}
              >
                Emergency Recovery Kit
              </Text>
              <View style={{ width: 32 }} />
            </View>

            <Text
              style={[
                styles.stepSubtitle,
                !isDark && { color: themeColors.textSecondary },
              ]}
            >
              These 24 words can restore your vault if your device is lost or damaged. Write them down and keep them offline.
            </Text>

            <MnemonicGrid
              words={mnemonicWords}
              onCopy={handleCopyWords}
              copied={copiedWords}
            />

            <Pressable
              style={[
                styles.primaryActionBtn,
                !isDark && { backgroundColor: '#4F46E5' },
              ]}
              onPress={proceedToVerification}
            >
              <Text
                style={[
                  styles.primaryActionBtnText,
                  !isDark && { color: '#FFFFFF' },
                ]}
              >
                I Have Backed Up These Words
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={isDark ? '#0D0E11' : '#FFFFFF'}
              />
            </Pressable>
          </View>
        )}

        {/* ========================================================== */}
        {/* STEP 4: VERIFICATION QUIZ */}
        {/* ========================================================== */}
        {step === 'verify_phrase' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Pressable
                style={[
                  styles.backBtn,
                  !isDark && { backgroundColor: themeColors.surfaceElevated },
                ]}
                onPress={() => setStep('recovery_phrase')}
              >
                <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
              </Pressable>
              <Text
                style={[
                  styles.stepTitle,
                  !isDark && { color: themeColors.textPrimary },
                ]}
              >
                Verify Recovery Phrase
              </Text>
              <View style={{ width: 32 }} />
            </View>

            <Text
              style={[
                styles.stepSubtitle,
                !isDark && { color: themeColors.textSecondary },
              ]}
            >
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
                <View
                  key={q.wordNumber}
                  style={[
                    styles.quizCard,
                    !isDark && {
                      backgroundColor: themeColors.surface,
                      borderColor: themeColors.border,
                      shadowColor: '#0F172A',
                      shadowOpacity: 0.04,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 6,
                      elevation: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quizQuestionLabel,
                      !isDark && { color: themeColors.textTertiary },
                    ]}
                  >
                    SELECT WORD #{q.wordNumber.toString().padStart(2, '0')}
                  </Text>
                  <View style={styles.quizOptionsRow}>
                    {q.options.map((opt) => {
                      const isChosen = selected === opt;
                      return (
                        <Pressable
                          key={opt}
                          style={[
                            styles.quizOptionBtn,
                            !isDark && {
                              backgroundColor: themeColors.surfaceElevated,
                              borderColor: themeColors.borderSubtle,
                            },
                            isChosen && styles.quizOptionBtnSelected,
                            isChosen &&
                              !isDark && {
                                backgroundColor: themeColors.primaryMuted,
                                borderColor: themeColors.primary,
                              },
                          ]}
                          onPress={() => answerQuizQuestion(q.wordNumber, opt)}
                        >
                          <Text
                            style={[
                              styles.quizOptionText,
                              !isDark && { color: themeColors.textSecondary },
                              isChosen && styles.quizOptionTextSelected,
                              isChosen &&
                                !isDark && { color: themeColors.primary },
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
              style={[
                styles.primaryActionBtn,
                !allQuizAnswered && styles.primaryActionBtnDisabled,
                !isDark && { backgroundColor: '#4F46E5' },
              ]}
              disabled={!allQuizAnswered || isLoading}
              onPress={finalizeVaultInitialization}
            >
              {isLoading ? (
                <ActivityIndicator color={isDark ? '#0D0E11' : '#FFFFFF'} />
              ) : (
                <>
                  <Text
                    style={[
                      styles.primaryActionBtnText,
                      !isDark && { color: '#FFFFFF' },
                    ]}
                  >
                    Initialize Secure Vault
                  </Text>
                  <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={isDark ? '#0D0E11' : '#FFFFFF'}
                  />
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
            <ActivityIndicator
              size="large"
              color={isDark ? colors.primaryLight : themeColors.primary}
            />
            <Text
              style={[
                styles.initTitle,
                !isDark && { color: themeColors.textPrimary },
              ]}
            >
              Securing Vault Perimeter
            </Text>
            <Text
              style={[
                styles.initSubtitle,
                !isDark && { color: themeColors.textSecondary },
              ]}
            >
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
            <Text
              style={[
                styles.initTitle,
                !isDark && { color: themeColors.textPrimary },
              ]}
            >
              Vault Ready & Encrypted
            </Text>
            <Text
              style={[
                styles.initSubtitle,
                !isDark && { color: themeColors.textSecondary },
              ]}
            >
              Your master key is isolated in hardware. Zero telemetry. 100% offline security active.
            </Text>

            <Pressable
              style={[
                styles.primaryActionBtn,
                !isDark && { backgroundColor: '#4F46E5' },
              ]}
              onPress={onComplete}
            >
              <Text
                style={[
                  styles.primaryActionBtnText,
                  !isDark && { color: '#FFFFFF' },
                ]}
              >
                Enter Vault
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={isDark ? '#0D0E11' : '#FFFFFF'}
              />
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
