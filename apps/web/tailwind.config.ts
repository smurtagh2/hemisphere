import type { Config } from 'tailwindcss';

/**
 * Hemisphere Tailwind Configuration
 *
 * Integrates stage-aware design tokens from tokens.css with Tailwind utilities.
 * Supports three learning stages: Encounter, Analysis, Return
 *
 * Based on: docs/design/04-ui-ux-design.md
 */

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neutral colors
        neutral: {
          white: 'var(--neutral-white)',
          black: 'var(--neutral-black)',
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
        },

        // Semantic colors
        success: 'var(--semantic-success)',
        warning: 'var(--semantic-warning)',
        error: 'var(--semantic-error)',
        info: 'var(--semantic-info)',

        // Stage-aware dynamic colors
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          tertiary: 'var(--accent-tertiary)',
        },

        // Encounter mode colors
        encounter: {
          bg: {
            primary: 'var(--encounter-bg-primary)',
            secondary: 'var(--encounter-bg-secondary)',
            light: 'var(--encounter-bg-light)',
            'light-secondary': 'var(--encounter-bg-light-secondary)',
          },
          accent: {
            primary: 'var(--encounter-accent-primary)',
            secondary: 'var(--encounter-accent-secondary)',
            tertiary: 'var(--encounter-accent-tertiary)',
          },
          text: {
            primary: 'var(--encounter-text-primary)',
            'primary-light': 'var(--encounter-text-primary-light)',
            secondary: 'var(--encounter-text-secondary)',
            'secondary-light': 'var(--encounter-text-secondary-light)',
          },
        },

        // Analysis mode colors
        analysis: {
          bg: {
            primary: 'var(--analysis-bg-primary)',
            secondary: 'var(--analysis-bg-secondary)',
            light: 'var(--analysis-bg-light)',
            'light-secondary': 'var(--analysis-bg-light-secondary)',
          },
          accent: {
            primary: 'var(--analysis-accent-primary)',
            secondary: 'var(--analysis-accent-secondary)',
            tertiary: 'var(--analysis-accent-tertiary)',
          },
          text: {
            primary: 'var(--analysis-text-primary)',
            'primary-light': 'var(--analysis-text-primary-light)',
            secondary: 'var(--analysis-text-secondary)',
            'secondary-light': 'var(--analysis-text-secondary-light)',
          },
          correct: 'var(--analysis-correct)',
          incorrect: 'var(--analysis-incorrect)',
          partial: 'var(--analysis-partial)',
        },

        // Return mode colors
        return: {
          bg: {
            primary: 'var(--return-bg-primary)',
            secondary: 'var(--return-bg-secondary)',
            light: 'var(--return-bg-light)',
            'light-secondary': 'var(--return-bg-light-secondary)',
          },
          accent: {
            primary: 'var(--return-accent-primary)',
            secondary: 'var(--return-accent-secondary)',
            tertiary: 'var(--return-accent-tertiary)',
          },
          text: {
            primary: 'var(--return-text-primary)',
            'primary-light': 'var(--return-text-primary-light)',
            secondary: 'var(--return-text-secondary)',
            'secondary-light': 'var(--return-text-secondary-light)',
          },
        },
      },

      fontFamily: {
        encounter: 'var(--font-encounter)',
        analysis: 'var(--font-analysis)',
        mono: 'var(--font-mono)',
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },

      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        md: 'var(--text-md)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
      },

      lineHeight: {
        tight: 'var(--leading-tight)',
        snug: 'var(--leading-snug)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
        loose: 'var(--leading-loose)',
        'extra-loose': 'var(--leading-extra-loose)',
        encounter: 'var(--leading-encounter)',
      },

      fontWeight: {
        regular: 'var(--font-regular)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
      },

      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
        card: 'var(--radius-card)',
        element: 'var(--radius-element)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        'encounter-glow': 'var(--shadow-encounter-glow)',
        'return-glow': 'var(--shadow-return-glow)',
        glow: 'var(--shadow-glow)',
      },

      transitionDuration: {
        short: 'var(--duration-short)',
        medium: 'var(--duration-medium)',
        long: 'var(--duration-long)',
        'stage-transition': 'var(--duration-stage-transition)',
        'stage-transition-long': 'var(--duration-stage-transition-long)',
      },

      transitionTimingFunction: {
        encounter: 'var(--ease-encounter)',
        analysis: 'var(--ease-analysis)',
        return: 'var(--ease-return)',
        stage: 'var(--ease)',
      },

      animation: {
        'breathing': 'breathing 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out',
      },

      keyframes: {
        breathing: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.005)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { opacity: '0.5' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.5' },
        },
      },

      // Layout grid breakpoints (mobile-first)
      screens: {
        xs: '375px',
        sm: '390px',
        md: '768px',
        lg: '1024px',
        xl: '1440px',
      },

      // Max widths for content
      maxWidth: {
        'content-reading': '720px',
        'content-dashboard': '960px',
        'content-dashboard-lg': '1120px',
      },
    },
  },
  plugins: [
    // Custom plugin for stage-aware utilities
    function ({ addUtilities }: { addUtilities: any }) {
      const stageUtilities = {
        '.stage-transition': {
          transition:
            'background-color var(--duration-stage-transition) var(--ease-encounter), ' +
            'color var(--duration-stage-transition) var(--ease-encounter), ' +
            'font-family var(--duration-stage-transition) var(--ease-encounter)',
        },
        '.spacing-multiplier-encounter': {
          '--spacing-multiplier': '1.25',
        },
        '.spacing-multiplier-analysis': {
          '--spacing-multiplier': '1',
        },
        '.spacing-multiplier-return': {
          '--spacing-multiplier': '1.35',
        },
      };
      addUtilities(stageUtilities);
    },
  ],
};

export default config;
