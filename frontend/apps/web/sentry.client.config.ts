import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: isProduction ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Configure transaction names for key routes
  beforeSendTransaction(event) {
    const transactionName = event.transaction;
    if (transactionName) {
      // Normalize locale-prefixed route names for dashboard, ideas, and pipeline
      const routePatterns: Record<string, string> = {
        '/dashboard': 'dashboard',
        '/ideas': 'ideas',
        '/pipeline': 'pipeline',
      };

      for (const [pattern, name] of Object.entries(routePatterns)) {
        if (transactionName.includes(pattern)) {
          event.transaction = name;
          break;
        }
      }
    }
    return event;
  },

  // Attach user context to every event
  beforeSend(event) {
    return event;
  },
});
