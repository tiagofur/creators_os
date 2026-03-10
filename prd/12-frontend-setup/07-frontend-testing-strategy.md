# Frontend Testing Strategy — Ordo Creator OS

**Document Version:** 1.0
**Last Updated:** 2026-03-10
**Status:** Active
**Applies To:** Next.js web app, React Native mobile app

---

## Executive Summary

The Ordo Creator OS frontend testing strategy implements a **test pyramid** with **unit tests (70%), integration tests (20%), and E2E tests (10%)**. Testing covers:

- **Unit tests** via Vitest + React Testing Library for components and hooks
- **Integration tests** for multi-component workflows (login, project creation, publishing)
- **E2E tests** via Playwright for critical user paths
- **Visual regression** with Playwright screenshots and Storybook
- **Accessibility testing** with axe-core
- **Performance testing** with Lighthouse CI and bundle analysis
- **React Native** with jest-expo and React Native Testing Library
- **API mocking** with MSW (Mock Service Worker)

**Coverage Targets:**
- **Overall:** 70% coverage
- **Shared packages** (`packages/ui`, `packages/hooks`): 90% coverage

---

## 1. Testing Architecture

### Test Pyramid Overview

```
                    ▲
                   ╱ ╲
                  ╱   ╲           E2E Tests (10%)
                 ╱     ╲          10-15 critical paths
                ╱───────╲
               ╱         ╲        Integration Tests (20%)
              ╱           ╲       30-40 workflows
             ╱─────────────╲
            ╱               ╲     Unit Tests (70%)
           ╱                 ╲    200+ test cases
          ╱___________________╲
```

### Testing Levels & Scope

#### Unit Tests (70% — ~200 test cases)

**What to test:**
- Presentational components (Button, Input, Modal, etc.)
- Form validation logic
- Custom hooks (useAuth, useMediaUpload, useDebounce)
- Zustand stores and selectors
- Utility functions
- Single component behavior in isolation

**Tools:**
- Vitest (fast, ESM-native, built on Vite)
- React Testing Library (component testing)
- @testing-library/react-native (mobile)

**Example:**
```typescript
// src/components/Button/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with variant prop', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
  });

  it('calls onClick handler on click', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('disables when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### Integration Tests (20% — ~40 test cases)

**What to test:**
- Multi-component workflows (login flow, project creation)
- API calls with MSW mocking
- Store interactions with components
- Navigation flows
- Form submission with validation

**Tools:**
- Vitest + React Testing Library
- MSW for API mocking
- Custom test utilities and fixtures

**Example:**
```typescript
// src/__tests__/integration/auth-flow.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import { renderWithProviders } from '@/__tests__/test-utils';
import { server } from '@/__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Login Flow', () => {
  beforeEach(() => {
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({ token: 'abc123', user: { id: '1', email: 'test@example.com' } });
      })
    );
  });

  it('completes login flow and stores token', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    });

    // Token should be stored
    expect(localStorage.getItem('authToken')).toBe('abc123');
  });
});
```

#### E2E Tests (10% — ~15 critical paths)

**What to test:**
- User signup → project creation → media upload → publish
- Login flow → editor → save changes
- Profile settings → avatar upload
- Sharing and collaboration features
- Mobile app critical paths

**Tools:**
- Playwright
- Page Object Model pattern
- Realistic test data

**Example:**
```typescript
// e2e/critical-paths.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';

test.describe('Critical User Paths', () => {
  test('signup → create project → upload media → publish', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);

    // Signup
    await loginPage.goto();
    await loginPage.signupWithEmail('newuser@example.com', 'Password123!');

    // Create project
    await dashboardPage.goto();
    await dashboardPage.clickCreateProject();
    await dashboardPage.fillProjectForm('My First Project', 'A test project');
    await dashboardPage.confirmProjectCreation();

    // Upload media
    await editorPage.goto();
    await editorPage.uploadMedia('test-image.jpg');
    await expect(editorPage.mediaPanel).toContainText('test-image.jpg');

    // Publish
    await editorPage.clickPublish();
    await expect(page).toHaveURL(/\/projects\/\d+\/published/);
  });
});
```

---

## 2. Vitest Configuration

### Root vitest.config.ts

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { getWorkspaces } from './scripts/get-workspaces';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/mocks/**',
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
      // Per-package thresholds
      perFile: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/mocks': path.resolve(__dirname, './src/__tests__/mocks'),
    },
  },
});
```

### Monorepo Workspace Configuration

```typescript
// vitest.workspace.ts (root)
import { getWorkspacePackages } from 'vitest/config';
import { defineProject } from 'vitest/config';

export default [
  defineProject({
    test: {
      name: 'unit',
      include: ['packages/**/__tests__/**/*.test.{ts,tsx}'],
      coverage: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  }),
  defineProject({
    test: {
      name: 'integration',
      include: ['src/__tests__/integration/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      coverage: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  }),
];
```

### vitest.setup.ts

```typescript
// vitest.setup.ts
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { server } from './src/__tests__/mocks/server';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
```

---

## 3. React Testing Library Setup

### Custom Render Function with Providers

```typescript
// src/__tests__/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useEditorStore } from '@/stores/editorStore';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { I18nProvider } from '@/providers/I18nProvider';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuthState?: Partial<typeof useAuthStore.getState()>;
  initialEditorState?: Partial<typeof useEditorStore.getState()>;
  queryClient?: QueryClient;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const Wrapper: React.FC<{ children: React.ReactNode; queryClient: QueryClient }> = ({
  children,
  queryClient,
}) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider initialTheme="light">
      <I18nProvider initialLocale="en">
        {children}
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export function renderWithProviders(
  ui: ReactElement,
  {
    initialAuthState,
    initialEditorState,
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  // Initialize stores if provided
  if (initialAuthState) {
    useAuthStore.setState(initialAuthState);
  }
  if (initialEditorState) {
    useEditorStore.setState(initialEditorState);
  }

  return render(ui, {
    wrapper: ({ children }) => (
      <Wrapper queryClient={queryClient}>
        {children}
      </Wrapper>
    ),
    ...renderOptions,
  });
}

export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
```

### Test Utilities

