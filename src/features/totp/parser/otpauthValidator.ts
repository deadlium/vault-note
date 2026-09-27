/**
 * OTPAuth Configuration Validator
 * Validates parsed and manual TOTP configurations against security rules and RFC specifications
 */

import { isValidBase32 } from '../base32';
import { CryptoError } from '../../../core/crypto/types';
import {
  TOTPAlgorithm,
  TOTPEnrollmentData,
  TOTPValidationResult,
  TOTPValidationErrorCode,
} from '../types';

export class OTPAuthValidationError extends CryptoError {
  readonly code: TOTPValidationErrorCode;

  constructor(message: string, code: TOTPValidationErrorCode) {
    super(message);
    this.name = 'OTPAuthValidationError';
    this.code = code;
  }
}

const SUPPORTED_ALGORITHMS: Set<TOTPAlgorithm> = new Set(['SHA1', 'SHA256', 'SHA512']);
const SUPPORTED_DIGITS: Set<number> = new Set([6, 8]);

/**
 * Validates a normalized TOTP enrollment configuration.
 */
export function validateTOTPEnrollmentConfig(
  input: Partial<TOTPEnrollmentData>
): TOTPValidationResult {
  // 1. Secret validation
  if (!input.secret || typeof input.secret !== 'string' || input.secret.trim().length === 0) {
    return {
      isValid: false,
      code: 'MISSING_SECRET',
      error: 'Missing secret key in OTP configuration.',
    };
  }

  const cleanSecret = input.secret.replace(/[\s\-_=]/g, '').toUpperCase();
  if (cleanSecret.length === 0 || !isValidBase32(cleanSecret)) {
    return {
      isValid: false,
      code: 'INVALID_SECRET',
      error: 'Invalid Base32 secret key. Secret must contain only letters A-Z and digits 2-7.',
    };
  }

  // 2. Issuer validation
  const issuer = input.issuer?.trim() ?? '';
  if (issuer.length === 0) {
    return {
      isValid: false,
      code: 'MISSING_ISSUER',
      error: 'Missing issuer service name.',
    };
  }

  // 3. Account name
  const account = input.account?.trim() ?? '';

  // 4. Algorithm validation
  const rawAlgorithm = (input.algorithm ?? 'SHA1').toUpperCase() as TOTPAlgorithm;
  if (!SUPPORTED_ALGORITHMS.has(rawAlgorithm)) {
    return {
      isValid: false,
      code: 'INVALID_ALGORITHM',
      error: `Invalid algorithm '${input.algorithm}'. Supported algorithms are SHA1, SHA256, and SHA512.`,
    };
  }

  // 5. Digits validation
  const digits = input.digits ?? 6;
  if (!SUPPORTED_DIGITS.has(digits)) {
    return {
      isValid: false,
      code: 'INVALID_DIGITS',
      error: `Invalid digit count '${input.digits}'. Supported digits are 6 and 8.`,
    };
  }

  // 6. Period validation
  const period = input.period ?? 30;
  if (typeof period !== 'number' || isNaN(period) || !Number.isInteger(period) || period <= 0) {
    return {
      isValid: false,
      code: 'INVALID_PERIOD',
      error: `Invalid period '${input.period}'. Period must be a positive integer in seconds.`,
    };
  }

  return {
    isValid: true,
    data: {
      issuer,
      account,
      secret: cleanSecret,
      algorithm: rawAlgorithm,
      digits,
      period,
    },
  };
}
