# Performance Optimization — Ordo Creator OS

**Status:** Production Ready  
**Last Updated:** 2026-03-10  
**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, React Query, Zustand, Turbopack

---

## 1. Core Web Vitals Targets

Ordo Creator OS targets strict Core Web Vitals metrics to ensure a snappy, responsive user experience across all devices and network conditions.

| Metric | Target | Notes |
|--------|--------|-------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Primary content visible within 2.5 seconds on 4G/mobile |
| **FID** (First Input Delay) | < 100ms | Instant response to user interactions |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Minimal visual instability |
| **TTFB** (Time to First Byte) | < 200ms | Server response time (includes network latency) |

### Monitoring Strategy

- **Real User Monitoring (RUM):** Capture metrics from production via `web-vitals` library
- **Lab Testing:** Next.js analyzers, Lighthouse CI in pull requests
- **Alerting:** Sentry performance monitoring triggers warnings if metrics degrade
- **Dashboard:** Custom Grafana dashboard displays hourly aggregates

### Performance Budget

- Initial page load: **< 3.5MB** JavaScript (gzipped)
- Route-based budget: **< 150KB** per route (gzipped)
- Image budget: **< 500KB** per page average
- Font budget: **< 100KB** (preloaded + system fallback)

---

## 2. Next.js App Router Optimization

Leverage the App Router's server-first architecture to minimize client-side work and streaming capabilities for faster perceived performance.

### Server vs Client Components Strategy

**When to use Server Components (default):**
- Data fetching (databases, APIs, private keys stay on server)
- Sensitive operations (authentication checks, payment processing)
- Large dependencies (markdown parsers, chart libraries)
- Static content (headers, footers, navigation context)
- Streaming rendering (lazy-load below-the-fold content)

**When to use Client Components (`'use client'`):**
- Interactive features (forms, buttons, animations)
- Browser APIs (localStorage, sessionStorage, window events)
- React hooks (useState, useEffect, useContext)
- Event listeners (click, input, scroll, focus)

### Best Practice Pattern

```typescript
// app/dashboard/page.tsx - Server Component
import { DashboardContent } from './DashboardContent';
import { Suspense } from 'react';

export default async function DashboardPage() {
  // This runs on the server, has access to databases
  const user = await getUser();
  const initialData = await fetchDashboardData(user.id);
  
  return (
    <div>
      <header>{/* static header */}</header>
      <Suspense fallback={<Skeleton />}>
        {/* Stream this part after initial HTML is sent */}
        <DashboardContent initialData={initialData} />
      </Suspense>
    </div>
  );
}

// components/DashboardContent.tsx - Client Component (only when needed)
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function DashboardContent({ initialData }) {
  const [filter, setFilter] = useState('');
  
  const { data } = useQuery({
    queryKey: ['dashboard', filter],
    queryFn: () => fetchFiltered(filter),
    initialData, // Use server-provided data immediately
    staleTime: 30 * 1000, // 30 seconds
  });
  
  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter..."
      />
      {/* render filtered data */}
    </div>
  );
}
```

### Streaming with Suspense

```typescript
// app/content/[id]/page.tsx
import { Suspense } from 'react';

export default function ContentPage({ params }) {
  return (
    <article>
      <header>
        <h1>Loading content...</h1>
      </header>
      
      {/* Critical path: title + metadata stream immediately */}
      <Suspense fallback={<MetadataSkeleton />}>
        <ContentMetadata id={params.id} />
      </Suspense>
      
      {/* Below-the-fold: body streams after initial paint */}
      <Suspense fallback={<BodySkeleton />}>
        <ContentBody id={params.id} />
      </Suspense>
      
      {/* Comments: lazy load after content is visible */}
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsSection id={params.id} />
      </Suspense>
    </article>
  );
}

async function ContentMetadata({ id }) {
  const metadata = await fetchContentMetadata(id);
  return <h1>{metadata.title}</h1>;
}

async function ContentBody({ id }) {
  const body = await fetchContentBody(id);
  return <div dangerouslySetInnerHTML={{ __html: body }} />;
}

async function CommentsSection({ id }) {
  const comments = await fetchComments(id);
  return <div>{/* render comments */}</div>;
}
```

### Partial Prerendering (PPR)

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: 'incremental', // Enable PPR incrementally
  },
};

module.exports = nextConfig;

// app/explore/page.tsx - Static shell + dynamic content
export const experimental_ppr = true; // Mark route for PPR

export default async function ExplorePage() {
  return (
    <div>
      {/* This shell is prerendered and reused for every request */}
      <Header /> {/* static navigation */}
      <Sidebar /> {/* static sidebars */}
      
      {/* This suspends and streams dynamically per request */}
      <Suspense fallback={<GridSkeleton />}>
        <DynamicGrid />
      </Suspense>
    </div>
  );
}

async function DynamicGrid() {
  const personalized = await fetchPersonalizedContent();
  return <Grid items={personalized} />;
}
```

---

## 3. Code Splitting

Automatically split code by route and component to reduce initial bundle size and enable lazy loading only when needed.

### Route-Based Splitting (Automatic)

Next.js App Router automatically splits at route boundaries:

```
dist/
  app/
    layout.js          → 45KB (shared)
    page.js            → 120KB (/)
    dashboard/
      page.js          → 180KB (/dashboard)
      [id]/
        page.js        → 150KB (/dashboard/[id])
    studio/
      page.js          → 210KB (/studio)
      editor/
        page.js        → 220KB (/studio/editor)
