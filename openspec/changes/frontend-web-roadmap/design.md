# Technical Design: Frontend Web Roadmap
## Ordo Creator OS — Next.js Web Application

**Change name**: `frontend-web-roadmap`
**Author**: sdd-design
**Date**: 2026-03-10
**Status**: COMPLETE

---

## 1. Monorepo Architecture (Turborepo)

### 1.1 Workspace Root Structure

```
ordo/                                    # Repo root
├── apps/
│   ├── web/                             # Next.js 15 web app (this design)
│   ├── mobile/                          # React Native / Expo (future)
│   └── desktop/                         # Electron (future)
│
├── packages/
│   ├── config/                          # Shared tooling configs
│   ├── types/                           # Shared TypeScript interfaces
│   ├── validations/                     # Zod schemas
│   ├── i18n/                            # Translation files + utilities
│   ├── ui/                              # shadcn/ui + Ordo component library
│   ├── hooks/                           # Shared React hooks
│   ├── stores/                          # Zustand store definitions
│   ├── api-client/                      # HTTP client + typed resource modules
│   └── core/                            # Domain entities + use-case logic
│
├── turbo.json                           # Turborepo pipeline configuration
├── package.json                         # Root workspace (no source; scripts only)
├── pnpm-workspace.yaml                  # PNPM workspace definition
└── .github/workflows/                   # CI/CD pipelines
```

### 1.2 Package Dependency Graph

Dependencies flow strictly downward; no circular imports are allowed.

```
apps/web
  ├── @ordo/ui            (components)
  ├── @ordo/hooks         (React hooks)
  ├── @ordo/stores        (Zustand stores)
  ├── @ordo/api-client    (HTTP + React Query)
  ├── @ordo/i18n          (translations)
  └── @ordo/types         (TypeScript types — consumed by all)
        └── @ordo/validations  (Zod schemas — consumed by api-client, ui)
              └── @ordo/core   (domain entities — leaf, no @ordo deps)
              └── @ordo/config (tooling — devDependency only)
```

**Rule**: `@ordo/core` and `@ordo/types` have zero `@ordo/*` runtime dependencies. They are the leaves of the graph. Everything else may depend on them.

### 1.3 Package Manifests (key fields)

