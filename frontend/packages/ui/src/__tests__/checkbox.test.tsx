import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../components/checkbox';

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
  });

  it('renders without label', () => {
    render(<Checkbox aria-label="Toggle" />);
    expect(screen.getByRole('checkbox', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('toggles when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept terms" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Accept terms' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('shows error message', () => {
    render(<Checkbox label="Accept terms" error="You must accept" />);
    expect(screen.getByRole('alert')).toHaveTextContent('You must accept');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Checkbox label="Accept terms" disabled />);
    expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeDisabled();
  });
});
