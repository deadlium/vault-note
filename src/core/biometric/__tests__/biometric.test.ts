import test from 'node:test';
import assert from 'node:assert';
import {
  InMemoryBiometricAdapter,
  biometricService,
  checkBiometricHardware,
  authenticateBiometric,
  getBiometricLabel,
} from '../biometricService';
import {
  storeBiometricSecret,
  getBiometricSecret,
  clearAllEnclaveKeys,
} from '../../storage/enclave';

test('Biometric: Hardware status detection reports capabilities accurately', async () => {
  const adapter = new InMemoryBiometricAdapter();
  adapter.setSimulationOptions({
    hasHardware: true,
    isEnrolled: true,
    supportedTypes: ['facial'],
    securityLevel: 'strong',
  });
  biometricService.setAdapter(adapter);

  const status = await checkBiometricHardware();
  assert.strictEqual(status.hasHardware, true);
  assert.strictEqual(status.isEnrolled, true);
  assert.deepStrictEqual(status.supportedTypes, ['facial']);
  assert.strictEqual(status.securityLevel, 'strong');
});

test('Biometric: Authentication succeeds when user passes scan', async () => {
  const adapter = new InMemoryBiometricAdapter();
  adapter.setSimulationOptions({
    hasHardware: true,
    isEnrolled: true,
    shouldSucceed: true,
  });
  biometricService.setAdapter(adapter);

  const result = await authenticateBiometric();
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, undefined);
});

test('Biometric: Authentication fails gracefully when hardware is not enrolled', async () => {
  const adapter = new InMemoryBiometricAdapter();
  adapter.setSimulationOptions({
    hasHardware: true,
    isEnrolled: false,
  });
  biometricService.setAdapter(adapter);

  const result = await authenticateBiometric();
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes('not available or not enrolled'));
});

test('Biometric: Authentication reports error message when user cancels or fails', async () => {
  const adapter = new InMemoryBiometricAdapter();
  adapter.setSimulationOptions({
    hasHardware: true,
    isEnrolled: true,
    shouldSucceed: false,
    failureError: 'user_cancel',
  });
  biometricService.setAdapter(adapter);

  const result = await authenticateBiometric();
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'user_cancel');
});

test('Biometric: Label derivation returns proper platform terminology', () => {
  assert.strictEqual(getBiometricLabel(['facial']), 'Face ID');
  assert.strictEqual(getBiometricLabel(['fingerprint']), 'Touch ID');
  assert.strictEqual(getBiometricLabel(['iris']), 'Iris Recognition');
  assert.strictEqual(getBiometricLabel(['none']), 'Biometrics');
});

test('Biometric & Enclave Integration: Stores and releases enclave secret on successful auth', async () => {
  await clearAllEnclaveKeys();

  const secretPayload = 'mock_enclave_dek_token_99f381';
  await storeBiometricSecret(secretPayload);

  const adapter = new InMemoryBiometricAdapter();
  adapter.setSimulationOptions({ shouldSucceed: true });
  biometricService.setAdapter(adapter);

  const authResult = await authenticateBiometric({ promptMessage: 'Unlock Vault' });
  assert.strictEqual(authResult.success, true);

  const retrievedSecret = await getBiometricSecret();
  assert.strictEqual(retrievedSecret, secretPayload);

  await clearAllEnclaveKeys();
});