```jsonc
// packages/config/package.json
{
  "name": "@ordo/config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./eslint": "./eslint.config.mjs",
    "./tsconfig": "./tsconfig.base.json",
    "./tailwind": "./tailwind.config.base.ts"
  }
}

// packages/types/package.json
{
  "name": "@ordo/types",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

All internal packages use `"private": true` and TypeScript source entry points directly — no build step required for packages consumed only inside the monorepo. Turborepo handles transpilation at the consuming app level via `transpilePackages` in `next.config.ts`.

### 1.4 `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 1.5 `turbo.json` — Build Pipeline

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_WS_URL"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "outputs": ["playwright-report/**"]
    }
  }
}
```

**Caching strategy**:
- `build` and `test` are cached by input hash; Turborepo remote cache (Vercel) stores artifacts across CI runs.
- `dev` is never cached (persistent).
- `lint` and `typecheck` are cached; they re-run only when source files change.
- Cache hit on `build` skips the Next.js compile step entirely in CI — key for < 10-minute pipeline target.

### 1.6 Incremental Package Scaffolding Order

Phase 1 scaffolds these packages first (minimum viable set):

| Priority | Package | Reason |
|----------|---------|--------|
| 1 | `@ordo/config` | All other packages need ESLint + tsconfig |
| 2 | `@ordo/types` | Type definitions needed by everything |
| 3 | `@ordo/validations` | Zod schemas needed by api-client |
| 4 | `@ordo/api-client` | Core communication layer |
| 5 | `@ordo/ui` | Components needed by apps/web |
| 6 | `@ordo/stores` | State management |
| 7 | `@ordo/hooks` | Hooks that wrap stores + queries |
| 8 | `@ordo/i18n` | i18n utilities |
| 9 | `@ordo/core` | Domain logic (promote only when needed in 2+ places) |

---

## 2. Next.js App Router Structure

### 2.1 Route Groups and Layouts

```
src/app/
├── [locale]/                            # i18n dynamic segment
│   ├── layout.tsx                       # ROOT: providers, HTML lang
│   ├── page.tsx                         # → redirect /[locale]/dashboard
│   ├── loading.tsx                      # Global fallback skeleton
│   ├── error.tsx                        # Global error boundary
│   ├── not-found.tsx                    # 404 page
│   │
│   ├── (auth)/                          # No sidebar — centered card layout
│   │   ├── layout.tsx                   # AuthLayout: ThemeProvider only
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── auth/callback/page.tsx       # OAuth2 redirect handler
│   │
│   ├── (app)/                           # Authenticated — sidebar + header
│   │   ├── layout.tsx                   # AppLayout: auth guard, Sidebar, Header
│   │   ├── dashboard/
│   │   │   ├── page.tsx                 # Server Component (RSC)
│   │   │   └── loading.tsx              # Dashboard skeleton
│   │   ├── ideas/
│   │   │   ├── page.tsx                 # RSC list with Suspense
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── pipeline/
│   │   │   ├── page.tsx                 # Client Component (dnd-kit)
│   │   │   ├── loading.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── series/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── publishing/page.tsx
│   │   ├── studio/page.tsx              # AI Chat — Client Component
│   │   ├── remix/
│   │   │   ├── page.tsx
│   │   │   └── [jobId]/page.tsx
│   │   ├── analytics/
│   │   │   ├── page.tsx
│   │   │   └── [contentId]/page.tsx
│   │   ├── consistency/page.tsx
│   │   ├── goals/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── gamification/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── sponsorships/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── inbox/page.tsx
│   │   ├── search/page.tsx
│   │   ├── workspaces/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── settings/
│   │       ├── page.tsx                 # Settings hub — tabbed
│   │       ├── profile/page.tsx
│   │       ├── workspace/page.tsx
│   │       ├── team/page.tsx
│   │       ├── integrations/page.tsx
│   │       ├── notifications/page.tsx
│   │       └── billing/page.tsx
│   │
│   └── (public)/                        # No auth — marketing pages
│       ├── layout.tsx                   # PublicLayout: minimal header
│       └── page.tsx                     # Landing page (SSG)
│
└── api/                                 # Next.js Route Handlers
    └── auth/
        └── refresh/route.ts             # Cookie-based token refresh proxy
```

### 2.2 Parallel Routes (Panels)

The pipeline page uses parallel routes to render a detail panel alongside the kanban board without a full navigation:

```
src/app/[locale]/(app)/pipeline/
├── page.tsx                             # Kanban board (default slot)
├── @panel/                              # Named slot: detail panel
│   ├── default.tsx                      # null (no panel by default)
│   └── [id]/page.tsx                    # Slide-in detail panel for content [id]
└── layout.tsx                           # Renders {children} and {@panel}
```

The panel slot renders as a slide-in drawer at the layout level — this means navigating `/pipeline/[id]` shows the kanban board AND the detail panel simultaneously without losing kanban scroll position.

### 2.3 Intercepting Routes (Modals)

Quick-capture and idea-detail modals use intercepting routes so they render as overlays when navigated to from the app, but render as full pages when accessed directly (e.g., shared link, browser refresh).

```
src/app/[locale]/(app)/ideas/
├── page.tsx                             # Full ideas list
├── [id]/page.tsx                        # Full idea detail (direct nav / refresh)
└── (.)[id]/page.tsx                     # Intercepted: renders as modal over ideas list
```

Pattern: `(.)` intercepts routes at the same level. The modal renders via a `<Modal>` wrapper in the intercepted route; the full page renders as a standalone page in `[id]/page.tsx`.

### 2.4 Server Components vs Client Components Decision Tree

```
Is this component interactive (event handlers, useState, useEffect)?
├── YES → "use client" directive required
│   Examples: KanbanBoard, ChatInput, DragItem, CommandPalette,
│             WebSocketListener, QuickCaptureForm
│
└── NO → Default to Server Component (RSC)
    Is it reading server-side data (database, auth session)?
    ├── YES → RSC with async fetch — no useQuery needed
    │   Examples: DashboardPage, IdeasListPage, AnalyticsPage
    │
    └── NO → RSC for layout / shell components
        Examples: AppLayout, Sidebar (static), PageHeader
```

**Boundary rule**: A Server Component cannot import a Client Component that uses hooks. The `"use client"` directive makes a subtree a client boundary. Wrap the smallest possible subtree.

**Practical split**:

| Component | Type | Reason |
|-----------|------|--------|
| `DashboardPage` | RSC | Fetches aggregated data server-side; no interactivity |
| `DashboardWidgets` | Client | WebSocket-driven live updates |
| `IdeasListPage` | RSC | Initial list fetch server-side |
| `IdeasFilterBar` | Client | URL state via nuqs, interactive filters |
| `IdeaCard` | Client | Click handlers, optimistic update on status change |
| `PipelinePage` | Client | `@dnd-kit` requires client DOM |
| `AnalyticsPage` | RSC | Initial data fetch; chart components lazy-loaded as client |
| `ConsistencyHeatmap` | Client | Canvas / SVG rendering |
| `AppLayout` | RSC | Static shell; injects Client providers via children |
| `Sidebar` | Client | Collapsed state, active route highlight |

### 2.5 Streaming and Suspense Boundaries

Every page that fetches data defines a `loading.tsx` (automatic Suspense boundary in Next.js App Router) and explicit `<Suspense>` wrappers for independently loading sections.

```tsx
// src/app/[locale]/(app)/dashboard/page.tsx
import { Suspense } from 'react';
import { ConsistencyCardSkeleton, PipelineActivitySkeleton } from '@ordo/ui';

export default async function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <Suspense fallback={<ConsistencyCardSkeleton />}>
        <ConsistencyScoreCard />   {/* fetches /analytics/consistency */}
      </Suspense>
      <Suspense fallback={<PipelineActivitySkeleton />}>
        <RecentPipelineActivity /> {/* fetches /contents?limit=5&sort=updated */}
      </Suspense>
      <Suspense fallback={<XPProgressSkeleton />}>
        <XPProgressWidget />        {/* fetches /gamification/profile */}
      </Suspense>
    </div>
  );
}
```

Each `<Suspense>` boundary streams independently; the page shell renders immediately. This satisfies the LCP < 2.5s target because above-fold content is not blocked by slow widget fetches.

---

## 3. API Client Package (`@ordo/api-client`)

### 3.1 Package Structure

```
packages/api-client/src/
├── client.ts              # Core fetch wrapper — createApiClient()
├── errors.ts              # ApiError class + error normalizer
├── types.ts               # ApiResponse<T>, PaginatedResponse<T>
├── interceptors/
│   └── jwt-refresh.ts     # Silent token refresh interceptor
├── resources/
│   ├── auth.ts
│   ├── users.ts
│   ├── workspaces.ts
│   ├── ideas.ts
│   ├── contents.ts
│   ├── series.ts
│   ├── publishing.ts
│   ├── ai.ts
│   ├── analytics.ts
│   ├── gamification.ts
│   ├── sponsorships.ts
│   ├── billing.ts
│   ├── search.ts
│   ├── notifications.ts
│   └── uploads.ts
├── hooks/
│   ├── query-keys.ts      # Key factory
│   ├── useIdeas.ts
│   ├── useContents.ts
│   ├── useSeries.ts
│   └── ... (one file per resource)
└── index.ts               # Barrel exports
```

### 3.2 Core Fetch Wrapper

```typescript
// packages/api-client/src/client.ts
import { normalizeError } from './errors';
import { jwtRefreshInterceptor } from './interceptors/jwt-refresh';

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => string | null;
  setToken: (token: string) => void;
  onUnauthorized: () => void;
}

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    path: string,
    init: RequestInit & { schema?: ZodSchema<T> } = {}
  ): Promise<T> {
    const { schema, ...fetchInit } = init;
    const token = config.getToken();
    const headers = new Headers(fetchInit.headers);

    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${config.baseUrl}${path}`, {
      ...fetchInit,
      headers,
    });

    // JWT refresh interceptor handles 401
    if (response.status === 401) {
      const retried = await jwtRefreshInterceptor(response, { path, init, config });
      if (retried) return request<T>(path, init);
      config.onUnauthorized();
      throw normalizeError({ status: 401, message: 'Unauthorized' });
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw normalizeError({ status: response.status, ...body });
    }

    const json = await response.json();
    if (schema) return schema.parse(json); // Zod validation
    return json as T;
  }

  return {
    get: <T>(path: string, init?: RequestInit & { schema?: ZodSchema<T> }) =>
      request<T>(path, { method: 'GET', ...init }),
    post: <T>(path: string, body: unknown, init?: RequestInit & { schema?: ZodSchema<T> }) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body), ...init }),
    patch: <T>(path: string, body: unknown, init?: RequestInit & { schema?: ZodSchema<T> }) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...init }),
    delete: <T>(path: string, init?: RequestInit & { schema?: ZodSchema<T> }) =>
      request<T>(path, { method: 'DELETE', ...init }),
  };
}
```

### 3.3 JWT Refresh Interceptor

```typescript
// packages/api-client/src/interceptors/jwt-refresh.ts
let refreshPromise: Promise<string> | null = null;

export async function jwtRefreshInterceptor(
  _response: Response,
  context: { path: string; init: RequestInit; config: ApiClientConfig }
): Promise<boolean> {
  const { config } = context;

  // Deduplicate concurrent refresh calls (only one refresh in flight)
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Refresh failed');
        const { access_token } = await res.json();
        config.setToken(access_token);
        return access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  try {
    await refreshPromise;
    return true; // Signal to retry original request
  } catch {
    return false; // Signal to trigger onUnauthorized
  }
}
```

The `/api/auth/refresh` route handler in Next.js reads the `refresh_token` httpOnly cookie, calls `POST /api/v1/auth/refresh` on the backend, and sets a new cookie. The access token is returned in the response body for the client to store in memory.

### 3.4 Error Normalization

```typescript
// packages/api-client/src/errors.ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound() { return this.status === 404; }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isValidation() { return this.status === 422; }
  get isServer() { return this.status >= 500; }
}

export function normalizeError(raw: { status: number; message?: string; code?: string; details?: unknown }): ApiError {
  return new ApiError(
    raw.status,
    raw.message ?? 'An unexpected error occurred',
    raw.code,
    raw.details as Record<string, unknown>
  );
}
```

### 3.5 Zod Validation Layer

Every resource module defines Zod schemas in `@ordo/validations` and imports them:

```typescript
// packages/validations/src/ideas.ts
import { z } from 'zod';

export const IdeaSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['ACTIVE', 'VALIDATED', 'PROMOTED', 'GRAVEYARDED']),
  tags: z.array(z.string()),
  ai_score: z.number().min(0).max(100).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Idea = z.infer<typeof IdeaSchema>;

export const IdeaListSchema = z.object({
  data: z.array(IdeaSchema),
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
});
```

The API client passes schemas optionally. When passed, runtime validation catches backend contract drift immediately rather than letting malformed data silently corrupt UI state.

### 3.6 Resource Module Pattern

```typescript
// packages/api-client/src/resources/ideas.ts
import { IdeaSchema, IdeaListSchema, type Idea } from '@ordo/validations';
import type { ApiClientInstance } from '../client';

export function createIdeasResource(client: ApiClientInstance) {
  return {
    list: (workspaceId: string, params?: { page?: number; status?: string; q?: string }) =>
      client.get('/api/v1/ideas', {
        // params serialized into query string by fetch wrapper
        schema: IdeaListSchema,
      }),

    get: (id: string) =>
      client.get(`/api/v1/ideas/${id}`, { schema: IdeaSchema }),

    create: (payload: { workspace_id: string; title: string; description?: string; tags?: string[] }) =>
      client.post('/api/v1/ideas', payload, { schema: IdeaSchema }),

    update: (id: string, payload: Partial<Idea>) =>
      client.patch(`/api/v1/ideas/${id}`, payload, { schema: IdeaSchema }),

    delete: (id: string) =>
      client.delete<void>(`/api/v1/ideas/${id}`),

    promote: (id: string) =>
      client.post(`/api/v1/ideas/${id}/promote`, {}),
  };
}
```

---

## 4. State Management Architecture

### 4.1 State Ownership Matrix

| State Category | Owner | Persistence | Notes |
|---------------|-------|-------------|-------|
| Server data (ideas, contents, analytics) | TanStack Query | In-memory cache | `staleTime` per resource type |
| Auth session (user, token) | Zustand `authStore` | sessionStorage + cookie | Access token in memory; refresh token in httpOnly cookie |
| Active workspace | Zustand `workspaceStore` | localStorage | Survives page reload |
| Global UI (sidebar, modals, toasts) | Zustand `uiStore` | sessionStorage | Sidebar collapsed state persisted |
| Filter / sort / pagination | URL state (nuqs) | URL query string | Shareable, back-button safe |
| Form state | React Hook Form | Component-local | Never lifted to global |
| Editor draft (script) | Zustand `editorStore` | localStorage | Auto-save |

### 4.2 Zustand Store Topology

Three top-level stores; each is a slice with typed actions.

```typescript
// packages/stores/src/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Actions
  setUser: (user: User, token: string) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isLoading: false }),
      setToken: (accessToken) => set({ accessToken }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'ordo-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user }), // Do NOT persist accessToken
    }
  )
);
```

```typescript
// packages/stores/src/workspace.store.ts
interface WorkspaceState {
  activeWorkspaceId: string | null;
  workspaceName: string | null;
  workspaceTier: 'FREE' | 'PRO' | 'ENTERPRISE' | null;
  workspaceRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  setActiveWorkspace: (ws: { id: string; name: string; tier: string; role: string }) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      workspaceName: null,
      workspaceTier: null,
      workspaceRole: null,
      setActiveWorkspace: ({ id, name, tier, role }) =>
        set({ activeWorkspaceId: id, workspaceName: name, workspaceTier: tier as any, workspaceRole: role as any }),
      clearWorkspace: () =>
        set({ activeWorkspaceId: null, workspaceName: null, workspaceTier: null, workspaceRole: null }),
    }),
    { name: 'ordo-workspace', storage: createJSONStorage(() => localStorage) }
  )
);
```

```typescript
// packages/stores/src/ui.store.ts
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  toasts: Toast[];
  notificationPanelOpen: boolean;
  // Actions
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleNotificationPanel: () => void;
}
```

### 4.3 TanStack Query Key Factory

```typescript
// packages/api-client/src/hooks/query-keys.ts
export const queryKeys = {
  ideas: {
    all: (workspaceId: string) => ['ideas', workspaceId] as const,
    list: (workspaceId: string, filters?: Record<string, unknown>) =>
      ['ideas', workspaceId, 'list', filters] as const,
    detail: (id: string) => ['ideas', id] as const,
  },
  contents: {
    all: (workspaceId: string) => ['contents', workspaceId] as const,
    pipeline: (workspaceId: string) => ['contents', workspaceId, 'pipeline'] as const,
    detail: (id: string) => ['contents', id] as const,
  },
  analytics: {
    consistency: (workspaceId: string) => ['analytics', workspaceId, 'consistency'] as const,
    heatmap: (workspaceId: string, year: number) => ['analytics', workspaceId, 'heatmap', year] as const,
    metrics: (workspaceId: string, range: string) => ['analytics', workspaceId, 'metrics', range] as const,
  },
  gamification: {
    profile: (workspaceId: string) => ['gamification', workspaceId, 'profile'] as const,
  },
  // ... per resource
} as const;
```

**Stale time defaults by resource type**:

| Resource | `staleTime` | `gcTime` | Rationale |
|----------|------------|---------|-----------|
| Ideas list | 30s | 5m | Changes on user action; no background changes |
| Pipeline contents | 10s | 5m | Team can change; more frequent invalidation |
| Analytics/heatmap | 5m | 30m | Computed data; expensive to recalculate |
| Gamification profile | 30s | 5m | Updated by WS events; query as backup |
| Notifications | 0 | 2m | Always fresh; WS is primary delivery |

### 4.4 Optimistic Updates — Kanban Drag-and-Drop

When a user drags a content card to a new column (stage), the UI updates immediately while the PATCH request flies in the background. If the request fails, the cache is rolled back.

```typescript
// packages/api-client/src/hooks/useContents.ts (mutation portion)
export function useUpdateContentStage() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)!;
  const pipelineKey = queryKeys.contents.pipeline(workspaceId);

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      apiClient.contents.updateStage(id, stage),

    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: pipelineKey });
      const snapshot = queryClient.getQueryData(pipelineKey);

      queryClient.setQueryData(pipelineKey, (old: PipelineData) => ({
        ...old,
        columns: old.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.id === id ? { ...card, stage } : card
          ),
        })),
      }));

      return { snapshot }; // Rollback context
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(pipelineKey, context.snapshot);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKey });
    },
  });
}
```

### 4.5 WebSocket Integration with React Query

WebSocket events invalidate or directly update the query cache. The `useWebSocketEvents` hook subscribes to events and dispatches cache updates:

```typescript
// packages/hooks/src/useWebSocketEvents.ts
export function useWebSocketEvents() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const ws = WebSocketClient.getInstance(process.env.NEXT_PUBLIC_WS_URL!);

    // Gamification events — update cache directly
    ws.on('xp_earned', (payload: XPEarnedPayload) => {
      queryClient.setQueryData(
        queryKeys.gamification.profile(workspaceId!),
        (old: GamificationProfile) => ({ ...old, xp: old.xp + payload.amount })
      );
      addToast({ type: 'success', message: `+${payload.amount} XP earned!` });
    });

    // Notification event — invalidate to fetch fresh list
    ws.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] });
    });

    // Content stage changed by another team member — invalidate pipeline
    ws.on('content:stage_changed', ({ content_id }: { content_id: string }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.pipeline(workspaceId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.detail(content_id) });
    });

    // Subscription updated — invalidate workspace tier
    ws.on('subscription_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    });

    return () => {
      ws.off('xp_earned');
      ws.off('notification:new');
      ws.off('content:stage_changed');
      ws.off('subscription_updated');
    };
  }, [queryClient, workspaceId, addToast]);
}
```

---

## 5. Design System Implementation

### 5.1 OKLCH Color Token System in Tailwind CSS

CSS custom properties are defined in `packages/config/src/globals.css` and extended in the Tailwind config.

```css
/* packages/config/src/globals.css */
@layer base {
  :root {
    --background:        oklch(0.985 0.002 247.839);
    --foreground:        oklch(0.145 0.005 285.823);
    --card:              oklch(0.985 0.002 247.839);
    --card-foreground:   oklch(0.145 0.005 285.823);
    --primary:           oklch(0.68 0.18 205);
    --primary-foreground: oklch(1 0 0);
    --secondary:         oklch(0.96 0.01 205);
    --secondary-foreground: oklch(0.4 0.1 205);
    --muted:             oklch(0.96 0.01 286);
    --muted-foreground:  oklch(0.55 0.04 286);
    --accent:            oklch(0.96 0.01 286);
    --accent-foreground: oklch(0.45 0.18 286);
    --destructive:       oklch(0.65 0.22 28);
    --destructive-foreground: oklch(1 0 0);
    --border:            oklch(0.92 0.01 286);
    --input:             oklch(0.92 0.01 286);
    --ring:              oklch(0.68 0.18 205);
    --radius:            0.75rem;
  }

  .dark {
    --background:        oklch(0.12 0.02 260);
    --foreground:        oklch(0.98 0 0);
    --card:              oklch(0.15 0.025 260);
    --card-foreground:   oklch(0.98 0 0);
    --primary:           oklch(0.72 0.16 205);
    --primary-foreground: oklch(0.15 0.025 260);
    --secondary:         oklch(0.2 0.04 260);
    --secondary-foreground: oklch(0.98 0 0);
    --muted:             oklch(0.2 0.02 260);
    --muted-foreground:  oklch(0.7 0.02 260);
    --accent:            oklch(0.2 0.04 260);
    --accent-foreground: oklch(0.98 0 0);
    --destructive:       oklch(0.6 0.2 25);
    --border:            oklch(0.22 0.02 260);
    --ring:              oklch(0.72 0.16 205);
  }
}
```

```typescript
// packages/config/tailwind.config.base.ts
import type { Config } from 'tailwindcss';

export const baseConfig: Partial<Config> = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
        },
        // ... all tokens
        // Section colors (for wayfinding)
        section: {
          dashboard: '#06B6D4',
          ideas:     '#8B5CF6',
          pipeline:  '#EC4899',
          calendar:  '#3B82F6',
          analytics: '#10B981',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        shimmer:      { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        fadeInUp:     { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        confetti:     { '0%': { transform: 'scale(0) rotate(0deg)' }, '100%': { transform: 'scale(1) rotate(360deg)' } },
        progressFill: { '0%': { width: '0%' }, '100%': { width: 'var(--progress-width)' } },
      },
      animation: {
        shimmer:       'shimmer 2s ease-in-out infinite',
        'fade-in-up':  'fadeInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'progress-fill': 'progressFill 0.5s ease-out forwards',
      },
    },
  },
};
```

### 5.2 shadcn/ui Customization Layer

`packages/ui/` wraps shadcn/ui components and adds Ordo-specific customizations. shadcn/ui components are copied into the package (not imported from a library) so they can be fully modified.

```
packages/ui/src/
├── components/
│   ├── primitives/         # Thin wrappers over shadcn (Button, Input, Card...)
│   ├── composed/           # Ordo-specific compositions (IdeaCard, PipelineCard...)
│   └── layout/             # Layout components (Sidebar, PageShell, AppHeader...)
├── utils/
│   └── cn.ts               # Tailwind merge utility
└── index.ts                # Barrel
```

```typescript
// packages/ui/src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 5.3 Component Variants with CVA

```typescript
// packages/ui/src/components/primitives/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import React from 'react';

const buttonVariants = cva(
  // Base classes applied to all variants
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:     'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost:       'hover:bg-accent hover:text-accent-foreground',
        link:        'text-primary underline-offset-4 hover:underline',
        success:     'bg-green-600 text-white hover:bg-green-700',
      },
      size: {
        xs:      'h-7 px-2 text-xs',
        sm:      'h-8 px-3 text-xs',
        default: 'h-9 px-4',
        md:      'h-10 px-4',
        lg:      'h-11 px-8',
        icon:    'h-9 w-9',
        'icon-lg': 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, fullWidth, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), fullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
```

### 5.4 Dark Mode Strategy

Dark mode is controlled by the `dark` class on `<html>`. The `ThemeProvider` (wraps `next-themes`) manages the class and persists preference to localStorage.

```tsx
// apps/web/src/components/providers/ThemeProvider.tsx
'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"          // Default: dark (per design brief)
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

**Rule enforcement**: Every component in `@ordo/ui` uses only CSS variable–backed Tailwind classes (`bg-background`, `text-foreground`, etc.). Raw hex colors are never used in component files.

### 5.5 Animation System

Animations are implemented in two tiers:

**Tier 1 — CSS keyframes** (via Tailwind `animation` utilities): Simple, performant, no JS runtime. Used for: skeleton shimmer, fade-in-up transitions, progress bar fill, slide-in panels.

**Tier 2 — Framer Motion** (for complex interactions): Drag handles on kanban cards, achievement unlock confetti, level-up modal entrance, spring-based sidebar expand/collapse.

```typescript
// packages/ui/src/components/composed/AchievementUnlock.tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';

export function AchievementUnlock({ achievement, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <BadgeReveal achievement={achievement} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Reduced motion**: All Framer Motion components read the `prefers-reduced-motion` media query. CSS animations include `@media (prefers-reduced-motion: reduce)` overrides that disable or minimize motion.

---

## 6. Real-time Architecture

### 6.1 WebSocket Manager Singleton

The `WebSocketClient` class (documented in `prd/12-frontend-setup/09-realtime-ui-patterns.md`) is a singleton EventEmitter with:
- **URL**: connects directly to the Go backend WebSocket endpoint (`NEXT_PUBLIC_WS_URL`), NOT proxied through Next.js
- **Auth**: JWT token passed as `?token=` query parameter on initial connection
- **Reconnect**: exponential backoff — `initialDelayMs: 1000`, `maxDelayMs: 30000`, `backoffMultiplier: 1.5`, `maxRetries: 10`
- **Heartbeat**: ping/pong every 30s with 5s timeout; triggers reconnect on missed pong
- **Message queue**: messages sent while disconnected are queued and flushed on reconnect

**Critical deployment note**: Vercel serverless functions cannot hold WebSocket connections. The WebSocket client connects directly to the backend URL (e.g., `wss://api.ordo.app/ws`) from the browser. Next.js API routes are never used as WebSocket proxies.

### 6.2 Event Subscription Pattern

```typescript
// packages/hooks/src/useWebSocket.ts
'use client';
import { useEffect } from 'react';
import { WebSocketClient } from '@ordo/api-client';

type EventMap = {
  'xp_earned': { amount: number; reason: string; multiplier: number };
  'achievement_unlocked': { achievement_id: string; name: string; badge_url: string };
  'level_up': { new_level: number; level_name: string };
  'notification:new': { notification_id: string };
  'content:stage_changed': { content_id: string; stage: string; changed_by: string };
  'subscription_updated': { tier: string };
};

export function useWebSocketEvent<K extends keyof EventMap>(
  event: K,
  handler: (payload: EventMap[K]) => void,
  deps: unknown[] = []
) {
  useEffect(() => {
    const ws = WebSocketClient.getInstance(process.env.NEXT_PUBLIC_WS_URL!);
    ws.on(event, handler);
    return () => ws.off(event, handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

Usage:
```typescript
useWebSocketEvent('xp_earned', ({ amount, reason }) => {
  addToast({ type: 'success', message: `+${amount} XP — ${reason}` });
  queryClient.invalidateQueries({ queryKey: queryKeys.gamification.profile(workspaceId) });
});
```

### 6.3 Optimistic UI + Server Reconciliation

Pattern for all user-initiated mutations:

1. **Optimistic**: Update query cache immediately on `onMutate`
2. **In flight**: Request sent to backend
3. **Success**: `onSettled` invalidates queries (server data replaces optimistic)
4. **Error**: `onError` rolls back from snapshot; toast shown

WebSocket events from the server serve as a secondary reconciliation path: if another team member makes a change, the `content:stage_changed` event triggers cache invalidation, ensuring eventual consistency without polling.

---

## 7. Auth Flow

### 7.1 Token Storage Strategy

```
┌─ Access Token (JWT, short-lived ~15min)
│   Storage: JavaScript memory only (Zustand authStore.accessToken)
│   Rationale: Never persisted to localStorage; cleared on tab close
│   Flow: Returned in response body from /auth/login and /api/auth/refresh
│
└─ Refresh Token (long-lived ~30 days)
    Storage: httpOnly cookie (set by Next.js API route handler)
    Rationale: Inaccessible to JavaScript (XSS-proof)
    Flow: /api/auth/refresh route reads cookie, calls backend, sets new cookie
```

The Next.js API route `/api/auth/refresh` acts as a thin proxy:

```typescript
// apps/web/src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('ordo_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const backendRes = await fetch(`${process.env.API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!backendRes.ok) {
    const res = NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    res.cookies.delete('ordo_refresh_token');
    return res;
  }

  const { access_token, refresh_token: newRefreshToken } = await backendRes.json();

  const res = NextResponse.json({ access_token });
  res.cookies.set('ordo_refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
```

### 7.2 OAuth2 Redirect Handling

OAuth2 providers redirect to `/[locale]/auth/callback?code=...&state=...`.

```typescript
// apps/web/src/app/[locale]/(auth)/auth/callback/page.tsx
'use client';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error || !code) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    // Exchange code for tokens via backend
    apiClient.auth.oauthCallback({ code, state: state ?? '' })
      .then(({ access_token, refresh_token }) => {
        // Set refresh token cookie via proxy route
        return fetch('/api/auth/set-cookie', {
          method: 'POST',
          body: JSON.stringify({ refresh_token }),
        });
      })
      .then(() => router.replace('/dashboard'))
      .catch(() => router.replace('/login?error=oauth_exchange_failed'));
  }, []);

  return <FullPageSpinner />;
}
```

### 7.3 Session Refresh Middleware

`middleware.ts` runs on every request. It checks for an access token in a short-lived cookie (set server-side for SSR; the JS memory token is not available server-side). For SSR pages that need auth, the middleware validates the token and redirects to login if invalid.

```typescript
// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'en',
});

