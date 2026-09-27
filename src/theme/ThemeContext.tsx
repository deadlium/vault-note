/**
 * Theme Context & Provider
 * Supports persistent dark, light, and system-adaptive themes across VaultNote
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkColors, lightColors, ThemeColors, ThemeMode } from './colors';
import { getEnclaveAdapter } from '../core/storage/enclave';

export interface ThemeContextValue {
  themeMode: ThemeMode;
  theme: 'dark' | 'light';
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'vaultnote.pref.theme_mode';

export const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'dark',
  theme: 'dark',
  isDark: true,
  colors: darkColors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  // Load saved preference on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await getEnclaveAdapter().getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'dark' || saved === 'light' || saved === 'system') && isMounted) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch {
        // Fallback to default
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveTheme: 'dark' | 'light' = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'light' ? 'light' : 'dark';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const activeColors = useMemo(() => {
    return effectiveTheme === 'light' ? lightColors : darkColors;
  }, [effectiveTheme]);

  // Synchronize mutable colors singleton for non-hook consumers
  useEffect(() => {
    Object.assign(colors, activeColors);
  }, [activeColors]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await getEnclaveAdapter().setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [effectiveTheme, setThemeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      theme: effectiveTheme,
      isDark: effectiveTheme === 'dark',
      colors: activeColors,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, effectiveTheme, activeColors, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
