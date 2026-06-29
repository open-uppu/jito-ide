import type { ChatMessage } from '../App';

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
        <div
          key={msg.id}
          style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}
        >
          <div
            className={
              msg.role === 'user'
                ? 'bubble bubble--user'
                : msg.error
                ? 'bubble bubble--error'
                : 'bubble bubble--assistant'
            }
          >
            {msg.mode && msg.role === 'user' && (
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  opacity: 0.7,
                  marginBottom: 'var(--space-1)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wide)',
                }}
              >
                {msg.mode}
              </div>
            )}
            <div>{msg.content || (msg.streaming ? '...' : '')}</div>
            {msg.streaming && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--fg-tertiary)',
                }}
              >
                <span className="streaming-dot" aria-hidden="true" />
                <button
                  onClick={() => onCancel(msg.id)}
                  className="hover:opacity-100"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}