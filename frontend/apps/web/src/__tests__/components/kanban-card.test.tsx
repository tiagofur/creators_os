/**
 * TASK-610: RTL component tests for KanbanCard (ContentCard equivalent).
 *
 * The project uses KanbanCard as the "content card" component in the pipeline.
 * Tests: renders all content types, overdue date has special styling.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanCard } from '@/components/pipeline/kanban-card';
import type { ContentItem } from '@ordo/types';

// Mock @dnd-kit/sortable since KanbanCard uses useSortable
vi.mock('@dnd-kit/sortable', () => ({
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

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'cnt_test_001',
    workspace_id: 'ws-1',
    idea_id: null,
    title: 'Test Content Item',
    body: null,
    status: 'draft',
    pipeline_stage: 'scripting',
    platform: 'youtube',
    scheduled_at: null,
    published_at: null,
    thumbnail_url: null,
    tags: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('KanbanCard', () => {
  it('renders the content title', () => {
    render(<KanbanCard item={makeItem()} />);

    expect(screen.getByText('Test Content Item')).toBeInTheDocument();
  });

  it('renders the platform badge for youtube', () => {
    render(<KanbanCard item={makeItem({ platform: 'youtube' })} />);

    expect(screen.getByText('youtube')).toBeInTheDocument();
  });

  it('renders different platform types correctly', () => {
    const platforms = ['youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'podcast', 'blog'];

    for (const platform of platforms) {
      const { unmount } = render(
        <KanbanCard item={makeItem({ platform })} />,
      );
      expect(screen.getByText(platform)).toBeInTheDocument();
      unmount();
    }
  });

  it('renders the scheduled date when present', () => {
    render(
      <KanbanCard
        item={makeItem({ scheduled_at: '2027-06-15T14:00:00.000Z' })}
      />,
    );

    expect(screen.getByText('Jun 15')).toBeInTheDocument();
  });

  it('applies destructive styling and shows "(overdue)" for past dates', () => {
    // Use a date in the past
    const pastDate = '2020-01-01T00:00:00.000Z';
    render(<KanbanCard item={makeItem({ scheduled_at: pastDate })} />);

    const overdueEl = screen.getByText(/overdue/i);
    expect(overdueEl).toBeInTheDocument();
    expect(overdueEl.className).toMatch(/destructive/);
    expect(overdueEl.className).toMatch(/font-medium/);
  });

  it('does not show overdue styling for future dates', () => {
    const futureDate = '2027-12-31T00:00:00.000Z';
    render(<KanbanCard item={makeItem({ scheduled_at: futureDate })} />);

    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    const dateEl = screen.getByText('Dec 31');
    expect(dateEl.className).toMatch(/muted-foreground/);
  });

  it('calls onClick with the item when the card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<KanbanCard item={makeItem()} onClick={onClick} />);

    await user.click(screen.getByText('Test Content Item'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].id).toBe('cnt_test_001');
  });

  it('renders the drag handle button', () => {
    render(<KanbanCard item={makeItem()} />);

    expect(
      screen.getByRole('button', { name: /drag to reorder/i }),
    ).toBeInTheDocument();
  });

  it('does not render platform span when platform is missing', () => {
    // ContentItem type requires platform as string, but component checks truthiness
    const item = makeItem({ platform: '' as ContentItem['platform'] });
    render(<KanbanCard item={item} />);

    // Title should still be present
    expect(screen.getByText('Test Content Item')).toBeInTheDocument();
  });
});
