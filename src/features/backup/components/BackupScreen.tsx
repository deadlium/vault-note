/**
 * BackupScreen Component
 * Executive-grade Zero-Knowledge Encrypted Backup & Restore interface.
 * Implements Argon2id + AES-256-GCM serialization, tamper detection,
 * pre-flight inspect preview, and merge/replace reconciliation.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../../theme';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { useBackup } from '../useBackup';
import { RestoreMode } from '../types';
import { copyToClipboard, getClipboardText } from '../../../core/clipboard';

export interface BackupScreenProps {
  onBack: () => void;
}

type TabType = 'export' | 'restore';

export function BackupScreen({ onBack }: BackupScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('export');

  // Export form state
  const [exportPassphrase, setExportPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [showExportPassphrase, setShowExportPassphrase] = useState<boolean>(false);
  const [copiedExport, setCopiedExport] = useState<boolean>(false);

  // Restore form state
  const [restoreContent, setRestoreContent] = useState<string>('');
  const [restorePassphrase, setRestorePassphrase] = useState<string>('');
  const [showRestorePassphrase, setShowRestorePassphrase] = useState<boolean>(false);
  const [selectedRestoreMode, setSelectedRestoreMode] = useState<RestoreMode>('merge');

  const currentItems = useVaultStore((state) => state.items);

  const {
    isExporting,
    isInspecting,
    isRestoring,
    exportResult,
    inspectedPayload,
    restoreSummary,
    error,
    exportVault,
    inspectBackupContent,
    executeRestore,
    cancelRestore,
    clearExportResult,
    clearError,
    resetAll,
  } = useBackup();

  // Category breakdown for current vault
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      LOGIN: 0,
      SECURE_NOTE: 0,
      CARD: 0,
      TOTP: 0,
      API_KEY: 0,
      IDENTITY: 0,
      RECOVERY_CODES: 0,
    };
    for (const item of currentItems) {
      if (counts[item.type] !== undefined) {
        counts[item.type]++;
      }
    }
    return counts;
  }, [currentItems]);

  // Passphrase strength calculation
  const passphraseStrength = useMemo(() => {
    if (!exportPassphrase) return { label: 'None', color: colors.textMuted, percent: 0 };
    let score = 0;
    if (exportPassphrase.length >= 8) score += 25;
    if (exportPassphrase.length >= 12) score += 25;
    if (/[A-Z]/.test(exportPassphrase) && /[a-z]/.test(exportPassphrase)) score += 20;
    if (/[0-9]/.test(exportPassphrase)) score += 15;
    if (/[^A-Za-z0-9]/.test(exportPassphrase)) score += 15;

    if (score < 40) return { label: 'Weak', color: colors.crimson, percent: 30 };
    if (score < 70) return { label: 'Fair', color: colors.amber, percent: 60 };
    if (score < 90) return { label: 'Strong', color: colors.emerald, percent: 85 };
    return { label: 'Maximum', color: colors.primary, percent: 100 };
  }, [exportPassphrase]);

  // Handlers
  const handleExport = async () => {
    if (!exportPassphrase) return;
    if (exportPassphrase !== confirmPassphrase) return;
    try {
      await exportVault(exportPassphrase);
    } catch {
      // Handled in state
    }
  };

  const handleCopyExportResult = async () => {
    if (!exportResult) return;
    await copyToClipboard(exportResult, { isSensitive: true, label: 'Vault Backup' });
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const handleShareExportResult = async () => {
    if (!exportResult) return;
    try {
      await Share.share({
        title: 'vaultnote_backup.vaultnote',
        message: exportResult,
      });
    } catch {
      // Ignored
    }
  };

  const handlePasteRestoreContent = async () => {
    try {
      const text = await getClipboardText();
      if (text) {
        setRestoreContent(text);
        clearError();
      }
    } catch {
      // Ignored
    }
  };

  const handleInspectBackup = async () => {
    if (!restoreContent || !restorePassphrase) return;
    try {
      await inspectBackupContent(restoreContent.trim(), restorePassphrase);
    } catch {
      // Handled in state
    }
  };

  const handleConfirmRestore = async () => {
    try {
      await executeRestore(selectedRestoreMode);
    } catch {
      // Handled in state
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
          onPress={onBack}
          accessibilityLabel="Back to Security Center"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Backup & Restore</Text>
          <Text style={styles.headerSubtitle}>Zero-Knowledge Encrypted .vaultnote</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Segmented Tab Controls */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'export' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('export');
            clearError();
          }}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color={activeTab === 'export' ? colors.primary : colors.textTertiary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'export' && styles.tabButtonTextActive,
            ]}
          >
            Export Backup
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'restore' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('restore');
            clearError();
          }}
        >
          <Ionicons
            name="cloud-download-outline"
            size={18}
            color={activeTab === 'restore' ? colors.primary : colors.textTertiary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'restore' && styles.tabButtonTextActive,
            ]}
          >
            Restore Vault
          </Text>
        </Pressable>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.crimson} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={clearError} hitSlop={8}>
            <Ionicons name="close" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'export' ? (
          /* ==================== EXPORT TAB ==================== */
          <View style={styles.tabContent}>
            {/* Vault Overview Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.emerald} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Current Vault Scope</Text>
                  <Text style={styles.cardSubtitle}>
                    {currentItems.length} items ready for zero-knowledge encapsulation
                  </Text>
                </View>
              </View>

              <View style={styles.categoryGrid}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryCount}>{categoryCounts.LOGIN}</Text>
                  <Text style={styles.categoryLabel}>Logins</Text>
                </View>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryCount}>{categoryCounts.CARD}</Text>
                  <Text style={styles.categoryLabel}>Cards</Text>
                </View>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryCount}>{categoryCounts.SECURE_NOTE}</Text>
                  <Text style={styles.categoryLabel}>Notes</Text>
                </View>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryCount}>{categoryCounts.TOTP}</Text>
                  <Text style={styles.categoryLabel}>2FA / TOTP</Text>
                </View>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryCount}>{categoryCounts.API_KEY}</Text>
                  <Text style={styles.categoryLabel}>API Keys</Text>
                </View>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryCount}>{categoryCounts.IDENTITY}</Text>
                  <Text style={styles.categoryLabel}>Identities</Text>
                </View>
              </View>

              <View style={styles.securitySpecBadge}>
                <Ionicons name="lock-closed" size={14} color={colors.primaryLight} />
                <Text style={styles.securitySpecText}>
                  Argon2id (RFC 9106) + AES-256-GCM Authenticated Encryption
                </Text>
              </View>
            </View>

            {/* Passphrase Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Set Backup Passphrase</Text>
              <Text style={styles.sectionDescription}>
                This passphrase derives the master key encryption key. TOTP secrets, passwords,
                and notes are never stored as plaintext inside the backup file.
              </Text>

              {/* Passphrase Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Passphrase</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={exportPassphrase}
                    onChangeText={setExportPassphrase}
                    secureTextEntry={!showExportPassphrase}
                    placeholder="Enter strong backup passphrase"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={styles.inputIconButton}
                    onPress={() => setShowExportPassphrase(!showExportPassphrase)}
                  >
                    <Ionicons
                      name={showExportPassphrase ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Passphrase Strength Bar */}
              {exportPassphrase ? (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthHeader}>
                    <Text style={styles.strengthText}>Strength:</Text>
                    <Text style={[styles.strengthBadge, { color: passphraseStrength.color }]}>
                      {passphraseStrength.label}
                    </Text>
                  </View>
                  <View style={styles.strengthTrack}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${passphraseStrength.percent}%`,
                          backgroundColor: passphraseStrength.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              {/* Confirm Passphrase Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Confirm Passphrase</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={confirmPassphrase}
                    onChangeText={setConfirmPassphrase}
                    secureTextEntry={!showExportPassphrase}
                    placeholder="Repeat passphrase"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {confirmPassphrase && confirmPassphrase !== exportPassphrase ? (
                  <Text style={styles.validationErrorText}>Passphrases do not match</Text>
                ) : null}
              </View>

              <View style={styles.warningNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.amber} />
                <Text style={styles.warningNoteText}>
                  Store this passphrase in a secure location. Because VaultNote is zero-knowledge,
                  there is no account recovery if this passphrase is lost.
                </Text>
              </View>

              {/* Export Trigger Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  (!exportPassphrase ||
                    exportPassphrase !== confirmPassphrase ||
                    isExporting) &&
                    styles.buttonDisabled,
                  pressed && styles.pressedOpacity,
                ]}
                disabled={
                  !exportPassphrase ||
                  exportPassphrase !== confirmPassphrase ||
                  isExporting
                }
                onPress={handleExport}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryActionButtonText}>
                      Generate Encrypted .vaultnote
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Export Success Result Card */}
            {exportResult ? (
              <View style={[styles.card, styles.exportResultCard]}>
                <View style={styles.exportSuccessHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.emerald} />
                  <View style={styles.exportSuccessTitles}>
                    <Text style={styles.exportSuccessTitle}>Backup Generated Successfully</Text>
                    <Text style={styles.exportSuccessSubtitle}>
                      {(exportResult.length / 1024).toFixed(1)} KB encrypted container ready
                    </Text>
                  </View>
                </View>

                <View style={styles.exportActionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.exportActionButton,
                      copiedExport && styles.exportActionButtonSuccess,
                      pressed && styles.pressedOpacity,
                    ]}
                    onPress={handleCopyExportResult}
                  >
                    <Ionicons
                      name={copiedExport ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={copiedExport ? colors.emerald : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.exportActionButtonText,
                        copiedExport && styles.exportActionButtonTextSuccess,
                      ]}
                    >
                      {copiedExport ? 'Copied!' : 'Copy to Clipboard'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.exportActionButton,
                      pressed && styles.pressedOpacity,
                    ]}
                    onPress={handleShareExportResult}
                  >
                    <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
                    <Text style={styles.exportActionButtonText}>Share / Save</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.dismissResultButton,
                    pressed && styles.pressedOpacity,
                  ]}
                  onPress={clearExportResult}
                >
                  <Text style={styles.dismissResultButtonText}>Done</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : (
          /* ==================== RESTORE TAB ==================== */
          <View style={styles.tabContent}>
            {/* Step 1: Input .vaultnote container */}
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Provide .vaultnote Backup File</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Paste the contents of your exported .vaultnote backup container below.
              </Text>

              <TextInput
                style={styles.textAreaInput}
                value={restoreContent}
                onChangeText={setRestoreContent}
                placeholder="Paste { &quot;magic&quot;: &quot;VAULTNOTE_BACKUP_V1&quot;, ... } content here"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.restoreInputHelpers}>
                <Pressable
                  style={({ pressed }) => [
                    styles.smallHelperButton,
                    pressed && styles.pressedOpacity,
                  ]}
                  onPress={handlePasteRestoreContent}
                >
                  <Ionicons name="clipboard-outline" size={16} color={colors.primaryLight} />
                  <Text style={styles.smallHelperButtonText}>Paste from Clipboard</Text>
                </Pressable>

                {restoreContent ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.smallHelperButton,
                      pressed && styles.pressedOpacity,
                    ]}
                    onPress={() => {
                      setRestoreContent('');
                      clearError();
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.smallHelperButtonText, { color: colors.textTertiary }]}>
                      Clear
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Step 2: Enter Passphrase */}
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Enter Backup Passphrase</Text>
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={restorePassphrase}
                    onChangeText={setRestorePassphrase}
                    secureTextEntry={!showRestorePassphrase}
                    placeholder="Passphrase used during export"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={styles.inputIconButton}
                    onPress={() => setShowRestorePassphrase(!showRestorePassphrase)}
                  >
                    <Ionicons
                      name={showRestorePassphrase ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Action Button: Inspect & Verify */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  (!restoreContent.trim() || !restorePassphrase || isInspecting) &&
                    styles.buttonDisabled,
                  pressed && styles.pressedOpacity,
                ]}
                disabled={!restoreContent.trim() || !restorePassphrase || isInspecting}
                onPress={handleInspectBackup}
              >
                {isInspecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryActionButtonText}>
                      Inspect & Verify Backup
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ==================== PRE-FLIGHT RESTORE PREVIEW MODAL ==================== */}
      <Modal
        visible={Boolean(inspectedPayload)}
        transparent
        animationType="slide"
        onRequestClose={cancelRestore}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBadge}>
                <Ionicons name="checkmark-circle" size={24} color={colors.emerald} />
              </View>
              <Text style={styles.modalTitle}>Backup Verified</Text>
              <Text style={styles.modalSubtitle}>
                Cryptographic authentication and schema integrity confirmed.
              </Text>
            </View>

            {inspectedPayload ? (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Backup Metadata Preview */}
                <View style={styles.modalStatsCard}>
                  <View style={styles.modalStatRow}>
                    <Text style={styles.modalStatLabel}>Total Items:</Text>
                    <Text style={styles.modalStatValue}>{inspectedPayload.items.length}</Text>
                  </View>
                  <View style={styles.modalStatRow}>
                    <Text style={styles.modalStatLabel}>Export Date:</Text>
                    <Text style={styles.modalStatValue}>
                      {new Date(inspectedPayload.metadata.exportedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.modalStatRow}>
                    <Text style={styles.modalStatLabel}>App Version:</Text>
                    <Text style={styles.modalStatValue}>
                      {inspectedPayload.metadata.appVersion}
                    </Text>
                  </View>
                </View>

                {/* Restore Strategy Selection */}
                <Text style={styles.modalSectionLabel}>Choose Restore Strategy</Text>

                {/* Option 1: Merge */}
                <Pressable
                  style={[
                    styles.restoreOptionCard,
                    selectedRestoreMode === 'merge' && styles.restoreOptionCardActive,
                  ]}
                  onPress={() => setSelectedRestoreMode('merge')}
                >
                  <View style={styles.restoreOptionRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedRestoreMode === 'merge' && styles.radioOuterActive,
                      ]}
                    >
                      {selectedRestoreMode === 'merge' ? (
                        <View style={styles.radioInner} />
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.restoreOptionText}>
                    <Text style={styles.restoreOptionTitle}>Merge (Recommended)</Text>
                    <Text style={styles.restoreOptionDesc}>
                      Reconciles records. New items are added; newer backup records update older
                      local items. Existing newer items remain untouched.
                    </Text>
                  </View>
                </Pressable>

                {/* Option 2: Replace */}
                <Pressable
                  style={[
                    styles.restoreOptionCard,
                    selectedRestoreMode === 'replace' && styles.restoreOptionCardDestructive,
                  ]}
                  onPress={() => setSelectedRestoreMode('replace')}
                >
                  <View style={styles.restoreOptionRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedRestoreMode === 'replace' && styles.radioOuterDestructive,
                      ]}
                    >
                      {selectedRestoreMode === 'replace' ? (
                        <View
                          style={[styles.radioInner, { backgroundColor: colors.crimson }]}
                        />
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.restoreOptionText}>
                    <Text
                      style={[
                        styles.restoreOptionTitle,
                        selectedRestoreMode === 'replace' && { color: colors.crimson },
                      ]}
                    >
                      Replace (Full Overwrite)
                    </Text>
                    <Text style={styles.restoreOptionDesc}>
                      Caution: Completely replaces all current vault data with this backup. Any
                      existing items not present in the backup will be permanently deleted.
                    </Text>
                  </View>
                </Pressable>
              </ScrollView>
            ) : null}

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelButton, pressed && styles.pressedOpacity]}
                onPress={cancelRestore}
                disabled={isRestoring}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmButton,
                  selectedRestoreMode === 'replace' && styles.modalConfirmButtonDestructive,
                  isRestoring && styles.buttonDisabled,
                  pressed && styles.pressedOpacity,
                ]}
                onPress={handleConfirmRestore}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    {selectedRestoreMode === 'merge' ? 'Confirm Merge' : 'Confirm Replace'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== RESTORE SUMMARY MODAL ==================== */}
      <Modal
        visible={Boolean(restoreSummary)}
        transparent
        animationType="fade"
        onRequestClose={resetAll}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.summaryModalContainer}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="checkmark-circle" size={48} color={colors.emerald} />
            </View>
            <Text style={styles.summaryTitle}>Vault Restored Successfully</Text>
            <Text style={styles.summarySubtitle}>
              Restored in {restoreSummary?.mode.toUpperCase()} mode
            </Text>

            {restoreSummary ? (
              <View style={styles.summaryMetricsGrid}>
                <View style={styles.summaryMetricItem}>
                  <Text style={styles.summaryMetricValue}>{restoreSummary.addedCount}</Text>
                  <Text style={styles.summaryMetricLabel}>Items Added</Text>
                </View>
                <View style={styles.summaryMetricItem}>
                  <Text style={styles.summaryMetricValue}>{restoreSummary.updatedCount}</Text>
                  <Text style={styles.summaryMetricLabel}>Items Updated</Text>
                </View>
                <View style={styles.summaryMetricItem}>
                  <Text style={styles.summaryMetricValue}>{restoreSummary.skippedCount}</Text>
                  <Text style={styles.summaryMetricLabel}>Items Preserved</Text>
                </View>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.summaryCloseButton, pressed && styles.pressedOpacity]}
              onPress={() => {
                resetAll();
                onBack();
              }}
            >
              <Text style={styles.summaryCloseButtonText}>Return to Vault</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textTertiary,
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.backgroundSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.primaryLight,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.crimsonMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.crimson,
    flex: 1,
    fontWeight: '500',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tabContent: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.emeraldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryCount: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  categoryLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  securitySpecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.25)',
  },
  securitySpecText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.primaryLight,
    fontWeight: '500',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  inputWrapper: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  textInput: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputIconButton: {
    padding: spacing.xs,
  },
  validationErrorText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.crimson,
    marginTop: 4,
  },
  strengthContainer: {
    marginBottom: spacing.md,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  strengthText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textTertiary,
  },
  strengthBadge: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  strengthTrack: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  warningNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.amberMuted,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  warningNoteText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.amber,
    flex: 1,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radius.md,
  },
  primaryActionButtonText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  exportResultCard: {
    borderColor: colors.emeraldBorder,
    backgroundColor: colors.surfaceElevated,
  },
  exportSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  exportSuccessTitles: {
    flex: 1,
  },
  exportSuccessTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.emerald,
  },
  exportSuccessSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exportActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exportActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportActionButtonSuccess: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldMuted,
  },
  exportActionButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exportActionButtonTextSuccess: {
    color: colors.emerald,
  },
  dismissResultButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dismissResultButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  stepTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  textAreaInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  restoreInputHelpers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  smallHelperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  smallHelperButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderBadge: {
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  modalScroll: {
    marginVertical: spacing.sm,
  },
  modalStatsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalStatLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  modalStatValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  restoreOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  restoreOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  restoreOptionCardDestructive: {
    borderColor: colors.crimson,
    backgroundColor: colors.crimsonMuted,
  },
  restoreOptionRadio: {
    paddingTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioOuterDestructive: {
    borderColor: colors.crimson,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  restoreOptionText: {
    flex: 1,
  },
  restoreOptionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  restoreOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 2,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonDestructive: {
    backgroundColor: colors.crimson,
  },
  modalConfirmButtonText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  summaryIconBox: {
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.emerald,
    marginBottom: spacing.lg,
  },
  summaryMetricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
  },
  summaryMetricItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  summaryMetricValue: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryMetricLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textTertiary,
  },
  summaryCloseButton: {
    width: '100%',
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCloseButtonText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressedOpacity: {
    opacity: 0.75,
  },
});
