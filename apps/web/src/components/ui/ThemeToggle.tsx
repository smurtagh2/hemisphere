'use client';

/**
 * ThemeToggle Component
 *
 * A simple icon button that toggles between light and dark themes.
 * Uses CSS custom properties from the design token system — no Tailwind.
 */

import React from 'react';
import { useTheme } from '@/lib/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--accent-primary)',
        borderRadius: 'var(--radius-full)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-body)',
        transition: 'background-color var(--duration-short) var(--ease), color var(--duration-short) var(--ease)',
        lineHeight: 1,
      }}
    >
      <span aria-hidden="true">{isLight ? '🌙' : '☀️'}</span>
      <span>{isLight ? 'Dark' : 'Light'}</span>
    </button>
  );
}
