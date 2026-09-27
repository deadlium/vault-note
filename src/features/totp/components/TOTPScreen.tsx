/**
 * TOTP Authenticator Screen
 * Main authenticated tab screen providing direct tab switching between QR Scanner,
 * Manual Key entry, and enrolled Authenticator codes with duplicate auto-merge.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, useTheme } from '../../../theme';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultItem, AnyVaultPayload } from '../../../types/vault';
import { ServiceIcon } from '../../../components/icon/ServiceIcon';
import { QRScanner } from '../scanner/QRScanner';
import { TOTPRow } from './TOTPRow';
import { autoEnrollTOTP, AutoEnrollResult } from '../services/totpAutoEnrollment';
import { TOTPAlgorithm } from '../types';
import { useNavbarScroll } from '../../../components/navigation/NavbarScrollContext';

export interface TOTPScreenProps {
  onOpenItem?: (item: VaultItem<AnyVaultPayload>) => void;
}

type ScreenMode = 'scanner' | 'manual' | 'result' | 'list';

export function TOTPScreen({ onOpenItem }: TOTPScreenProps) {
  const { isDark, colors: activeColors } = useTheme();
  const scrollContext = useNavbarScroll();
  const items = useVaultStore((s) => s.items);

  // Filter vault items that have 2FA enabled
  const totpItems = items.filter((item) => {
    if (item.type === 'TOTP') return true;
    const p = (item.payload as unknown as Record<string, unknown>) || {};
    return Boolean(p.totpSecret || p.secret);
  });

  const [mode, setMode] = useState<ScreenMode>(totpItems.length > 0 ? 'list' : 'manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<AutoEnrollResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual input form states
  const [manualIssuer, setManualIssuer] = useState('');
  const [manualAccount, setManualAccount] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [manualAlgorithm, setManualAlgorithm] = useState<TOTPAlgorithm>('SHA1');
  const [manualDigits, setManualDigits] = useState<number>(6);
  const [manualPeriod, setManualPeriod] = useState<number>(30);

  const handleScan = async (scannedData: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await autoEnrollTOTP(scannedData);
      setLastResult(result);
      setMode('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse TOTP QR code.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEnroll = async () => {
    if (!manualSecret.trim()) {
      setErrorMessage('Please enter a Base32 secret key.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await autoEnrollTOTP({
        issuer: manualIssuer.trim() || 'Authenticator',
        account: manualAccount.trim(),
        secret: manualSecret.trim(),
        algorithm: manualAlgorithm,
        digits: manualDigits,
        period: manualPeriod,
      });
      setLastResult(result);
      setMode('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save TOTP secret.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: activeColors.borderSubtle }]}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.headerIconSquircle, !isDark && { backgroundColor: 'rgba(79, 70, 229, 0.10)', borderColor: 'rgba(79, 70, 229, 0.25)' }]}>
            <Ionicons name="qr-code" size={18} color={!isDark ? activeColors.primary : colors.primaryLight} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: activeColors.textPrimary }]}>TOTP Authenticator</Text>
            <Text style={[styles.headerSubtitle, { color: activeColors.textSecondary }]}>
              RFC 6238 • Auto-Enrollment
            </Text>
          </View>
        </View>

        <View style={styles.headerBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.headerBadgeText}>
            {totpItems.length} Enrolled
          </Text>
        </View>
      </View>

      {/* Top Segmented Tabs: Direct access to Scan QR, Manual Key, and Codes */}
      <View style={[styles.topTabsWrapper, { backgroundColor: activeColors.background, borderBottomColor: activeColors.borderSubtle }]}>
        <View style={[styles.topTabsContainer, { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border }]}>
          <Pressable
            onPress={() => {
              setErrorMessage(null);
              setMode('scanner');
            }}
            style={[
              styles.topTabButton,
              mode === 'scanner' && [styles.topTabButtonActive, { backgroundColor: activeColors.primary }],
            ]}
          >
            <Ionicons
              name="qr-code-outline"
              size={14}
              color={mode === 'scanner' ? '#FFFFFF' : activeColors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.topTabText,
                { color: mode === 'scanner' ? '#FFFFFF' : activeColors.textSecondary },
                mode === 'scanner' && styles.topTabTextActive,
              ]}
            >
              Scan QR
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setErrorMessage(null);
              setMode('manual');
            }}
            style={[
              styles.topTabButton,
              mode === 'manual' && [styles.topTabButtonActive, { backgroundColor: activeColors.primary }],
            ]}
          >
            <Ionicons
              name="key-outline"
              size={14}
              color={mode === 'manual' ? '#FFFFFF' : activeColors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.topTabText,
                { color: mode === 'manual' ? '#FFFFFF' : activeColors.textSecondary },
                mode === 'manual' && styles.topTabTextActive,
              ]}
            >
              Manual Key
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setErrorMessage(null);
              setMode('list');
            }}
            style={[
              styles.topTabButton,
              mode === 'list' && [styles.topTabButtonActive, { backgroundColor: activeColors.primary }],
            ]}
          >
            <Ionicons
              name="timer-outline"
              size={14}
              color={mode === 'list' ? '#FFFFFF' : activeColors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.topTabText,
                { color: mode === 'list' ? '#FFFFFF' : activeColors.textSecondary },
                mode === 'list' && styles.topTabTextActive,
              ]}
            >
              My Codes ({totpItems.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContainer}>
        {/* MODE 1: Direct Active QR Scanner (No mid-screen button) */}
        {mode === 'scanner' && (
          <View style={styles.scannerWrapper}>
            <QRScanner
              onScan={handleScan}
              isProcessing={isProcessing}
            />

            {/* Error Banner if scan fails */}
            {Boolean(errorMessage) && (
              <View style={styles.errorOverlayBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.crimson} />
                <Text style={styles.errorOverlayText}>{errorMessage}</Text>
                <Pressable
                  onPress={() => setErrorMessage(null)}
                  style={styles.errorDismissBtn}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* MODE 2: Direct Manual Form (Directly accessible via top tab) */}
        {mode === 'manual' && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.manualFormContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.manualCard, !isDark && { backgroundColor: activeColors.surface, borderColor: activeColors.border, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 }]}>
                <View style={styles.manualCardHeader}>
                  <Ionicons name="key" size={18} color={!isDark ? activeColors.primary : colors.primaryLight} />
                  <Text style={[styles.manualCardTitle, !isDark && { color: activeColors.textPrimary }]}>Manual Authenticator Setup</Text>
                </View>
                <Text style={[styles.manualCardSubtitle, !isDark && { color: activeColors.textSecondary }]}>
                  Enter the secret key provided by your service (e.g. GitHub, Google)
                </Text>

                {/* Service / Issuer */}
                <View style={styles.formFieldGroup}>
                  <Text style={[styles.formFieldLabel, !isDark && { color: activeColors.textSecondary }]}>SERVICE OR WEBSITE</Text>
                  <View style={[styles.formInputContainer, !isDark && { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border }]}>
                    <TextInput
                      value={manualIssuer}
                      onChangeText={setManualIssuer}
                      placeholder="e.g. GitHub, Google, Discord"
                      placeholderTextColor={activeColors.textTertiary}
                      style={[styles.formTextInput, !isDark && { color: activeColors.textPrimary }]}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Account / Username / Email */}
                <View style={styles.formFieldGroup}>
                  <Text style={[styles.formFieldLabel, !isDark && { color: activeColors.textSecondary }]}>ACCOUNT NAME OR EMAIL</Text>
                  <View style={[styles.formInputContainer, !isDark && { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border }]}>
                    <TextInput
                      value={manualAccount}
                      onChangeText={setManualAccount}
                      placeholder="e.g. user@example.com or username"
                      placeholderTextColor={activeColors.textTertiary}
                      style={[styles.formTextInput, !isDark && { color: activeColors.textPrimary }]}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Base32 Secret */}
                <View style={styles.formFieldGroup}>
                  <Text style={[styles.formFieldLabel, !isDark && { color: activeColors.textSecondary }]}>BASE32 SECRET KEY *</Text>
                  <View style={[styles.formInputContainer, !isDark && { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border }]}>
                    <TextInput
                      value={manualSecret}
                      onChangeText={(val) => {
                        setManualSecret(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="JBSWY3DPEHPK3PXP"
                      placeholderTextColor={activeColors.textTertiary}
                      style={[styles.formTextInput, styles.secretInput, !isDark && { color: activeColors.textPrimary }]}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Options Row: Digits, Period, Algorithm */}
                <View style={styles.optionsRow}>
                  {/* Digits Toggle */}
                  <View style={styles.optionBox}>
                    <Text style={[styles.optionLabel, !isDark && { color: activeColors.textSecondary }]}>DIGITS</Text>
                    <View style={[styles.pillToggle, !isDark && { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border }]}>
                      <Pressable
                        onPress={() => setManualDigits(6)}
                        style={[
                          styles.pillOptionBtn,
                          manualDigits === 6 && (isDark ? styles.pillOptionBtnActive : { backgroundColor: activeColors.primary }),
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillOptionBtnText,
                            !isDark && { color: activeColors.textSecondary },
                            manualDigits === 6 && (isDark ? styles.pillOptionBtnTextActive : { color: '#FFFFFF' }),
                          ]}
                        >
                          6
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setManualDigits(8)}
                        style={[
                          styles.pillOptionBtn,
                          manualDigits === 8 && (isDark ? styles.pillOptionBtnActive : { backgroundColor: activeColors.primary }),
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillOptionBtnText,
                            !isDark && { color: activeColors.textSecondary },
                            manualDigits === 8 && (isDark ? styles.pillOptionBtnTextActive : { color: '#FFFFFF' }),
                          ]}
                        >
                          8
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Period Toggle */}
                  <View style={styles.optionBox}>
                    <Text style={[styles.optionLabel, !isDark && { color: activeColors.textSecondary }]}>PERIOD</Text>
                    <View style={[styles.pillToggle, !isDark && { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border }]}>
                      <Pressable
                        onPress={() => setManualPeriod(30)}
                        style={[
                          styles.pillOptionBtn,
                          manualPeriod === 30 && (isDark ? styles.pillOptionBtnActive : { backgroundColor: activeColors.primary }),
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillOptionBtnText,
                            !isDark && { color: activeColors.textSecondary },
                            manualPeriod === 30 && (isDark ? styles.pillOptionBtnTextActive : { color: '#FFFFFF' }),
                          ]}
                        >
                          30s
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setManualPeriod(60)}
                        style={[
                          styles.pillOptionBtn,
                          manualPeriod === 60 && (isDark ? styles.pillOptionBtnActive : { backgroundColor: activeColors.primary }),
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillOptionBtnText,
                            !isDark && { color: activeColors.textSecondary },
                            manualPeriod === 60 && (isDark ? styles.pillOptionBtnTextActive : { color: '#FFFFFF' }),
                          ]}
                        >
                          60s
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Algorithm Toggle */}
                  <View style={styles.optionBox}>
                    <Text style={[styles.optionLabel, !isDark && { color: activeColors.textSecondary }]}>ALGORITHM</Text>
                    <View style={[styles.pillToggle, !isDark && { backgroundColor: activeColors.surfaceSubtle, borderColor: activeColors.border }]}>
                      <Pressable
                        onPress={() => setManualAlgorithm('SHA1')}
                        style={[
                          styles.pillOptionBtn,
                          manualAlgorithm === 'SHA1' && (isDark ? styles.pillOptionBtnActive : { backgroundColor: activeColors.primary }),
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillOptionBtnText,
                            !isDark && { color: activeColors.textSecondary },
                            manualAlgorithm === 'SHA1' && (isDark ? styles.pillOptionBtnTextActive : { color: '#FFFFFF' }),
                          ]}
                        >
                          SHA1
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setManualAlgorithm('SHA256')}
                        style={[
                          styles.pillOptionBtn,
                          manualAlgorithm === 'SHA256' && (isDark ? styles.pillOptionBtnActive : { backgroundColor: activeColors.primary }),
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillOptionBtnText,
                            !isDark && { color: activeColors.textSecondary },
                            manualAlgorithm === 'SHA256' && (isDark ? styles.pillOptionBtnTextActive : { color: '#FFFFFF' }),
                          ]}
                        >
                          SHA256
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Error Message */}
                {Boolean(errorMessage) && (
                  <View style={styles.errorInlineBanner}>
                    <Ionicons name="alert-circle" size={16} color={activeColors.crimson} />
                    <Text style={styles.errorInlineText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Save & Auto-Link Button */}
                <Pressable
                  onPress={handleManualEnroll}
                  disabled={isProcessing}
                  style={({ pressed }) => [
                    styles.submitManualBtn,
                    !isDark && { backgroundColor: activeColors.primary },
                    pressed && styles.pressedOpacity,
                    isProcessing && { opacity: 0.7 },
                  ]}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitManualBtnText}>Save & Auto-Link 2FA</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* MODE 3: Auto-Enrollment Result & Live OTP Preview */}
        {mode === 'result' && lastResult && (
          <ScrollView
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Feedback Banner */}
            <View
              style={[
                styles.resultStatusCard,
                lastResult.action === 'linked_existing'
                  ? styles.resultStatusCardLinked
                  : styles.resultStatusCardCreated,
              ]}
            >
              <View style={styles.statusBadgeRow}>
                <View
                  style={[
                    styles.statusBadgeDot,
                    {
                      backgroundColor:
                        lastResult.action === 'linked_existing'
                          ? colors.emerald
                          : colors.primary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeLabel,
                    {
                      color:
                        lastResult.action === 'linked_existing'
                          ? colors.emerald
                          : colors.primaryLight,
                    },
                  ]}
                >
                  {lastResult.action === 'linked_existing'
                    ? 'LINKED TO EXISTING CREDENTIAL'
                    : 'NEW VAULT ITEM ENROLLED'}
                </Text>
              </View>
              <Text style={styles.resultMessage}>{lastResult.message}</Text>
            </View>

            {/* Enrolled Credential Overview Card */}
            <View style={styles.itemOverviewCard}>
              <View style={styles.itemOverviewHeader}>
                <ServiceIcon
                  iconType={lastResult.item.icon || lastResult.resolvedService.icon}
                  title={lastResult.item.title}
                  size="lg"
                />
                <View style={styles.itemOverviewInfo}>
                  <Text style={styles.itemOverviewTitle}>{lastResult.item.title}</Text>
                  {Boolean(lastResult.enrollmentData.account) && (
                    <Text style={styles.itemOverviewAccount}>
                      {lastResult.enrollmentData.account}
                    </Text>
                  )}
                  {Boolean(lastResult.resolvedService.domain) && (
                    <Text style={styles.itemOverviewDomain}>
                      {lastResult.resolvedService.domain}
                    </Text>
                  )}
                </View>
              </View>

              {/* Live Ticking TOTP Code */}
              <View style={styles.totpRowWrapper}>
                <TOTPRow
                  secret={lastResult.enrollmentData.secret}
                  label={lastResult.item.title}
                  accountName={lastResult.enrollmentData.account}
                  period={lastResult.enrollmentData.period}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              {onOpenItem && (
                <Pressable
                  onPress={() => onOpenItem(lastResult.item)}
                  style={({ pressed }) => [
                    styles.primaryActionBtn,
                    pressed && styles.pressedOpacity,
                  ]}
                >
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>View in Vault</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  setLastResult(null);
                  setErrorMessage(null);
                  setMode('scanner');
                }}
                style={({ pressed }) => [
                  styles.secondaryActionBtn,
                  pressed && styles.pressedOpacity,
                ]}
              >
                <Ionicons name="scan-outline" size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.secondaryActionBtnText}>Scan Another QR</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* MODE 4: List of Enrolled Authenticators */}
        {mode === 'list' && (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => scrollContext?.notifyScrollStart()}
            onScroll={() => scrollContext?.notifyScrollStart()}
            onScrollEndDrag={() => scrollContext?.notifyScrollEnd()}
            onMomentumScrollEnd={() => scrollContext?.notifyScrollEnd()}
          >
            {totpItems.length === 0 ? (
              <View style={[styles.emptyListCard, !isDark && { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={[styles.emptyIconCircle, !isDark && { backgroundColor: activeColors.surfaceSubtle }]}>
                  <Ionicons name="shield-outline" size={32} color={!isDark ? activeColors.primary : colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, !isDark && { color: activeColors.textPrimary }]}>No 2FA Authenticators Yet</Text>
                <Text style={[styles.emptySubtitle, !isDark && { color: activeColors.textSecondary }]}>
                  Scan a QR code from GitHub, Google, or any service to instantly generate zero-knowledge OTP codes.
                </Text>
                <Pressable
                  onPress={() => {
                    setErrorMessage(null);
                    setMode('scanner');
                  }}
                  style={({ pressed }) => [
                    styles.emptyScanBtn,
                    !isDark && { backgroundColor: activeColors.primary },
                    pressed && styles.pressedOpacity,
                  ]}
                >
                  <Ionicons name="qr-code" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyScanBtnText}>Scan QR Code</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {totpItems.map((item) => {
                  const p = (item.payload as unknown as Record<string, unknown>) || {};
                  const secret = (p.totpSecret as string) || (p.secret as string) || '';
                  const account = (p.username as string) || (p.accountName as string) || '';

                  return (
                    <View key={item.id} style={[styles.totpListItemCard, !isDark && { backgroundColor: activeColors.surface, borderColor: activeColors.border, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 }]}>
                      <View style={styles.totpListItemHeader}>
                        <ServiceIcon
                          iconType={item.icon}
                          title={item.title}
                          size="sm"
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.totpListItemTitle, !isDark && { color: activeColors.textPrimary }]}>{item.title}</Text>
                          {Boolean(account) && (
                            <Text style={[styles.totpListItemSubtitle, !isDark && { color: activeColors.textSecondary }]}>{account}</Text>
                          )}
                        </View>
                        {onOpenItem && (
                          <Pressable
                            onPress={() => onOpenItem(item)}
                            style={styles.openItemIconBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="chevron-forward" size={18} color={activeColors.textTertiary} />
                          </Pressable>
                        )}
                      </View>

                      <TOTPRow
                        secret={secret}
                        label={item.title}
                        accountName={account}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
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
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
    marginRight: 6,
  },
  headerBadgeText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    color: colors.emerald,
  },
  topTabsWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  topTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  topTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  topTabButtonActive: {
    backgroundColor: colors.primary,
  },
  topTabText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  topTabTextActive: {
    color: '#FFFFFF',
  },
  mainContainer: {
    flex: 1,
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
  },
  errorOverlayBanner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1418',
    borderColor: colors.crimson,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    zIndex: 20,
    gap: spacing.xs,
  },
  errorOverlayText: {
    flex: 1,
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    color: colors.crimson,
    lineHeight: 16,
  },
  errorDismissBtn: {
    padding: 4,
  },
  manualFormContainer: {
    padding: spacing.md,
  },
  manualCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  manualCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualCardTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  manualCardSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: -4,
  },
  formFieldGroup: {
    gap: 6,
  },
  formFieldLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  formInputContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 6,
  },
  formTextInput: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  secretInput: {
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionBox: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 2,
  },
  pillOptionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 4,
  },
  pillOptionBtnActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.25)',
  },
  pillOptionBtnText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pillOptionBtnTextActive: {
    color: colors.primaryLight,
  },
  errorInlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.crimson,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 8,
  },
  errorInlineText: {
    flex: 1,
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    color: colors.crimson,
  },
  submitManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  submitManualBtnText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultScrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  resultStatusCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  resultStatusCardLinked: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  resultStatusCardCreated: {
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    borderColor: 'rgba(123, 97, 255, 0.35)',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultMessage: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemOverviewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  itemOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemOverviewInfo: {
    marginLeft: 12,
    flex: 1,
  },
  itemOverviewTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemOverviewAccount: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemOverviewDomain: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  totpRowWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  resultActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  primaryActionBtnText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  secondaryActionBtnText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 140,
  },
  emptyListCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  emptyScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: radius.full,
  },
  emptyScanBtnText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemsList: {
    gap: spacing.md,
  },
  totpListItemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  totpListItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 4,
  },
  totpListItemTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totpListItemSubtitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 11,
    color: colors.textMuted,
  },
  openItemIconBtn: {
    padding: 6,
  },
  pressedOpacity: {
    opacity: 0.8,
  },
});
