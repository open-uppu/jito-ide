import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageCard } from './MessageCard';
import type { ChatMessage } from '../App';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    content: 'Hello',
    mode: 'dev',
    timestamp: new Date('2026-06-29T10:15:00Z').getTime(),
    ...overrides,
  };
}

describe('MessageCard', () => {
  it('renders a user message with data-role user', () => {
    render(<MessageCard msg={message({ role: 'user', mode: undefined })} onCancel={vi.fn()} />);

    expect(screen.getByTestId('message-card')).toHaveAttribute('data-role', 'user');
    expect(screen.getByRole('article', { name: 'Chat message from user' })).toBeInTheDocument();
  });

  it('renders an assistant message with data-mode and data-role', () => {
    render(<MessageCard msg={message({ role: 'assistant', mode: 'dev' })} onCancel={vi.fn()} />);

    expect(screen.getByTestId('message-card')).toHaveAttribute('data-role', 'assistant');
    expect(screen.getByTestId('message-card')).toHaveAttribute('data-mode', 'dev');
  });

  it('renders the message card test id on the article', () => {
    render(<MessageCard msg={message()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('message-card').tagName).toBe('ARTICLE');
  });

  it('shows Stop when streaming and calls onCancel with the message id', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<MessageCard msg={message({ id: 'stream-1', streaming: true })} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(onCancel).toHaveBeenCalledWith('stream-1');
  });

  it('hides Stop when not streaming', () => {
    render(<MessageCard msg={message({ streaming: false })} onCancel={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
  });

  it('renders markdown content including bold text and a fenced code block', () => {
    render(
      <MessageCard
        msg={message({
          content: '**Bold text**\n\n```ts\nconst answer = 42\n```',
        })}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Bold text').tagName).toBe('STRONG');
    expect(screen.getByTestId('message-card')).toHaveTextContent('const answer = 42');
  });

  it('renders markdown links, lists, blockquotes, tables, and inline code', () => {
    render(
      <MessageCard
        msg={message({
          content: [
            '[Docs](https://example.com)',
            '',
            '- first',
            '1. second',
            '',
            '> quote',
            '',
            '| A | B |',
            '| - | - |',
            '| C | D |',
            '',
            '`inline`',
          ].join('\n'),
        })}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('first').tagName).toBe('LI');
    expect(screen.getByText('second').tagName).toBe('LI');
    expect(screen.getByText('quote')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('inline').tagName).toBe('CODE');
  });

  it('shows file count when context files are present', () => {
    render(<MessageCard msg={message({ contextFiles: ['a.ts', 'b.ts'] })} onCancel={vi.fn()} />);

    expect(screen.getByText(/2 files/)).toBeInTheDocument();
  });

  it('formats token counts above 1000 as k values', () => {
    render(
      <MessageCard
        msg={message({ usage: { input_tokens: 700, output_tokens: 500 } })}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/1.2k tokens/)).toBeInTheDocument();
  });

  it('formats latency above 1000ms as seconds', () => {
    render(<MessageCard msg={message({ startedAt: 1000, endedAt: 4200 })} onCancel={vi.fn()} />);

    expect(screen.getByText(/3.2s/)).toBeInTheDocument();
  });

  it('uses the error class for error messages', () => {
    render(<MessageCard msg={message({ error: true })} onCancel={vi.fn()} />);

    expect(screen.getByTestId('message-card')).toHaveClass('message-card--error');
  });

  it('returns null for empty, non-streaming content', () => {
    render(<MessageCard msg={message({ content: '', streaming: false })} onCancel={vi.fn()} />);

    expect(screen.queryByTestId('message-card')).not.toBeInTheDocument();
  });
});
