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

export interface CustomField {
  id: string;
  label: string;
  value: string;
  isSecret?: boolean;
}

export interface LoginPayload {
  username: string;
  password: string;
  websiteUrl?: string;
  totpSecret?: string;
  notes?: string;
  customFields?: CustomField[];
}

export interface SecureNotePayload {
  content: string;
}

export interface TOTPPayload {
  issuer: string;
  accountName: string;
  secret: string; // Base32 secret string
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: 6 | 8;
  period?: number; // default 30
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
}

export interface APIKeyPayload {
  apiKey: string;
  apiSecret?: string;
  serviceName?: string;
  endpointUrl?: string;
  expiresAt?: number;
  notes?: string;
}

export interface IdentityPayload {
  fullName: string;
  email?: string;
  phone?: string;
  passportNumber?: string;
  ssnOrNationalId?: string;
  address?: string;
  notes?: string;
}

export interface RecoveryCodesPayload {
  service: string;
  codes: string[];
  notes?: string;
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
}
