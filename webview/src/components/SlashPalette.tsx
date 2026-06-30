/**
 * jito-ide v0.2.0 — SlashPalette (Phase 4.2)
 * File: webview/src/components/SlashPalette.tsx
 *
 * Floating command palette that sits above the Composer surface. Replaces
 * the small inline palette that lived inside Composer.tsx.
 *
 * Visual layout (always 400px wide, auto-height up to 480px):
 *
 *   ┌──────────────────────────────────────────┐  400 px
 *   │ 🔍 search…                              │  ← input, cyan focus ring
 *   ├────────────────────────┬─────────────────┤
 *   │ CODE                   │  /review  ◀ active
 *   │  🔍 /review    Code    │  Review code…
 *   │  ♻️ /refactor  Code    │  ┌───────────┐
 *   │ REVIEW                 │  │ preview   │
 *   │  🛡️ /security Review  │  │ JSX       │
 *   │ DOC                    │  └───────────┘
 *   │  📝 /doc       Doc     │  example: /review src/auth.ts
 *   │ …                      │
 *   └────────────────────────┴─────────────────┘  max-height 480px
 *
 * Interactions:
 *   - ↑ / ↓           move active item (wraps across list, skips headers)
 *   - Tab             same as ↓ (so the textarea's Tab-focus doesn't escape)
 *   - Enter           invoke the active command
 *   - Escape          close (host decides what "close" means — we just
 *                     call onClose)
 *   - Click outside   close (we register a `pointerdown` listener on
 *                     document and ignore hits inside the palette root)
 *   - Hover           sets activeId so the preview pane tracks the cursor
 *
 * All keystrokes call `stopPropagation()` so the textarea behind the
 * palette never sees them.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  type CommandCategory,
  type SlashCommand,
  CATEGORY_ORDER,
  commands as ALL_COMMANDS,
  filterCommands,
} from '../lib/commands.tsx';

interface Props {
  /** Called when the user picks a command (Enter or click). */
  onSelect: (cmd: SlashCommand) => void;
  /** Called when the user dismisses the palette (Esc / click-outside). */
  onClose: () => void;
  /** Optional anchor ref used to scope click-outside detection. */
  anchorRef?: React.RefObject<HTMLElement>;
}

/* ──────────────────────────────────────────────────────────────────────
 * Group the filtered commands by category for the two-pane render.
 * Categories with zero matches are skipped (not rendered as empty
 * headers).
 * ──────────────────────────────────────────────────────────────────── */
function groupByCategory(
  list: SlashCommand[]
): { category: CommandCategory; items: SlashCommand[] }[] {
  const buckets = new Map<CommandCategory, SlashCommand[]>();
  for (const cmd of list) {
    const arr = buckets.get(cmd.category);
    if (arr) arr.push(cmd);
    else buckets.set(cmd.category, [cmd]);
  }
  return CATEGORY_ORDER.filter((c) => buckets.has(c)).map((c) => ({
    category: c,
    items: buckets.get(c)!,
  }));
}

