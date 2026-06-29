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
    <div className="flex gap-1 bg-white/5 rounded p-0.5">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          disabled={disabled}
          title={m.label}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            value === m.id
              ? 'bg-blue-600 text-white'
              : 'hover:bg-white/10 opacity-70 hover:opacity-100'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <span className="mr-1">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