const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback'];

export async function middleware(request: NextRequest) {
  // Run i18n middleware first (adds locale to URL)
  const intlResponse = intlMiddleware(request);

  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.some((p) => pathname.includes(p));
  const hasRefreshToken = request.cookies.has('ordo_refresh_token');

  // Redirect unauthenticated users from protected routes
  if (!isPublicPath && !hasRefreshToken) {
    const locale = pathname.split('/')[1] || 'en';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isPublicPath && hasRefreshToken && !pathname.includes('/auth/callback')) {
    const locale = pathname.split('/')[1] || 'en';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 7.4 Protected Route Guards

The `(app)/layout.tsx` is the authoritative auth guard for the client side:

```tsx
// apps/web/src/app/[locale]/(app)/layout.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@ordo/stores';
import { AppSidebar, AppHeader } from '@ordo/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <AppShellSkeleton />;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
```

**Tier gate component**:

```tsx
// packages/ui/src/components/composed/TierGate.tsx
import { useWorkspaceStore } from '@ordo/stores';

const TIER_ORDER = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

interface TierGateProps {
  tier: 'PRO' | 'ENTERPRISE';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function TierGate({ tier, children, fallback }: TierGateProps) {
  const workspaceTier = useWorkspaceStore((s) => s.workspaceTier) ?? 'FREE';
  const hasAccess = TIER_ORDER[workspaceTier] >= TIER_ORDER[tier];

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : <UpgradePrompt requiredTier={tier} />;
  }
  return <>{children}</>;
}
```

---

## 8. Performance Architecture

### 8.1 Core Web Vitals Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse CI, CrUX |
| INP (Interaction to Next Paint) | < 200ms | Lighthouse CI, Web Vitals |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse CI |
| TTFB (Time to First Byte) | < 800ms | Vercel Analytics |
| Initial JS Bundle | < 200KB gzipped | next-bundle-analyzer |

### 8.2 Image Optimization

All images use `next/image`. No raw `<img>` tags in app code.

```tsx
// Correct pattern
import Image from 'next/image';

<Image
  src={user.avatar_url}
  alt={user.name}
  width={40}
  height={40}
  className="rounded-full"
  priority={isAboveFold}    // Set true for hero/header images
/>
```

**Configuration** in `next.config.ts`:
```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**.ordo.app' },          // CDN
    { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google avatars
    { protocol: 'https', hostname: 'avatars.githubusercontent.com' }, // GitHub
    { protocol: 'https', hostname: 'logo.clearbit.com' },    // Brand logos (sponsorships)
  ],
  formats: ['image/avif', 'image/webp'],
}
```

### 8.3 Code Splitting Points

Next.js App Router automatically splits at the route level. Additional splitting for heavy components:

```typescript
import dynamic from 'next/dynamic';

// Kanban board — heavy (dnd-kit + virtual)
const KanbanBoard = dynamic(
  () => import('@/components/pipeline/KanbanBoard'),
  { loading: () => <KanbanSkeleton />, ssr: false }
);

// Calendar — heavy (date computation + rendering)
const CalendarView = dynamic(
  () => import('@/components/calendar/CalendarView'),
  { loading: () => <CalendarSkeleton />, ssr: false }
);

// Chart library — Recharts is ~200KB
const AnalyticsChart = dynamic(
  () => import('@/components/analytics/AnalyticsChart'),
  { loading: () => <ChartSkeleton />, ssr: false }
);

// Script editor — Tiptap is ~150KB
const ScriptEditor = dynamic(
  () => import('@/components/studio/ScriptEditor'),
  { loading: () => <EditorSkeleton />, ssr: false }
);

// Framer Motion — only load where needed
const AchievementUnlock = dynamic(
  () => import('@ordo/ui').then(m => ({ default: m.AchievementUnlock })),
  { ssr: false }
);
```

### 8.4 Bundle Analysis Targets

Run `ANALYZE=true pnpm build` (using `@next/bundle-analyzer`) to verify:

| Bundle | Target |
|--------|--------|
| Initial JS (shared + page shell) | < 200KB gzipped |
| `@ordo/ui` (base components only) | < 50KB gzipped |
| `@ordo/api-client` | < 20KB gzipped |
| Recharts (lazy) | < 80KB gzipped |
| dnd-kit (lazy, pipeline only) | < 30KB gzipped |
| Framer Motion (lazy, selective) | < 40KB gzipped |

### 8.5 React Server Components for Data-Heavy Pages

Pages that primarily display data should be RSC where possible, fetching on the server and streaming results:

| Page | RSC/Client | Data Fetching |
|------|-----------|---------------|
| `/dashboard` | RSC shell + Client widgets | Parallel server fetches; client widgets via React Query |
| `/ideas` | RSC + Client filter bar | Server fetch for initial list; client for filter/search |
| `/pipeline` | Client | Cannot be RSC — `dnd-kit` requires DOM |
| `/analytics` | RSC shell + Client charts | Server fetch for metrics; charts lazy-loaded client |
| `/consistency` | RSC + Client heatmap | Server fetch for heatmap data; canvas rendering client |
| `/settings` | RSC shell + Client forms | Server fetch for user; form components client |

### 8.6 Font Optimization

```typescript
// apps/web/src/app/[locale]/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});
```

Font is self-hosted via `next/font`; no external network requests for fonts.

### 8.7 React Query Caching Tuning

```typescript
// apps/web/src/components/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // 30s default; overridden per query key
      gcTime: 5 * 60_000,        // 5min default garbage collection
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Disable noisy background refetch
    },
  },
});
```

---

## 9. Testing Architecture

### 9.1 Unit Test Setup

**Stack**: Jest, React Testing Library, MSW (Mock Service Worker)

```
packages/
  api-client/src/__tests__/          # API client resource tests
  stores/src/__tests__/              # Zustand store tests
  validations/src/__tests__/         # Zod schema tests
apps/
  web/src/__tests__/                 # Web-specific utility tests
  web/src/components/**/__tests__/   # Component tests (colocated)
```

**Jest configuration** (`jest.config.ts` in each package):
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '^@ordo/(.*)$': '<rootDir>/../../packages/$1/src',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**MSW handlers** mock the backend API at the network layer. All integration tests use MSW — not module mocks.

```typescript
// apps/web/src/mocks/handlers/ideas.ts
import { http, HttpResponse } from 'msw';

export const ideaHandlers = [
  http.get('/api/v1/ideas', () =>
    HttpResponse.json({ data: mockIdeas, total: 3, page: 1, per_page: 20 })
  ),
  http.post('/api/v1/ideas', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockIdea, ...body }, { status: 201 });
  }),
];
```

### 9.2 Coverage Targets

| Package | Target |
|---------|--------|
| `@ordo/api-client` | ≥ 85% (all resource modules, error paths) |
| `@ordo/validations` | ≥ 90% (all schema branches) |
| `@ordo/stores` | ≥ 85% (all actions + selectors) |
| `@ordo/ui` (components) | ≥ 70% (render + interaction) |
| `apps/web` components | ≥ 60% (critical paths) |

### 9.3 Component Test Pattern

```typescript
// apps/web/src/components/ideas/IdeaCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from './IdeaCard';
import { mockIdea } from '@/mocks/fixtures/ideas';

describe('IdeaCard', () => {
  it('renders title and tags', () => {
    render(<IdeaCard idea={mockIdea} onPromote={jest.fn()} onArchive={jest.fn()} />);
    expect(screen.getByText(mockIdea.title)).toBeInTheDocument();
    mockIdea.tags.forEach((tag) => expect(screen.getByText(tag)).toBeInTheDocument());
  });

  it('calls onPromote when promote button clicked', () => {
    const onPromote = jest.fn();
    render(<IdeaCard idea={mockIdea} onPromote={onPromote} onArchive={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /promote/i }));
    expect(onPromote).toHaveBeenCalledWith(mockIdea.id);
  });

  it('is accessible: has correct ARIA roles', () => {
    const { container } = render(<IdeaCard idea={mockIdea} onPromote={jest.fn()} onArchive={jest.fn()} />);
    expect(container.firstChild).toHaveAttribute('role', 'article');
  });
});
```

### 9.4 E2E Test Strategy (Playwright)

**Test files location**: `apps/web/e2e/`

**Test user fixtures**: Seeded test accounts in a staging database:
- `test+free@ordo.app` — Free tier
- `test+pro@ordo.app` — Pro tier
- `test+enterprise@ordo.app` — Enterprise tier

**Critical E2E paths**:

```
e2e/
├── auth/
│   ├── login-email.spec.ts          # Email + password login
│   ├── oauth-google.spec.ts         # OAuth flow (mocked provider)
│   └── logout.spec.ts
├── onboarding/
│   └── new-user-onboarding.spec.ts  # Register → workspace → dashboard
├── ideas/
│   ├── quick-capture.spec.ts        # Cmd+K → idea form → submit → appears in list
│   └── idea-lifecycle.spec.ts       # Create → validate → promote → pipeline
├── pipeline/
│   └── kanban-drag.spec.ts          # Drag card between stages → persisted
├── publishing/
│   └── schedule-post.spec.ts        # Create post → schedule → appears on calendar
└── billing/
    └── upgrade-flow.spec.ts         # Click upgrade → Stripe test checkout
```

**Playwright config**:
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile',   use: { ...devices['iPhone 14'] } },
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [['html'], ['github']],
});
```

### 9.5 Visual Regression (Optional — Phase 6)

If Chromatic is adopted: component stories are written in Storybook for `@ordo/ui` components. Chromatic captures snapshots on every PR and alerts on visual diffs. This is optional for Phase 6 — the Playwright screenshots serve as a lighter alternative.

---

## 10. CI/CD Pipeline

### 10.1 GitHub Actions Workflows

**`ci.yml`** — runs on every PR:

```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '9' }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

  test:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '9' }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: '**/coverage/**'

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '9' }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=web
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.STAGING_API_URL }}
          NEXT_PUBLIC_WS_URL: ${{ vars.STAGING_WS_URL }}
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

