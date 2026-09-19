export type VaultItemType =
  | 'LOGIN'
  | 'SECURE_NOTE'
  | 'TOTP'
  | 'CARD'
  | 'API_KEY'
  | 'IDENTITY'
  | 'RECOVERY_CODES';

export interface BaseVaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  favorite: boolean;
  protected: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface EncryptedVaultRecord extends BaseVaultItem {
  encryptedPayload: string; // Base64 ciphertext
  nonce: string;            // Base64 96-bit nonce/IV
  tag: string;              // Base64 128-bit auth tag
}

export interface LoginPayload {
  type: 'LOGIN';
  username?: string;
  password?: string;
  website?: string;
  totpSecret?: string;
  notes?: string;
}

export interface SecureNotePayload {
  type: 'SECURE_NOTE';
  content: string;
  notes?: string;
}

export type DecryptedVaultPayload = LoginPayload | SecureNotePayload | Record<string, unknown>;
