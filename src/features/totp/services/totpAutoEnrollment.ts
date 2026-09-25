/**
 * TOTP Auto-Enrollment & Vault Merge Engine
 * Automatically extracts metadata, resolves website icons, links to existing credentials
 * by matching email/username and service domain, or creates a new encrypted vault item.
 */

import { VaultItem, AnyVaultPayload } from '../../../types/vault';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultSessionManager } from '../../../core/session';
import { parseOtpAuthUri } from '../parser/otpauthParser';
import { TOTPEnrollmentData } from '../types';
import { resolveTOTPService, ResolvedTOTPService, extractDomainFromUrlOrText } from './totpServiceResolver';

export type AutoEnrollAction = 'linked_existing' | 'created_new';

export interface AutoEnrollResult {
  action: AutoEnrollAction;
  item: VaultItem<AnyVaultPayload>;
  message: string;
  enrollmentData: TOTPEnrollmentData;
  resolvedService: ResolvedTOTPService;
}

/**
 * Searches existing vault items to find if an item matches the incoming TOTP enrollment.
 * Matches on service/issuer AND email/username/account.
 */
export function findMatchingVaultItem(
  items: VaultItem<AnyVaultPayload>[],
  enrollment: { issuer: string; account: string; secret: string }
): VaultItem<AnyVaultPayload> | null {
  const cleanIssuer = enrollment.issuer.trim().toLowerCase();
  const cleanAccount = enrollment.account.trim().toLowerCase();
  const resolved = resolveTOTPService(enrollment.issuer, enrollment.account);
  const targetDomain = resolved.domain ? resolved.domain.toLowerCase() : '';

  if (!items || items.length === 0) {
    return null;
  }

  // Pass 1: High-confidence match (both Service/Domain AND Account/Email match)
  for (const item of items) {
    const itemTitle = item.title.trim().toLowerCase();
    const p = (item.payload as unknown as Record<string, unknown>) || {};
    const itemUsername = ((p.username as string) || (p.accountName as string) || (p.email as string) || '').trim().toLowerCase();
    const itemWebsite = ((p.websiteUrl as string) || (p.endpointUrl as string) || '').trim().toLowerCase();
    const itemDomain = extractDomainFromUrlOrText(itemWebsite);

    const isServiceMatch =
      (cleanIssuer.length > 0 && itemTitle.includes(cleanIssuer)) ||
      (cleanIssuer.length > 0 && cleanIssuer.includes(itemTitle)) ||
      (targetDomain.length > 0 && itemWebsite.includes(targetDomain)) ||
      (targetDomain.length > 0 && itemDomain === targetDomain);

    const isAccountMatch =
      cleanAccount.length > 0 &&
      itemUsername.length > 0 &&
      (itemUsername === cleanAccount || itemUsername.includes(cleanAccount) || cleanAccount.includes(itemUsername));

    if (isServiceMatch && isAccountMatch) {
      return item;
    }
  }

  // Pass 2: Exact service match only if one of the accounts is unassigned or matching
  if (cleanIssuer.length > 0) {
    const serviceMatches = items.filter((item) => {
      const itemTitle = item.title.trim().toLowerCase();
      const p = (item.payload as unknown as Record<string, unknown>) || {};
      const itemUsername = ((p.username as string) || (p.accountName as string) || (p.email as string) || '').trim().toLowerCase();
      const itemWebsite = ((p.websiteUrl as string) || '').trim().toLowerCase();
      const itemDomain = extractDomainFromUrlOrText(itemWebsite);

      const isService =
        itemTitle === cleanIssuer ||
        (targetDomain.length > 0 && itemDomain === targetDomain);

      if (!isService) return false;

      // If both have different non-empty accounts, do NOT falsely match
      if (cleanAccount.length > 0 && itemUsername.length > 0 && cleanAccount !== itemUsername) {
        return false;
      }

      return true;
    });

    if (serviceMatches.length === 1) {
      return serviceMatches[0];
    }
  }

  return null;
}

