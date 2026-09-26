/**
 * Dedicated Vault Search Route Screen
 * Powered by Ephemeral RAM Search Index
 */

import React from 'react';
import { SearchScreen } from '../../features/search/components/SearchScreen';
import { VaultItemRowData } from '../../components/item/VaultItemRow';

export interface SearchRouteProps {
  onBack?: () => void;
  onSelectItem?: (item: VaultItemRowData) => void;
}

export default function VaultSearchRoute({ onBack, onSelectItem }: SearchRouteProps) {
  return (
    <SearchScreen
      onBack={onBack}
      onSelectItem={onSelectItem}
    />
  );
}
