import * as Sentry from '@sentry/nextjs';

interface SentryUser {
  workspaceId: string;
  tier: string;
}

/**
 * Sets Sentry user context so every error and transaction event
 * includes workspaceId and tier.
 */
export function setSentryUser({ workspaceId, tier }: SentryUser): void {
  Sentry.setUser({
    id: workspaceId,
  });
  Sentry.setTag('workspace_id', workspaceId);
  Sentry.setTag('tier', tier);
  Sentry.setContext('workspace', {
    workspaceId,
    tier,
  });
}

/**
 * Clears Sentry user context (e.g. on logout).
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}
