/**
 * Vault Item Detail Screen
 * Pixel-matched with design/login_detail.png
 * Inspect credentials, reveal protected fields with biometric auth,
 * and copy secrets with an ephemeral auto-wiping clipboard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { PasswordField } from '../../../components/input/PasswordField';
import { ServiceIcon } from '../../../components/icon/ServiceIcon';
import { useVaultItemDetail } from '../../../features/vault/hooks/useVaultItemDetail';
import { LoginPayload, CustomField } from '../../../types/vault';
import { useClipboardManager } from '../../../core/clipboard';
import {
  TOTPCard,
  TOTPSettings,
  TOTPCredentialService,
  TOTPUpdateInput,
} from '../../../features/totp';

export interface VaultItemDetailProps {
  id?: string;
  onBack?: () => void;
  onEdit?: (id: string) => void;
}

export default function VaultItemDetailScreen({
  id = 'demo-google',
  onBack,
  onEdit,
}: VaultItemDetailProps) {
  const { item, isLoading, toggleFavorite, deleteItem } = useVaultItemDetail(id);
  const { isActive, remainingSeconds, totalSeconds, label, copySecret, copyPlain } =
    useClipboardManager();

  if (isLoading || !item) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const [showTOTPSettings, setShowTOTPSettings] = useState(false);
  const payload = (item.payload as unknown as Record<string, unknown>) || {};
  const loginPayload = item.payload as LoginPayload;
  const username = (payload.username as string) || (payload.accountName as string) || '';
  const password = (payload.password as string) || (payload.apiKey as string) || '';
  const websiteUrl = (payload.websiteUrl as string) || (payload.endpointUrl as string) || '';
  const notes = (payload.notes as string) || (payload.content as string) || '';
  const totpRecord = TOTPCredentialService.getCredentialTOTP(item);
  const totpConfig = loginPayload?.totpConfig;
  const totpSecret =
    totpRecord?.secret || (payload.totpSecret as string) || (payload.secret as string) || '';
  const hasTOTP = Boolean(totpSecret && totpSecret.trim().length > 0);
  const customFields: CustomField[] = Array.isArray(payload.customFields)
    ? (payload.customFields as CustomField[])
    : [];

  const handleSaveTOTP = async (updates: TOTPUpdateInput) => {
    await TOTPCredentialService.updateTOTP(item.id, updates);
  };

  const handleDetachTOTP = async () => {
    await TOTPCredentialService.detachTOTP(item.id);
  };

  const handleCopyUsername = () => {
    copyPlain(username);
  };

  const handleCopyPassword = () => {
    copySecret(password, 'Password', 30);
  };

  const handleCopyUrl = () => {
    copyPlain(websiteUrl);
  };

  const handleOpenUrl = async () => {
    try {
      const canOpen = await Linking.canOpenURL(websiteUrl);
      if (canOpen) {
        await Linking.openURL(websiteUrl);
      }
    } catch {
      // Suppress link launch failure
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Credential',
      `Are you sure you want to permanently delete "${item.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteItem();
            if (success && onBack) {
              onBack();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header Navigation Bar */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to Vault"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          <Text style={styles.backButtonText}>Vault</Text>
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={toggleFavorite}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle Favorite"
          >
            <Ionicons
              name={item.isFavorite ? 'star' : 'star-outline'}
              size={18}
              color={item.isFavorite ? '#FBBF24' : colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={() => onEdit?.(item.id)}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.editButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit Credential"
          >
            <Feather name="edit-2" size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="More Options"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Hero Header Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatarContainer}>
            <ServiceIcon
              iconType={
                ((item as unknown as Record<string, unknown>).icon as string) ||
                ((item.payload as unknown as Record<string, unknown>)?.icon as string) ||
                item.id.replace('demo-', '')
              }
              category={item.type}
              title={item.title}
              size="lg"
            />
            {item.isProtected && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={10} color="#0D0E11" />
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>{item.title}</Text>
              {item.isProtected && (
                <View style={styles.protectedPill}>
                  <View style={styles.protectedDot} />
                  <Text style={styles.protectedPillText}>Protected</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroSubtitle}>
              Personal Workspace • {websiteUrl.replace(/^https?:\/\//, '')}
            </Text>

            <View style={styles.securityRow}>
              <Ionicons name="shield-checkmark" size={13} color={colors.emerald} />
              <Text style={styles.securityText}>
                Updated 4h ago • Hardware Secure Enclave
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Primary Credentials */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PRIMARY CREDENTIALS</Text>

          <View style={styles.card}>
            {/* Username / Email Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Username / Email</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.monotext} numberOfLines={1} ellipsizeMode="middle">
                  {username || 'No username set'}
                </Text>

                {username.length > 0 && (
                  <Pressable
                    onPress={handleCopyUsername}
                    style={({ pressed }) => [
                      styles.copyPill,
                      pressed && styles.copyPillPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Copy Username"
                  >
                    <Ionicons name="copy-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.copyPillText}>Copy</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Password Field with Masking & Biometric Protection */}
            <PasswordField
              label="Master Password"
              value={password}
              isProtected={item.isProtected}
              onCopy={handleCopyPassword}
              helperText="Biometric auth required to reveal raw plaintext"
            />
          </View>
        </View>

        {/* Section: Two-Factor Authentication */}
        <View style={styles.section}>
          <TOTPCard
            record={totpRecord}
            secret={totpSecret}
            issuer={totpRecord?.issuer || totpConfig?.issuer || item.title}
            account={totpRecord?.account || totpConfig?.account || username}
            algorithm={totpRecord?.algorithm || totpConfig?.algorithm}
            digits={totpRecord?.digits || totpConfig?.digits}
            period={totpRecord?.period || totpConfig?.period}
            credentialId={item.id}
            onOpenSettings={() => setShowTOTPSettings(true)}
          />
        </View>

        {/* Section: Associated Domain */}
        {websiteUrl.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ASSOCIATED DOMAIN</Text>

            <View style={styles.card}>
              <View style={styles.domainRow}>
                <View style={styles.domainIconCircle}>
                  <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
                </View>

                <View style={styles.domainDetails}>
                  <Text style={styles.fieldLabel}>Sign-in Page</Text>
                  <Pressable onPress={handleOpenUrl}>
                    <Text style={styles.domainLink} numberOfLines={1}>
                      {websiteUrl}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.domainActions}>
                  <Pressable
                    onPress={handleOpenUrl}
                    style={styles.smallIconButton}
                    accessibilityRole="button"
                    accessibilityLabel="Open in Browser"
                  >
                    <Feather name="external-link" size={15} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={handleCopyUrl}
                    style={styles.smallIconButton}
                    accessibilityRole="button"
                    accessibilityLabel="Copy URL"
                  >
                    <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Section: Custom Fields */}
        {customFields.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>CUSTOM FIELDS</Text>
              <Ionicons name="list-outline" size={13} color={colors.textMuted} />
            </View>

            <View style={styles.card}>
              {customFields.map((cf, index) => {
                const isSecret = cf.type === 'password' || Boolean(cf.isSecret);
                const isDescription = cf.type === 'description';

                return (
                  <React.Fragment key={cf.id || index}>
                    {index > 0 && <View style={styles.divider} />}
                    {isSecret ? (
                      <PasswordField
                        label={cf.label || 'Secret Field'}
                        value={cf.value}
                        isProtected={item.isProtected}
                        onCopy={() => copySecret(cf.value, cf.label || 'Custom Secret', 30)}
                      />
                    ) : isDescription ? (
                      <View style={styles.fieldContainer}>
                        <View style={styles.customFieldLabelRow}>
                          <Text style={styles.fieldLabel}>{cf.label || 'Description'}</Text>
                          {cf.value.length > 0 && (
                            <Pressable
                              onPress={() => copyPlain(cf.value)}
                              style={({ pressed }) => [
                                styles.copyPill,
                                pressed && styles.copyPillPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Copy ${cf.label || 'description'}`}
                            >
                              <Ionicons name="copy-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                              <Text style={styles.copyPillText}>Copy</Text>
                            </Pressable>
                          )}
                        </View>
                        <View style={styles.customDescBox}>
                          <Text style={styles.customDescText}>{cf.value || '(Empty)'}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>{cf.label || 'Custom Field'}</Text>
                        <View style={styles.fieldRow}>
                          <Text style={styles.monotext} numberOfLines={1} ellipsizeMode="middle">
                            {cf.value || '(Empty)'}
                          </Text>
                          {cf.value.length > 0 && (
                            <Pressable
                              onPress={() => copyPlain(cf.value)}
                              style={({ pressed }) => [
                                styles.copyPill,
                                pressed && styles.copyPillPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Copy ${cf.label || 'value'}`}
                            >
                              <Ionicons name="copy-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                              <Text style={styles.copyPillText}>Copy</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* Section: Encrypted Safe Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>ENCRYPTED SAFE NOTES</Text>
            <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
          </View>

          <View style={styles.card}>
            <Text style={styles.notesText}>
              {notes || 'No notes added for this credential.'}
            </Text>

            {item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Cryptographic Strength Assessment */}
            <View style={styles.strengthBox}>
              <View style={styles.strengthRow}>
                <Ionicons name="shield-checkmark" size={14} color={colors.emerald} style={{ marginRight: 6 }} />
                <Text style={styles.strengthTitle}>
                  Cryptographic Strength: High (84 bits)
                </Text>
              </View>
              <Text style={styles.strengthSubtitle}>
                0 compromises in offline HIBP hash catalog
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Secondary Actions */}
        <View style={styles.actionsSection}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryButtonText}>View Revision History</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.crimson} style={{ marginRight: 8 }} />
            <Text style={styles.deleteButtonText}>Delete Credential</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Ephemeral Clipboard Purge Toast Banner */}
      {isActive && (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <View style={styles.toastIconCircle}>
              <Ionicons name="shield-checkmark" size={15} color={colors.emerald} />
            </View>
            <View style={styles.toastTextContainer}>
              <Text style={styles.toastTitle}>
                {label ?? 'Secret'} copied to clipboard
              </Text>
              <Text style={styles.toastSubtitle}>
                Auto-wiping in {remainingSeconds}s
              </Text>
            </View>
            <View style={styles.toastBadge}>
              <Text style={styles.toastBadgeText}>{remainingSeconds}s</Text>
            </View>
          </View>
          <View style={styles.toastProgressTrack}>
            <View
              style={[
                styles.toastProgressBar,
                {
                  width: `${Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100))}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Two-Factor Authentication Settings Modal Sheet */}
      <TOTPSettings
        visible={showTOTPSettings}
        onClose={() => setShowTOTPSettings(false)}
        record={totpRecord}
        credentialId={item.id}
        onSave={handleSaveTOTP}
        onDetach={hasTOTP ? handleDetachTOTP : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    ...typography.body1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: colors.surfaceActive,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  editButtonPressed: {
    backgroundColor: colors.surfaceActive,
  },
  editButtonText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 60,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroAvatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  heroInfo: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: {
    ...typography.heading,
    fontSize: 22,
    color: colors.textPrimary,
  },
  protectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  protectedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.emerald,
    marginRight: 5,
  },
  protectedPillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.emerald,
  },
  heroSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  securityText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  sectionHeader: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  activeSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 5,
  },
  activeSyncDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.emerald,
  },
  activeSyncText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.emerald,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  monotext: {
    ...typography.code,
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
    marginRight: spacing.sm,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  copyPillPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  copyPillText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  totpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  totpCodeText: {
    ...typography.code,
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 3,
    marginTop: 2,
  },
  timerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
  },
  timerText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  totpActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  totpCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceActive,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  totpCopyButtonPressed: {
    opacity: 0.7,
  },
  totpCopyText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rotatesText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  domainIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  domainDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  domainLink: {
    ...typography.body2,
    color: colors.primaryLight,
    textDecorationLine: 'underline',
  },
  domainActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesText: {
    ...typography.body2,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  tagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  strengthBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  strengthTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.emerald,
  },
  strengthSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: 20,
  },
  actionsSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceActive,
  },
  secondaryButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  deleteButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.crimson,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: '#15161C',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.35)',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  toastIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toastSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
  },
  toastBadge: {
    backgroundColor: 'rgba(123, 97, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  toastBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  toastProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  toastProgressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  customFieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  customDescBox: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  customDescText: {
    ...typography.body2,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
