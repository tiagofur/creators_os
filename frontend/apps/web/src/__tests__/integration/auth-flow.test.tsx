/**
 * TASK-612: RTL integration tests — auth flow (using MSW).
 *
 * 1. Register: fill form, submit, MSW returns 201, user redirected to onboarding
 * 2. Token refresh: API returns 401, refresh handler returns new token, original request retries
 * 3. Refresh failure: API returns 401, refresh returns 401, user redirected to login
 */
import {
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000';

// Track navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  mockPush.mockClear();
  mockReplace.mockClear();
});
afterAll(() => server.close());

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @ordo/stores
const mockSetAccessToken = vi.fn();
const mockSetUser = vi.fn();
const mockLogout = vi.fn();
let mockAccessToken: string | null = null;

vi.mock('@ordo/stores', () => ({
  useAuthStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        accessToken: mockAccessToken,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        setAccessToken: mockSetAccessToken,
        setUser: mockSetUser,
        logout: mockLogout,
        setLoading: vi.fn(),
      }),
    {
      getState: () => ({
        accessToken: mockAccessToken,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        setAccessToken: mockSetAccessToken,
        setUser: mockSetUser,
        logout: mockLogout,
        setLoading: vi.fn(),
      }),
    },
  ),
  useWorkspaceStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ activeWorkspaceId: 'workspace-1', activeWorkspace: { id: 'workspace-1' }, tier: 'free' }),
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({}),
}));

describe('Auth Integration: Registration flow', () => {
  beforeEach(() => {
    mockAccessToken = null;
    mockSetAccessToken.mockClear();
    mockSetUser.mockClear();
  });

  it('completes registration and redirects to onboarding', async () => {
    const user = userEvent.setup();

    // MSW already has a register handler returning 201 with tokens
    const { RegisterForm } = await import(
      '@/app/[locale]/(auth)/register/_components/register-form'
    );

    render(<RegisterForm />);

    // Fill in the registration form
    await user.type(screen.getByLabelText(/full name/i), 'Jane Smith');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');

    const passwordFields = screen.getAllByLabelText(/password/i);
    // First password field
    await user.type(passwordFields[0], 'SecurePass123!');
    // Confirm password field
    await user.type(passwordFields[1], 'SecurePass123!');

    // Accept terms
    await user.click(screen.getByRole('checkbox'));

    // Submit
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Wait for the form submission to complete
    await waitFor(() => {
      expect(mockSetAccessToken).toHaveBeenCalledWith('mock-access-token');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/onboarding');
    });
  });

  it('shows error when registration fails', async () => {
    const user = userEvent.setup();

    // Override the register handler to return an error
    server.use(
      http.post(`${API_BASE}/v1/auth/register`, () => {
        return HttpResponse.json(
          { status: 400, code: 'EMAIL_TAKEN', message: 'Email already in use' },
          { status: 400 },
        );
      }),
    );

    const { RegisterForm } = await import(
      '@/app/[locale]/(auth)/register/_components/register-form'
    );

    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Jane Smith');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');

    const passwordFields = screen.getAllByLabelText(/password/i);
    await user.type(passwordFields[0], 'SecurePass123!');
    await user.type(passwordFields[1], 'SecurePass123!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('Auth Integration: Token refresh flow', () => {
  beforeEach(() => {
    mockAccessToken = 'expired-token';
    mockSetAccessToken.mockClear();
    mockLogout.mockClear();
  });

  it('retries the original request after a successful token refresh', async () => {
    let callCount = 0;

    // First call returns 401, second (retry) returns 200
    server.use(
      http.get(`${API_BASE}/v1/ideas`, () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            { status: 401, code: 'UNAUTHORIZED', message: 'Token expired' },
            { status: 401 },
          );
        }
        return HttpResponse.json({
          data: [{ id: 'idea-1', title: 'Refreshed idea' }],
          meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
        });
      }),
      // Refresh succeeds
      http.post('/api/auth/refresh', () => {
        return HttpResponse.json({
          access_token: 'new-refreshed-token',
          expires_in: 3600,
        });
      }),
    );

    // Use the apiClient directly to test the refresh flow
    const { createApiClient } = await import('@ordo/api-client');

    const client = createApiClient({
      baseUrl: API_BASE,
      getAccessToken: () => mockAccessToken,
      onUnauthorized: mockLogout,
    });

    const result = await client.get<{ data: { id: string; title: string }[] }>('/v1/ideas');

    expect(callCount).toBe(2);
    expect(result.data[0].title).toBe('Refreshed idea');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('redirects to login when refresh token also fails (401)', async () => {
    server.use(
      // API returns 401
      http.get(`${API_BASE}/v1/ideas`, () => {
        return HttpResponse.json(
          { status: 401, code: 'UNAUTHORIZED', message: 'Token expired' },
          { status: 401 },
        );
      }),
      // Refresh also fails with 401
      http.post('/api/auth/refresh', () => {
        return HttpResponse.json(
          { status: 401, code: 'REFRESH_EXPIRED', message: 'Refresh token expired' },
          { status: 401 },
        );
      }),
    );

    const { createApiClient } = await import('@ordo/api-client');

    const client = createApiClient({
      baseUrl: API_BASE,
      getAccessToken: () => mockAccessToken,
      onUnauthorized: mockLogout,
    });

    await expect(client.get('/v1/ideas')).rejects.toThrow();

    expect(mockLogout).toHaveBeenCalled();
  });
});
