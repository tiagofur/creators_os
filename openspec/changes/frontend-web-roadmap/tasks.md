# Task Checklist: Frontend Web Roadmap
## Ordo Creator OS — Next.js Web Application

**Change name**: `frontend-web-roadmap`
**Author**: sdd-tasks
**Date**: 2026-03-10
**Status**: PHASE-5-COMPLETE
**Depends on**: `proposal.md`, `spec.md`, `design.md`

---

## Task Schema

Each task follows this format:

```
### TASK-{ID}: {Title}
**Phase**: P{N} | **Week(s)**: {W} | **Complexity**: XS/S/M/L/XL | **Type**: {type}
**Spec refs**: FR-{x.x.x}, FR-{y.y.y}
**Design refs**: Design §{N.N}

**Description**: One sentence of what to build.

**Acceptance criteria**:
- [x] AC 1
- [x] AC 2
- [x] AC 3 (optional)
```

**Complexity scale**: XS = <1h | S = 1–2h | M = 2–4h | L = 4–6h | XL = 6–8h (pair/split if XL)
**Types**: `setup` | `component` | `page` | `integration` | `test` | `perf` | `infra`

---

## Phase 1 — Foundation (Weeks 1–4)

### TASK-101: Initialize Turborepo workspace root
**Phase**: P1 | **Week(s)**: 1 | **Complexity**: M | **Type**: setup
**Spec refs**: FR-1.1.1, FR-1.1.3
**Design refs**: Design §1.1, §1.5

**Description**: Scaffold the monorepo root with Turborepo, pnpm workspaces, and the full `turbo.json` pipeline config (build, dev, test, lint, type-check).

**Acceptance criteria**:
- [x] `pnpm install` from repo root resolves all workspaces without errors
- [x] `turbo.json` defines all five pipelines with correct `dependsOn` and `outputs` per design §1.5
- [x] `pnpm-workspace.yaml` includes `apps/*` and `packages/*` globs

---

### TASK-102: Scaffold `@ordo/config` package
**Phase**: P1 | **Week(s)**: 1 | **Complexity**: S | **Type**: setup
**Spec refs**: FR-1.1.2
**Design refs**: Design §1.3

**Description**: Create `packages/config/` with shared ESLint flat config, `tsconfig.base.json`, and Tailwind base config, all exported via `package.json` exports map.

**Acceptance criteria**:
- [x] `packages/config/package.json` exports `./eslint`, `./tsconfig`, `./tailwind`
- [x] All other packages can extend these configs without duplicating rules
- [x] TypeScript strict mode is enabled in `tsconfig.base.json`

---

### TASK-103: Scaffold `@ordo/types` package
**Phase**: P1 | **Week(s)**: 1 | **Complexity**: M | **Type**: setup
**Spec refs**: FR-1.1.2
**Design refs**: Design §1.2, §1.6

**Description**: Create `packages/types/src/index.ts` with all shared TypeScript interfaces mirroring API response shapes (User, Workspace, Idea, Content, Series, Analytics, Gamification, Sponsorship, Billing, Notification).

**Acceptance criteria**:
- [x] All interface names match backend API JSON keys (snake_case fields)
- [x] Package exports via `"main": "./src/index.ts"` with no build step required
- [x] Zero `@ordo/*` runtime dependencies (leaf node per design §1.2)

---

### TASK-104: Scaffold `@ordo/validations` package
**Phase**: P1 | **Week(s)**: 1 | **Complexity**: M | **Type**: setup
**Spec refs**: FR-1.3.2
**Design refs**: Design §3.5

**Description**: Create `packages/validations/src/` with Zod schemas for all API request/response shapes — auth, ideas, contents, series, publishing, AI, analytics, gamification, sponsorships, billing, notifications.

**Acceptance criteria**:
- [x] `RegisterRequestSchema`, `AuthResponseSchema`, `IdeaSchema`, `CreateIdeaRequestSchema` exist and match spec §1.3 definitions exactly
- [x] All schemas are exported from `packages/validations/src/index.ts`
- [x] No `@ordo/*` runtime dependencies other than `zod`

---

### TASK-105: Scaffold `@ordo/core` package
**Phase**: P1 | **Week(s)**: 1 | **Complexity**: S | **Type**: setup
**Spec refs**: FR-1.1.2
**Design refs**: Design §1.2

**Description**: Create `packages/core/src/` as the leaf domain-logic package with pure functions, domain entity factories, and use-case helpers that have zero `@ordo/*` runtime dependencies.

**Acceptance criteria**:
- [x] Package scaffolded with correct `package.json` (private, no `@ordo/*` deps)
- [x] At minimum exports: `formatRelativeTime`, `computeIdeaValidationScore`, `buildContentStageLabel` utilities
- [x] All exports are pure functions (no side effects, no React imports)

---

### TASK-106: Scaffold remaining monorepo packages (`@ordo/ui`, `@ordo/hooks`, `@ordo/stores`, `@ordo/api-client`, `@ordo/i18n`)
**Phase**: P1 | **Week(s)**: 1 | **Complexity**: S | **Type**: setup
**Spec refs**: FR-1.1.2
**Design refs**: Design §1.3, §1.6

**Description**: Create empty scaffolds for the five remaining packages with correct `package.json` manifests, `tsconfig.json` extends, and barrel `index.ts` stubs so the monorepo dependency graph is fully wired before implementation begins.

**Acceptance criteria**:
- [x] All five packages resolve in the workspace and their inter-package imports compile without errors
- [x] Dependency graph flows strictly downward: no circular imports (verified by TypeScript compilation)
- [x] `pnpm dev` from root starts without package resolution errors

---

### TASK-107: Implement `@ordo/api-client` core fetch wrapper
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-1.3.1
**Design refs**: Design §3.1, §3.2

**Description**: Implement `packages/api-client/src/client.ts` — the `createApiClient()` function with auth header injection, 401 detection hook, error normalization, and typed `get`/`post`/`patch`/`delete` methods.

**Acceptance criteria**:
- [x] `Authorization: Bearer {token}` is injected on every request when a token exists
- [x] On 401, the interceptor is called; on success, the original request is retried once; on failure, `onUnauthorized()` is called
- [x] Non-2xx responses throw `ApiError` instances (never raw `Response` objects)

---

### TASK-108: Implement JWT refresh interceptor
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-1.3.1
**Design refs**: Design §3.3

**Description**: Implement `packages/api-client/src/interceptors/jwt-refresh.ts` with deduplication logic (single in-flight refresh promise) that calls `/api/auth/refresh` and propagates the new token to all waiting callers.

**Acceptance criteria**:
- [x] Concurrent requests that all 401 at the same time trigger exactly one refresh call (deduplication via `refreshPromise`)
- [x] After successful refresh, all queued callers receive `true` and retry their original request
- [x] After failed refresh, all queued callers receive `false` and the client calls `onUnauthorized()`

---

### TASK-109: Implement `@ordo/api-client` resource modules
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: L | **Type**: integration
**Spec refs**: FR-1.3.1
**Design refs**: Design §3.1

**Description**: Implement all 15 resource modules under `packages/api-client/src/resources/` — one file per backend domain (`auth.ts`, `users.ts`, `workspaces.ts`, `ideas.ts`, `contents.ts`, `series.ts`, `publishing.ts`, `ai.ts`, `analytics.ts`, `gamification.ts`, `sponsorships.ts`, `billing.ts`, `search.ts`, `notifications.ts`, `uploads.ts`) each exporting typed functions that call `createApiClient()` methods.

**Acceptance criteria**:
- [x] Every resource module uses `createApiClient()` — no raw `fetch()` calls
- [x] Every function accepts typed request parameters and returns typed response types from `@ordo/types`
- [x] Zod schema validation is applied via `schema` option on all `GET` endpoints returning entity objects

---

### TASK-110: Implement React Query hooks for all resources
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: L | **Type**: integration
**Spec refs**: FR-1.3.1
**Design refs**: Design §3.1, §5.2

**Description**: Create `packages/api-client/src/hooks/` with one file per resource — `useIdeas.ts`, `useContents.ts`, `useSeries.ts`, etc. — exporting typed `useQuery` and `useMutation` hooks backed by the query key factory in `query-keys.ts`.

**Acceptance criteria**:
- [x] `queryKeys.ts` exports a key factory with deterministic keys per resource and filter (e.g., `queryKeys.ideas.list(filters)`)
- [x] All list hooks support `staleTime` and `gcTime` configuration per design §6.2
- [x] All mutation hooks call `queryClient.invalidateQueries` on success to keep lists fresh

---

### TASK-111: Implement WebSocket client wrapper
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-1.3.1
**Design refs**: Design §3.6

**Description**: Implement the WebSocket client in `packages/api-client/src/ws-client.ts` that connects directly to the backend URL (not proxied through Next.js), implements exponential backoff reconnection (max 5 retries), and exposes `subscribe(event, callback)` / `unsubscribe()` methods.

**Acceptance criteria**:
- [x] WebSocket connects to `NEXT_PUBLIC_WS_URL` directly (not via Next.js API routes)
- [x] Reconnection uses exponential backoff: delays of 1s, 2s, 4s, 8s, 16s before giving up
- [x] `subscribe('xp_earned', handler)` and `subscribe('notification', handler)` work correctly; handlers are cleaned up on `unsubscribe()`

---

### TASK-112: Initialize Next.js 15 app with App Router
**Phase**: P1 | **Week(s)**: 2–3 | **Complexity**: M | **Type**: setup
**Spec refs**: FR-1.4.1 (implicit)
**Design refs**: Design §2.1

**Description**: Initialize `apps/web/` with Next.js 15, TypeScript, App Router, and the full route group directory structure: `[locale]/(auth)/`, `[locale]/(app)/`, `[locale]/(public)/` with stub `layout.tsx` and `page.tsx` files at every node.

**Acceptance criteria**:
- [x] All route paths compile without TypeScript errors
- [x] `next.config.ts` includes `transpilePackages` for all `@ordo/*` packages
- [x] `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` environment variables are referenced in `next.config.ts` env schema

---

### TASK-113: Configure `next-intl` and locale routing
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: setup
**Spec refs**: FR-1.4.2 (implicit from proposal §1.4)
**Design refs**: Design §2.1

**Description**: Configure `next-intl` with `/{locale}/...` routing for `en`, `es`, `pt` locales — including middleware for locale detection, `i18n.ts` routing config, and message files in `packages/i18n/messages/`.

**Acceptance criteria**:
- [x] Navigating to `/` redirects to `/{detected-locale}/dashboard`
- [x] `useTranslations('common')` works in any client or server component within `[locale]`
- [x] Missing translation keys throw TypeScript errors (strict key inference enabled)

---

### TASK-114: Implement global providers and AppLayout shell
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: component
**Spec refs**: FR-1.4.3 (implicit from proposal §1.4)
**Design refs**: Design §2.1, §4.1

**Description**: Implement `apps/web/src/app/[locale]/layout.tsx` with `QueryClientProvider`, `ThemeProvider`, `AuthProvider`, and `WorkspaceProvider`, and implement the authenticated `(app)/layout.tsx` shell with auth guard redirect and `Sidebar` + `Header` layout composition.

**Acceptance criteria**:
- [x] Unauthenticated requests to any `(app)/` route redirect to `/[locale]/login`
- [x] `QueryClient` is a singleton per request (server) / per tab (client) following Next.js App Router best practices
- [x] `ThemeProvider` reads system preference and stores override in `localStorage`

