import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import type { JitoMode } from '../types';
import { SlashPalette } from './SlashPalette';
import type { SlashCommand } from '../lib/commands.tsx';

/**
 * Composer — Phase 4.1 redesign of the chat input bar.
 *
 * Visual stack (top → bottom inside the composer surface):
 *   ┌──────────────────────────────────────────────┐
 *   │ [⚙ Dev ▼] [📎 +file] [⌘K slash]   1,234 chars│ ← toolbar row
 *   ├──────────────────────────────────────────────┤
 *   │ Ask jito…                                    │ ← multi-line textarea
 *   │                                              │     (auto-expand ≤ 12 lines)
 *   └──────────────────────────────────────────────┘
 *                                  [   ⏎ send    ]   ← cyan-glow send button
 *
 * Keyboard contract:
 *   - Enter          → newline (browser default)
 *   - Shift+Enter    → newline (explicit; same as plain Enter)
 *   - Cmd+Enter      → send (Ctrl+Enter on win/linux)
 *   - "/"            → opens slash-command palette (when text is empty)
 *
 * Behaviour:
 *   - Multi-line textarea auto-expands from 1 line up to a max of 12 lines;
 *     beyond that, internal scroll kicks in.
 *   - Send button is disabled when text is empty/whitespace or when
 *     `disabled` is true (e.g. host is streaming a reply).
 *   - Char counter shows live count + turns warn colour once > 8000 chars.
 */

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  mode: JitoMode;
}

// Slash command definitions now live in `../lib/commands.ts` (Phase 4.2)
// and are rendered by the `<SlashPalette />` component.

const MAX_LINES = 12;
const LINE_HEIGHT_PX = 20; // matches --leading-tight × --text-md in tokens.css
const WARN_CHAR_THRESHOLD = 8000;

// Mode display metadata for the MiniModePill. Icons intentionally match the
// icons used in ModeSelector so the two stay visually consistent.
const MODE_META: Record<JitoMode, { label: string; icon: string }> = {
  dev:       { label: 'Dev',       icon: '⚙️' },
  reason:    { label: 'Reason',    icon: '🧠' },
  create:    { label: 'Create',    icon: '🎨' },
  audit:     { label: 'Audit',     icon: '🛡️' },
  universal: { label: 'Universal', icon: '🌐' },
};

