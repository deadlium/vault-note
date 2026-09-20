import test from 'node:test';
import assert from 'node:assert';
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
} from '../aes';
import { getRandomBytes } from '../csprng';
import {
  DecryptionAuthenticationError,
  InvalidKeyError,
} from '../types';

test('AES-256-GCM: Encrypt and decrypt round-trip with secret string', () => {
  const key = getRandomBytes(32);
  const secret = 'VaultNote • Master Seed Phrase: apple banana cherry diamond';

  const payload = encrypt(secret, key);

  assert.strictEqual(payload.algorithm, 'AES-256-GCM');
  assert.strictEqual(payload.version, 1);
  assert.ok(payload.ciphertext.length > 0);
  assert.ok(payload.iv.length > 0);
  assert.ok(payload.tag.length > 0);

  const decrypted = decrypt(payload, key);
  assert.strictEqual(decrypted, secret);
});

test('AES-256-GCM: Nonce uniqueness - encrypting identical plaintext yields unique ciphertexts', () => {
  const key = getRandomBytes(32);
  const secret = 'IdenticalSecretString';

  const payload1 = encrypt(secret, key);
  const payload2 = encrypt(secret, key);

  // Different nonces must be used for each encryption
  assert.notStrictEqual(payload1.iv, payload2.iv);
  assert.notStrictEqual(payload1.ciphertext, payload2.ciphertext);

  // Both must decrypt to the original plaintext
  assert.strictEqual(decrypt(payload1, key), secret);
  assert.strictEqual(decrypt(payload2, key), secret);
});

test('AES-256-GCM: Object encryption & decryption round-trip', () => {
  const key = getRandomBytes(32);
  const record = {
    id: 'sec-9812',
    title: 'AWS Root Secret',
    username: 'admin@vaultnote.security',
    password: 'SuperSecretPassword!#4412',
    totpSeed: 'JBSWY3DPEHPK3PXP',
    tags: ['infra', 'cloud', 'production'],
    metadata: {
      rotatedAt: 1716000000000,
      requiresBiometrics: true,
    },
  };

  const payload = encryptObject(record, key);
  const recovered = decryptObject<typeof record>(payload, key);

  assert.deepStrictEqual(recovered, record);
});

test('AES-256-GCM: Key validation rejects invalid key sizes', () => {
  const invalidKeyShort = getRandomBytes(16); // 128-bit key rejected
  assert.throws(() => encrypt('test', invalidKeyShort), InvalidKeyError);

  const invalidKeyLong = getRandomBytes(64); // 512-bit key rejected
  assert.throws(() => encrypt('test', invalidKeyLong), InvalidKeyError);
});

test('AES-256-GCM [TAMPER TEST]: Single-bit tampering in ciphertext fails authentication', () => {
  const key = getRandomBytes(32);
  const secret = 'Top Secret Vault Credential';
  const payload = encrypt(secret, key);

  // Tamper: modify first character of ciphertext
  const originalChar = payload.ciphertext[0];
  const tamperedChar = originalChar === 'A' ? 'B' : 'A';
  const tamperedPayload = {
    ...payload,
    ciphertext: tamperedChar + payload.ciphertext.slice(1),
  };

  assert.throws(
    () => decrypt(tamperedPayload, key),
    DecryptionAuthenticationError,
    'Must throw DecryptionAuthenticationError on ciphertext tampering'
  );
});

test('AES-256-GCM [TAMPER TEST]: Single-bit tampering in authentication tag fails authentication', () => {
  const key = getRandomBytes(32);
  const secret = 'Top Secret Vault Credential';
  const payload = encrypt(secret, key);

  // Tamper: modify authentication tag
  const originalTagChar = payload.tag[0];
  const tamperedTagChar = originalTagChar === 'X' ? 'Y' : 'X';
  const tamperedPayload = {
    ...payload,
    tag: tamperedTagChar + payload.tag.slice(1),
  };

  assert.throws(
    () => decrypt(tamperedPayload, key),
    DecryptionAuthenticationError,
    'Must throw DecryptionAuthenticationError on auth tag tampering'
  );
});

test('AES-256-GCM [TAMPER TEST]: Single-bit tampering in IV / nonce fails authentication', () => {
  const key = getRandomBytes(32);
  const secret = 'Top Secret Vault Credential';
  const payload = encrypt(secret, key);

  // Tamper: modify IV
  const originalIvChar = payload.iv[0];
  const tamperedIvChar = originalIvChar === 'Z' ? 'W' : 'Z';
  const tamperedPayload = {
    ...payload,
    iv: tamperedIvChar + payload.iv.slice(1),
  };

  assert.throws(
    () => decrypt(tamperedPayload, key),
    DecryptionAuthenticationError,
    'Must throw DecryptionAuthenticationError on IV tampering'
  );
});

test('AES-256-GCM: Decryption with wrong key fails authentication', () => {
  const keyA = getRandomBytes(32);
  const keyB = getRandomBytes(32);
  const payload = encrypt('confidential', keyA);

  assert.throws(
    () => decrypt(payload, keyB),
    DecryptionAuthenticationError,
    'Must throw DecryptionAuthenticationError when decrypted with wrong key'
  );
});
