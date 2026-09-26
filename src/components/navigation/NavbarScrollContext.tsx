/**
 * NavbarScrollContext
 * Provides scroll-responsive state so bottom navigation bar shrinks smoothly during active scroll
 * and springs back to normal size upon scroll cessation.
 */

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

export interface NavbarScrollContextType {
  navScaleAnim: Animated.Value;
  notifyScrollStart: () => void;
  notifyScrollEnd: () => void;
}

const NavbarScrollContext = createContext<NavbarScrollContextType | null>(null);

export function useNavbarScroll() {
  return useContext(NavbarScrollContext);
}

export function NavbarScrollProvider({ children }: { children: ReactNode }) {
  const navScaleAnim = useRef(new Animated.Value(1)).current;
  const isShrunkRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const notifyScrollStart = useCallback(() => {
    // Only animate shrink once when active scroll initiates
    if (!isShrunkRef.current) {
      isShrunkRef.current = true;
      Animated.timing(navScaleAnim, {
        toValue: 0.84,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    // Reset idle timeout so navbar springs back once user ceases scrolling
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (isShrunkRef.current) {
        isShrunkRef.current = false;
        Animated.spring(navScaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }).start();
      }
    }, 220);
  }, [navScaleAnim]);

  const notifyScrollEnd = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (isShrunkRef.current) {
      isShrunkRef.current = false;
      Animated.spring(navScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [navScaleAnim]);

  return (
    <NavbarScrollContext.Provider
      value={{
        navScaleAnim,
        notifyScrollStart,
        notifyScrollEnd,
      }}
    >
      {children}
    </NavbarScrollContext.Provider>
  );
}
