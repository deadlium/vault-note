import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, ThemeProvider, useTheme } from '../theme';
import { PrivacyShield } from '../components/security/PrivacyShield';

function RootLayoutContent({ children }: { children?: React.ReactNode }) {
  const { isDark, colors: activeColors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: activeColors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
      <PrivacyShield />
    </View>
  );
}

export default function RootLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent>{children}</RootLayoutContent>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
