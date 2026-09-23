import React, { useState, useEffect } from 'react';
import RootLayout from './app/_layout';
import VaultHomeLaunch from './app/index';
import MasterPasswordSetupScreen from './app/(auth)/setup';
import VaultRecoveryScreen from './app/(auth)/recovery';
import VaultUnlockScreen from './app/(auth)/unlock';
import { VaultSessionManager, useSessionStore } from './core/session';
import { useAutoLock } from './hooks/useAutoLock';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [navRoute, setNavRoute] = useState<'default' | 'recovery'>('default');
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
      return (
        <VaultHomeLaunch onLock={() => VaultSessionManager.lock()} />
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