```

Each route loads only its necessary code. Shared code between routes is extracted into the layout chunk.

### Dynamic Imports (Component-Level)

```typescript
// components/Editor.tsx - Heavy component, only load on demand
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CodeEditor = dynamic(
  () => import('./CodeEditor'),
  {
    loading: () => <EditorSkeleton />,
    ssr: false, // Don't render on server if it uses browser APIs
  }
);

const MarkdownPreview = dynamic(
  () => import('./MarkdownPreview'),
  { loading: () => <PreviewSkeleton /> }
);

export function Editor() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  return (
    <div>
      <CodeEditor defaultValue="// code here" />
      <MarkdownPreview />
      
      {showAdvanced && (
        <Suspense fallback={<AdvancedSkeleton />}>
          <AdvancedSettings />
        </Suspense>
      )}
    </div>
  );
}
```

### React.lazy + Suspense

```typescript
// For manual control over code splitting
'use client';

import { Suspense, lazy, useState } from 'react';

const MediaGallery = lazy(() => import('./MediaGallery'));
const SearchPanel = lazy(() => import('./SearchPanel'));
const AnalyticsChart = lazy(() => import('./AnalyticsChart'));

export function Dashboard() {
  const [tab, setTab] = useState('gallery');
  
  return (
    <>
      <nav>
        <button onClick={() => setTab('gallery')}>Gallery</button>
        <button onClick={() => setTab('search')}>Search</button>
        <button onClick={() => setTab('analytics')}>Analytics</button>
      </nav>
      
      <Suspense fallback={<LoadingSpinner />}>
        {tab === 'gallery' && <MediaGallery />}
        {tab === 'search' && <SearchPanel />}
        {tab === 'analytics' && <AnalyticsChart />}
      </Suspense>
    </>
  );
}
```

---

## 4. Bundle Analysis

Monitor bundle size continuously to prevent performance regressions.

### @next/bundle-analyzer Setup

```bash
npm install --save-dev @next/bundle-analyzer
```

```typescript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      resolveAlias: {
        '@': './src',
      },
    },
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

### Analyze Bundle

```bash
# Generate bundle analysis report
ANALYZE=true npm run build

# Opens interactive HTML report showing chunk breakdown
```

### GitHub Actions CI Integration

```yaml
# .github/workflows/bundle-check.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm install
      - run: ANALYZE=true npm run build
      
      - name: Upload bundle report
        uses: actions/upload-artifact@v4
        with:
          name: bundle-report
          path: .next/analyze
      
      - name: Comment bundle size
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('.next/analyze/report.html', 'utf8');
            const lines = report.split('\n');
            const totalSize = extractSize(report);
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📦 Bundle Size: ${totalSize}\n\nSee artifacts for full report.`
            });
```

### Size Budget Per Route

```typescript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');
const gzip = require('gzip-size');

const budgets = {
  'app/page.js': 150 * 1024, // 150KB
  'app/dashboard/page.js': 200 * 1024, // 200KB
  'app/studio/page.js': 250 * 1024, // 250KB
  'app/studio/editor/page.js': 280 * 1024, // 280KB
};

async function checkBudgets() {
  const nextDir = path.join(process.cwd(), '.next/static/chunks');
  
  for (const [route, budget] of Object.entries(budgets)) {
    const filename = route.replace(/\//g, '-').replace('.js', '');
    const files = fs.readdirSync(nextDir).filter(f => f.includes(filename));
    
    for (const file of files) {
      const filepath = path.join(nextDir, file);
      const size = await gzip.file(filepath);
      
      if (size > budget) {
        console.error(
          `❌ ${route} exceeds budget: ${(size / 1024).toFixed(2)}KB > ${(budget / 1024).toFixed(2)}KB`
        );
        process.exit(1);
      } else {
        console.log(
          `✓ ${route} OK: ${(size / 1024).toFixed(2)}KB < ${(budget / 1024).toFixed(2)}KB`
        );
      }
    }
  }
}

checkBudgets();
```

Run in CI:
```bash
npm run check-bundle-size
```

---

## 5. Image Optimization

Images are typically the largest assets. Optimize with next/image and smart delivery strategies.

### next/image Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Responsive image sizes to generate
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Supported formats in priority order
    formats: ['image/avif', 'image/webp', 'image/jpeg'],
    
    // Cache strategy
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year for hashed images
    
    // CloudFront CDN integration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd*.cloudfront.net',
        port: '',
        pathname: '/images/**',
      },
    ],
    
    // Dangerously allow external domains (only production CDN)
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
```

### Responsive Images Component

```typescript
// components/ResponsiveImage.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
}: ResponsiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div className="relative overflow-hidden bg-gray-100">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={80} // 0-100, default 75
        sizes="(max-width: 640px) 100vw,
               (max-width: 1024px) 50vw,
               33vw"
        className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-lg grayscale' : 'scale-100 blur-0 grayscale-0'}
          ${className}
        `}
        onLoadingComplete={() => setIsLoading(false)}
      />
    </div>
  );
}
```

### Media Grid with Lazy Loading

```typescript
// components/MediaGrid.tsx
'use client';

import { useCallback, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ResponsiveImage } from './ResponsiveImage';

