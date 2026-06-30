import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Onboarding } from './Onboarding';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('Onboarding', () => {
  it('does not render when seen flag matches current version', () => {
    localStorage.setItem('jito-onboarding-seen', 'v0.2.0');
    render(<Onboarding />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog when no flag is set', () => {
    render(<Onboarding />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to jito/i)).toBeInTheDocument();
  });

  it('re-renders for users on an older version (upgrade path)', () => {
    localStorage.setItem('jito-onboarding-seen', 'v0.1.0');
    render(<Onboarding />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('advances through all 4 steps when clicking Next', async () => {
    const user = userEvent.setup();
    render(<Onboarding onComplete={vi.fn()} />);

    expect(screen.getByText(/Welcome to jito/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Pick your mode/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Add files to context/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Slash commands/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get started/i })).toBeInTheDocument();
  });

  it('writes the seen flag and calls onComplete on the last step', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<Onboarding onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Get started/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('jito-onboarding-seen')).toBe('v0.2.0');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('writes the seen flag and calls onSkip when Skip is clicked', async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(<Onboarding onSkip={onSkip} />);

    await user.click(screen.getByRole('button', { name: /Skip/i }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('jito-onboarding-seen')).toBe('v0.2.0');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('dismisses on Escape key', () => {
    const onSkip = vi.fn();
    render(<Onboarding onSkip={onSkip} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('jito-onboarding-seen')).toBe('v0.2.0');
  });

  it('Back button goes to previous step and is disabled on step 0', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    expect(screen.queryByRole('button', { name: /Back/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Back/i }));

    expect(screen.getByText(/Welcome to jito/i)).toBeInTheDocument();
  });
});
