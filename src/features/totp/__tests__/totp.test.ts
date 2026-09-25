/**
 * RFC 6238 TOTP Engine & Base32 Test Suite
 * Validates official IETF test vectors, HMAC algorithms, clock drift tolerance,
 * OTPAuth URI parsing, and Base32 encoding/decoding.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateTOTP,
  generateTOTPToken,
  verifyTOTP,
  getRemainingSeconds,
  formatTOTPCode,
  parseOtpAuthUri,
} from '../totpEngine';
import { base32Decode, base32Encode, isValidBase32 } from '../base32';
import { CryptoError } from '../../../core/crypto/types';

describe('RFC 4648 Base32 Encoding & Decoding', () => {
  it('Encodes and decodes ASCII strings byte-for-byte', () => {
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    const sample = 'VaultNote-ZeroKnowledge-2026';
    const encoded = base32Encode(textEncoder.encode(sample));
    const decoded = base32Decode(encoded);

    assert.strictEqual(textDecoder.decode(decoded), sample);
  });

  it('Handles standard Base32 test vectors from RFC 4648', () => {
    const enc = new TextEncoder();
    assert.strictEqual(base32Encode(enc.encode('')), '');
    assert.strictEqual(base32Encode(enc.encode('f'), true), 'MY======');
    assert.strictEqual(base32Encode(enc.encode('fo'), true), 'MZXQ====');
    assert.strictEqual(base32Encode(enc.encode('foo'), true), 'MZXW6===');
    assert.strictEqual(base32Encode(enc.encode('foob'), true), 'MZXW6YQ=');
    assert.strictEqual(base32Encode(enc.encode('foobar'), true), 'MZXW6YTBOI======');

    const dec = new TextDecoder();
    assert.strictEqual(dec.decode(base32Decode('MY======')), 'f');
    assert.strictEqual(dec.decode(base32Decode('MZXQ====')), 'fo');
    assert.strictEqual(dec.decode(base32Decode('MZXW6===')), 'foo');
    assert.strictEqual(dec.decode(base32Decode('MZXW6YQ=')), 'foob');
    assert.strictEqual(dec.decode(base32Decode('MZXW6YTBOI======')), 'foobar');
  });

  it('Tolerates whitespace, dashes, and lowercase characters during decode', () => {
    const dec = new TextDecoder();
    // 'foobar' encoded with mixed lowercase, hyphens, and spaces
    const messy = 'mzxw6-ytboi-======';
    assert.strictEqual(dec.decode(base32Decode(messy)), 'foobar');

    const spaced = 'MZXW 6YTB OI== ====';
    assert.strictEqual(dec.decode(base32Decode(spaced)), 'foobar');
  });

  it('Rejects invalid non-base32 characters with CryptoError', () => {
    assert.throws(() => base32Decode('INVALID89!'), CryptoError);
    assert.throws(() => base32Decode('1890'), CryptoError);
  });

  it('Validates Base32 strings correctly', () => {
    assert.strictEqual(isValidBase32('JBSWY3DPEHPK3PXP'), true);
    assert.strictEqual(isValidBase32('jbswy3dpehpk3pxp'), true);
    assert.strictEqual(isValidBase32('JBSW-Y3DP-EHPK-3PXP'), true);
    assert.strictEqual(isValidBase32('NOT_VALID_8_9_0!'), false);
    assert.strictEqual(isValidBase32(''), false);
  });
});

describe('RFC 6238 TOTP Official Test Vectors', () => {
  // RFC 6238 Appendix B test secret: ASCII '12345678901234567890' (20 bytes)
  // Base32 representation: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  const rfcSha1Secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('Calculates exact 8-digit codes matching RFC 6238 Appendix B (SHA1)', () => {
    // T = 59s
    assert.strictEqual(
      generateTOTP(rfcSha1Secret, { algorithm: 'SHA1', digits: 8, timestamp: 59 * 1000 }),
      '94287082'
    );

    // T = 1111111109s
    assert.strictEqual(
      generateTOTP(rfcSha1Secret, { algorithm: 'SHA1', digits: 8, timestamp: 1111111109 * 1000 }),
      '07081804'
    );

    // T = 1111111111s
    assert.strictEqual(
      generateTOTP(rfcSha1Secret, { algorithm: 'SHA1', digits: 8, timestamp: 1111111111 * 1000 }),
      '14050471'
    );

    // T = 1234567890s
    assert.strictEqual(
      generateTOTP(rfcSha1Secret, { algorithm: 'SHA1', digits: 8, timestamp: 1234567890 * 1000 }),
      '89005924'
    );

    // T = 2000000000s
    assert.strictEqual(
      generateTOTP(rfcSha1Secret, { algorithm: 'SHA1', digits: 8, timestamp: 2000000000 * 1000 }),
      '69279037'
    );
  });

  it('Correctly truncates and zero-pads 6-digit codes (SHA1)', () => {
    // T = 1234567890s -> last 6 digits of 89005924 = 005924 (verifies zero-padding!)
    const code6 = generateTOTP(rfcSha1Secret, {
      algorithm: 'SHA1',
      digits: 6,
      timestamp: 1234567890 * 1000,
    });
    assert.strictEqual(code6, '005924');
    assert.strictEqual(code6.length, 6);
  });

  it('Calculates HMAC-SHA256 and HMAC-SHA512 test vectors accurately', () => {
    const sha256SecretBytes = new TextEncoder().encode('12345678901234567890123456789012');
    const sha512SecretBytes = new TextEncoder().encode(
      '1234567890123456789012345678901234567890123456789012345678901234'
    );

    // T = 1234567890s for SHA256 (8 digits = 91819424)
    assert.strictEqual(
      generateTOTP(sha256SecretBytes, {
        algorithm: 'SHA256',
        digits: 8,
        timestamp: 1234567890 * 1000,
      }),
      '91819424'
    );

    // T = 59s for SHA512 (8 digits = 90693936)
    assert.strictEqual(
      generateTOTP(sha512SecretBytes, {
        algorithm: 'SHA512',
        digits: 8,
        timestamp: 59 * 1000,
      }),
      '90693936'
    );
  });
});

describe('Countdown, Formatting & Clock Drift Verification', () => {
  const secret = 'JBSWY3DPEHPK3PXP'; // Standard Google Authenticator secret

  it('Calculates remaining seconds in rotation cycle precisely', () => {
    // Exactly at step boundary (e.g. timestamp = 30000ms -> remaining should be 30)
    assert.strictEqual(getRemainingSeconds(30, 30000), 30);
    // 5 seconds into step (timestamp = 35000ms -> remaining should be 25)
    assert.strictEqual(getRemainingSeconds(30, 35000), 25);
    // 29 seconds into step (timestamp = 59000ms -> remaining should be 1)
    assert.strictEqual(getRemainingSeconds(30, 59000), 1);
  });

  it('Formats 6-digit and 8-digit codes with space separators', () => {
    assert.strictEqual(formatTOTPCode('123456'), '123 456');
    assert.strictEqual(formatTOTPCode('12345678'), '1234 5678');
    assert.strictEqual(formatTOTPCode(' 123 456 '), '123 456');
  });

  it('Generates full reactive TOTP token structure', () => {
    const token = generateTOTPToken(secret, { period: 30, timestamp: 35000 });
    assert.strictEqual(typeof token.code, 'string');
    assert.strictEqual(token.code.length, 6);
    assert.strictEqual(token.remainingSeconds, 25);
    assert.strictEqual(token.period, 30);
    assert.strictEqual(token.progress, 25 / 30);
    assert.strictEqual(token.isExpiringSoon, false);

    // Near expiration
    const expiringToken = generateTOTPToken(secret, { period: 30, timestamp: 57000 });
    assert.strictEqual(expiringToken.remainingSeconds, 3);
    assert.strictEqual(expiringToken.isExpiringSoon, true);
  });

  it('Verifies codes with clock drift tolerance', () => {
    const currentTimestamp = 1000000000000;
    const currentCode = generateTOTP(secret, { timestamp: currentTimestamp });
    const prevCode = generateTOTP(secret, { timestamp: currentTimestamp - 30000 });
    const nextCode = generateTOTP(secret, { timestamp: currentTimestamp + 30000 });
    const future2StepsCode = generateTOTP(secret, { timestamp: currentTimestamp + 60000 });

    // Current code verifies
    assert.strictEqual(verifyTOTP(currentCode, secret, { timestamp: currentTimestamp }), true);
    // Previous step verifies within window = 1
    assert.strictEqual(verifyTOTP(prevCode, secret, { timestamp: currentTimestamp, window: 1 }), true);
    // Next step verifies within window = 1
    assert.strictEqual(verifyTOTP(nextCode, secret, { timestamp: currentTimestamp, window: 1 }), true);
    // 2 steps ahead fails with window = 1
    assert.strictEqual(
      verifyTOTP(future2StepsCode, secret, { timestamp: currentTimestamp, window: 1 }),
      false
    );
    // 2 steps ahead succeeds with window = 2
    assert.strictEqual(
      verifyTOTP(future2StepsCode, secret, { timestamp: currentTimestamp, window: 2 }),
      true
    );
    // Invalid code fails
    assert.strictEqual(verifyTOTP('999999', secret, { timestamp: currentTimestamp }), false);
  });

  it('Parses standard Keyuri / OTPAuth URLs cleanly', () => {
    const uri =
      'otpauth://totp/Amazon:alex.turner@amazon.com?secret=JBSWY3DPEHPK3PXP&issuer=Amazon&algorithm=SHA256&digits=8&period=30';
    const parsed = parseOtpAuthUri(uri);

    assert.strictEqual(parsed.type, 'totp');
    assert.strictEqual(parsed.label, 'Amazon:alex.turner@amazon.com');
    assert.strictEqual(parsed.issuer, 'Amazon');
    assert.strictEqual(parsed.secret, 'JBSWY3DPEHPK3PXP');
    assert.strictEqual(parsed.algorithm, 'SHA256');
    assert.strictEqual(parsed.digits, 8);
    assert.strictEqual(parsed.period, 30);
  });

  it('Rejects malformed OTPAuth URIs', () => {
    assert.throws(() => parseOtpAuthUri('https://example.com'), CryptoError);
    assert.throws(() => parseOtpAuthUri('otpauth://invalid/label'), CryptoError);
  });
});