interface MediaItem {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

export function MediaGrid() {
  const [page, setPage] = useState(1);
  const { ref, inView } = useInView({ threshold: 0.1 });
  
  const { data, isLoading, hasNextPage, fetchNextPage } = useQuery({
    queryKey: ['media', page],
    queryFn: ({ queryKey: [, page] }) =>
      fetch(`/api/media?page=${page}`).then(r => r.json()),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.nextPage ? lastPage.nextPage : undefined,
  });
  
  // Load next page when grid comes into view
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isLoading, fetchNextPage]);
  
  const items = data?.pages.flatMap(p => p.items) || [];
  
  if (!data) return <GridSkeleton />;
  
  return (
    <div>
      <AutoSizer>
        {({ height, width }) => (
          <Grid
            columnCount={Math.floor(width / 280)}
            columnSize={280}
            height={height}
            rowCount={Math.ceil(items.length / Math.floor(width / 280))}
            rowSize={280}
            width={width}
            itemData={items}
          >
            {({ columnIndex, rowIndex, style }) => {
              const index = rowIndex * Math.floor(width / 280) + columnIndex;
              const item = items[index];
              
              if (!item) return null;
              
              return (
                <div style={style} className="p-2">
                  <ResponsiveImage
                    src={item.src}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                  />
                </div>
              );
            }}
          </Grid>
        )}
      </AutoSizer>
      
      {/* Trigger load more when footer comes into view */}
      <div ref={ref} className="h-10" />
      {inView && hasNextPage && handleLoadMore()}
    </div>
  );
}
```

### Video Thumbnail Generation & Sprites

```typescript
// lib/videoThumbnails.ts
import { ImageResponse } from 'next/og';

/**
 * Generate sprite sheet of video thumbnails for efficient lazy loading
 * Call during upload, store URL for streaming playback preview
 */
export async function generateVideoThumbnailSprite(
  videoUrl: string,
  options = { count: 12, width: 160, height: 90 }
) {
  // In production: use FFmpeg or cloud service (AWS MediaConvert, Cloudinary)
  // This example shows the interface
  
  const thumbnails = await extractFrames(videoUrl, options.count);
  const spriteBuffer = combineIntoSprite(thumbnails, options);
  
  // Upload to CloudFront with cache headers
  const spriteUrl = await uploadToCloudFront(spriteBuffer, {
    cacheControl: 'max-age=31536000, immutable', // 1 year
  });
  
  return {
    spriteUrl,
    frameWidth: options.width,
    frameHeight: options.height,
    frameCount: options.count,
  };
}

// Usage in video player
export function VideoPlayer({ videoId, spriteUrl }) {
  return (
    <video
      controls
      poster={`${spriteUrl}#xywh=0,0,160,90`} // First frame
      onMouseMove={(e) => {
        // Update poster on hover based on position
        const frame = calculateFrameFromPosition(e);
        e.currentTarget.style.backgroundImage = `url(${spriteUrl}#xywh=${frame.x},${frame.y},160,90)`;
      }}
    >
      <source src={videoId} type="video/mp4" />
    </video>
  );
}
```

### Blur Placeholder Strategy

```typescript
// lib/blurDataUrl.ts
import { getPlaiceholder } from 'plaiceholder';

export async function getBlurDataUrl(src: string) {
  const { base64 } = await getPlaiceholder(src, {
    size: 10, // tiny 10x10 version
  });
  
  return base64;
}

// Build-time generation
export async function generateImageMetadata(images: string[]) {
  const imageDataMap = {};
  
  for (const src of images) {
    imageDataMap[src] = await getBlurDataUrl(src);
  }
  
  // Save to .json for app to use
  fs.writeFileSync(
    './public/image-metadata.json',
    JSON.stringify(imageDataMap)
  );
}

// In component
import imageMetadata from '@/public/image-metadata.json';

export function Image({ src }) {
  const blurDataUrl = imageMetadata[src];
  
  return (
    <Image
      src={src}
      alt=""
      placeholder="blur"
      blurDataURL={blurDataUrl}
    />
  );
}
```

---

## 6. Font Optimization

Fonts are critical resources that block text rendering. Optimize aggressively.

### next/font/google Setup

```typescript
// app/fonts.ts
import { Inter, Merriweather } from 'next/font/google';

// Subset: load only Latin to reduce file size
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Show fallback while loading
  variable: '--font-inter',
  fallback: ['system-ui', 'sans-serif'],
});

export const serif = Merriweather({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  fallback: ['Georgia', 'serif'],
});

// app/layout.tsx
import { inter, serif } from './fonts';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <head>
        {/* Preconnect to Google Fonts CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
```

### Tailwind CSS Font Variable Integration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      sans: 'var(--font-inter), system-ui, sans-serif',
      serif: 'var(--font-serif), Georgia, serif',
    },
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

### Font Loading Best Practices

```typescript
// CSS in app/globals.css
/* Prevent CLS during font swap */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial'), local('sans-serif');
  ascent-override: 90%;
  descent-override: 22.5%;
  line-gap-override: 0%;
}

body {
  font-family: 'Inter', 'Inter Fallback', system-ui;
}

