/**
 * Dedicated Security Center Route Screen
 * Security hygiene, password health, and zero-knowledge perimeter audits
 */

import React from 'react';
import { SecurityCenterScreen } from '../../features/security-center/components/SecurityCenterScreen';
import { VaultItem } from '../../types/vault';

export interface SecurityRouteProps {
  onBack?: () => void;
  onSelectItem?: (item: VaultItem) => void;
  onEditItem?: (item: VaultItem) => void;
}

export default function VaultSecurityRoute({
  onBack,
  onSelectItem,
  onEditItem,
}: SecurityRouteProps) {
  return (
    <SecurityCenterScreen
      onBack={onBack ?? (() => {})}
      onSelectItem={onSelectItem}
      onEditItem={onEditItem}
    />
  );
}