---

### TASK-115: Implement Next.js auth refresh Route Handler
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: S | **Type**: integration
**Spec refs**: FR-1.3.1
**Design refs**: Design §3.3

**Description**: Implement `apps/web/src/app/api/auth/refresh/route.ts` — reads `refresh_token` from httpOnly cookie, proxies `POST /api/v1/auth/refresh` to backend, sets new cookie, returns new access token in body.

**Acceptance criteria**:
- [x] Route reads `refresh_token` cookie (httpOnly, not accessible to JS)
- [x] On backend success: sets new `refresh_token` cookie with `httpOnly`, `sameSite: lax`, `secure` (production), and returns `{ access_token }` in JSON body
- [x] On backend failure (400/401): clears cookie and returns 401 to trigger client logout

---

### TASK-116: Implement OKLCH color tokens in `globals.css`
**Phase**: P1 | **Week(s)**: 1–2 | **Complexity**: S | **Type**: component
**Spec refs**: FR-1.2.1
**Design refs**: Design §2.1

**Description**: Define all CSS custom properties in `apps/web/src/app/globals.css` — full OKLCH color token set for `:root` (light) and `.dark`, including all semantic tokens and all six section accent colors.

**Acceptance criteria**:
- [x] All 20+ token names from spec FR-1.2.1 are defined in both `:root` and `.dark`
- [x] All six section colors are defined: `--color-ideas` (cyan), `--color-pipeline` (violet), `--color-studio` (pink), `--color-publishing` (orange), `--color-analytics` (blue), `--color-sponsorships` (green)
- [x] No pure `#000000` or `#ffffff` values — all colors use OKLCH format

---

### TASK-117: Configure Tailwind with custom tokens
**Phase**: P1 | **Week(s)**: 1–2 | **Complexity**: S | **Type**: setup
**Spec refs**: FR-1.2.1
**Design refs**: Design §1.3

**Description**: Extend `tailwind.config.ts` (shared base in `@ordo/config`) to map all CSS custom property tokens into Tailwind color, spacing, radius, and animation utility classes.

**Acceptance criteria**:
- [x] `bg-primary`, `text-muted-foreground`, `border-ring` etc. all resolve to the CSS custom property values
- [x] All six section accent colors available as `bg-ideas`, `bg-pipeline`, etc.
- [x] No Tailwind JIT purge removes used classes from `packages/ui` components

---

### TASK-118: Install and configure shadcn/ui
**Phase**: P1 | **Week(s)**: 1–2 | **Complexity**: S | **Type**: setup
**Spec refs**: FR-1.2.2
**Design refs**: Design §1.3

**Description**: Run `shadcn-ui init` targeting `packages/ui/`, configure `components.json` to point to the shared package, and install the full component list (Button, Input, Textarea, Select, Checkbox, Switch, DatePicker, Badge, Toast, Alert, Spinner/Skeleton, Card, Table, Avatar, Tooltip, Popover, Dialog, Tabs, Breadcrumb, DropdownMenu).

**Acceptance criteria**:
- [x] All listed shadcn/ui components are installed under `packages/ui/src/components/`
- [x] Components use CSS custom properties (not hardcoded Tailwind colors)
- [x] `pnpm build` succeeds in `packages/ui`

---

### TASK-119: Implement `Button`, `Badge`, `Spinner`, `Skeleton` components
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: M | **Type**: component
**Spec refs**: FR-1.2.2
**Design refs**: Design §4.2

**Description**: Customize shadcn/ui `Button` to add `loading`, `leftIcon`, `rightIcon` props; customize `Badge` to add `success` and `warning` variants; implement `Spinner` and `Skeleton` with the variants specified in spec FR-1.2.2.

**Acceptance criteria**:
- [x] `<Button loading>` renders a spinner inline and disables the button
- [x] `<Badge variant="success">` and `<Badge variant="warning">` render with correct section colors
- [x] `<Skeleton variant="card">` renders a block with correct dimensions and pulse animation

---

### TASK-120: Implement `Sidebar` and `Header` layout components
**Phase**: P1 | **Week(s)**: 2–3 | **Complexity**: L | **Type**: component
**Spec refs**: FR-1.2.2
**Design refs**: Design §2.4, §4.2

**Description**: Implement `Sidebar` (collapsible, nav links per section with section accent colors, workspace name, tier badge, user avatar) and `Header` (title, breadcrumbs, actions slot) matching the interfaces in spec FR-1.2.2.

**Acceptance criteria**:
- [x] Sidebar renders nav links with section accent color icons; active route is highlighted
- [x] Sidebar collapsed state persists in `localStorage`; toggles correctly on button click
- [x] Header breadcrumbs render with correct link behavior; actions slot accepts any `React.ReactNode`

---

### TASK-121: Implement `Card`, `Avatar`, `Tooltip`, `Popover`, `Dialog` components
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: M | **Type**: component
**Spec refs**: FR-1.2.2
**Design refs**: Design §4.2

**Description**: Customize shadcn/ui `Card` to add `accentColor` prop (colored left border per section); `Avatar` to add size variants xs/sm/md/lg/xl with initials fallback; `Tooltip`, `Popover`, `Dialog` with dark mode and OKLCH token styling.

**Acceptance criteria**:
- [x] `<Card accentColor="var(--color-ideas)">` renders a colored left border
- [x] `<Avatar size="xs" fallback="TF">` renders initials when `src` is absent
- [x] `<Dialog>` traps focus correctly and is closeable via Escape key

---

### TASK-122: Implement `Tabs`, `DropdownMenu`, `Breadcrumb`, `Toast` components
**Phase**: P1 | **Week(s)**: 2 | **Complexity**: M | **Type**: component
**Spec refs**: FR-1.2.2
**Design refs**: Design §4.2

**Description**: Customize shadcn/ui `Tabs` to add `pills` and `underline` variants; implement `DropdownMenu` with keyboard navigation; `Breadcrumb` with truncation; global toast system via `useToast()` hook backed by a `ToastProvider`.

**Acceptance criteria**:
- [x] `<Tabs variant="pills">` renders pill-style tabs with correct active state
- [x] `useToast().toast({ type: 'success', title: 'Saved' })` renders an auto-dismissing toast
- [x] All toast types (success, error, warning, info) render with distinct colors from the design tokens

---

### TASK-123: Implement `TierGate` component and `useTier()` hook
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: component
**Spec refs**: FR-1.2.3
**Design refs**: Design §4.3

**Description**: Implement `<TierGate tier="pro">` wrapper component and `useTier()` hook that reads workspace tier from `workspaceStore` and conditionally renders gated content or an upgrade prompt card.

**Acceptance criteria**:
- [x] Free-tier users see the upgrade prompt (not the gated content) when `<TierGate tier="pro">` wraps any feature
- [x] `useTier()` returns `{ tier, canAccess(required: Tier): boolean }` typed correctly
- [x] Upgrade prompt card includes feature name (from `featureName` prop) and a CTA button

---

### TASK-124: Implement `CommandPalette` stub component
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: component
**Spec refs**: FR-1.2.2
**Design refs**: Design §4.2

**Description**: Implement the `CommandPalette` component (Cmd+K trigger, two modes: `capture` and `search`) as a stub — mode switching, keyboard navigation skeleton, and `open/onClose` prop wiring — without full implementation of search results or idea submission (those come in Phase 2 and Phase 5).

**Acceptance criteria**:
- [x] Cmd+K (macOS) and Ctrl+K (Windows/Linux) open the palette globally
- [x] Mode switch between `capture` and `search` works via type `"/"` prefix
- [x] Escape closes the palette; focus returns to the previously focused element

---

### TASK-125: Implement `authStore` (Zustand)
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-1.5.1 (implicit from proposal §1.5)
**Design refs**: Design §4.1, §5.1

**Description**: Implement `packages/stores/src/authStore.ts` with slices: `user`, `accessToken`, `isAuthenticated`, `isLoading`; actions: `login()`, `logout()`, `refreshAccessToken()`, `setUser()`; persisted to `sessionStorage` (access token in memory only, never in `localStorage`).

**Acceptance criteria**:
- [x] `accessToken` is stored in-memory only — never in `localStorage` or `sessionStorage`
- [x] `isAuthenticated` is `true` iff `accessToken` is non-null and `user` is non-null
- [x] `logout()` clears all auth state and navigates to `/[locale]/login`

---

### TASK-126: Implement `workspaceStore` (Zustand)
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-1.6 (implicit from proposal §1.6)
**Design refs**: Design §4.1, §5.1

**Description**: Implement `packages/stores/src/workspaceStore.ts` with slices: `activeWorkspaceId`, `workspaceName`, `role`, `tier`, `workspaces[]`; actions: `setActiveWorkspace()`, `switchWorkspace()`, `updateTier()`; persisted to `localStorage`.

**Acceptance criteria**:
- [x] `activeWorkspaceId` is injected as `X-Workspace-ID` header in every API call
- [x] `tier` is of type `'free' | 'pro' | 'enterprise'` and used by `useTier()` hook
- [x] Switching workspace re-fetches dashboard data via `queryClient.invalidateQueries`

---

