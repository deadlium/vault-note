import test from 'node:test';
import assert from 'node:assert';
import { InMemoryClipboardAdapter, copyToClipboard, getClipboardText, clearClipboard, clipboardService } from '../clipboardService';

test('Clipboard: Copies and retrieves text correctly', async () => {
  const adapter = new InMemoryClipboardAdapter();
  clipboardService.setAdapter(adapter);

  const testText = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
  const success = await copyToClipboard(testText);
  assert.strictEqual(success, true);

  const retrieved = await getClipboardText();
  assert.strictEqual(retrieved, testText);
});

test('Clipboard: Clear clipboard purges text', async () => {
  const adapter = new InMemoryClipboardAdapter();
  clipboardService.setAdapter(adapter);

  await copyToClipboard('temporary secret');
  assert.strictEqual(await getClipboardText(), 'temporary secret');

  const cleared = await clearClipboard();
  assert.strictEqual(cleared, true);
  assert.strictEqual(await getClipboardText(), '');
});

test('Clipboard: Sensitive auto-wipe clears content after specified timeout', async () => {
  const adapter = new InMemoryClipboardAdapter();
  clipboardService.setAdapter(adapter);

  const sensitivePassword = 'vX9!mQ7#L2@pZ8_SensitiveTest';
  // Use a short 50ms timeout for unit test
  await copyToClipboard(sensitivePassword, { isSensitive: true, timeoutSeconds: 0.05 });

  assert.strictEqual(await getClipboardText(), sensitivePassword);
  assert.strictEqual(clipboardService.hasPendingWipe(), true);

  // Wait 70ms for wipe timer
  await new Promise((resolve) => setTimeout(resolve, 70));

  assert.strictEqual(await getClipboardText(), '');
  assert.strictEqual(clipboardService.hasPendingWipe(), false);
});

test('Clipboard: Does not wipe if user replaced clipboard before timeout', async () => {
  const adapter = new InMemoryClipboardAdapter();
  clipboardService.setAdapter(adapter);

  await copyToClipboard('first_secret', { isSensitive: true, timeoutSeconds: 0.05 });

  // Manually change adapter content to something else (e.g. user copied a url)
  await adapter.setString('https://github.com');

  // Wait 70ms for first timer to fire
  await new Promise((resolve) => setTimeout(resolve, 70));

  // Should still contain 'https://github.com' because it was NOT the sensitive secret
  assert.strictEqual(await getClipboardText(), 'https://github.com');
});

test('ClipboardManager: copySecret activates countdown and notifies subscribers', async () => {
  const adapter = new InMemoryClipboardAdapter();
  const { ClipboardManager } = await import('../clipboardManager');
  ClipboardManager.setAdapter(adapter);

  let notifiedState: any = null;
  const unsubscribe = ClipboardManager.subscribe((state) => {
    notifiedState = state;
  });

  const secret = 'super_secret_password_123';
  const success = await ClipboardManager.copySecret(secret, 'Master Password', 30);

  assert.strictEqual(success, true);
  assert.strictEqual(await adapter.getString(), secret);
  assert.strictEqual(notifiedState?.isActive, true);
  assert.strictEqual(notifiedState?.remainingSeconds, 30);
  assert.strictEqual(notifiedState?.label, 'Master Password');

  // Clear now resets state and purges clipboard
  await ClipboardManager.clearNow();
  assert.strictEqual(await adapter.getString(), '');
  assert.strictEqual(ClipboardManager.getState().isActive, false);

  unsubscribe();
});

test('ClipboardManager: copyPlain copies without active auto-purge countdown', async () => {
  const adapter = new InMemoryClipboardAdapter();
  const { ClipboardManager } = await import('../clipboardManager');
  ClipboardManager.setAdapter(adapter);

  const plainText = 'https://accounts.google.com';
  const success = await ClipboardManager.copyPlain(plainText);

  assert.strictEqual(success, true);
  assert.strictEqual(await adapter.getString(), plainText);
  assert.strictEqual(ClipboardManager.getState().isActive, false);
});
