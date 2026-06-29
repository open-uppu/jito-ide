import { useId } from 'react';

import { ModeSelector } from './ModeSelector';
import type { JitoMode } from '../types';

export interface HeroHeaderProps {
  /** Currently selected chat mode. */
  mode: JitoMode;
  /** Called when the user selects a different chat mode. */
  onModeChange: (mode: JitoMode) => void;
  /** Prevents mode changes while the chat panel is busy. */
  disabled?: boolean;
}

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
 * It anchors the brand and active mode controls at the top of the scrolling
 * chat panel. Phase 3.1 keeps using `ModeSelector` inside the mode slot; Phase
 * 3.2 can replace that slot with dedicated `ModePill` components without
 * changing the header's public API.
 */
export function HeroHeader({ mode, onModeChange, disabled = false }: HeroHeaderProps) {
  const logoTitleId = useId();

  return (
    <header className="hero-header">
      <div className="hero-header__brand">
        <JitoLogo titleId={logoTitleId} />
        <p className="hero-header__tagline">Multi-mode AI for your editor</p>
      </div>

      <div className="hero-header__modes">
        <ModeSelector value={mode} onChange={onModeChange} disabled={disabled} />
      </div>
    </header>
  );
}
