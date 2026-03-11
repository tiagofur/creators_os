/**
 * Smoke tests for the Pipeline flow.
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
import { render, screen } from '@testing-library/react';
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
  usePathname: () => '/en/pipeline',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @dnd-kit packages
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: () => null,
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: (...args: unknown[]) => args,
  closestCenter: () => null,
  useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
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

// Mock stores
vi.mock('@ordo/stores', () => ({
  useWorkspaceStore: (selector: (s: { activeWorkspaceId: string; tier: string }) => unknown) =>
    selector({ activeWorkspaceId: 'workspace-1', tier: 'free' }),
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({}),
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

const makeContentItem = (
  id: string,
  title: string,
  stage: string,
): Record<string, unknown> => ({
  id,
  workspace_id: 'workspace-1',
  idea_id: null,
  title,
  body: null,
  status: 'draft',
  pipeline_stage: stage,
  platform: 'youtube',
  scheduled_at: null,
  published_at: null,
  thumbnail_url: null,
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('Pipeline board flow', () => {
  it('renders kanban board with 2 stages and 1 card each', async () => {
    const { KanbanBoard } = await import(
      '@/components/pipeline/kanban-board'
    );

    const items = [
      makeContentItem('1', 'Script Episode 1', 'scripting'),
      makeContentItem('2', 'Idea Content', 'idea'),
    ] as Parameters<typeof KanbanBoard>[0]['items'];

    render(
      <KanbanBoard items={items} />,
      { wrapper: createWrapper() },
    );

    // Both content titles should be visible
    expect(screen.getByText('Script Episode 1')).toBeDefined();
    expect(screen.getByText('Idea Content')).toBeDefined();
  });

  it('shows skeleton while loading', async () => {
    const { KanbanBoardSkeleton } = await import(
      '@/components/pipeline/kanban-board-skeleton'
    );

    render(<KanbanBoardSkeleton />, { wrapper: createWrapper() });

    // Should render stage column headers (Scripting is one)
    expect(document.querySelectorAll('[class*="rounded-lg"]').length).toBeGreaterThan(0);
  });
});
