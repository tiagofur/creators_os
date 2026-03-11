import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/button';

describe('Button', () => {
  describe('variants', () => {
    it('renders default variant', () => {
      render(<Button>Default</Button>);
      expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument();
    });

    it('renders destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument();
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument();
    });

    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('sets aria-busy="true" when loading', () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole('button', { name: 'Submit' });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('does not set aria-busy when not loading', () => {
      render(<Button>Submit</Button>);
      const button = screen.getByRole('button', { name: 'Submit' });
      expect(button).not.toHaveAttribute('aria-busy');
    });

    it('is disabled when loading', () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    });

    it('does not call onClick while loading', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Submit
        </Button>,
      );
      // Button is disabled, so click should not fire
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Submit
        </Button>,
      );
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('asChild', () => {
    it('renders as the child element type when asChild is used', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });
  });

  describe('onClick', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click me</Button>);
      await user.click(screen.getByRole('button', { name: 'Click me' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
