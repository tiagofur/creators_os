/**
 * TASK-610: RTL component tests for TierGate.
 * Tests: free tier shows upgrade prompt; pro tier shows children.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierGate } from '@/components/tier-gate';

// Mock useTier hook — we control canUse behavior per test
const mockCanUse = vi.fn();

vi.mock('@/hooks/use-tier', () => ({
  useTier: () => ({
    tier: 'free',
    limits: { ideas: 50, workspaces: 1, aiCredits: 0, teamMembers: 1 },
    canUse: mockCanUse,
    usage: null,
    subscription: null,
  }),
}));

// Mock UpgradePrompt to verify it receives correct props
vi.mock('@/components/upgrade-prompt', () => ({
  UpgradePrompt: ({ feature, action, variant }: { feature: string; action: string; variant?: string }) => (
    <div data-testid="upgrade-prompt">
      <span data-testid="upgrade-feature">{feature}</span>
      <span data-testid="upgrade-action">{action}</span>
      {variant && <span data-testid="upgrade-variant">{variant}</span>}
      <h3>Upgrade to Pro to {action}</h3>
      <button>Upgrade now</button>
    </div>
  ),
}));

describe('TierGate', () => {
  beforeEach(() => {
    mockCanUse.mockReset();
  });

  it('shows children when user has access (pro tier)', () => {
    mockCanUse.mockReturnValue(true);

    render(
      <TierGate feature="ai">
        <div>AI Studio Content</div>
      </TierGate>,
    );

    expect(screen.getByText('AI Studio Content')).toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument();
  });

  it('shows upgrade prompt when user does not have access (free tier)', () => {
    mockCanUse.mockReturnValue(false);

    render(
      <TierGate feature="ai">
        <div>AI Studio Content</div>
      </TierGate>,
    );

    expect(screen.queryByText('AI Studio Content')).not.toBeInTheDocument();
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Pro to use AI tools')).toBeInTheDocument();
  });

  it('passes the correct feature and action to UpgradePrompt', () => {
    mockCanUse.mockReturnValue(false);

    render(
      <TierGate feature="workspaces">
        <div>Workspace Settings</div>
      </TierGate>,
    );

    expect(screen.getByTestId('upgrade-feature')).toHaveTextContent('workspaces');
    expect(screen.getByTestId('upgrade-action')).toHaveTextContent('create more workspaces');
  });

  it('uses custom action label when provided', () => {
    mockCanUse.mockReturnValue(false);

    render(
      <TierGate feature="ai" action="generate AI thumbnails">
        <div>Thumbnail Generator</div>
      </TierGate>,
    );

    expect(screen.getByTestId('upgrade-action')).toHaveTextContent('generate AI thumbnails');
  });

  it('falls back to "access {feature}" when no ACTION_LABEL exists', () => {
    mockCanUse.mockReturnValue(false);

    render(
      <TierGate feature="aiCredits">
        <div>Credits Panel</div>
      </TierGate>,
    );

    expect(screen.getByTestId('upgrade-action')).toHaveTextContent('use AI credits');
  });

  it('renders custom fallback instead of UpgradePrompt when provided', () => {
    mockCanUse.mockReturnValue(false);

    render(
      <TierGate
        feature="ai"
        fallback={<div data-testid="custom-fallback">Custom locked message</div>}
      >
        <div>Protected Content</div>
      </TierGate>,
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom locked message')).toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-prompt')).not.toBeInTheDocument();
  });

  it('calls canUse with the correct feature key', () => {
    mockCanUse.mockReturnValue(true);

    render(
      <TierGate feature="teamMembers">
        <div>Team Page</div>
      </TierGate>,
    );

    expect(mockCanUse).toHaveBeenCalledWith('teamMembers');
  });

  it('passes the variant prop to UpgradePrompt', () => {
    mockCanUse.mockReturnValue(false);

    render(
      <TierGate feature="ai" variant="overlay">
        <div>Overlay Content</div>
      </TierGate>,
    );

    expect(screen.getByTestId('upgrade-variant')).toHaveTextContent('overlay');
  });
});
