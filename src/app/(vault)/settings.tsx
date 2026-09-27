/**
 * Dedicated Settings Route Screen
 * Security preferences, auto-lock policies, and perimeter controls
 */

import React from 'react';
import { SettingsScreen, SettingsScreenProps } from '../../features/settings';

export default function VaultSettingsRoute(props: SettingsScreenProps) {
  return <SettingsScreen {...props} />;
}
