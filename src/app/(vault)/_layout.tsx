/**
 * Authenticated Vault Tab Layout
 * Obsidian Liquid Glass floating capsule navigation bar matching app design pattern.
 * Features 4-tab navigation capsule with purple shiny sliding indicator
 * and separate standalone floating circular Add button that opens the New Item screen.
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
import { colors, typography } from '../../theme';
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
    iconActive: 'time',
    iconInactive: 'time-outline',
  },
  {
    key: 'generator',
    slot: 2,
    label: 'Generator',
    iconActive: 'key',
    iconInactive: 'key-outline',
  },
  {
    key: 'settings',
    slot: 3,
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
      return 2;
    case 'settings':
      return 3;
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
    case 2:
      return 'generator';
    case 3:
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
  const barWidth = Math.min(windowWidth - 24, 440);

  // Separate button dimensions
  const addButtonSize = 52;
  const islandGap = 10;
  const capsulePaddingHorizontal = 4;
  const capsuleWidth = barWidth - addButtonSize - islandGap;
  const tabsWidth = capsuleWidth - capsulePaddingHorizontal * 2;
  const slotWidth = tabsWidth / 4;

  const activeSlot = getSlotForTab(currentTab);
  const indicatorAnim = useRef(new Animated.Value(activeSlot * slotWidth)).current;

  // Track position and references to prevent stale closure bugs
  const currentPos = useRef(activeSlot * slotWidth);
  const dragStartPos = useRef(activeSlot * slotWidth);
  const isDragging = useRef(false);

  const slotWidthRef = useRef(slotWidth);
  slotWidthRef.current = slotWidth;

  const onTabChangeRef = useRef(onTabChange);
  onTabChangeRef.current = onTabChange;

  // Synchronize indicator position smoothly on tab changes
  useEffect(() => {
    if (!isDragging.current) {
      const targetPos = activeSlot * slotWidth;
      currentPos.current = targetPos;
      Animated.spring(indicatorAnim, {
        toValue: targetPos,
        friction: 8,
        tension: 120,
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
      tension: 120,
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
        dragStartPos.current = currentPos.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const sw = slotWidthRef.current;
        const maxPos = sw * 3;
        const newPos = Math.max(0, Math.min(maxPos, dragStartPos.current + gestureState.dx));
        indicatorAnim.setValue(newPos);
        currentPos.current = newPos;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        isDragging.current = false;
        const sw = slotWidthRef.current;
        const maxPos = sw * 3;
        const finalPos = Math.max(0, Math.min(maxPos, dragStartPos.current + gestureState.dx));
        let targetSlot = Math.round(finalPos / sw);
        targetSlot = Math.max(0, Math.min(3, targetSlot));

        const newTab = getTabForSlot(targetSlot);
        onTabChangeRef.current(newTab);
        const targetPos = targetSlot * sw;
        currentPos.current = targetPos;
        Animated.spring(indicatorAnim, {
          toValue: targetPos,
          friction: 8,
          tension: 120,
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
    >
      {/* Main Capsule: 4 Navigation Tabs */}
      <View style={[styles.glassContainer, { width: capsuleWidth }]}>
        {/* Draggable Navigation Tabs Area */}
        <View
          style={[styles.tabsArea, { width: tabsWidth }]}
          {...panResponder.panHandlers}
        >
          {/* Sliding Purple Shiny Active Indicator Pill */}
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                width: slotWidth,
                transform: [{ translateX: indicatorAnim }],
              },
            ]}
          >
            <View style={styles.shinyIndicatorInner} />
          </Animated.View>

          {TAB_SLOT_CONFIGS.map((tabConfig) => {
            const isSelected = currentTab === tabConfig.key;
            return (
              <Pressable
                key={tabConfig.key}
                onPress={() => handleTabPress(tabConfig.key)}
                style={styles.tabSlot}
                accessibilityRole="button"
                accessibilityLabel={tabConfig.label}
                accessibilityState={{ selected: isSelected }}
              >
                <Ionicons
                  name={isSelected ? tabConfig.iconActive : tabConfig.iconInactive}
                  size={20}
                  color={isSelected ? colors.textPrimary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isSelected ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                  numberOfLines={1}
                >
                  {tabConfig.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Separate Standalone Circular Floating Add Action Button */}
      <Pressable
        onPress={() => onAddItem?.()}
        style={({ pressed }) => [
          styles.standaloneAddButton,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add New Item"
      >
        <Ionicons
          name="add"
          size={28}
          color={colors.fabPurple}
        />
      </Pressable>
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

        {/* Floating Liquid Glass Navigation Capsule & Separate Add Button */}
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
  },
  content: {
    flex: 1,
  },
  floatingBarWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.60,
        shadowRadius: 22,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  glassContainer: {
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(18, 20, 26, 0.90)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  tabsArea: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    padding: 2,
    zIndex: 1,
  },
  shinyIndicatorInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(123, 97, 255, 0.22)',
    borderWidth: 1.2,
    borderColor: 'rgba(157, 141, 255, 0.55)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.75,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  tabSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: 2,
  },
  tabLabel: {
    fontFamily: typography.fontFamily.sans,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: colors.textSecondary,
    opacity: 0.8,
  },
  standaloneAddButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(18, 20, 26, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(157, 141, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.92 }],
  },
});
