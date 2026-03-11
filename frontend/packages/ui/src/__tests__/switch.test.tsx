import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../components/switch';

describe('Switch', () => {
  it('renders as a switch role', () => {
    render(<Switch aria-label="Dark mode" />);
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeInTheDocument();
  });

  it('toggles when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Dark mode" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('can be disabled', () => {
    render(<Switch aria-label="Dark mode" disabled />);
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeDisabled();
  });

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Dark mode" disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('reflects checked state', () => {
    render(<Switch aria-label="Dark mode" checked />);
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeChecked();
  });
});
