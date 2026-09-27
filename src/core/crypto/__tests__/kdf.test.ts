import test from 'node:test';
import assert from 'node:assert';
import {
  deriveKeyArgon2id,
  deriveKeyPbkdf2,
  deriveKeyEncryptionKey,
} from '../kdf';
import { CryptoError } from '../types';

test('KDF: Argon2id derives deterministic 256-bit key from passphrase & salt', () => {
  const passphrase = 'CorrectHorseBatteryStaple!2026';
  const salt = '0123456789abcdef0123456789abcdef'; // 16 bytes

  // Derivation with fast test params (t=2, m=1024)
  const result1 = deriveKeyArgon2id(passphrase, salt, { t: 2, m: 1024, p: 1, dkLen: 32 });
  const result2 = deriveKeyArgon2id(passphrase, salt, { t: 2, m: 1024, p: 1, dkLen: 32 });

  assert.strictEqual(result1.key.length, 32);
  assert.strictEqual(result1.algorithm, 'Argon2id');
  assert.deepStrictEqual(result1.key, result2.key);
});

test('KDF: Argon2id produces distinct keys for different salts or passphrases', () => {
  const saltA = '0123456789abcdef0123456789abcdef';
  const saltB = 'fedcba9876543210fedcba9876543210';

  const keyA = deriveKeyArgon2id('password-1', saltA, { t: 2, m: 1024, p: 1 }).key;
  const keyB = deriveKeyArgon2id('password-1', saltB, { t: 2, m: 1024, p: 1 }).key;
  const keyC = deriveKeyArgon2id('password-2', saltA, { t: 2, m: 1024, p: 1 }).key;

  assert.notDeepStrictEqual(keyA, keyB);
  assert.notDeepStrictEqual(keyA, keyC);
});

test('KDF: Empty passphrase or short salt is rejected', () => {
  assert.throws(() => deriveKeyArgon2id(''), CryptoError);
  // Salt less than 16 bytes rejected
  assert.throws(() => deriveKeyArgon2id('valid-pass', '010203'), CryptoError);
});

test('KDF: PBKDF2 fallback derives 256-bit key deterministically', () => {
  const passphrase = 'MasterPasswordSecret#123';
  const salt = '0123456789abcdef0123456789abcdef';

  const res1 = deriveKeyPbkdf2(passphrase, salt, { iterations: 10000, dkLen: 32 });
  const res2 = deriveKeyPbkdf2(passphrase, salt, { iterations: 10000, dkLen: 32 });

  assert.strictEqual(res1.key.length, 32);
  assert.strictEqual(res1.algorithm, 'PBKDF2-SHA256');
  assert.deepStrictEqual(res1.key, res2.key);
});

test('KDF: deriveKeyEncryptionKey generates salt when none is provided', () => {
  const res = deriveKeyEncryptionKey('user-master-pwd');
  assert.strictEqual(res.key.length, 32);
  assert.ok(res.saltHex.length >= 32);
});
