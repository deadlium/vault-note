/**
 * ClipboardManager
 * Secure ephemeral clipboard bridge with active countdown tracking and auto-purge
 */

import { clipboardService, copyToClipboard } from './clipboardService';
import { ClipboardAdapter } from './types';

export interface ClipboardWipeState {
  isActive: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  label: string | null;
}

type ClipboardListener = (state: ClipboardWipeState) => void;

class ClipboardManagerClass {
  private state: ClipboardWipeState = {
    isActive: false,
    remainingSeconds: 0,
    totalSeconds: 30,
    label: null,
  };

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<ClipboardListener> = new Set();

  /**
   * Set custom adapter for testing environments
   */
  setAdapter(adapter: ClipboardAdapter): void {
    clipboardService.setAdapter(adapter);
    this.resetTimer();
  }

  /**
   * Copies sensitive content to clipboard with automated TTL countdown and auto-purge.
   * Default timeout is 30 seconds.
   */
  async copySecret(
    text: string,
    label = 'Secret',
    ttlSeconds = 30
  ): Promise<boolean> {
    this.resetTimer();

    const success = await copyToClipboard(text, {
      isSensitive: true,
      timeoutSeconds: ttlSeconds,
      label,
    });

    if (success) {
      this.state = {
        isActive: true,
        remainingSeconds: ttlSeconds,
        totalSeconds: ttlSeconds,
        label,
      };
      this.notifyListeners();

      this.intervalId = setInterval(() => {
        if (this.state.remainingSeconds > 1) {
          this.state = {
            ...this.state,
            remainingSeconds: this.state.remainingSeconds - 1,
          };
          this.notifyListeners();
        } else {
          this.resetTimer();
        }
      }, 1000);

      if (this.intervalId && typeof (this.intervalId as any).unref === 'function') {
        (this.intervalId as any).unref();
      }
    }

    return success;
  }

  /**
   * Copies non-sensitive content without scheduling an auto-wipe.
   */
  async copyPlain(text: string): Promise<boolean> {
    this.resetTimer();
    return await copyToClipboard(text, { isSensitive: false });
  }

  /**
   * Immediately clears clipboard and cancels countdown.
   */
  async clearNow(): Promise<boolean> {
    this.resetTimer();
    return await clipboardService.clearClipboard();
  }

  /**
   * Current active purge countdown state.
   */
  getState(): ClipboardWipeState {
    return { ...this.state };
  }

  /**
   * Subscribes to clipboard countdown state changes.
   */
  subscribe(listener: ClipboardListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private resetTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state = {
      isActive: false,
      remainingSeconds: 0,
      totalSeconds: 30,
      label: null,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const current = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch {
        // Suppress listener errors
      }
    });
  }
}

export const ClipboardManager = new ClipboardManagerClass();
