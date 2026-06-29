/**
 * MessageList.tsx — Scrollable list of MessageCards (Phase 3.4)
 *
 * Phase 3.4: replaced the inline "bubble" rendering with the new
 * MessageCard component. The card now owns:
 *   - 4px mode-color stripe on the left edge
 *   - header (mode icon avatar + mode badge + timestamp + Stop)
 *   - body (react-markdown + react-syntax-highlighter code blocks)
 *   - footer (file count + tokens + latency)
 *
 * This container only handles scrolling, vertical spacing, and the
 * empty-state placeholder. Per-message presentation lives in MessageCard.
 */
import type { ChatMessage } from '../App';
import { MessageCard } from './MessageCard';

interface Props {
  messages: ChatMessage[];
  onCancel: (id: string) => void;
}

export function MessageList({ messages, onCancel }: Props) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      {messages.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--fg-tertiary)',
            marginTop: 'var(--space-8)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-2xl)',
              marginBottom: 'var(--space-2)',
              color: 'var(--accent-primary)',
              textShadow: '0 0 16px var(--color-jito-cyan-glow)',
            }}
            aria-hidden="true"
          >
            ⚡
          </div>
          <div>Ask jito anything. Pick a mode above to start.</div>
        </div>
      )}
      {messages.map((msg) => (
        <MessageCard key={msg.id} msg={msg} onCancel={onCancel} />
      ))}
    </div>
  );
}