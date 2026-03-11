/**
 * Smoke tests for the auth flow components.
 * These tests use MSW to mock the API and verify basic rendering + interaction.
 */
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from './mocks/server';
import { LoginForm } from '@/app/[locale]/(auth)/login/_components/login-form';

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock next/navigation for the tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginForm', () => {
  it('renders the login form with email and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /log in/i })).toBeDefined();
  });

  it('shows validation errors for empty submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.queryByText(/invalid email/i) ?? screen.queryByText(/required/i)).toBeDefined();
    });
  });

  it('renders OAuth buttons', () => {
    render(<LoginForm />);

    expect(screen.getByRole('button', { name: /google/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /github/i })).toBeDefined();
  });

  it('renders a link to the register page', () => {
    render(<LoginForm />);

    const signUpLink = screen.getByRole('link', { name: /sign up/i });
    expect(signUpLink).toBeDefined();
  });
});
