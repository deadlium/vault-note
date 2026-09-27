/**
 * OTPAuth URI Parser & Validator Test Suite
 * Validates real-world authenticator URIs, URL decoding, conflict detection,
 * HOTP rejection, Base32 normalization, and cryptographic algorithm support.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseOtpAuthUri, tryParseOtpAuthUri } from '../parser/otpauthParser';
import { validateTOTPEnrollmentConfig, OTPAuthValidationError } from '../parser/otpauthValidator';

describe('OTPAuth URI Parser: Standard Formats', () => {
  it('parses standard GitHub TOTP URI with full parameters', () => {
    const uri =
      'otpauth://totp/GitHub:alexturner?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.issuer, 'GitHub');
    assert.strictEqual(parsed.account, 'alexturner');
    assert.strictEqual(parsed.secret, 'JBSWY3DPEHPK3PXP');
    assert.strictEqual(parsed.algorithm, 'SHA1');
    assert.strictEqual(parsed.digits, 6);
    assert.strictEqual(parsed.period, 30);
  });

  it('parses Google Authenticator URI with email label', () => {
    const uri =
      'otpauth://totp/Google:john.doe@gmail.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=Google';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.issuer, 'Google');
    assert.strictEqual(parsed.account, 'john.doe@gmail.com');
    assert.strictEqual(parsed.secret, 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ');
    assert.strictEqual(parsed.algorithm, 'SHA1');
    assert.strictEqual(parsed.digits, 6);
    assert.strictEqual(parsed.period, 30);
  });

  it('parses Microsoft format with query issuer and account-only label', () => {
    const uri =
      'otpauth://totp/user@company.com?secret=JBSWY3DPEHPK3PXP&issuer=Microsoft';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.issuer, 'Microsoft');
    assert.strictEqual(parsed.account, 'user@company.com');
  });

  it('parses URI with URL-encoded characters in label and issuer', () => {
    const uri =
      'otpauth://totp/Digital%20Ocean%3Adev%2Bteam%40infra.io?secret=JBSWY3DPEHPK3PXP&issuer=Digital%20Ocean';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.issuer, 'Digital Ocean');
    assert.strictEqual(parsed.account, 'dev+team@infra.io');
  });
});

describe('OTPAuth URI Parser: Algorithms, Digits & Periods', () => {
  it('supports SHA256 and 8 digits', () => {
    const uri =
      'otpauth://totp/SecureCorp:admin?secret=JBSWY3DPEHPK3PXP&issuer=SecureCorp&algorithm=SHA256&digits=8';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.algorithm, 'SHA256');
    assert.strictEqual(parsed.digits, 8);
  });

  it('supports SHA512 and custom step periods', () => {
    const uri =
      'otpauth://totp/CustomService:root?secret=JBSWY3DPEHPK3PXP&issuer=CustomService&algorithm=SHA512&period=60';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.algorithm, 'SHA512');
    assert.strictEqual(parsed.period, 60);
  });

  it('rejects unsupported algorithms such as MD5', () => {
    const uri =
      'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&issuer=Test&algorithm=MD5';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return error.code === 'INVALID_ALGORITHM';
      }
    );
  });

  it('rejects unsupported digit lengths such as 7 or 10', () => {
    const uri =
      'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&issuer=Test&digits=7';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return error.code === 'INVALID_DIGITS';
      }
    );
  });

  it('rejects invalid non-positive period values', () => {
    const uri =
      'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&issuer=Test&period=0';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return error.code === 'INVALID_PERIOD';
      }
    );
  });
});

describe('OTPAuth URI Parser: Issuer Conflict Detection & Normalization', () => {
  it('extracts issuer from label prefix when query issuer is absent', () => {
    const uri = 'otpauth://totp/Discord:gamer42?secret=JBSWY3DPEHPK3PXP';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.issuer, 'Discord');
    assert.strictEqual(parsed.account, 'gamer42');
  });

  it('throws validation error when query issuer conflicts with label issuer', () => {
    const uri =
      'otpauth://totp/Google:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return (
          error.code === 'CONFLICTING_ISSUER' &&
          error.message.includes('Conflicting issuer values detected')
        );
      }
    );
  });

  it('normalizes secret containing spaces, hyphens, and lowercase characters', () => {
    const uri =
      'otpauth://totp/Test:user?secret=jbsw-y3dp-ehpk-3pxp&issuer=Test';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.secret, 'JBSWY3DPEHPK3PXP');
  });

  it('rejects invalid Base32 secret characters', () => {
    const uri =
      'otpauth://totp/Test:user?secret=INVALID8901SECRET&issuer=Test';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return error.code === 'INVALID_SECRET';
      }
    );
  });

  it('rejects missing secret parameter', () => {
    const uri = 'otpauth://totp/Test:user?issuer=Test';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return error.code === 'MISSING_SECRET';
      }
    );
  });
});

describe('OTPAuth URI Parser: HOTP Rejection & Scheme Validation', () => {
  it('explicitly rejects HOTP URIs with exact error requirement', () => {
    const uri =
      'otpauth://hotp/Bank:user?secret=JBSWY3DPEHPK3PXP&counter=1&issuer=Bank';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return (
          error.code === 'HOTP_NOT_SUPPORTED' &&
          error.message === 'HOTP is not currently supported.'
        );
      }
    );
  });

  it('rejects arbitrary non-otpauth QR payloads', () => {
    const uri = 'https://accounts.google.com/signin';
    assert.throws(
      () => parseOtpAuthUri(uri),
      (err: unknown) => {
        const error = err as OTPAuthValidationError;
        return (
          error.code === 'INVALID_SCHEME' &&
          error.message ===
            'This QR code does not contain a supported TOTP authenticator configuration.'
        );
      }
    );
  });

  it('tryParseOtpAuthUri safely returns validation results without throwing', () => {
    const validResult = tryParseOtpAuthUri(
      'otpauth://totp/GitHub:alex?secret=JBSWY3DPEHPK3PXP&issuer=GitHub'
    );
    assert.strictEqual(validResult.isValid, true);
    assert.strictEqual(validResult.data?.issuer, 'GitHub');

    const invalidResult = tryParseOtpAuthUri('invalid-payload');
    assert.strictEqual(invalidResult.isValid, false);
    assert.strictEqual(invalidResult.code, 'INVALID_SCHEME');
  });
});

describe('Manual Enrollment Configuration Validator', () => {
  it('validates manual input and normalizes parameters', () => {
    const result = validateTOTPEnrollmentConfig({
      issuer: '   Custom Service   ',
      account: '  admin@example.com  ',
      secret: 'jbsw y3dp ehpk 3pxp',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.data?.issuer, 'Custom Service');
    assert.strictEqual(result.data?.account, 'admin@example.com');
    assert.strictEqual(result.data?.secret, 'JBSWY3DPEHPK3PXP');
    assert.strictEqual(result.data?.algorithm, 'SHA1');
  });

  it('rejects manual configuration with empty issuer', () => {
    const result = validateTOTPEnrollmentConfig({
      issuer: '   ',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.code, 'MISSING_ISSUER');
  });

  it('rejects manual configuration with empty or invalid secret', () => {
    const result = validateTOTPEnrollmentConfig({
      issuer: 'Service',
      secret: 'bad-secret-999',
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.code, 'INVALID_SECRET');
  });
});
