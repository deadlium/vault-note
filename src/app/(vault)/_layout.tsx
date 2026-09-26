/**
 * Authenticated Vault Tab Layout
 * Apple glass floating island capsule navigation bar matching Obsidian app design pattern.
 * Features center Add action button, responsive touch-draggable sliding indicator,
 * and fluid scroll-responsive shrink animation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import {
  NavbarScrollProvider,
  useNavbarScroll,
} from '../../components/navigation/NavbarScrollContext';

export type VaultTab = 'vault' | 'search' | 'totp' | 'generator' | 'settings';

export interface VaultLayoutProps {
  children?: React.ReactNode;
  activeTab?: VaultTab;
  onTabChange?: (tab: VaultTab) => void;
  onAddItem?: () => void;
  renderContent?: (tab: VaultTab) => React.ReactNode;
}

interface TabSlotConfig {
  key: VaultTab;
  slot: number;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TAB_SLOT_CONFIGS: TabSlotConfig[] = [
  {
    key: 'vault',
    slot: 0,
    label: 'Vault',
    iconActive: 'shield-checkmark',
    iconInactive: 'shield-checkmark-outline',
  },
  {
    key: 'totp',
    slot: 1,
    label: 'TOTP',
    iconActive: 'qr-code',
    iconInactive: 'qr-code-outline',
  },
  {
    key: 'generator',
    slot: 3,
    label: 'Generator',
    iconActive: 'key',
    iconInactive: 'key-outline',
  },
  {
    key: 'settings',
    slot: 4,
    label: 'Settings',
    iconActive: 'settings',
    iconInactive: 'settings-outline',
  },
];

function getSlotForTab(tab: VaultTab): number {
  switch (tab) {
    case 'vault':
    case 'search':
      return 0;
    case 'totp':
      return 1;
    case 'generator':
      return 3;
    case 'settings':
      return 4;
    default:
      return 0;
  }
}

function getTabForSlot(slot: number): VaultTab {
  switch (slot) {
    case 0:
      return 'vault';
    case 1:
      return 'totp';
    case 3:
      return 'generator';
    case 4:
      return 'settings';
    default:
      return 'vault';
  }
}

/**
 * Inner floating navigation capsule component
 */
