import type { JitoMode } from '../types';

interface Props {
  value: JitoMode;
  onChange: (mode: JitoMode) => void;
  disabled: boolean;
}

const MODES: { id: JitoMode; label: string; icon: string }[] = [
  { id: 'dev', label: 'Dev', icon: '⚙️' },
  { id: 'reason', label: 'Reason', icon: '🧠' },
  { id: 'create', label: 'Create', icon: '🎨' },
  { id: 'audit', label: 'Audit', icon: '🛡️' },
  { id: 'universal', label: 'Universal', icon: '🌐' },
];

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="mode-selector" role="radiogroup" aria-label="Chat mode">
      {MODES.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            disabled={disabled}
            title={m.label}
            role="radio"
            aria-checked={active}
            className={`mode-selector__btn ${active ? 'mode-selector__btn--active' : ''}`}
          >
            <span aria-hidden="true" style={{ marginRight: 'var(--space-1)' }}>{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}