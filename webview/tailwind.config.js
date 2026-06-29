/** @type {import('tailwindcss').Config} */
//
// jito-ide v0.2.0 Tailwind bridge
// ---------------------------------------------------------------------------
// Layer 1 (primitives): raw palette  --color-*
// Layer 2 (semantic):   role tokens   --bg-*, --fg-*, --accent-*, --border-*
// Layer 3 (mode):       mode tokens   --color-mode-<m>-{primary,fg,bg}
// All resolved via var(...) so they update reactively when :root changes.
// ---------------------------------------------------------------------------
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ---- Surfaces ------------------------------------------------------
      colors: {
        // Semantic backgrounds (Layer 2)
        jito: {
          canvas:  'var(--bg-canvas)',
          surface: 'var(--bg-surface)',
          card:    'var(--bg-card)',
          raised:  'var(--bg-raised)',

          // Brand primitives (Layer 1, exposed for one-off use)
          cyan:       'var(--color-jito-cyan)',
          'cyan-dim': 'var(--color-jito-cyan-dim)',
          magenta:    'var(--color-jito-magenta)',

          // Foregrounds
          'fg-primary':   'var(--fg-primary)',
          'fg-secondary': 'var(--fg-secondary)',
          'fg-tertiary':  'var(--fg-tertiary)',
          'fg-disabled':  'var(--fg-disabled)',
          'fg-on-accent': 'var(--fg-on-accent)',
          'fg-on-danger': 'var(--fg-on-danger)',
        },

        // Borders (Layer 2)
        border: {
          subtle:  'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
          accent:  'var(--border-accent)',
        },

        // Accent roles (Layer 2)
        accent: {
          primary:      'var(--accent-primary)',
          'primary-dim':'var(--accent-primary-dim)',
          critical:     'var(--accent-critical)',
          'critical-dim':'var(--accent-critical-dim)',
        },

        // Mode palettes (Layer 3) — bound at runtime by data-mode on <html>
        mode: {
          dev: {
            primary: 'var(--color-mode-dev-primary)',
            fg:      'var(--color-mode-dev-fg)',
            bg:      'var(--color-mode-dev-bg)',
          },
          reason: {
            primary: 'var(--color-mode-reason-primary)',
            fg:      'var(--color-mode-reason-fg)',
            bg:      'var(--color-mode-reason-bg)',
          },
          create: {
            primary: 'var(--color-mode-create-primary)',
            fg:      'var(--color-mode-create-fg)',
            bg:      'var(--color-mode-create-bg)',
          },
          audit: {
            primary: 'var(--color-mode-audit-primary)',
            fg:      'var(--color-mode-audit-fg)',
            bg:      'var(--color-mode-audit-bg)',
          },
          universal: {
            primary: 'var(--color-mode-universal-primary)',
            fg:      'var(--color-mode-universal-fg)',
            bg:      'var(--color-mode-universal-bg)',
          },
        },
      },

      // ---- Type scale ----------------------------------------------------
      fontFamily: {
        sans:    'var(--font-sans)',
        mono:    'var(--font-mono)',
        display: 'var(--font-display)',
      },
      fontSize: {
        xs:   ['var(--text-xs)',   { lineHeight: 'var(--leading-snug)' }],
        sm:   ['var(--text-sm)',   { lineHeight: 'var(--leading-snug)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        md:   ['var(--text-md)',   { lineHeight: 'var(--leading-normal)' }],
        lg:   ['var(--text-lg)',   { lineHeight: 'var(--leading-tight)' }],
        xl:   ['var(--text-xl)',   { lineHeight: 'var(--leading-tight)' }],
        '2xl':['var(--text-2xl)',  { lineHeight: 'var(--leading-tight)' }],
      },
      fontWeight: {
        regular:  'var(--weight-regular)',
        medium:   'var(--weight-medium)',
        semibold: 'var(--weight-semibold)',
        bold:     'var(--weight-bold)',
      },
      letterSpacing: {
        tight: 'var(--tracking-tight)',
        normal:'var(--tracking-normal)',
        wide:  'var(--tracking-wide)',
      },
      lineHeight: {
        none:    'var(--leading-none)',
        tight:   'var(--leading-tight)',
        snug:    'var(--leading-snug)',
        normal:  'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
      },

      // ---- Spacing (4px grid) -------------------------------------------
      spacing: {
        0: 'var(--space-0)',
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
      },

      // ---- Radii (sharp / electric) -------------------------------------
      borderRadius: {
        none: 'var(--radius-none)',
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },

      // ---- Strokes -------------------------------------------------------
      borderWidth: {
        0: '0',
        1: 'var(--stroke-1)',
        2: 'var(--stroke-2)',
      },

      // ---- Shadows (incl. brand glows) ----------------------------------
      boxShadow: {
        sm:           'var(--shadow-sm)',
        md:           'var(--shadow-md)',
        lg:           'var(--shadow-lg)',
        'glow-cyan':    'var(--shadow-glow-cyan)',
        'glow-magenta': 'var(--shadow-glow-magenta)',
        focus:        'var(--state-focus-ring)',
      },

      // ---- Motion --------------------------------------------------------
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        standard:   'var(--ease-standard)',
        emphasized: 'var(--ease-emphasized)',
      },

      // ---- Z-index -------------------------------------------------------
      zIndex: {
        base:    'var(--z-base)',
        raised:  'var(--z-raised)',
        sticky:  'var(--z-sticky)',
        overlay: 'var(--z-overlay)',
        modal:   'var(--z-modal)',
      },
    },
  },
  plugins: [],
};