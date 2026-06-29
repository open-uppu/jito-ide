/**
 * SettingsPage.tsx — Full settings UI for jito-ide (Phase 3.5)
 *
 * Card-based layout, 600px max-width. Six cards:
 *   1. API Key      — masked input, persisted to VS Code SecretStorage
 *   2. Model        — LLM model identifier (Minimax-M3 default)
 *   3. Default Mode — ModePill picker (5 modes)
 *   4. Telemetry    — opt-in toggle (default OFF)
 *   5. Theme        — dark / light / system
 *   6. About        — brand preview tile + version + links
 *
 * Two-way IPC with the extension host (settings-ui.ts):
 *   → webview:  { type: 'load' }
 *   → webview:  { type: 'submit', payload: FormData }
 *   → webview:  { type: 'reset' }
 *   ← host:     { type: 'state', payload: SettingsState }
 *   ← host:     { type: 'saveResult', payload: { ok, error? } }
 *
 * SECURITY: The actual API key NEVER crosses the IPC boundary. Only
 * `apiKeySet: boolean` is sent from host → webview. The plaintext key
 * is sent webview → host only when the user submits a new value.
 *
 * Visual smoke test: webview/preview-phase-3.5.html
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { postToHost, vscode } from './lib/vscode';
import { ModeSelector } from './components/ModeSelector';
import type { JitoMode } from '../types';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export type ThemeChoice = 'dark' | 'light' | 'system';

export interface SettingsState {
  apiKeySet: boolean;       // never sends the key itself
  model: string;
  defaultMode: JitoMode;
  telemetry: boolean;
  theme: ThemeChoice;
}

interface FormDraft {
  apiKey: string;           // empty string = no change
  apiKeyTouched: boolean;   // user edited the key field this session
  model: string;
  defaultMode: JitoMode;
  telemetry: boolean;
  theme: ThemeChoice;
}

const INITIAL_DRAFT: FormDraft = {
  apiKey: '',
  apiKeyTouched: false,
  model: 'minimax/MiniMax-M3',
  defaultMode: 'dev',
  telemetry: false,
  theme: 'dark',
};

// ──────────────────────────────────────────────────────────────────────
// Static metadata
// ──────────────────────────────────────────────────────────────────────

const MODEL_PRESETS: { id: string; label: string; description: string }[] = [
  {
    id: 'minimax/MiniMax-M3',
    label: 'Minimax-M3 (default)',
    description: 'Default — chat + code, ~$0.005/chat. Local-first.',
  },
  {
    id: 'openrouter/anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet (via OpenRouter)',
    description: 'Stronger reasoning. Requires OPENROUTER_API_KEY env.',
  },
  {
    id: 'ollama/minimax-m3:cloud',
    label: 'Ollama (local Minimax-M3)',
    description: 'Fully offline. Requires `ollama serve` running.',
  },
];

const THEME_OPTIONS: { id: ThemeChoice; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', icon: '🌑' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'system', label: 'System', icon: '🖥️' },
];

const EXTENSION_VERSION = '0.2.0';
const EXTENSION_TAGLINE = 'Multi-mode AI agent. Powered by jito + Minimax-M3.';
const REPO_URL = 'https://github.com/open-uppu/jito-ide';

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}

// ──────────────────────────────────────────────────────────────────────
// Card — primitive surface used by every section
// ──────────────────────────────────────────────────────────────────────

interface CardProps {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}

function Card({ title, description, badge, children }: CardProps) {
  return (
    <section className="settings-card" aria-labelledby={`card-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <header className="settings-card__header">
        <h3 id={`card-${title.replace(/\s+/g, '-').toLowerCase()}`} className="settings-card__title">
          {title}
        </h3>
        {badge && <span className="settings-card__badge">{badge}</span>}
      </header>
      <p className="settings-card__desc">{description}</p>
      <div className="settings-card__control">{children}</div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-controls (input, select, toggle, theme radio)
// ──────────────────────────────────────────────────────────────────────

function ApiKeyField({
  apiKeySet,
  value,
  onChange,
}: {
  apiKeySet: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [reveal, setReveal] = useState(false);
  const placeholder = apiKeySet ? maskKey('sk-existing-key-12345678') : 'sk-...';

  return (
    <div className="api-key-field">
      <div className="api-key-field__row">
        <input
          type={reveal ? 'text' : 'password'}
          className="input-mono"
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          aria-label="Minimax API key"
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? 'Hide API key' : 'Show API key'}
        >
          {reveal ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="api-key-field__status">
        <span
          className={`status-dot ${apiKeySet ? 'status-dot--ok' : 'status-dot--warn'}`}
          aria-hidden="true"
        />
        <span className="status-text">
          {apiKeySet
            ? 'Key configured — stored encrypted in VS Code SecretStorage.'
            : 'No key set — chat will prompt to add one.'}
        </span>
      </div>
    </div>
  );
}

function ModelField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isPreset = MODEL_PRESETS.some((p) => p.id === value);
  const [customMode, setCustomMode] = useState(!isPreset);

  return (
    <div className="model-field">
      {!customMode ? (
        <div className="model-field__row">
          <select
            className="select-mono"
            value={isPreset ? value : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustomMode(true);
              } else {
                onChange(e.target.value);
              }
            }}
          >
            {MODEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </div>
      ) : (
        <div className="model-field__row">
          <input
            type="text"
            className="input-mono"
            value={value}
            placeholder="provider/model-id"
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setCustomMode(false)}
            aria-label="Back to presets"
          >
            Presets
          </button>
        </div>
      )}
      <p className="model-field__hint">
        {isPreset
          ? MODEL_PRESETS.find((p) => p.id === value)?.description
          : 'Custom model identifier passed to the jito subprocess.'}
      </p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  ariaLabel: string;
}) {
  return (
    <label className="toggle" aria-label={ariaLabel}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__label">{label}</span>
    </label>
  );
}

function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeChoice;
  onChange: (v: ThemeChoice) => void;
}) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={`theme-picker__btn ${value === opt.id ? 'theme-picker__btn--active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          <span aria-hidden="true" className="theme-picker__icon">{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function BrandPreviewTile() {
  return (
    <div className="brand-tile" aria-label="jito brand preview">
      <div className="brand-tile__bg gradient-mode-universal" aria-hidden="true" />
      <div className="brand-tile__content">
        <div className="brand-tile__mark">
          {/* Inline jito bolt — cyan stroke on dark fill, mirrors assets/logo-mark.svg */}
          <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
            <path
              d="M40 8 L18 36 L30 36 L24 56 L46 28 L34 28 Z"
              fill="#001318"
              stroke="#00E5FF"
              strokeWidth="2.5"
              strokeLinejoin="miter"
            />
            <rect x="44" y="0" width="4" height="4" fill="#FF2E92" />
            <rect x="3" y="50" width="4" height="4" fill="#00E5FF" />
          </svg>
        </div>
        <div className="brand-tile__text">
          <div className="brand-tile__title">
            <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 12px var(--color-jito-cyan-glow)' }}>⚡</span>
            {' '}jito<span className="brand-tile__version">·v{EXTENSION_VERSION}</span>
          </div>
          <div className="brand-tile__tagline">{EXTENSION_TAGLINE}</div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  // Saved state from host
  const [saved, setSaved] = useState<SettingsState | null>(null);
  // Local draft (what the user is editing)
  const [draft, setDraft] = useState<FormDraft>(INITIAL_DRAFT);
  // UI status
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Load on mount ───────────────────────────────────────────────
  useEffect(() => {
    postToHost('load');
  }, []);

  // ── Listen for host messages ────────────────────────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (type === 'state') {
        const s = payload as SettingsState;
        setSaved(s);
        setDraft((d) => ({
          ...d,
          model: s.model,
          defaultMode: s.defaultMode,
          telemetry: s.telemetry,
          theme: s.theme,
          // apiKey stays blank unless user types
        }));
        setStatus('idle');
      } else if (type === 'saveResult') {
        const r = payload as { ok: boolean; error?: string };
        if (r.ok) {
          setStatus('saved');
          setErrorMsg(null);
          // Clear the apiKey field on successful save (no longer "dirty")
          setDraft((d) => ({ ...d, apiKey: '', apiKeyTouched: false }));
          // Reload from host so apiKeySet reflects truth
          postToHost('load');
          // Auto-dismiss "Saved" after 2s
          setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
        } else {
          setStatus('error');
          setErrorMsg(r.error || 'Save failed.');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ── Dirty detection ─────────────────────────────────────────────
  const isDirty = useMemo(() => {
    if (!saved) return draft.apiKeyTouched; // before load, only apiKey edit counts
    return (
      draft.apiKeyTouched ||
      draft.model !== saved.model ||
      draft.defaultMode !== saved.defaultMode ||
      draft.telemetry !== saved.telemetry ||
      draft.theme !== saved.theme
    );
  }, [saved, draft]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!isDirty || status === 'saving') return;
    setStatus('saving');
    setErrorMsg(null);
    postToHost('submit', {
      // Only send apiKey if user typed a new one
      apiKey: draft.apiKeyTouched && draft.apiKey ? draft.apiKey : undefined,
      model: draft.model,
      defaultMode: draft.defaultMode,
      telemetry: draft.telemetry,
      theme: draft.theme,
    });
  }, [draft, isDirty, status]);

  const handleReset = useCallback(() => {
    if (!saved) return;
    setDraft({
      apiKey: '',
      apiKeyTouched: false,
      model: saved.model,
      defaultMode: saved.defaultMode,
      telemetry: saved.telemetry,
      theme: saved.theme,
    });
    setStatus('idle');
    setErrorMsg(null);
  }, [saved]);

  const handleRestoreDefaults = useCallback(() => {
    if (!confirm('Restore all settings to their defaults? This will not delete your API key.')) {
      return;
    }
    setStatus('saving');
    postToHost('reset');
  }, []);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="settings-page" data-loading={saved === null}>
      <header className="settings-page__header">
        <div className="brand-mark">
          <span className="brand-mark__bolt" aria-hidden="true">⚡</span>
          <span>jito</span>
          <span className="settings-page__sep">·</span>
          <span className="settings-page__subtitle">Settings</span>
        </div>
        <a
          href={REPO_URL}
          className="settings-page__repo"
          onClick={(e) => {
            e.preventDefault();
            postToHost('openExternal', { url: REPO_URL });
          }}
        >
          Docs ↗
        </a>
      </header>

      <main className="settings-page__main">
        {!saved && (
          <div className="settings-loading">Loading settings…</div>
        )}

        <Card
          title="API Key"
          description="Minimax API key. Stored encrypted in VS Code SecretStorage — never written to settings.json."
          badge="SecretStorage"
        >
          <ApiKeyField
            apiKeySet={saved?.apiKeySet ?? false}
            value={draft.apiKey}
            onChange={(v) => setDraft((d) => ({ ...d, apiKey: v, apiKeyTouched: true }))}
          />
        </Card>

        <Card
          title="Model"
          description="LLM backend model identifier passed to the jito subprocess."
        >
          <ModelField
            value={draft.model}
            onChange={(v) => setDraft((d) => ({ ...d, model: v }))}
          />
        </Card>

        <Card
          title="Default Mode"
          description="Mode selected automatically when opening a new chat."
        >
          <ModeSelector
            value={draft.defaultMode}
            onChange={(m) => setDraft((d) => ({ ...d, defaultMode: m }))}
            disabled={false}
          />
        </Card>

        <Card
          title="Telemetry"
          description="Send anonymous usage data. OFF by default — never collected without your consent."
          badge="Opt-in"
        >
          <Toggle
            checked={draft.telemetry}
            onChange={(v) => setDraft((d) => ({ ...d, telemetry: v }))}
            label={draft.telemetry ? 'Enabled — anonymous stats on' : 'Disabled (recommended)'}
            ariaLabel="Enable telemetry"
          />
        </Card>

        <Card
          title="Theme"
          description="Visual theme. Dark is the brand default."
        >
          <ThemePicker
            value={draft.theme}
            onChange={(t) => setDraft((d) => ({ ...d, theme: t }))}
          />
        </Card>

        <Card
          title="About"
          description={`jito ⚡ — multi-mode AI agent for VS Code.`}
        >
          <BrandPreviewTile />
          <div className="settings-about__meta">
            <div className="settings-about__row">
              <span className="settings-about__label">Version</span>
              <span className="settings-about__value font-mono">v{EXTENSION_VERSION}</span>
            </div>
            <div className="settings-about__row">
              <span className="settings-about__label">Backend</span>
              <span className="settings-about__value font-mono">jito v0.2.0 subprocess</span>
            </div>
            <div className="settings-about__row">
              <span className="settings-about__label">License</span>
              <span className="settings-about__value">Apache-2.0</span>
            </div>
          </div>
        </Card>
      </main>

      <footer className="settings-page__footer">
        <div className="settings-page__footer-left">
          {status === 'saved' && (
            <span className="settings-status settings-status--ok">
              <span className="status-dot status-dot--ok" aria-hidden="true" /> Saved.
            </span>
          )}
          {status === 'error' && (
            <span className="settings-status settings-status--err">
              <span className="status-dot status-dot--err" aria-hidden="true" /> {errorMsg ?? 'Save failed.'}
            </span>
          )}
          {status === 'saving' && (
            <span className="settings-status settings-status--info">Saving…</span>
          )}
          {status === 'idle' && isDirty && (
            <span className="settings-status settings-status--warn">Unsaved changes</span>
          )}
        </div>
        <div className="settings-page__footer-right">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleRestoreDefaults}
            disabled={!saved}
          >
            Restore defaults
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleReset}
            disabled={!isDirty || status === 'saving'}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={!isDirty || status === 'saving'}
          >
            {status === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Default export + standalone bootstrap (used by preview HTML)
// ──────────────────────────────────────────────────────────────────────

export default SettingsPage;