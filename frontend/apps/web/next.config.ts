import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  transpilePackages: [
    '@ordo/types',
    '@ordo/validations',
    '@ordo/core',
    '@ordo/i18n',
    '@ordo/ui',
    '@ordo/hooks',
    '@ordo/stores',
    '@ordo/api-client',
    'react-markdown',
    'remark-gfm',
    'vfile',
    'vfile-message',
    'unist-util-stringify-position',
  ],
  images: {
    domains: [
      'localhost',
      'api.creators.ordo.app',
      'cdn.creators.ordo.app',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default withSentryConfig(withAnalyzer(withNextIntl(nextConfig)), {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps to Sentry for better stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically instrument Next.js data-fetching and API routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
});