/**
 * Automates the entire scan-to-vault workflow:
 * 1. Parses raw QR code string or takes parsed data.
 * 2. Resolves website title, domain, and icon.
 * 3. Inspects current vault for matching credential.
 * 4. Links to existing item OR generates new encrypted item.
 * 5. Commits to vault state machine and encrypted SQLite repository.
 */
export async function autoEnrollTOTP(
  input: string | TOTPEnrollmentData,
  masterKey?: Uint8Array
): Promise<AutoEnrollResult> {
  const enrollmentData: TOTPEnrollmentData =
    typeof input === 'string' ? parseOtpAuthUri(input) : input;

  const resolvedService = resolveTOTPService(
    enrollmentData.issuer,
    enrollmentData.account
  );

  const effectiveKey: Uint8Array | undefined =
    masterKey ?? VaultSessionManager.getMasterKey() ?? undefined;
  const currentItems = useVaultStore.getState().items;

  const matchedItem = findMatchingVaultItem(currentItems, enrollmentData);

  if (matchedItem) {
    // -----------------------------------------------------------------
    // MATCH FOUND: Link TOTP secret directly into existing vault item
    // -----------------------------------------------------------------
    const existingPayload = (matchedItem.payload as unknown as Record<string, unknown>) || {};
    const updatedIcon = matchedItem.icon || resolvedService.icon;
    const updatedWebsite = (existingPayload.websiteUrl as string) || resolvedService.websiteUrl;

    const updatedPayload = {
      ...existingPayload,
      totpSecret: enrollmentData.secret,
      secret: enrollmentData.secret,
      icon: updatedIcon,
      websiteUrl: updatedWebsite,
      issuer: resolvedService.title,
      accountName: enrollmentData.account || (existingPayload.username as string) || (existingPayload.accountName as string),
    } as unknown as AnyVaultPayload;

    const updatedItem: VaultItem<AnyVaultPayload> = {
      ...matchedItem,
      icon: updatedIcon,
      payload: updatedPayload,
      updatedAt: Date.now(),
    };

    await useVaultStore.getState().updateItem(matchedItem.id, updatedItem, effectiveKey ?? undefined);

    const accountLabel = enrollmentData.account || (existingPayload.username as string) || 'Account';
    return {
      action: 'linked_existing',
      item: updatedItem,
      message: `2FA linked to existing "${matchedItem.title}" (${accountLabel})`,
      enrollmentData,
      resolvedService,
    };
  }

  // -----------------------------------------------------------------
  // NO MATCH FOUND: Auto-create brand new encrypted vault item
  // -----------------------------------------------------------------
  const newItemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanTitle = resolvedService.title || 'Authenticator';
  const tagSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

  const newPayload = {
    username: enrollmentData.account,
    password: '',
    websiteUrl: resolvedService.websiteUrl,
    totpSecret: enrollmentData.secret,
    secret: enrollmentData.secret,
    issuer: cleanTitle,
    accountName: enrollmentData.account,
    algorithm: enrollmentData.algorithm || 'SHA1',
    digits: enrollmentData.digits || 6,
    period: enrollmentData.period || 30,
    icon: resolvedService.icon,
    notes: `Two-factor authenticator for ${cleanTitle}${enrollmentData.account ? ` (${enrollmentData.account})` : ''}.`,
  } as unknown as AnyVaultPayload;

  const newItem: VaultItem<AnyVaultPayload> = {
    id: newItemId,
    type: 'LOGIN',
    title: cleanTitle,
    isProtected: true,
    isFavorite: false,
    tags: ['login', 'totp', tagSlug].filter(Boolean),
    icon: resolvedService.icon,
    payload: newPayload,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await useVaultStore.getState().addItem(newItem, effectiveKey ?? undefined);

  const accountLabel = enrollmentData.account ? ` (${enrollmentData.account})` : '';
  return {
    action: 'created_new',
    item: newItem,
    message: `Created new 2FA item for "${cleanTitle}"${accountLabel}`,
    enrollmentData,
    resolvedService,
  };
}
