import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import RootLayout from './app/_layout';
import VaultTabLayout, { VaultTab } from './app/(vault)/_layout';
import VaultHomeScreen from './app/(vault)/index';
import VaultItemDetailScreen from './app/(vault)/item/[id]';
import VaultItemEditScreen from './app/(vault)/item/edit';
import MasterPasswordSetupScreen from './app/(auth)/setup';
import VaultRecoveryScreen from './app/(auth)/recovery';
import VaultUnlockScreen from './app/(auth)/unlock';
import { CupertinoScreenTransition } from './components/navigation/CupertinoScreenTransition';
import { PasswordGeneratorScreen } from './features/password-generator';
import { TOTPScreen } from './features/totp';
import { SearchScreen } from './features/search/components/SearchScreen';
import { FavoritesScreen } from './features/favorites/components/FavoritesScreen';
import { SecurityCenterScreen } from './features/security-center/components/SecurityCenterScreen';
import { BackupScreen } from './features/backup/components/BackupScreen';
import { VaultSessionManager, useSessionStore } from './core/session';
import { useAutoLock } from './hooks/useAutoLock';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CUPERTINO_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [navRoute, setNavRoute] = useState<'default' | 'recovery'>('default');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<VaultTab>('vault');

  const sessionStatus = useSessionStore((s) => s.status);

  // Home screen parallax shift when a sub-screen is pushed
  const homeAnim = useRef(new Animated.Value(0)).current;

  // Smooth page switch crossfade animation between lock and vault states
  const authTransitionAnim = useRef(new Animated.Value(1)).current;
  const authScaleAnim = useRef(new Animated.Value(1)).current;

  // Initialize auto-lock lifecycle and AppState listeners
  useAutoLock();

  useEffect(() => {
    VaultSessionManager.initializeSession()
      .finally(() => setIsInitializing(false));
  }, []);

  // When session locks, reset all subscreen navigation states immediately
  useEffect(() => {
    if (sessionStatus !== 'UNLOCKED') {
      setSelectedItemId(null);
      setIsEditingItem(false);
      setIsAddingItem(false);
      setIsFavoritesOpen(false);
      setIsSearchOpen(false);
      setIsSecurityOpen(false);
      setIsBackupOpen(false);
    }
  }, [sessionStatus]);

  const isAnySubscreenOpen =
    Boolean(selectedItemId) ||
    isAddingItem ||
    isFavoritesOpen ||
    isSearchOpen ||
    isSecurityOpen ||
    isBackupOpen;

  useEffect(() => {
    Animated.timing(homeAnim, {
      toValue: isAnySubscreenOpen ? 1 : 0,
      duration: 300,
      easing: CUPERTINO_EASING,
      useNativeDriver: true,
    }).start();
  }, [isAnySubscreenOpen, homeAnim]);

  useEffect(() => {
    authTransitionAnim.setValue(0);
    authScaleAnim.setValue(0.97);

    Animated.parallel([
      Animated.timing(authTransitionAnim, {
        toValue: 1,
        duration: 300,
        easing: CUPERTINO_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(authScaleAnim, {
        toValue: 1,
        duration: 300,
        easing: CUPERTINO_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sessionStatus, navRoute, authTransitionAnim, authScaleAnim]);

  if (isInitializing) {
    return <RootLayout />;
  }

  const homeDimOpacity = homeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
    extrapolate: 'clamp',
  });

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
        <View style={styles.container}>
          {/* Base Layer: Authenticated Vault Dashboard */}
          <View style={styles.container}>
            <VaultTabLayout
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onAddItem={() => {
                setSelectedItemId(null);
                setIsAddingItem(true);
              }}
            >
              <View
                style={[
                  styles.tabScreenWrapper,
                  { display: activeTab === 'vault' ? 'flex' : 'none' },
                ]}
              >
                <VaultHomeScreen
                  onLock={() => VaultSessionManager.lock()}
                  onSelectItem={(item) => {
                    setIsEditingItem(false);
                    setSelectedItemId(item.id);
                  }}
                  onAddItem={() => {
                    setSelectedItemId(null);
                    setIsAddingItem(true);
                  }}
                  onOpenSearch={() => setIsSearchOpen(true)}
                  onOpenFavorites={() => setIsFavoritesOpen(true)}
                  onOpenSecurity={() => setIsSecurityOpen(true)}
                  onOpenBackup={() => setIsBackupOpen(true)}
                />
              </View>

              <View
                style={[
                  styles.tabScreenWrapper,
                  { display: activeTab === 'totp' ? 'flex' : 'none' },
                ]}
              >
                <TOTPScreen
                  onOpenItem={(item) => {
                    setIsEditingItem(false);
                    setSelectedItemId(item.id);
                  }}
                />
              </View>

              <View
                style={[
                  styles.tabScreenWrapper,
                  { display: activeTab === 'generator' ? 'flex' : 'none' },
                ]}
              >
                <PasswordGeneratorScreen />
              </View>

              <View
                style={[
                  styles.tabScreenWrapper,
                  { display: activeTab === 'search' ? 'flex' : 'none' },
                ]}
              >
                <SearchScreen
                  onBack={() => setActiveTab('vault')}
                  onSelectItem={(item) => {
                    setIsEditingItem(false);
                    setSelectedItemId(item.id);
                  }}
                />
              </View>
            </VaultTabLayout>

            {/* Smooth Dimming Overlay on Base Layer when subscreen is presented */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.homeDimOverlay,
                {
                  opacity: homeDimOpacity,
                },
              ]}
            />
          </View>

          {/* Hub Layer 1: Favorites Hub Screen (pushed on top of home) */}
          <CupertinoScreenTransition
            visible={isFavoritesOpen}
            covered={Boolean(selectedItemId)}
            onDismiss={() => setIsFavoritesOpen(false)}
            zIndex={200}
          >
            <FavoritesScreen
              onBack={() => setIsFavoritesOpen(false)}
              onSelectItem={(item) => {
                setIsEditingItem(false);
                setSelectedItemId(item.id);
              }}
            />
          </CupertinoScreenTransition>

          {/* Hub Layer 2: Dedicated Full Search Screen (pushed on top of home) */}
          <CupertinoScreenTransition
            visible={isSearchOpen}
            covered={Boolean(selectedItemId)}
            onDismiss={() => setIsSearchOpen(false)}
            zIndex={250}
          >
            <SearchScreen
              onBack={() => setIsSearchOpen(false)}
              onSelectItem={(item) => {
                setIsEditingItem(false);
                setSelectedItemId(item.id);
              }}
            />
          </CupertinoScreenTransition>

          {/* Hub Layer 3: Security Center Dashboard (pushed on top of home) */}
          <CupertinoScreenTransition
            visible={isSecurityOpen}
            covered={Boolean(selectedItemId)}
            onDismiss={() => setIsSecurityOpen(false)}
            zIndex={300}
          >
            <SecurityCenterScreen
              onBack={() => setIsSecurityOpen(false)}
              onSelectItem={(item) => {
                setIsEditingItem(false);
                setSelectedItemId(item.id);
              }}
              onEditItem={(item) => {
                setSelectedItemId(item.id);
                setIsEditingItem(true);
              }}
              onOpenBackup={() => setIsBackupOpen(true)}
            />
          </CupertinoScreenTransition>

          {/* Hub Layer 4: Encrypted Backup & Restore Screen */}
          <CupertinoScreenTransition
            visible={isBackupOpen}
            covered={Boolean(selectedItemId)}
            onDismiss={() => setIsBackupOpen(false)}
            zIndex={350}
          >
            <BackupScreen onBack={() => setIsBackupOpen(false)} />
          </CupertinoScreenTransition>

          {/* Action Layer 1: Add New Item Screen (pushed on top of all screens) */}
          <CupertinoScreenTransition
            visible={isAddingItem}
            covered={false}
            onDismiss={() => setIsAddingItem(false)}
            zIndex={400}
          >
            <VaultItemEditScreen
              onBack={() => setIsAddingItem(false)}
              onSaveComplete={() => setIsAddingItem(false)}
            />
          </CupertinoScreenTransition>

          {/* Action Layer 2: Item Detail Screen (pushed on top of hubs and home) */}
          <CupertinoScreenTransition
            visible={Boolean(selectedItemId)}
            covered={isEditingItem}
            onDismiss={() => {
              setSelectedItemId(null);
              setIsEditingItem(false);
            }}
            zIndex={500}
          >
            {selectedItemId && (
              <VaultItemDetailScreen
                id={selectedItemId}
                onBack={() => {
                  setSelectedItemId(null);
                  setIsEditingItem(false);
                }}
                onEdit={() => setIsEditingItem(true)}
              />
            )}
          </CupertinoScreenTransition>

          {/* Action Layer 3: Item Edit Screen (pushed on top of detail screen and hubs) */}
          <CupertinoScreenTransition
            visible={Boolean(selectedItemId && isEditingItem)}
            covered={false}
            onDismiss={() => setIsEditingItem(false)}
            zIndex={600}
          >
            {selectedItemId && (
              <VaultItemEditScreen
                id={selectedItemId}
                onBack={() => setIsEditingItem(false)}
                onSaveComplete={() => setIsEditingItem(false)}
              />
            )}
          </CupertinoScreenTransition>
        </View>
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

  return (
    <RootLayout>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: authTransitionAnim,
            transform: [{ scale: authScaleAnim }],
          },
        ]}
      >
        {renderScreen()}
      </Animated.View>
    </RootLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabScreenWrapper: {
    flex: 1,
  },
  homeDimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 999,
  },
});
