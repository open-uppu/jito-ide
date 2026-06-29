/**
 * ModeSelector — DEPRECATED (Phase 3.2 → ModePill).
 *
 * @file        webview/src/components/ModeSelector.tsx
 * @phase       v0.2.0 Phase 3.2 (Mode Switcher Sidebar)
 * @status      DEPRECATED — kept as a thin back-compat wrapper around
 *              `<ModePill>`. New code should compose `<ModePill>` directly
 *              inside a `role="radiogroup"` wrapper (see
 *              webview/src/components/HeroHeader.tsx for the canonical
 *              pattern used in the chat header).
 *
 * Why it changed:
 *   The Phase 1.1 `ModeSelector` rendered five generic buttons styled by a
 *   single `.mode-selector__btn` class. Phase 3.2 introduces per-mode
 *   color coding, hover lifts, filled-with-glow active states, and a
 *   keyboard-accessible radiogroup — all owned by `<ModePill>`.
 *
 * What's kept:
 *   - Same `Props { value, onChange, disabled }` interface.
 *   - Same `role="radiogroup"` and `aria-label="Chat mode"` outer wrapper.
 *   - Same five-mode order.
 *
 * What's new (visible only if you keep importing this):
 *   - One console.warn per process (dev-friendly) signaling the deprecation.
 *   - All visual styling and key handling now flows from ModePill, so the
 *     rendered DOM is identical to a hand-rolled `<ModePill>` group.
 *
 * @example  (preferred, post-Phase-3.2 pattern)
 *   import { ModePill } from './ModePill';
 *
 *   <div role="radiogroup" aria-label="Chat mode" className="mode-pill-group">
 *     {MODES.map((m, i) => (
 *       <ModePill
 *         key={m}
 *         mode={m}
 *         active={value === m}
 *         disabled={busy}
 *         tabIndex={value === m ? 0 : -1}
 *         onClick={() => onChange(m)}
 *         onKeyDown={...}
 *         buttonRef={...}
 *       />
 *     ))}
 *   </div>
 */

import { useRef } from 'react';
import type { JitoMode } from '../types';
import { ModePill } from './ModePill';

interface Props {
  value: JitoMode;
  onChange: (mode: JitoMode) => void;
  disabled: boolean;
}

/** Canonical mode order — drives arrow-key navigation. */
const MODE_ORDER: JitoMode[] = [
  'dev',
  'reason',
  'create',
  'audit',
  'universal',
];

/**
 * Module-scoped flag so the deprecation warning fires once per process,
 * not once per render (keeps the console clean even under React strict-mode
 * double-renders in development).
 */
let deprecationWarned = false;
function warnDeprecatedOnce(): void {
  if (deprecationWarned) return;
  deprecationWarned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[jito-ide] <ModeSelector> is deprecated as of v0.2.0 Phase 3.2. ' +
      'Compose <ModePill> directly inside a role="radiogroup" wrapper. ' +
      'See webview/src/components/HeroHeader.tsx for the canonical pattern.',
  );
}

/**
 * Back-compat wrapper. Renders the new <ModePill>-driven radiogroup so any
 * legacy callers still get a working mode switcher with the right visual
 * states and keyboard navigation.
 */
export function ModeSelector({ value, onChange, disabled }: Props) {
  warnDeprecatedOnce();

  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div
      role="radiogroup"
      aria-label="Chat mode"
      className="mode-pill-group mode-pill-group--legacy"
    >
      {MODE_ORDER.map((m, i) => (
        <ModePill
          key={m}
          mode={m}
          active={value === m}
          disabled={disabled}
          tabIndex={value === m ? 0 : -1}
          onClick={() => onChange(m)}
          buttonRef={(el) => {
            refs.current[i] = el;
          }}
          onKeyDown={(e) => {
            switch (e.key) {
              case 'ArrowRight':
              case 'ArrowDown': {
                e.preventDefault();
                const next = (i + 1) % MODE_ORDER.length;
                onChange(MODE_ORDER[next]);
                refs.current[next]?.focus();
                return;
              }
              case 'ArrowLeft':
              case 'ArrowUp': {
                e.preventDefault();
                const prev = (i - 1 + MODE_ORDER.length) % MODE_ORDER.length;
                onChange(MODE_ORDER[prev]);
                refs.current[prev]?.focus();
                return;
              }
              case 'Home': {
                e.preventDefault();
                onChange(MODE_ORDER[0]);
                refs.current[0]?.focus();
                return;
              }
              case 'End': {
                e.preventDefault();
                const last = MODE_ORDER.length - 1;
                onChange(MODE_ORDER[last]);
                refs.current[last]?.focus();
                return;
              }
              default:
                return;
            }
          }}
        />
      ))}
    </div>
  );
}
