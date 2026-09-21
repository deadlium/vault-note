import test, { beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  setEnclaveItem,
  getEnclaveItem,
  deleteEnclaveItem,
  storeMasterEnclaveToken,
  getMasterEnclaveToken,
  storeBiometricSecret,
  getBiometricSecret,
  isVaultInitialized,
  setVaultInitialized,
  clearAllEnclaveKeys,
} from '../enclave';

beforeEach(async () => {
  await clearAllEnclaveKeys();
});

test('Enclave: setEnclaveItem and getEnclaveItem persist and retrieve strings', async () => {
  await setEnclaveItem('test.key', 'secret-value-1234');
  const retrieved = await getEnclaveItem('test.key');
  assert.strictEqual(retrieved, 'secret-value-1234');

  const nonExistent = await getEnclaveItem('missing.key');
  assert.strictEqual(nonExistent, null);
});

test('Enclave: deleteEnclaveItem removes stored key', async () => {
  await setEnclaveItem('temp.key', 'to-be-deleted');
  assert.strictEqual(await getEnclaveItem('temp.key'), 'to-be-deleted');

  await deleteEnclaveItem('temp.key');
  assert.strictEqual(await getEnclaveItem('temp.key'), null);
});

test('Enclave: Master Enclave Token lifecycle', async () => {
  assert.strictEqual(await getMasterEnclaveToken(), null);

  const testToken = 'a3f890b2c14de56789f0123456789abcde0123456789abcdef0123456789abcd';
  await storeMasterEnclaveToken(testToken);

  assert.strictEqual(await getMasterEnclaveToken(), testToken);
});

test('Enclave: Biometric unlock secret lifecycle', async () => {
  assert.strictEqual(await getBiometricSecret(), null);

  const bioSecret = 'bio-unlocked-kek-seed-9988';
  await storeBiometricSecret(bioSecret);

  assert.strictEqual(await getBiometricSecret(), bioSecret);
});

test('Enclave: Vault initialized status flag', async () => {
  assert.strictEqual(await isVaultInitialized(), false);

  await setVaultInitialized(true);
  assert.strictEqual(await isVaultInitialized(), true);

  await setVaultInitialized(false);
  assert.strictEqual(await isVaultInitialized(), false);
});

test('Enclave: clearAllEnclaveKeys purges all persisted secrets', async () => {
  await storeMasterEnclaveToken('token-1');
  await storeBiometricSecret('bio-1');
  await setVaultInitialized(true);

  await clearAllEnclaveKeys();

  assert.strictEqual(await getMasterEnclaveToken(), null);
  assert.strictEqual(await getBiometricSecret(), null);
  assert.strictEqual(await isVaultInitialized(), false);
});
