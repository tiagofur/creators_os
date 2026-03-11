# ADR-002: Routing with Next.js App Router and next-intl

## Status

Accepted

## Context

Creators OS is a multi-locale web application targeting content creators globally. The routing solution needs to support:

1. **Internationalised URLs** — locale-prefixed paths (e.g., `/en/dashboard`, `/es/dashboard`).
2. **Authenticated vs. public route groups** — login, register, and password-reset pages are publicly accessible; all other routes require authentication.
3. **Nested layouts** — the app shell (sidebar, top bar) wraps authenticated routes but not auth pages.
4. **Server components by default** — maximise server-side rendering for performance.

Options considered:

- **Next.js Pages Router** — stable but does not support React Server Components, nested layouts, or route groups natively.
- **Next.js App Router** — first-class support for server components, nested layouts, route groups, and parallel routes.
- **next-intl** — the most mature i18n library for App Router, supporting `[locale]` dynamic segments, middleware-based locale detection, and server/client translation access.

## Decision

Use the **Next.js 15 App Router** with **next-intl** for locale-based routing.

### Route structure

```
src/app/
  [locale]/                  # Dynamic locale segment (en, es, etc.)
    (app)/                   # Route group: authenticated app shell
      layout.tsx             # App shell with sidebar, nav, providers
      dashboard/page.tsx
      ideas/page.tsx
      pipeline/page.tsx
      ...
    (auth)/                  # Route group: public auth pages
      layout.tsx             # Minimal layout (no sidebar)
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
      auth/callback/page.tsx
    layout.tsx               # Root locale layout (next-intl provider)
    page.tsx                 # Landing / redirect
```

### Middleware

`src/middleware.ts` uses `next-intl/middleware` to:
- Detect the user's locale from the Accept-Language header or cookie.
- Redirect to the locale-prefixed path (e.g., `/` to `/en`).
- Use `localePrefix: 'always'` so every URL includes the locale segment.

API routes (`/api/*`) bypass the intl middleware entirely.

## Consequences

**Positive:**
- Locale is always explicit in the URL, enabling proper caching and SEO.
- Route groups `(app)` and `(auth)` provide clean layout separation without URL nesting.
- Server components are the default, reducing client bundle size.
- `next-intl` integrates directly with the App Router, providing both server-side `getTranslations()` and client-side `useTranslations()`.

**Negative:**
- The `[locale]` segment adds a layer of nesting to every route file path.
- Middleware runs on every non-static request, adding a small latency overhead.
- next-intl is a third-party dependency that must track Next.js App Router API changes across major versions.