function FloatingGlassNavbar({
  currentTab,
  onTabChange,
  onAddItem,
}: {
  currentTab: VaultTab;
  onTabChange: (tab: VaultTab) => void;
  onAddItem?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollContext = useNavbarScroll();
  const navScaleAnim = scrollContext?.navScaleAnim ?? useRef(new Animated.Value(1)).current;

  const { width: windowWidth } = useWindowDimensions();
  const barWidth = Math.min(windowWidth - 28, 460);
  const slotWidth = (barWidth - 12) / 5;

  const activeSlot = getSlotForTab(currentTab);
  const indicatorAnim = useRef(new Animated.Value(activeSlot * slotWidth)).current;

  // Track position and references to prevent stale closure bugs
  const currentPos = useRef(activeSlot * slotWidth);
  const dragStartPos = useRef(activeSlot * slotWidth);
  const isDragging = useRef(false);

  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;

  const slotWidthRef = useRef(slotWidth);
  slotWidthRef.current = slotWidth;

  const onTabChangeRef = useRef(onTabChange);
  onTabChangeRef.current = onTabChange;

  const onAddItemRef = useRef(onAddItem);
  onAddItemRef.current = onAddItem;

  // Synchronize indicator position smoothly on tab changes
  useEffect(() => {
    if (!isDragging.current) {
      const targetPos = activeSlot * slotWidth;
      currentPos.current = targetPos;
      Animated.spring(indicatorAnim, {
        toValue: targetPos,
        friction: 8,
        tension: 110,
        useNativeDriver: true,
      }).start();
    }
  }, [activeSlot, slotWidth, indicatorAnim]);

  // Handle direct tab tap with tactile spring
  const handleTabPress = useCallback((tab: VaultTab) => {
    const slot = getSlotForTab(tab);
    const targetPos = slot * slotWidthRef.current;
    currentPos.current = targetPos;
    onTabChange(tab);
    Animated.spring(indicatorAnim, {
      toValue: targetPos,
      friction: 8,
      tension: 110,
      useNativeDriver: true,
    }).start();
  }, [indicatorAnim, onTabChange]);

  // PanResponder allowing continuous touch-drag across tabs without jumping
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 6;
      },
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 6;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isDragging.current = true;
        // Anchor drag strictly to where indicator currently rests
        dragStartPos.current = currentPos.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const sw = slotWidthRef.current;
        const maxPos = sw * 4;
        const newPos = Math.max(0, Math.min(maxPos, dragStartPos.current + gestureState.dx));
        indicatorAnim.setValue(newPos);
        currentPos.current = newPos;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        isDragging.current = false;
        const sw = slotWidthRef.current;
        const maxPos = sw * 4;
        const finalPos = Math.max(0, Math.min(maxPos, dragStartPos.current + gestureState.dx));
        let targetSlot = Math.round(finalPos / sw);
        targetSlot = Math.max(0, Math.min(4, targetSlot));

        // Dropping on center Add slot triggers Add action and springs back
        if (targetSlot === 2) {
          onAddItemRef.current?.();
          const snapBackPos = activeSlotRef.current * sw;
          currentPos.current = snapBackPos;
          Animated.spring(indicatorAnim, {
            toValue: snapBackPos,
            friction: 8,
            tension: 110,
            useNativeDriver: true,
          }).start();
          return;
        }

        const newTab = getTabForSlot(targetSlot);
        onTabChangeRef.current(newTab);
        const targetPos = targetSlot * sw;
        currentPos.current = targetPos;
        Animated.spring(indicatorAnim, {
          toValue: targetPos,
          friction: 8,
          tension: 110,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.floatingBarWrapper,
        {
          width: barWidth,
          bottom: Math.max(insets.bottom + 8, 16),
          transform: [{ scale: navScaleAnim }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Frosted Glass Island Capsule */}
      <View style={styles.glassContainer}>
        {/* Sliding Active Tab Indicator Pill */}
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: slotWidth,
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        />

        {/* Slot 0: Vault Tab */}
        <Pressable
          onPress={() => handleTabPress('vault')}
          style={styles.tabSlot}
          accessibilityRole="button"
          accessibilityLabel="Vault"
          accessibilityState={{ selected: currentTab === 'vault' }}
        >
          <Ionicons
            name={currentTab === 'vault' ? 'shield-checkmark' : 'shield-checkmark-outline'}
            size={20}
            color={currentTab === 'vault' ? colors.primaryLight : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'vault' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Vault
          </Text>
        </Pressable>

        {/* Slot 1: TOTP Tab */}
        <Pressable
          onPress={() => handleTabPress('totp')}
          style={styles.tabSlot}
          accessibilityRole="button"
          accessibilityLabel="TOTP"
          accessibilityState={{ selected: currentTab === 'totp' }}
        >
          <Ionicons
            name={currentTab === 'totp' ? 'qr-code' : 'qr-code-outline'}
            size={20}
            color={currentTab === 'totp' ? colors.primaryLight : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'totp' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            TOTP
          </Text>
        </Pressable>

        {/* Slot 2: Middle Add (+) Action Button */}
        <View style={styles.centerSlot}>
          <Pressable
            onPress={() => onAddItem?.()}
            style={({ pressed }) => [
              styles.centerAddButton,
              pressed && styles.centerAddButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add Vault Item"
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Slot 3: Generator Tab */}
        <Pressable
          onPress={() => handleTabPress('generator')}
          style={styles.tabSlot}
          accessibilityRole="button"
          accessibilityLabel="Generator"
          accessibilityState={{ selected: currentTab === 'generator' }}
        >
          <Ionicons
            name={currentTab === 'generator' ? 'key' : 'key-outline'}
            size={20}
            color={currentTab === 'generator' ? colors.primaryLight : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'generator' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Generator
          </Text>
        </Pressable>

        {/* Slot 4: Settings Tab */}
        <Pressable
          onPress={() => handleTabPress('settings')}
          style={styles.tabSlot}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityState={{ selected: currentTab === 'settings' }}
        >
          <Ionicons
            name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
            size={20}
            color={currentTab === 'settings' ? colors.primaryLight : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'settings' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Settings
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function VaultTabLayout({
  children,
  activeTab: externalTab,
  onTabChange: externalTabChange,
  onAddItem,
  renderContent,
}: VaultLayoutProps) {
  const [internalTab, setInternalTab] = useState<VaultTab>('vault');
  const currentTab = externalTab ?? internalTab;

  const handleTabPress = (tab: VaultTab) => {
    if (externalTabChange) {
      externalTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  return (
    <NavbarScrollProvider>
      <View style={styles.container}>
        {/* Active Screen Content */}
        <View style={styles.content}>
          {renderContent ? renderContent(currentTab) : children}
        </View>

        {/* Modern Apple Glass Floating Island Capsule Navbar */}
        <FloatingGlassNavbar
          currentTab={currentTab}
          onTabChange={handleTabPress}
          onAddItem={onAddItem}
        />
      </View>
    </NavbarScrollProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  floatingBarWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  glassContainer: {
    width: '100%',
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(18, 20, 28, 0.90)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 6,
    top: 6,
    bottom: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 97, 255, 0.16)',
    borderWidth: 1.2,
    borderColor: 'rgba(157, 141, 255, 0.40)',
  },
  tabSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 2,
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
  tabLabelInactive: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  centerSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  centerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  centerAddButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.92 }],
  },
});
