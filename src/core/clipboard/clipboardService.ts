/**
 * VaultNote Clipboard Service
 * Ephemeral zero-knowledge clipboard interface with auto-clearing security timers.
 * Prevents sensitive passwords, recovery phrases, and TOTP keys from lingering in clipboard history.
 */

import { APP_CONFIG } from '../../constants';
import { ClipboardAdapter, ClipboardCopyOptions } from './types';

/**
 * In-memory fallback clipboard adapter for testing / Node environments
 */
export class InMemoryClipboardAdapter implements ClipboardAdapter {
  private content: string = '';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async setString(text: string): Promise<boolean> {
    this.content = text;
    return true;
  }

  async getString(): Promise<string> {
    return this.content;
  }

  async hasString(): Promise<boolean> {
    return this.content.length > 0;
  }

  async clear(): Promise<boolean> {
    this.content = '';
    return true;
  }
}

/**
 * Native Expo Clipboard adapter
 */
export class ExpoClipboardAdapter implements ClipboardAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private expoClipboard: any = null;

  constructor() {
    try {
      // Dynamic import to prevent bundler failures in non-native / node test environments
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.expoClipboard = require('expo-clipboard');
    } catch {
      this.expoClipboard = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.expoClipboard && typeof this.expoClipboard.setStringAsync === 'function');
  }

  async setString(text: string): Promise<boolean> {
    if (this.expoClipboard && typeof this.expoClipboard.setStringAsync === 'function') {
      return await this.expoClipboard.setStringAsync(text);
    }
    // Web fallback if running in browser without native bridge
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  }

  async getString(): Promise<string> {
    if (this.expoClipboard && typeof this.expoClipboard.getStringAsync === 'function') {
      return await this.expoClipboard.getStringAsync();
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    }
    return '';
  }

  async hasString(): Promise<boolean> {
    if (this.expoClipboard && typeof this.expoClipboard.hasStringAsync === 'function') {
      return await this.expoClipboard.hasStringAsync();
    }
    const current = await this.getString();
    return current.length > 0;
  }

  async clear(): Promise<boolean> {
    return await this.setString('');
  }
}

class ClipboardService {
  private adapter: ClipboardAdapter;
  private pendingWipeTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSensitiveContent: string | null = null;

  constructor(adapter?: ClipboardAdapter) {
    if (adapter) {
      this.adapter = adapter;
    } else {
      const nativeAdapter = new ExpoClipboardAdapter();
      // We will check availability at call time or fallback
      this.adapter = nativeAdapter;
    }
  }

  /**
   * Set custom adapter (useful for mocks and testing)
   */
  setAdapter(adapter: ClipboardAdapter): void {
    this.cancelPendingWipe();
    this.adapter = adapter;
  }

  /**
   * Copy a string to the system clipboard.
   * If isSensitive is true, schedules an automatic clipboard purge after timeoutSeconds.
   */
  async copyToClipboard(text: string, options?: ClipboardCopyOptions): Promise<boolean> {
    // Ensure we cancel any existing wipe timer before proceeding
    this.cancelPendingWipe();

    let success = false;
    try {
      if (await this.adapter.isAvailable()) {
        success = await this.adapter.setString(text);
      } else {
        // Fallback to in-memory if native is unavailable
        this.adapter = new InMemoryClipboardAdapter();
        success = await this.adapter.setString(text);
      }
    } catch {
      // Last-ditch in-memory fallback to avoid unhandled rejections
      this.adapter = new InMemoryClipboardAdapter();
      success = await this.adapter.setString(text);
    }

    if (success && options?.isSensitive) {
      const timeoutSec = options.timeoutSeconds ?? APP_CONFIG.clipboardTimeoutSeconds;
      this.lastSensitiveContent = text;
      this.scheduleWipe(text, timeoutSec * 1000);
    }

    return success;
  }

  /**
   * Retrieve current clipboard string
   */
  async getClipboardText(): Promise<string> {
    try {
      return await this.adapter.getString();
    } catch {
      return '';
    }
  }

  /**
   * Immediately clears the system clipboard
   */
  async clearClipboard(): Promise<boolean> {
    this.cancelPendingWipe();
    try {
      return await this.adapter.clear();
    } catch {
      return false;
    }
  }

  /**
   * Cancels any pending auto-wipe timeout
   */
  cancelPendingWipe(): void {
    if (this.pendingWipeTimeout) {
      clearTimeout(this.pendingWipeTimeout);
      this.pendingWipeTimeout = null;
    }
    this.lastSensitiveContent = null;
  }

  /**
   * Check if a sensitive wipe timer is currently running
   */
  hasPendingWipe(): boolean {
    return this.pendingWipeTimeout !== null;
  }

  private scheduleWipe(expectedContent: string, delayMs: number): void {
    this.pendingWipeTimeout = setTimeout(async () => {
      try {
        const currentContent = await this.adapter.getString();
        // Only wipe if the clipboard still contains the sensitive content we copied
        if (currentContent === expectedContent) {
          await this.adapter.clear();
        }
      } catch {
        // Suppress background wipe errors
      } finally {
        this.pendingWipeTimeout = null;
        this.lastSensitiveContent = null;
      }
    }, delayMs);

    // Unref timer if running in Node environment to prevent hanging process
    if (this.pendingWipeTimeout && typeof (this.pendingWipeTimeout as any).unref === 'function') {
      (this.pendingWipeTimeout as any).unref();
    }
  }
}

export const clipboardService = new ClipboardService();

/**
 * Convenient standalone helper functions
 */
export const copyToClipboard = (text: string, options?: ClipboardCopyOptions): Promise<boolean> => {
  return clipboardService.copyToClipboard(text, options);
};

export const getClipboardText = (): Promise<string> => {
  return clipboardService.getClipboardText();
};

export const clearClipboard = (): Promise<boolean> => {
  return clipboardService.clearClipboard();
};
