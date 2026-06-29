import { useState, KeyboardEvent } from 'react';
import type { JitoMode } from '../types';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  mode: JitoMode;
}

const SLASH_COMMANDS = [
  { cmd: '/review', desc: 'Review code for issues' },
  { cmd: '/test', desc: 'Generate tests' },
  { cmd: '/refactor', desc: 'Refactor selected code' },
  { cmd: '/doc', desc: 'Generate documentation' },
  { cmd: '/explain', desc: 'Explain code' },
];

export function InputBar({ onSend, disabled, mode }: Props) {
  const [text, setText] = useState('');
  const [showCommands, setShowCommands] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
    setShowCommands(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/' && text === '') {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  };

  const insertCommand = (cmd: string) => {
    setText(cmd + ' ');
    setShowCommands(false);
  };

  return (
    <div
      style={{
        borderTop: 'var(--stroke-1) solid var(--border-subtle)',
        padding: 'var(--space-2)',
        position: 'relative',
      }}
    >
      {showCommands && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 'var(--space-2)',
            right: 'var(--space-2)',
            marginBottom: 'var(--space-1)',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            border: 'var(--stroke-1) solid var(--border-default)',
            maxHeight: 'var(--space-12)',
            overflowY: 'auto',
          }}
        >
          {SLASH_COMMANDS.map((c) => (
            <button
              key={c.cmd}
              onClick={() => insertCommand(c.cmd)}
              className="block w-full text-left hover:bg-white/5"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-primary)',
                cursor: 'pointer',
              }}
            >
              <div className="font-mono text-sm">{c.cmd}</div>
              <div className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>{c.desc}</div>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Ask jito in ${mode} mode…  (Enter to send, Shift+Enter for newline, / for commands)`}
          disabled={disabled}
          rows={2}
          className="input-chat"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="btn-send"
        >
          {disabled ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}