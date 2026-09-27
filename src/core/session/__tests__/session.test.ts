/**
 * VaultSessionManager & Auto-Lock State Machine Test Suite
 * Validates finite state machine, memory zeroization, inactivity timers, and privacy shields
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { VaultSessionManager } from '../VaultSessionManager';
import { useSessionStore } from '../useSessionStore';
import { setVaultInitialized, clearAllEnclaveKeys } from '../../storage/enclave';

describe('VaultSessionManager Finite State Machine', () => {
  beforeEach(async () => {
    VaultSessionManager.reset();
    await clearAllEnclaveKeys();
  });

  it('Initializes status to UNINITIALIZED when vault is not configured', async () => {
    await setVaultInitialized(false);
    const status = await VaultSessionManager.initializeSession();
    assert.strictEqual(status, 'UNINITIALIZED');
    assert.strictEqual(VaultSessionManager.getStatus(), 'UNINITIALIZED');
    assert.strictEqual(VaultSessionManager.isLocked(), true);
    assert.strictEqual(VaultSessionManager.isUnlocked(), false);
  });

  it('Initializes status to LOCKED when vault has existing credentials', async () => {
    await setVaultInitialized(true);
    const status = await VaultSessionManager.initializeSession();
    assert.strictEqual(status, 'LOCKED');
    assert.strictEqual(VaultSessionManager.getStatus(), 'LOCKED');
    assert.strictEqual(VaultSessionManager.isLocked(), true);
    assert.strictEqual(VaultSessionManager.isUnlocked(), false);
  });

  it('Transitions cleanly to UNLOCKING and UNLOCKED states', () => {
    useSessionStore.getState().setStatus('LOCKED');
    VaultSessionManager.startUnlocking();
    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKING');

    const mockKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    VaultSessionManager.unlock(mockKey, 'token_xyz');

    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKED');
    assert.strictEqual(VaultSessionManager.isUnlocked(), true);
    assert.strictEqual(VaultSessionManager.isLocked(), false);
    assert.strictEqual(VaultSessionManager.getSessionToken(), 'token_xyz');
    assert.deepStrictEqual(VaultSessionManager.getMasterKey(), mockKey);
  });

  it('Cryptographic Zeroization: Overwrites master key buffer in memory on lock', () => {
    const secretBuffer = new Uint8Array([42, 42, 42, 42, 42]);
    VaultSessionManager.unlock(secretBuffer, 'active_token');

    // Trigger lock
    VaultSessionManager.lock();

    // Verify status and references cleared
    assert.strictEqual(VaultSessionManager.getStatus(), 'LOCKED');
    assert.strictEqual(VaultSessionManager.getMasterKey(), null);
    assert.strictEqual(VaultSessionManager.getSessionToken(), null);
    assert.strictEqual(VaultSessionManager.isLocked(), true);

    // Verify buffer was zeroized in-place before release
    assert.deepStrictEqual(secretBuffer, new Uint8Array([0, 0, 0, 0, 0]));
  });
});

describe('Inactivity & Background Auto-Lock Engine', () => {
  beforeEach(() => {
    VaultSessionManager.reset();
  });

  it('Immediate Policy: Locks vault the moment app enters background', () => {
    VaultSessionManager.unlock(new Uint8Array([1, 2, 3]));
    VaultSessionManager.setAutoLockTimeout('immediate');

    // Enter background
    VaultSessionManager.handleAppStateChange('background');

    assert.strictEqual(VaultSessionManager.getStatus(), 'LOCKED');
    assert.strictEqual(VaultSessionManager.getMasterKey(), null);
  });

  it('Timed Background Policy: Preserves session if returning before timeout', () => {
    VaultSessionManager.unlock(new Uint8Array([1, 2, 3]));
    VaultSessionManager.setAutoLockTimeout('5m'); // 5 minutes = 300,000ms

    const startTimestamp = 1000000;
    VaultSessionManager.handleAppStateChange('background', startTimestamp);

    assert.strictEqual(VaultSessionManager.getStatus(), 'BACKGROUND');

    // Return after 2 minutes (120,000ms elapsed < 300,000ms timeout)
    VaultSessionManager.handleAppStateChange('active', startTimestamp + 120000);

    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKED');
    assert.notStrictEqual(VaultSessionManager.getMasterKey(), null);
  });

  it('Timed Background Policy: Locks vault if returning after timeout has elapsed', () => {
    const key = new Uint8Array([10, 20, 30]);
    VaultSessionManager.unlock(key);
    VaultSessionManager.setAutoLockTimeout('1m'); // 1 minute = 60,000ms

    const startTimestamp = 1000000;
    VaultSessionManager.handleAppStateChange('background', startTimestamp);

    assert.strictEqual(VaultSessionManager.getStatus(), 'BACKGROUND');

    // Return after 65 seconds (65,000ms elapsed > 60,000ms timeout)
    VaultSessionManager.handleAppStateChange('active', startTimestamp + 65000);

    assert.strictEqual(VaultSessionManager.getStatus(), 'LOCKED');
    assert.strictEqual(VaultSessionManager.getMasterKey(), null);
    assert.deepStrictEqual(key, new Uint8Array([0, 0, 0]));
  });

  it('Foreground Inactivity Timer: Locks vault if user is idle beyond timeout', () => {
    VaultSessionManager.unlock(new Uint8Array([9, 9, 9]));
    VaultSessionManager.setAutoLockTimeout('1m');

    const t0 = Date.now();
    useSessionStore.setState({ lastActiveTimestamp: t0 });

    // Idle check after 30 seconds -> should not lock
    const lockedEarly = VaultSessionManager.checkInactivity(t0 + 30000);
    assert.strictEqual(lockedEarly, false);
    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKED');

    // Idle check after 61 seconds -> should trigger lock
    const lockedLate = VaultSessionManager.checkInactivity(t0 + 61000);
    assert.strictEqual(lockedLate, true);
    assert.strictEqual(VaultSessionManager.getStatus(), 'LOCKED');
  });

  it('User Activity: Refreshes timestamp and postpones auto-lock', () => {
    VaultSessionManager.unlock(new Uint8Array([7, 7, 7]));
    VaultSessionManager.setAutoLockTimeout('1m');

    const t0 = 5000000;
    useSessionStore.setState({ lastActiveTimestamp: t0 });

    // User taps after 45 seconds
    useSessionStore.setState({ lastActiveTimestamp: t0 + 45000 });

    // Check at t0 + 70 seconds (only 25s elapsed since last activity)
    const locked = VaultSessionManager.checkInactivity(t0 + 70000);
    assert.strictEqual(locked, false);
    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKED');
  });

  it('Never Policy: Keeps vault unlocked regardless of inactivity duration', () => {
    VaultSessionManager.unlock(new Uint8Array([1, 1, 1]));
    VaultSessionManager.setAutoLockTimeout('never');

    const t0 = 1000000;
    useSessionStore.setState({ lastActiveTimestamp: t0 });

    // Check after 24 hours
    const locked = VaultSessionManager.checkInactivity(t0 + 86400000);
    assert.strictEqual(locked, false);
    assert.strictEqual(VaultSessionManager.getStatus(), 'UNLOCKED');
  });
});

describe('Privacy Shield & Task Switcher Cloaking', () => {
  beforeEach(() => {
    VaultSessionManager.reset();
  });

  it('Enables privacy shield when app enters background or task switcher', () => {
    assert.strictEqual(useSessionStore.getState().isPrivacyShieldActive, false);

    VaultSessionManager.handleAppStateChange('inactive');
    assert.strictEqual(useSessionStore.getState().isPrivacyShieldActive, true);

    VaultSessionManager.handleAppStateChange('active');
    assert.strictEqual(useSessionStore.getState().isPrivacyShieldActive, false);
  });
});
