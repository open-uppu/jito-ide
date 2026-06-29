/** @type {import('tailwindcss').Config} */
//
// jito-ide v0.2.0 — Tailwind theme bridge (Phase 1.3)
//
// Three concerns exposed as Tailwind utilities, all bound to CSS variables
// so the runtime palette stays reactive to <html data-mode="...">:
//
//   1. brand  → top-level brand colors (bg-canvas, text-cyan, …)
//   2. mode   → five chat-mode palettes (text-mode-dev, bg-mode-create, …)
//   3. fg/bg/border → semantic role aliases (text-fg-primary, …)
//
// Plus sizing, type, motion, and animation extensions.
//
// Spec: Phase 1.3 — Tailwind Theme Config (consume tokens).
// Tokens: webview/src/styles/tokens.css (Layer 1 / 2 / 3).
//
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {
    extend: {
      // ---- Colors -------------------------------------------------------
      //
      // The "jito" namespace is kept as an alias for backward compatibility
      // with the Phase 1.1 component polish. New code should prefer the
      // flat top-level keys (bg-canvas, text-cyan, …).
      //
      colors: {
        // Brand surfaces (Layer 2 — semantic backgrounds)
        canvas:  'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        card:    'var(--bg-card)',
        raised:  'var(--bg-raised)',
        overlay: 'var(--bg-overlay)',

        // Brand primitives (Layer 1 — exposed for one-off use)
        cyan:        'var(--color-jito-cyan)',
        'cyan-dim':  'var(--color-jito-cyan-dim)',
        magenta:     'var(--color-jito-magenta)',
        'magenta-dim':'var(--color-jito-magenta-dim)',

        // Foregrounds
        'fg-primary':   'var(--fg-primary)',
        'fg-secondary': 'var(--fg-secondary)',
        'fg-tertiary':  'var(--fg-tertiary)',
        'fg-disabled':  'var(--fg-disabled)',
        'fg-on-accent': 'var(--fg-on-accent)',
        'fg-on-danger': 'var(--fg-on-danger)',

        // Borders
        border: {
          subtle:  'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
          accent:  'var(--border-accent)',
        },

        // Accent roles
        accent: {
          primary:       'var(--accent-primary)',
          'primary-dim': 'var(--accent-primary-dim)',
          critical:      'var(--accent-critical)',
          'critical-dim':'var(--accent-critical-dim)',
        },

        // Five chat-mode palettes (Layer 3).
        // `DEFAULT` resolves to the primary stop so `bg-mode-dev`,
        // `text-mode-dev`, `border-mode-dev` all work out of the box.
        // Nested keys remain available for explicit access to fg / bg.
        mode: {
          dev:       { DEFAULT: 'var(--color-mode-dev-primary)',       primary: 'var(--color-mode-dev-primary)',       fg: 'var(--color-mode-dev-fg)',       bg: 'var(--color-mode-dev-bg)' },
          reason:    { DEFAULT: 'var(--color-mode-reason-primary)',    primary: 'var(--color-mode-reason-primary)',    fg: 'var(--color-mode-reason-fg)',    bg: 'var(--color-mode-reason-bg)' },
          create:    { DEFAULT: 'var(--color-mode-create-primary)',    primary: 'var(--color-mode-create-primary)',    fg: 'var(--color-mode-create-fg)',    bg: 'var(--color-mode-create-bg)' },
          audit:     { DEFAULT: 'var(--color-mode-audit-primary)',     primary: 'var(--color-mode-audit-primary)',     fg: 'var(--color-mode-audit-fg)',     bg: 'var(--color-mode-audit-bg)' },
          universal: { DEFAULT: 'var(--color-mode-universal-primary)', primary: 'var(--color-mode-universal-primary)', fg: 'var(--color-mode-universal-fg)', bg: 'var(--color-mode-universal-bg)' },
        },

        // Backward-compatible alias (Phase 1.1 used bg-jito-canvas).
        // New code should prefer bg-canvas / text-cyan / … directly.
        jito: {
          canvas:  'var(--bg-canvas)',
          surface: 'var(--bg-surface)',
          card:    'var(--bg-card)',
          raised:  'var(--bg-raised)',
          cyan:       'var(--color-jito-cyan)',
          'cyan-dim': 'var(--color-jito-cyan-dim)',
          magenta:    'var(--color-jito-magenta)',
          'fg-primary':   'var(--fg-primary)',
          'fg-secondary': 'var(--fg-secondary)',
          'fg-tertiary':  'var(--fg-tertiary)',
          'fg-on-accent': 'var(--fg-on-accent)',
          'fg-on-danger': 'var(--fg-on-danger)',
        },
      },

      // ---- Type scale ----------------------------------------------------
      fontFamily: {
        sans:    'var(--font-ui)',
        mono:    'var(--font-mono)',
        display: 'var(--font-ui)',
      },
      fontSize: {
        xs:    ['var(--text-xs)',   { lineHeight: 'var(--leading-snug)' }],
        sm:    ['var(--text-sm)',   { lineHeight: 'var(--leading-snug)' }],
        base:  ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        md:    ['var(--text-md)',   { lineHeight: 'var(--leading-normal)' }],
        lg:    ['var(--text-lg)',   { lineHeight: 'var(--leading-tight)' }],
        xl:    ['var(--text-xl)',   { lineHeight: 'var(--leading-tight)' }],
        '2xl': ['var(--text-2xl)',  { lineHeight: 'var(--leading-tight)' }],
      },
      fontWeight: {
        regular:  'var(--weight-regular)',
        medium:   'var(--weight-medium)',
        semibold: 'var(--weight-semibold)',
        bold:     'var(--weight-bold)',
      },
      letterSpacing: {
        tight:  'var(--tracking-tight)',
        normal: 'var(--tracking-normal)',
        wide:   'var(--tracking-wide)',
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

      // ---- Radii --------------------------------------------------------
      //
      // Fine-grained radii (none/xs/sm/md/lg) stay sharp for fine UI.
      // Phase 1.3 introduces SEMANTIC radii for larger surfaces:
      //   rounded-panel  → 8px   (panels, mode-selector shell)
      //   rounded-card   → 12px  (message bubbles, dialog surfaces)
      //   rounded-pill   → 999px (mode chips, badges)
      //
      borderRadius: {
        none:  'var(--radius-none)',
        xs:    'var(--radius-xs)',
        sm:    'var(--radius-sm)',
        md:    'var(--radius-md)',
        lg:    'var(--radius-lg)',
        panel: 'var(--radius-panel)',  // 8px  — Phase 1.3
        card:  'var(--radius-card)',   // 12px — Phase 1.3
        pill:  'var(--radius-pill)',   // 999px
      },

      // ---- Strokes -------------------------------------------------------
      borderWidth: {
        0: '0',
        1: 'var(--stroke-1)',
        2: 'var(--stroke-2)',
      },

      // ---- Shadows (incl. brand glows) ----------------------------------
      boxShadow: {
        sm:            'var(--shadow-sm)',
        md:            'var(--shadow-md)',
        lg:            'var(--shadow-lg)',
        'glow-cyan':    'var(--shadow-glow-cyan)',
        'glow-magenta': 'var(--shadow-glow-magenta)',
        focus:         'var(--state-focus-ring)',
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

      // ---- Animations (Phase 1.3) ---------------------------------------
      //
      // All three use 60–120ms ease-out per the Phase 1.3 spec.
      // They compose on top of the existing Tailwind `animate-*` utilities
      // so consumers can layer them via `class="animate-fade-in slide-up"`.
      //
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1',   boxShadow: '0 0 4px var(--color-jito-cyan-glow)' },
          '50%':      { opacity: '0.65', boxShadow: '0 0 16px var(--color-jito-cyan-glow)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1200ms var(--ease-standard) infinite',
        'slide-up':   'slide-up    120ms var(--ease-emphasized)  both',
        'fade-in':    'fade-in      80ms var(--ease-standard)    both',
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