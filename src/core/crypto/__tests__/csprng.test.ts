import test from 'node:test';
import assert from 'node:assert';
import {
  getRandomBytes,
  generateSalt,
  generateGcmNonce,
  generateMasterEnclaveToken,
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  bytesToUtf8,
  secureWipe,
} from '../csprng';
import { EntropyError } from '../types';

test('CSPRNG: getRandomBytes generates expected lengths and unique entropy', () => {
  const bytes16 = getRandomBytes(16);
  assert.strictEqual(bytes16.length, 16);
  assert.ok(bytes16 instanceof Uint8Array);

  const bytes32 = getRandomBytes(32);
  assert.strictEqual(bytes32.length, 32);

  // Consecutive generations should not collide
  const another32 = getRandomBytes(32);
  assert.notDeepStrictEqual(bytes32, another32);

  // Throws on 0 or negative length
  assert.throws(() => getRandomBytes(0), EntropyError);
  assert.throws(() => getRandomBytes(-5), EntropyError);
});

test('CSPRNG: generateSalt returns 32-byte cryptographically secure salt', () => {
  const salt = generateSalt();
  assert.strictEqual(salt.length, 32);
  assert.ok(salt instanceof Uint8Array);

  const customSalt = generateSalt(64);
  assert.strictEqual(customSalt.length, 64);
});

test('CSPRNG: generateGcmNonce returns mandatory 12-byte (96-bit) nonce', () => {
  const nonce = generateGcmNonce();
  assert.strictEqual(nonce.length, 12);
});

test('CSPRNG: generateMasterEnclaveToken returns 32-byte secret token', () => {
  const token = generateMasterEnclaveToken();
  assert.strictEqual(token.length, 32);
});

test('CSPRNG: Hex conversion round-trip preserves byte fidelity', () => {
  const original = new Uint8Array([0x00, 0x0f, 0xa5, 0xff, 0x42, 0x13, 0x37]);
  const hex = bytesToHex(original);
  assert.strictEqual(hex, '000fa5ff421337');

  const decoded = hexToBytes(hex);
  assert.deepStrictEqual(decoded, original);

  // Handles 0x prefix
  const withPrefix = hexToBytes('0x000fa5ff421337');
  assert.deepStrictEqual(withPrefix, original);

  // Throws on odd length or invalid chars
  assert.throws(() => hexToBytes('abc'), EntropyError);
  assert.throws(() => hexToBytes('zz'), EntropyError);
});

test('CSPRNG: Base64 conversion round-trip preserves byte fidelity', () => {
  const original = getRandomBytes(64);
  const base64 = bytesToBase64(original);
  assert.ok(typeof base64 === 'string');

  const decoded = base64ToBytes(base64);
  assert.deepStrictEqual(decoded, original);
});

test('CSPRNG: UTF-8 conversion preserves Unicode & multi-byte characters', () => {
  const sample = 'VaultNote 🛡️ • Confidential Master Key 🔑 日本語';
  const encoded = utf8ToBytes(sample);
  const decoded = bytesToUtf8(encoded);
  assert.strictEqual(decoded, sample);
});

test('CSPRNG: secureWipe zeroizes buffer memory in-place', () => {
  const buffer = new Uint8Array([1, 2, 3, 4, 5, 255, 128]);
  secureWipe(buffer);
  for (let i = 0; i < buffer.length; i++) {
    assert.strictEqual(buffer[i], 0);
  }
});