**`e2e.yml`** — runs nightly against staging:

```yaml
name: E2E Tests
on:
  schedule:
    - cron: '0 2 * * *'    # 2am UTC nightly
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '9' }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm turbo test:e2e --filter=web
        env:
          E2E_BASE_URL: ${{ vars.STAGING_URL }}
          E2E_TEST_USER_FREE: ${{ secrets.E2E_TEST_USER_FREE }}
          E2E_TEST_USER_PRO: ${{ secrets.E2E_TEST_USER_PRO }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```

**`deploy-staging.yml`** — on merge to `develop`:

```yaml
name: Deploy Staging
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/web
```

**`deploy-production.yml`** — on merge to `main` with manual approval:

```yaml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  approval:
    runs-on: ubuntu-latest
    environment: production    # Requires manual approval in GitHub Environments
    steps:
      - run: echo "Approved for production deploy"

  deploy:
    needs: approval
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: apps/web
```

### 10.2 Vercel Deployment

- **Preview deployments**: Every PR gets an automatic Vercel preview URL (Vercel's native GitHub integration handles this without the workflow above).
- **Staging**: `develop` branch → `staging.ordo.app`
- **Production**: `main` branch → `ordo.app` (manual approval gate)

### 10.3 Environment Variable Management

| Variable | Scope | Storage |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | Client + Server | Vercel env vars (per environment) |
| `NEXT_PUBLIC_WS_URL` | Client only | Vercel env vars |
| `API_URL` | Server only (API route proxy) | Vercel env vars (not NEXT_PUBLIC) |
| `NEXTAUTH_SECRET` / `JWT_SECRET` | Server only | Vercel env vars |
| Stripe keys | Server only | Vercel env vars |
| Sentry DSN | Client + Server | Vercel env vars |

Local development uses `.env.local` (gitignored). `.env.example` documents all required variables without values.

---

## Design Decisions Record

### DDR-1: Fetch over Axios for API Client

**Decision**: Use native `fetch` API (not Axios) as the base of `@ordo/api-client`.

**Reasoning**:
- Next.js 15 extends `fetch` with built-in caching, deduplication, and revalidation — these are lost when using Axios.
- RSC data fetching uses extended `fetch`; using the same base in the client-side package keeps the mental model consistent.
- Axios adds ~14KB gzipped to the bundle; native fetch is zero-cost.

**Trade-off**: Axios has better request cancellation ergonomics. Mitigation: use `AbortController` explicitly where needed.

### DDR-2: WebSocket Direct to Backend (No Next.js Proxy)

**Decision**: The WebSocket client connects directly to `NEXT_PUBLIC_WS_URL` (the Go backend), bypassing Next.js entirely.

**Reasoning**: Vercel serverless functions have a 250ms cold start and no persistent connection support. Proxying WebSocket through Next.js would break the real-time guarantee.

**Trade-off**: CORS must be configured on the backend to allow the frontend origin. The backend WebSocket URL is exposed to clients (acceptable — it is authenticated via JWT).

### DDR-3: No Global Layout Wrapper for Tier Gating

**Decision**: Tier gating is applied at the component level via `<TierGate>`, not at the route/layout level.

**Reasoning**: Gating at the route level would show a blank page to free users navigating to `/analytics`. The correct UX is to show the page with a visible upgrade prompt. `<TierGate>` wraps specific features within pages, not entire pages.

**Exception**: Certain pages (e.g., Enterprise-only admin pages) may use middleware-level redirect if the feature has no meaningful fallback UI.

### DDR-4: nuqs for URL State (Not Native URLSearchParams)

**Decision**: Use `nuqs` for filter/pagination state in the URL instead of manually managing `URLSearchParams`.

**Reasoning**: `nuqs` provides type-safe URL state with schema parsing (similar to Zod), and integrates with Next.js App Router without causing unnecessary re-renders. Filter state is automatically serialized to the URL (shareable links) and deserialized on page load (back button safe).

### DDR-5: Turborepo Remote Cache via Vercel

**Decision**: Enable Vercel's Turborepo remote cache for CI.

**Reasoning**: With 8 packages and a monorepo build, Turborepo's remote cache is the primary mechanism for keeping the CI pipeline under 10 minutes. Cache hits skip compilation entirely for unchanged packages. Setup requires only `TURBO_TOKEN` and `TURBO_TEAM` secrets.

---

## Risk Mitigations (Design-Level)

| Risk | Design Mitigation |
|------|-----------------|
| R1 — Monorepo complexity | Packages scaffolded incrementally; `transpilePackages` in Next.js avoids build step for internal packages |
| R2 — API contract drift | Zod schemas on every API response; CI integration test against real backend |
| R3 — Kanban performance | `@tanstack/virtual` for column virtualization; initial column fetch capped at 50 cards |
| R4 — WebSocket in serverless | Direct backend connection; no Next.js proxy; exponential backoff reconnect |
| R5 — Stripe complexity | Stripe integration isolated to `/settings/billing`; Stripe test mode in staging |
| R6 — i18n gaps | TypeScript-strict `useTranslations()` types; CI check for missing keys |
| R7 — Tier gate consistency | Single `<TierGate>` component + `useTier()` hook; no inline tier checks; Phase 5 QA audit |

---

*This design provides the technical blueprint for implementing the 6-phase frontend roadmap. All architectural decisions here are grounded in the constraints documented in the proposal and the patterns established in the PRD.*
