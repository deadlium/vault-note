/**
 * useClipboardManager Hook
 * Subscribes to ephemeral clipboard countdown timers and exposes safe copying routines
 */

import { useState, useEffect, useCallback } from 'react';
import { ClipboardManager, ClipboardWipeState } from './clipboardManager';

export function useClipboardManager() {
  const [wipeState, setWipeState] = useState<ClipboardWipeState>(() =>
    ClipboardManager.getState()
  );

  useEffect(() => {
    const unsubscribe = ClipboardManager.subscribe((newState) => {
      setWipeState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const copySecret = useCallback(
    async (text: string, label = 'Secret', ttlSeconds = 30): Promise<boolean> => {
      return await ClipboardManager.copySecret(text, label, ttlSeconds);
    },
    []
  );

  const copyPlain = useCallback(async (text: string): Promise<boolean> => {
    return await ClipboardManager.copyPlain(text);
  }, []);

  const clearNow = useCallback(async (): Promise<boolean> => {
    return await ClipboardManager.clearNow();
  }, []);

  return {
    isActive: wipeState.isActive,
    remainingSeconds: wipeState.remainingSeconds,
    totalSeconds: wipeState.totalSeconds,
    label: wipeState.label,
    copySecret,
    copyPlain,
    clearNow,
  };
}
