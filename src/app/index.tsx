import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface VaultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Login' | 'Secure Note' | 'Recovery' | 'API Key' | 'Card';
  tag?: string;
  tagColor?: 'emerald' | 'amber' | 'primary' | 'default';
  iconType: 'google' | 'github' | 'aws' | 'archive' | 'mail' | 'key' | 'wifi';
  isFavorite: boolean;
  isProtected?: boolean;
  hasTOTP?: boolean;
  totpLabel?: string;
  twoFactorLabel?: string;
}

const FAVORITE_ITEMS: VaultItem[] = [
  {
    id: 'google',
    title: 'Google (Gmail)',
    subtitle: 'alex.turner@gmail.com',
    category: 'Login',
    tag: 'Login',
    tagColor: 'default',
    iconType: 'google',
    isFavorite: true,
    isProtected: true,
    hasTOTP: true,
    totpLabel: 'TOTP Active',
  },
  {
    id: 'github',
    title: 'GitHub',
    subtitle: 'alexturner-dev (Work)',
    category: 'Login',
    tag: 'Login',
    tagColor: 'default',
    iconType: 'github',
    isFavorite: true,
    isProtected: true,
    twoFactorLabel: '2FA Active',
  },
  {
    id: 'aws',
    title: 'AWS Console',
    subtitle: 'production-root',
    category: 'API Key',
    tag: 'Cloud API / IAM',
    tagColor: 'amber',
    iconType: 'aws',
    isFavorite: true,
    isProtected: true,
  },
];

