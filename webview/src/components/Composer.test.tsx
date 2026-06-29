import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from './Composer';
import type { JitoMode } from '../types';

const modes: Array<{ mode: JitoMode; label: string }> = [
  { mode: 'dev', label: 'Dev' },
  { mode: 'reason', label: 'Reason' },
  { mode: 'create', label: 'Create' },
  { mode: 'audit', label: 'Audit' },
  { mode: 'universal', label: 'Universal' },
];

function renderComposer(props: Partial<React.ComponentProps<typeof Composer>> = {}) {
  return render(
    <Composer
      onSend={vi.fn()}
      disabled={false}
      mode="dev"
      {...props}
    />,
  );
}

describe('Composer', () => {
  it('renders textarea, send button, char counter, and mode mini-pill', () => {
    renderComposer();

    expect(screen.getByRole('textbox', { name: 'Message composer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(screen.getByText('0 chars')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active mode Dev' })).toBeInTheDocument();
  });

  it('disables the send button when the text is empty', () => {
    renderComposer();

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('disables the send button when disabled is true', async () => {
    const user = userEvent.setup();

    renderComposer({ disabled: true });
    await user.type(screen.getByRole('textbox', { name: 'Message composer' }), 'hello');

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('sends trimmed text with Cmd+Enter', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    renderComposer({ onSend });
    const textbox = screen.getByRole('textbox', { name: 'Message composer' });
    await user.type(textbox, '  ship it  ');
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    expect(onSend).toHaveBeenCalledWith('ship it');
    expect(textbox).toHaveValue('');
  });

  it('sends trimmed text with Ctrl+Enter', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    renderComposer({ onSend });
    await user.type(screen.getByRole('textbox', { name: 'Message composer' }), 'run tests');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSend).toHaveBeenCalledWith('run tests');
  });

  it('toggles the slash-command palette from the slash button', async () => {
    const user = userEvent.setup();

    renderComposer();
    const slashButton = screen.getByRole('button', { name: 'Open slash commands' });
    await user.click(slashButton);

    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
    expect(slashButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(slashButton);
    expect(screen.queryByRole('listbox', { name: 'Slash commands' })).not.toBeInTheDocument();
    expect(slashButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the slash-command palette when typing slash in an empty textarea', async () => {
    const user = userEvent.setup();

    renderComposer();
    await user.type(screen.getByRole('textbox', { name: 'Message composer' }), '/');

    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
  });

  it('closes the slash-command palette when clicking outside', async () => {
    const user = userEvent.setup();

    renderComposer();
    await user.click(screen.getByRole('button', { name: 'Open slash commands' }));
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole('listbox', { name: 'Slash commands' })).not.toBeInTheDocument();
  });

  it('closes the slash-command palette with Escape', async () => {
    const user = userEvent.setup();

    renderComposer();
    await user.click(screen.getByRole('button', { name: 'Open slash commands' }));
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox', { name: 'Slash commands' })).not.toBeInTheDocument();
  });

  it('focuses the textarea from the attach button', async () => {
    const user = userEvent.setup();

    renderComposer();
    await user.click(screen.getByRole('button', { name: 'Attach file' }));

    expect(screen.getByRole('textbox', { name: 'Message composer' })).toHaveFocus();
  });

  it('inserts a selected palette command into the textarea', async () => {
    const user = userEvent.setup();

    renderComposer();
    await user.click(screen.getByRole('button', { name: 'Open slash commands' }));
    await user.click(screen.getByRole('option', { name: /\/review Review code for issues/ }));

    expect(screen.getByRole('textbox', { name: 'Message composer' })).toHaveValue('/review ');
    expect(screen.queryByRole('listbox', { name: 'Slash commands' })).not.toBeInTheDocument();
  });

  it('leaves existing text unchanged when selecting a palette command', async () => {
    const user = userEvent.setup();

    renderComposer();
    const textbox = screen.getByRole('textbox', { name: 'Message composer' });
    await user.type(textbox, 'existing text');
    await user.click(screen.getByRole('button', { name: 'Open slash commands' }));
    await user.click(screen.getByRole('option', { name: /\/test Generate tests/ }));

    expect(textbox).toHaveValue('existing text');
    expect(screen.queryByRole('listbox', { name: 'Slash commands' })).not.toBeInTheDocument();
  });

  it('closes the palette when text changes to non-slash content', async () => {
    const user = userEvent.setup();

    renderComposer();
    const textbox = screen.getByRole('textbox', { name: 'Message composer' });
    await user.click(screen.getByRole('button', { name: 'Open slash commands' }));
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();

    await user.type(textbox, 'hello');
    expect(screen.queryByRole('listbox', { name: 'Slash commands' })).not.toBeInTheDocument();
  });

  it('shows the char count and warn class past 8000 chars', () => {
    renderComposer();
    const textbox = screen.getByRole('textbox', { name: 'Message composer' });

    fireEvent.change(textbox, { target: { value: 'a'.repeat(8001) } });

    expect(screen.getByText('8,001 chars')).toHaveClass('composer__counter--warn');
  });

  it.each(modes)('shows the correct mini-pill for $label mode', ({ mode, label }) => {
    renderComposer({ mode });

    const pill = screen.getByRole('button', { name: `Active mode ${label}` });
    expect(pill).toHaveAttribute('data-mode', mode);
    expect(pill.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
