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

export function InputBar({ onSend, disabled }: Props) {
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
    <div className="border-t border-white/10 p-2 relative">
      {showCommands && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-zinc-800 rounded shadow-lg border border-white/10 max-h-48 overflow-y-auto">
          {SLASH_COMMANDS.map((c) => (
            <button
              key={c.cmd}
              onClick={() => insertCommand(c.cmd)}
              className="block w-full text-left px-3 py-2 hover:bg-white/10"
            >
              <div className="font-mono text-sm">{c.cmd}</div>
              <div className="text-xs opacity-70">{c.desc}</div>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask jito…  (Enter to send, Shift+Enter for newline, / for commands)"
          disabled={disabled}
          rows={2}
          className="flex-1 bg-white/5 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium"
        >
          {disabled ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
