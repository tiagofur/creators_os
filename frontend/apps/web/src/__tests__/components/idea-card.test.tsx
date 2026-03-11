/**
 * TASK-610: RTL component tests for IdeaCard.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdeaCard } from '@/app/[locale]/(app)/ideas/_components/idea-card';
import type { Idea } from '@ordo/types';

const baseIdea: Idea = {
  id: 'idea_test_001',
  workspace_id: 'ws-1',
  user_id: 'usr-1',
  title: 'How to Build a CLI in Rust',
  description: 'A step-by-step guide to building command-line tools with Rust.',
  status: 'validated',
  stage: 'refined',
  tags: ['rust', 'cli', 'tutorial'],
  validation_score: 90,
  ai_summary: 'High-value tutorial content.',
  created_at: '2025-12-01T10:00:00.000Z',
  updated_at: '2025-12-05T12:00:00.000Z',
};

describe('IdeaCard', () => {
  it('renders the idea title and description', () => {
    render(<IdeaCard idea={baseIdea} />);

    expect(screen.getByText('How to Build a CLI in Rust')).toBeInTheDocument();
    expect(
      screen.getByText('A step-by-step guide to building command-line tools with Rust.'),
    ).toBeInTheDocument();
  });

  it('renders tags as badges', () => {
    render(<IdeaCard idea={baseIdea} />);

    expect(screen.getByText('rust')).toBeInTheDocument();
    expect(screen.getByText('cli')).toBeInTheDocument();
    expect(screen.getByText('tutorial')).toBeInTheDocument();
  });

  it('renders the status badge with the correct status text', () => {
    render(<IdeaCard idea={baseIdea} />);

    expect(screen.getByText('validated')).toBeInTheDocument();
  });

  it('renders different status badges for each status', () => {
    const statuses = ['inbox', 'validated', 'in_progress', 'done', 'archived'] as const;

    for (const status of statuses) {
      const { unmount } = render(
        <IdeaCard idea={{ ...baseIdea, status }} />,
      );
      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    }
  });

  it('calls onClick with the idea when the card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<IdeaCard idea={baseIdea} onClick={onClick} />);

    await user.click(screen.getByText('How to Build a CLI in Rust'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(baseIdea);
  });

  it('fires onClick with the correct idea ID when multiple cards exist', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const idea2: Idea = {
      ...baseIdea,
      id: 'idea_test_002',
      title: 'GraphQL Best Practices',
    };

    render(
      <div>
        <IdeaCard idea={baseIdea} onClick={onClick} />
        <IdeaCard idea={idea2} onClick={onClick} />
      </div>,
    );

    await user.click(screen.getByText('GraphQL Best Practices'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].id).toBe('idea_test_002');
  });

  it('renders the actions menu button', () => {
    render(<IdeaCard idea={baseIdea} />);

    expect(screen.getByRole('button', { name: /actions/i })).toBeInTheDocument();
  });

  it('renders the selection checkbox when onSelect is provided', () => {
    const onSelect = vi.fn();

    render(<IdeaCard idea={baseIdea} onSelect={onSelect} />);

    expect(
      screen.getByRole('checkbox', { name: `Select ${baseIdea.title}` }),
    ).toBeInTheDocument();
  });

  it('does not render the selection checkbox when onSelect is not provided', () => {
    render(<IdeaCard idea={baseIdea} />);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows at most 3 tags from the tags array', () => {
    const manyTagsIdea: Idea = {
      ...baseIdea,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };

    render(<IdeaCard idea={manyTagsIdea} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.queryByText('tag4')).not.toBeInTheDocument();
    expect(screen.queryByText('tag5')).not.toBeInTheDocument();
  });
});