/* Reduce CLS for serif font too */
@supports (font-variant-numeric: tabular-nums) {
  body {
    font-variant-numeric: tabular-nums;
  }
}
```

### Font Subsetting Strategy

Only load characters you actually use:

```typescript
// next.config.js
{
  fonts: {
    google: [
      {
        family: 'Inter',
        axes: [
          {
            tag: 'wght',
            value: '400 700', // Only 400 and 700 weights
          },
        ],
        unicode_range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
      },
    ],
  },
}
```

---

## 7. Data Fetching Optimization

Reduce loading states and perceived latency through smart caching and prefetching.

### React Query Stale Times Per Resource Type

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (default)
      gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// Query-specific stale times
const queryConfigs = {
  // User profile: stable, cache longer
  'user.profile': {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  
  // Content list: changes frequently
  'content.list': {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Analytics: near real-time but not critical
  'analytics.metrics': {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Static data: cache very long
  'settings.categories': {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};

export function getQueryConfig(key: string) {
  return queryConfigs[key] || queryClient.getDefaultOptions().queries;
}
```

### Prefetch on Hover/Focus

```typescript
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

interface PrefetchableLinkProps {
  href: string;
  queryKey: string[];
  queryFn: () => Promise<any>;
  children: React.ReactNode;
}

export function PrefetchableLink({
  href,
  queryKey,
  queryFn,
  children,
}: PrefetchableLinkProps) {
  const queryClient = useQueryClient();
  
  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 10 * 1000, // Valid for 10s
    });
  }, [queryClient, queryKey, queryFn]);
  
  return (
    <a
      href={href}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
    >
      {children}
    </a>
  );
}

// Usage
export function ContentList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <PrefetchableLink
            href={`/content/${item.id}`}
            queryKey={['content', item.id]}
            queryFn={() =>
              fetch(`/api/content/${item.id}`).then(r => r.json())
            }
          >
            {item.title}
          </PrefetchableLink>
        </li>
      ))}
    </ul>
  );
}
```

### Infinite Scroll with Virtualization

```typescript
'use client';

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

export function InfiniteMediaGrid({
  apiEndpoint,
  pageSize = 20,
}) {
  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['media'],
    queryFn: ({ pageParam = 0 }) =>
      fetch(`${apiEndpoint}?page=${pageParam}&limit=${pageSize}`)
        .then(r => r.json()),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    staleTime: 5 * 60 * 1000,
  });
  
  const items = useMemo(
    () => data?.pages.flatMap(p => p.items) || [],
    [data]
  );
  
  const itemCount = hasNextPage ? items.length + 1 : items.length;
  const isItemLoaded = useCallback(
    (index: number) => !hasNextPage || index < items.length,
    [hasNextPage, items.length]
  );
  
  const loadMoreItems = useCallback(() => {
    if (!isFetching) {
      fetchNextPage();
    }
  }, [isFetching, fetchNextPage]);
  
  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <List
          height={800}
          itemCount={itemCount}
          itemSize={280}
          width="100%"
          onItemsRendered={onItemsRendered}
          ref={ref}
          layout="vertical"
        >
          {({ index, style }) => {
            if (!isItemLoaded(index)) {
              return <LoadingCell style={style} />;
            }
            
            const item = items[index];
            return (
              <div style={style} className="p-2">
                <MediaCard item={item} />
              </div>
            );
          }}
        </List>
      )}
    </InfiniteLoader>
  );
}
```

### Parallel Queries

```typescript
'use client';

import { useQueries } from '@tanstack/react-query';

export function Dashboard({ contentIds }: { contentIds: string[] }) {
  // Fetch multiple pieces of content in parallel
  const results = useQueries({
    queries: contentIds.map(id => ({
      queryKey: ['content', id],
      queryFn: () =>
        fetch(`/api/content/${id}`).then(r => r.json()),
      staleTime: 5 * 60 * 1000,
    })),
  });
  
  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);
  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((result, idx) => (
        <ContentCard key={contentIds[idx]} content={result.data} />
      ))}
    </div>
  );
}
```

---

## 8. Rendering Optimization

Minimize re-renders and optimize React component performance.

### React.memo for Expensive Components

```typescript
// components/MediaCard.tsx
import { memo } from 'react';

interface MediaCardProps {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  onClick?: (id: string) => void;
}

// Only re-render if props actually changed
export const MediaCard = memo(function MediaCard({
  id,
  title,
  thumbnail,
  views,
  onClick,
}: MediaCardProps) {
  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick?.(id)}
    >
      <img src={thumbnail} alt={title} className="w-full h-40 object-cover" />
      <div className="p-3">
        <h3 className="font-semibold truncate">{title}</h3>
        <p className="text-xs text-gray-500">{views.toLocaleString()} views</p>
      </div>
    </div>
  );
});

MediaCard.displayName = 'MediaCard';
```

### useMemo Guidelines

```typescript
'use client';

import { useMemo, useCallback, useState } from 'react';

export function FilteredList({ items, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  
  // Only recompute when items, searchTerm, or sortBy changes
  const filteredItems = useMemo(() => {
    let result = items.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (sortBy === 'date') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'views') {
      result.sort((a, b) => b.views - a.views);
    }
    
    return result;
  }, [items, searchTerm, sortBy]);
  
  // Use useCallback to memoize event handler
  const handleSelect = useCallback(
    (item) => {
      onSelect(item.id);
    },
    [onSelect]
  );
  
  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="date">Recent</option>
        <option value="views">Popular</option>
      </select>
      
      <div className="space-y-2">
        {filteredItems.map(item => (
          <MediaCard
            key={item.id}
            {...item}
            onClick={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
```

### Virtualized Lists

