import { useState, useEffect, useRef } from 'react';
import { MessageList } from './components/MessageList';
import { InputBar } from './components/InputBar';
import { ModeSelector } from './components/ModeSelector';
import { postToHost } from './lib/vscode';
import type { JitoMode } from './types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: JitoMode;
  timestamp: number;
  streaming?: boolean;
  error?: boolean;
}

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<JitoMode>('dev');
  const [busy, setBusy] = useState(false);

  // Sync active mode to <html data-mode="..."> so token mode attributes
  // (--mode-active-primary/fg/bg) rebind reactively across the tree.
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'message':
          setMessages((m) => [...m, payload as ChatMessage]);
          if ((payload as ChatMessage).role === 'user') setBusy(true);
          break;
        case 'messageUpdate': {
          const update = payload as { id: string; content?: string; streaming?: boolean; error?: boolean; usage?: unknown };
          setMessages((m) =>
            m.map((msg) => (msg.id === update.id ? { ...msg, ...update } : msg))
          );
          if (update.streaming === false) setBusy(false);
          if (update.error) setBusy(false);
          break;
        }
        case 'history':
          setMessages(payload as ChatMessage[]);
          break;
        case 'context':
          // TODO: render context files list
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleSend = (text: string) => {
    if (!text.trim() || busy) return;
    postToHost('send', { text, mode });
  };

  const handleCancel = (id: string) => {
    postToHost('cancel', { id });
  };

  const handleClear = () => {
    postToHost('clear');
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="app-header">
        <div className="brand-mark">
          <span className="brand-mark__bolt" aria-hidden="true">⚡</span>
          <span>jito</span>
        </div>
        <ModeSelector value={mode} onChange={setMode} disabled={busy} />
      </header>
      <MessageList messages={messages} onCancel={handleCancel} />
      <InputBar onSend={handleSend} disabled={busy} mode={mode} />
      <footer className="app-footer">
        <span className="tracking-wide uppercase">
          {messages.length} messages · <span className="mode-chip">{mode}</span>
        </span>
        <button
          onClick={handleClear}
          className="hover:opacity-100 opacity-60"
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          Clear
        </button>
      </footer>
    </div>
  );
}