import * as React from 'react';
import { useTier, type TierLimits } from '@/hooks/use-tier';
import { UpgradePrompt } from '@/components/upgrade-prompt';

interface TierGateProps {
  feature: keyof TierLimits;
  /** Human-readable description shown in the upgrade prompt, e.g. "use AI tools" */
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'overlay' | 'inline';
}

const ACTION_LABELS: Partial<Record<keyof TierLimits, string>> = {
  ai: 'use AI tools',
  workspaces: 'create more workspaces',
  aiCredits: 'use AI credits',
  teamMembers: 'add team members',
};

export function TierGate({
  feature,
  action,
  children,
  fallback,
  variant = 'inline',
}: TierGateProps) {
  const { canUse } = useTier();
  const allowed = canUse(feature);

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <UpgradePrompt
        feature={String(feature)}
        action={action ?? ACTION_LABELS[feature] ?? `access ${String(feature)}`}
        variant={variant}
      />
    );
  }

  return <>{children}</>;
}