```typescript
'use client';

import { FixedSizeList as List } from 'react-window';
import { memo } from 'react';

const ListItem = memo(function ListItem({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: any[];
}) {
  const item = data[index];
  return (
    <div style={style} className="px-4 py-2 border-b">
      <h3 className="font-semibold">{item.title}</h3>
      <p className="text-sm text-gray-600">{item.description}</p>
    </div>
  );
});

export function VirtualizedContentList({ items }) {
  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={80}
      width="100%"
      itemData={items}
    >
      {ListItem}
    </List>
  );
}
```

---

## 9. State Management Performance

Use Zustand efficiently to avoid unnecessary re-renders.

### Selective Subscriptions

```typescript
// store/mediaStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface MediaStore {
  items: any[];
  filter: string;
  sortBy: 'date' | 'views';
  
  setItems: (items: any[]) => void;
  setFilter: (filter: string) => void;
  setSortBy: (sortBy: 'date' | 'views') => void;
}

export const useMediaStore = create<MediaStore>()(
  subscribeWithSelector((set) => ({
    items: [],
    filter: '',
    sortBy: 'date',
    
    setItems: (items) => set({ items }),
    setFilter: (filter) => set({ filter }),
    setSortBy: (sortBy) => set({ sortBy }),
  }))
);

// Component only subscribes to items, not filter changes
export function MediaGrid() {
  // Only re-render when items change
  const items = useMediaStore((state) => state.items);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} />
      ))}
    </div>
  );
}

// Component only subscribes to filter
export function FilterInput() {
  const filter = useMediaStore((state) => state.filter);
  const setFilter = useMediaStore((state) => state.setFilter);
  
  return (
    <input
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Shallow Comparison

```typescript
// Zustand automatically uses shallow comparison for object selectors
const user = useMediaStore((state) => ({
  name: state.user.name,
  email: state.user.email,
  // Only re-renders if name OR email changed
}));

// For complex comparisons, use shallowEqual
import { shallow } from 'zustand/react/shallow';

const filters = useMediaStore(
  (state) => ({
    filter: state.filter,
    sortBy: state.sortBy,
  }),
  shallow
);
```

### Batch Updates to Prevent Multiple Renders

```typescript
// store/mediaStore.ts
import { create } from 'zustand';

export const useMediaStore = create((set) => ({
  items: [],
  filter: '',
  sortBy: 'date',
  
  // Single update instead of three separate calls
  updateFiltersAndSort: (filter: string, sortBy: string) => {
    set({
      filter,
      sortBy,
    });
  },
  
  // For async operations, use batching
  fetchAndSetItems: async (url: string) => {
    const items = await fetch(url).then(r => r.json());
    set({ items }); // Single update
  },
}));

// Usage
export function Filters() {
  const updateFiltersAndSort = useMediaStore(
    (state) => state.updateFiltersAndSort
  );
  
  return (
    <>
      <input
        onChange={(e) => {
          // This triggers one re-render, not two
          updateFiltersAndSort(e.target.value, 'date');
        }}
      />
    </>
  );
}
```

---

## 10. Caching Strategy

Multi-layered caching: HTTP cache → React Query → Service Worker → CDN.

### Next.js fetch() Caching

```typescript
// Server components use Next.js fetch caching automatically
export default async function Page() {
  // Cached by default (similar to getStaticProps)
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  });
  
  // Or use cache: 'no-store' to always fetch fresh
  const liveData = await fetch('https://api.example.com/live', {
    cache: 'no-store',
  });
  
  return <div>{/* render */}</div>;
}
```

### React Query Cache Configuration

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale while revalidate pattern
      staleTime: 5 * 60 * 1000, // 5 minutes (serve from cache)
      gcTime: 30 * 60 * 1000, // 30 minutes (keep in memory)
      
      // Automatic refetching on network recovery
      refetchOnReconnect: true,
      refetchOnWindowFocus: 'stale',
    },
  },
});

// Per-query cache configuration
const { data } = useQuery({
  queryKey: ['content', id],
  queryFn: () => fetchContent(id),
  
  // Cache for 5 minutes, then background refetch
  staleTime: 5 * 60 * 1000,
  
  // Keep 30 minutes in memory even if unused
  gcTime: 30 * 60 * 1000,
  
  // Use cached data while refetching
  refetchOnMount: 'stale',
  refetchOnWindowFocus: 'stale',
});
```

### Service Worker for Offline Support

```typescript
// public/sw.js - Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ordo-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/styles/main.css',
        '/scripts/app.js',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Network-first for API calls
  if (request.url.includes('/api/')) {
    return event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            caches.open('ordo-api-v1').then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request);
        })
    );
  }
  
  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((response) => {
          if (response.status === 200 && !request.url.includes('/api/')) {
            caches.open('ordo-assets-v1').then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
      );
    })
  );
});

// app/layout.tsx - Register SW
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed, app still works
      });
    }
  }, []);
  
  return null;
}
```

### CDN Cache Headers

```typescript
// API routes set cache headers for CloudFront
export async function GET(request: Request, { params }) {
  const data = await fetchContent(params.id);
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      
      // CloudFront/Cloudflare caching
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      
      // For versioned assets
      'CDN-Cache-Control': 'max-age=31536000, immutable',
      
      // ETag for validation
      'ETag': hashContent(data),
    },
  });
}
```

---

## 11. Media Handling

Optimize how media (images, videos, audio) loads and displays.

### Lazy Loading Media

