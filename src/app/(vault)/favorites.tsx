/**
 * Dedicated Favorites Route Screen
 * Pinned and starred items hub
 */

import React from 'react';
import { FavoritesScreen } from '../../features/favorites/components/FavoritesScreen';
import { VaultItemRowData } from '../../components/item/VaultItemRow';

export interface FavoritesRouteProps {
  onBack?: () => void;
  onSelectItem?: (item: VaultItemRowData) => void;
}

export default function VaultFavoritesRoute({ onBack, onSelectItem }: FavoritesRouteProps) {
  return (
    <FavoritesScreen
      onBack={onBack}
      onSelectItem={onSelectItem}
    />
  );
}
