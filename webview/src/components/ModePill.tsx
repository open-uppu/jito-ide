/**
 * ModePill — single chat-mode toggle (5-color-coded, animated)
 *
 * @file        webview/src/components/ModePill.tsx
 * @phase       v0.2.0 Phase 3.2 (Mode Switcher Sidebar)
 * @status      NEW — replaces the per-mode button in ModeSelector's row with
 *              a dedicated pill that owns its visual states per mode.
 *
 * A pill is a single toggleable button. It does NOT know about its siblings.
 * The PARENT is responsible for the surrounding `role="radiogroup"` wrapper,
 * the active-mode state (`active={value === mode}`), the roving tabindex,
 * and the arrow-key / Home / End / Enter / Space navigation. ModePill just
 * exposes the right props so the parent can wire that up cleanly:
 *
 *   - `mode`       (JitoMode)         → picks the icon + color tokens
 *   - `active`     (boolean)          → toggles the "filled + glow" look
 *   - `onClick`    () => void         → fires on click AND on Enter / Space
 *                                         (native <button> semantics)
 *   - `disabled`   (boolean)          → dims + blocks interaction
 *   - `tabIndex`   (number)           → roving tabindex from the parent
 *   - `onKeyDown`  (handler)          → forward arrow / Home / End keys
 *   - `buttonRef`  (ref callback)     → so the parent can call .focus()
 *
 * Visual states (driven by the .mode-pill class + inline CSS custom props):
 *
 *   Inactive  —  outline border, mode-color text, transparent bg
 *   Hover     —  scale(1.05), subtle mode-color bg tint (120ms transition)
 *   Active    —  filled with mode-color bg, on-accent fg, mode-tinted glow
 *   Focus     —  cyan ring outline + tinted glow (a11y / keyboard nav)
 *   Disabled  —  opacity 0.4, no transforms
 *
 * Theming: per-mode colors are read from `--color-mode-<m>-{primary,fg,bg}`
 * (defined in webview/src/styles/tokens.css). To make a single .mode-pill
 * CSS class work for all 5 modes without authoring 5 separate classes, this
 * component binds three inline custom properties:
 *
 *   --pill-color       → var(--color-mode-<m>-primary)   (border + text)
 *   --pill-color-bg    → var(--color-mode-<m>-bg)        (hover tint + glow)
 *   --pill-color-fg    → var(--color-mode-<m>-fg)        (reserved future)
 *
 * Icons use `currentColor` and inherit the parent's text color automatically,
 * so no per-mode icon class is needed.
 *
 * a11y: `role="radio"`, `aria-checked`, `aria-label`, and a transparent
 * <span> around the icon (decorative). Enter / Space activate through the
 * native <button>. Arrow keys are forwarded to the parent via `onKeyDown`.
 *
 * @example
 *   const order: JitoMode[] = ['dev','reason','create','audit','universal'];
 *   const refs = useRef<(HTMLButtonElement | null)[]>([]);
 *
 *   <div role="radiogroup" aria-label="Chat mode" className="mode-pill-group">
 *     {order.map((m, i) => (
 *       <ModePill
 *         key={m}
 *         mode={m}
 *         active={value === m}
 *         tabIndex={value === m ? 0 : -1}
 *         onClick={() => onChange(m)}
 *         buttonRef={(el) => { refs.current[i] = el; }}
 *         onKeyDown={(e) => {
 *           if (e.key === 'ArrowRight') { focusModeAt(i + 1); e.preventDefault(); }
 *           if (e.key === 'ArrowLeft')  { focusModeAt(i - 1); e.preventDefault(); }
 *           if (e.key === 'Home')       { focusModeAt(0);       e.preventDefault(); }
 *           if (e.key === 'End')        { focusModeAt(order.length - 1); e.preventDefault(); }
 *         }}
 *       />
 *     ))}
 *   </div>
 */

import {
  forwardRef,
  type CSSProperties,
  type KeyboardEvent,
  type SVGProps,
  type ComponentType,
} from 'react';
import type { JitoMode } from '../types';
import { ModeIcons } from './icons';

/** Human-readable label per mode. Used for aria-label, title, and text. */
export const MODE_PILL_LABEL: Record<JitoMode, string> = {
  dev: 'Dev',
  reason: 'Reason',
  create: 'Create',
  audit: 'Audit',
  universal: 'Universal',
};

export interface ModePillProps {
  /** Which chat mode this pill represents (color-codes + picks the icon). */
  mode: JitoMode;
  /** Whether this pill is the currently selected mode. */
  active: boolean;
  /** Click handler. Also fires on Enter / Space (native <button> behavior). */
  onClick: () => void;
  /** Disabled state dims the pill to opacity 0.4 and blocks interaction. */
  disabled?: boolean;
  /** Roving tabindex — parent passes 0 on active pill, -1 on others. */
  tabIndex?: number;
  /** Forwarded key-down handler so parent can do arrow / Home / End nav. */
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  /** Ref callback so parent can .focus() during keyboard navigation. */
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

export const ModePill = forwardRef<HTMLButtonElement, ModePillProps>(
  function ModePill(props, _ref) {
    const {
      mode,
      active,
      onClick,
      disabled = false,
      tabIndex,
      onKeyDown,
      buttonRef,
    } = props;

    const Icon = ModeIcons[
      mode
    ] as ComponentType<SVGProps<SVGSVGElement>>;
    const label = MODE_PILL_LABEL[mode];

    // Per-mode color binding via CSS custom properties so the same CSS class
    // works for all 5 modes without authoring 5 separate CSS classes.
    const style = {
      '--pill-color': `var(--color-mode-${mode}-primary)`,
      '--pill-color-bg': `var(--color-mode-${mode}-bg)`,
      '--pill-color-fg': `var(--color-mode-${mode}-fg)`,
    } as CSSProperties;

    return (
      <button
        ref={buttonRef}
        type="button"
        role="radio"
        aria-checked={active}
        aria-label={label}
        title={label}
        disabled={disabled}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={`mode-pill${active ? ' mode-pill--active' : ''}`}
        style={style}
      >
        <span className="mode-pill__icon" aria-hidden="true">
          <Icon />
        </span>
        <span className="mode-pill__label">{label}</span>
      </button>
    );
  },
);

export default ModePill;
