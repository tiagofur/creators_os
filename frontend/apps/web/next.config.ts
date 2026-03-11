import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

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

export default withNextIntl(nextConfig);
