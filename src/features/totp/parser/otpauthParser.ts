/**
 * OTPAuth URI Parser
 * Strictly parses RFC-compliant and real-world authenticator URI schemes
 * Extracts issuer, account, secret, algorithm, digits, and period with conflict detection
 */

import { isValidBase32 } from '../base32';
import { TOTPAlgorithm, TOTPEnrollmentData } from '../types';
import { OTPAuthValidationError } from './otpauthValidator';

const VALID_ALGORITHMS: Set<string> = new Set(['SHA1', 'SHA256', 'SHA512']);

/**
 * Parses an otpauth:// URI string into a validated TOTPEnrollmentData object.
 * Throws OTPAuthValidationError with descriptive error codes on failure.
 */
export function parseOtpAuthUri(uri: string): TOTPEnrollmentData {
  if (!uri || typeof uri !== 'string') {
    throw new OTPAuthValidationError(
      'This QR code does not contain a supported TOTP authenticator configuration.',
      'INVALID_SCHEME'
    );
  }

  const trimmed = uri.trim();
  if (!trimmed.toLowerCase().startsWith('otpauth://')) {
    throw new OTPAuthValidationError(
      'This QR code does not contain a supported TOTP authenticator configuration.',
      'INVALID_SCHEME'
    );
  }

  // Parse URL components safely
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new OTPAuthValidationError(
      'Malformed OTPAuth URI structure.',
      'MALFORMED_URI'
    );
  }

  const type = url.host.toLowerCase();
  if (type === 'hotp') {
    throw new OTPAuthValidationError(
      'HOTP is not currently supported.',
      'HOTP_NOT_SUPPORTED'
    );
  }

  if (type !== 'totp') {
    throw new OTPAuthValidationError(
      'This QR code does not contain a supported TOTP authenticator configuration.',
      'UNSUPPORTED_TYPE'
    );
  }

  // 1. Extract secret
  const secretParam = url.searchParams.get('secret');
  if (!secretParam || secretParam.trim().length === 0) {
    throw new OTPAuthValidationError(
      'Missing secret key in OTP URI.',
      'MISSING_SECRET'
    );
  }

  const cleanSecret = secretParam.replace(/[\s\-_=]/g, '').toUpperCase();
  if (cleanSecret.length === 0 || !isValidBase32(cleanSecret)) {
    throw new OTPAuthValidationError(
      'Invalid Base32 secret key. Secret must contain only letters A-Z and digits 2-7.',
      'INVALID_SECRET'
    );
  }

  // 2. Extract label and account
  const rawPath = url.pathname.replace(/^\/+/, '');
  let decodedLabel = '';
  try {
    decodedLabel = decodeURIComponent(rawPath).trim();
  } catch {
    decodedLabel = rawPath.trim();
  }

  let labelIssuer: string | undefined;
  let account: string = '';

  const colonIndex = decodedLabel.indexOf(':');
  if (colonIndex !== -1) {
    labelIssuer = decodedLabel.slice(0, colonIndex).trim();
    account = decodedLabel.slice(colonIndex + 1).trim();
  } else {
    account = decodedLabel;
  }

  // 3. Extract issuer query parameter
  const queryIssuerParam = url.searchParams.get('issuer');
  let queryIssuer: string | undefined;
  if (queryIssuerParam && queryIssuerParam.trim().length > 0) {
    try {
      queryIssuer = decodeURIComponent(queryIssuerParam).trim();
    } catch {
      queryIssuer = queryIssuerParam.trim();
    }
  }

  // 4. Issuer conflict detection
  let finalIssuer = '';
  if (labelIssuer && queryIssuer) {
    if (labelIssuer.toLowerCase() !== queryIssuer.toLowerCase()) {
      throw new OTPAuthValidationError(
        `Conflicting issuer values detected: URI label specifies '${labelIssuer}', but query parameter specifies '${queryIssuer}'.`,
        'CONFLICTING_ISSUER'
      );
    }
    finalIssuer = queryIssuer;
  } else if (queryIssuer) {
    finalIssuer = queryIssuer;
  } else if (labelIssuer) {
    finalIssuer = labelIssuer;
  } else if (account.length > 0 && colonIndex === -1 && !queryIssuer) {
    // If only a single label was provided without query issuer, treat label as issuer if no account
    finalIssuer = account;
    account = '';
  }

  if (!finalIssuer || finalIssuer.length === 0) {
    throw new OTPAuthValidationError(
      'Missing issuer service name in OTP configuration.',
      'MISSING_ISSUER'
    );
  }

  // 5. Algorithm extraction and validation
  const rawAlgo = (url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
  if (!VALID_ALGORITHMS.has(rawAlgo)) {
    throw new OTPAuthValidationError(
      `Invalid algorithm '${rawAlgo}'. Supported algorithms are SHA1, SHA256, and SHA512.`,
      'INVALID_ALGORITHM'
    );
  }
  const algorithm = rawAlgo as TOTPAlgorithm;

  // 6. Digits extraction and validation
  const digitsParam = url.searchParams.get('digits');
  let digits = 6;
  if (digitsParam !== null) {
    const parsedDigits = parseInt(digitsParam, 10);
    if (parsedDigits !== 6 && parsedDigits !== 8) {
      throw new OTPAuthValidationError(
        `Invalid digit count '${digitsParam}'. Supported digits are 6 and 8.`,
        'INVALID_DIGITS'
      );
    }
    digits = parsedDigits;
  }

  // 7. Period extraction and validation
  const periodParam = url.searchParams.get('period');
  let period = 30;
  if (periodParam !== null) {
    const parsedPeriod = parseInt(periodParam, 10);
    if (isNaN(parsedPeriod) || parsedPeriod <= 0 || !Number.isInteger(parsedPeriod)) {
      throw new OTPAuthValidationError(
        `Invalid period '${periodParam}'. Period must be a positive integer in seconds.`,
        'INVALID_PERIOD'
      );
    }
    period = parsedPeriod;
  }

  return {
    type: 'totp',
    label: decodedLabel,
    issuer: finalIssuer,
    account,
    accountName: account,
    secret: cleanSecret,
    algorithm,
    digits,
    period,
  };
}

/**
 * Safe parser that returns a TOTPValidationResult without throwing.
 */
export function tryParseOtpAuthUri(uri: string) {
  try {
    const data = parseOtpAuthUri(uri);
    return { isValid: true, data };
  } catch (err: unknown) {
    if (err instanceof OTPAuthValidationError) {
      return { isValid: false, error: err.message, code: err.code };
    }
    return {
      isValid: false,
      error: (err as Error).message ?? 'Unknown parsing error',
      code: 'MALFORMED_URI' as const,
    };
  }
}
