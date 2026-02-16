import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, ThemeColors } from '../constants/colors';

type ThemeContextType = {
  isDark: boolean;
  colors: ThemeColors;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('smartcrop_dark_mode');
        if (stored !== null) setIsDark(stored === 'true');
      } catch {
        // Ignore preference load errors.
      }
    };
    load();
  }, []);

  const setDarkMode = async (value: boolean) => {
    setIsDark(value);
    try {
      await AsyncStorage.setItem('smartcrop_dark_mode', String(value));
    } catch {
      // Ignore preference save errors.
    }
  };

  const colors = useMemo<ThemeColors>(() => (isDark ? DARK_COLORS : LIGHT_COLORS), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, colors, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
