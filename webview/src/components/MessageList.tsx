import type { ChatMessage } from '../App';

interface Props {
  messages: ChatMessage[];
  onCancel: (id: string) => void;
}

export function MessageList({ messages, onCancel }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.length === 0 && (
        <div className="text-center opacity-50 mt-8">
          <div className="text-3xl mb-2">⚡</div>
          <div>Ask jito anything. Pick a mode above to start.</div>
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : msg.error
                ? 'bg-red-900/30 border border-red-700'
                : 'bg-white/5'
            }`}
          >
            {msg.mode && msg.role === 'user' && (
              <div className="text-xs opacity-70 mb-1">[{msg.mode}]</div>
            )}
            <div className="whitespace-pre-wrap break-words">
              {msg.content || (msg.streaming ? '...' : '')}
            </div>
            {msg.streaming && (
              <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                <div className="animate-pulse">●</div>
                <button onClick={() => onCancel(msg.id)} className="hover:opacity-100">
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