export function SlashPalette({ onSelect, onClose, anchorRef }: Props) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(
    ALL_COMMANDS[0]?.id ?? null,
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Tracks per-row DOM nodes so we can scroll the active row into view.
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  /* ---- Filtered list + grouped view ---------------------------------- */
  const filtered = useMemo(() => filterCommands(query), [query]);
  const groups = useMemo(() => groupByCategory(filtered), [filtered]);
  const flatIds = useMemo(() => filtered.map((c) => c.id), [filtered]);

  /* ---- Keep activeId valid as the filter narrows --------------------- */
  useEffect(() => {
    if (filtered.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !flatIds.includes(activeId)) {
      // Default to first item in the filtered list.
      setActiveId(filtered[0].id);
    }
  }, [filtered, flatIds, activeId]);

  /* ---- Focus the search input on mount ------------------------------- */
  useLayoutEffect(() => {
    searchRef.current?.focus();
  }, []);

  /* ---- Click-outside closes the palette ------------------------------ */
  useEffect(() => {
    const handler = (ev: PointerEvent | MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const target = ev.target as Node | null;
      if (!target) return;
      if (root.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    // pointerdown fires earlier than mousedown — matches what Composer
    // already does for its inline palette.
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [onClose, anchorRef]);

  /* ---- Scroll active row into view ----------------------------------- */
  useEffect(() => {
    if (!activeId) return;
    const row = rowRefs.current.get(activeId);
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  /* ---- Keyboard navigation ------------------------------------------- */
  const move = useCallback(
    (delta: number) => {
      if (flatIds.length === 0) return;
      const idx = activeId ? flatIds.indexOf(activeId) : 0;
      // Wrap with modulo arithmetic. -1 → last, last+1 → first.
      const next = ((idx + delta) % flatIds.length + flatIds.length) % flatIds.length;
      setActiveId(flatIds[next]);
    },
    [flatIds, activeId],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          move(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          move(-1);
          break;
        case 'Home':
          e.preventDefault();
          e.stopPropagation();
          if (flatIds[0]) setActiveId(flatIds[0]);
          break;
        case 'End':
          e.preventDefault();
          e.stopPropagation();
          if (flatIds.length) setActiveId(flatIds[flatIds.length - 1]);
          break;
        case 'Enter': {
          e.preventDefault();
          e.stopPropagation();
          if (!activeId) return;
          const cmd = ALL_COMMANDS.find((c) => c.id === activeId);
          if (cmd) onSelect(cmd);
          break;
        }
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
        default:
          break;
      }
    },
    [move, activeId, flatIds, onSelect, onClose],
  );

  /* ---- Row hover sets the same activeId ----------------------------- */
  const handleRowHover = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleRowClick = useCallback(
    (cmd: SlashCommand) => () => onSelect(cmd),
    [onSelect],
  );

  /* ---- Stop the textarea's keydown from re-firing ------------------- */
  // We swallow most keys so the textarea behind the palette never sees
  // them. Escape is the one exception — it must bubble up to the palette
  // root so the close-on-Escape handler fires.
  const swallow = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') return; // let Escape bubble to the palette root
      e.stopPropagation();
    },
    [],
  );

  /* ---- Derived: preview for the active row --------------------------- */
  const activeCmd = useMemo(
    () => (activeId ? ALL_COMMANDS.find((c) => c.id === activeId) ?? null : null),
    [activeId],
  );

  const totalCount = ALL_COMMANDS.length;
  const filteredCount = filtered.length;

  return (
    <div
      ref={rootRef}
      className="palette"
      role="listbox"
      aria-label="Slash commands"
      onKeyDown={handleKeyDown}
      data-testid="slash-palette"
    >
      {/* ── Search input ─────────────────────────────────────────── */}
      <div className="palette__search">
        <span className="palette__search-icon" aria-hidden="true">🔍</span>
        <input
          ref={searchRef}
          type="text"
          className="palette__search-input"
          placeholder="Search 9 commands…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={swallow}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Search slash commands"
          aria-controls="slash-palette-list"
        />
        <span className="palette__search-meta" aria-live="polite">
          {filteredCount}/{totalCount}
        </span>
      </div>

      {/* ── Body: list (left) + preview (right) ───────────────────── */}
      <div className="palette__body">
        <div
          id="slash-palette-list"
          className="palette__list"
          role="presentation"
        >
          {filteredCount === 0 ? (
            <div className="palette__empty">
              <span className="palette__empty-glyph" aria-hidden="true">🤷</span>
              <span>No commands match “{query}”.</span>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.category} className="palette__group">
                <div className="palette__group-header" aria-hidden="true">
                  {group.category}
                </div>
                {group.items.map((cmd) => {
                  const isActive = cmd.id === activeId;
                  return (
                    <button
                      key={cmd.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(cmd.id, el);
                        else rowRefs.current.delete(cmd.id);
                      }}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive || undefined}
                      data-cmd-id={cmd.id}
                      className={`palette__row${isActive ? ' palette__row--active' : ''}`}
                      onMouseEnter={() => handleRowHover(cmd.id)}
                      onClick={handleRowClick(cmd)}
                      title={cmd.description}
                    >
                      <span className="palette__row-icon" aria-hidden="true">
                        {cmd.icon}
                      </span>
                      <span className="palette__row-cmd">{cmd.label}</span>
                      <span className="palette__row-desc">{cmd.description}</span>
                      <span
                        className={`palette__row-badge palette__row-badge--${cmd.category.toLowerCase()}`}
                        aria-hidden="true"
                      >
                        {cmd.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Preview pane ────────────────────────────────────────── */}
        <div className="palette__preview" aria-live="polite">
          {activeCmd ? (
            <>
              <header className="palette__preview-header">
                <span className="palette__preview-cmd">{activeCmd.label}</span>
                <span
                  className={`palette__preview-badge palette__row-badge--${activeCmd.category.toLowerCase()}`}
                  aria-hidden="true"
                >
                  {activeCmd.category}
                </span>
              </header>
              <p className="palette__preview-desc">{activeCmd.description}</p>
              <div className="palette__preview-body">{activeCmd.preview}</div>
            </>
          ) : (
            <div className="palette__preview-empty">
              <span className="palette__preview-empty-glyph" aria-hidden="true">↗</span>
              <p>Pick a command to see its preview.</p>
              <ul className="palette__preview-tips">
                <li>
                  <kbd className="palette__kbd">↑</kbd>{' '}
                  <kbd className="palette__kbd">↓</kbd> navigate
                </li>
                <li>
                  <kbd className="palette__kbd">↵</kbd> insert
                </li>
                <li>
                  <kbd className="palette__kbd">Esc</kbd> close
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}