/**
 * VaultNote Backup & Restore Hook
 * Coordinates zero-knowledge export serialization and safe pre-flight restore validation.
 */

import { useState, useCallback } from 'react';
import { useVaultStore } from '../vault/store/useVaultStore';
import { VaultSessionManager } from '../../core/session';
import { VaultRepository } from '../vault/repository/vaultRepository';
import {
  createEncryptedBackup,
  decryptAndVerifyBackup,
  mergeVaultItems,
} from './backupEngine';
import {
  DecryptedBackupPayload,
  RestoreMode,
  RestoreSummary,
  BackupExportOptions,
  BackupError,
} from './types';

export interface UseBackupReturn {
  isExporting: boolean;
  isInspecting: boolean;
  isRestoring: boolean;
  exportResult: string | null;
  inspectedPayload: DecryptedBackupPayload | null;
  restoreSummary: RestoreSummary | null;
  error: string | null;
  restoreMode: RestoreMode;
  setRestoreMode: (mode: RestoreMode) => void;
  exportVault: (passphrase: string, options?: BackupExportOptions) => Promise<string>;
  inspectBackupContent: (rawContent: string, passphrase: string) => Promise<DecryptedBackupPayload>;
  executeRestore: (modeOverride?: RestoreMode) => Promise<RestoreSummary>;
  cancelRestore: () => void;
  clearExportResult: () => void;
  clearError: () => void;
  resetAll: () => void;
}

export function useBackup(): UseBackupReturn {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [inspectedPayload, setInspectedPayload] = useState<DecryptedBackupPayload | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearExportResult = useCallback(() => {
    setExportResult(null);
  }, []);

  const cancelRestore = useCallback(() => {
    setInspectedPayload(null);
    setRestoreSummary(null);
    setError(null);
    setIsInspecting(false);
    setIsRestoring(false);
  }, []);

  const resetAll = useCallback(() => {
    setIsExporting(false);
    setIsInspecting(false);
    setIsRestoring(false);
    setExportResult(null);
    setInspectedPayload(null);
    setRestoreSummary(null);
    setError(null);
    setRestoreMode('merge');
  }, []);

  const exportVault = useCallback(
    async (passphrase: string, options?: BackupExportOptions): Promise<string> => {
      setIsExporting(true);
      setError(null);
      setExportResult(null);

      try {
        const currentItems = useVaultStore.getState().items;
        const serialized = await createEncryptedBackup(currentItems, passphrase, options);
        setExportResult(serialized);
        return serialized;
      } catch (err) {
        const message = err instanceof BackupError ? err.message : (err as Error).message;
        setError(message);
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const inspectBackupContent = useCallback(
    async (rawContent: string, passphrase: string): Promise<DecryptedBackupPayload> => {
      setIsInspecting(true);
      setError(null);
      setInspectedPayload(null);
      setRestoreSummary(null);

      try {
        const verifiedPayload = await decryptAndVerifyBackup(rawContent, passphrase);
        setInspectedPayload(verifiedPayload);
        return verifiedPayload;
      } catch (err) {
        const message = err instanceof BackupError ? err.message : (err as Error).message;
        setError(message);
        throw err;
      } finally {
        setIsInspecting(false);
      }
    },
    []
  );

  const executeRestore = useCallback(
    async (modeOverride?: RestoreMode): Promise<RestoreSummary> => {
      if (!inspectedPayload) {
        const err = new Error('No verified backup payload available for restore.');
        setError(err.message);
        throw err;
      }

      setIsRestoring(true);
      setError(null);

      try {
        const activeMode = modeOverride || restoreMode;
        const currentItems = useVaultStore.getState().items;
        const { mergedItems, summary } = mergeVaultItems(
          currentItems,
          inspectedPayload.items,
          activeMode
        );

        // Update reactive state across all application screens
        useVaultStore.getState().setItems(mergedItems);

        // Persist to encrypted SQLite if master key is unlocked
        const masterKey = VaultSessionManager.getMasterKey();
        if (masterKey) {
          try {
            if (activeMode === 'replace') {
              for (const item of currentItems) {
                await VaultRepository.deleteItem(item.id);
              }
              for (const item of mergedItems) {
                await VaultRepository.createItem(item, masterKey);
              }
            } else {
              for (const item of inspectedPayload.items) {
                const existing = currentItems.find((c) => c.id === item.id);
                if (!existing) {
                  await VaultRepository.createItem(item, masterKey);
                } else if (item.updatedAt > existing.updatedAt) {
                  await VaultRepository.updateItem(item.id, item, masterKey);
                }
              }
            }
          } catch {
            // Memory store remains consistent
          }
        }

        setRestoreSummary(summary);
        setInspectedPayload(null);
        return summary;
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        throw err;
      } finally {
        setIsRestoring(false);
      }
    },
    [inspectedPayload, restoreMode]
  );

  return {
    isExporting,
    isInspecting,
    isRestoring,
    exportResult,
    inspectedPayload,
    restoreSummary,
    error,
    restoreMode,
    setRestoreMode,
    exportVault,
    inspectBackupContent,
    executeRestore,
    cancelRestore,
    clearExportResult,
    clearError,
    resetAll,
  };
}
