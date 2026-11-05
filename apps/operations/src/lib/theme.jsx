import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

// Kept under its old name so admins keep the theme they chose; the whole portal follows it.
const THEME_STORAGE_KEY = 'everwear_admin_theme';
const TOGGLE_EVENT = 'everwear:toggle-theme';

/** Flips light and dark from anywhere in the portal (the areas' theme buttons). */
export function toggleThemeGlobal() {
  window.dispatchEvent(new Event(TOGGLE_EVENT));
}

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    } catch {
      return 'system';
    }
  });

  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for operating system theme change
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDark]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme(systemDark ? 'light' : 'dark');
    }
  };

  // The areas' theme buttons sit outside React context plumbing: they send an event.
  const toggleRef = React.useRef(toggleTheme);
  toggleRef.current = toggleTheme;
  useEffect(() => {
    const onToggle = () => toggleRef.current();
    window.addEventListener(TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TOGGLE_EVENT, onToggle);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isDark,
      toggleTheme,
    }),
    [theme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
