'use client';

/**
 * useTheme Hook
 *
 * Manages the light/dark theme preference for the Hemisphere app.
 * Persists the user's choice in localStorage and applies it via
 * the data-theme attribute on <body>.
 */

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('hemisphere-theme') as Theme) ?? 'dark';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('hemisphere-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggle };
}
