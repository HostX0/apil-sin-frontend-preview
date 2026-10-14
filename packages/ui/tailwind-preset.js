/**
 * Apilsin design tokens — the single source of visual truth.
 *
 * Colours are declared as CSS custom properties in globals.css and referenced
 * here, so light/dark theming is a variable swap rather than a second palette.
 * No component may introduce a raw hex value; the lint review rejects it.
 *
 * Palette intent: warm neutral surfaces, forest and mint, flat borders and
 * readable controls. Status colours remain distinct from the brand.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--color-surface-sunken) / <alpha-value>)',

        // Text
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--color-ink-muted) / <alpha-value>)',
        'ink-subtle': 'rgb(var(--color-ink-subtle) / <alpha-value>)',
        'ink-inverse': 'rgb(var(--color-ink-inverse) / <alpha-value>)',

        // Lines
        line: 'rgb(var(--color-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--color-line-strong) / <alpha-value>)',

        // Brand — forest and mint, with explicit ink for filled controls.
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          hover: 'rgb(var(--color-brand-hover) / <alpha-value>)',
          subtle: 'rgb(var(--color-brand-subtle) / <alpha-value>)',
          'subtle-hover': 'rgb(var(--color-brand-subtle-hover) / <alpha-value>)',
          ink: 'rgb(var(--color-brand-ink) / <alpha-value>)',
          solid: 'rgb(var(--color-brand-solid) / <alpha-value>)',
          'solid-ink': 'rgb(var(--color-brand-solid-ink) / <alpha-value>)',
        },
        scrim: 'rgb(var(--color-scrim) / <alpha-value>)',
        illustration: 'rgb(var(--color-illustration) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          ink: 'rgb(var(--color-accent-ink) / <alpha-value>)',
        },

        // Stable editorial palette for the public company website. Unlike the
        // application brand token, these remain stable in both themes.
        'landing-forest': 'rgb(var(--color-landing-navy) / <alpha-value>)',
        'landing-forest-soft': 'rgb(var(--color-landing-navy-soft) / <alpha-value>)',
        'landing-mint': 'rgb(var(--color-landing-mint) / <alpha-value>)',
        'landing-navy': 'rgb(var(--color-landing-navy) / <alpha-value>)',
        'landing-navy-soft': 'rgb(var(--color-landing-navy-soft) / <alpha-value>)',
        'landing-brass': 'rgb(var(--color-landing-brass) / <alpha-value>)',
        'landing-gold': 'rgb(var(--color-landing-gold) / <alpha-value>)',
        'landing-gold-soft': 'rgb(var(--color-landing-gold-soft) / <alpha-value>)',

        // Status
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          subtle: 'rgb(var(--color-success-subtle) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          subtle: 'rgb(var(--color-warning-subtle) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          subtle: 'rgb(var(--color-danger-subtle) / <alpha-value>)',
          hover: 'rgb(var(--color-danger-hover) / <alpha-value>)',
          ink: 'rgb(var(--color-danger-ink) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--color-info) / <alpha-value>)',
          subtle: 'rgb(var(--color-info-subtle) / <alpha-value>)',
        },

        /**
         * Calendar event colours — a contract fixed by the brief:
         * blue = hearing, green = appointment, orange = deadline,
         * purple = reminder, red = urgent task.
         */
        event: {
          blue: 'rgb(var(--color-event-blue) / <alpha-value>)',
          green: 'rgb(var(--color-event-green) / <alpha-value>)',
          orange: 'rgb(var(--color-event-orange) / <alpha-value>)',
          purple: 'rgb(var(--color-event-purple) / <alpha-value>)',
          red: 'rgb(var(--color-event-red) / <alpha-value>)',
        },
      },

      fontFamily: {
        sans: ['var(--font-arabic)', 'Segoe UI', 'Tahoma', 'sans-serif'],
        display: ['var(--font-arabic-display)', 'var(--font-arabic)', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Arabic script sits lower and needs more leading than Latin at the same
        // size; these line-heights are tuned for Arabic, not inherited from a
        // Latin-first scale.
        xs: ['0.75rem', { lineHeight: '1.4rem' }],
        sm: ['0.8125rem', { lineHeight: '1.5rem' }],
        base: ['0.9375rem', { lineHeight: '1.75rem' }],
        lg: ['1.0625rem', { lineHeight: '1.85rem' }],
        xl: ['1.25rem', { lineHeight: '2rem' }],
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.5rem' }],
      },

      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '0.75rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },

      boxShadow: {
        // Deliberately restrained. Depth comes from surface and border, not blur.
        xs: '0 1px 2px rgb(var(--color-shadow) / 0.025)',
        sm: '0 1px 3px rgb(var(--color-shadow) / 0.04)',
        DEFAULT: '0 2px 6px rgb(var(--color-shadow) / 0.05)',
        lg: '0 4px 12px rgb(var(--color-shadow) / 0.08)',
        nav: '0 -1px 4px rgb(var(--color-shadow) / 0.04)',
      },

      spacing: {
        // Safe areas for iOS standalone PWA — the home indicator overlaps the
        // bottom navigation without these.
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        nav: '4.25rem',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'sheet-in': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'sheet-in': 'sheet-in 250ms cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
