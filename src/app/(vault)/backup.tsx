/**
 * Dedicated Backup & Restore Route Screen
 * Encrypted .vaultnote file export and pre-flight restore validation
 */

import React from 'react';
import { BackupScreen } from '../../features/backup/components/BackupScreen';

export interface BackupRouteProps {
  onBack?: () => void;
}

export default function VaultBackupRoute({ onBack }: BackupRouteProps) {
  return <BackupScreen onBack={onBack ?? (() => {})} />;
}