### TASK-127: Implement login page and form
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: page
**Spec refs**: FR-1.5.1 (implicit from proposal §1.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(auth)/login/page.tsx` — email/password form with React Hook Form + Zod validation, OAuth2 buttons (Google, GitHub), loading state, error display, and redirect to dashboard on success.

**Acceptance criteria**:
- [x] Form validates email format and password presence before submitting
- [x] On 401 from API, displays "Invalid credentials" inline error (not a toast)
- [x] OAuth buttons initiate correct redirect URLs; successful OAuth callback sets auth state and redirects to dashboard

---

### TASK-128: Implement register page and form
**Phase**: P1 | **Week(s)**: 3 | **Complexity**: M | **Type**: page
**Spec refs**: FR-1.5.1 (implicit from proposal §1.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(auth)/register/page.tsx` — name, email, password form with Zod `RegisterRequestSchema` validation (password strength: min 10 chars, upper, lower, digit, special), timezone detection, locale pre-fill.

**Acceptance criteria**:
- [x] Password strength requirements are shown inline with real-time validation feedback
- [x] Timezone is auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone` and pre-filled
- [x] Successful registration creates auth state, sets tokens, and redirects to `/[locale]/onboarding`

---

### TASK-129: Implement forgot password and reset password pages
**Phase**: P1 | **Week(s)**: 3–4 | **Complexity**: S | **Type**: page
**Spec refs**: FR-1.5.1 (implicit from proposal §1.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(auth)/forgot-password/page.tsx` (email entry → POST `/auth/forgot-password`) and `/[locale]/(auth)/reset-password/page.tsx` (token from query param + new password → POST `/auth/reset-password`).

**Acceptance criteria**:
- [x] Forgot password shows success state ("Check your email") regardless of whether email exists (prevents enumeration)
- [x] Reset password validates token presence in URL query params; shows error if missing/expired
- [x] Successful reset redirects to login with a success toast

---

### TASK-130: Implement OAuth2 callback handler
**Phase**: P1 | **Week(s)**: 3–4 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-1.5.1 (implicit from proposal §1.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(auth)/auth/callback/page.tsx` — reads `code` and `state` query params, calls backend OAuth exchange endpoint, sets tokens in authStore, determines if new user (redirect to onboarding) or returning user (redirect to dashboard).

**Acceptance criteria**:
- [x] `error` query param from OAuth provider renders a user-friendly error page with retry option
- [x] Successful exchange sets `accessToken` in authStore and `refresh_token` httpOnly cookie
- [x] New users (first OAuth login) are redirected to `/[locale]/onboarding`; returning users go to `/[locale]/dashboard`

---

### TASK-131: Implement workspace creation page
**Phase**: P1 | **Week(s)**: 4 | **Complexity**: M | **Type**: page
**Spec refs**: FR-1.6 (implicit from proposal §1.6)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/workspaces/new/page.tsx` — workspace name + description form, calls `POST /api/v1/workspaces`, sets new workspace as active in workspaceStore, redirects to onboarding.

**Acceptance criteria**:
- [x] Workspace name is required (min 2, max 100 chars) with inline validation
- [x] Created workspace is immediately set as active in workspaceStore
- [x] Page is only accessible post-login; unauthenticated access redirects to login

---

### TASK-132: Implement onboarding wizard
**Phase**: P1 | **Week(s)**: 4 | **Complexity**: L | **Type**: page
**Spec refs**: FR-1.6 (implicit from proposal §1.6)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/onboarding/page.tsx` — 3-step wizard: (1) content type selection (video/podcast/writing/social), (2) publishing goal (weekly cadence selector), (3) optional idea import (text area paste); stepper UI with back/next navigation.

**Acceptance criteria**:
- [x] Wizard state persists in URL search params so browser back/forward works
- [x] Completing step 3 (or skipping) calls `PATCH /api/v1/workspaces/{id}` with preferences then redirects to `/[locale]/dashboard`
- [x] Wizard is skippable — "Skip for now" link on each step goes directly to dashboard

---

### TASK-133: Implement workspace switcher in header
**Phase**: P1 | **Week(s)**: 4 | **Complexity**: S | **Type**: component
**Spec refs**: FR-1.6 (implicit from proposal §1.6)
**Design refs**: Design §4.2

**Description**: Implement workspace switcher dropdown in the Header/Sidebar — shows all user workspaces, highlights active workspace, and calls `workspaceStore.switchWorkspace()` on selection.

**Acceptance criteria**:
- [x] Dropdown renders within 200ms of opening (data already in workspaceStore)
- [x] Switching workspace invalidates all React Query caches and shows loading skeletons
- [x] "Create new workspace" option at bottom of dropdown navigates to `/workspaces/new`

---

### TASK-134: Implement dark/light theme toggle
**Phase**: P1 | **Week(s)**: 4 | **Complexity**: S | **Type**: component
**Spec refs**: FR-1.2.1
**Design refs**: Design §4.2

**Description**: Implement theme toggle (sun/moon icon button in header or sidebar footer) that switches between `light`, `dark`, and `system` modes — persisted in `localStorage`, hydrated without flash of incorrect theme.

**Acceptance criteria**:
- [x] No flash of wrong theme on initial page load (SSR-compatible hydration strategy)
- [x] Theme preference persists across sessions and page refreshes
- [x] All OKLCH tokens switch correctly in both modes; no elements remain in wrong-mode colors

---

## Phase 2 — Core Creator (Weeks 5–9)

### TASK-201: Implement dashboard page with widgets
**Phase**: P2 | **Week(s)**: 5 | **Complexity**: L | **Type**: page
**Spec refs**: FR-2.1 (implicit from proposal §2.1)
**Design refs**: Design §2.4, §2.5

**Description**: Implement `/[locale]/(app)/dashboard/page.tsx` as RSC with independent `<Suspense>` boundaries for each widget — ConsistencyScore, RecentPipelineActivity, IdeasCapturedThisWeek, UpcomingScheduled, XPProgressBar.

**Acceptance criteria**:
- [x] Page shell renders in <100ms; each widget streams in independently via Suspense
- [x] All five widgets have corresponding skeleton components that render during fetch
- [x] Dashboard skeleton is shown via `loading.tsx` (automatic Suspense fallback)

---

### TASK-202: Implement quick-capture idea form and `Cmd+K` binding
**Phase**: P2 | **Week(s)**: 5 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.2 (implicit from proposal §2.2)
**Design refs**: Design §2.3

**Description**: Wire the CommandPalette `capture` mode to a real idea submission form — title + optional description fields, submits via `POST /api/v1/ideas`, shows optimistic UI (card immediately appears in ideas list), reverts on error.

**Acceptance criteria**:
- [x] Cmd+K opens palette in capture mode; typing and pressing Enter submits the idea
- [x] Optimistic idea appears in the ideas list within 100ms of submission
- [x] On API error, optimistic item is removed and an error toast is shown

---

### TASK-203: Implement ideas list page
**Phase**: P2 | **Week(s)**: 5–6 | **Complexity**: L | **Type**: page
**Spec refs**: FR-2.2 (implicit from proposal §2.2)
**Design refs**: Design §2.1, §2.4

**Description**: Implement `/[locale]/(app)/ideas/page.tsx` with grid/list toggle, filter bar (status, tags, date range, search), sort controls (newest/impact/effort), infinite scroll pagination, and empty state.

**Acceptance criteria**:
- [x] Filter state is reflected in URL search params (shareable, browser-back preservable)
- [x] Grid and list view preferences persist in `localStorage`
- [x] Empty state renders the illustrated empty state component when `ideas.length === 0`

---

### TASK-204: Implement `IdeaCard` component
**Phase**: P2 | **Week(s)**: 5–6 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.2 (implicit from proposal §2.2)
**Design refs**: Design §2.4

**Description**: Implement `IdeaCard` — displays title, tags (color-coded), status badge, AI validation score (if available), relative timestamp; clickable to open idea detail drawer; supports optimistic status-change via context menu.

**Acceptance criteria**:
- [x] Tags render as `<Badge>` components with color derived from tag content hash (consistent color per tag name)
- [x] Status badge uses correct color variant per status: `captured`=default, `validated`=success, `graveyard`=destructive
- [x] Card is keyboard-navigable (Enter/Space opens detail)

---

### TASK-205: Implement idea detail drawer
**Phase**: P2 | **Week(s)**: 6 | **Complexity**: L | **Type**: component
**Spec refs**: FR-2.2 (implicit from proposal §2.2)
**Design refs**: Design §2.3

**Description**: Implement the idea detail drawer (slide-in from right) with full edit form — title, description, tags, status flow control stepper, effort/impact sliders, AI Expand button, AI Validate button, and "Promote to Content" button.

**Acceptance criteria**:
- [x] All field edits auto-save via `PATCH /api/v1/ideas/{id}` with 500ms debounce
- [x] Status stepper shows valid next transitions (e.g., `captured` → `validated` or `graveyard`)
- [x] "Promote to Content" calls `POST /api/v1/contents` with prefilled title and opens the pipeline item in a new drawer

---

### TASK-206: Implement ideas validation board view
**Phase**: P2 | **Week(s)**: 6 | **Complexity**: M | **Type**: page
**Spec refs**: FR-2.2 (implicit from proposal §2.2)
**Design refs**: Design §2.1

**Description**: Implement the Validation Board view — a 2D scatter plot grid with Effort (x) vs Impact (y) axes; each idea renders as a draggable dot; changing position updates `effort_rating` and `impact_rating` via PATCH.

**Acceptance criteria**:
- [x] Board renders all `validated` and `captured` ideas as positioned dots
- [x] Dragging a dot to a new quadrant updates the effort/impact scores optimistically
- [x] Quadrants are labeled: Quick Wins (low effort, high impact), Backlog, Avoid, Big Bets

---

### TASK-207: Implement ideas graveyard view
**Phase**: P2 | **Week(s)**: 6 | **Complexity**: S | **Type**: page
**Spec refs**: FR-2.2 (implicit from proposal §2.2)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/ideas/graveyard` (or tab on ideas page) — filtered view of `status=graveyard` ideas with "Restore" action that PATCHes status back to `captured`.

**Acceptance criteria**:
- [x] Graveyard is a filtered view (not a separate API call if possible — filter from cached ideas)
- [x] "Restore" updates status to `captured` optimistically and moves card out of graveyard view
- [x] Free tier shows count badge "X ideas in graveyard"

---

### TASK-208: Implement free tier gate for ideas (50/month limit)
**Phase**: P2 | **Week(s)**: 6 | **Complexity**: S | **Type**: component
**Spec refs**: FR-2.2 (implicit from proposal §2.2)
**Design refs**: Design §4.3

**Description**: Implement the free tier limit counter for ideas — reads monthly count from API response, shows counter badge in ideas page header, and wraps the "New Idea" button in `<TierGate>` that blocks submission at 50 with an upgrade prompt.

**Acceptance criteria**:
- [x] Counter shows "X / 50 ideas this month" for free users
- [x] At limit, the quick-capture form shows the upgrade prompt instead of submission
- [x] Pro/Enterprise users see no counter

---

### TASK-209: Implement content pipeline kanban board
**Phase**: P2 | **Week(s)**: 6–7 | **Complexity**: XL | **Type**: page
**Spec refs**: FR-2.3 (implicit from proposal §2.3)
**Design refs**: Design §2.2, §2.4

**Description**: Implement `/[locale]/(app)/pipeline/page.tsx` as Client Component — 6-column kanban (SCRIPTING, FILMING, EDITING, REVIEW, SCHEDULED, PUBLISHED) using `@dnd-kit/core` with drag-and-drop between columns, optimistic stage updates, and column virtualization via `@tanstack/virtual` for >50 items.

**Acceptance criteria**:
- [x] Dragging a card to a new column calls `PATCH /api/v1/contents/{id}/stage` optimistically; reverts on error
- [x] Columns with >50 items virtualize rendering (no DOM nodes for off-screen cards)
- [x] Drag preview renders a ghost card matching the source card dimensions

---

### TASK-210: Implement `ContentCard` component
**Phase**: P2 | **Week(s)**: 7 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.3 (implicit from proposal §2.3)
**Design refs**: Design §2.4

**Description**: Implement `ContentCard` for the pipeline kanban — shows title, content type icon (Video/Post/Tweet/Podcast), assignee avatar, due date, series badge; stage-specific accent color; context menu with quick actions (move stage, archive, open detail).

**Acceptance criteria**:
- [x] Content type icon renders correctly for all four types (Video, Post, Tweet, Podcast)
- [x] Overdue due dates render in destructive color
- [x] Context menu is keyboard-accessible and includes "Open Detail", "Move to Next Stage", "Archive"

---

### TASK-211: Implement content detail panel (parallel route)
**Phase**: P2 | **Week(s)**: 7 | **Complexity**: L | **Type**: page
**Spec refs**: FR-2.3 (implicit from proposal §2.3)
**Design refs**: Design §2.2

**Description**: Implement the pipeline parallel route — `(app)/pipeline/@panel/[id]/page.tsx` — as a slide-in drawer showing the full content detail: metadata edit form, stage stepper, smart checklist, time tracker widget, file attachments, and comments thread.

**Acceptance criteria**:
- [x] Navigating to `/pipeline/[id]` shows kanban board AND detail panel simultaneously without losing scroll position
- [x] Closing the panel (X button or Escape) navigates back to `/pipeline` without a full page reload
- [x] All metadata field edits auto-save via PATCH with 500ms debounce

---

### TASK-212: Implement smart checklist component
**Phase**: P2 | **Week(s)**: 7 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.3 (implicit from proposal §2.3)
**Design refs**: Design §2.4

**Description**: Implement the smart checklist widget in the content detail panel — calls `GET /api/v1/contents/{id}/checklist`, renders stage-specific AI-generated checklist items with checkboxes; checked state persisted via PATCH.

**Acceptance criteria**:
- [x] Checklist is fetched per stage — re-fetches when stage changes
- [x] Checked items persist across page refreshes via API state
- [x] Loading state shows 4-item skeleton while fetching

---

### TASK-213: Implement time tracking widget
**Phase**: P2 | **Week(s)**: 7 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.3 (implicit from proposal §2.3)
**Design refs**: Design §2.4

**Description**: Implement the time tracker widget in the content detail panel — start/stop session button, live elapsed timer display, total time summary, calls `POST /api/v1/contents/{id}/time-entries` on stop.

**Acceptance criteria**:
- [x] Live timer updates every second using `setInterval` (cleaned up on unmount)
- [x] "Stop" saves the session duration to the API and updates total time display
- [x] Total time is formatted as "Xh Ym" (e.g., "2h 15m")

---

### TASK-214: Implement file upload component
**Phase**: P2 | **Week(s)**: 7 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.3 (implicit from proposal §2.3)
**Design refs**: Design §3.7

**Description**: Implement reusable `FileUpload` component — drag-and-drop or click-to-browse, calls `GET /api/v1/uploads/presigned` to get S3 presigned URL, uploads directly to S3 via `PUT`, shows progress bar, then saves the file metadata to the content record.

**Acceptance criteria**:
- [x] Upload progress is shown via a progress bar (uses `XMLHttpRequest.upload.onprogress`)
- [x] File type and size validation run before requesting presigned URL (max 100MB, allowed types configurable)
- [x] Failed upload shows error with retry option

---

### TASK-215: Implement content filter bar and new content modal
**Phase**: P2 | **Week(s)**: 7 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.3 (implicit from proposal §2.3)
**Design refs**: Design §2.1

**Description**: Implement the pipeline filter bar (type, assignee, series, date range filters) and "New Content" modal (title, type, series optional) with form validation and `POST /api/v1/contents`.

**Acceptance criteria**:
- [x] Filter state is synced to URL search params
- [x] New content form requires title and type; series is optional
- [x] Created content appears at the top of the SCRIPTING column immediately (optimistic)

---

### TASK-216: Implement series list page
**Phase**: P2 | **Week(s)**: 7–8 | **Complexity**: M | **Type**: page
**Spec refs**: FR-2.4 (implicit from proposal §2.4)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/series/page.tsx` — card grid of series with thumbnails, status (active/archived), episode count, last published date; "Create Series" button opens create modal.

**Acceptance criteria**:
- [x] Series cards render with correct thumbnail (or placeholder with series name initials)
- [x] Archived series are shown with a visual overlay and excluded from active count
- [x] Empty state renders with "Create your first series" CTA

---

### TASK-217: Implement series detail page
**Phase**: P2 | **Week(s)**: 8 | **Complexity**: L | **Type**: page
**Spec refs**: FR-2.4 (implicit from proposal §2.4)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/series/[id]/page.tsx` — episode list with drag-to-reorder, publishing schedule config, thumbnail upload, series tags/description, aggregate performance metrics, duplication button, archive/restore.

**Acceptance criteria**:
- [x] Episode reorder calls `PATCH /api/v1/series/{id}/episodes/reorder` with new order array
- [x] Thumbnail upload uses the `FileUpload` component (TASK-214)
- [x] "Duplicate Series" creates a new series with the same config (without episodes) via `POST /api/v1/series/{id}/duplicate`

---

### TASK-218: Implement publishing page (scheduled posts list)
**Phase**: P2 | **Week(s)**: 8–9 | **Complexity**: L | **Type**: page
**Spec refs**: FR-2.5 (implicit from proposal §2.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/publishing/page.tsx` — list of scheduled posts with platform icons, status badges, scheduled time; filter by platform/status/date; "Create Post" action opens create form (title, content, platform(s), media, schedule time, hashtags, captions).

**Acceptance criteria**:
- [x] Platform icons render correctly for YouTube, TikTok, Instagram, Twitter/X, LinkedIn
- [x] Create post form validates required fields per platform (e.g., Twitter has character limit display)
- [x] Free tier shows "Manual scheduling only" — auto-publish toggle wrapped in `<TierGate tier="pro">`

---

### TASK-219: Implement publishing calendar page
**Phase**: P2 | **Week(s)**: 8–9 | **Complexity**: L | **Type**: page
**Spec refs**: FR-2.5 (implicit from proposal §2.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/calendar/page.tsx` — month/week/day calendar views showing scheduled posts as color-coded events; drag-and-drop rescheduling; click empty slot opens quick-schedule drawer; calls `GET /api/v1/publishing/calendar`.

**Acceptance criteria**:
- [x] Calendar renders correct post counts per day in month view
- [x] Dragging an event to a new date calls `PATCH /api/v1/publishing/posts/{id}` with new `scheduled_at`
- [x] Week/day views show time slots with correct UTC → local time conversion

---

### TASK-220: Implement platform credentials status indicator
**Phase**: P2 | **Week(s)**: 9 | **Complexity**: S | **Type**: component
**Spec refs**: FR-2.5 (implicit from proposal §2.5)
**Design refs**: Design §2.1

**Description**: Implement the platform connection status indicator shown in the publishing page header — icons for each platform (YouTube, TikTok, Instagram, etc.) with connected (green) / disconnected (grey) status; clicking disconnected platform routes to Settings → Integrations.

**Acceptance criteria**:
- [x] Status is fetched from `GET /api/v1/integrations` on mount
- [x] Disconnected platforms show a tooltip "Connect in Settings"
- [x] Clicking a disconnected platform icon navigates to `/settings/integrations`

---

### TASK-221: Implement empty states for all Phase 2 views
**Phase**: P2 | **Week(s)**: 9 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.1–FR-2.5 (implicit)
**Design refs**: Design §4.4

**Description**: Implement illustrated empty state components for: Ideas list, Graveyard, Pipeline (all columns), Series list, Publishing list, Calendar; each with a clear headline, sub-text, and primary CTA.

**Acceptance criteria**:
- [x] All six empty states use SVG illustrations (inline, not image files)
- [x] Each empty state includes a CTA that navigates to the correct creation flow
- [x] Empty states render correctly in both light and dark mode

---

### TASK-222: Implement skeleton loading states for Phase 2 views
**Phase**: P2 | **Week(s)**: 9 | **Complexity**: M | **Type**: component
**Spec refs**: FR-2.1–FR-2.5 (implicit)
**Design refs**: Design §4.4

**Description**: Implement skeleton loading components for: DashboardWidget (×5), IdeaCard (grid and list variants), PipelineColumn (×6 with card skeletons), SeriesCard, CalendarMonth, PublishingListRow.

**Acceptance criteria**:
- [x] All skeletons use `<Skeleton>` component from `@ordo/ui` (no custom shimmer implementations)
- [x] Skeleton dimensions match real content dimensions to prevent CLS
- [x] Skeletons are shown via Suspense `fallback` props — never via manual `isLoading` boolean state in RSC pages

---

## Phase 3 — AI Studio (Weeks 10–13)

### TASK-301: Implement AI chat page with streaming SSE
**Phase**: P3 | **Week(s)**: 10 | **Complexity**: L | **Type**: page
**Spec refs**: FR-3.1 (implicit from proposal §3.1)
**Design refs**: Design §2.4

**Description**: Implement `/[locale]/(app)/studio/page.tsx` — full-page chat interface with message list (markdown rendering, code blocks), streaming input from `POST /api/v1/ai/chat` via SSE/WebSocket, quick action chips, and token usage indicator.

**Acceptance criteria**:
- [x] Streaming response tokens append to the message bubble in real-time as they arrive
- [x] Markdown rendering handles bold, italic, code blocks, and bullet lists correctly
- [x] Token usage counter decrements per message; free tier users see upgrade prompt at 50 credits

---

### TASK-302: Implement AI credit balance widget
**Phase**: P3 | **Week(s)**: 10 | **Complexity**: S | **Type**: component
**Spec refs**: FR-3.1 (implicit from proposal §3.1)
**Design refs**: Design §4.3

**Description**: Implement the AI credit balance widget — shows remaining credits, usage percentage bar, and upgrade prompt when remaining < 20%; used in AI Chat, Brainstormer, and Title Lab headers.

**Acceptance criteria**:
- [x] Credit balance is fetched from `GET /api/v1/billing/credits` (or gamification profile)
- [x] Progress bar color transitions: green (>50%) → yellow (20–50%) → red (<20%)
- [x] Clicking "Upgrade" opens the billing page in a new tab (not modal)

---

### TASK-303: Implement Brainstormer tool
**Phase**: P3 | **Week(s)**: 10–11 | **Complexity**: L | **Type**: page
**Spec refs**: FR-3.2 (implicit from proposal §3.2)
**Design refs**: Design §2.4

**Description**: Implement the Brainstormer panel (accessible from Ideas page + AI Studio) — topic input, calls `POST /api/v1/ai/brainstorm`, renders 10 angle cards with title, description, effort estimate, platform suggestions; "Save as Idea" and "Add to Pipeline" actions per card.

**Acceptance criteria**:
- [x] Loading state shows 10 skeleton angle cards while brainstorming
- [x] "Save as Idea" calls `POST /api/v1/ideas` and shows a success toast with "View in Ideas" link
- [x] Credit counter decrements after each brainstorm call

---

### TASK-304: Implement Title Lab tool
**Phase**: P3 | **Week(s)**: 11 | **Complexity**: M | **Type**: component
**Spec refs**: FR-3.3 (implicit from proposal §3.3)
**Design refs**: Design §2.4

**Description**: Implement the Title Lab panel (accessible from content detail + standalone in Studio) — topic/platform/draft title input, calls `POST /api/v1/ai/title-lab`, renders 5 title variations with CTR notes; "Copy" and "Use This" actions.

**Acceptance criteria**:
- [x] "Use This" action on a title calls `PATCH /api/v1/contents/{id}` if opened from a content item context
- [x] "Copy" copies title to clipboard and shows a "Copied!" confirmation tooltip
- [x] Platform selector (YouTube, TikTok, LinkedIn, Instagram, Twitter/X) influences generation

---

### TASK-305: Implement SEO Description Generator
**Phase**: P3 | **Week(s)**: 11 | **Complexity**: S | **Type**: component
**Spec refs**: FR-3.3 (implicit from proposal §3.3)
**Design refs**: Design §2.4

**Description**: Implement the SEO Description Generator panel — title + outline input, platform selector, calls `POST /api/v1/ai/seo-description`, renders generated description with "Copy" and "Use This" actions.

**Acceptance criteria**:
- [x] Generates platform-optimized descriptions (YouTube 5000 chars, LinkedIn 3000 chars, Twitter 280 chars)
- [x] Output renders in an editable textarea so user can tweak before copying
- [x] Character count is shown with platform limit indicator

---

### TASK-306: Implement Script Doctor Tiptap editor
**Phase**: P3 | **Week(s)**: 11–12 | **Complexity**: XL | **Type**: component
**Spec refs**: FR-3.4 (implicit from proposal §3.4)
**Design refs**: Design §2.4

**Description**: Implement the block-based script editor using Tiptap — heading + paragraph blocks, character/word count, estimated read time; accessible from content detail when stage = SCRIPTING; content saved via `PATCH /api/v1/contents/{id}` with debounce.

**Acceptance criteria**:
- [x] Editor supports heading (H1, H2) and paragraph blocks; no table or media blocks
- [x] Word count and estimated read time (words / 130 WPM) update in real-time
- [x] Auto-save fires 1 second after last keystroke; "Saving..." indicator visible during save

---

### TASK-307: Implement AI Script Doctor sidebar
**Phase**: P3 | **Week(s)**: 12 | **Complexity**: L | **Type**: component
**Spec refs**: FR-3.4 (implicit from proposal §3.4)
**Design refs**: Design §2.4

**Description**: Implement the Script Doctor analysis sidebar — "Analyze" button calls `POST /api/v1/ai/script-doctor`, renders retention risk flags, hook strength score, and improvement suggestions; inline highlight of weak sections in the editor; "Apply Suggestion" one-click replace.

**Acceptance criteria**:
- [x] Weak sections are highlighted in the editor with a yellow/orange background mark
- [x] "Apply Suggestion" replaces highlighted text with AI suggestion and removes the highlight
- [x] Analysis results persist until user edits the script (stale indicator shown after edits)

---

### TASK-308: Implement script version history
**Phase**: P3 | **Week(s)**: 12 | **Complexity**: M | **Type**: component
**Spec refs**: FR-3.4 (implicit from proposal §3.4)
**Design refs**: Design §2.4

**Description**: Implement script version history panel — list of saved versions with timestamps; "Save Version" button; "Restore" reverts script content to selected version; versions stored in content record history.

**Acceptance criteria**:
- [x] Manual "Save Version" stores current script content with auto-generated label (e.g., "v3 - Mar 10, 2:34 PM")
- [x] Restoring a version requires a confirmation dialog warning that unsaved changes will be lost
- [x] Up to 20 versions are shown; older versions are paginated

---

### TASK-309: Implement Repurposing/Remix engine page
**Phase**: P3 | **Week(s)**: 12–13 | **Complexity**: L | **Type**: page
**Spec refs**: FR-3.5 (implicit from proposal §3.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/remix/page.tsx` — content selector (published/ready items), "Remix" button calls `POST /api/v1/ai/repurpose`, renders 5 variant cards (Twitter thread, LinkedIn post, Instagram carousel, TikTok script, Newsletter section) as editable cards with "Schedule" action.

**Acceptance criteria**:
- [x] Each variant card is editable inline (contenteditable or Textarea)
- [x] "Schedule" on a variant opens the publishing drawer pre-filled with variant content and selected platform
- [x] Loading state shows 5 skeleton variant cards while repurposing

---

### TASK-310: Implement Hook Generator panel
**Phase**: P3 | **Week(s)**: 13 | **Complexity**: S | **Type**: component
**Spec refs**: FR-3.5 (implicit from proposal §3.5)
**Design refs**: Design §2.4

**Description**: Implement the Hook Generator accessible from the script editor sidebar — topic + platform input, calls `POST /api/v1/ai/hooks`, renders 5 hook variations; "Insert" button inserts selected hook at cursor position in the script editor.

**Acceptance criteria**:
- [x] "Insert" places the hook text at the current cursor position in the Tiptap editor
- [x] Platform selector changes the hook style (e.g., YouTube = curiosity loop, TikTok = pattern interrupt)
- [x] Credit deducted per generation call

---

### TASK-311: Implement Hashtag + Caption Generator
**Phase**: P3 | **Week(s)**: 13 | **Complexity**: M | **Type**: component
**Spec refs**: FR-3.6 (implicit from proposal §3.6)
**Design refs**: Design §2.4

**Description**: Implement the Hashtag + Caption Generator integrated into the publishing post creation form — two tabs: (1) Hashtags: topic + platform → generates platform-specific hashtag sets via `POST /api/v1/ai/hashtags`; (2) Captions: content summary + platform → generates caption variants via `POST /api/v1/ai/caption`; one-click insert into post form.

**Acceptance criteria**:
- [x] Hashtag tab shows hashtags grouped by reach tier (broad, niche, micro)
- [x] "Insert" copies selected hashtags/caption into the corresponding post form field
- [x] Platform-specific limits enforced in UI (e.g., Instagram: max 30 hashtags shown with count)

---

## Phase 4 — Growth (Weeks 14–17)

### TASK-401: Implement analytics dashboard page
**Phase**: P4 | **Week(s)**: 14–15 | **Complexity**: XL | **Type**: page
**Spec refs**: FR-4.1 (implicit from proposal §4.1)
**Design refs**: Design §2.4

**Description**: Implement `/[locale]/(app)/analytics/page.tsx` — date range picker (7d/30d/90d/custom), platform selector, key metrics cards (views, subscribers, engagement rate, avg watch time), daily metric line chart (Recharts), top content table, audience insights section; PRO gate on >7-day range.

**Acceptance criteria**:
- [x] All chart data is fetched from `GET /api/v1/analytics/metrics` with date/platform query params
- [x] Date range >7 days shows `<TierGate tier="pro">` upgrade prompt for free users
- [x] Charts have accessible `aria-label` and data table fallback for screen reader users

---

### TASK-402: Implement pipeline velocity chart
**Phase**: P4 | **Week(s)**: 14 | **Complexity**: M | **Type**: component
**Spec refs**: FR-4.1 (implicit from proposal §4.1)
**Design refs**: Design §2.4

**Description**: Implement the pipeline velocity widget — bar chart showing average days spent in each pipeline stage (SCRIPTING → FILMING → EDITING → REVIEW), data from `GET /api/v1/analytics/velocity`.

**Acceptance criteria**:
- [x] Bars are colored with the pipeline section accent color (`--color-pipeline`)
- [x] Hovering a bar shows tooltip: "Stage: Editing — Avg: 3.2 days"
- [x] Chart has minimum height of 200px and is responsive

---

### TASK-403: Implement consistency hub page
**Phase**: P4 | **Week(s)**: 14–15 | **Complexity**: L | **Type**: page
**Spec refs**: FR-4.1 (implicit from proposal §4.1)
**Design refs**: Design §2.4

**Description**: Implement `/[locale]/(app)/consistency/page.tsx` — consistency score card with sparkline trend, streak counter with multiplier badge, 52-week × 7-day GitHub-style creation heatmap; data from `GET /api/v1/analytics/consistency` and `GET /api/v1/analytics/heatmap`.

**Acceptance criteria**:
- [x] Heatmap renders exactly 52×7 grid (364 days) with correct week/day alignment (Monday start)
- [x] Cell intensity uses 5-level color scale from design tokens (0 = `--color-muted`, 4+ = `--color-pipeline` darkest)
- [x] Hovering a cell shows tooltip: "{date} — {n} pieces published"

---

### TASK-404: Implement goals page
**Phase**: P4 | **Week(s)**: 15 | **Complexity**: M | **Type**: page
**Spec refs**: FR-4.1 (implicit from proposal §4.1)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/goals/page.tsx` — list of creator goals with progress bars; create goal modal (title, target metric, deadline); goal completion triggers milestone animation.

**Acceptance criteria**:
- [x] Goal progress bar animates on mount (CSS transition from 0 to current value)
- [x] Completed goals (100%) show a confetti burst animation and "Completed" badge
- [x] Create goal form validates target metric is a positive number

---

### TASK-405: Implement gamification profile page
**Phase**: P4 | **Week(s)**: 15–16 | **Complexity**: M | **Type**: page
**Spec refs**: FR-4.2 (implicit from proposal §4.2)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/gamification/page.tsx` — current level badge, XP progress bar to next level, recent XP transactions list, achievement gallery (unlocked full-color vs locked grey), active streak with multiplier; data from `GET /api/v1/gamification/profile` and `GET /api/v1/gamification/achievements`.

**Acceptance criteria**:
- [x] XP progress bar shows both current XP and XP needed for next level
- [x] Achievement gallery renders in a responsive grid; locked badges have 40% opacity
- [x] Recent XP transactions show action label, XP amount, and timestamp

---

### TASK-406: Implement XP toast WebSocket notifications
**Phase**: P4 | **Week(s)**: 15–16 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-4.2 (implicit from proposal §4.2)
**Design refs**: Design §3.6

**Description**: Implement WebSocket event listeners for `xp_earned`, `achievement_unlocked`, and `level_up` events that trigger the corresponding UI: XP toast ("+45 XP — Streak Multiplier 1.5x applied!"), achievement unlock celebration (full-screen confetti + badge reveal), level-up modal.

**Acceptance criteria**:
- [x] `xp_earned` event shows a toast with XP amount and multiplier (if active)
- [x] `achievement_unlocked` event triggers full-screen confetti overlay and badge reveal modal (first time only)
- [x] `level_up` event shows a level-up modal with new level badge; dismissible

---

### TASK-407: Implement reports page
**Phase**: P4 | **Week(s)**: 16 | **Complexity**: M | **Type**: page
**Spec refs**: FR-4.3 (implicit from proposal §4.3)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/reports/page.tsx` — pre-built report cards (Weekly Summary, Monthly Summary, Best Content); weekly summary shows pieces published, XP earned, consistency score, top platform; monthly summary shows growth metrics, top 3 content, income summary; CSV export gated at PRO.

**Acceptance criteria**:
- [x] Weekly and monthly summaries auto-select current period on page load
- [x] CSV export button is wrapped in `<TierGate tier="pro">`; clicking as free user shows upgrade prompt
- [x] Report cards show skeleton loaders while fetching from `GET /api/v1/analytics/reports`

---

### TASK-408: Implement sponsorships CRM page
**Phase**: P4 | **Week(s)**: 16–17 | **Complexity**: XL | **Type**: page
**Spec refs**: FR-4.4 (implicit from proposal §4.4)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/sponsorships/page.tsx` — kanban/list view of deals by status (LEAD, NEGOTIATION, SIGNED, DELIVERED, PAID); deal cards with brand name, value, deliverables count, next deadline; create deal modal; brand CRM panel.

**Acceptance criteria**:
- [x] Kanban view uses the same `@dnd-kit` drag-and-drop pattern as the pipeline board
- [x] Create deal modal requires brand name, deal value, currency; contact email is optional
- [x] List and kanban view toggle persists in `localStorage`

---

### TASK-409: Implement sponsorship deal detail drawer
**Phase**: P4 | **Week(s)**: 17 | **Complexity**: L | **Type**: component
**Spec refs**: FR-4.4 (implicit from proposal §4.4)
**Design refs**: Design §2.1

**Description**: Implement the deal detail drawer — brand info, deal value + payment status, deliverables list with checkboxes + due dates, linked content pieces, file attachments (contracts/briefs), status stepper.

**Acceptance criteria**:
- [x] Deliverable checkboxes update `PATCH /api/v1/sponsorships/{id}/deliverables/{deliverableId}`
- [x] Linked content pieces show pipeline card previews clickable to `/pipeline/[id]`
- [x] File attachments use the `FileUpload` component (TASK-214)

---

### TASK-410: Implement brand contacts CRM panel
**Phase**: P4 | **Week(s)**: 17 | **Complexity**: M | **Type**: component
**Spec refs**: FR-4.4 (implicit from proposal §4.4)
**Design refs**: Design §2.1

**Description**: Implement the brands panel within the sponsorships page — brand cards with logo (Clearbit API or letter fallback), name, total deal value, deal count; clicking a brand filters deals list to that brand.

**Acceptance criteria**:
- [x] Brand logo fetched from `https://logo.clearbit.com/{domain}` with letter-fallback on error
- [x] Brand cards are sorted by total deal value descending
- [x] Clicking a brand applies a filter without a full page reload

---

### TASK-411: Implement income tracker and revenue dashboard
**Phase**: P4 | **Week(s)**: 17 | **Complexity**: M | **Type**: component
**Spec refs**: FR-4.4 (implicit from proposal §4.4)
**Design refs**: Design §2.1

**Description**: Implement the income tracker widget within the sponsorships page — monthly revenue bar chart (Recharts), revenue breakdown by source (sponsorship/other), total YTD income card.

**Acceptance criteria**:
- [x] Bar chart shows last 12 months of revenue data from `GET /api/v1/sponsorships/income`
- [x] Revenue bars are colored with `--color-sponsorships` (green)
- [x] YTD total card shows correct currency symbol based on workspace currency setting

---

## Phase 5 — Billing + Polish (Weeks 18–20)

### TASK-501: Implement billing page
**Phase**: P5 | **Week(s)**: 18 | **Complexity**: M | **Type**: page
**Spec refs**: FR-5.1 (implicit from proposal §5.1)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/settings/billing/page.tsx` — current plan card (tier name, features, renewal date, cost), upgrade CTA buttons, Stripe Checkout redirect flow (calls `POST /api/v1/billing/checkout`), Stripe Customer Portal link (calls `POST /api/v1/billing/portal`).

**Acceptance criteria**:
- [x] Upgrade button calls `POST /api/v1/billing/checkout` and immediately redirects to Stripe URL
- [x] Customer portal link calls `POST /api/v1/billing/portal` and redirects; never opens in iframe
- [x] WebSocket `subscription_updated` event updates the plan display without page refresh

---

### TASK-502: Apply `TierGate` to all gated features globally
**Phase**: P5 | **Week(s)**: 18 | **Complexity**: M | **Type**: integration
**Spec refs**: FR-1.2.3, FR-5.1 (implicit)
**Design refs**: Design §4.3

**Description**: Audit all Phase 1–4 features and wrap every gated feature with `<TierGate>` — 90-day analytics, AI credits >50, workspace count >1, team invite, auto-publish, CSV export, script doctor, remix engine; ensure no inline tier checks exist.

**Acceptance criteria**:
- [x] `grep -r "tier ==" apps/web/src` returns zero results (all checks use `useTier()` or `<TierGate>`)
- [x] Each `<TierGate>` includes a descriptive `featureName` prop for the upgrade prompt
- [x] Enterprise-only features show "Enterprise Plan Required" (not just "Pro Plan Required")

---

### TASK-503: Implement settings hub (tabbed layout)
**Phase**: P5 | **Week(s)**: 18–19 | **Complexity**: M | **Type**: page
**Spec refs**: FR-5.2 (implicit from proposal §5.2)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/settings/page.tsx` — tabbed hub routing to Profile, Workspace, Team, Integrations, Notifications, Billing sub-pages; tab state synced to URL hash.

**Acceptance criteria**:
- [x] Tab navigation works via URL hash (e.g., `/settings#team`) for direct linking
- [x] Each tab content is lazy-loaded (Next.js dynamic import) to keep initial bundle small
- [x] Danger Zone section (delete workspace, deactivate account) is at the bottom with red styling and confirmation dialogs

---

### TASK-504: Implement profile settings page
**Phase**: P5 | **Week(s)**: 18–19 | **Complexity**: M | **Type**: page
**Spec refs**: FR-5.2 (implicit from proposal §5.2)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/settings/profile/page.tsx` — avatar upload (uses `FileUpload` component), display name edit, email change (requires password confirmation), password change form.

**Acceptance criteria**:
- [x] Avatar upload crops to 1:1 ratio via a client-side crop UI before uploading to S3
- [x] Email change requires current password and sends verification email before updating
- [x] Password change uses the same Zod schema as registration (min 10 chars, complexity rules)

---

### TASK-505: Implement workspace settings page
**Phase**: P5 | **Week(s)**: 19 | **Complexity**: S | **Type**: page
**Spec refs**: FR-5.2 (implicit from proposal §5.2)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/settings/workspace/page.tsx` — workspace name, description, timezone selector, content type preference toggles; all saved via `PATCH /api/v1/workspaces/{id}`.

**Acceptance criteria**:
- [x] Timezone selector uses a searchable dropdown with all IANA timezone names
- [x] Changes auto-save with a "Saved" indicator (no explicit Save button)
- [x] Workspace name change updates the sidebar and header display immediately via workspaceStore

---

### TASK-506: Implement team management settings page
**Phase**: P5 | **Week(s)**: 19 | **Complexity**: L | **Type**: page
**Spec refs**: FR-5.2 (implicit from proposal §5.2)
**Design refs**: Design §2.1, §4.3

**Description**: Implement `/[locale]/(app)/settings/team/page.tsx` — member list with roles (Owner/Admin/Member/Viewer), invite by email modal, role change dropdown, revoke access confirmation; invite wrapped in `<TierGate tier="pro">`.

**Acceptance criteria**:
- [x] Member list shows avatar, name, email, role, joined date
- [x] Role changes call `PATCH /api/v1/workspaces/{id}/members/{userId}` immediately
- [x] Revoking access requires confirmation dialog: "This will revoke {name}'s access immediately"

---

### TASK-507: Implement integrations settings page
**Phase**: P5 | **Week(s)**: 19 | **Complexity**: M | **Type**: page
**Spec refs**: FR-5.2 (implicit from proposal §5.2)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/settings/integrations/page.tsx` — OAuth connection cards for Google Calendar, Slack, GitHub, YouTube, Telegram; each shows connected status, connect/disconnect button, last sync time.

**Acceptance criteria**:
- [x] Connecting an integration initiates OAuth flow via `POST /api/v1/integrations/{provider}/connect` → redirect
- [x] Disconnecting shows confirmation dialog then calls `DELETE /api/v1/integrations/{provider}`
- [x] Last sync time is formatted as relative time (e.g., "2 hours ago")

---

### TASK-508: Implement notifications settings page
**Phase**: P5 | **Week(s)**: 19 | **Complexity**: S | **Type**: page
**Spec refs**: FR-5.2 (implicit from proposal §5.2)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/settings/notifications/page.tsx` — toggle matrix for notification types (pipeline stage change, mention, XP, achievement, sponsorship deadline, content scheduled) × channels (email, in-app, push).

**Acceptance criteria**:
- [x] Toggle state is persisted to `PATCH /api/v1/notifications/preferences` on change
- [x] Push notifications toggle requires browser permission grant (shown in-context)
- [x] All toggles have accessible `aria-label` with the notification type + channel

---

### TASK-509: Implement notification bell and panel
**Phase**: P5 | **Week(s)**: 19 | **Complexity**: M | **Type**: component
**Spec refs**: FR-5.3 (implicit from proposal §5.3)
**Design refs**: Design §3.6, §4.2

**Description**: Implement the notification bell in the header (unread count badge) and the slide-in notifications panel — list of notifications with icon/message/timestamp/read state; mark all as read; mark individual as read; click to navigate to relevant page; real-time updates via `notification` WebSocket event.

**Acceptance criteria**:
- [x] Unread count badge updates in real-time on new `notification` WebSocket event
- [x] Clicking a notification marks it as read (PATCH), removes unread styling, and navigates to the linked resource
- [x] "Mark all as read" calls `PATCH /api/v1/notifications/read-all` and clears all unread badges

---

### TASK-510: Implement global search (full `Cmd+K` with search mode)
**Phase**: P5 | **Week(s)**: 19 | **Complexity**: L | **Type**: component
**Spec refs**: FR-5.4 (implicit from proposal §5.4)
**Design refs**: Design §4.2

**Description**: Upgrade the CommandPalette stub (TASK-124) to support full search mode — type `/` to switch to search, results grouped by type (Ideas, Content, Series, Sponsorships), keyboard navigation between groups and items, calls `GET /api/v1/search?q=...` with 300ms debounce.

**Acceptance criteria**:
- [x] Search results appear within 400ms of query (debounced + React Query staleTime: 0)
- [x] Keyboard: Arrow keys navigate items, Enter opens selected, Escape closes
- [x] Search results show type icon, title, and breadcrumb (e.g., "Ideas > My Video Idea")

---

### TASK-511: Implement unified inbox page
**Phase**: P5 | **Week(s)**: 20 | **Complexity**: M | **Type**: page
**Spec refs**: FR-5.5 (implicit from proposal §5.5)
**Design refs**: Design §2.1

**Description**: Implement `/[locale]/(app)/inbox/page.tsx` — social comments/messages aggregator with platform-filtered tabs; reply, star, mark-as-read actions per item; calls `GET /api/v1/inbox`.

**Acceptance criteria**:
- [x] Platform tabs filter inbox items without a new API call (client-side filter on cached data)
- [x] Reply action opens an inline reply composer that calls the relevant platform API via backend
- [x] Unread items show bold text; read items show muted text

---

### TASK-512: Implement error boundaries for all pages
**Phase**: P5 | **Week(s)**: 20 | **Complexity**: M | **Type**: infra
**Spec refs**: Global constraints (spec §Global)
**Design refs**: Design §4.4

**Description**: Implement `error.tsx` files at the `(app)/`, ideas, pipeline, analytics, series, sponsorships, studio, and settings route levels — each with a branded error UI, error message, and "Try again" retry button.

**Acceptance criteria**:
- [x] Each `error.tsx` uses the Next.js App Router `error` prop and `reset` function correctly
- [x] Error UI shows a friendly message (not a raw stack trace in production)
- [x] Sentry `captureException` is called in each error boundary's effect (even before Phase 6 full Sentry setup)

---

### TASK-513: Implement offline fallback page
**Phase**: P5 | **Week(s)**: 20 | **Complexity**: S | **Type**: infra
**Spec refs**: Global constraints (spec §Global)
**Design refs**: Design §4.4

**Description**: Implement a service worker offline fallback page that shows a branded "You're offline" page when network requests fail; register the service worker in `apps/web/src/app/layout.tsx`.

**Acceptance criteria**:
- [x] Offline fallback page renders correctly without any network requests
- [x] Service worker is registered only in production (not in dev mode)
- [x] Fallback shows a "Retry" button that attempts to reload when connectivity is restored

---

### TASK-514: Full accessibility audit and fixes
**Phase**: P5 | **Week(s)**: 20 | **Complexity**: L | **Type**: infra
**Spec refs**: Global constraints (spec §Global)
**Design refs**: Design §4.4

**Description**: Run `axe-core` automated accessibility scan on all Phase 1–5 pages; fix all WCAG 2.1 AA violations — focus rings, aria-labels, color contrast, keyboard traps, screen reader announcements.

**Acceptance criteria**:
- [x] `axe-core` reports zero critical or serious violations on dashboard, ideas, pipeline, analytics, and settings pages
- [x] All icon-only buttons have `aria-label`
- [x] Focus ring is visible on all interactive elements in both light and dark themes

---

### TASK-515: Implement reduced motion support
**Phase**: P5 | **Week(s)**: 20 | **Complexity**: S | **Type**: component
**Spec refs**: Global constraints (spec §Global)
**Design refs**: Design §4.4

**Description**: Audit all animations (page transitions, confetti, XP toasts, skeleton pulses, drag previews) and wrap each in `@media (prefers-reduced-motion: reduce)` CSS rules or a `useReducedMotion()` hook.

**Acceptance criteria**:
- [x] Enabling "Reduce Motion" in OS settings removes all CSS animations and transitions
- [x] `useReducedMotion()` hook is used for JS-driven animations (confetti, level-up modal)
- [x] Skeleton loaders use a static gray color (no pulse) when reduced motion is active

---

### TASK-516: Mobile responsiveness audit
**Phase**: P5 | **Week(s)**: 20 | **Complexity**: M | **Type**: infra
**Spec refs**: Global constraints (spec §Global)
**Design refs**: Design §4.4

**Description**: Test all pages at 320px, 768px, and 1280px breakpoints; fix layout overflow, truncation, touch target sizes (<44px), and horizontal scroll issues; ensure sidebar collapses to bottom nav on mobile.

**Acceptance criteria**:
- [x] No horizontal scroll on any page at 320px width
- [x] All touch targets are ≥44×44px on mobile
- [x] Sidebar renders as a bottom navigation bar on screens <768px

---

## Phase 6 — Hardening (Weeks 21–24)

### TASK-601: Bundle analysis and code splitting
**Phase**: P6 | **Week(s)**: 21 | **Complexity**: M | **Type**: perf
**Spec refs**: FR-6.1 (implicit from proposal §6.1)
**Design refs**: Design §6.2

**Description**: Run `@next/bundle-analyzer` and identify bundles >100KB; implement dynamic imports (`next/dynamic`) for heavy components (KanbanBoard, Calendar, Chart components, Tiptap editor, Recharts); verify route-level code splitting is correct.

**Acceptance criteria**:
- [ ] No single page's JavaScript bundle exceeds 250KB gzipped (measured by bundle analyzer)
- [ ] KanbanBoard, Calendar, and Recharts are loaded via dynamic import with skeleton fallback
- [ ] Turborepo remote cache is enabled and CI build time is <10 minutes after first run

---

### TASK-602: React Server Components optimization pass
**Phase**: P6 | **Week(s)**: 21 | **Complexity**: M | **Type**: perf
**Spec refs**: FR-6.1 (implicit from proposal §6.1)
**Design refs**: Design §2.4

**Description**: Audit all page components against the RSC/Client decision tree (design §2.4); convert any page that doesn't need client state to RSC; wrap the smallest possible subtrees with `"use client"`.

**Acceptance criteria**:
- [ ] Dashboard, IdeasListPage, AnalyticsPage, ReportsPage are Server Components (no `"use client"` at page level)
- [ ] `"use client"` is only at the leaf component level (IdeaCard, FilterBar, Chart, etc.) not at page level
- [ ] `apps/web/src` has no `"use client"` in any `layout.tsx` file

---

### TASK-603: Core Web Vitals measurement and LCP optimization
**Phase**: P6 | **Week(s)**: 21–22 | **Complexity**: L | **Type**: perf
**Spec refs**: FR-6.1 (implicit from proposal §6.1)
**Design refs**: Design §6.2

**Description**: Set up Lighthouse CI in GitHub Actions; identify LCP elements on dashboard and ideas pages; optimize: `next/image` with `priority` on above-fold images, `next/font` for Inter, preload critical CSS, verify Suspense boundaries prevent CLS.

**Acceptance criteria**:
- [ ] Lighthouse CI reports LCP <2.5s, CLS <0.1, INP <200ms on dashboard and ideas pages
- [ ] All above-fold `<Image>` components have `priority` prop set
- [ ] Inter font loads via `next/font` (no FOUT — Flash of Unstyled Text)

---

### TASK-604: React Query caching strategy tuning
**Phase**: P6 | **Week(s)**: 22 | **Complexity**: M | **Type**: perf
**Spec refs**: FR-6.1 (implicit from proposal §6.1)
**Design refs**: Design §5.2

**Description**: Audit and tune `staleTime` and `gcTime` for all React Query hooks — high-frequency data (notifications, XP) should have short staleTime; slow-changing data (user profile, workspace) should have long staleTime; define per-resource strategy.

**Acceptance criteria**:
- [ ] Notifications: `staleTime: 0`, `gcTime: 30s`
- [ ] Ideas list: `staleTime: 30s`, `gcTime: 5m`
- [ ] User profile, workspace: `staleTime: 5m`, `gcTime: 30m`
- [ ] No query uses the default staleTime (0) for slow-changing data

---

### TASK-605: WebSocket reconnection strategy
**Phase**: P6 | **Week(s)**: 22 | **Complexity**: S | **Type**: perf
**Spec refs**: FR-6.1 (implicit from proposal §6.1)
**Design refs**: Design §3.6

**Description**: Verify the WebSocket client (TASK-111) exponential backoff is working correctly in production-like conditions; add a connection status indicator in the UI (subtle dot in sidebar footer); test Vercel deployment to confirm WS connects directly to backend.

**Acceptance criteria**:
- [ ] WebSocket connection indicator shows green when connected, yellow when reconnecting, red after all retries exhausted
- [ ] Manual tab focus after network recovery triggers an immediate reconnect attempt
- [ ] WebSocket client does NOT route through any Next.js API or Edge Function

---

### TASK-606: Jest + RTL unit test suite for `@ordo/api-client`
**Phase**: P6 | **Week(s)**: 22–23 | **Complexity**: L | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write Jest unit tests for all 15 `@ordo/api-client` resource modules — mock `fetch` globally, test success cases, error normalization, 401 retry logic, and request cancellation; target 80% line coverage.

**Acceptance criteria**:
- [ ] `packages/api-client` Jest coverage report shows ≥80% lines, branches, and functions
- [ ] `jwtRefreshInterceptor` has tests for: single 401 (retry succeeds), concurrent 401s (deduplicated refresh), refresh failure (calls `onUnauthorized`)
- [ ] All tests use `jest.fn()` mocks — no real network calls

---

### TASK-607: Jest unit tests for Zustand stores
**Phase**: P6 | **Week(s)**: 22–23 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write Jest unit tests for `authStore` and `workspaceStore` — test all state transitions (login, logout, token refresh, workspace switch, tier update), persistence behavior, and selectors; target 80% coverage.

**Acceptance criteria**:
- [ ] `authStore.login()` sets `isAuthenticated: true` and `accessToken` correctly
- [ ] `authStore.logout()` clears all state and `accessToken` is not findable in any storage
- [ ] `workspaceStore.switchWorkspace()` updates `activeWorkspaceId` and triggers cache invalidation

---

### TASK-608: Jest unit tests for Zod validation schemas
**Phase**: P6 | **Week(s)**: 22 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write Jest unit tests for all Zod schemas in `@ordo/validations` — test valid inputs, invalid inputs (each validation rule), and schema composition; use `z.safeParse()` to assert correct errors.

**Acceptance criteria**:
- [ ] `RegisterRequestSchema` test coverage: valid data, invalid email, password too short, password missing complexity, name too short
- [ ] `IdeaSchema` test: valid idea, status enum invalid value, missing required fields
- [ ] All schema files have ≥80% branch coverage

---

### TASK-609: React Testing Library component tests for design system
**Phase**: P6 | **Week(s)**: 22–23 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write RTL component tests for core `@ordo/ui` components — Button (all variants, loading state, disabled state), Input (error state, label rendering), Card, Toast, Modal/Dialog (open/close, focus trap), Badge variants.

**Acceptance criteria**:
- [ ] `<Button loading>` test: `aria-busy="true"` is set, onClick is not called while loading
- [ ] `<Dialog>` test: focus is trapped inside when open; Escape key closes the dialog
- [ ] All component tests include an accessibility assertion (`getByRole` over `getByTestId`)

---

### TASK-610: RTL component tests for key feature components
**Phase**: P6 | **Week(s)**: 23 | **Complexity**: L | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write RTL tests for: `IdeaCard` (render, click to open detail, optimistic status change), `ContentCard` (render all content types, overdue date styling), `ConsistencyHeatmap` (renders 364 cells, correct intensity class), `TierGate` (renders upgrade prompt for free tier, renders children for pro tier).

**Acceptance criteria**:
- [ ] `IdeaCard` test: clicking card fires `onOpen` callback with correct idea ID
- [ ] `ConsistencyHeatmap` test: renders exactly 364 `.heatmap-cell` elements
- [ ] `TierGate` test: free-tier store state → upgrade prompt visible; pro-tier state → children visible

---

### TASK-611: MSW mock server setup
**Phase**: P6 | **Week(s)**: 22 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Set up MSW (Mock Service Worker) for all API endpoints — create handler files per resource domain, use `http.get/post/patch/delete` with realistic response data matching Zod schemas; configure for both Jest (Node environment) and Playwright (browser).

**Acceptance criteria**:
- [ ] All 40+ API endpoints have MSW handlers with realistic mock data
- [ ] MSW handlers match the exact paths used by `@ordo/api-client` resource modules
- [ ] Error scenarios are mockable: `server.use(http.get('/api/v1/ideas', () => HttpResponse.error()))`

---

### TASK-612: RTL integration tests — auth flow
**Phase**: P6 | **Week(s)**: 23 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write RTL integration tests for the auth flow using MSW — register → login → token refresh → logout; test that 401 on any API call triggers silent refresh and retry; test that refresh failure triggers logout.

**Acceptance criteria**:
- [ ] Register test: fills form, submits, MSW returns 201, user is redirected to onboarding
- [ ] Token refresh test: API returns 401, refresh handler returns new token, original request retries and succeeds
- [ ] Refresh failure test: API returns 401, refresh returns 401, user is redirected to login

---

### TASK-613: RTL integration tests — idea capture and pipeline flows
**Phase**: P6 | **Week(s)**: 23 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write RTL integration tests for: (1) idea creation via `Cmd+K` — input → submit → appears in list; (2) pipeline drag-to-next-stage — card moves column, API called, optimistic revert on error.

**Acceptance criteria**:
- [ ] Idea capture test: triggers `keydown Ctrl+K`, types idea title, presses Enter, MSW returns 201, new IdeaCard appears in list
- [ ] Pipeline drag test: `@dnd-kit` simulated drag updates card column; MSW error response reverts card position
- [ ] Both tests assert the correct API calls were made via MSW request history

---

### TASK-614: Playwright E2E test — happy path
**Phase**: P6 | **Week(s)**: 23–24 | **Complexity**: L | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write Playwright E2E happy-path test: sign up → onboarding → capture idea (Cmd+K) → view in ideas list → promote to pipeline → drag to EDITING stage → schedule content → verify on calendar. Run in Chromium, Firefox, WebKit.

**Acceptance criteria**:
- [ ] Full happy path passes in Chromium, Firefox, and WebKit without flakes
- [ ] Test uses real app routes (not mocked) against a test database seeded by the backend
- [ ] Each step has a meaningful Playwright step name for readable test output

---

### TASK-615: Playwright E2E test — auth and OAuth
**Phase**: P6 | **Week(s)**: 23–24 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write Playwright E2E auth tests — email login, OAuth Google (mocked OAuth server), logout; verify protected routes redirect to login when unauthenticated; verify refresh token flow keeps session alive.

**Acceptance criteria**:
- [ ] Email login test: fills login form, redirects to dashboard, `authStore.isAuthenticated = true`
- [ ] OAuth test: uses a mock OAuth server (or Playwright network intercept) to simulate Google callback
- [ ] Logout test: clears session, protected route access redirects to login

---

### TASK-616: Playwright E2E test — billing upgrade
**Phase**: P6 | **Week(s)**: 23–24 | **Complexity**: M | **Type**: test
**Spec refs**: FR-6.2 (implicit from proposal §6.2)
**Design refs**: Design §6.3

**Description**: Write Playwright E2E billing test — click upgrade CTA, verify Stripe Checkout redirect is triggered (intercept the POST to billing/checkout), verify subscription_updated WebSocket event updates plan badge.

**Acceptance criteria**:
- [ ] Test intercepts `POST /api/v1/billing/checkout` and verifies correct plan ID is sent
- [ ] After mock WebSocket `subscription_updated` event, plan badge on billing page updates to "Pro"
- [ ] Test runs in Stripe test mode (never hits real Stripe in CI)

---

### TASK-617: Sentry error monitoring integration
**Phase**: P6 | **Week(s)**: 23 | **Complexity**: M | **Type**: infra
**Spec refs**: FR-6.3 (implicit from proposal §6.3)
**Design refs**: Design §6.4

**Description**: Install `@sentry/nextjs`, run `sentry-wizard`, configure DSN from environment variable; attach workspace ID and tier as user context; enable performance monitoring with transaction tracing for dashboard, ideas, and pipeline routes.

**Acceptance criteria**:
- [ ] Sentry is initialized in `instrumentation.ts` (Next.js App Router pattern) — not in `_app.tsx`
- [ ] Every error event includes `user: { workspaceId, tier }` context
- [ ] Performance traces are captured for dashboard, ideas, and pipeline page loads

---

### TASK-618: Custom analytics event tracking
**Phase**: P6 | **Week(s)**: 23 | **Complexity**: S | **Type**: infra
**Spec refs**: FR-6.3 (implicit from proposal §6.3)
**Design refs**: Design §6.4

**Description**: Implement an internal `trackEvent(name, props)` utility that posts custom events to Sentry (or a lightweight internal endpoint) — instrument: `idea_captured`, `content_stage_changed`, `ai_credit_used`, `upgrade_clicked`.

**Acceptance criteria**:
- [ ] `trackEvent` is called at each of the four instrumented actions
- [ ] Events include relevant props: `idea_captured: { source: 'cmd_k' | 'button' }`, `content_stage_changed: { from, to, contentId }`
- [ ] No PII (emails, names) in event properties

---

### TASK-619: GitHub Actions CI pipeline — lint, typecheck, unit tests
**Phase**: P6 | **Week(s)**: 23–24 | **Complexity**: M | **Type**: infra
**Spec refs**: FR-6.4 (implicit from proposal §6.4)
**Design refs**: Design §6.5

**Description**: Implement `.github/workflows/ci.yml` — runs on every PR: Turborepo `lint`, `type-check`, Jest unit tests, component tests; uploads coverage report as artifact; fails PR on any lint or type error.

**Acceptance criteria**:
- [ ] CI pipeline completes in <10 minutes on a standard GitHub Actions runner (leverages Turborepo remote cache)
- [ ] Coverage report is uploaded as a GitHub Actions artifact and visible on the PR checks page
- [ ] Lint or type errors block PR merge (branch protection rule documented in PR description)

---

### TASK-620: GitHub Actions E2E pipeline (nightly)
**Phase**: P6 | **Week(s)**: 23–24 | **Complexity**: M | **Type**: infra
**Spec refs**: FR-6.4 (implicit from proposal §6.4)
**Design refs**: Design §6.5

**Description**: Implement `.github/workflows/e2e.yml` — nightly cron, runs Playwright tests against the staging environment in Chromium, Firefox, and WebKit; uploads Playwright HTML report as artifact; notifies Slack on failure.

**Acceptance criteria**:
- [ ] Playwright runs in all three browsers in parallel (using GitHub Actions matrix strategy)
- [ ] Playwright HTML report is uploaded as artifact with 30-day retention
- [ ] Slack notification is sent on failure with a link to the failing run

---

### TASK-621: Staging deployment pipeline
**Phase**: P6 | **Week(s)**: 23–24 | **Complexity**: M | **Type**: infra
**Spec refs**: FR-6.4 (implicit from proposal §6.4)
**Design refs**: Design §6.5

**Description**: Implement `.github/workflows/deploy-staging.yml` — triggers on merge to `develop` branch; builds Next.js app via Turborepo; deploys to Vercel staging environment; runs smoke tests post-deploy.

**Acceptance criteria**:
- [ ] Staging deployment is fully automated — zero manual steps after merge to `develop`
- [ ] Post-deploy smoke test hits `/[locale]/dashboard` and verifies HTTP 200
- [ ] All staging environment variables (API URL, WS URL, Sentry DSN) are set via Vercel project settings (not hardcoded)

---

### TASK-622: Production deployment pipeline with approval gate
**Phase**: P6 | **Week(s)**: 23–24 | **Complexity**: M | **Type**: infra
**Spec refs**: FR-6.4 (implicit from proposal §6.4)
**Design refs**: Design §6.5

**Description**: Implement `.github/workflows/deploy-production.yml` — triggers on merge to `main`; requires GitHub Environment approval from a designated reviewer before deploying; deploys to Vercel production; completes in <5 minutes after approval.

**Acceptance criteria**:
- [ ] Production deploy requires explicit approval via GitHub Environments (reviewer must click "Approve" in Actions UI)
- [ ] Deploy step runs `vercel --prod` with `VERCEL_TOKEN` from GitHub Secrets (not hardcoded)
- [ ] Deployment completes in <5 minutes after approval (leverages pre-built artifacts)

---

### TASK-623: Environment variable audit and secrets management
**Phase**: P6 | **Week(s)**: 24 | **Complexity**: S | **Type**: infra
**Spec refs**: FR-6.4 (implicit from proposal §6.4)
**Design refs**: Design §6.5

**Description**: Document all required environment variables in `apps/web/.env.example`; audit that no secrets appear in source code (no API keys, no Stripe keys, no Sentry DSN hardcoded); verify `NEXT_PUBLIC_*` variables are only non-sensitive public values.

**Acceptance criteria**:
- [ ] `apps/web/.env.example` lists all required environment variables with descriptions (no real values)
- [ ] `git grep -i "sk_live\|sk_test\|sentry_dsn" .` returns zero results (no hardcoded secrets)
- [ ] Only `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are prefixed with `NEXT_PUBLIC_` (all other vars are server-only)

---

### TASK-624: k6 load test for frontend performance
**Phase**: P6 | **Week(s)**: 24 | **Complexity**: M | **Type**: perf
**Spec refs**: FR-6.4 (implicit from proposal §6.4)
**Design refs**: Design §6.2

**Description**: Write k6 load test script for the frontend under concurrent users — simulate 100 concurrent users navigating dashboard → ideas → pipeline over 5 minutes; measure response times and error rates against staging.

**Acceptance criteria**:
- [ ] p95 response time for dashboard page load <2s under 100 concurrent users
- [ ] Error rate <1% for all requests during the 5-minute sustained load period
- [ ] k6 script is checked into `tests/load/` and documented in `apps/web/README.md`

---

### TASK-625: Write developer documentation
**Phase**: P6 | **Week(s)**: 24 | **Complexity**: M | **Type**: infra
**Spec refs**: FR-6.5 (implicit from proposal §6.5)
**Design refs**: Design §6.5

**Description**: Write `apps/web/README.md` (local dev setup, env vars, available scripts), `packages/api-client/README.md` (how to add new resource modules), `packages/ui/README.md` (how to add new components, naming conventions); write ADRs for state management, routing, and auth token strategy choices.

**Acceptance criteria**:
- [ ] New engineer can run `pnpm install && pnpm dev` successfully using only `apps/web/README.md` instructions
- [ ] `packages/api-client/README.md` includes a step-by-step example for adding a new resource module
- [ ] At least 3 ADRs written: `adr-001-state-management.md`, `adr-002-routing.md`, `adr-003-auth-token.md`

---

## Critical Path

The critical path flows through the scaffolding tasks before any feature work can begin:

```
TASK-101 (Turborepo root)
  └── TASK-102 (@ordo/config) → TASK-103 (@ordo/types) → TASK-104 (@ordo/validations)
        └── TASK-107 (api-client fetch wrapper) → TASK-108 (JWT refresh) → TASK-109 (resource modules)
              └── TASK-112 (Next.js scaffold) → TASK-113 (next-intl) → TASK-114 (providers/AppLayout)
                    └── TASK-125 (authStore) + TASK-126 (workspaceStore)
                          └── TASK-127 (login page) → TASK-131 (workspace creation) → TASK-132 (onboarding)
                                └── [Phase 2 begins — TASK-201+]
                                      └── [Phase 3 begins — TASK-301+]
                                            └── [Phase 4 begins — TASK-401+]
                                                  └── [Phase 5 begins — TASK-501+]
                                                        └── [Phase 6 begins — TASK-601+]
```

**Critical path tasks** (blocking all downstream phases): TASK-101 through TASK-132 (all Phase 1 tasks). Phase 2–6 tasks are only blocked on Phase 1 completion and their own phase gate.

**Parallel opportunities within phases**:
- Phase 1: Design system (TASK-116–124) can proceed in parallel with API client (TASK-107–111) — different engineers
- Phase 2: Series (TASK-216–217), Publishing (TASK-218–220), and Pipeline (TASK-209–215) can be parallelized after dashboard (TASK-201) is complete
- Phase 6: Testing tasks (TASK-606–613) can run in parallel with infra tasks (TASK-619–622)

---

## Phase Task Count Summary

| Phase | Tasks | Complexity Breakdown | Estimated Engineer-Weeks |
|-------|-------|---------------------|--------------------------|
| P1 Foundation | 34 (TASK-101–134) | 5×XS, 14×S, 10×M, 4×L, 1×XL | 4 weeks (2 engineers) |
| P2 Core Creator | 22 (TASK-201–222) | 2×XS, 4×S, 8×M, 6×L, 2×XL | 5 weeks (2 engineers) |
| P3 AI Studio | 11 (TASK-301–311) | 0×XS, 2×S, 3×M, 4×L, 2×XL | 4 weeks (2 engineers) |
| P4 Growth | 11 (TASK-401–411) | 0×XS, 1×S, 4×M, 4×L, 2×XL | 4 weeks (2 engineers) |
| P5 Billing+Polish | 16 (TASK-501–516) | 0×XS, 3×S, 5×M, 6×L, 2×XL | 3 weeks (2 engineers) |
| P6 Hardening | 25 (TASK-601–625) | 0×XS, 3×S, 12×M, 8×L, 2×XL | 4 weeks (2 engineers) |
| **Total** | **119 tasks** | | **24 weeks** |

---

## Spec Cross-Reference Index

| Spec Section | Tasks |
|---|---|
| FR-1.1.1–1.1.3 (Turborepo) | TASK-101–106 |
| FR-1.2.1–1.2.3 (Design System) | TASK-116–124 |
| FR-1.3.1–1.3.2 (API Client) | TASK-107–111 |
| FR-1.4 (Next.js scaffold) | TASK-112–115 |
| FR-1.5 (Auth flows) | TASK-125, 127–130 |
| FR-1.6 (Workspace bootstrap) | TASK-126, 131–133 |
| FR-2.1–2.5 (Core Creator) | TASK-201–222 |
| FR-3.1–3.6 (AI Studio) | TASK-301–311 |
| FR-4.1–4.4 (Growth) | TASK-401–411 |
| FR-5.1–5.5 (Billing+Polish) | TASK-501–516 |
| FR-6.1–6.5 (Hardening) | TASK-601–625 |
| Global constraints | TASK-123, 512–516, 614 |
