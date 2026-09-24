import React, { useState, useEffect } from 'react';
import RootLayout from './app/_layout';
import VaultTabLayout, { VaultTab } from './app/(vault)/_layout';
import VaultHomeScreen from './app/(vault)/index';
import VaultItemDetailScreen from './app/(vault)/item/[id]';
import VaultItemEditScreen from './app/(vault)/item/edit';
import MasterPasswordSetupScreen from './app/(auth)/setup';
import VaultRecoveryScreen from './app/(auth)/recovery';
import VaultUnlockScreen from './app/(auth)/unlock';
import { VaultSessionManager, useSessionStore } from './core/session';
import { useAutoLock } from './hooks/useAutoLock';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [navRoute, setNavRoute] = useState<'default' | 'recovery'>('default');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [activeTab, setActiveTab] = useState<VaultTab>('vault');

  const sessionStatus = useSessionStore((s) => s.status);

  // Initialize auto-lock lifecycle and AppState listeners
  useAutoLock();

  useEffect(() => {
    VaultSessionManager.initializeSession()
      .finally(() => setIsInitializing(false));
  }, []);

  if (isInitializing) {
    return <RootLayout />;
  }

  // Active navigation screen derived from central session state machine
  const renderScreen = () => {
    if (navRoute === 'recovery') {
      return (
        <VaultRecoveryScreen
          onCancel={() => {
            setNavRoute('default');
            VaultSessionManager.initializeSession();
          }}
          onRestoreComplete={() => {
            setNavRoute('default');
            VaultSessionManager.unlock();
          }}
        />
      );
    }

    if (sessionStatus === 'UNINITIALIZED') {
      return (
        <MasterPasswordSetupScreen
          onComplete={() => VaultSessionManager.unlock()}
          onNavigateToRestore={() => setNavRoute('recovery')}
        />
      );
    }

    if (sessionStatus === 'UNLOCKED') {
      // Detail view
      if (selectedItemId) {
        if (isEditingItem) {
          return (
            <VaultItemEditScreen
              id={selectedItemId}
              onBack={() => setIsEditingItem(false)}
              onSaveComplete={() => setIsEditingItem(false)}
            />
          );
        }

        return (
          <VaultItemDetailScreen
            id={selectedItemId}
            onBack={() => setSelectedItemId(null)}
            onEdit={() => setIsEditingItem(true)}
          />
        );
      }

      // Add new item view
      if (isAddingItem) {
        return (
          <VaultItemEditScreen
            onBack={() => setIsAddingItem(false)}
            onSaveComplete={() => setIsAddingItem(false)}
          />
        );
      }

      // Authenticated Vault Dashboard with Bottom Tabs
      return (
        <VaultTabLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          <VaultHomeScreen
            onLock={() => VaultSessionManager.lock()}
            onSelectItem={(item) => setSelectedItemId(item.id)}
            onAddItem={() => setIsAddingItem(true)}
          />
        </VaultTabLayout>
      );
    }

    // Default for LOCKED, UNLOCKING, and BACKGROUND states: render lock screen
    return (
      <VaultUnlockScreen
        onUnlockComplete={() => VaultSessionManager.unlock()}
        onNavigateToRestore={() => setNavRoute('recovery')}
      />
    );
  };

  return <RootLayout>{renderScreen()}</RootLayout>;
}
