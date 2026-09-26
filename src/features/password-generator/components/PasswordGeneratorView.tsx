/**
 * PasswordGeneratorView Component
 * Obsidian-themed interactive cryptographic generator with real-time entropy scoring,
 * customizable character pools, and tactile regeneration feedback
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { usePasswordGenerator } from '../hooks/usePasswordGenerator';
import { GeneratorMode } from '../types';
import { useNavbarScroll } from '../../../components/navigation/NavbarScrollContext';

export interface PasswordGeneratorViewProps {
  onSelectPassword?: (password: string) => void;
  actionButtonLabel?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export function PasswordGeneratorView({
  onSelectPassword,
  actionButtonLabel = 'Use This Password',
  isModal = false,
  onClose,
}: PasswordGeneratorViewProps) {
  const scrollContext = useNavbarScroll();
  const {
    mode,
    setMode,
    passwordOptions,
    passphraseOptions,
    updatePasswordOption,
    updatePassphraseOption,
    currentValue,
    evaluation,
    regenerate,
    history,
    selectHistoryItem,
    copySecret,
    isCopied,
    remainingSeconds,
  } = usePasswordGenerator('password');

  // Tactile spin animation for regeneration button
  const spinAnim = useRef(new Animated.Value(0)).current;

  const handleRegenerate = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();

    regenerate();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleLengthDelta = (delta: number) => {
    const next = Math.max(8, Math.min(64, passwordOptions.length + delta));
    updatePasswordOption('length', next);
  };

  const handleWordCountDelta = (delta: number) => {
    const next = Math.max(3, Math.min(10, passphraseOptions.wordCount + delta));
    updatePassphraseOption('wordCount', next);
  };

  return (
    <View style={styles.container}>
      {/* Header bar if modal */}
      {isModal && (
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <View style={styles.headerIconSquircle}>
              <Ionicons name="key" size={16} color={colors.primaryLight} />
            </View>
            <Text style={styles.modalTitle}>Password Generator</Text>
          </View>
          {onClose && (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => scrollContext?.notifyScrollStart()}
        onScroll={() => scrollContext?.notifyScrollStart()}
        onScrollEndDrag={() => scrollContext?.notifyScrollEnd()}
        onMomentumScrollEnd={() => scrollContext?.notifyScrollEnd()}
      >
        {/* Output Display Card */}
        <View style={styles.outputCard}>
          <View style={styles.outputTopRow}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {mode === 'password' ? 'RANDOM PASSWORD' : 'DICEWARE PASSPHRASE'}
              </Text>
            </View>
            <View style={styles.charCountBadge}>
              <Text style={styles.charCountText}>
                {currentValue.length} {mode === 'password' ? 'CHARS' : 'CHARS'}
              </Text>
            </View>
          </View>

          {/* Generated Text View */}
          <View style={styles.secretTextContainer}>
            <Text
              style={styles.secretText}
              selectable
              numberOfLines={3}
              adjustsFontSizeToFit
            >
              {currentValue}
            </Text>
          </View>

          {/* Card Action Controls */}
          <View style={styles.outputActionsRow}>
            <Pressable
              onPress={handleRegenerate}
              style={({ pressed }) => [
                styles.actionPillButton,
                pressed && styles.actionPillPressed,
              ]}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={17} color={colors.primaryLight} />
              </Animated.View>
              <Text style={styles.actionPillText}>Regenerate</Text>
            </Pressable>

            <Pressable
              onPress={copySecret}
              style={({ pressed }) => [
                styles.actionPillButton,
                isCopied && styles.actionPillSuccess,
                pressed && styles.actionPillPressed,
              ]}
            >
              <Ionicons
                name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={isCopied ? colors.emerald : colors.textPrimary}
              />
              <Text
                style={[
                  styles.actionPillText,
                  isCopied && { color: colors.emerald, fontWeight: '700' },
                ]}
              >
                {isCopied ? `Copied (${remainingSeconds}s)` : 'Copy Secret'}
              </Text>
            </Pressable>
          </View>

          {/* Real-Time Entropy & Strength Meter */}
          <View style={styles.entropySection}>
            <View style={styles.entropyScoreRow}>
              <View style={styles.entropyBadgeGroup}>
                <View
                  style={[
                    styles.entropyStatusDot,
                    { backgroundColor: evaluation.color },
                  ]}
                />
                <Text style={[styles.entropyLabelText, { color: evaluation.color }]}>
                  {evaluation.label}
                </Text>
              </View>

              <Text style={styles.entropyBitsText}>
                {evaluation.entropyBits} bits entropy
              </Text>
            </View>

            {/* Segmented Strength Bar */}
            <View style={styles.strengthBarContainer}>
              {[0, 1, 2, 3, 4].map((step) => {
                const isActive = step <= evaluation.score;
                return (
                  <View
                    key={step}
                    style={[
                      styles.strengthSegment,
                      isActive && { backgroundColor: evaluation.color },
                    ]}
                  />
                );
              })}
            </View>

            {/* Estimated Crack Time */}
            <View style={styles.crackTimeRow}>
              <Feather name="shield" size={12} color={colors.textTertiary} />
              <Text style={styles.crackTimeText}>
                Estimated brute-force crack time: {evaluation.crackTimeDisplay}
              </Text>
            </View>
          </View>
        </View>

        {/* Mode Selector Segmented Tabs */}
        <View style={styles.modeTabs}>
          <Pressable
            onPress={() => setMode('password')}
            style={[styles.modeTab, mode === 'password' && styles.modeTabActive]}
          >
            <Ionicons
              name="key"
              size={15}
              color={mode === 'password' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                mode === 'password' && styles.modeTabTextActive,
              ]}
            >
              Password
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('passphrase')}
            style={[styles.modeTab, mode === 'passphrase' && styles.modeTabActive]}
          >
            <Ionicons
              name="text"
              size={15}
              color={mode === 'passphrase' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                mode === 'passphrase' && styles.modeTabTextActive,
              ]}
            >
              Passphrase
            </Text>
          </Pressable>
        </View>

        {/* Configuration Controls */}
        <View style={styles.configCard}>
          {mode === 'password' ? (
            <>
              {/* Length Stepper */}
              <View style={styles.configRow}>
                <View>
                  <Text style={styles.configLabel}>LENGTH</Text>
                  <Text style={styles.configDescription}>
                    Recommended: 16+ characters
                  </Text>
                </View>

                <View style={styles.stepperContainer}>
                  <Pressable
                    onPress={() => handleLengthDelta(-1)}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      pressed && styles.btnPressed,
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons name="remove" size={16} color={colors.textPrimary} />
                  </Pressable>

                  <View style={styles.stepperValueBox}>
                    <Text style={styles.stepperValueText}>
                      {passwordOptions.length}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleLengthDelta(1)}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      pressed && styles.btnPressed,
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons name="add" size={16} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Character Pool Toggles */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Uppercase Letters (A-Z)</Text>
                  <Text style={styles.toggleSub}>ABCDEF...</Text>
                </View>
                <Switch
                  value={passwordOptions.includeUppercase}
                  onValueChange={(val) => updatePasswordOption('includeUppercase', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Lowercase Letters (a-z)</Text>
                  <Text style={styles.toggleSub}>abcdef...</Text>
                </View>
                <Switch
                  value={passwordOptions.includeLowercase}
                  onValueChange={(val) => updatePasswordOption('includeLowercase', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Numbers (0-9)</Text>
                  <Text style={styles.toggleSub}>0123456789</Text>
                </View>
                <Switch
                  value={passwordOptions.includeNumbers}
                  onValueChange={(val) => updatePasswordOption('includeNumbers', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Special Symbols</Text>
                  <Text style={styles.toggleSub}>!@#$%^&*()_+-=</Text>
                </View>
                <Switch
                  value={passwordOptions.includeSymbols}
                  onValueChange={(val) => updatePasswordOption('includeSymbols', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Avoid Ambiguous Characters</Text>
                  <Text style={styles.toggleSub}>Exclude 1, l, I, 0, O, o</Text>
                </View>
                <Switch
                  value={passwordOptions.excludeAmbiguous}
                  onValueChange={(val) => updatePasswordOption('excludeAmbiguous', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          ) : (
            <>
              {/* Passphrase Word Count */}
              <View style={styles.configRow}>
                <View>
                  <Text style={styles.configLabel}>WORD COUNT</Text>
                  <Text style={styles.configDescription}>
                    BIP-39 dictionary entropy
                  </Text>
                </View>

                <View style={styles.stepperContainer}>
                  <Pressable
                    onPress={() => handleWordCountDelta(-1)}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      pressed && styles.btnPressed,
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons name="remove" size={16} color={colors.textPrimary} />
                  </Pressable>

                  <View style={styles.stepperValueBox}>
                    <Text style={styles.stepperValueText}>
                      {passphraseOptions.wordCount}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleWordCountDelta(1)}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      pressed && styles.btnPressed,
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons name="add" size={16} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Separator Selection */}
              <View style={styles.separatorSection}>
                <Text style={styles.configLabel}>WORD SEPARATOR</Text>
                <View style={styles.separatorPills}>
                  {[
                    { key: '-', label: 'Hyphen (-)' },
                    { key: '.', label: 'Period (.)' },
                    { key: '_', label: 'Underscore (_)' },
                    { key: ' ', label: 'Space ( )' },
                  ].map((sep) => {
                    const isSelected = passphraseOptions.separator === sep.key;
                    return (
                      <Pressable
                        key={sep.key}
                        onPress={() => updatePassphraseOption('separator', sep.key)}
                        style={[
                          styles.separatorPill,
                          isSelected && styles.separatorPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.separatorPillText,
                            isSelected && styles.separatorPillTextActive,
                          ]}
                        >
                          {sep.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Capitalize Words</Text>
                  <Text style={styles.toggleSub}>e.g. Correct-Horse-Battery</Text>
                </View>
                <Switch
                  value={passphraseOptions.capitalize}
                  onValueChange={(val) => updatePassphraseOption('capitalize', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Append Random Number</Text>
                  <Text style={styles.toggleSub}>Adds 2-digit number (10-99)</Text>
                </View>
                <Switch
                  value={passphraseOptions.includeNumber}
                  onValueChange={(val) => updatePassphraseOption('includeNumber', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </View>

        {/* History of Recent Passwords */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionHeader}>RECENTLY GENERATED (EPHEMERAL)</Text>
            <View style={styles.historyList}>
              {history.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => selectHistoryItem(item)}
                  style={({ pressed }) => [
                    styles.historyItem,
                    pressed && styles.historyItemPressed,
                  ]}
                >
                  <Text style={styles.historyItemText} numberOfLines={1}>
                    {item}
                  </Text>
                  <Feather name="corner-down-left" size={13} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button (When inside a form / modal) */}
      {onSelectPassword && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={() => onSelectPassword(currentValue)}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>{actionButtonLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconSquircle: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 110,
  },
  outputCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  outputTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 0.6,
  },
  charCountBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  charCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  secretTextContainer: {
    minHeight: 64,
    justifyContent: 'center',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secretText: {
    fontFamily: typography.code.fontFamily,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  outputActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionPillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  actionPillSuccess: {
    borderColor: colors.emeraldBorder,
    backgroundColor: colors.emeraldMuted,
  },
  actionPillPressed: {
    opacity: 0.75,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entropySection: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  entropyScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entropyBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entropyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entropyLabelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  entropyBitsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  strengthBarContainer: {
    flexDirection: 'row',
    gap: 4,
    height: 5,
    marginVertical: 4,
  },
  strengthSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.surfaceActive,
  },
  crackTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  crackTimeText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  modeTabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  configCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  configDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueBox: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.code.fontFamily,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  separatorSection: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  separatorPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  separatorPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  separatorPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  separatorPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  separatorPillTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 4,
  },
  historySection: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  historyList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  historyItemPressed: {
    backgroundColor: colors.surfaceActive,
  },
  historyItemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.code.fontFamily,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  bottomBar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryActionBtn: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
  },
});
