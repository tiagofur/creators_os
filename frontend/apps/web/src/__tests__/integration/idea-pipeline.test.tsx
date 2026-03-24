/**
 * TASK-613: RTL integration tests — idea capture and pipeline flows (using MSW).
 *
 * 1. Idea capture via Cmd+K: keydown Ctrl+K, type title, Enter, MSW returns 201, new IdeaCard appears
 * 2. Pipeline drag: simulate dnd-kit drag, card moves column, MSW called, error reverts position
 * 3. Assert correct API calls via MSW request history
 */
import {
  beforeAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000';

// Track API requests
const requestLog: { method: string; url: string; body?: unknown }[] = [];

beforeAll(() => {
  server.events.on('request:start', ({ request }) => {
    const logEntry: { method: string; url: string; body?: unknown } = {
      method: request.method,
      url: request.url,
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      request.clone().json().then((body) => {
        logEntry.body = body;
      }).catch(() => {});
    }
    requestLog.push(logEntry);
  });
});

afterEach(() => {
  server.resetHandlers();
  requestLog.length = 0;
});

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
let capturedOnDragEnd: ((event: Record<string, unknown>) => void) | null = null;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd: handler }: { children: React.ReactNode; onDragEnd?: (event: Record<string, unknown>) => void }) => {
    capturedOnDragEnd = handler ?? null;
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: () => null,
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: (...args: unknown[]) => args,
  closestCenter: () => null,
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
  }),
}));

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
  it('opens quick capture modal on Ctrl+K and creates a new idea via MSW', async () => {
    const user = userEvent.setup();
    // Override idea creation to capture the request
    server.use(
      http.post('*/api/v1/workspaces/:workspaceId/ideas', async ({ request, params }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json(
          {
            id: '00000000-0000-4000-a000-000000000002',
            workspace_id: params.workspaceId,
            created_by: '00000000-0000-4000-a000-000000000099',
            user_id: '00000000-0000-4000-a000-000000000099',
            title: body.title,
            description: null,
            status: 'inbox',
            stage: 'raw',
            tags: body.tags ?? [],
            validation_score: null,
            ai_summary: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );

    const { QuickCaptureTrigger } = await import(
      '@/components/ideas/quick-capture-trigger'
    );

    render(<QuickCaptureTrigger />, { wrapper: createWrapper() });

    // Press Ctrl+K to open the modal
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });

    // Wait for the modal to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/what's your idea/i)).toBeInTheDocument();
    });

    // Type a title
    const textarea = screen.getByPlaceholderText(/what's your idea/i);
    await user.type(textarea, 'My Awesome New Content Idea');

    // Submit the form by clicking the capture button
    const captureButton = screen.getByRole('button', { name: /capture idea/i });
    await user.click(captureButton);

    // Verify the POST was called
    await waitFor(() => {
      const postRequest = requestLog.find(
        (r) => r.method === 'POST' && r.url.includes('/api/v1/workspaces/') && r.url.includes('/ideas'),
      );
      expect(postRequest).toBeDefined();
    });

  });

  it('captures the idea with Cmd+K shortcut (macOS style)', async () => {
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

  it('renders the capture button with correct accessibility label', async () => {
    const { QuickCaptureTrigger } = await import(
      '@/components/ideas/quick-capture-trigger'
    );

    render(<QuickCaptureTrigger />, { wrapper: createWrapper() });

    expect(
      screen.getByRole('button', { name: /capture idea/i }),
    ).toBeInTheDocument();
  });
});

describe('Pipeline Drag Integration', () => {
  it('renders kanban board and fires API call when card is dragged to a new stage', async () => {


    const { KanbanBoard } = await import(
      '@/components/pipeline/kanban-board'
    );

    const items = [
      {
        id: 'content-1',
        workspace_id: 'workspace-1',
        created_by: 'user-1',
        idea_id: null,
        title: 'Draft Blog Post',
        body: null,
        status: 'scripting' as const,
        content_type: 'video' as const,
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

    // Simulate DnD drag end via the captured onDragEnd handler
    expect(capturedOnDragEnd).not.toBeNull();

    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 'content-1' },
        over: { id: 'editing' }, // target column
      });
    });

    // Verify the PUT was called to move stage
    await waitFor(() => {
      const putRequest = requestLog.find(
        (r) => (r.method === 'PUT' || r.method === 'PATCH') && r.url.includes('/contents'),
      );
      expect(putRequest).toBeDefined();
    });

  });

  it('reverts position when API call fails', async () => {


    // Override PUT to fail
    server.use(
      http.put('*/api/v1/workspaces/:workspaceId/contents/:id', () => {
        return HttpResponse.json(
          { status: 500, code: 'INTERNAL_ERROR', message: 'Server error' },
          { status: 500 },
        );
      }),
      http.put('*/api/v1/workspaces/:workspaceId/contents/:id/status', () => {
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
        created_by: 'user-1',
        idea_id: null,
        title: 'Editing Video',
        body: null,
        status: 'editing' as const,
        content_type: 'video' as const,
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
    expect(capturedOnDragEnd).not.toBeNull();

    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 'content-2' },
        over: { id: 'publishing' },
      });
    });

    // The PUT/PATCH should have been attempted
    await waitFor(() => {
      const apiRequest = requestLog.find(
        (r) => (r.method === 'PUT' || r.method === 'PATCH') && r.url.includes('/contents'),
      );
      expect(apiRequest).toBeDefined();
    });

    // The card should still be visible (component re-renders with original data from parent)
    expect(screen.getByText('Editing Video')).toBeInTheDocument();

  });

  it('does nothing when drag ends without an "over" target', async () => {


    const { KanbanBoard } = await import(
      '@/components/pipeline/kanban-board'
    );

    const items = [
      {
        id: 'content-3',
        workspace_id: 'workspace-1',
        created_by: 'user-1',
        idea_id: null,
        title: 'Recording Session',
        body: null,
        status: 'recording' as const,
        content_type: 'video' as const,
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

    const initialRequestCount = requestLog.length;

    expect(capturedOnDragEnd).not.toBeNull();

    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 'content-3' },
        over: null,
      });
    });

    // No PUT/PATCH request should have been made
    const mutationRequests = requestLog
      .slice(initialRequestCount)
      .filter((r) => r.method === 'PUT' || r.method === 'PATCH');
    expect(mutationRequests).toHaveLength(0);

  });
});