```typescript
'use client';

import { useState } from 'react';
import { useInView } from 'react-intersection-observer';

export function LazyMediaCard({ src, alt, onLoad }) {
  const { ref, inView } = useInView({
    triggerOnce: true, // Only load once
    threshold: 0.1,
  });
  
  return (
    <div ref={ref}>
      {inView ? (
        <img src={src} alt={alt} onLoad={onLoad} />
      ) : (
        <div className="bg-gray-200 aspect-square rounded-lg" />
      )}
    </div>
  );
}
```

### Progressive Image Loading

```typescript
'use client';

import { useState } from 'react';

export function ProgressiveImage({
  lowQualitySrc,
  highQualitySrc,
  alt,
}: {
  lowQualitySrc: string;
  highQualitySrc: string;
  alt: string;
}) {
  const [imageSrc, setImageSrc] = useState(lowQualitySrc);
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <picture>
      <img
        src={imageSrc}
        alt={alt}
        onLoad={() => {
          setImageSrc(highQualitySrc);
          setIsLoading(false);
        }}
        className={`transition-all duration-300 ${
          isLoading ? 'blur-md' : 'blur-0'
        }`}
      />
    </picture>
  );
}
```

### Lazy Load Video Player

```typescript
'use client';

import { useState } from 'react';
import { useInView } from 'react-intersection-observer';

export function LazyVideoPlayer({ videoId, thumbnailSrc }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div ref={ref} className="aspect-video bg-black rounded-lg overflow-hidden">
      {!inView ? (
        <img
          src={thumbnailSrc}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
      ) : isPlaying ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title="Video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      ) : (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/70 transition"
        >
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3v18l15-9z" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

### Media Optimization Pipeline

```typescript
// lib/mediaOptimization.ts
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Optimize image for delivery:
 * 1. Convert to WebP/AVIF
 * 2. Generate responsive sizes
 * 3. Create blur placeholder
 * 4. Upload to CloudFront
 */
export async function optimizeImage(file: File) {
  const buffer = await file.arrayBuffer();
  const image = sharp(buffer);
  
  // Generate multiple sizes for responsive images
  const sizes = [640, 1024, 1920];
  const optimized = await Promise.all(
    sizes.map(async (size) => {
      const resized = image.resize(size, size, { fit: 'cover' });
      
      // Generate WebP
      const webp = await resized.webp({ quality: 80 }).toBuffer();
      
      // Generate AVIF (better compression, slower)
      const avif = await resized.avif({ quality: 75 }).toBuffer();
      
      return { size, webp, avif };
    })
  );
  
  // Upload all variants to CloudFront
  const urls = await Promise.all(
    optimized.map(({ size, webp, avif }) =>
      uploadToCloudFront(`image-${size}.webp`, webp)
    )
  );
  
  return urls;
}

/**
 * Optimize video for streaming:
 * 1. Transcode to H.264 + VP9
 * 2. Generate HLS/DASH manifests
 * 3. Create thumbnail sprites
 */
export async function optimizeVideo(filePath: string) {
  const output = {
    hls: [],
    dash: [],
    thumbnails: null,
  };
  
  // HLS variants (Adaptive Bitrate Streaming)
  const bitrates = [480, 720, 1080];
  
  for (const bitrate of bitrates) {
    const file = `video-${bitrate}p.ts`;
    
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .outputOptions([
          '-c:v libx264',
          `-b:v ${bitrate}k`,
          '-c:a aac',
          '-b:a 128k',
          '-hls_time 10',
          '-hls_list_size 0',
          '-hls_segment_type mpegts',
        ])
        .output(`output/${file}`)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    
    output.hls.push(await uploadToCloudFront(file, `output/${file}`));
  }
  
  // Thumbnail sprite
  output.thumbnails = await generateVideoThumbnailSprite(filePath);
  
  return output;
}
```

---

## 12. Mobile Performance

Optimize for React Native and mobile web.

### React Native Performance

```typescript
// app/(native)/index.tsx - React Native screen
import React, { useMemo } from 'react';
import { View, FlatList, Image, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

interface MediaItem {
  id: string;
  thumbnail: string;
  title: string;
}

export function MediaGrid() {
  // Parallel queries with React Query on React Native
  const { data: items = [] } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await fetch('/api/media?limit=50');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  
  // Memoize item render function to prevent re-renders
  const renderItem = useMemo(
    () => ({ item }: { item: MediaItem }) => (
      <View className="w-1/3 p-1">
        <Image
          source={{ uri: item.thumbnail }}
          className="w-full h-32 rounded-lg"
        />
        <Text className="text-xs mt-1 truncate">{item.title}</Text>
      </View>
    ),
    []
  );
  
  // FlatList optimization for long lists
  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={3}
      maxToRenderPerBatch={10} // Reduce batch size for performance
      updateCellsBatchingPeriod={50} // Debounce render
      initialNumToRender={20} // Lazy load
      removeClippedSubviews={true} // Remove off-screen items
      scrollEventThrottle={16} // Throttle scroll events
      onEndReachedThreshold={0.5} // Prefetch 50% before end
      onEndReached={() => {
        // Load more items
      }}
      ListFooterComponent={<LoadingIndicator />}
    />
  );
}
```

### Hermes Engine & RAM Bundles

```typescript
// metro.config.js - React Native build config
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    // Use Hermes engine for faster startup and reduced memory
    experimentalEnableHermes: true,
  },
  
  // Enable RAM bundles for faster app startup
  serializer: {
    createModuleIdFactory: () => (path) => {
      return path
        .split('/')
        .reverse()
        .find((part) => part !== '.' && part !== '..');
    },
    getPolyfills: () =>
      require('@react-native/js-polyfills/implementation'),
    getModulesRunBeforeMainModule: () => [
      require.resolve(
        '@react-native/js-polyfills/nativeModuleProxy'
      ),
      require.resolve(
        '@react-native/js-polyfills/lazyRequireDecorator'
      ),
      require.resolve(
        '@react-native/js-polyfills/error-guard'
      ),
    ],
  },
  
  projectRoot: __dirname,
  watchFolders: [
    // Monorepo support
  ],
});

