import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
import { ModeSelector } from './components/ModeSelector';
import { Onboarding } from './components/Onboarding';
import { postToHost } from './lib/vscode';
import type { JitoMode } from './types';

/**
 * ChatMessage — single turn in the chat panel.
 *
 * Phase 3.4 extended fields:
 *   - usage?: { input_tokens, output_tokens } — emitted on message.end
 *   - contextFiles?: string[] — files attached to the user message;
 *     surfaced as a "N files" badge in the card footer.
 *   - startedAt?: number — ms epoch captured when the host emits
 *     message.start (used to compute end-to-end latency in the footer).
 *   - endedAt?: number — ms epoch captured when message.end arrives.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: JitoMode;
  timestamp: number;
  streaming?: boolean;
  error?: boolean;
  usage?: { input_tokens: number; output_tokens: number };
  contextFiles?: string[];
  startedAt?: number;
  endedAt?: number;
}

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<JitoMode>('dev');
  const [busy, setBusy] = useState(false);
  // Tracks when each assistant turn started streaming so we can stamp
  // startedAt on the message when message.start arrives (the host emits
  // it after our `send` call returns).
  const streamStartedAt = useRef<Record<string, number>>({});

  // Sync active mode to <html data-mode="..."> so token mode attributes
  // (--mode-active-primary/fg/bg) rebind reactively across the tree.
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'message': {
          const m = payload as ChatMessage;
          setMessages((prev) => [...prev, m]);
          if (m.role === 'user') {
            setBusy(true);
            // Pre-seed startedAt for the assistant reply that the host is
            // about to open. The host will set a fresh startedAt on
            // message.start anyway, but this gives us a sane fallback if
            // message.start never arrives (e.g. immediate error).
            streamStartedAt.current[m.id] = Date.now();
          }
          break;
        }
        case 'messageUpdate': {
          const update = payload as {
            id: string;
            content?: string;
            streaming?: boolean;
            error?: boolean;
            usage?: { input_tokens: number; output_tokens: number };
            startedAt?: number;
            endedAt?: number;
          };
          // Stamp startedAt on the first streaming=true for this id.
          const startedAt =
            update.startedAt ??
            (streamStartedAt.current[update.id] ??
              (update.streaming ? Date.now() : undefined));
          if (startedAt !== undefined) {
            streamStartedAt.current[update.id] = startedAt;
          }
          const endedAt =
            update.endedAt ??
            (update.streaming === false ? Date.now() : undefined);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === update.id
                ? {
                    ...msg,
                    ...update,
                    startedAt: msg.startedAt ?? startedAt,
                    endedAt: endedAt ?? msg.endedAt,
                  }
                : msg,
            ),
          );
          if (update.streaming === false) {
            setBusy(false);
            // Free the bookkeeping entry after a short grace window so
            // late messageUpdate events for the same id still find it.
            const id = update.id;
            setTimeout(() => {
              delete streamStartedAt.current[id];
            }, 30_000);
          }
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

  const handleSend = (text: string, contextFiles: string[] = []) => {
    if (!text.trim() || busy) return;
    postToHost('send', { text, mode, contextFiles });
  };

  const handleCancel = (id: string) => {
    postToHost('cancel', { id });
  };

  const handleClear = () => {
    postToHost('clear');
  };

  const handleOnboardingComplete = useCallback(() => {}, []);

  return (
    <>
      <Onboarding onComplete={handleOnboardingComplete} />
      <div className="flex flex-col h-screen">
        <header className="app-header">
          <div className="brand-mark">
            <span className="brand-mark__bolt" aria-hidden="true">⚡</span>
            <span>jito</span>
          </div>
          <ModeSelector value={mode} onChange={setMode} disabled={busy} />
        </header>
        <MessageList messages={messages} onCancel={handleCancel} />
        <Composer onSend={handleSend} disabled={busy} mode={mode} />
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
    </>
  );
}
