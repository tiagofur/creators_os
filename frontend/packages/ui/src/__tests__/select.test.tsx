import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/select';

function TestSelect() {
  return (
    <Select>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe('Select', () => {
  it('renders the trigger with placeholder', () => {
    render(<TestSelect />);
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toBeInTheDocument();
  });

  it('opens when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);

    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cherry' })).toBeInTheDocument();
  });

  it('selects an option when clicked', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);

    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('option', { name: 'Banana' }));

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
