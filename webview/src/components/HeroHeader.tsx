import { useId, useRef } from 'react';

import { ModePill } from './ModePill';
import type { JitoMode } from '../types';

export interface HeroHeaderProps {
  /** Currently selected chat mode. */
  mode: JitoMode;
  /** Called when the user selects a different chat mode. */
  onModeChange: (mode: JitoMode) => void;
  /** Prevents mode changes while the chat panel is busy. */
  disabled?: boolean;
}

/**
 * Canonical mode order — drives both the visual layout (left → right) AND
 * the ArrowLeft / ArrowRight / Home / End navigation between pills.
 *
 * Keep this list in lockstep with `MODE_PILL_LABEL` in ModePill.tsx and the
 * `--color-mode-<m>-*` tokens in styles/tokens.css.
 */
const MODE_ORDER: readonly JitoMode[] = [
  'dev',
  'reason',
  'create',
  'audit',
  'universal',
] as const;

interface JitoLogoProps {
  titleId: string;
}

/**
 * Inline jito horizontal logo.
 *
 * The SVG is adapted from `assets/logo.svg` instead of imported so the Vite
 * webview bundle does not need to handle SVG assets. Colors are bound to the
 * design tokens through CSS variables, which lets the mark follow the webview
 * theme without duplicating palette values in React.
 */
function JitoLogo({ titleId }: JitoLogoProps) {
  return (
    <svg
      className="hero-header__logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 60"
      width="200"
      height="60"
      role="img"
      aria-labelledby={titleId}
      focusable="false"
    >
      <title id={titleId}>jito</title>

      <g transform="translate(6 2)" aria-hidden="true">
        <path
          d="M 24 0 L 46 0 L 16 28 L 32 28 L 6 56 L 30 28 L 14 28 Z"
          fill="var(--bg-canvas)"
          stroke="var(--accent-primary)"
          strokeWidth="2"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />

        <rect
          x="44"
          y="0"
          width="4"
          height="4"
          fill="var(--accent-critical)"
        />
        <rect
          x="3"
          y="50"
          width="4"
          height="4"
          fill="var(--accent-primary)"
        />

        <line
          x1="46"
          y1="24"
          x2="54"
          y2="24"
          stroke="var(--accent-primary)"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
        <rect
          x="54"
          y="22"
          width="4"
          height="4"
          fill="var(--accent-primary)"
        />
      </g>

      <g aria-hidden="true">
        <text
          x="68"
          y="42"
          fontFamily="var(--font-ui)"
          fontWeight="700"
          fontSize="32"
          letterSpacing="0"
          fill="var(--fg-primary)"
        >
          jito
        </text>
        <rect
          x="84"
          y="16"
          width="3.5"
          height="3.5"
          fill="var(--accent-primary)"
        />
      </g>
    </svg>
  );
}

/**
 * Chat panel hero header for jito-ide v0.2.0.
 *
 * Phase 3.2 — the mode slot now renders five `<ModePill>` toggles wired into
 * a `role="radiogroup"` with arrow-key navigation. The Phase 1.1
 * `<ModeSelector>` is retained only as a back-compat shim that delegates to
 * `<ModePill>`.
 *
 * Keyboard policy for the radiogroup:
 *   ArrowLeft / ArrowUp    → previous mode (wraps)
 *   ArrowRight / ArrowDown → next mode (wraps)
 *   Home                   → first mode
 *   End                    → last mode
 *   Enter / Space          → activate focused pill (native <button>)
 */
export function HeroHeader({
  mode,
  onModeChange,
  disabled = false,
}: HeroHeaderProps) {
  const logoTitleId = useId();
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * Move the active mode AND focus to the pill at position `target`.
   * Used by the keyboard-nav handler below.
   */
  const focusModeAt = (target: number) => {
    const wrapped = (target + MODE_ORDER.length) % MODE_ORDER.length;
    const next = MODE_ORDER[wrapped];
    onModeChange(next);
    pillRefs.current[wrapped]?.focus();
  };

  return (
    <header className="hero-header">
      <div className="hero-header__brand">
        <JitoLogo titleId={logoTitleId} />
        <p className="hero-header__tagline">Multi-mode AI for your editor</p>
      </div>

      {/*
       * Phase 3.2 — ModePill radiogroup. Composed directly in HeroHeader so
       * the keyboard-nav policy (focus management, roving tabindex, mode
       * change) lives next to the rest of the header state.
       */}
      <div
        role="radiogroup"
        aria-label="Chat mode"
        className="hero-header__modes mode-pill-group"
      >
        {MODE_ORDER.map((m, i) => (
          <ModePill
            key={m}
            mode={m}
            active={mode === m}
            disabled={disabled}
            tabIndex={mode === m ? 0 : -1}
            buttonRef={(el) => {
              pillRefs.current[i] = el;
            }}
            onClick={() => onModeChange(m)}
            onKeyDown={(e) => {
              switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                  e.preventDefault();
                  focusModeAt(i + 1);
                  return;
                case 'ArrowLeft':
                case 'ArrowUp':
                  e.preventDefault();
                  focusModeAt(i - 1);
                  return;
                case 'Home':
                  e.preventDefault();
                  focusModeAt(0);
                  return;
                case 'End':
                  e.preventDefault();
                  focusModeAt(MODE_ORDER.length - 1);
                  return;
                default:
                  return;
              }
            }}
          />
        ))}
      </div>
    </header>
  );
}