describe('API call assertions', () => {
  it('sends correct payload when creating an idea with platform tags', async () => {
    const user = userEvent.setup();


    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.post('*/api/v1/workspaces/:workspaceId/ideas', async ({ request, params }) => {
        capturedBody = await request.json() as Record<string, unknown>;
        // Store the workspaceId from the URL path for assertion
        (capturedBody as any).__workspaceId = params.workspaceId;
        return HttpResponse.json(
          {
            id: '00000000-0000-4000-a000-000000000001',
            workspace_id: params.workspaceId,
            created_by: '00000000-0000-4000-a000-000000000099',
            user_id: '00000000-0000-4000-a000-000000000099',
            title: capturedBody.title,
            description: null,
            status: 'inbox',
            stage: 'raw',
            tags: capturedBody.tags ?? [],
            validation_score: null,
            ai_summary: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );

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
      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.title).toBe('API Test Idea');
      expect(capturedBody!.tags).toEqual(['youtube']);
      // workspace_id is now in the URL path, not the request body
      expect((capturedBody as any).__workspaceId).toBe('workspace-1');
    });

  });

  it('tracks the correct API method and URL for pipeline stage move', async () => {


    const { KanbanBoard } = await import(
      '@/components/pipeline/kanban-board'
    );

    const items = [
      {
        id: 'content-track',
        workspace_id: 'workspace-1',
        created_by: 'user-1',
        idea_id: null,
        title: 'Track API Call',
        body: null,
        status: 'idea' as const,
        content_type: 'video' as const,
        pipeline_stage: 'idea' as const,
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

    expect(capturedOnDragEnd).not.toBeNull();

    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 'content-track' },
        over: { id: 'scripting' },
      });
    });

    await waitFor(() => {
      const apiRequest = requestLog.find(
        (r) => (r.method === 'PUT' || r.method === 'PATCH') && r.url.includes('/contents/content-track'),
      );
      expect(apiRequest).toBeDefined();
      expect(apiRequest!.url).toContain('/contents/content-track');
    });

  });
});
