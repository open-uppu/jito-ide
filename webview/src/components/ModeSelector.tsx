import type { JitoMode } from '../types';
import { ModeIcons } from './icons';

interface Props {
  value: JitoMode;
  onChange: (mode: JitoMode) => void;
  disabled: boolean;
}

const MODES: { id: JitoMode; label: string }[] = [
  { id: 'dev', label: 'Dev' },
  { id: 'reason', label: 'Reason' },
  { id: 'create', label: 'Create' },
  { id: 'audit', label: 'Audit' },
  { id: 'universal', label: 'Universal' },
];

const MODE_ICON_CLASS: Record<JitoMode, string> = {
  dev: 'text-mode-dev',
  reason: 'text-mode-reason',
  create: 'text-mode-create',
  audit: 'text-mode-audit',
  universal: 'text-mode-universal',
};

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="mode-selector" role="radiogroup" aria-label="Chat mode">
      {MODES.map((m) => {
        const active = value === m.id;
        const Icon = ModeIcons[m.id];

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
            <Icon
              className={`mode-selector__icon ${MODE_ICON_CLASS[m.id]}`}
              aria-hidden="true"
            />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}