// app.json - Enable RAM bundles
{
  "expo": {
    "plugins": [
      [
        "@react-native-community/cli-platform-android",
        {
          "enableRamBundles": true,
        },
      ],
    ],
  }
}
```

### NativeWind Compilation

```typescript
// tailwind.config.js - NativeWind setup
const { withNativeWind } = require('nativewind/tailwind');

module.exports = withNativeWind({
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
});

// components/MediaCard.native.tsx - NativeWind styling
import { View, Image, Text } from 'react-native';

export function MediaCard({ item }) {
  return (
    <View className="bg-white rounded-lg overflow-hidden shadow-lg">
      <Image
        source={{ uri: item.thumbnail }}
        className="w-full h-40"
      />
      <View className="p-3">
        <Text className="text-base font-semibold text-gray-900">
          {item.title}
        </Text>
        <Text className="text-xs text-gray-500">
          {item.views.toLocaleString()} views
        </Text>
      </View>
    </View>
  );
}
```

### Native Module Bridging

```typescript
// Native module for performance-critical operations
// ios/OrdoMediaModule.m
#import <React/RCTBridgeModule.h>

@interface OrdoMediaModule : NSObject <RCTBridgeModule>
@end

@implementation OrdoMediaModule
RCT_EXPORT_MODULE()

// Heavy image processing on native thread
RCT_EXPORT_METHOD(optimizeImage:(NSString *)imagePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    // Heavy computation here doesn't block JS thread
    NSData *optimized = [self processImageAtPath:imagePath];
    dispatch_async(dispatch_get_main_queue(), ^{
      resolve(@{ @"success": @(YES) });
    });
  });
}
@end

// Usage in React Native
import { NativeModules } from 'react-native';

const { OrdoMediaModule } = NativeModules;

export async function optimizeImage(path: string) {
  try {
    const result = await OrdoMediaModule.optimizeImage(path);
    return result;
  } catch (error) {
    console.error('Optimization failed:', error);
  }
}
```

---

## 13. Monitoring & Alerting

Continuously track performance metrics in production.

### web-vitals Integration

```typescript
// app/layout.tsx
'use client';

import { useEffect } from 'react';
import { getCLS, getFID, getLCP, getINP, getTTFB } from 'web-vitals';
import { sendMetricsToAnalytics } from '@/lib/analytics';

export function PerformanceMonitor() {
  useEffect(() => {
    // Send Core Web Vitals to analytics backend
    getCLS(sendMetricsToAnalytics);
    getFID(sendMetricsToAnalytics);
    getLCP(sendMetricsToAnalytics);
    getINP(sendMetricsToAnalytics);
    getTTFB(sendMetricsToAnalytics);
  }, []);
  
  return null;
}

// lib/analytics.ts
export function sendMetricsToAnalytics(metric) {
  const body = {
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
  
  // Use sendBeacon to ensure delivery even on page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/metrics', JSON.stringify(body));
  } else {
    // Fallback to fetch
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify(body),
      keepalive: true,
    });
  }
}
```

### Sentry Performance Monitoring

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // Sample 10% of transactions
  profilesSampleRate: 0.01, // Sample 1% for detailed profiling
  
  // Integrations
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
    new Sentry.Profiler(),
  ],
  
  // Replay configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Custom transaction tracking
export function trackPerformance(name: string, fn: () => Promise<any>) {
  const transaction = Sentry.startTransaction({
    name,
    op: 'http.client',
  });
  
  try {
    const result = fn();
    transaction.finish();
    return result;
  } catch (error) {
    transaction.setStatus('error');
    transaction.finish();
    throw error;
  }
}
```

### Custom Metrics Dashboard

```typescript
// API route for metrics collection
// app/api/metrics/route.ts
export async function POST(request: Request) {
  const metric = await request.json();
  
  // Store in time-series database (ClickHouse, TimescaleDB, etc.)
  await db.metrics.insert({
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    url: metric.url,
    timestamp: metric.timestamp,
    userAgent: request.headers.get('user-agent'),
  });
  
  // Alert if metric exceeds threshold
  if (metric.name === 'LCP' && metric.value > 2500) {
    await alertSlack('LCP exceeds 2.5s', metric);
  }
  
  return new Response('OK');
}

// components/MetricsDashboard.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function MetricsDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['metrics', 'hourly'],
    queryFn: () => fetch('/api/metrics?interval=hourly').then(r => r.json()),
    refetchInterval: 60 * 1000, // Update every minute
  });
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        title="LCP (< 2.5s)"
        chart={metrics?.lcp}
        threshold={2500}
      />
      <MetricCard
        title="FID (< 100ms)"
        chart={metrics?.fid}
        threshold={100}
      />
      <MetricCard
        title="CLS (< 0.1)"
        chart={metrics?.cls}
        threshold={0.1}
      />
      <MetricCard
        title="TTFB (< 200ms)"
        chart={metrics?.ttfb}
        threshold={200}
      />
    </div>
  );
}

function MetricCard({ title, chart, threshold }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <LineChart width={300} height={200} data={chart}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, threshold * 1.5]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
        />
        {/* Threshold line */}
        <Line
          type="stepAfter"
          dataKey={() => threshold}
          stroke="#ef4444"
          strokeDasharray="5 5"
          dot={false}
          legend="threshold"
        />
      </LineChart>
    </div>
  );
}
```

