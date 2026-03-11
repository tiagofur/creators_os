import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, ToastTitle, ToastDescription } from '../components/toast';

describe('Toast', () => {
  it('renders with title and description', () => {
    render(
      <Toast>
        <ToastTitle>Success</ToastTitle>
        <ToastDescription>Operation completed</ToastDescription>
      </Toast>,
    );
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('renders default variant', () => {
    render(<Toast>Default toast</Toast>);
    expect(screen.getByText('Default toast')).toBeInTheDocument();
  });

  it('renders destructive variant', () => {
    render(<Toast variant="destructive">Error toast</Toast>);
    expect(screen.getByText('Error toast')).toBeInTheDocument();
  });

  it('renders success variant', () => {
    render(<Toast variant="success">Success toast</Toast>);
    expect(screen.getByText('Success toast')).toBeInTheDocument();
  });

  it('renders close button when onClose is provided', () => {
    render(<Toast onClose={() => {}}>Closable</Toast>);
    expect(screen.getByRole('button', { name: 'Close notification' })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Toast onClose={onClose}>Closable</Toast>);
    await user.click(screen.getByRole('button', { name: 'Close notification' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(<Toast>No close</Toast>);
    expect(screen.queryByRole('button', { name: 'Close notification' })).not.toBeInTheDocument();
  });
});
