import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/dialog';

function TestDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <button>Open Dialog</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Dialog Title</DialogTitle>
          <DialogDescription>Test dialog description</DialogDescription>
        </DialogHeader>
        <input placeholder="Focus target" />
        <button>Action</button>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('opens when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open Dialog' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Dialog Title')).toBeInTheDocument();
    expect(screen.getByText('Test dialog description')).toBeInTheDocument();
  });

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<TestDialog defaultOpen />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<TestDialog defaultOpen />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('traps focus inside when open', async () => {
    const user = userEvent.setup();
    render(<TestDialog defaultOpen />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // The dialog should contain the focused element
    const dialog = screen.getByRole('dialog');

    // Tab through elements inside the dialog
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    // After tabbing through all elements, focus should cycle back (trapped)
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