---

## 14. Build Optimization

Turbopack + Turborepo for fastest builds.

### Turbopack Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      // Resolve aliases for cleaner imports
      resolveAlias: {
        '@': './src',
        '@components': './src/components',
        '@lib': './src/lib',
        '@hooks': './src/hooks',
      },
      
      // Custom webpack loaders for Turbopack
      loaders: {
        '.custom-ext': [
          {
            loader: 'custom-loader',
            options: { /* ... */ },
          },
        ],
      },
      
      // Module federation for micro-frontends
      moduleIds: ['named'],
    },
  },
  
  // Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false, // Disable source maps in production
  compress: true,
  generateEtags: true,
};

module.exports = nextConfig;
```

### Tree Shaking & Dead Code Elimination

```typescript
// package.json
{
  "sideEffects": false, // Enable tree shaking
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}

// lib/utils.ts - Mark unused exports for tree shaking
export function unusedFunction() {
  // This will be removed if not imported
}

export function usedFunction() {
  return 'Keep this';
}
```

### Turborepo Remote Caching

```bash
# .turbo/config.json
{
  "teamid": "team_xxxxx",
  "apiurl": "https://api.vercel.com",
  "caching": {
    "outputglobs": [
      ".next/**",
      "dist/**",
      "build/**"
    ]
  }
}

# Login to Vercel
npx turbo login

# Run build with remote caching
npx turbo build --remote-only
```

### Build Performance Monitoring

```bash
# Analyze build performance
npm run build -- --profile

# Generate timeline report
npx next-trace-file .next/trace
```

---

## 15. Performance Checklist

**Before Submitting PR:**

### Code Changes
- [ ] No new `'use client'` directives added unnecessarily
- [ ] Server components used where possible for data fetching
- [ ] Dynamic imports used for heavy components (Monaco, chart libraries)
- [ ] React.memo applied to frequently-rendered list items
- [ ] useCallback/useMemo used for expensive computations
- [ ] No new dependencies added without justification

### Images & Media
- [ ] Images optimized and compressed (< 200KB each)
- [ ] next/image used for all images with `sizes` prop
- [ ] Blur placeholders generated for above-the-fold images
- [ ] Lazy loading enabled for below-the-fold images
- [ ] WebP/AVIF formats tested in browser

### Bundle & Performance
- [ ] Bundle size checked with `ANALYZE=true npm run build`
- [ ] No bundle size increase > 5KB per route
- [ ] Code splitting confirmed in DevTools
- [ ] Lighthouse score > 90 (Performance)
- [ ] Core Web Vitals targets met (LCP < 2.5s, CLS < 0.1)

### Data Fetching
- [ ] React Query stale times set per resource
- [ ] Prefetching implemented for navigation links
- [ ] Unnecessary API calls removed (duplicate queries)
- [ ] Caching headers set on API routes

### React Query Configuration
- [ ] No `refetchOnMount: always` unless required
- [ ] Appropriate `staleTime` per resource type
- [ ] No polling queries without debouncing
- [ ] Parallel queries batched where possible

### State Management
- [ ] Zustand selectors used (not entire store)
- [ ] No deeply nested object subscriptions
- [ ] Batch updates for multi-field changes
- [ ] Zustand subscribers cleaned up

### Server Components
- [ ] Data fetching in Server Components where possible
- [ ] No useState/hooks in Server Components
- [ ] Suspense boundaries added for streaming
- [ ] Error boundaries around async components

### Testing
- [ ] Lighthouse CI passes
- [ ] Bundle size check passes
- [ ] Performance regressions identified and explained
- [ ] Metrics dashboard monitored for anomalies

### Deployment
- [ ] Cache-Control headers verified
- [ ] CDN cache invalidation strategy documented
- [ ] Sentry performance monitoring enabled
- [ ] web-vitals monitoring confirmed in production

---

## Summary

| Area | Key Tactics |
|------|-------------|
| **Core Web Vitals** | Monitor LCP, FID, CLS, TTFB via Sentry + web-vitals |
| **App Router** | Server Components default, Client only for interactivity |
| **Code Splitting** | Dynamic imports for heavy deps, route-based automatic |
| **Bundle** | Analyze via @next/bundle-analyzer, enforce size budgets |
| **Images** | next/image + CloudFront, responsive sizes, blur placeholders |
| **Fonts** | next/font/google, display: swap, minimal subsets |
| **Data Fetching** | React Query with stale times, prefetching on hover |
| **Rendering** | React.memo, useMemo for lists, virtualization for large grids |
| **State** | Zustand with selectors, batch updates |
| **Caching** | Next.js fetch cache, React Query cache, Service Worker |
| **Media** | Lazy load, progressive loading, video thumbnails |
| **Mobile** | FlatList optimization, Hermes engine, RAM bundles |
| **Monitoring** | web-vitals + Sentry + custom metrics dashboard |
| **Build** | Turbopack, tree shaking, remote caching |

---

**Document Version:** 1.0  
**Last Review:** 2026-03-10  
**Maintained By:** Frontend Performance Team
