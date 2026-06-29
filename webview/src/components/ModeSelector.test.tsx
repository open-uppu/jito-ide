import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModeSelector } from './ModeSelector';
import type { JitoMode } from '../types';

const modes: JitoMode[] = ['dev', 'reason', 'create', 'audit', 'universal'];
const labels = ['Dev', 'Reason', 'Create', 'Audit', 'Universal'];

describe('ModeSelector', () => {
  it('renders all five mode buttons', () => {
    render(<ModeSelector value="dev" onChange={vi.fn()} disabled={false} />);

    for (const label of labels) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    }
  });

  it('highlights the active mode with aria-checked', () => {
    render(<ModeSelector value="audit" onChange={vi.fn()} disabled={false} />);

    expect(screen.getByRole('radio', { name: 'Audit' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Dev' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ModeSelector value="dev" onChange={onChange} disabled={false} />);
    await user.click(screen.getByRole('radio', { name: 'Reason' }));

    expect(onChange).toHaveBeenCalledWith('reason');
  });

  it('disables all buttons when disabled is true', () => {
    render(<ModeSelector value="dev" onChange={vi.fn()} disabled />);

    for (const mode of modes) {
      expect(screen.getByRole('radio', { name: labels[modes.indexOf(mode)] })).toBeDisabled();
    }
  });

  it('uses radiogroup and radio roles', () => {
    render(<ModeSelector value="universal" onChange={vi.fn()} disabled={false} />);

    expect(screen.getByRole('radiogroup', { name: 'Chat mode' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });
});