const ALL_ITEMS: VaultItem[] = [
  {
    id: '1password',
    title: '1Password Migration Exp...',
    subtitle: 'backup-personal.opvau...',
    category: 'Recovery',
    tag: 'Recovery',
    tagColor: 'default',
    iconType: 'archive',
    isFavorite: false,
  },
  {
    id: 'protonmail',
    title: 'ProtonMail',
    subtitle: 'alex.t@pm.me',
    category: 'Login',
    tag: 'Protected',
    tagColor: 'emerald',
    iconType: 'mail',
    isFavorite: false,
    isProtected: true,
  },
  {
    id: 'stripe',
    title: 'Stripe Secret Key',
    subtitle: 'sk_live_992x...',
    category: 'API Key',
    tag: 'API Key',
    tagColor: 'amber',
    iconType: 'key',
    isFavorite: false,
  },
  {
    id: 'wifi',
    title: 'WiFi Home Fiber',
    subtitle: 'Borealis-5G-Ultra',
    category: 'Secure Note',
    tag: 'Secure Note',
    tagColor: 'default',
    iconType: 'wifi',
    isFavorite: false,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', count: 38 },
  { id: 'logins', label: 'Logins', count: 24 },
  { id: 'notes', label: 'Secure Notes', count: 6 },
  { id: 'cards', label: 'Cards', count: 4 },
  { id: 'api_keys', label: 'API Keys', count: 3 },
  { id: 'identity', label: 'Identity', count: 1 },
];

export default function VaultHomeLaunch() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'vault' | 'favorites' | 'search' | 'settings'>('vault');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [revealedPassword, setRevealedPassword] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const showCopyToast = (text: string) => {
    setCopiedNotification(text);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const renderServiceIcon = (type: VaultItem['iconType'], size: number = 38) => {
    switch (type) {
      case 'google':
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <Text style={styles.googleMonogram}>G</Text>
          </View>
        );
      case 'github':
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <MaterialCommunityIcons name="code-tags" size={size * 0.55} color={colors.textPrimary} />
          </View>
        );
      case 'aws':
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <MaterialCommunityIcons name="cloud-outline" size={size * 0.55} color={colors.amber} />
          </View>
        );
      case 'archive':
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <MaterialCommunityIcons name="folder-zip-outline" size={size * 0.55} color={colors.textSecondary} />
          </View>
        );
      case 'mail':
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <Feather name="mail" size={size * 0.52} color={colors.emerald} />
          </View>
        );
      case 'key':
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <Ionicons name="key-outline" size={size * 0.52} color={colors.amber} />
          </View>
        );
      case 'wifi':
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <Feather name="wifi" size={size * 0.52} color={colors.textSecondary} />
          </View>
        );
      default:
        return (
          <View style={[styles.serviceIconContainer, { width: size, height: size }]}>
            <Ionicons name="lock-closed-outline" size={size * 0.52} color={colors.primary} />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Application Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.vaultLogoBox}>
            <Ionicons name="radio-button-on" size={18} color={colors.primaryLight} />
          </View>
          <View style={styles.topBarTitleGroup}>
            <Text style={styles.appTitle}>VaultNote</Text>
            <View style={styles.encryptedIndicator}>
              <View style={styles.greenDot} />
              <Text style={styles.encryptedText}>Encrypted</Text>
            </View>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <Text style={styles.vaultHeaderText}>Vault</Text>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={15} color={colors.primaryLight} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Greeting & Enclave Badge */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Good evening, Alex</Text>
          <View style={styles.enclaveBadge}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.emerald} style={{ marginRight: 4 }} />
            <Text style={styles.enclaveBadgeText}>Offline Enclave</Text>
          </View>
        </View>

        {/* Title & Stats */}
        <View style={styles.titleRow}>
          <Text style={styles.mainTitle}>Your Vault</Text>
          <Text style={styles.secretsCountText}>38 secrets locked</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your vault..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable style={styles.filterButton}>
            <Feather name="sliders" size={15} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  isActive ? styles.categoryChipActive : styles.categoryChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive ? styles.categoryChipTextActive : styles.categoryChipTextInactive,
                  ]}
                >
                  {cat.label}
                </Text>
                <View
                  style={[
                    styles.categoryCountBadge,
                    isActive ? styles.categoryCountBadgeActive : styles.categoryCountBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryCountText,
                      isActive ? styles.categoryCountTextActive : styles.categoryCountTextInactive,
                    ]}
                  >
                    {cat.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Zero Breaches Banner */}
        <View style={styles.breachesBanner}>
          <View style={styles.breachShieldBox}>
            <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
          </View>
          <View style={styles.breachTextGroup}>
            <Text style={styles.breachTitle}>Zero breaches detected</Text>
            <Text style={styles.breachSubtitle}>Last verified local snapshot: 2m ago</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        {/* Favorites Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="star" size={16} color={colors.gold} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Favorites</Text>
          </View>
          <Text style={styles.sectionMetaText}>3 items</Text>
        </View>

        {/* Favorites Cards */}
        {FAVORITE_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSelectedItem(item)}
            style={({ pressed }) => [
              styles.favoriteCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardMainRow}>
              {renderServiceIcon(item.iconType)}

              <View style={styles.cardInfoGroup}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.isProtected && (
                    <Ionicons name="lock-closed" size={12} color={colors.emerald} style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>

              <Pressable hitSlop={10}>
                <Ionicons name="star" size={18} color={colors.gold} />
              </Pressable>
            </View>

            {/* Tags & Action Buttons Row */}
            <View style={styles.cardBottomRow}>
              <View style={styles.tagsRow}>
                {item.tag && (
                  <View style={styles.subtleTag}>
                    <Text style={styles.dotPrefix}>•</Text>
                    <Text style={styles.subtleTagText}>{item.tag}</Text>
                  </View>
                )}
                {item.totpLabel && (
                  <View style={styles.emeraldTag}>
                    <Ionicons name="time-outline" size={11} color={colors.emerald} style={{ marginRight: 3 }} />
                    <Text style={styles.emeraldTagText}>{item.totpLabel}</Text>
                  </View>
                )}
                {item.twoFactorLabel && (
                  <View style={styles.emeraldTag}>
                    <Ionicons name="shield-checkmark-outline" size={11} color={colors.emerald} style={{ marginRight: 3 }} />
                    <Text style={styles.emeraldTagText}>{item.twoFactorLabel}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActionsRow}>
                <Pressable
                  style={styles.iconActionButton}
                  onPress={() => showCopyToast(`Key copied for ${item.title}`)}
                >
                  <Ionicons name="key-outline" size={14} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={styles.iconActionButton}
                  onPress={() => showCopyToast(`Password copied for ${item.title}`)}
                >
                  <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}

        {/* All Items Header */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
          <Text style={styles.allSectionTitle}>All Items</Text>
          <View style={styles.sortButton}>
            <Text style={styles.sortButtonText}>Sort: Recent</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} style={{ marginLeft: 2 }} />
          </View>
        </View>

        {/* All Items List Rows */}
        <View style={styles.itemsListContainer}>
          {ALL_ITEMS.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedItem(item)}
              style={({ pressed }) => [
                styles.itemRow,
                index < ALL_ITEMS.length - 1 && styles.itemRowBorder,
                pressed && styles.cardPressed,
              ]}
            >
              {renderServiceIcon(item.iconType, 36)}

              <View style={styles.itemRowCenter}>
                <View style={styles.itemRowTitleLine}>
                  <Text style={styles.itemRowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
                <View style={styles.itemRowSubtitleLine}>
                  <Text style={styles.itemRowSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                  {item.tag && (
                    <View
                      style={[
                        styles.categoryPillTag,
                        item.tagColor === 'emerald'
                          ? styles.tagEmeraldPill
                          : item.tagColor === 'amber'
                          ? styles.tagAmberPill
                          : styles.tagDefaultPill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          item.tagColor === 'emerald'
                            ? styles.tagEmeraldText
                            : item.tagColor === 'amber'
                            ? styles.tagAmberText
                            : styles.tagDefaultText,
                        ]}
                      >
                        {item.tag}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.itemRowRight}>
                <Ionicons name="star-outline" size={16} color={colors.textTertiary} style={{ marginRight: 8 }} />
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Toast Notification */}
      {copiedNotification && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={16} color={colors.emerald} style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{copiedNotification}</Text>
        </View>
      )}

      {/* Floating Action Button (+) */}
      <Pressable style={styles.fabButton} onPress={() => showCopyToast('Create secret modal')}>
        <Ionicons name="add" size={28} color="#0D0E11" />
      </Pressable>

      {/* Bottom Tab Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <Pressable
          style={styles.tabItem}
          onPress={() => setActiveTab('vault')}
        >
          <Ionicons
            name={activeTab === 'vault' ? 'lock-closed' : 'lock-closed-outline'}
            size={20}
            color={activeTab === 'vault' ? colors.primaryLight : colors.textTertiary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'vault' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Vault
          </Text>
        </Pressable>

        <Pressable
          style={styles.tabItem}
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons
            name={activeTab === 'favorites' ? 'star' : 'star-outline'}
            size={20}
            color={activeTab === 'favorites' ? colors.primaryLight : colors.textTertiary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'favorites' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Favorites
          </Text>
        </Pressable>

        <Pressable
          style={styles.tabItem}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={20}
            color={activeTab === 'search' ? colors.primaryLight : colors.textTertiary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'search' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Search
          </Text>
        </Pressable>

        <Pressable
          style={styles.tabItem}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={20}
            color={activeTab === 'settings' ? colors.primaryLight : colors.textTertiary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'settings' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Settings
          </Text>
        </Pressable>
      </View>

      {/* Secret Detail Modal (Matches login_detail.png) */}
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Modal Navigation Bar */}
            <View style={styles.modalNavBar}>
              <Pressable
                style={styles.modalBackBtn}
                onPress={() => {
                  setSelectedItem(null);
                  setRevealedPassword(false);
                }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                <Text style={styles.modalBackText}>Vault</Text>
              </Pressable>

              <View style={styles.modalNavActions}>
                <Pressable style={styles.modalActionCircle}>
                  <Ionicons name="star-outline" size={17} color={colors.textSecondary} />
                </Pressable>
                <Pressable style={styles.modalEditButton}>
                  <Feather name="edit-2" size={13} color={colors.textPrimary} style={{ marginRight: 5 }} />
                  <Text style={styles.modalEditText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.modalActionCircle}>
                  <Feather name="more-horizontal" size={17} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Detail Header Profile */}
              <View style={styles.detailHeaderCard}>
                <View style={styles.detailAvatarContainer}>
                  {renderServiceIcon(selectedItem.iconType, 50)}
                  <View style={styles.enclaveBadgeSmall}>
                    <Ionicons name="lock-closed" size={10} color={colors.textInverse} />
                  </View>
                </View>

                <View style={styles.detailTitleGroup}>
                  <View style={styles.detailTitleRow}>
                    <Text style={styles.detailItemTitle}>{selectedItem.title}</Text>
                    <View style={styles.protectedPill}>
                      <View style={styles.greenDot} />
                      <Text style={styles.protectedPillText}>Protected</Text>
                    </View>
                  </View>
                  <Text style={styles.detailSubtitleText}>Personal Workspace • accounts.google.com</Text>
                  <View style={styles.detailAuditRow}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={colors.emerald} style={{ marginRight: 4 }} />
                    <Text style={styles.detailAuditText}>Updated 4h ago • Hardware Secure Enclave</Text>
                  </View>
                </View>
              </View>

              {/* Primary Credentials Box */}
              <Text style={styles.groupSectionLabel}>PRIMARY CREDENTIALS</Text>
              <View style={styles.detailCard}>
                <View style={styles.fieldRow}>
                  <View>
                    <Text style={styles.fieldLabel}>Username / Email</Text>
                    <Text style={styles.fieldValueMono}>alex.turner@gmail.com</Text>
                  </View>
                  <Pressable
                    style={styles.fieldCopyBtn}
                    onPress={() => showCopyToast('Username copied to clipboard')}
                  >
                    <Ionicons name="copy-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.fieldCopyText}>Copy</Text>
                  </Pressable>
                </View>

                <View style={styles.fieldDivider} />

                <View style={styles.fieldRow}>
                  <View>
                    <Text style={styles.fieldLabel}>Master Password</Text>
                    <Text style={styles.fieldValueMono}>
                      {revealedPassword ? 'vX9!mQ7#L2@pZ8' : '••••••••••••••••'}
                    </Text>
                  </View>
                  <View style={styles.passwordActionsGroup}>
                    <Pressable
                      style={styles.revealBtn}
                      onPress={() => setRevealedPassword(!revealedPassword)}
                    >
                      <Ionicons
                        name={revealedPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={14}
                        color={colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.revealText}>{revealedPassword ? 'Hide' : 'Reveal'}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.fieldCopyBtnActive}
                      onPress={() => showCopyToast('Password copied (30s auto-wipe)')}
                    >
                      <Ionicons name="copy-outline" size={13} color={colors.primaryLight} style={{ marginRight: 4 }} />
                      <Text style={styles.fieldCopyTextActive}>Copy</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.biometricNoticeRow}>
                  <MaterialCommunityIcons name="fingerprint" size={14} color={colors.amber} style={{ marginRight: 6 }} />
                  <Text style={styles.biometricNoticeText}>Biometric auth required to reveal raw plaintext</Text>
                </View>
              </View>

              {/* TOTP Authenticator Box */}
              <View style={styles.totpHeaderRow}>
                <Text style={styles.groupSectionLabel}>TOTP AUTHENTICATOR</Text>
                <View style={styles.activeSyncBadge}>
                  <View style={styles.greenDot} />
                  <Text style={styles.activeSyncText}>Active Sync</Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.totpCodeRow}>
                  <View>
                    <Text style={styles.fieldLabel}>One-Time Passcode</Text>
                    <Text style={styles.totpLargeCode}>483 921</Text>
                  </View>
                  <View style={styles.totpCountdownRing}>
                    <Text style={styles.totpCountdownText}>15s</Text>
                  </View>
                </View>

                <View style={styles.totpBottomRow}>
                  <Pressable
                    style={styles.copyTotpBtn}
                    onPress={() => showCopyToast('TOTP Code 483921 copied')}
                  >
                    <Ionicons name="keypad-outline" size={15} color={colors.textPrimary} style={{ marginRight: 6 }} />
                    <Text style={styles.copyTotpBtnText}>Copy 6-Digit Code</Text>
                  </Pressable>
                  <Text style={styles.rotatesInText}>Rotates in 18s</Text>
                </View>
              </View>

              {/* Associated Domain */}
              <Text style={styles.groupSectionLabel}>ASSOCIATED DOMAIN</Text>
              <View style={styles.detailCard}>
                <View style={styles.domainRow}>
                  <View style={styles.domainLeft}>
                    <Feather name="globe" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={styles.fieldLabel}>Sign-in Page</Text>
                      <Text style={styles.domainUrlText}>https://accounts.google.com</Text>
                    </View>
                  </View>
                  <View style={styles.domainActionBtns}>
                    <Pressable style={styles.circleDomainBtn}>
                      <Feather name="external-link" size={14} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable style={styles.circleDomainBtn}>
                      <Feather name="link" size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Safe Notes */}
              <View style={styles.notesHeaderRow}>
                <Text style={styles.groupSectionLabel}>ENCRYPTED SAFE NOTES</Text>
                <Ionicons name="lock-closed" size={12} color={colors.textTertiary} />
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.notesBodyText}>
                  Recovery phone: +1 (555) 019-2834.{'\n'}
                  Store fallback 8-digit emergency backup codes in physical biometric safe drawer.
                </Text>
                <View style={styles.notesTagsRow}>
                  <View style={styles.notePill}><Text style={styles.notePillText}>#personal</Text></View>
                  <View style={styles.notePill}><Text style={styles.notePillText}>#google</Text></View>
                  <View style={styles.notePill}><Text style={styles.notePillText}>#primary-email</Text></View>
                </View>
                <View style={styles.auditPassedBox}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.emerald} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditPassedTitle}>Cryptographic Strength: High (84 bits)</Text>
                    <Text style={styles.auditPassedSub}>0 compromises in offline HIBP hash catalog</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <Pressable style={styles.revisionHistoryBtn}>
                <Ionicons name="time-outline" size={16} color={colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.revisionHistoryText}>View Revision History</Text>
              </Pressable>

              <Pressable style={styles.deleteCredentialBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.crimson} style={{ marginRight: 8 }} />
                <Text style={styles.deleteCredentialText}>Delete Credential</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 90,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  topBarTitleGroup: {
    justifyContent: 'center',
  },
  appTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  encryptedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.emerald,
    marginRight: 4,
  },
  encryptedText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '500',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultHeaderText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(123, 97, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Greeting & Enclave Badge
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  greetingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  enclaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  enclaveBadgeText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  mainTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  secretsCountText: {
    color: colors.textTertiary,
    fontSize: 13,
    fontFamily: typography.fontFamily.mono,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 46,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    height: '100%',
  },
  filterButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Filter Chips
  categoryScroll: {
    paddingBottom: 4,
    gap: 8,
    marginBottom: 18,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: '#5B50FF',
    borderColor: '#6E64FF',
  },
  categoryChipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  categoryChipTextActive: {
    color: colors.textPrimary,
  },
  categoryChipTextInactive: {
    color: colors.textSecondary,
  },
  categoryCountBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  categoryCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryCountBadgeInactive: {
    backgroundColor: 'transparent',
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryCountTextActive: {
    color: '#FFFFFF',
  },
  categoryCountTextInactive: {
    color: colors.textTertiary,
  },

  // Breaches Banner
  breachesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  breachShieldBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breachTextGroup: {
    flex: 1,
  },
  breachTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  breachSubtitle: {
    color: colors.textTertiary,
    fontSize: 12,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionMetaText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
  },
  allSectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  // Favorites Cards
  favoriteCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: colors.surfaceActive,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceIconContainer: {
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleMonogram: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  cardInfoGroup: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: typography.fontFamily.mono,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dotPrefix: {
    color: colors.textSecondary,
    fontSize: 10,
    marginRight: 3,
  },
  subtleTagText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  emeraldTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  emeraldTagText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // All Items List
  itemsListContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  itemRowCenter: {
    flex: 1,
    marginRight: 8,
  },
  itemRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemRowTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemRowSubtitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemRowSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
  },
  categoryPillTag: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tagEmeraldPill: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emeraldBorder,
  },
  tagEmeraldText: {
    color: colors.emerald,
  },
  tagAmberPill: {
    backgroundColor: colors.amberMuted,
    borderColor: colors.amberBorder,
  },
  tagAmberText: {
    color: colors.amber,
  },
  tagDefaultPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: colors.border,
  },
  tagDefaultText: {
    color: colors.textSecondary,
  },
  itemRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Floating Action Button
  fabButton: {
    position: 'absolute',
    bottom: 74,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#C4B5FD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Bottom Navigation Bar
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#0D0E11',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primaryLight,
  },
  tabLabelInactive: {
    color: colors.textTertiary,
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 54,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E202A',
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 999,
  },
  toastText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Modal Screen (login_detail.png)
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBackText: {
    color: colors.textSecondary,
    fontSize: 15,
    marginLeft: 2,
  },
  modalNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalActionCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalEditText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalScrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  detailHeaderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  enclaveBadgeSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitleGroup: {
    flex: 1,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  detailItemTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  protectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  protectedPillText: {
    color: colors.emerald,
    fontSize: 10,
    fontWeight: '600',
  },
  detailSubtitleText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  detailAuditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailAuditText: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  groupSectionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    marginBottom: 2,
  },
  fieldValueMono: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: typography.fontFamily.mono,
  },
  fieldCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fieldCopyText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 12,
  },
  passwordActionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  revealText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  fieldCopyBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fieldCopyTextActive: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  biometricNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  biometricNoticeText: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  totpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSyncText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '500',
  },
  totpCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totpLargeCode: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 2,
  },
  totpCountdownRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totpCountdownText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  totpBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  copyTotpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  copyTotpBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  rotatesInText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  domainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  domainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  domainUrlText: {
    color: colors.primaryLight,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  domainActionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  circleDomainBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesBodyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.fontFamily.mono,
    marginBottom: 10,
  },
  notesTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  notePill: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  notePillText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  auditPassedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    borderRadius: 10,
    padding: 10,
  },
  auditPassedTitle: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '600',
  },
  auditPassedSub: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  revisionHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  revisionHistoryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteCredentialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    paddingVertical: 12,
  },
  deleteCredentialText: {
    color: colors.crimson,
    fontSize: 14,
    fontWeight: '600',
  },
});
