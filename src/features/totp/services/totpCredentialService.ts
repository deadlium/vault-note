/**
 * TOTP Credential Service
 * Secure service layer managing credential-linked TOTP configurations and zero-knowledge generation.
 * Enforces offline execution with strictly zero network transmission of authenticator secrets.
 */

import { TOTPRepository } from '../repository/totpRepository';
import { generateTOTPToken, verifyTOTP } from '../totpEngine';
import { TOTPEnrollmentData, TOTPRecord, TOTPToken, TOTPUpdateInput, TOTPAlgorithm } from '../types';
import { VaultItem, AnyVaultPayload, LoginPayload, TOTPPayload } from '../../../types/vault';

export class TOTPCredentialService {
  /**
   * Attaches a newly scanned or manually entered TOTP configuration to a credential
   */
  static async attachTOTP(
    credentialId: string,
    enrollment: TOTPEnrollmentData,
    masterKey?: Uint8Array
  ): Promise<TOTPRecord> {
    return TOTPRepository.attachToCredential(
      credentialId,
      {
        issuer: enrollment.issuer,
        account: enrollment.account || enrollment.accountName || '',
        secret: enrollment.secret,
        algorithm: enrollment.algorithm,
        digits: enrollment.digits,
        period: enrollment.period,
      },
      masterKey
    );
  }

  /**
   * Detaches and removes TOTP configuration from a credential
   */
  static async detachTOTP(
    credentialId: string,
    masterKey?: Uint8Array
  ): Promise<boolean> {
    return TOTPRepository.detachFromCredential(credentialId, masterKey);
  }

  /**
   * Updates an existing TOTP configuration linked to a credential
   */
  static async updateTOTP(
    credentialId: string,
    updates: TOTPUpdateInput,
    masterKey?: Uint8Array
  ): Promise<TOTPRecord> {
    return TOTPRepository.update(credentialId, updates, masterKey);
  }

  /**
   * Synchronously inspects a VaultItem and extracts its active TOTP configuration if present
   */
  static getCredentialTOTP(item: VaultItem<AnyVaultPayload>): TOTPRecord | null {
    if (item.type === 'LOGIN') {
      return TOTPRepository.toRecordFromLogin(item);
    }
    if (item.type === 'TOTP') {
      return TOTPRepository.toRecordFromTOTP(item);
    }
    return null;
  }

  /**
   * Returns true if a given VaultItem has an active TOTP configuration
   */
  static isTOTPEnabled(item: VaultItem<AnyVaultPayload>): boolean {
    if (item.type === 'LOGIN') {
      const payload = item.payload as LoginPayload;
      const secret = payload.totpConfig?.secret || payload.totpSecret;
      return Boolean(secret && secret.trim().length > 0);
    }
    if (item.type === 'TOTP') {
      const payload = item.payload as TOTPPayload;
      return Boolean(payload.secret && payload.secret.trim().length > 0);
    }
    return false;
  }

  /**
   * Computes a time-based one-time password completely offline without network requests
   */
  static generateOfflineOTP(config: {
    secret: string;
    algorithm?: TOTPAlgorithm;
    digits?: number;
    period?: number;
    timestamp?: number;
  }): TOTPToken {
    return generateTOTPToken(config.secret, {
      algorithm: config.algorithm,
      digits: config.digits,
      period: config.period,
      timestamp: config.timestamp,
    });
  }

  /**
   * Validates an OTP code with clock drift tolerance (±1 period)
   */
  static verifyCode(
    secret: string,
    code: string,
    options?: {
      window?: number;
      period?: number;
      algorithm?: TOTPAlgorithm;
      digits?: number;
    }
  ): boolean {
    return verifyTOTP(code, secret, options);
  }
}
