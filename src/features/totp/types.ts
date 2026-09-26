/**
 * RFC 6238 TOTP Types & Configuration Schemas
 * Supports 6-digit & 8-digit time-based one-time passwords with HMAC-SHA1/SHA256/SHA512
 */

export type TOTPAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface TOTPConfig {
  /** Base32-encoded shared secret key */
  secret: string;
  /** Cryptographic hash algorithm (RFC 6238 default: SHA1) */
  algorithm?: TOTPAlgorithm;
  /** Number of digits in generated code (standard: 6 or 8) */
  digits?: number;
  /** Time step duration in seconds (RFC 6238 standard: 30) */
  period?: number;
  /** Reference epoch timestamp in milliseconds (defaults to Date.now()) */
  timestamp?: number;
}

export interface TOTPToken {
  /** Raw numeric code string (e.g., "483921") */
  code: string;
  /** Formatted code for human reading (e.g., "483 921") */
  formattedCode: string;
  /** Remaining seconds until token rotation */
  remainingSeconds: number;
  /** Time step period in seconds (usually 30) */
  period: number;
  /** Normalized fraction elapsed [0, 1] for countdown animations */
  progress: number;
  /** Flag indicating token expires within 5 seconds */
  isExpiringSoon: boolean;
}

export interface ParsedOtpAuthUri {
  type: 'totp' | 'hotp';
  label: string;
  issuer?: string;
  account?: string;
  secret: string;
  algorithm: TOTPAlgorithm;
  digits: number;
  period: number;
  counter?: number;
}

export interface TOTPEnrollmentData {
  type?: 'totp';
  label?: string;
  issuer: string;
  account: string;
  accountName?: string;
  secret: string;
  algorithm: TOTPAlgorithm;
  digits: number;
  period: number;
}

export type TOTPValidationErrorCode =
  | 'INVALID_SCHEME'
  | 'UNSUPPORTED_TYPE'
  | 'HOTP_NOT_SUPPORTED'
  | 'MISSING_SECRET'
  | 'INVALID_SECRET'
  | 'MISSING_ISSUER'
  | 'CONFLICTING_ISSUER'
  | 'INVALID_ALGORITHM'
  | 'INVALID_DIGITS'
  | 'INVALID_PERIOD'
  | 'MALFORMED_URI'
  | 'CAMERA_PERMISSION_DENIED'
  | 'CAMERA_UNAVAILABLE';

export interface TOTPValidationResult {
  isValid: boolean;
  data?: TOTPEnrollmentData;
  error?: string;
  code?: TOTPValidationErrorCode;
}

export interface TOTPRecord {
  id: string;
  credentialId?: string;
  issuer: string;
  account: string;
  secret: string;
  algorithm: TOTPAlgorithm;
  digits: number;
  period: number;
  createdAt: string;
  updatedAt: string;
}

export interface TOTPUpdateInput {
  issuer?: string;
  account?: string;
  secret?: string;
  algorithm?: TOTPAlgorithm;
  digits?: number;
  period?: number;
}

