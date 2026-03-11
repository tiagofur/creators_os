/**
 * Smoke tests for the Ideas flow.
 */
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { server } from './mocks/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
  usePathname: () => '/en/ideas',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock toast
vi.mock('@ordo/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@ordo/ui')>();
  return {
    ...original,
    useToast: () => ({ toast: vi.fn() }),
  };
});

// Mock stores
vi.mock('@ordo/stores', () => ({
  useWorkspaceStore: (selector: (s: { activeWorkspaceId: string; tier: string }) => unknown) =>
    selector({ activeWorkspaceId: 'workspace-1', tier: 'free' }),
  useUiStore: (selector: (s: { ideasViewMode: string; setIdeasViewMode: () => void }) => unknown) =>
    selector({ ideasViewMode: 'grid', setIdeasViewMode: vi.fn() }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Ideas list flow', () => {
  it('renders ideas list with 3 ideas from MSW mock', async () => {
    const { IdeasList } = await import(
      '@/app/[locale]/(app)/ideas/_components/ideas-list'
    );

    const mockIdeas = [
      {
        id: '1',
        workspace_id: 'workspace-1',
        user_id: 'user-1',
        title: 'Idea One',
        description: null,
        status: 'inbox' as const,
        stage: 'raw' as const,
        tags: [],
        validation_score: null,
        ai_summary: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        workspace_id: 'workspace-1',
        user_id: 'user-1',
        title: 'Idea Two',
        description: null,
        status: 'validated' as const,
        stage: 'refined' as const,
        tags: [],
        validation_score: null,
        ai_summary: null,
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      },
      {
        id: '3',
        workspace_id: 'workspace-1',
        user_id: 'user-1',
        title: 'Idea Three',
        description: null,
        status: 'inbox' as const,
        stage: 'raw' as const,
        tags: [],
        validation_score: null,
        ai_summary: null,
        created_at: '2026-01-03T00:00:00Z',
        updated_at: '2026-01-03T00:00:00Z',
      },
    ];

    render(
      <IdeasList ideas={mockIdeas} viewMode="grid" />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Idea One')).toBeDefined();
    expect(screen.getByText('Idea Two')).toBeDefined();
    expect(screen.getByText('Idea Three')).toBeDefined();
  });

  it('shows empty state when ideas list is empty', async () => {
    const { IdeasList } = await import(
      '@/app/[locale]/(app)/ideas/_components/ideas-list'
    );

    render(
      <IdeasList ideas={[]} viewMode="grid" />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('No ideas yet')).toBeDefined();
  });

  it('opens quick capture modal on Cmd+K keydown', async () => {
    const { QuickCaptureTrigger } = await import(
      '@/components/ideas/quick-capture-trigger'
    );

    render(<QuickCaptureTrigger />, { wrapper: createWrapper() });

    // Simulate Cmd+K
    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      // The modal should be visible — look for the textarea
      const textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(0);
    });
  });
});