```typescript
// src/__tests__/helpers/test-helpers.ts
import { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';

/**
 * Wait for async queries to settle
 */
export async function waitForQueryToSettle(
  queryClient: QueryClient,
  timeout = 1000
) {
  return new Promise((resolve) => {
    let isSettled = false;
    const check = () => {
      if (queryClient.getQueryCache().findAll().every(q => q.getObserversCount() === 0)) {
        isSettled = true;
        resolve(true);
      }
    };
    const interval = setInterval(check, 50);
    setTimeout(() => clearInterval(interval), timeout);
  });
}

/**
 * Create mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    role: 'creator',
    ...overrides,
  };
}

/**
 * Create mock project object
 */
export function createMockProject(overrides = {}) {
  return {
    id: '1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    published: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## 4. Component Unit Tests

### Button Component

```typescript
// src/components/Button/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('Variants', () => {
    it('renders primary variant with correct styles', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('border', 'border-gray-300');
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Delete</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-red-600');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('renders small button', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-2', 'py-1', 'text-sm');
    });

    it('renders medium button (default)', () => {
      render(<Button>Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('renders large button', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading state', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible name', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    });

    it('supports aria-disabled', () => {
      const { rerender } = render(<Button aria-disabled="false">Click</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'false');

      rerender(<Button aria-disabled="true">Click</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
```

### Form Validation

```typescript
// src/components/Form/__tests__/Form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from '../Form';

describe('Form Component', () => {
  it('validates required field', async () => {
    const user = userEvent.setup();
    render(
      <Form onSubmit={vi.fn()}>
        <Form.Input name="email" label="Email" required />
        <Form.Submit>Submit</Form.Submit>
      </Form>
    );

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(
      <Form onSubmit={vi.fn()}>
        <Form.Input name="email" label="Email" type="email" />
        <Form.Submit>Submit</Form.Submit>
      </Form>
    );

    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  it('shows success state after valid submission', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Form onSubmit={onSubmit}>
        <Form.Input name="email" label="Email" type="email" />
        <Form.Submit>Submit</Form.Submit>
      </Form>
    );

    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  it('displays multiple field errors', async () => {
    const user = userEvent.setup();
    render(
      <Form onSubmit={vi.fn()}>
        <Form.Input name="email" label="Email" type="email" required />
        <Form.Input name="password" label="Password" type="password" required minLength={8} />
        <Form.Submit>Submit</Form.Submit>
      </Form>
    );

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });
});
```

### Modal Component

```typescript
// src/components/Modal/__tests__/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal Component', () => {
  it('renders modal when open is true', () => {
    render(
      <Modal open={true} title="Test Modal">
        Modal content
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <Modal open={false} title="Test Modal">
        Modal content
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        Modal content
      </Modal>
    );

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} backdrop="click" title="Test Modal">
        Modal content
      </Modal>
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('traps focus within modal', async () => {
    const user = userEvent.setup();
    render(
      <Modal open={true} title="Test Modal">
        <button>First</button>
        <button>Last</button>
      </Modal>
    );

    const firstButton = screen.getByRole('button', { name: 'First' });
    const lastButton = screen.getByRole('button', { name: 'Last' });

    firstButton.focus();
    await user.tab({ shift: true }); // Shift+Tab on first element

    // Focus should cycle to last focusable element
    expect(lastButton).toHaveFocus();
  });
});
```

### Toast Notifications

```typescript
// src/components/Toast/__tests__/Toast.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Toast } from '../Toast';
import { useUIStore } from '@/stores/uiStore';

describe('Toast Component', () => {
  beforeEach(() => {
    useUIStore.getState().clearAll();
  });

  it('displays success toast', () => {
    render(<Toast />);
    useUIStore.getState().success('Operation successful');

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-green-500');
  });

  it('displays error toast', () => {
    render(<Toast />);
    useUIStore.getState().error('An error occurred');

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-red-500');
  });

  it('displays warning toast', () => {
    render(<Toast />);
    useUIStore.getState().warning('Warning message');

    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-yellow-500');
  });

  it('auto-dismisses toast after duration', async () => {
    vi.useFakeTimers();
    render(<Toast />);
    useUIStore.getState().success('Auto dismiss', { duration: 3000 });

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    vi.advanceTimersByTime(3000);
    await waitFor(() => {
      expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('removes toast when close button clicked', async () => {
    const user = userEvent.setup();
    render(<Toast />);
    useUIStore.getState().success('Dismissible toast');

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(screen.queryByText('Dismissible toast')).not.toBeInTheDocument();
  });
});
```

---

## 5. Hook Testing

### useAuth Hook

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useAuthStore } from '@/stores/authStore';
import { server } from '@/__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('returns authenticated user after login', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({
          token: 'test-token',
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        });
      })
    );

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();

    act(() => {
      result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login error', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      })
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login('test@example.com', 'wrongpassword');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.user).toBeNull();
  });

  it('persists token to localStorage', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({
          token: 'persistent-token',
          user: { id: '1', email: 'test@example.com' },
        });
      })
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('persistent-token');
    });
  });

  it('clears token on logout', async () => {
    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com', name: 'Test' },
      token: 'test-token',
    });

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('refreshes token before expiry', async () => {
    vi.useFakeTimers();
    server.use(
      http.post('/api/auth/refresh', () => {
        return HttpResponse.json({ token: 'refreshed-token' });
      })
    );

    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com' },
      token: 'expiring-token',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    const { result } = renderHook(() => useAuth());

    // Advance to 1 minute before expiry
    vi.advanceTimersByTime(4 * 60 * 1000);

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('refreshed-token');
    });

    vi.useRealTimers();
  });
});
```

### useMediaUpload Hook

```typescript
// src/hooks/__tests__/useMediaUpload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMediaUpload } from '../useMediaUpload';
import { server } from '@/__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useMediaUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads file and returns media object', async () => {
    server.use(
      http.post('/api/media/upload', async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        return HttpResponse.json({
          id: 'media-1',
          filename: file.name,
          url: 'https://example.com/media-1.jpg',
          type: 'image',
          size: file.size,
        });
      })
    );

    const { result } = renderHook(() => useMediaUpload());
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.upload(file);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.media).toEqual({
      id: 'media-1',
      filename: 'test.jpg',
      url: 'https://example.com/media-1.jpg',
      type: 'image',
      size: expect.any(Number),
    });
  });

  it('tracks upload progress', async () => {
    const progressUpdates: number[] = [];

    server.use(
      http.post('/api/media/upload', async () => {
        // Simulate progress events
        await new Promise(resolve => setTimeout(resolve, 100));
        return HttpResponse.json({
          id: 'media-1',
          filename: 'test.jpg',
          url: 'https://example.com/media-1.jpg',
        });
      })
    );

    const { result } = renderHook(() => useMediaUpload());
    const file = new File(['x'.repeat(1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.upload(file, (progress) => {
        progressUpdates.push(progress);
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });

  it('handles upload error', async () => {
    server.use(
      http.post('/api/media/upload', () => {
        return HttpResponse.json(
          { error: 'File too large' },
          { status: 413 }
        );
      })
    );

    const { result } = renderHook(() => useMediaUpload());
    const file = new File(['x'.repeat(100 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.upload(file);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('File too large');
    expect(result.current.media).toBeNull();
  });

  it('validates file type', () => {
    const { result } = renderHook(() => useMediaUpload());
    const invalidFile = new File(['content'], 'test.exe', { type: 'application/octet-stream' });

    act(() => {
      result.current.upload(invalidFile);
    });

    expect(result.current.error).toContain('Invalid file type');
  });

  it('validates file size', () => {
    const { result } = renderHook(() => useMediaUpload({
      maxSize: 5 * 1024 * 1024, // 5MB
    }));
    const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.upload(largeFile);
    });

    expect(result.current.error).toContain('File too large');
  });
});
```

### useDebounce Hook

```typescript
// src/hooks/__tests__/useDebounce.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // Not updated yet

    vi.advanceTimersByTime(500);
    expect(result.current).toBe('updated');
  });

  it('resets debounce timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    );

    rerender({ value: 'ab', delay: 500 });
    vi.advanceTimersByTime(200);

    rerender({ value: 'abc', delay: 500 });
    vi.advanceTimersByTime(200); // Not enough to trigger

    expect(result.current).toBe('a');

    vi.advanceTimersByTime(300); // Now total is 500ms from last change
    expect(result.current).toBe('abc');
  });

  it('updates immediately when delay is 0', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 0 });
    expect(result.current).toBe('updated'); // Immediate
  });
});
```

### useInfiniteScroll Hook

```typescript
// src/hooks/__tests__/useInfiniteScroll.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';
import { useInfiniteQuery } from '@tanstack/react-query';
import { server } from '@/__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
  };
});

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads more data on scroll to bottom', async () => {
    const mockInfiniteQuery = {
      data: { pages: [[{ id: 1 }, { id: 2 }]] },
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    };

    vi.mocked(useInfiniteQuery).mockReturnValue(mockInfiniteQuery as any);

    const { result } = renderHook(() => useInfiniteScroll({
      queryKey: ['items'],
      queryFn: ({ pageParam }) => Promise.resolve([]),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }));

    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);

    act(() => {
      result.current.onLoadMore();
    });

    expect(mockInfiniteQuery.fetchNextPage).toHaveBeenCalled();
  });

  it('handles loading state correctly', () => {
    const mockInfiniteQuery = {
      data: { pages: [] },
      isFetching: true,
      isFetchingNextPage: true,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
    };

    vi.mocked(useInfiniteQuery).mockReturnValue(mockInfiniteQuery as any);

    const { result } = renderHook(() => useInfiniteScroll({
      queryKey: ['items'],
      queryFn: ({ pageParam }) => Promise.resolve([]),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasMore).toBe(true);
  });

  it('prevents multiple simultaneous loads', () => {
    const mockInfiniteQuery = {
      data: { pages: [[{ id: 1 }]] },
      isFetchingNextPage: true,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
    };

    vi.mocked(useInfiniteQuery).mockReturnValue(mockInfiniteQuery as any);

    const { result } = renderHook(() => useInfiniteScroll({
      queryKey: ['items'],
      queryFn: ({ pageParam }) => Promise.resolve([]),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }));

    act(() => {
      result.current.onLoadMore();
      result.current.onLoadMore();
    });

    expect(mockInfiniteQuery.fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
```

---

## 6. Store Testing (Zustand)

### Auth Store

```typescript
// src/stores/__tests__/authStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  describe('setUser', () => {
    it('sets user and marks as authenticated', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      useAuthStore.getState().setUser(user);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('setToken', () => {
    it('sets token and stores in localStorage', () => {
      useAuthStore.getState().setToken('test-token');

      expect(useAuthStore.getState().token).toBe('test-token');
      expect(localStorage.getItem('authToken')).toBe('test-token');
    });

    it('handles null token', () => {
      useAuthStore.getState().setToken('test-token');
      useAuthStore.getState().setToken(null);

      expect(useAuthStore.getState().token).toBeNull();
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears user and token', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        token: 'test-token',
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('selectors', () => {
    it('useUserEmail selector', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });

      const email = useAuthStore(state => state.user?.email);
      expect(email).toBe('test@example.com');
    });

    it('useIsAuthenticated selector', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });
});
```

### Editor Store

```typescript
// src/stores/__tests__/editorStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editorStore';

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  describe('addBlock', () => {
    it('adds a new block to the content', () => {
      const block = { id: 'block-1', type: 'text', content: 'Hello' };
      useEditorStore.getState().addBlock(block);

      expect(useEditorStore.getState().blocks).toContainEqual(block);
    });

    it('generates unique ID if not provided', () => {
      useEditorStore.getState().addBlock({ type: 'text', content: 'Hello' });

      const blocks = useEditorStore.getState().blocks;
      expect(blocks[0].id).toBeDefined();
      expect(blocks[0].id).toMatch(/^block-/);
    });
  });

  describe('updateBlock', () => {
    it('updates existing block', () => {
      useEditorStore.getState().addBlock({ id: 'block-1', type: 'text', content: 'Hello' });
      useEditorStore.getState().updateBlock('block-1', { content: 'Updated' });

      const block = useEditorStore.getState().blocks[0];
      expect(block.content).toBe('Updated');
    });

    it('does nothing if block not found', () => {
      useEditorStore.getState().addBlock({ id: 'block-1', type: 'text', content: 'Hello' });
      useEditorStore.getState().updateBlock('non-existent', { content: 'Updated' });

      expect(useEditorStore.getState().blocks[0].content).toBe('Hello');
    });
  });

  describe('deleteBlock', () => {
    it('removes block by ID', () => {
      useEditorStore.getState().addBlock({ id: 'block-1', type: 'text', content: 'Hello' });
      useEditorStore.getState().addBlock({ id: 'block-2', type: 'text', content: 'World' });

      useEditorStore.getState().deleteBlock('block-1');

      const blocks = useEditorStore.getState().blocks;
      expect(blocks.length).toBe(1);
      expect(blocks[0].id).toBe('block-2');
    });
  });

  describe('isDirty selector', () => {
    it('tracks unsaved changes', () => {
      expect(useEditorStore.getState().isDirty).toBe(false);

      useEditorStore.getState().addBlock({ type: 'text', content: 'Hello' });
      expect(useEditorStore.getState().isDirty).toBe(true);

      useEditorStore.getState().save();
      expect(useEditorStore.getState().isDirty).toBe(false);
    });
  });
});
```

---

## 7. API Mocking with MSW

### Server Setup

```typescript
// src/__tests__/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Handlers (REST)

```typescript
// src/__tests__/mocks/handlers/auth.ts
import { http, HttpResponse } from 'msw';

export const authHandlers = [
  // Login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string };

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        token: 'test-token-' + Date.now(),
        user: {
          id: '1',
          email,
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Signup endpoint
  http.post('/api/auth/signup', async ({ request }) => {
    const { email, password, name } = await request.json() as {
      email: string;
      password: string;
      name: string;
    };

    return HttpResponse.json({
      token: 'new-token-' + Date.now(),
      user: {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        avatar: null,
      },
    });
  }),

  // Refresh token endpoint
  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      token: 'refreshed-token-' + Date.now(),
    });
  }),

  // Logout endpoint
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),
];
```

### Handlers (Media)

```typescript
// src/__tests__/mocks/handlers/media.ts
import { http, HttpResponse } from 'msw';

export const mediaHandlers = [
  http.post('/api/media/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return HttpResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size > 100 * 1024 * 1024) {
      return HttpResponse.json(
        { error: 'File too large' },
        { status: 413 }
      );
    }

    return HttpResponse.json({
      id: 'media-' + Date.now(),
      filename: file.name,
      url: 'https://example.com/media/' + file.name,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  }),

  http.get('/api/media/:id', ({ params }) => {
    const { id } = params;

    return HttpResponse.json({
      id,
      filename: 'test.jpg',
      url: 'https://example.com/media/test.jpg',
      type: 'image',
      size: 1024000,
      uploadedAt: new Date().toISOString(),
    });
  }),

  http.delete('/api/media/:id', ({ params }) => {
    return HttpResponse.json({ success: true });
  }),
];
```

### Handlers (Projects)

```typescript
// src/__tests__/mocks/handlers/projects.ts
import { http, HttpResponse } from 'msw';

let projects: any[] = [];

export const projectHandlers = [
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const start = (page - 1) * limit;
    const paginatedProjects = projects.slice(start, start + limit);

    return HttpResponse.json({
      data: paginatedProjects,
      pagination: {
        page,
        limit,
        total: projects.length,
        pages: Math.ceil(projects.length / limit),
      },
    });
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = await request.json();

    const newProject = {
      id: 'project-' + Date.now(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      published: false,
    };

    projects.push(newProject);
    return HttpResponse.json(newProject, { status: 201 });
  }),

  http.get('/api/projects/:id', ({ params }) => {
    const { id } = params;
    const project = projects.find(p => p.id === id);

    if (!project) {
      return HttpResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(project);
  }),

  http.put('/api/projects/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json();
    const projectIndex = projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return HttpResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(projects[projectIndex]);
  }),

  http.delete('/api/projects/:id', ({ params }) => {
    const { id } = params;
    projects = projects.filter(p => p.id !== id);
    return HttpResponse.json({ success: true });
  }),
];
```

### Handler Index

```typescript
// src/__tests__/mocks/handlers/index.ts
import { authHandlers } from './auth';
import { mediaHandlers } from './media';
import { projectHandlers } from './projects';

export const handlers = [
  ...authHandlers,
  ...mediaHandlers,
  ...projectHandlers,
];
```

---

## 8. Integration Tests

### Login Flow

```typescript
// src/__tests__/integration/login-flow.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/stores/authStore';

describe('Login Flow', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it('completes full login workflow', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm onSuccess={() => {}} />);

    // Fill form
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Submit
    await user.click(submitButton);

    // Wait for API call
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });

    // Verify store was updated
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('test@example.com');

    // Verify token persisted
    expect(localStorage.getItem('authToken')).toBeTruthy();
  });

  it('shows error message on invalid credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm onSuccess={() => {}} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
```

### Project Creation

```typescript
// src/__tests__/integration/project-creation.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { useAuthStore } from '@/stores/authStore';

describe('Project Creation', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('creates project with form validation', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    renderWithProviders(
      <CreateProjectModal open={true} onSuccess={onSuccess} onClose={() => {}} />
    );

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /create/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    // Fill form
    const nameInput = screen.getByLabelText('Project Name');
    const descInput = screen.getByLabelText('Description');

    await user.type(nameInput, 'My New Project');
    await user.type(descInput, 'A description of my project');

    // Submit
    await user.click(screen.getByRole('button', { name: /create/i }));

    // Wait for API response
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Verify project in store
    const projects = useAuthStore.getState().projects;
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe('My New Project');
  });
});
```

### Media Upload with Progress

```typescript
// src/__tests__/integration/media-upload.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { MediaUploadForm } from '@/components/media/MediaUploadForm';
import { useMediaStore } from '@/stores/mediaStore';

describe('Media Upload', () => {
  beforeEach(() => {
    useMediaStore.getState().reset();
  });

  it('uploads file and tracks progress', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaUploadForm />);

    const fileInput = screen.getByLabelText('Upload Image');
    const file = new File(['x'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, file);

    // Progress bar should appear
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByText('Upload complete')).toBeInTheDocument();
    });

    // Verify media in store
    const media = useMediaStore.getState().media;
    expect(media.length).toBe(1);
    expect(media[0].filename).toBe('test.jpg');
  });

  it('validates file type and size', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaUploadForm />);

    const fileInput = screen.getByLabelText('Upload Image');
    const invalidFile = new File(['content'], 'test.exe', { type: 'application/octet-stream' });

    await user.upload(fileInput, invalidFile);

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });
});
```

### Content Publishing

```typescript
// src/__tests__/integration/publishing.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { PublishDialog } from '@/components/editor/PublishDialog';
import { useAuthStore } from '@/stores/authStore';

