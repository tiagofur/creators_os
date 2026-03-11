# @ordo/web

Creators OS web application — a Next.js 15 App Router frontend for content creators to capture ideas, manage a production pipeline, track analytics, and collaborate with sponsors.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ |

## Local development

```bash
# From the monorepo root (frontend/)
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:3000` by default.

## Available scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint via `next lint` |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |
| `pnpm test` | Run unit tests with Vitest |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm analyze` | Production build with bundle analyzer enabled |
| `pnpm lhci` | Run Lighthouse CI (`@lhci/cli`) |

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. See `.env.example` for the full list with descriptions.

**Public (browser-safe):**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | REST API base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for real-time updates |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for client-side error reporting |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (OG tags, callbacks) |

**Server-only:**

| Variable | Purpose |
|----------|---------|
| `SENTRY_DSN` | Sentry DSN for server/edge error reporting |
| `SENTRY_ORG` | Sentry org slug (source map uploads) |
| `SENTRY_PROJECT` | Sentry project slug (source map uploads) |
| `ANALYZE` | Set to `"true"` to enable bundle analyzer |

## Project structure

```
src/
  app/
    [locale]/             # next-intl locale segment
      (app)/              # Authenticated app routes
        dashboard/        # Main dashboard
        ideas/            # Idea capture & management
        pipeline/         # Content production pipeline
        analytics/        # Performance analytics
        ai-studio/        # AI tools (brainstormer, script doctor, etc.)
        sponsorships/     # Sponsor deal tracking
        settings/         # User & workspace settings
        publishing/       # Publishing workflow
        series/           # Content series
        inbox/            # Notifications inbox
        profile/          # User profile
        onboarding/       # Onboarding flow
      (auth)/             # Public auth routes (login, register, etc.)
    api/auth/             # Server-side auth API routes (refresh, logout)
  components/
    providers/            # React context providers (auth, query, etc.)
  lib/                    # Shared utilities (analytics, etc.)
  middleware.ts           # next-intl locale routing + auth guards
  instrumentation.ts      # Sentry server/edge initialisation
```

## Monorepo packages

This app consumes workspace packages defined in `frontend/packages/`:

| Package | Purpose |
|---------|---------|
| `@ordo/types` | Shared TypeScript types |
| `@ordo/validations` | Zod schemas for API payloads |
| `@ordo/core` | Constants, utilities |
| `@ordo/i18n` | Locale definitions and translations |
| `@ordo/ui` | Shared UI component library |
| `@ordo/hooks` | Reusable React hooks |
| `@ordo/stores` | Zustand state stores |
| `@ordo/api-client` | API client, resource modules, WebSocket client |
| `@ordo/config` | Shared config (ESLint, TypeScript, Tailwind) |

## Deployment

The app is a standard Next.js application. Build with `pnpm build` and deploy the `.next` output to any Node.js hosting provider (Vercel, Docker, etc.). Ensure all server-only environment variables are set in the deployment environment.

Sentry source maps are uploaded automatically during build when `SENTRY_ORG` and `SENTRY_PROJECT` are configured.
