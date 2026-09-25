/**
 * Authenticated Vault Tab Layout
 * Obsidian bottom navigation bar with responsive active tabs and glassmorphism styling
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';

export type VaultTab = 'vault' | 'search' | 'totp' | 'generator' | 'settings';

export interface VaultLayoutProps {
  children?: React.ReactNode;
  activeTab?: VaultTab;
  onTabChange?: (tab: VaultTab) => void;
  renderContent?: (tab: VaultTab) => React.ReactNode;
}

interface TabItemConfig {
  key: VaultTab;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIGS: TabItemConfig[] = [
  {
    key: 'vault',
    label: 'Vault',
    iconActive: 'shield-checkmark',
    iconInactive: 'shield-checkmark-outline',
  },
  {
    key: 'totp',
    label: 'TOTP',
    iconActive: 'qr-code',
    iconInactive: 'qr-code-outline',
  },
  {
    key: 'generator',
    label: 'Generator',
    iconActive: 'key',
    iconInactive: 'key-outline',
  },
  {
    key: 'settings',
    label: 'Settings',
    iconActive: 'settings',
    iconInactive: 'settings-outline',
  },
];

export default function VaultTabLayout({
  children,
  activeTab: externalTab,
  onTabChange: externalTabChange,
  renderContent,
}: VaultLayoutProps) {
  const [internalTab, setInternalTab] = useState<VaultTab>('vault');
  const insets = useSafeAreaInsets();

  const currentTab = externalTab ?? internalTab;

  const handleTabPress = (tab: VaultTab) => {
    if (externalTabChange) {
      externalTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Screen Content */}
      <View style={styles.content}>
        {renderContent ? renderContent(currentTab) : children}
      </View>

      {/* Obsidian Bottom Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.tabBarInner}>
          {TAB_CONFIGS.map((tab) => {
            const isActive = currentTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && styles.tabButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isActive ? tab.iconActive : tab.iconInactive}
                    size={22}
                    color={isActive ? colors.primaryLight : colors.textMuted}
                  />
                  {isActive && <View style={styles.activeDot} />}
                </View>

                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
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
  tabBar: {
    backgroundColor: '#0D0E15',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    position: 'absolute',
    bottom: -3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
  tabLabelInactive: {
    color: colors.textMuted,
  },
});