describe('Content Publishing', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    useAuthStore.getState().addProject({
      id: 'project-1',
      name: 'Test Project',
      published: false,
      blocks: [{ id: 'block-1', type: 'text', content: 'Hello World' }],
    });
  });

  it('publishes project successfully', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    renderWithProviders(
      <PublishDialog projectId="project-1" open={true} onSuccess={onSuccess} />
    );

    // Verify publish button
    const publishButton = screen.getByRole('button', { name: /publish/i });
    await user.click(publishButton);

    // Wait for confirmation
    await waitFor(() => {
      expect(screen.getByText('Published successfully')).toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalled();

    // Verify project marked as published
    const project = useAuthStore.getState().projects[0];
    expect(project.published).toBe(true);
  });

  it('shows validation error if content is empty', async () => {
    const user = userEvent.setup();
    const emptyProject = useAuthStore.getState().addProject({
      id: 'project-2',
      name: 'Empty Project',
      published: false,
      blocks: [],
    });

    renderWithProviders(
      <PublishDialog projectId="project-2" open={true} onSuccess={() => {}} />
    );

    const publishButton = screen.getByRole('button', { name: /publish/i });
    await user.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText(/project must have content/i)).toBeInTheDocument();
    });
  });
});
```

---

## 9. Playwright E2E Tests

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

### Page Objects

```typescript
// e2e/pages/BasePage.ts
import { Page, expect as playwrightExpect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async waitForUrl(pattern: string | RegExp) {
    await this.page.waitForURL(pattern);
  }

  async isVisible(selector: string) {
    return this.page.locator(selector).isVisible();
  }

  async click(selector: string) {
    await this.page.click(selector);
  }

  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async type(selector: string, value: string) {
    await this.page.locator(selector).type(value);
  }

  async getErrorMessage() {
    return this.page.locator('[role="alert"]').textContent();
  }

  async waitForText(text: string, timeout = 5000) {
    await this.page.waitForSelector(`text=${text}`, { timeout });
  }
}
```

```typescript
// e2e/pages/LoginPage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  async goto() {
    await super.goto('/login');
  }

  async fillEmail(email: string) {
    await this.fill('input[type="email"]', email);
  }

  async fillPassword(password: string) {
    await this.fill('input[type="password"]', password);
  }

  async clickLogin() {
    await this.click('button[type="submit"]');
  }

  async loginWithEmail(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async isErrorVisible() {
    return this.isVisible('[role="alert"]');
  }

  async getErrorText() {
    return this.getErrorMessage();
  }

  async signupWithEmail(email: string, password: string) {
    await this.goto();
    await this.click('a[href="/signup"]');
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="confirm"]', password);
    await this.page.fill('input[name="name"]', 'Test User');
    await this.click('button[type="submit"]');
    await this.page.waitForURL('/dashboard');
  }
}
```

```typescript
// e2e/pages/DashboardPage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  async goto() {
    await super.goto('/dashboard');
  }

  async clickCreateProject() {
    await this.click('button:has-text("New Project")');
  }

  async fillProjectForm(name: string, description: string) {
    await this.page.fill('input[placeholder="Project name"]', name);
    await this.page.fill('textarea[placeholder="Description"]', description);
  }

  async confirmProjectCreation() {
    await this.click('button:has-text("Create")');
    await this.waitForUrl(/\/projects\/\d+/);
  }

  async getProjectCount() {
    const cards = await this.page.locator('[data-testid="project-card"]').count();
    return cards;
  }

  async openProject(name: string) {
    await this.click(`a:has-text("${name}")`);
  }
}
```

```typescript
// e2e/pages/EditorPage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class EditorPage extends BasePage {
  async goto() {
    await super.goto('/editor');
  }

  async uploadMedia(filename: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(`./e2e/fixtures/${filename}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getMediaPanel() {
    return this.page.locator('[data-testid="media-panel"]');
  }

  async clickPublish() {
    await this.click('button:has-text("Publish")');
  }

  async confirmPublish() {
    await this.click('button:has-text("Confirm")');
    await this.waitForUrl(/\/projects\/\d+\/published/);
  }

  async saveChanges() {
    await this.page.keyboard.press('Control+S');
    await this.page.waitForLoadState('networkidle');
  }
}
```

### Critical Path Tests

```typescript
// e2e/critical-paths.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';

test.describe('Critical User Paths', () => {
  test('signup → create project → upload media → publish', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);

    // Signup
    await loginPage.signupWithEmail('e2e-' + Date.now() + '@example.com', 'Password123!');

    // Create project
    await dashboardPage.goto();
    await dashboardPage.clickCreateProject();
    await dashboardPage.fillProjectForm('My First Project', 'Testing E2E flow');
    await dashboardPage.confirmProjectCreation();

    // Upload media
    await editorPage.uploadMedia('test-image.jpg');
    const mediaPanel = editorPage.getMediaPanel();
    await expect(mediaPanel).toContainText('test-image.jpg');

    // Save and publish
    await editorPage.saveChanges();
    await editorPage.clickPublish();
    await editorPage.confirmPublish();

    // Verify publish succeeded
    await expect(page).toHaveURL(/\/projects\/\d+\/published/);
    await expect(page.locator('text=Published successfully')).toBeVisible();
  });

  test('login → edit project → update settings → save', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login
    await loginPage.goto();
    await loginPage.loginWithEmail('test@example.com', 'password123');

    // Open project
    await dashboardPage.goto();
    await dashboardPage.openProject('Test Project');

    // Update settings
    await page.click('button[aria-label="Settings"]');
    await page.fill('input[name="title"]', 'Updated Title');
    await page.click('button:has-text("Save")');

    // Verify changes saved
    await expect(page.locator('text=Changes saved')).toBeVisible();
  });

  test('load and navigate paginated content', async ({ page }) => {
    await page.goto('/projects');

    // Load initial page
    await page.waitForLoadState('networkidle');
    const initialCount = await page.locator('[data-testid="project-card"]').count();
    expect(initialCount).toBeGreaterThan(0);

    // Load next page
    await page.click('button[aria-label="Next page"]');
    await page.waitForLoadState('networkidle');

    const secondPageCount = await page.locator('[data-testid="project-card"]').count();
    expect(secondPageCount).toBeGreaterThan(0);
  });
});
```

---

## 10. Visual Regression Testing

### Playwright Screenshots

```typescript
// e2e/visual-tests.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('button components match snapshot', async ({ page }) => {
    await page.goto('/storybook-button');

    await expect(page.locator('[data-testid="button-primary"]')).toHaveScreenshot();
    await expect(page.locator('[data-testid="button-secondary"]')).toHaveScreenshot();
    await expect(page.locator('[data-testid="button-danger"]')).toHaveScreenshot();
  });

  test('form components match snapshot', async ({ page }) => {
    await page.goto('/storybook-form');

    await expect(page.locator('[data-testid="form-group"]')).toHaveScreenshot();
  });

  test('modal dialog matches snapshot', async ({ page }) => {
    await page.goto('/storybook-modal');
    await page.click('button:has-text("Open Modal")');

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot();
  });

  test('editor interface matches snapshot', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('editor-full-page');
  });

  test('dashboard responsive layout', async ({ page }) => {
    await page.goto('/dashboard');

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page).toHaveScreenshot('dashboard-desktop');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('dashboard-tablet');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('dashboard-mobile');
  });
});
```

### Storybook Integration

```typescript
// .storybook/test-runner.ts
import { getComposeStories } from '@storybook/react';
import * as stories from '../src/components/**/*.stories.tsx';

const compose = Object.values(stories).reduce((acc, module) => {
  return { ...acc, ...getComposeStories(module) };
}, {});

export default compose;
```

---

## 11. React Native Testing

### Jest Setup

```json
// apps/mobile/jest.config.json
{
  "preset": "jest-expo",
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/__tests__/setup.ts"],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "transform": {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        "tsconfig": {
          "jsx": "react-native"
        }
      }
    ]
  },
  "testMatch": ["**/__tests__/**/*.test.{ts,tsx}"],
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.stories.tsx",
    "!src/**/__tests__/**"
  ]
}
```

### Component Tests

```typescript
// apps/mobile/__tests__/components/Button.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/Button';

describe('Button (Mobile)', () => {
  it('renders correctly', () => {
    render(<Button>Press me</Button>);
    expect(screen.getByText('Press me')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Press me</Button>);

    fireEvent.press(screen.getByText('Press me'));
    expect(onPress).toHaveBeenCalled();
  });

  it('responds to different variants', () => {
    const { getByTestId } = render(
      <Button variant="primary" testID="primary-btn">
        Primary
      </Button>
    );

    expect(getByTestId('primary-btn')).toHaveStyle({
      backgroundColor: '#3b82f6',
    });
  });

  it('disables when disabled prop is true', () => {
    const onPress = jest.fn();
    render(
      <Button disabled onPress={onPress}>
        Disabled
      </Button>
    );

    fireEvent.press(screen.getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

### Platform-Specific Tests

```typescript
// apps/mobile/__tests__/helpers/platform.test.ts
import { Platform } from 'react-native';
import { getPlatformStyles } from '../../src/helpers/platform';

describe('Platform-specific styles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns iOS styles on iOS', () => {
    Platform.OS = 'ios';
    const styles = getPlatformStyles();

    expect(styles.shadow).toEqual({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    });
  });

  it('returns Android styles on Android', () => {
    Platform.OS = 'android';
    const styles = getPlatformStyles();

    expect(styles.shadow).toEqual({
      elevation: 5,
    });
  });

  it('uses correct font family per platform', () => {
    Platform.OS = 'ios';
    const iosFont = getPlatformStyles().fontFamily;
    expect(iosFont).toBe('-apple-system');

    Platform.OS = 'android';
    const androidFont = getPlatformStyles().fontFamily;
    expect(androidFont).toBe('Roboto');
  });
});
```

---

## 12. Accessibility Testing

### axe-core Integration

```typescript
// src/__tests__/a11y/axe.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/Button';
import { Form } from '@/components/Form';
import { Modal } from '@/components/Modal';

