/**
 * Vault Item Edit Screen
 * Unified Category & Tag manager, dynamic website/image/icon link fetcher,
 * and AES-256-GCM encrypted persistence.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';
import { useVaultItemDetail } from '../../../features/vault/hooks/useVaultItemDetail';
import { VaultRepository } from '../../../features/vault/repository/vaultRepository';
import { useVaultStore } from '../../../features/vault/store/useVaultStore';
import { VaultSessionManager } from '../../../core/session';
import { VaultItem, VaultItemType, AnyVaultPayload } from '../../../types/vault';
import { ServiceIcon } from '../../../components/icon/ServiceIcon';
import { PasswordGeneratorModal } from '../../../features/password-generator';

export type CustomFieldType = 'text' | 'password' | 'description';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type?: CustomFieldType;
  isSecret?: boolean;
}

export interface VaultItemEditProps {
  id?: string;
  onBack?: () => void;
  onSaveComplete?: () => void;
}

interface SnackbarState {
  message: string;
  type?: 'error' | 'success' | 'info';
}

const CATEGORY_ITEMS: { type: VaultItemType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'LOGIN', label: 'Logins', icon: 'key-outline' },
  { type: 'CARD', label: 'Cards', icon: 'card-outline' },
  { type: 'SECURE_NOTE', label: 'Notes', icon: 'document-text-outline' },
  { type: 'IDENTITY', label: 'Identity', icon: 'person-outline' },
  { type: 'API_KEY', label: 'API Keys', icon: 'code-slash-outline' },
  { type: 'TOTP', label: 'TOTP', icon: 'shield-checkmark-outline' },
  { type: 'RECOVERY_CODES', label: 'Recovery', icon: 'grid-outline' },
];

const SUGGESTED_TAGS = ['Personal', 'Work', 'Finance', 'Crypto', 'Shopping', 'Dev'];

const MAJOR_SITE_PRESETS = [
  { key: 'google', label: 'Google' },
  { key: 'github', label: 'GitHub' },
  { key: 'apple', label: 'Apple' },
  { key: 'microsoft', label: 'Microsoft' },
  { key: 'amazon', label: 'Amazon' },
  { key: 'netflix', label: 'Netflix' },
  { key: 'discord', label: 'Discord' },
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'youtube', label: 'YouTube' },
];

function extractDomain(urlOrHost: string): string {
  if (!urlOrHost) return '';
  let clean = urlOrHost.trim();
  clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
  const domain = clean.split('/')[0].split('?')[0].split(':')[0];
  return domain.toLowerCase();
}

function resolveDynamicIcon(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // 1. Direct image, svg, icon, or data URI
  const isDirectImage =
    trimmed.startsWith('data:image/') ||
    /\.(png|jpg|jpeg|svg|ico|webp|gif)(\?.*)?$/i.test(trimmed) ||
    trimmed.includes('/favicon.ico') ||
    trimmed.includes('gstatic.com/favicon') ||
    trimmed.includes('google.com/s2/favicons');

  if (isDirectImage) {
    return trimmed;
  }

  // 2. Web URL or domain -> Favicon
  const domain = extractDomain(trimmed);
  if (domain && domain.includes('.')) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  return trimmed;
}

export default function VaultItemEditScreen({
  id,
  onBack,
  onSaveComplete,
}: VaultItemEditProps) {
  const isCreateMode = !id;
  const { item, isLoading } = useVaultItemDetail(id);

  const [selectedCategory, setSelectedCategory] = useState<VaultItemType>('LOGIN');
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [icon, setIcon] = useState('');
  const [tags, setTags] = useState<string[]>(['login']);
  const [tagInput, setTagInput] = useState('');
  const [urlWarning, setUrlWarning] = useState('');
  const [isProtected, setIsProtected] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [visibleSecretFieldIds, setVisibleSecretFieldIds] = useState<Record<string, boolean>>({});
  const [titleError, setTitleError] = useState(false);
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, boolean>>({});
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showSnackbar = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current);
    }
    setSnackbar({ message, type });
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar(null);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
    };
  }, []);

  // Sync state if item loads after initial mount in edit mode
  useEffect(() => {
    if (!isCreateMode && item) {
      setTitle(item.title);
      setSelectedCategory(item.type);
      setTags(item.tags ?? []);
      const p = (item.payload as unknown as Record<string, unknown>) || {};
      setUsername(
        (p.username as string) ||
        (p.cardholderName as string) ||
        (p.fullName as string) ||
        (p.accountName as string) ||
        (p.serviceName as string) ||
        ''
      );
      setPassword(
        (p.password as string) ||
        (p.cardNumber as string) ||
        (p.content as string) ||
        (p.apiKey as string) ||
        (p.secret as string) ||
        ''
      );
      setWebsiteUrl((p.websiteUrl as string) || (p.endpointUrl as string) || '');
      setNotes((p.notes as string) || (p.content as string) || '');
      setIsProtected(item.isProtected ?? true);
      const savedIcon =
        ((item as unknown as Record<string, unknown>).icon as string) ||
        ((p.icon as string) || '');
      setIcon(savedIcon);
      const loadedCustomFields = Array.isArray(p.customFields)
        ? (p.customFields as CustomField[])
        : [];
      setCustomFields(loadedCustomFields);
    }
  }, [isCreateMode, item]);

  const handleAddCustomField = () => {
    const newField: CustomField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: '',
      value: '',
      type: 'text',
      isSecret: false,
    };
    setCustomFields((prev) => [...prev, newField]);
  };

  const handleUpdateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleFieldVisibility = (id: string) => {
    setVisibleSecretFieldIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectCategory = (cat: VaultItemType) => {
    setSelectedCategory(cat);
    const catLower = cat.toLowerCase();
    if (isCreateMode && tags.length <= 1) {
      setTags([catLower]);
    }
  };

  const handleAddTag = (newTag: string) => {
    const clean = newTag.trim().toLowerCase().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleFetchDynamicIcon = () => {
    const candidate = websiteUrl.trim() || title.trim();
    if (!candidate) {
      setUrlWarning('Enter a website link (e.g. uddeshjaiswal.com) or image/icon link here');
      return;
    }

    setIsFetchingIcon(true);
    setUrlWarning('');

    const resolved = resolveDynamicIcon(candidate);
    if (!resolved) {
      setUrlWarning('Could not recognize domain or image link');
      setIsFetchingIcon(false);
      return;
    }

    setIcon(resolved);
    setTimeout(() => {
      setIsFetchingIcon(false);
    }, 150);
  };

  if (!isCreateMode && isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    let hasError = false;

    if (!title.trim()) {
      setTitleError(true);
      showSnackbar('Title is required to save item', 'error');
      hasError = true;
    }

    const newFieldErrors: Record<string, boolean> = {};
    customFields.forEach((cf) => {
      if (cf.value.trim() && !cf.label.trim()) {
        newFieldErrors[cf.id] = true;
        hasError = true;
      }
    });

    if (Object.keys(newFieldErrors).length > 0) {
      setCustomFieldErrors(newFieldErrors);
      showSnackbar(
        !title.trim()
          ? 'Title and custom field labels are required'
          : 'Please give your custom field a label',
        'error'
      );
      return;
    }

    if (hasError) {
      return;
    }

    setIsSaving(true);
    try {
      const masterKey = VaultSessionManager.getMasterKey();

      const cleanCustomFields: CustomField[] = customFields
        .map((f) => ({
          id: f.id || `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          label: f.label.trim() || 'Custom Field',
          value: f.value,
          type: f.type || 'text',
          isSecret: f.type === 'password' || Boolean(f.isSecret),
        }))
        .filter((f) => f.label.trim().length > 0 || f.value.length > 0);
      const customFieldsPayload = cleanCustomFields.length > 0 ? cleanCustomFields : undefined;

      let payload: AnyVaultPayload;
      const cleanIcon = icon.trim() || undefined;

      if (selectedCategory === 'CARD') {
        payload = {
          cardholderName: username.trim() || title.trim(),
          cardNumber: password.trim() || '0000 0000 0000 0000',
          expirationMonth: '12',
          expirationYear: '2028',
          cvv: '123',
          notes: notes.trim(),
          icon: cleanIcon,
          customFields: customFieldsPayload,
        };
      } else if (selectedCategory === 'SECURE_NOTE') {
        payload = {
          content: notes.trim() || password.trim() || username.trim() || title.trim(),
          icon: cleanIcon,
          customFields: customFieldsPayload,
        };
      } else if (selectedCategory === 'TOTP') {
        payload = {
          issuer: title.trim(),
          accountName: username.trim() || 'Account',
          secret: password.trim().replace(/\s/g, '').toUpperCase() || 'JBSWY3DPEHPK3PXP',
          notes: notes.trim(),
          icon: cleanIcon,
          customFields: customFieldsPayload,
        };
      } else if (selectedCategory === 'API_KEY') {
        payload = {
          apiKey: password.trim() || username.trim(),
          serviceName: title.trim(),
          endpointUrl: websiteUrl.trim() || undefined,
          notes: notes.trim(),
          icon: cleanIcon,
          customFields: customFieldsPayload,
        };
      } else if (selectedCategory === 'IDENTITY') {
        payload = {
          fullName: username.trim() || title.trim(),
          email: websiteUrl.includes('@') ? websiteUrl.trim() : undefined,
          notes: notes.trim(),
          icon: cleanIcon,
          customFields: customFieldsPayload,
        };
      } else if (selectedCategory === 'RECOVERY_CODES') {
        payload = {
          service: title.trim(),
          codes: notes.trim()
            ? notes.trim().split('\n').filter(Boolean)
            : [password.trim() || 'RECOVERY-001'],
          notes: notes.trim(),
          icon: cleanIcon,
          customFields: customFieldsPayload,
        };
      } else {
        // LOGIN default
        payload = {
          username: username.trim(),
          password,
          websiteUrl: websiteUrl.trim(),
          notes: notes.trim(),
          icon: cleanIcon,
          customFields: customFieldsPayload,
        };
      }

      const finalTags = tags.length > 0 ? tags : [selectedCategory.toLowerCase()];

      if (isCreateMode) {
        const newItem: VaultItem<AnyVaultPayload> = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: selectedCategory,
          title: title.trim(),
          isProtected,
          isFavorite: false,
          tags: finalTags,
          icon: cleanIcon,
          payload,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await useVaultStore.getState().addItem(newItem, masterKey ?? undefined);
      } else if (item) {
        await useVaultStore.getState().updateItem(
          item.id,
          {
            title: title.trim(),
            type: selectedCategory,
            isProtected,
            tags: finalTags,
            icon: cleanIcon,
            payload: {
              ...(item.payload as unknown as Record<string, unknown>),
              ...payload,
              username: username.trim(),
              password,
              websiteUrl: websiteUrl.trim(),
              notes: notes.trim(),
              icon: cleanIcon,
              customFields: customFieldsPayload,
            } as unknown as AnyVaultPayload,
          },
          masterKey ?? undefined
        );
      }

      onSaveComplete?.();
      onBack?.();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save item';
      showSnackbar(errMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const usernameLabel =
    selectedCategory === 'CARD'
      ? 'CARDHOLDER NAME'
      : selectedCategory === 'IDENTITY'
      ? 'FULL NAME'
      : selectedCategory === 'TOTP'
      ? 'ACCOUNT NAME'
      : selectedCategory === 'RECOVERY_CODES'
      ? 'SERVICE NAME'
      : 'USERNAME / EMAIL';

  const passwordLabel =
    selectedCategory === 'CARD'
      ? 'CARD NUMBER'
      : selectedCategory === 'API_KEY'
      ? 'API KEY / SECRET'
      : selectedCategory === 'TOTP'
      ? 'BASE32 SECRET'
      : 'PASSWORD';

  const isPasswordGeneratorSupported =
    selectedCategory === 'LOGIN' || selectedCategory === 'API_KEY';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Text style={styles.headerTitle}>{isCreateMode ? 'New Item' : 'Edit Item'}</Text>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save Changes"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>{isCreateMode ? 'Create' : 'Save'}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Unified Category & Labels Section */}
        <View style={styles.unifiedCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="folder-outline" size={13} color={colors.primaryLight} />
            <Text style={styles.fieldLabel}>CATEGORY & TAGS</Text>
          </View>

          {/* Category Horizontal Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContainer}
          >
            {CATEGORY_ITEMS.map((cat) => {
              const isSelected = selectedCategory === cat.type;
              return (
                <Pressable
                  key={cat.type}
                  onPress={() => handleSelectCategory(cat.type)}
                  style={({ pressed }) => [
                    styles.categoryPill,
                    isSelected && styles.categoryPillSelected,
                    pressed && styles.categoryPillPressed,
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={isSelected ? colors.primaryLight : colors.textMuted}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.cardDivider} />

          {/* Tags / Labels Row */}
          <View style={styles.tagsContainer}>
            <View style={styles.tagsChipContainer}>
              {tags.map((tag) => (
                <View key={tag} style={styles.activeTagChip}>
                  <Text style={styles.activeTagText}>#{tag}</Text>
                  <Pressable
                    onPress={() => handleRemoveTag(tag)}
                    style={styles.tagRemoveBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={11} color={colors.primaryLight} />
                  </Pressable>
                </View>
              ))}

              {SUGGESTED_TAGS.map((sug) => {
                const lower = sug.toLowerCase();
                if (tags.includes(lower)) return null;
                return (
                  <Pressable
                    key={sug}
                    onPress={() => handleAddTag(lower)}
                    style={({ pressed }) => [
                      styles.suggestedTagPill,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.suggestedTagText}>+ {sug}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Inline Custom Tag Input */}
            <View style={styles.compactTagInputRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={() => handleAddTag(tagInput)}
                placeholder="Add custom label tag..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                style={styles.compactTagTextInput}
              />
              <Pressable
                onPress={() => handleAddTag(tagInput)}
                style={({ pressed }) => [
                  styles.compactAddTagBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="add" size={14} color={colors.primaryLight} />
                <Text style={styles.compactAddTagBtnText}>Tag</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Streamlined Icon & Presets Bar */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sparkles-outline" size={13} color={colors.primaryLight} />
              <Text style={styles.fieldLabel}>ITEM ICON</Text>
            </View>
            {icon.length > 0 && (
              <Pressable onPress={() => setIcon('')} hitSlop={6}>
                <Text style={styles.resetIconText}>Reset to Auto</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.iconSimpleRow}>
            <ServiceIcon
              iconType={icon}
              category={selectedCategory}
              title={title || 'Item'}
              size="md"
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsMiniContainer}
            >
              {MAJOR_SITE_PRESETS.map((preset) => {
                const isSelected = icon === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => setIcon(preset.key)}
                    style={({ pressed }) => [
                      styles.presetMiniBtn,
                      isSelected && styles.presetMiniBtnSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <ServiceIcon iconType={preset.key} size="sm" />
                  </Pressable>
                );
              })}

              {/* Add Icon action button at last */}
              <Pressable
                onPress={handleFetchDynamicIcon}
                disabled={isFetchingIcon}
                style={({ pressed }) => [
                  styles.addIconActionBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add Icon"
              >
                {isFetchingIcon ? (
                  <ActivityIndicator size="small" color={colors.primaryLight} />
                ) : (
                  <>
                    <Ionicons name="add" size={13} color={colors.primaryLight} />
                    <Text style={styles.addIconActionText}>Add Icon</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>

        {/* Title Input with Field Validation Feedback */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, titleError && styles.fieldLabelError]}>TITLE</Text>
            {titleError && (
              <View style={styles.fieldErrorIndicator}>
                <Ionicons name="alert-circle" size={12} color={colors.crimson} style={{ marginRight: 3 }} />
                <Text style={styles.inlineErrorText}>Title is required</Text>
              </View>
            )}
          </View>
          <View style={[styles.inputContainer, titleError && styles.inputContainerError]}>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (titleError) setTitleError(false);
                if (snackbar) setSnackbar(null);
              }}
              placeholder="e.g. Google, GitHub, Netflix"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Dynamic Username / Identifier Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{usernameLabel}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. alex@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Dynamic Password / Secret Input */}
        {selectedCategory !== 'SECURE_NOTE' && (
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>{passwordLabel}</Text>
              {isPasswordGeneratorSupported && (
                <Pressable
                  onPress={() => setIsGeneratorOpen(true)}
                  style={({ pressed }) => [
                    styles.generateInlineBtn,
                    pressed && styles.generateInlineBtnPressed,
                  ]}
                  hitSlop={6}
                >
                  <Ionicons name="key" size={12} color={colors.primaryLight} style={{ marginRight: 4 }} />
                  <Text style={styles.generateInlineText}>Generate</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter value / secret"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={selectedCategory === 'LOGIN'}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>
          </View>
        )}

        {/* Website / Image URL Input with Dynamic Icon Fetching */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>WEBSITE / IMAGE URL</Text>
            <Pressable
              onPress={handleFetchDynamicIcon}
              disabled={isFetchingIcon}
              style={({ pressed }) => [
                styles.fetchActionBtn,
                pressed && styles.fetchActionBtnPressed,
              ]}
              hitSlop={6}
            >
              {isFetchingIcon ? (
                <ActivityIndicator size="small" color={colors.primaryLight} />
              ) : (
                <>
                  <Ionicons name="flash" size={11} color={colors.primaryLight} style={{ marginRight: 3 }} />
                  <Text style={styles.fetchActionText}>Fetch Icon</Text>
                </>
              )}
            </Pressable>
          </View>

          <View
            style={[
              styles.inputContainer,
              urlWarning ? styles.inputContainerWarning : null,
            ]}
          >
            <TextInput
              value={websiteUrl}
              onChangeText={(text) => {
                setWebsiteUrl(text);
                if (urlWarning) setUrlWarning('');
              }}
              placeholder="https://example.com or image / icon link"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.textInput}
            />
          </View>

          {/* Inline Visual Indicator if user pressed fetch while empty */}
          {Boolean(urlWarning) && (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle-outline" size={13} color="#FBBF24" />
              <Text style={styles.warningBannerText}>{urlWarning}</Text>
            </View>
          )}
        </View>

        {/* Encrypted Safe Notes Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {selectedCategory === 'SECURE_NOTE' ? 'NOTE CONTENT' : 'ENCRYPTED SAFE NOTES'}
          </Text>
          <View style={[styles.inputContainer, styles.notesInputContainer]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional private notes, emergency recovery codes, PINs..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.textInput, styles.notesInput]}
            />
          </View>
        </View>

        {/* Dynamic Customizable Extra Fields Section (Just Above Biometric Protection) */}
        <View style={styles.customFieldsSection}>
          <View style={styles.sectionHeaderRowWithAction}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="options-outline" size={13} color={colors.primaryLight} />
              <Text style={styles.fieldLabel}>CUSTOM FIELDS</Text>
            </View>
            <Pressable
              onPress={handleAddCustomField}
              style={({ pressed }) => [
                styles.addFieldButton,
                pressed && styles.addFieldButtonPressed,
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Add custom field"
            >
              <Ionicons name="add" size={14} color={colors.primaryLight} style={{ marginRight: 2 }} />
              <Text style={styles.addFieldButtonText}>Add Field</Text>
            </Pressable>
          </View>

          {customFields.length === 0 ? (
            <Pressable
              onPress={handleAddCustomField}
              style={({ pressed }) => [
                styles.emptyCustomFieldsCard,
                pressed && styles.emptyCustomFieldsCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add extra input field"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={styles.emptyCustomFieldsText}>
                Add extra field (text, password, description)
              </Text>
            </Pressable>
          ) : (
            <View style={styles.customFieldsList}>
              {customFields.map((field, index) => {
                const currentType: CustomFieldType = field.type || 'text';
                const isSecretVisible = Boolean(visibleSecretFieldIds[field.id]);

                return (
                  <View key={field.id || index} style={styles.customFieldCard}>
                    {/* Header: Label Input & Delete Button */}
                    <View style={styles.customFieldHeaderRow}>
                      <View
                        style={[
                          styles.customFieldLabelInputWrap,
                          customFieldErrors[field.id] && styles.customFieldLabelInputWrapError,
                        ]}
                      >
                        <Ionicons
                          name="pricetag-outline"
                          size={12}
                          color={customFieldErrors[field.id] ? colors.crimson : colors.textTertiary}
                          style={{ marginRight: 6 }}
                        />
                        <TextInput
                          value={field.label}
                          onChangeText={(text) => {
                            handleUpdateCustomField(field.id, { label: text });
                            if (customFieldErrors[field.id]) {
                              setCustomFieldErrors((prev) => ({ ...prev, [field.id]: false }));
                            }
                            if (snackbar) setSnackbar(null);
                          }}
                          placeholder="Field label (e.g. PIN, Secret Answer, Token)"
                          placeholderTextColor={customFieldErrors[field.id] ? 'rgba(239, 68, 68, 0.6)' : colors.textMuted}
                          style={styles.customFieldLabelInput}
                        />
                      </View>

                      <Pressable
                        onPress={() => handleRemoveCustomField(field.id)}
                        style={({ pressed }) => [
                          styles.removeFieldBtn,
                          pressed && styles.removeFieldBtnPressed,
                        ]}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${field.label || 'custom field'}`}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.crimson} />
                      </Pressable>
                    </View>

                    {/* Type Selector Pills: Text | Password | Description */}
                    <View style={styles.typeSelectorRow}>
                      <Pressable
                        onPress={() =>
                          handleUpdateCustomField(field.id, {
                            type: 'text',
                            isSecret: false,
                          })
                        }
                        style={[
                          styles.typeOptionPill,
                          currentType === 'text' && styles.typeOptionPillSelected,
                        ]}
                      >
                        <Ionicons
                          name="text-outline"
                          size={11}
                          color={currentType === 'text' ? '#FFFFFF' : colors.textTertiary}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.typeOptionText,
                            currentType === 'text' && styles.typeOptionTextSelected,
                          ]}
                        >
                          Text
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          handleUpdateCustomField(field.id, {
                            type: 'password',
                            isSecret: true,
                          })
                        }
                        style={[
                          styles.typeOptionPill,
                          currentType === 'password' && styles.typeOptionPillSelected,
                        ]}
                      >
                        <Ionicons
                          name="key-outline"
                          size={11}
                          color={currentType === 'password' ? '#FFFFFF' : colors.textTertiary}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.typeOptionText,
                            currentType === 'password' && styles.typeOptionTextSelected,
                          ]}
                        >
                          Password
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          handleUpdateCustomField(field.id, {
                            type: 'description',
                            isSecret: false,
                          })
                        }
                        style={[
                          styles.typeOptionPill,
                          currentType === 'description' && styles.typeOptionPillSelected,
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={11}
                          color={currentType === 'description' ? '#FFFFFF' : colors.textTertiary}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.typeOptionText,
                            currentType === 'description' && styles.typeOptionTextSelected,
                          ]}
                        >
                          Description
                        </Text>
                      </Pressable>
                    </View>

                    {/* Value Input Area */}
                    {currentType === 'description' ? (
                      <View style={[styles.customFieldValueContainer, styles.customFieldDescContainer]}>
                        <TextInput
                          value={field.value}
                          onChangeText={(text) => handleUpdateCustomField(field.id, { value: text })}
                          placeholder="Enter multiline description or notes..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                          textAlignVertical="top"
                          style={[styles.textInput, styles.customFieldDescInput]}
                        />
                      </View>
                    ) : (
                      <View style={styles.customFieldValueContainer}>
                        <TextInput
                          value={field.value}
                          onChangeText={(text) => handleUpdateCustomField(field.id, { value: text })}
                          placeholder={currentType === 'password' ? 'Enter secret / password value' : 'Enter field value'}
                          placeholderTextColor={colors.textMuted}
                          secureTextEntry={currentType === 'password' && !isSecretVisible}
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={[styles.textInput, { flex: 1 }]}
                        />
                        {currentType === 'password' && (
                          <Pressable
                            onPress={() => toggleFieldVisibility(field.id)}
                            style={styles.eyeToggleBtn}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={isSecretVisible ? 'Hide secret' : 'Show secret'}
                          >
                            <Ionicons
                              name={isSecretVisible ? 'eye-off-outline' : 'eye-outline'}
                              size={16}
                              color={colors.textSecondary}
                            />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Biometric Protection Toggle */}
        <View style={styles.protectionCard}>
          <View style={styles.protectionIconCircle}>
            <Ionicons name="finger-print" size={20} color={colors.primaryLight} />
          </View>
          <View style={styles.protectionTextContainer}>
            <Text style={styles.protectionTitle}>Biometric Protection</Text>
            <Text style={styles.protectionSubtitle}>
              Require biometric authentication to reveal credentials
            </Text>
          </View>
          <Switch
            value={isProtected}
            onValueChange={setIsProtected}
            trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>

      {/* Embedded Cryptographic Password Generator Modal */}
      <PasswordGeneratorModal
        visible={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSelectPassword={(generatedPassword) => {
          setPassword(generatedPassword);
        }}
      />

      {/* Dynamic Sweet Snackbar Alert */}
      {snackbar && (
        <Pressable
          onPress={() => setSnackbar(null)}
          style={[
            styles.snackbarContainer,
            snackbar.type === 'error' && styles.snackbarErrorContainer,
            snackbar.type === 'success' && styles.snackbarSuccessContainer,
          ]}
          accessibilityRole="alert"
        >
          <View style={styles.snackbarContent}>
            <View
              style={[
                styles.snackbarIconCircle,
                snackbar.type === 'error' && styles.snackbarErrorIconCircle,
                snackbar.type === 'success' && styles.snackbarSuccessIconCircle,
              ]}
            >
              <Ionicons
                name={
                  snackbar.type === 'error'
                    ? 'alert-circle'
                    : snackbar.type === 'success'
                    ? 'checkmark-circle'
                    : 'information-circle'
                }
                size={18}
                color={
                  snackbar.type === 'error'
                    ? colors.crimson
                    : snackbar.type === 'success'
                    ? colors.emerald
                    : colors.primaryLight
                }
              />
            </View>

            <View style={styles.snackbarTextWrap}>
              <Text style={styles.snackbarTitle}>
                {snackbar.type === 'error' ? 'Validation Error' : 'Notice'}
              </Text>
              <Text style={styles.snackbarMessage}>{snackbar.message}</Text>
            </View>

            <Pressable
              onPress={() => setSnackbar(null)}
              hitSlop={8}
              style={styles.snackbarDismissBtn}
              accessibilityRole="button"
              accessibilityLabel="Dismiss alert"
            >
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
        </Pressable>
      )}
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
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerButtonPressed: {
    opacity: 0.7,
  },
  cancelText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  headerTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    gap: spacing.lg,
  },
  unifiedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
  },
  categoryScrollContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillSelected: {
    backgroundColor: 'rgba(123, 97, 255, 0.16)',
    borderColor: colors.primary,
  },
  categoryPillPressed: {
    opacity: 0.8,
  },
  categoryPillText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 2,
  },
  tagsContainer: {
    gap: spacing.xs,
  },
  tagsChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.35)',
    borderRadius: radius.full,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 3,
    gap: 4,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  tagRemoveBtn: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(123, 97, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedTagPill: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  suggestedTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  compactTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 36,
    marginTop: 2,
  },
  compactTagTextInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  compactAddTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 2,
  },
  compactAddTagBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  resetIconText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  iconSimpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  presetsMiniContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  presetMiniBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 1,
  },
  presetMiniBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(123, 97, 255, 0.2)',
  },
  addIconActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.35)',
    borderRadius: radius.md,
    paddingHorizontal: 8,
    height: 36,
    gap: 3,
  },
  addIconActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  fetchActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
  },
  fetchActionBtnPressed: {
    opacity: 0.7,
  },
  fetchActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputContainerWarning: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  warningBannerText: {
    fontSize: 11,
    color: '#FBBF24',
    fontWeight: '600',
  },
  generateInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.25)',
  },
  generateInlineBtnPressed: {
    opacity: 0.7,
  },
  generateInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  notesInputContainer: {
    minHeight: 100,
    paddingVertical: spacing.sm,
  },
  textInput: {
    ...typography.body2,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  notesInput: {
    minHeight: 80,
  },
  protectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  protectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  protectionTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  protectionTitle: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  protectionSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  customFieldsSection: {
    gap: spacing.xs,
  },
  sectionHeaderRowWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
  },
  addFieldButtonPressed: {
    opacity: 0.7,
  },
  addFieldButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  emptyCustomFieldsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  emptyCustomFieldsCardPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  emptyCustomFieldsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  customFieldsList: {
    gap: spacing.sm,
  },
  customFieldCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  customFieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  customFieldLabelInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 36,
  },
  customFieldLabelInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  removeFieldBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFieldBtnPressed: {
    opacity: 0.7,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  typeOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOptionPillSelected: {
    backgroundColor: 'rgba(123, 97, 255, 0.2)',
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  typeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customFieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
  },
  customFieldDescContainer: {
    minHeight: 70,
    paddingVertical: spacing.xs,
  },
  customFieldDescInput: {
    minHeight: 56,
  },
  eyeToggleBtn: {
    padding: 4,
    marginLeft: 6,
  },
  snackbarContainer: {
    position: 'absolute',
    bottom: 24,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: '#16171E',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
  snackbarErrorContainer: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: '#19151A',
  },
  snackbarSuccessContainer: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
    backgroundColor: '#131A17',
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  snackbarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snackbarErrorIconCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  snackbarSuccessIconCircle: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  snackbarTextWrap: {
    flex: 1,
  },
  snackbarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  snackbarMessage: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  snackbarDismissBtn: {
    padding: 4,
  },
  fieldLabelError: {
    color: colors.crimson,
  },
  fieldErrorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineErrorText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.crimson,
  },
  inputContainerError: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  customFieldLabelInputWrapError: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
});