export function Composer({ onSend, disabled, mode }: Props) {
  const [text, setText] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Mirror of textarea height in px — used to keep the surface layout stable
  // while we toggle scroll-ability around the 12-line cap.
  const [textareaHeight, setTextareaHeight] = useState<number>(LINE_HEIGHT_PX);

  // ---- Auto-expand: keep height in sync with content (cap at MAX_LINES) ----
  const recalcHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset to auto so scrollHeight reflects natural single-line height.
    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT_PX * MAX_LINES;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    // Once we hit the cap, force vertical scroll instead of growing further.
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    setTextareaHeight(next);
  }, []);

  useLayoutEffect(() => {
    recalcHeight();
  }, [text, recalcHeight]);

  // ---- Send -------------------------------------------------------------
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    setShowCommands(false);
    // After clearing, re-flow back to 1 line on next render via useLayoutEffect.
  }, [text, disabled, onSend]);

  // ---- Keyboard ---------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd+Enter (mac) / Ctrl+Enter (win/linux) → send.
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
        return;
      }
      // Slash at the very start opens the command palette.
      if (e.key === '/' && text === '') {
        setShowCommands(true);
      } else if (showCommands && e.key === 'Escape') {
        e.preventDefault();
        setShowCommands(false);
      }
      // Plain Enter / Shift+Enter fall through → newline (default).
    },
    [handleSend, text, showCommands],
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Keep the palette open while the user is typing a command prefix
    // (e.g. "/re" still matches /review); close once they leave the empty state
    // and type non-slash content.
    if (e.target.value !== '' && !e.target.value.startsWith('/')) {
      setShowCommands(false);
    }
  }, []);

  // Click-outside closes the palette (the toolbar button toggles it back on).
  const surfaceRef = useRef<HTMLDivElement>(null);
  // Phase 4.2: click-outside is handled by SlashPalette itself
  // (it owns the open-state lifecycle and ignores hits inside `anchorRef`).

  // ---- Toolbar handlers ------------------------------------------------
  const openCommands = useCallback(() => {
    setShowCommands((prev) => !prev);
    textareaRef.current?.focus();
  }, []);

  // For now the AttachFile button is a no-op placeholder — the host side
  // will grow an @file picker in a follow-up phase. We surface the intent
  // with a brief visual flash so it doesn't look dead.
  const handleAttach = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const insertCommand = useCallback((cmd: string) => {
    setText((prev) => (prev.length === 0 ? `${cmd} ` : prev));
    setShowCommands(false);
    textareaRef.current?.focus();
  }, []);

  // Phase 4.2 — SlashPalette callbacks. `handlePaletteSelect` inserts the
  // chosen command's label (e.g. "/review ") into the textarea; we keep
  // `insertCommand` around for any future inline caller that hands us a
  // raw string.
  const handlePaletteSelect = useCallback((cmd: SlashCommand) => {
    insertCommand(cmd.label);
  }, [insertCommand]);

  const handlePaletteClose = useCallback(() => {
    setShowCommands(false);
    textareaRef.current?.focus();
  }, []);

  // ---- Derived state ----------------------------------------------------
  const charCount = text.length;
  const trimmedEmpty = text.trim().length === 0;
  const overWarn = charCount > WARN_CHAR_THRESHOLD;
  const canSend = !trimmedEmpty && !disabled;
  const modeMeta = MODE_META[mode];

  return (
    <div
      ref={surfaceRef}
      className={`composer ${isFocused ? 'composer--focused' : ''}`}
      data-mode={mode}
    >
      {/* Slash-command palette — Phase 4.2: pops above the composer. */}
      {showCommands && (
        <SlashPalette
          onSelect={handlePaletteSelect}
          onClose={handlePaletteClose}
          anchorRef={surfaceRef}
        />
      )}

      {/* Toolbar — sits above the textarea inside the composer surface. */}
      <div className="composer__toolbar" role="toolbar" aria-label="Composer actions">
        <button
          type="button"
          className="composer__mini-pill"
          title={`Active mode: ${modeMeta.label} (click header to change)`}
          aria-label={`Active mode ${modeMeta.label}`}
          data-mode={mode}
        >
          <span aria-hidden="true">{modeMeta.icon}</span>
          <span className="composer__mini-pill-label">{modeMeta.label}</span>
          <span aria-hidden="true" className="composer__mini-pill-caret">▾</span>
        </button>

        <button
          type="button"
          className="composer__tool-btn"
          title="Attach file (coming soon)"
          aria-label="Attach file"
          onClick={handleAttach}
        >
          <span aria-hidden="true">📎</span>
          <span>+file</span>
        </button>

        <button
          type="button"
          className="composer__tool-btn"
          title="Slash commands (/)"
          aria-label="Open slash commands"
          aria-expanded={showCommands}
          onClick={openCommands}
        >
          <span aria-hidden="true">⌘K</span>
          <span>slash</span>
        </button>

        <span
          className={`composer__counter ${overWarn ? 'composer__counter--warn' : ''}`}
          aria-live="polite"
        >
          {charCount.toLocaleString()} chars
        </span>
      </div>

      {/* Textarea — auto-expands up to MAX_LINES. */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={`Ask jito in ${modeMeta.label.toLowerCase()} mode…  (Cmd+Enter to send, Shift+Enter for newline, / for commands)`}
        disabled={disabled}
        rows={1}
        spellCheck
        aria-label="Message composer"
        className="composer__textarea"
        style={{ height: `${textareaHeight}px` }}
      />

      {/* Send row — cyan-glow button on the right. */}
      <div className="composer__send-row">
        <span className="composer__hint" aria-hidden="true">
          {disabled ? 'jito is replying…' : '⏎ Enter for newline · ⌘+Enter to send'}
        </span>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="composer__send"
          aria-label="Send message"
        >
          <span aria-hidden="true">⏎</span>
          <span>send</span>
        </button>
      </div>
    </div>
  );
}