expect.extend(toHaveNoViolations);

describe('Accessibility Compliance', () => {
  it('Button component has no a11y violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Form component has proper labels and structure', async () => {
    const { container } = render(
      <Form onSubmit={() => {}}>
        <Form.Group>
          <Form.Label htmlFor="email">Email</Form.Label>
          <Form.Input id="email" type="email" required />
        </Form.Group>
        <Form.Submit>Submit</Form.Submit>
      </Form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Modal maintains focus management and structure', async () => {
    const { container } = render(
      <Modal open={true} title="Test Modal">
        Modal content
      </Modal>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Keyboard Navigation Tests

```typescript
// src/__tests__/a11y/keyboard-nav.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from '@/components/Navigation';

describe('Keyboard Navigation', () => {
  it('navigates menu with arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <Navigation>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </Navigation>
    );

    const homeLink = screen.getByRole('link', { name: 'Home' });
    homeLink.focus();
    expect(homeLink).toHaveFocus();

    // Arrow right to next item
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('link', { name: 'About' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveFocus();

    // Wrap around
    await user.keyboard('{ArrowRight}');
    expect(homeLink).toHaveFocus();
  });

  it('opens dropdown with Enter key', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Open Menu</button>
        <ul hidden>
          <li>Option 1</li>
          <li>Option 2</li>
        </ul>
      </div>
    );

    const button = screen.getByRole('button');
    button.focus();

    await user.keyboard('{Enter}');
    expect(screen.getByText('Option 1')).toBeVisible();
  });

  it('closes dialog with Escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal open={true} onClose={onClose}>
        Modal content
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

### ARIA Attribute Verification

```typescript
// src/__tests__/a11y/aria-attributes.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';

describe('ARIA Attributes', () => {
  it('button has proper ARIA attributes', () => {
    const { rerender } = render(<Button>Normal Button</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'false');

    rerender(<Button disabled>Disabled Button</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('modal has dialog role and aria-modal', () => {
    render(
      <Modal open={true} title="Test Modal">
        Content
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Test Modal');
  });

  it('progress bar has proper ARIA attributes', () => {
    render(<ProgressBar value={50} max={100} aria-label="Loading" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('form has aria-required on required fields', () => {
    render(
      <Form>
        <Form.Input name="email" required aria-required="true" />
      </Form>
    );

    const input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('aria-required', 'true');
  });
});
```

---

## 13. Performance Testing

### Lighthouse CI

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3,
      "settings": {
        "configPath": "./lighthouse-config.js",
        "chromeFlags": ["--no-sandbox", "--disable-gpu"]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "cumulativeLayoutShift": ["error", { "maxNumericValue": 0.1 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "speed-index": ["error", { "maxNumericValue": 3000 }]
      }
    }
  }
}
```

### Bundle Size Testing

```typescript
// scripts/analyze-bundle.ts
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import * as zlib from 'zlib';
import * as path from 'path';

interface BundleMetrics {
  name: string;
  size: number;
  gzipSize: number;
  prevSize?: number;
  prevGzipSize?: number;
  sizeChange?: number;
  gzipSizeChange?: number;
}

async function analyzeBundles(): Promise<void> {
  const buildPath = '.next/static/chunks';
  const metrics: BundleMetrics[] = [];

  // Build the project
  console.log('Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Read bundle files
  const files = await fs.readdir(buildPath);
  const jsFiles = files.filter(f => f.endsWith('.js'));

  for (const file of jsFiles) {
    const filePath = path.join(buildPath, file);
    const content = await fs.readFile(filePath);
    const gzipSize = zlib.gzipSync(content).length;

    metrics.push({
      name: file,
      size: content.length,
      gzipSize,
    });
  }

  // Sort by gzip size
  metrics.sort((a, b) => b.gzipSize - a.gzipSize);

  // Log results
  console.log('\nBundle Analysis:');
  console.log('================');
  console.log(
    `${'Chunk'.padEnd(40)} ${'Size'.padEnd(12)} ${'Gzip'.padEnd(12)}`
  );
  console.log('-'.repeat(64));

  let totalSize = 0;
  let totalGzip = 0;

  for (const metric of metrics) {
    const size = (metric.size / 1024).toFixed(2);
    const gzip = (metric.gzipSize / 1024).toFixed(2);
    console.log(
      `${metric.name.padEnd(40)} ${size.padStart(10)}KB ${gzip.padStart(10)}KB`
    );
    totalSize += metric.size;
    totalGzip += metric.gzipSize;
  }

  console.log('-'.repeat(64));
  console.log(
    `${'TOTAL'.padEnd(40)} ${(totalSize / 1024).toFixed(2).padStart(10)}KB ${(totalGzip / 1024).toFixed(2).padStart(10)}KB`
  );

  // Check thresholds
  const thresholds = {
    main: 250 * 1024, // 250KB
    shared: 150 * 1024, // 150KB
  };

  const exceeding = metrics.filter(m => {
    const threshold = m.name.includes('main') ? thresholds.main : thresholds.shared;
    return m.gzipSize > threshold;
  });

  if (exceeding.length > 0) {
    console.log('\n⚠️  Chunks exceeding thresholds:');
    for (const metric of exceeding) {
      const threshold = metric.name.includes('main') ? thresholds.main : thresholds.shared;
      const excess = ((metric.gzipSize - threshold) / 1024).toFixed(2);
      console.log(`  - ${metric.name}: +${excess}KB over limit`);
    }
    process.exit(1);
  }

  console.log('\n✅ All bundles within size limits');
}

analyzeBundles().catch(console.error);
```

### React Profiler Tests

```typescript
// src/__tests__/performance/profiler.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Profiler, ProfilerOnRenderCallback } from 'react';
import { LargeList } from '@/components/LargeList';

describe('Performance Profiling', () => {
  it('LargeList renders within expected time', () => {
    const measurements: any[] = [];

    const onRender: ProfilerOnRenderCallback = (
      id, phase, actualDuration, baseDuration, startTime, commitTime
    ) => {
      measurements.push({
        id,
        phase,
        actualDuration,
        baseDuration,
      });
    };

    const { rerender } = render(
      <Profiler id="large-list" onRender={onRender}>
        <LargeList items={Array.from({ length: 1000 }, (_, i) => i)} />
      </Profiler>
    );

    const mountTime = measurements[0].actualDuration;
    expect(mountTime).toBeLessThan(500); // Should mount in < 500ms

    // Update with new items
    measurements.length = 0;
    rerender(
      <Profiler id="large-list" onRender={onRender}>
        <LargeList items={Array.from({ length: 1000 }, (_, i) => i)} />
      </Profiler>
    );

    const updateTime = measurements[measurements.length - 1].actualDuration;
    expect(updateTime).toBeLessThan(200); // Updates should be < 200ms
  });

  it('detects unnecessary re-renders', () => {
    const renderCounts: Record<string, number> = {};

    const onRender: ProfilerOnRenderCallback = (id, phase) => {
      renderCounts[id] = (renderCounts[id] || 0) + 1;
    };

    const MemoComponent = ({ prop }: { prop: string }) => <div>{prop}</div>;

    const { rerender } = render(
      <Profiler id="memo-test" onRender={onRender}>
        <MemoComponent prop="value" />
      </Profiler>
    );

    const initialRenders = renderCounts['memo-test'];

    // Re-render with same prop
    rerender(
      <Profiler id="memo-test" onRender={onRender}>
        <MemoComponent prop="value" />
      </Profiler>
    );

    // Component should not re-render if properly memoized
    // (if using React.memo or useMemo)
    expect(renderCounts['memo-test']).toBe(initialRenders);
  });
});
```

---

## 14. CI Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests & Coverage

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    name: Unit & Integration Tests
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Vitest
        run: npm run test:unit

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true
          minimum_coverage: 70

      - name: Check coverage thresholds
        run: |
          cat coverage/coverage-summary.json
          npm run test:coverage:check

  integration-tests:
    runs-on: ubuntu-latest
    name: Integration Tests
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: coverage/

  e2e-tests:
    runs-on: ubuntu-latest
    name: E2E Tests
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  accessibility-tests:
    runs-on: ubuntu-latest
    name: Accessibility Tests
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run accessibility tests
        run: npm run test:a11y

  lighthouse:
    runs-on: ubuntu-latest
    name: Lighthouse Performance
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: npm run test:lighthouse

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: lighthouse-results
          path: .lighthouseci/

  bundle-size:
    runs-on: ubuntu-latest
    name: Bundle Size Analysis
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Analyze bundle
        run: npm run analyze:bundle

      - name: Comment PR with bundle size
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const bundleReport = fs.readFileSync('bundle-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: bundleReport
            });

  test-report:
    runs-on: ubuntu-latest
    name: Test Report Summary
    needs: [unit-tests, integration-tests, e2e-tests, accessibility-tests]
    if: always()
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v3

      - name: Publish test results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: |
            coverage/test-results.xml
            playwright-report/test-results.xml

      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const total = coverage.total;

            const comment = `## Coverage Report
            | Metric | Coverage |
            |--------|----------|
            | Lines | ${total.lines.pct.toFixed(2)}% |
            | Functions | ${total.functions.pct.toFixed(2)}% |
            | Branches | ${total.branches.pct.toFixed(2)}% |
            | Statements | ${total.statements.pct.toFixed(2)}% |`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --reporter=verbose",
    "test:integration": "vitest run --reporter=verbose integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:a11y": "vitest run a11y",
    "test:lighthouse": "lhci autorun",
    "test:coverage": "vitest run --coverage",
    "test:coverage:check": "node scripts/check-coverage.js",
    "test:visual": "playwright test visual-tests",
    "test:watch": "vitest watch",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e && npm run test:a11y",
    "analyze:bundle": "next build && bundle-analyzer build-stats.json",
    "analyze:lighthouse": "lhci collect && lhci upload && lhci assert"
  }
}
```

### Coverage Check Script

```typescript
// scripts/check-coverage.ts
import * as fs from 'fs';

interface CoverageSummary {
  [key: string]: {
    lines: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
    statements: { pct: number };
  };
}

const thresholds = {
  overall: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  },
  'packages/ui': {
    lines: 90,
    functions: 90,
    branches: 90,
    statements: 90,
  },
  'packages/hooks': {
    lines: 90,
    functions: 90,
    branches: 90,
    statements: 90,
  },
};

const coverage: CoverageSummary = JSON.parse(
  fs.readFileSync('coverage/coverage-summary.json', 'utf-8')
);

let failed = false;

for (const [path, thresholdValues] of Object.entries(thresholds)) {
  const coverageData = coverage[path] || coverage.total;

  if (!coverageData) {
    console.error(`❌ Coverage data not found for ${path}`);
    failed = true;
    continue;
  }

  for (const [metric, threshold] of Object.entries(thresholdValues)) {
    const actual = coverageData[metric as keyof typeof coverageData].pct;

    if (actual < threshold) {
      console.error(
        `❌ ${path}: ${metric} coverage ${actual.toFixed(2)}% is below threshold of ${threshold}%`
      );
      failed = true;
    } else {
      console.log(
        `✅ ${path}: ${metric} coverage ${actual.toFixed(2)}% meets threshold of ${threshold}%`
      );
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('\n✅ All coverage thresholds met!');
```

---

## 15. Test Data Factories

### User Factory

```typescript
// src/__tests__/factories/userFactory.ts
import { faker } from '@faker-js/faker';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: 'creator' | 'admin' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export function createUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    avatar: faker.image.avatar(),
    role: 'creator',
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createUsers(count: number, overrides?: Partial<User>): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}
```

### Project Factory

```typescript
// src/__tests__/factories/projectFactory.ts
import { faker } from '@faker-js/faker';

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail?: string | null;
  published: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
}

export function createProject(overrides?: Partial<Project>): Project {
  const name = faker.word.words(2).join('-');

  return {
    id: faker.string.uuid(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: faker.lorem.paragraph(),
    thumbnail: faker.image.url(),
    published: false,
    publishedAt: null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    authorId: faker.string.uuid(),
    ...overrides,
  };
}

export function createProjects(count: number, overrides?: Partial<Project>): Project[] {
  return Array.from({ length: count }, () => createProject(overrides));
}
```

### Media Factory

```typescript
// src/__tests__/factories/mediaFactory.ts
import { faker } from '@faker-js/faker';

export interface Media {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export function createMedia(overrides?: Partial<Media>): Media {
  const type = faker.helpers.arrayElement(['image', 'video', 'audio', 'document'] as const);
  const filename = faker.system.fileName({ extensionCount: 1 });

  return {
    id: faker.string.uuid(),
    filename,
    url: faker.image.url(),
    type,
    size: faker.number.int({ min: 1000, max: 100000000 }),
    duration: type !== 'image' && type !== 'document' ? faker.number.int({ min: 1, max: 3600 }) : undefined,
    width: type === 'image' ? faker.number.int({ min: 640, max: 3840 }) : undefined,
    height: type === 'image' ? faker.number.int({ min: 480, max: 2160 }) : undefined,
    uploadedAt: faker.date.past(),
    uploadedBy: faker.string.uuid(),
    ...overrides,
  };
}

export function createMediaBatch(count: number, overrides?: Partial<Media>): Media[] {
  return Array.from({ length: count }, () => createMedia(overrides));
}
```

### Content Block Factory

```typescript
// src/__tests__/factories/contentFactory.ts
import { faker } from '@faker-js/faker';

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  style?: Record<string, any>;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  mediaId: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface VideoBlock {
  id: string;
  type: 'video';
  mediaId: string;
  caption?: string;
}

export type ContentBlock = TextBlock | ImageBlock | VideoBlock;

export function createTextBlock(overrides?: Partial<TextBlock>): TextBlock {
  return {
    id: faker.string.uuid(),
    type: 'text',
    content: faker.lorem.paragraph(),
    ...overrides,
  };
}

export function createImageBlock(overrides?: Partial<ImageBlock>): ImageBlock {
  return {
    id: faker.string.uuid(),
    type: 'image',
    mediaId: faker.string.uuid(),
    caption: faker.lorem.sentence(),
    ...overrides,
  };
}

export function createVideoBlock(overrides?: Partial<VideoBlock>): VideoBlock {
  return {
    id: faker.string.uuid(),
    type: 'video',
    mediaId: faker.string.uuid(),
    caption: faker.lorem.sentence(),
    ...overrides,
  };
}

export function createContentBlocks(count: number): ContentBlock[] {
  return Array.from({ length: count }, () => {
    const type = faker.helpers.arrayElement([
      'text',
      'image',
      'video',
    ] as const);

    switch (type) {
      case 'text':
        return createTextBlock();
      case 'image':
        return createImageBlock();
      case 'video':
        return createVideoBlock();
    }
  });
}
```

### Analytics Event Factory

```typescript
// src/__tests__/factories/analyticsFactory.ts
import { faker } from '@faker-js/faker';

export interface AnalyticsEvent {
  id: string;
  eventType: 'pageview' | 'click' | 'form_submit' | 'media_view' | 'download';
  projectId: string;
  userId?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export function createAnalyticsEvent(overrides?: Partial<AnalyticsEvent>): AnalyticsEvent {
  return {
    id: faker.string.uuid(),
    eventType: faker.helpers.arrayElement([
      'pageview',
      'click',
      'form_submit',
      'media_view',
      'download',
    ] as const),
    projectId: faker.string.uuid(),
    userId: faker.helpers.maybe(() => faker.string.uuid()),
    metadata: {
      path: faker.system.filePath(),
      referrer: faker.helpers.maybe(() => faker.internet.url()),
      userAgent: faker.internet.userAgent(),
    },
    timestamp: faker.date.recent(),
    ...overrides,
  };
}

export function createAnalyticsEvents(count: number, overrides?: Partial<AnalyticsEvent>): AnalyticsEvent[] {
  return Array.from({ length: count }, () => createAnalyticsEvent(overrides));
}
```

---

## Testing Checklist

### Before Submitting a PR

- [ ] Unit tests written for new components (>80% coverage)
- [ ] Integration tests for multi-component workflows
- [ ] Hook tests if new custom hooks added
- [ ] Store tests if new Zustand stores added
- [ ] Accessibility tests pass (axe-core)
- [ ] No console errors or warnings
- [ ] Bundle size impact analyzed
- [ ] Playwright E2E tests pass for critical flows

### Coverage Requirements

```
Overall: 70%
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

Shared Packages:
- packages/ui: 90%
- packages/hooks: 90%
```

### Test Environments

| Environment | Purpose | Tools |
|-------------|---------|-------|
| **Local Dev** | TDD during development | Vitest watch, Playwright UI |
| **Pre-commit** | Catch issues before push | Husky hooks, focused tests |
| **CI/CD** | Comprehensive validation | All tests + Lighthouse + coverage |

---

## References

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Testing](https://playwright.dev)
- [MSW Documentation](https://mswjs.io)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

