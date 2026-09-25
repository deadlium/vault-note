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

  const isAnySubscreenOpen = Boolean(selectedItemId) || isAddingItem;

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

  const homeTranslateX = homeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH * 0.25],
    extrapolate: 'clamp',
  });

  const homeDimOpacity = homeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.28],
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
          {/* Base Layer: Authenticated Vault Dashboard with Cupertino Parallax */}
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ translateX: homeTranslateX }],
              },
            ]}
          >
            <VaultTabLayout
              activeTab={activeTab}
              onTabChange={setActiveTab}
            >
              {activeTab === 'generator' ? (
                <PasswordGeneratorScreen />
              ) : (
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
                />
              )}
            </VaultTabLayout>

            {/* Parallax Dimming on Home Layer */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.homeDimOverlay,
                {
                  opacity: homeDimOpacity,
                },
              ]}
            />
          </Animated.View>

          {/* Layer 1: Item Detail Screen with Cupertino Parallax Shift when Edit is pushed */}
          <CupertinoScreenTransition
            visible={Boolean(selectedItemId)}
            covered={isEditingItem}
            onDismiss={() => {
              setSelectedItemId(null);
              setIsEditingItem(false);
            }}
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

          {/* Layer 2: Item Edit Screen (pushed on top of detail screen) */}
          <CupertinoScreenTransition
            visible={Boolean(selectedItemId && isEditingItem)}
            covered={false}
            onDismiss={() => setIsEditingItem(false)}
          >
            {selectedItemId && (
              <VaultItemEditScreen
                id={selectedItemId}
                onBack={() => setIsEditingItem(false)}
                onSaveComplete={() => setIsEditingItem(false)}
              />
            )}
          </CupertinoScreenTransition>

          {/* Layer 3: Add New Item Screen (pushed on top of home) */}
          <CupertinoScreenTransition
            visible={isAddingItem}
            covered={false}
            onDismiss={() => setIsAddingItem(false)}
          >
            <VaultItemEditScreen
              onBack={() => setIsAddingItem(false)}
              onSaveComplete={() => setIsAddingItem(false)}
            />
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
  homeDimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 999,
  },
});
