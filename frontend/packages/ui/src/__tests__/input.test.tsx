import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../components/input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders without label', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  describe('error state', () => {
    it('shows error message', () => {
      render(<Input label="Email" error="Invalid email" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
    });

    it('sets aria-invalid when error is present', () => {
      render(<Input label="Email" error="Invalid email" />);
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error with input via aria-describedby', () => {
      render(<Input label="Email" error="Invalid email" />);
      const input = screen.getByLabelText('Email');
      const errorId = input.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId!)).toHaveTextContent('Invalid email');
    });
  });

  describe('hint', () => {
    it('shows hint text when no error', () => {
      render(<Input label="Name" hint="Enter your full name" />);
      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    });

    it('hides hint when error is present', () => {
      render(<Input label="Name" hint="Enter your full name" error="Required" />);
      expect(screen.queryByText('Enter your full name')).not.toBeInTheDocument();
    });
  });

  describe('onChange', () => {
    it('handles onChange', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input label="Name" onChange={onChange} />);
      await user.type(screen.getByLabelText('Name'), 'hello');
      expect(onChange).toHaveBeenCalledTimes(5);
    });
  });
});
