import * as Sentry from '@sentry/nextjs';

// ---------------------------------------------------------------------------
// Event type definitions — no PII (emails, names) in any props
// ---------------------------------------------------------------------------

export type AnalyticsEvent =
  | { name: 'idea_captured'; props: { source: 'cmd_k' | 'button' | 'quick_capture' } }
  | { name: 'content_stage_changed'; props: { from: string; to: string; contentId: string } }
  | { name: 'ai_credit_used'; props: { tool: string; creditsUsed: number } }
  | { name: 'upgrade_clicked'; props: { source: string; currentTier: string } };

// ---------------------------------------------------------------------------
// trackEvent
// ---------------------------------------------------------------------------

/**
 * Fire a lightweight analytics event via Sentry breadcrumbs.
 *
 * - Uses `Sentry.addBreadcrumb` so the event is attached to the next error or
 *   transaction, giving us product-analytics signal without a separate vendor.
 * - Falls back to `console.debug` in development when Sentry is unavailable.
 * - NEVER include PII (emails, names) in `props`.
 */
export function trackEvent<E extends AnalyticsEvent>(
  name: E['name'],
  props?: E['props'],
): void {
  const data = props ?? {};

  try {
    Sentry.addBreadcrumb({
      category: 'analytics',
      message: name,
      data,
      level: 'info',
    });
  } catch {
    // Sentry not initialised (e.g. local dev without DSN)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] ${name}`, data);
    }
  }
}
