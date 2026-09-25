/**
 * VaultNote Domain Models & Item Contracts
 * Core Architecture: Multi-category zero-knowledge vault item entities
 */

export type VaultItemType =
  | 'LOGIN'
  | 'SECURE_NOTE'
  | 'TOTP'
  | 'CARD'
  | 'API_KEY'
  | 'IDENTITY'
  | 'RECOVERY_CODES';

export type CustomFieldType = 'text' | 'password' | 'description';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type?: CustomFieldType;
  isSecret?: boolean;
}

export interface LoginPayload {
  username: string;
  password: string;
  websiteUrl?: string;
  totpSecret?: string;
  notes?: string;
  icon?: string;
  customFields?: CustomField[];
}

export interface SecureNotePayload {
  content: string;
  icon?: string;
  customFields?: CustomField[];
}

export interface TOTPPayload {
  issuer: string;
  accountName: string;
  secret: string; // Base32 secret string
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: 6 | 8;
  period?: number; // default 30
  icon?: string;
  customFields?: CustomField[];
}

export interface CardPayload {
  cardholderName: string;
  cardNumber: string;
  expirationMonth: string; // '01' through '12'
  expirationYear: string;  // e.g. '2028'
  cvv: string;
  pin?: string;
  cardType?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  notes?: string;
  icon?: string;
  customFields?: CustomField[];
}

export interface APIKeyPayload {
  apiKey: string;
  apiSecret?: string;
  serviceName?: string;
  endpointUrl?: string;
  expiresAt?: number;
  notes?: string;
  icon?: string;
  customFields?: CustomField[];
}

export interface IdentityPayload {
  fullName: string;
  email?: string;
  phone?: string;
  passportNumber?: string;
  ssnOrNationalId?: string;
  address?: string;
  notes?: string;
  icon?: string;
  customFields?: CustomField[];
}

export interface RecoveryCodesPayload {
  service: string;
  codes: string[];
  notes?: string;
  icon?: string;
  customFields?: CustomField[];
}

export type AnyVaultPayload =
  | LoginPayload
  | SecureNotePayload
  | TOTPPayload
  | CardPayload
  | APIKeyPayload
  | IdentityPayload
  | RecoveryCodesPayload;

/**
 * Universal Decrypted Vault Item Entity
 */
export interface VaultItem<T = AnyVaultPayload> {
  id: string;
  type: VaultItemType;
  title: string;
  payload: T;
  tags: string[];
  isFavorite: boolean;
  isProtected?: boolean; // Requires biometric re-authentication before reveal
  createdAt: number;
  updatedAt: number;
  icon?: string;
}

export interface CategoryOption {
  id: string;
  label: string;
  type?: VaultItemType;
}

export const VAULT_CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'All' },
  { id: 'LOGIN', label: 'Logins', type: 'LOGIN' },
  { id: 'SECURE_NOTE', label: 'Notes', type: 'SECURE_NOTE' },
  { id: 'CARD', label: 'Cards', type: 'CARD' },
  { id: 'TOTP', label: 'TOTP', type: 'TOTP' },
  { id: 'API_KEY', label: 'API Keys', type: 'API_KEY' },
  { id: 'IDENTITY', label: 'Identity', type: 'IDENTITY' },
  { id: 'RECOVERY_CODES', label: 'Recovery', type: 'RECOVERY_CODES' },
];

export interface VaultItemRowData {
  id: string;
  title: string;
  subtitle?: string;
  category: VaultItemType | string;
  tag?: string;
  iconType?: string;
  isFavorite: boolean;
  isProtected?: boolean;
  hasTOTP?: boolean;
  totpLabel?: string;
  twoFactorLabel?: string;
}
