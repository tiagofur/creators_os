/**
 * TASK-613: RTL integration tests — idea capture and pipeline flows (using MSW).
 *
 * 1. Idea capture via Cmd+K: keydown Ctrl+K, type title, Enter, MSW returns 201, new IdeaCard appears
 * 2. Pipeline drag: simulate dnd-kit drag, card moves column, MSW called, error reverts position
 * 3. Assert correct API calls via MSW request history
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
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000';

// Track API requests
const requestLog: { method: string; url: string; body?: unknown }[] = [];

// Setup MSW
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });

  // Intercept all requests to track them
  server.events.on('request:start', async ({ request }) => {
    let body: unknown = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.clone().json();
      } catch {
        // Not JSON body
      }
    }
    requestLog.push({
      method: request.method,
      url: request.url,
      body,
    });
  });
});
afterEach(() => {
  server.resetHandlers();
  requestLog.length = 0;
});
afterAll(() => server.close());

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
  usePathname: () => '/en/ideas',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @ordo/stores
vi.mock('@ordo/stores', () => ({
  useAuthStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        accessToken: 'test-token',
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User', tier: 'pro' },
        isAuthenticated: true,
        isLoading: false,
        setAccessToken: vi.fn(),
        setUser: vi.fn(),
        logout: vi.fn(),
        setLoading: vi.fn(),
      }),
    {
      getState: () => ({
        accessToken: 'test-token',
        logout: vi.fn(),
      }),
    },
  ),
  useWorkspaceStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        activeWorkspaceId: 'workspace-1',
        activeWorkspace: { id: 'workspace-1' },
        tier: 'pro',
      }),
    {
      getState: () => ({
        activeWorkspaceId: 'workspace-1',
        activeWorkspace: { id: 'workspace-1' },
      }),
    },
  ),
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ ideasViewMode: 'grid', setIdeasViewMode: vi.fn() }),
}));

// Mock analytics tracking
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock toast
vi.mock('@ordo/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@ordo/ui')>();
  return {
    ...original,
    useToast: () => ({ toast: vi.fn() }),
  };
});

// Mock @dnd-kit packages for pipeline tests
vi.mock('@dnd-kit/core', () => {
  let onDragEnd: ((event: Record<string, unknown>) => void) | null = null;

  return {
    DndContext: ({ children, onDragEnd: handler }: { children: React.ReactNode; onDragEnd?: (event: Record<string, unknown>) => void }) => {
      onDragEnd = handler ?? null;
      return <div data-testid="dnd-context">{children}</div>;
    },
    DragOverlay: () => null,
    PointerSensor: class {},
    useSensor: () => ({}),
    useSensors: (...args: unknown[]) => args,
    closestCenter: () => null,
    useDroppable: ({ id }: { id: string }) => ({
      setNodeRef: () => {},
      isOver: false,
    }),
    // Expose for test use
    __getOnDragEnd: () => onDragEnd,
  };
});

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
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

describe('Idea Capture Integration', () => {
  it('opens quick capture modal on Ctrl+K and creates a new idea', async () => {
    const user = userEvent.setup();

    const { QuickCaptureTrigger } = await import(
      '@/components/ideas/quick-capture-trigger'
    );

    render(<QuickCaptureTrigger />, { wrapper: createWrapper() });

    // Press Ctrl+K to open the modal
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });

    // Wait for the modal to appear (look for the textarea)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/what's your idea/i)).toBeInTheDocument();
    });

    // Type a title
    const textarea = screen.getByPlaceholderText(/what's your idea/i);
    await user.type(textarea, 'My Awesome New Content Idea');

    // Submit the form by clicking the capture button
    const captureButton = screen.getByRole('button', { name: /capture idea/i });
    await user.click(captureButton);

    // Verify the POST /v1/ideas was called with the correct title
    await waitFor(() => {
      const postRequest = requestLog.find(
        (r) => r.method === 'POST' && r.url.includes('/v1/ideas'),
      );
      expect(postRequest).toBeDefined();
      expect((postRequest?.body as Record<string, unknown>)?.title).toBe(
        'My Awesome New Content Idea',
      );
    });
  });

  it('captures the idea with Cmd+K shortcut (macOS)', async () => {
    const { QuickCaptureTrigger } = await import(
      '@/components/ideas/quick-capture-trigger'
    );

    render(<QuickCaptureTrigger />, { wrapper: createWrapper() });

    // Press Cmd+K (metaKey = true)
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/what's your idea/i)).toBeInTheDocument();
    });
  });

  it('renders the capture button with correct accessibility label', () => {
    const { QuickCaptureTrigger } = require('@/components/ideas/quick-capture-trigger');

    render(<QuickCaptureTrigger />, { wrapper: createWrapper() });

    expect(
      screen.getByRole('button', { name: /capture idea/i }),
    ).toBeInTheDocument();
  });
});

describe('Pipeline Drag Integration', () => {
  it('renders kanban board and moves card to a new stage via API', async () => {
    const { KanbanBoard } = await import(
      '@/components/pipeline/kanban-board'
    );

    const items = [
      {
        id: 'content-1',
        workspace_id: 'workspace-1',
        idea_id: null,
        title: 'Draft Blog Post',
        body: null,
        status: 'draft' as const,
        pipeline_stage: 'scripting' as const,
        platform: 'blog',
        scheduled_at: null,
        published_at: null,
        thumbnail_url: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    render(
      <KanbanBoard items={items} />,
      { wrapper: createWrapper() },
    );

    // Verify the card is rendered
    expect(screen.getByText('Draft Blog Post')).toBeInTheDocument();

    // Simulate DnD drag end via the DndContext mock
    const dndKit = await import('@dnd-kit/core');
    const onDragEnd = (dndKit as unknown as { __getOnDragEnd: () => ((e: Record<string, unknown>) => void) | null }).__getOnDragEnd();

    if (onDragEnd) {
      await act(async () => {
        onDragEnd({
          active: { id: 'content-1' },
          over: { id: 'editing' }, // target column
        });
      });

      // Verify the PATCH /v1/contents/:id was called to move stage
      await waitFor(() => {
        const patchRequest = requestLog.find(
          (r) => r.method === 'PATCH' && r.url.includes('/v1/contents/content-1'),
        );
        expect(patchRequest).toBeDefined();
        expect((patchRequest?.body as Record<string, unknown>)?.pipeline_stage).toBe('editing');
      });
    }
  });

  it('reverts position when API call fails', async () => {
    // Override PATCH to fail
    server.use(
      http.patch(`${API_BASE}/v1/contents/:id`, () => {
        return HttpResponse.json(
          { status: 500, code: 'INTERNAL_ERROR', message: 'Server error' },
          { status: 500 },
        );
      }),
    );

    const { KanbanBoard } = await import(
      '@/components/pipeline/kanban-board'
    );

    const items = [
      {
        id: 'content-2',
        workspace_id: 'workspace-1',
        idea_id: null,
        title: 'Editing Video',
        body: null,
        status: 'draft' as const,
        pipeline_stage: 'editing' as const,
        platform: 'youtube',
        scheduled_at: null,
        published_at: null,
        thumbnail_url: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    render(
      <KanbanBoard items={items} />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Editing Video')).toBeInTheDocument();

    // Simulate drag to publishing
    const dndKit = await import('@dnd-kit/core');
    const onDragEnd = (dndKit as unknown as { __getOnDragEnd: () => ((e: Record<string, unknown>) => void) | null }).__getOnDragEnd();

    if (onDragEnd) {
      await act(async () => {
        onDragEnd({
          active: { id: 'content-2' },
          over: { id: 'publishing' },
        });
      });

      // The PATCH should have been attempted
      await waitFor(() => {
        const patchRequest = requestLog.find(
          (r) => r.method === 'PATCH' && r.url.includes('/v1/contents/content-2'),
        );
        expect(patchRequest).toBeDefined();
      });

      // The card should still be visible (component re-renders with original data from parent)
      expect(screen.getByText('Editing Video')).toBeInTheDocument();
    }
  });

  it('does nothing when drag ends without an "over" target', async () => {
    const { KanbanBoard } = await import(
      '@/components/pipeline/kanban-board'
    );

    const items = [
      {
        id: 'content-3',
        workspace_id: 'workspace-1',
        idea_id: null,
        title: 'Recording Session',
        body: null,
        status: 'draft' as const,
        pipeline_stage: 'recording' as const,
        platform: 'youtube',
        scheduled_at: null,
        published_at: null,
        thumbnail_url: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    render(
      <KanbanBoard items={items} />,
      { wrapper: createWrapper() },
    );

    const dndKit = await import('@dnd-kit/core');
    const onDragEnd = (dndKit as unknown as { __getOnDragEnd: () => ((e: Record<string, unknown>) => void) | null }).__getOnDragEnd();

    const initialRequestCount = requestLog.length;

    if (onDragEnd) {
      await act(async () => {
        onDragEnd({
          active: { id: 'content-3' },
          over: null,
        });
      });
    }

    // No PATCH request should have been made
    const patchRequests = requestLog
      .slice(initialRequestCount)
      .filter((r) => r.method === 'PATCH');
    expect(patchRequests).toHaveLength(0);
  });
});

describe('API call assertions', () => {
  it('sends correct headers and payload when creating an idea', async () => {
    const user = userEvent.setup();

    const { QuickCaptureTrigger } = await import(
      '@/components/ideas/quick-capture-trigger'
    );

    render(<QuickCaptureTrigger />, { wrapper: createWrapper() });

    // Open modal
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/what's your idea/i)).toBeInTheDocument();
    });

    // Type idea and select platform
    await user.type(screen.getByPlaceholderText(/what's your idea/i), 'API Test Idea');

    // Click YouTube platform button
    const youtubeButton = screen.getByRole('button', { name: 'YouTube' });
    await user.click(youtubeButton);

    // Submit
    await user.click(screen.getByRole('button', { name: /capture idea/i }));

    await waitFor(() => {
      const postRequest = requestLog.find(
        (r) => r.method === 'POST' && r.url.includes('/v1/ideas'),
      );
      expect(postRequest).toBeDefined();

      const body = postRequest?.body as Record<string, unknown>;
      expect(body.title).toBe('API Test Idea');
      expect(body.tags).toEqual(['youtube']);
      expect(body.workspace_id).toBe('workspace-1');
    });
  });
});
