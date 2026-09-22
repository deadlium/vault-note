import React, { useState, useEffect } from 'react';
import RootLayout from './app/_layout';
import VaultHomeLaunch from './app/index';
import MasterPasswordSetupScreen from './app/(auth)/setup';
import VaultRecoveryScreen from './app/(auth)/recovery';
import { isVaultInitialized } from './core/storage/enclave';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'setup' | 'recovery' | 'vault'>('loading');

  useEffect(() => {
    isVaultInitialized()
      .then((initialized) => {
        setCurrentScreen(initialized ? 'vault' : 'setup');
      })
      .catch(() => setCurrentScreen('setup'));
  }, []);

  if (currentScreen === 'loading') {
    return <RootLayout />;
  }

  return (
    <RootLayout>
      {currentScreen === 'setup' && (
        <MasterPasswordSetupScreen
          onComplete={() => setCurrentScreen('vault')}
          onNavigateToRestore={() => setCurrentScreen('recovery')}
        />
      )}
      {currentScreen === 'recovery' && (
        <VaultRecoveryScreen
          onCancel={() => setCurrentScreen('setup')}
          onRestoreComplete={() => setCurrentScreen('vault')}
        />
      )}
      {currentScreen === 'vault' && (
        <VaultHomeLaunch onLock={() => setCurrentScreen('setup')} />
      )}
    </RootLayout>
  );
}
