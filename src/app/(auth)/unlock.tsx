/**
 * VaultNote Vault Unlock Screen
 * Hardware-backed biometric authentication with master password fallback
 * Phase 2: Authentication, Session State & Hardware Security
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { useVaultUnlock } from '../../features/authentication/hooks/useVaultUnlock';

interface UnlockProps {
  onUnlockComplete?: () => void;
  onNavigateToRestore?: () => void;
}

export default function VaultUnlockScreen({
  onUnlockComplete,
  onNavigateToRestore,
}: UnlockProps) {
  const {
    isBiometricAvailable,
    biometricLabel,
    isAuthenticating,
    error,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    triggerBiometricUnlock,
    unlockWithMasterPassword,
  } = useVaultUnlock({
    onUnlockSuccess: onUnlockComplete,
    autoPromptBiometrics: true,
  });

  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const [isInputFocused, setIsInputFocused] = React.useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = React.useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const textInputRef = React.useRef<TextInput>(null);

  // Smooth focus and keyboard animation value
  const focusAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const isTargetCompact = isKeyboardVisible || isInputFocused;
    Animated.timing(focusAnim, {
      toValue: isTargetCompact ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [isKeyboardVisible, isInputFocused, focusAnim]);

  React.useEffect(() => {
    const onShow = () => {
      setIsKeyboardVisible(true);
    };

    const onHide = () => {
      // Clear native Android/iOS focus so tapping the field again reliably re-opens the keyboard
      textInputRef.current?.blur();
      setIsKeyboardVisible(false);
      setIsInputFocused(false);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    let willShowSub: ReturnType<typeof Keyboard.addListener> | undefined;
    let willHideSub: ReturnType<typeof Keyboard.addListener> | undefined;
    if (Platform.OS === 'ios') {
      willShowSub = Keyboard.addListener('keyboardWillShow', onShow);
      willHideSub = Keyboard.addListener('keyboardWillHide', onHide);
    }

    return () => {
      showSub.remove();
      hideSub.remove();
      willShowSub?.remove();
      willHideSub?.remove();
    };
  }, []);

  const handleFocusInput = () => {
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  const handlePasswordSubmit = async () => {
    Keyboard.dismiss();
    textInputRef.current?.blur();
    setIsVerifyingPassword(true);
    try {
      await unlockWithMasterPassword();
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleBiometricPress = () => {
    Keyboard.dismiss();
    textInputRef.current?.blur();
    triggerBiometricUnlock();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Status Bar - Fixed position that never shifts on keyboard appearance */}
          <View style={styles.topStatusRow}>
            <View style={styles.brandPill}>
              <Ionicons name="lock-closed" size={13} color={colors.primaryLight} />
              <Text style={styles.brandPillText}>VAULTNOTE</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v2.4</Text>
              </View>
            </View>

            <View style={styles.topRightGroup}>
              <View style={styles.enclaveStatusBadge}>
                <View style={styles.pulsingDot} />
                <Text style={styles.enclaveStatusText}>Enclave Protected</Text>
              </View>
            </View>
          </View>

          {/* Central Lock Squircle / Hero with 60fps Native GPU Smooth Motion */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                transform: [
                  {
                    translateY: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -22],
                    }),
                  },
                  {
                    scale: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.85],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.radarContainer,
                {
                  opacity: focusAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.2, 0],
                  }),
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.radarOuterRing} />
              <View style={styles.radarInnerRing} />
            </Animated.View>

            <View style={styles.avatarSquircle}>
              <Animated.View
                style={[
                  styles.squircleLaserLine,
                  {
                    opacity: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              />
              <View style={styles.lockEmblemContainer}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={44}
                  color={colors.primaryLight}
                />
                <View style={styles.fingerprintOverlay}>
                  <MaterialCommunityIcons
                    name="fingerprint"
                    size={22}
                    color={colors.primaryLight}
                  />
                </View>
              </View>
              <View style={styles.squircleDot} />
            </View>

            <Text style={styles.titleText}>Vault Locked</Text>
            <Animated.Text
              style={[
                styles.subtitleText,
                {
                  opacity: focusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.7],
                  }),
                },
              ]}
              numberOfLines={2}
            >
              Local cryptographic perimeter is armed. Scan credentials to open your private vault.
            </Animated.Text>
          </Animated.View>

          {/* Error Notification */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.crimson} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Master Password Input & Action Buttons Container */}
          <View style={styles.passwordContainer}>
            <View style={styles.passwordInputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>MASTER PASSWORD</Text>
              </View>

              <Pressable
                style={[
                  styles.passwordInputWrapper,
                  isInputFocused && styles.passwordInputWrapperFocused,
                ]}
                onPress={handleFocusInput}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={isInputFocused ? colors.primaryLight : colors.textTertiary}
                  style={styles.inputIconLeft}
                />
                <TextInput
                  ref={textInputRef}
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter master passphrase..."
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handlePasswordSubmit}
                  returnKeyType="done"
                  editable={!isVerifyingPassword}
                  autoFocus={false}
                  onFocus={() => {
                    setIsInputFocused(true);
                  }}
                  onBlur={() => setIsInputFocused(false)}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </Pressable>
            </View>

            {/* Action Buttons: Unlock Vault (lavender solid) & Use Biometric (dark outlined) */}
            <Pressable
              style={[
                styles.unlockButton,
                (isVerifyingPassword || isAuthenticating) && styles.buttonDisabled,
              ]}
              onPress={handlePasswordSubmit}
              disabled={isVerifyingPassword || isAuthenticating}
            >
              {isVerifyingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.unlockButtonText}>Unlock Vault</Text>
              )}
            </Pressable>

            {isBiometricAvailable && (
              <Pressable
                style={({ pressed }) => [
                  styles.useBiometricButton,
                  pressed && styles.useBiometricButtonPressed,
                  (isVerifyingPassword || isAuthenticating) && styles.buttonDisabled,
                ]}
                onPress={handleBiometricPress}
                disabled={isVerifyingPassword || isAuthenticating}
              >
                <Ionicons
                  name="scan-outline"
                  size={18}
                  color={colors.primaryLight}
                  style={styles.useBiometricIcon}
                />
                <Text style={styles.useBiometricButtonText}>Use Biometric</Text>
              </Pressable>
            )}

            {/* Recovery link directly below buttons */}
            {onNavigateToRestore && (
              <Pressable
                style={styles.restoreLinkBtn}
                onPress={onNavigateToRestore}
                disabled={isVerifyingPassword || isAuthenticating}
              >
                <Text style={styles.restoreLinkText}>Forgot master password? </Text>
                <Text style={styles.restoreLinkHighlight}>Restore with 24 Words</Text>
              </Pressable>
            )}

            {/* Air-Gapped Enclave Status Pill with smooth opacity dissolve */}
            <Animated.View
              style={[
                styles.securityAuditPill,
                {
                  opacity: focusAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.2, 0],
                  }),
                },
              ]}
              pointerEvents={isKeyboardVisible || isInputFocused ? 'none' : 'auto'}
            >
              <Ionicons name="shield-checkmark" size={13} color={colors.emerald} style={{ marginRight: 6 }} />
              <Text style={styles.securityAuditText}>
                Air-Gapped Enclave • 0KB Remote Telemetry
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  scrollContentKeyboard: {
    flexGrow: 0,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-start',
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  versionBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  versionText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  enclaveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  enclaveStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.emerald,
  },
  settingsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnPressed: {
    backgroundColor: colors.surfaceActive,
    opacity: 0.85,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
    position: 'relative',
  },
  heroSectionCompact: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  radarContainer: {
    position: 'absolute',
    top: -46,
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 240,
  },
  radarOuterRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.08)',
  },
  radarInnerRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.14)',
  },
  avatarSquircle: {
    width: 124,
    height: 124,
    borderRadius: 28,
    backgroundColor: '#0E111B',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarSquircleCompact: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderColor: 'rgba(123, 97, 255, 0.35)',
  },
  squircleLaserLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(123, 97, 255, 0.3)',
    top: '50%',
  },
  lockEmblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fingerprintOverlay: {
    position: 'absolute',
    bottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintOverlayCompact: {
    bottom: 2,
  },
  squircleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.emerald,
    marginTop: 8,
  },
  squircleDotCompact: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  titleTextCompact: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 3,
  },
  subtitleText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18,
  },
  subtitleTextCompact: {
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 280,
    marginBottom: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.crimson,
    fontWeight: '500',
  },
  passwordContainer: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  passwordContainerCompact: {
    width: '100%',
    gap: spacing.sm + 2,
    marginTop: spacing.md,
  },
  passwordInputGroup: {
    gap: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  passwordInputWrapperCompact: {
    height: 48,
  },
  passwordInputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIconLeft: {
    marginRight: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.code.fontFamily,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  unlockButton: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockButtonCompact: {
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  unlockButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  useBiometricButton: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBiometricButtonCompact: {
    height: 48,
  },
  useBiometricButtonPressed: {
    backgroundColor: colors.surfaceActive,
    opacity: 0.85,
  },
  useBiometricIcon: {
    marginRight: spacing.sm,
  },
  useBiometricButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  restoreLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  restoreLinkBtnCompact: {
    marginTop: 2,
    paddingVertical: 2,
  },
  restoreLinkText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  restoreLinkHighlight: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
    textDecorationLine: 'underline',
  },
  securityAuditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  securityAuditText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
