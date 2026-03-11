import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  enabled: !!process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Configure transaction names for key routes
  beforeSendTransaction(event) {
    const transactionName = event.transaction;
    if (transactionName) {
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
});
