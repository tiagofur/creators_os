# Functional Specification: Frontend Web Roadmap
## Ordo Creator OS — Next.js Web Application

**Change name**: `frontend-web-roadmap`
**Author**: sdd-spec
**Date**: 2026-03-10
**Status**: COMPLETE
**Depends on**: `proposal.md`

---

## Document Conventions

- **FR-{N}**: Functional Requirement
- **AC-{N}**: Acceptance Criterion (Given/When/Then)
- **RQ**: React Query key
- **ZS**: Zustand store slice
- All API paths are relative to base URL `{API_BASE}/v1`
- All Zod schemas use `z` imported from `"zod"`
- All TypeScript interfaces use `interface` keyword (not `type`)
- Tier levels: `free < pro < enterprise`

---

## Global Constraints (apply to all phases)

- **No raw fetch**: All backend calls go through `@ordo/api-client`. No inline `fetch()` or `axios()` in app code.
- **No transparencies or gradients**: Design system hard rule.
- **Dark mode mandatory**: Every component ships with `dark:` variants.
- **i18n mandatory**: Every string uses `useTranslations()` from `next-intl`. No hardcoded English.
- **Responsive mandatory**: All layouts tested at 320px, 768px, 1024px, 1280px, 1440px, 2560px.
- **Tier gates**: All gated features use `<TierGate tier="pro">` wrapper or `useTier()` hook. Never inline.
- **Accessibility baseline**: WCAG 2.1 AA. All interactive elements keyboard-reachable. `aria-label` on icon-only buttons.
- **Error boundary**: Every page-level component is wrapped in a React error boundary.
- **Skeleton loading**: Every data-fetching component renders a skeleton while loading.
- **Empty states**: Every list/grid renders an illustrated empty state when no data exists.

---

## Phase 1: Foundation — Monorepo, Design System, Auth

### 1.1 Turborepo Monorepo

**FR-1.1.1**: The repository root must be configured as a Turborepo workspace with `pnpm` as the package manager.

**FR-1.1.2**: The following packages must be scaffolded under `packages/`:

| Package | Purpose |
|---------|---------|
| `@ordo/config` | Shared ESLint, TypeScript, Tailwind base configs |
| `@ordo/types` | Shared TypeScript interfaces mirroring API response shapes |
| `@ordo/validations` | Zod schemas for all API request/response payloads |
| `@ordo/i18n` | `next-intl` message files (en/es/pt) and locale utilities |
| `@ordo/ui` | shadcn/ui components + Ordo custom design system components |
| `@ordo/hooks` | Shared React hooks (non-store-dependent) |
| `@ordo/stores` | Zustand store definitions |
| `@ordo/api-client` | HTTP client, resource modules, React Query hooks |
| `@ordo/core` | Domain entities, use-case logic, pure functions |

**FR-1.1.3**: `turbo.json` must define pipelines: `build`, `dev`, `test`, `lint`, `type-check`. `dev` pipeline runs all packages in watch mode from repo root with `pnpm dev`.

**AC-1.1.A**:
- Given: developer clones repo and runs `pnpm install && pnpm dev` from root
- When: all packages initialize
- Then: `apps/web` is accessible at `http://localhost:3000`, no TypeScript errors, no lint errors

---

### 1.2 Design System

**FR-1.2.1**: CSS custom properties for the full OKLCH color token set must be defined in `apps/web/src/app/globals.css`, with both `:root` (light) and `.dark` (dark mode) variants.

**Color token categories**:
- `--color-background`, `--color-foreground`
- `--color-primary`, `--color-primary-foreground`
- `--color-secondary`, `--color-secondary-foreground`
- `--color-muted`, `--color-muted-foreground`
- `--color-accent`, `--color-accent-foreground`
- `--color-destructive`, `--color-destructive-foreground`
- `--color-border`, `--color-ring`, `--color-input`
- Section colors: `--color-ideas` (cyan), `--color-pipeline` (violet), `--color-studio` (pink), `--color-publishing` (orange), `--color-analytics` (blue), `--color-sponsorships` (green)

**FR-1.2.2**: `packages/ui` must export the following component groups:

**Layout components**:

```typescript
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  workspaceName: string;
  userAvatar?: string;
  activeRoute: string;
  tier: 'free' | 'pro' | 'enterprise';
}

interface HeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}
```

**Form components**:

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
}

interface SelectProps {
  label?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}
```

**Feedback components**:

```typescript
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  children: React.ReactNode;
}

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}
```

**Data display components**:

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  accentColor?: string;
}

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button';
}
```

**Navigation components**:

```typescript
interface TabsProps {
  tabs: Array<{ id: string; label: string; icon?: React.ReactNode; count?: number }>;
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  mode: 'capture' | 'search';
  onModeChange: (mode: 'capture' | 'search') => void;
}
```

**FR-1.2.3**: `TierGate` component:

```typescript
interface TierGateProps {
  tier: 'pro' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  featureName?: string;
}
```

Behavior: renders `children` if `workspaceStore.tier >= required tier`, else renders `fallback` or default upgrade prompt card.

**AC-1.2.A**:
- Given: user switches system preference to dark mode
- When: any page renders
- Then: all CSS custom properties resolve to dark token values; no OKLCH parsing errors; no pure white/black elements that violate the design system

**AC-1.2.B**:
- Given: `<TierGate tier="pro">` wraps a feature
- When: a free-tier user views that page
- Then: the upgrade prompt renders with feature name and CTA; the gated content is not rendered

---

### 1.3 API Client Package

**FR-1.3.1**: `packages/api-client/src/client.ts` must export a configured HTTP client with:
- Base URL from `NEXT_PUBLIC_API_URL` environment variable
- Default headers: `Content-Type: application/json`, `X-Workspace-ID` (injected from active workspace)
- Request interceptor: injects `Authorization: Bearer {accessToken}` from `authStore`
- Response interceptor: on 401, calls `authStore.refreshAccessToken()`, retries original request once; on second 401, calls `authStore.logout()` and redirects to `/login`
- Error normalization: all non-2xx responses are thrown as `ApiError` instances

**`ApiError` class**:

```typescript
interface ApiErrorDetail {
  field?: string;
  message: string;
  code: string;
}

class ApiError extends Error {
  code: string;
  status: number;
  requestId: string;
  details: ApiErrorDetail[];
  timestamp: string;
}
```

**FR-1.3.2**: Zod schemas in `packages/validations/src/` for all request/response shapes:

```typescript
// Auth schemas
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/),
  name: z.string().min(2).max(255),
  timezone: z.string(),
  locale: z.enum(['en', 'es', 'pt']),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  tokens: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number(),
  }),
});

// Idea schemas
export const IdeaSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['captured', 'validated', 'transformed', 'archived', 'graveyard']),
  tags: z.array(z.string()),
  validation_score: z.number().nullable(),
  effort_rating: z.number().min(1).max(5).nullable(),
  impact_rating: z.number().min(1).max(5).nullable(),
  created_by: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateIdeaRequestSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  source: z.enum(['manual', 'telegram', 'web', 'slack']).default('manual'),
});

// Content schemas
export const ContentStageSchema = z.enum([
  'scripting', 'filming', 'editing', 'review', 'scheduled', 'published'
]);

export const ContentTypeSchema = z.enum([
  'video', 'short', 'post', 'tweet', 'thread', 'podcast', 'newsletter', 'carousel'
]);

export const ContentSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  title: z.string(),
  type: ContentTypeSchema,
  stage: ContentStageSchema,
  description: z.string().nullable(),
  tags: z.array(z.string()),
  series_id: z.string().nullable(),
  assignee_id: z.string().nullable(),
  due_date: z.string().datetime().nullable(),
  script: z.string().nullable(),
  created_by: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: PaginationSchema,
  });
```

**FR-1.3.3**: Resource modules in `packages/api-client/src/resources/`:

Each module exports functions returning typed promises:

```typescript
// ideas.ts
export const ideasApi = {
  list: (workspaceId: string, params?: ListIdeasParams) =>
    client.get<PaginatedResponse<Idea>>(`/workspaces/${workspaceId}/ideas`, { params }),
  get: (workspaceId: string, ideaId: string) =>
    client.get<Idea>(`/workspaces/${workspaceId}/ideas/${ideaId}`),
  create: (workspaceId: string, data: CreateIdeaRequest) =>
    client.post<Idea>(`/workspaces/${workspaceId}/ideas`, data),
  update: (workspaceId: string, ideaId: string, data: UpdateIdeaRequest) =>
    client.patch<Idea>(`/workspaces/${workspaceId}/ideas/${ideaId}`, data),
  delete: (workspaceId: string, ideaId: string) =>
    client.delete(`/workspaces/${workspaceId}/ideas/${ideaId}`),
  promote: (workspaceId: string, ideaId: string) =>
    client.post<Content>(`/workspaces/${workspaceId}/ideas/${ideaId}/promote`),
};
```

**FR-1.3.4**: React Query hooks in `packages/api-client/src/hooks/`:

Query key factory pattern:

```typescript
export const queryKeys = {
  ideas: {
    all: (workspaceId: string) => ['ideas', workspaceId] as const,
    list: (workspaceId: string, filters?: ListIdeasParams) =>
      ['ideas', workspaceId, 'list', filters] as const,
    detail: (workspaceId: string, ideaId: string) =>
      ['ideas', workspaceId, 'detail', ideaId] as const,
  },
  contents: {
    all: (workspaceId: string) => ['contents', workspaceId] as const,
    pipeline: (workspaceId: string, filters?: PipelineFilters) =>
      ['contents', workspaceId, 'pipeline', filters] as const,
    detail: (workspaceId: string, contentId: string) =>
      ['contents', workspaceId, 'detail', contentId] as const,
  },
  // ... per resource
};

export const useIdeas = (workspaceId: string, filters?: ListIdeasParams) =>
  useQuery({
    queryKey: queryKeys.ideas.list(workspaceId, filters),
    queryFn: () => ideasApi.list(workspaceId, filters),
    staleTime: 30_000,
  });

export const useCreateIdea = (workspaceId: string) =>
  useMutation({
    mutationFn: (data: CreateIdeaRequest) => ideasApi.create(workspaceId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all(workspaceId) }),
  });
```

**FR-1.3.5**: WebSocket client in `packages/api-client/src/ws/client.ts`:

```typescript
interface WebSocketClientOptions {
  url: string;
  token: string;
  workspaceId: string;
  onReconnect?: () => void;
  maxRetries?: number;
}

interface WebSocketClient {
  connect(): void;
  disconnect(): void;
  subscribe<T>(event: string, handler: (data: T) => void): () => void;
  isConnected(): boolean;
}
```

- Connects directly to backend WS URL (not proxied through Next.js)
- Implements exponential backoff reconnection: `delay = Math.min(1000 * 2^attempt, 30000)`
- Max 5 retry attempts before giving up
- Emits typed events matching backend WebSocket events

**AC-1.3.A**:
- Given: access token expires during an active session
- When: any API call returns 401
- Then: client silently calls `POST /auth/refresh`, retries original request, user sees no interruption

**AC-1.3.B**:
- Given: refresh token is expired
- When: silent refresh fails with 401
- Then: `authStore.logout()` is called, user is redirected to `/{locale}/login`, all in-flight requests are cancelled

---

### 1.4 Next.js Web App Scaffold

**FR-1.4.1**: `apps/web/` directory structure:

```
apps/web/src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── auth/callback/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx          # AppLayout with sidebar + header
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── ideas/page.tsx
│   │   │   ├── graveyard/page.tsx
│   │   │   ├── pipeline/page.tsx
│   │   │   ├── series/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── publishing/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── ai-chat/page.tsx
│   │   │   ├── remix/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── consistency/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── gamification/page.tsx
│   │   │   ├── sponsorships/page.tsx
│   │   │   ├── inbox/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       ├── billing/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       ├── integrations/page.tsx
│   │   │       └── notifications/page.tsx
│   │   └── (public)/
│   │       └── layout.tsx
│   └── layout.tsx                  # Root layout: providers only
├── components/
│   ├── providers/
│   │   ├── QueryProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── AuthProvider.tsx
│   │   └── WorkspaceProvider.tsx
│   └── [feature-specific containers]
├── middleware.ts
└── i18n.ts
```

**FR-1.4.2**: `middleware.ts` responsibilities:
1. Locale detection: reads `Accept-Language`, matches to `['en', 'es', 'pt']`, defaults to `en`
2. Auth guard: if route is under `(app)` and no valid session cookie present, redirect to `/{locale}/login?redirect={originalPath}`
3. Onboarding gate: if authenticated user has `onboarding_completed: false`, redirect to `/{locale}/onboarding`

**FR-1.4.3**: Global providers wrapped in `app/layout.tsx` (root layout):

```typescript
// Render order (outer → inner):
// QueryClientProvider → ThemeProvider → AuthProvider → WorkspaceProvider → {children}
```

**AC-1.4.A**:
- Given: unauthenticated user navigates to `/{locale}/dashboard`
- When: middleware evaluates the request
- Then: user is redirected to `/{locale}/login?redirect=/dashboard`; after login, user is forwarded to `/dashboard`

**AC-1.4.B**:
- Given: user navigates to `/{locale}/ideas`
- When: locale in URL is `es`
- Then: all UI strings render in Spanish via `next-intl`; no English fallback strings visible

---

### 1.5 Authentication Flows

#### 1.5.1 Registration

**FR-1.5.1**: `/[locale]/register` page renders a form with fields: full name, email, password, confirm password.

**Zod validation** (client-side, using React Hook Form + zodResolver):

```typescript
export const RegisterFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Enter a valid email address'),
  password: z.string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/\d/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

**API**: `POST /auth/register`

**On success**: store tokens in `authStore`, redirect to `/{locale}/onboarding`

**On 409 conflict**: display field error "An account with this email already exists"

**FR-1.5.2**: OAuth buttons for Google, GitHub, Slack. Clicking initiates redirect to `GET /auth/oauth/{provider}/authorize?redirect_uri=...&state={csrfToken}`.

**AC-1.5.A**:
- Given: user submits registration with valid data
- When: `POST /auth/register` succeeds
- Then: tokens stored in `authStore` (access token in memory, refresh token in httpOnly cookie), user redirected to onboarding

**AC-1.5.B**:
- Given: user submits registration with password `"short"`
- When: form validates
- Then: inline error messages appear for each unsatisfied constraint before any API call is made

#### 1.5.2 Login

**FR-1.5.3**: `/[locale]/login` page with email/password form and "Forgot password?" link.

**Zod validation**:
```typescript
export const LoginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
```

**API**: `POST /auth/login`

**On success**: store tokens, redirect to `/{locale}/dashboard` (or `redirect` query param if present)

**On 401**: display "Incorrect email or password" without indicating which is wrong.

#### 1.5.3 Password Reset

**FR-1.5.4**: `/[locale]/forgot-password` — email input, submits `POST /auth/forgot-password`. Always shows success message regardless of whether email exists (security: no user enumeration).

**FR-1.5.5**: `/[locale]/reset-password?token={token}` — new password + confirm password fields. Submits `POST /auth/reset-password`. On success, redirect to login with toast "Password updated. Please log in."

#### 1.5.4 Auth Store

**ZS: `authStore`** in `packages/stores/src/auth.ts`:

```typescript
interface AuthStore {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  login(email: string, password: string): Promise<void>;
  loginWithOAuth(provider: 'google' | 'github' | 'slack'): void;
  logout(): Promise<void>;
  refreshAccessToken(): Promise<string>;
  setUser(user: User): void;
  checkAuth(): Promise<void>;
  clearError(): void;

  // Token management (internal — not persisted to localStorage)
  _accessToken: string | null;
  _setAccessToken(token: string): void;
}
```

Persistence: `refreshToken` stored in httpOnly cookie (set by backend). `accessToken` kept in memory only (Zustand state, not persisted). `user` persisted to `localStorage` via Zustand `persist` middleware (for display while refresh is in progress).

**AC-1.5.C**:
- Given: user logs in successfully
- When: 13 minutes pass (access token near expiry)
- Then: a background `setInterval` fires at 12-minute mark, calls `POST /auth/refresh`, new access token is stored in memory; user experiences no interruption

---

### 1.6 Workspace Bootstrap

**FR-1.6.1**: Post-registration flow redirects to `/[locale]/onboarding` if `user.onboarding_completed === false`.

**Onboarding wizard — 3 steps**:

**Step 1 — Workspace creation**:

```typescript
interface WorkspaceCreationFormSchema {
  name: z.string().min(3).max(100);
  timezone: z.string(); // IANA timezone, defaults to browser timezone
}
```

API: `POST /workspaces`

**Step 2 — Content preferences**:
- Primary content type (single select): Video, Short-form, Podcast, Newsletter, Social Posts
- Publishing goal (single select): Daily, 2-3x/week, Weekly, Bi-weekly
- Secondary platforms (multi-select): YouTube, TikTok, Instagram, Twitter/X, LinkedIn, Podcast

Stored via `PATCH /workspaces/{workspace_id}` with settings payload.

**Step 3 — Optional idea import**:
- Text area: "Paste up to 5 ideas, one per line"
- On submit: batch `POST /workspaces/{id}/ideas` (one request per idea)
- Skip button available

On wizard completion: `PATCH /users/{user_id}` sets `onboarding_completed: true`, redirect to `/{locale}/dashboard`.

**FR-1.6.2**: Workspace switcher in `Header` component:

```typescript
interface WorkspaceSwitcherProps {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string;
  onSwitch: (workspaceId: string) => void;
  onCreateNew: () => void;
  tier: 'free' | 'pro' | 'enterprise';
}
```

Free tier: max 1 workspace. "Create new workspace" option is gated behind `<TierGate tier="pro">`.

**ZS: `workspaceStore`** in `packages/stores/src/workspace.ts`:

```typescript
interface WorkspaceStore {
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  workspaces: WorkspaceSummary[];
  role: 'owner' | 'admin' | 'editor' | 'viewer' | null;
  tier: 'free' | 'pro' | 'enterprise';

  setActiveWorkspace(workspace: Workspace): void;
  switchWorkspace(workspaceId: string): Promise<void>;
  refreshWorkspace(): Promise<void>;
}
```

**AC-1.6.A**:
- Given: new user completes onboarding wizard
- When: step 3 (ideas) is submitted
- Then: each idea is created via API, `workspaceStore.activeWorkspaceId` is set, user lands on dashboard with `onboarding_completed: true`

---

## Phase 2: Core Creator Experience

### 2.1 Dashboard

**FR-2.1.1**: `/[locale]/dashboard` is the default landing page after login. It renders the following widgets:

| Widget | Data Source | Tier Gate |
|--------|------------|-----------|
| Consistency Score card | `GET /workspaces/{id}/analytics/consistency` | None |
| Active streak counter | Included in consistency response | None |
| Recent pipeline activity | `GET /workspaces/{id}/contents?limit=5&sort=updated_at` | None |
| Quick Capture button | Local (opens command palette) | None |
| Upcoming scheduled content | `GET /workspaces/{id}/publishing/posts?status=scheduled&limit=3` | None |
| XP progress bar + level | `GET /workspaces/{id}/gamification/profile` | None |
| Ideas this week | `GET /workspaces/{id}/ideas?since=7d&count=true` | None |

**Widget component interface**:

```typescript
interface DashboardWidgetProps {
  title: string;
  isLoading: boolean;
  error?: string;
  children: React.ReactNode;
  action?: { label: string; href: string };
  className?: string;
}

interface ConsistencyScoreWidgetProps {
  score: number;        // 0-100
  streakDays: number;
  streakMultiplier: number;
  trend: 'up' | 'down' | 'stable';
  isLoading: boolean;
}

interface XPProgressWidgetProps {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  recentXP: number;
  isLoading: boolean;
}
```

**RQ keys**:
- `['dashboard', workspaceId, 'consistency']`
- `['dashboard', workspaceId, 'recentActivity']`
- `['dashboard', workspaceId, 'upcomingContent']`
- `['dashboard', workspaceId, 'gamification']`

**AC-2.1.A**:
- Given: user navigates to dashboard
- When: data is loading
- Then: every widget renders a skeleton of the same dimensions as the loaded content; no layout shift occurs

**AC-2.1.B**:
- Given: dashboard is fully loaded
- When: user clicks "Quick Capture" button
- Then: command palette opens in capture mode with focus on the idea input field

---

### 2.2 Ideas — Capture & Management

#### 2.2.1 Ideas List

**FR-2.2.1**: `/[locale]/ideas` renders all workspace ideas with:
- Filter bar (sticky): status, tags (multi-select), date range, search text
- View toggle: grid / list (persisted in `localStorage`)
- Sort controls: newest, impact score, effort score, alphabetical
- Pagination (25 per page)

**URL state** (via `nuqs`):

```typescript
const [filters, setFilters] = useQueryStates({
  status: parseAsStringEnum(['captured', 'validated', 'transformed', 'archived']),
  tags: parseAsArrayOf(parseAsString),
  search: parseAsString,
  sort: parseAsStringEnum(['created_at', 'impact_rating', 'effort_rating', 'title']).withDefault('created_at'),
  order: parseAsStringEnum(['asc', 'desc']).withDefault('desc'),
  page: parseAsInteger.withDefault(1),
});
```

**RQ**: `['ideas', workspaceId, 'list', filters]` — `staleTime: 30_000`

**API**: `GET /workspaces/{id}/ideas?{params}`

**FR-2.2.2**: Idea card component:

```typescript
interface IdeaCardProps {
  idea: Idea;
  viewMode: 'grid' | 'list';
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPromote: (id: string) => void;
  onGraveyard: (id: string) => void;
  onAIExpand: (id: string) => void;
}
```

Card displays: title, tags (colored chips), status badge, validation score (if set), relative timestamp ("3 hours ago"), kebab menu with actions.

**Free tier gate**: Display counter "X/50 ideas this month". At 45/50: yellow warning banner. At 50/50: new capture is blocked with upgrade prompt modal.

**AC-2.2.A**:
- Given: ideas list has > 25 items
- When: user scrolls to bottom or clicks page control
- Then: next page of ideas loads; URL updates with `?page=2`; browser back navigation returns to page 1

#### 2.2.2 Quick Capture

**FR-2.2.3**: Global `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) opens command palette. Default mode is `capture`.

Command palette `capture` mode:
- Single text input (auto-focused): idea title
- Expandable secondary field: description (visible after typing title and pressing Tab/Enter)
- Tags input: comma-separated or tag chips
- Submit: `Enter` or "Capture" button
- Keyboard: `Esc` closes; `Tab` cycles fields

**API**: `POST /workspaces/{id}/ideas` with `source: "manual"`

**Optimistic update**: idea appears in list immediately with `status: "captured"` and a temporary ID; replaced with real ID on API success; removed on API failure with error toast.

**AC-2.2.B**:
- Given: user presses `Cmd+K` from any page
- When: command palette opens
- Then: focus is on the idea title input; user can type title, press Enter, and the idea is captured; the palette closes; a success toast appears: "Idea captured"

**AC-2.2.C**:
- Given: network is unavailable when user submits idea
- When: `POST /workspaces/{id}/ideas` fails
- Then: optimistic update is reverted; error toast "Failed to save idea. Try again."; idea input is not cleared so user can retry

#### 2.2.3 Idea Detail Drawer

**FR-2.2.4**: Clicking an idea card opens a side drawer (slides in from right, 480px wide on desktop, full-screen on mobile).

```typescript
interface IdeaDrawerProps {
  ideaId: string;
  open: boolean;
  onClose: () => void;
  onPromote: (id: string) => void;
}
```

Drawer sections:
1. **Header**: editable title (inline), status badge, close button
2. **Description**: editable rich text (simple — no block editor needed, plain textarea with markdown preview)
3. **Tags**: editable tag chips
4. **Validation Board**: two sliders — Impact (1–5) and Effort (1–5); quadrant label updates live ("High Impact, Low Effort → Do It Now")
5. **AI Actions**: "Expand Idea" button → calls `POST /workspaces/{id}/ai/brainstorm` with idea title as prompt; "Validate Idea" button → calls `POST /workspaces/{id}/ai/validate` with idea
6. **Status flow stepper**: visual status timeline with click-to-advance
7. **Footer actions**: "Promote to Content" button, "Move to Graveyard" button

**API for AI Expand**:
- `POST /workspaces/{id}/ai/brainstorm` request: `{ topic: idea.title, count: 5 }`
- Response: array of `{ title: string; description: string; platform_suggestions: string[] }`
- Display as 5 expandable cards in an inline panel

**API for AI Validate**:
- `POST /workspaces/{id}/ai/validate` request: `{ idea_id: string }`
- Response: `{ score: number; critique: string; strengths: string[]; weaknesses: string[] }`

**AC-2.2.D**:
- Given: user clicks "Promote to Content" in idea drawer
- When: `POST /workspaces/{id}/ideas/{id}/promote` succeeds
- Then: idea status changes to "transformed"; a new content card appears in the pipeline at "scripting" stage; user sees a toast "Added to pipeline" with a "View in Pipeline" link

#### 2.2.4 Idea Graveyard

**FR-2.2.5**: `/[locale]/graveyard` — filtered ideas list showing only `status: "graveyard"` ideas. Cards have a "Restore" action that calls `PATCH /workspaces/{id}/ideas/{id}` with `{ status: "captured" }`.

**AC-2.2.E**:
- Given: graveyard has no ideas
- When: page renders
- Then: illustrated empty state with copy "No ideas here — your graveyard is empty" and a button "Capture your first idea"

---

### 2.3 Content Pipeline — Kanban

**FR-2.3.1**: `/[locale]/pipeline` renders a horizontal kanban board with 6 columns:

| Column | Stage Value | Accent Color |
|--------|------------|--------------|
| Scripting | `scripting` | violet |
| Filming | `filming` | orange |
| Editing | `editing` | yellow |
| Review | `review` | blue |
| Scheduled | `scheduled` | cyan |
| Published | `published` | green |

Each column shows: column header with count badge, scrollable card list (max-height: `calc(100vh - 200px)`), "Add content" button at bottom.

**FR-2.3.2**: Kanban uses `@dnd-kit/core` for drag-and-drop.

Drag behavior:
- Drag handle on each card (grip icon, visible on hover)
- Dragging shows ghost card at 50% opacity
- Drop target column highlights with accent color
- On drop: optimistic update (card moves immediately in UI); `PATCH /workspaces/{id}/contents/{id}/stage` called with `{ stage: newStage }`
- On error: card reverts to original column; error toast shown

**Virtualization**: columns with > 20 cards use `@tanstack/virtual` for list virtualization (prevents DOM bloat).

**FR-2.3.3**: Content card component:

```typescript
interface PipelineCardProps {
  content: ContentSummary;
  isDragging?: boolean;
  onOpen: (id: string) => void;
  onQuickStageChange: (id: string, stage: ContentStage) => void;
  onDelete: (id: string) => void;
}

interface ContentSummary {
  id: string;
  title: string;
  type: ContentType;
  stage: ContentStage;
  assignee?: { id: string; name: string; avatar?: string };
  dueDate?: string;
  seriesId?: string;
  seriesName?: string;
  tags: string[];
}
```

Card displays: content type icon (SVG per type), title (truncated at 2 lines), assignee avatar (if assigned), due date (red if overdue), series badge (if in a series).

**FR-2.3.4**: Filter bar (sticky at top of pipeline):
- Content type filter (multi-select chips)
- Assignee filter (avatar multi-select)
- Series filter (dropdown)
- Due date range picker

URL state (via `nuqs`):
```typescript
const [filters, setFilters] = useQueryStates({
  types: parseAsArrayOf(parseAsString),
  assignees: parseAsArrayOf(parseAsString),
  series_id: parseAsString,
  due_before: parseAsString,
  due_after: parseAsString,
});
```

**RQ**: `['contents', workspaceId, 'pipeline', filters]` — `staleTime: 30_000`

**API**: `GET /workspaces/{id}/contents?{params}` — returns all non-archived contents; client groups by stage.

**FR-2.3.5**: Multi-select mode: holding `Shift` and clicking cards enters multi-select mode. Selected cards show checkbox. Bulk action toolbar appears at bottom with: "Move to stage" dropdown, "Archive" button.

**AC-2.3.A**:
- Given: user drags a card from "Scripting" to "Filming"
- When: card is dropped
- Then: card appears in "Filming" column immediately; `PATCH .../stage` is called; Scripting count decrements; Filming count increments; undo toast appears for 5 seconds

**AC-2.3.B**:
- Given: API call to move stage fails
- When: server returns 5xx
- Then: card reverts to original column; "Failed to move content" error toast appears; no data is inconsistent

#### 2.3.1 Content Detail Panel

**FR-2.3.6**: Clicking a pipeline card opens a full detail drawer (640px wide on desktop):

```typescript
interface ContentDrawerProps {
  contentId: string;
  open: boolean;
  onClose: () => void;
  onStageChange: (id: string, stage: ContentStage) => void;
}
```

Sections:
1. **Metadata tab**: title (editable inline), type (select), description (textarea), tags, assignee (user selector from workspace members), due date (date picker), series link (searchable dropdown)
2. **Script tab**: block-based script editor (see Phase 3, Script Doctor) — placeholder in Phase 2 (plain textarea suffices)
3. **Checklist tab**: smart checklist from `GET /workspaces/{id}/contents/{id}/checklist`; each item is a checkbox; completion persisted via `PATCH /workspaces/{id}/contents/{id}/checklist/{item_id}`
4. **Time tracker tab**: start/stop timer (stopwatch UI); total time display; session history list; calls `POST /workspaces/{id}/contents/{id}/time-sessions`
5. **Assets tab**: file list; upload button triggers presigned URL flow; calls `POST /uploads/presigned` then direct S3 PUT
6. **Stage stepper**: horizontal timeline with clickable stages

**AC-2.3.C**:
- Given: content is in "Filming" stage
- When: user opens content drawer and views Checklist tab
- Then: AI-generated filming checklist items appear (e.g., "B-roll shots list", "Screen recording setup"); each is checkable; completion state persists on page reload

---

### 2.4 Series Management

**FR-2.4.1**: `/[locale]/series` — grid of series cards (3 columns on desktop, 1 on mobile).

```typescript
interface SeriesCardProps {
  series: SeriesSummary;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
}

interface SeriesSummary {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  episodeCount: number;
  publishingSchedule: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  status: 'active' | 'archived';
  createdAt: string;
}
```

**API**: `GET /workspaces/{id}/series`

**FR-2.4.2**: Create series modal:

```typescript
interface CreateSeriesFormSchema {
  title: z.string().min(3).max(255);
  description: z.string().max(1000).optional();
  publishing_schedule: z.enum(['daily', 'weekly', 'biweekly', 'monthly']);
  thumbnail_url: z.string().url().optional();
}
```

**API**: `POST /workspaces/{id}/series`

**FR-2.4.3**: `/[locale]/series/[id]` detail page:

```typescript
interface SeriesDetailProps {
  seriesId: string;
}
```

Sections:
1. **Header**: thumbnail (uploadable), title (editable), description (editable), publishing schedule (select), archive/restore button
2. **Episodes list**: sortable list (drag to reorder); episode = content card; reorder calls `PATCH /workspaces/{id}/series/{id}/episodes/reorder` with `{ order: string[] }`
3. **Performance metrics**: aggregate stats — `GET /workspaces/{id}/series/{id}/metrics`

**AC-2.4.A**:
- Given: user creates a new series
- When: they add content to the pipeline and select that series
- Then: the series badge appears on the pipeline card and clicking it navigates to the series detail page

---

### 2.5 Publishing & Calendar

**FR-2.5.1**: `/[locale]/publishing` — scheduled posts list.

```typescript
interface ScheduledPostCardProps {
  post: ScheduledPost;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onPublishNow: (id: string) => void;
}

interface ScheduledPost {
  id: string;
  title: string;
  contentId?: string;
  platforms: Platform[];
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  scheduledAt: string;
  publishedAt?: string;
  mediaUrl?: string;
}

type Platform = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin' | 'podcast';
```

**Create social post form**:

```typescript
interface CreatePostFormSchema {
  title: z.string().min(1).max(255);
  content: z.string().min(1).max(5000);
  platforms: z.array(z.enum(['youtube', 'tiktok', 'instagram', 'twitter', 'linkedin'])).min(1);
  scheduled_at: z.string().datetime();
  media_url: z.string().url().optional();
  platform_metadata: z.record(z.object({
    hashtags: z.array(z.string()).optional(),
    caption: z.string().optional(),
  })).optional();
}
```

**API**: `POST /workspaces/{id}/publishing/schedule`

**Free tier gate**: "Auto-publish" toggle is gated — Free tier users see "Manual scheduling only. Upgrade to PRO for auto-publish."

**FR-2.5.2**: `/[locale]/calendar` — publishing calendar.

```typescript
interface CalendarProps {
  view: 'month' | 'week' | 'day';
  onViewChange: (view: CalendarView) => void;
  posts: ScheduledPost[];
  onSlotClick: (date: Date) => void;
  onPostClick: (postId: string) => void;
  onPostReschedule: (postId: string, newDate: Date) => void;
}
```

- Month/week/day view toggle (stored in URL state: `?view=month`)
- Drag-and-drop rescheduling: `PATCH /workspaces/{id}/publishing/posts/{id}` with `{ scheduled_at: newISO }`
- Click on empty slot opens "Quick Schedule" drawer pre-filled with selected date/time
- Content type color coding matches pipeline stage colors

**API**: `GET /workspaces/{id}/publishing/calendar?start={date}&end={date}`

**AC-2.5.A**:
- Given: user has a post scheduled for Thursday
- When: they drag it to Friday on the calendar
- Then: post visually moves to Friday; `PATCH .../posts/{id}` is called with new datetime; on error, post snaps back

---

## Phase 3: Creators Studio AI

### 3.1 AI Chat

**FR-3.1.1**: `/[locale]/ai-chat` — full-page conversational AI interface.

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface AIChatProps {
  sessionId: string;
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isStreaming: boolean;
  creditsRemaining: number;
  creditLimit: number;
}
```

**Streaming**: Connect to `WebSocket /ws` after authentication. Subscribe to `chat_response_chunk` events. Render chunks as they arrive into the last assistant message. On `chat_response_complete`, mark `isStreaming: false`.

Fallback: If WebSocket unavailable, use `POST /workspaces/{id}/ai/chat` (non-streaming). Display full response at once.

**API**: `POST /workspaces/{id}/ai/chat`

Request:
```typescript
interface AIChatRequest {
  message: string;
  session_id?: string;
  context?: {
    content_id?: string;
    idea_id?: string;
  };
}
```

Response: `{ reply: string; session_id: string; credits_used: number; credits_remaining: number }`

**Quick action chips** (rendered above input):

```typescript
const QUICK_ACTIONS = [
  { label: 'Brainstorm ideas', prompt: 'Generate 5 content ideas for my niche' },
  { label: 'Write a hook', prompt: 'Write 3 hook variations for: ' },
  { label: 'Improve this title', prompt: 'Improve this title for higher CTR: ' },
  { label: 'Content outline', prompt: 'Create a detailed outline for: ' },
];
```

**Credit indicator**: `{creditsRemaining}/{creditLimit} AI credits`. Free tier: 50. PRO: 500. At 80% usage (40/50 for free): yellow warning. At 100%: input disabled + upgrade prompt.

**ZS: `aiStore`** slice:
```typescript
interface AIStore {
  sessions: Record<string, ChatMessage[]>;
  creditsRemaining: number;
  creditLimit: number;
  activeSessionId: string | null;
  isStreaming: boolean;

  addMessage(sessionId: string, message: ChatMessage): void;
  updateLastMessage(sessionId: string, chunk: string): void;
  setCredits(remaining: number, limit: number): void;
  startSession(): string;
}
```

**AC-3.1.A**:
- Given: user sends a message in AI chat
- When: streaming begins
- Then: a typing indicator appears immediately; text renders token-by-token; the input is disabled while streaming; on completion, input re-enables

**AC-3.1.B**:
- Given: free tier user has 0 credits remaining
- When: they try to send a message
- Then: submit button is disabled; upgrade prompt CTA is visible above the input

---

### 3.2 Brainstormer

**FR-3.2.1**: Brainstormer accessible from:
1. Ideas page — "Brainstorm" button in filter bar
2. Idea drawer — "Expand Idea" button
3. AI Chat — as a panel mode

```typescript
interface BrainstormerProps {
  initialTopic?: string;
  onSaveAsIdea: (idea: { title: string; description: string }) => void;
  onAddToPipeline: (idea: { title: string; description: string }) => void;
}
```

**API**: `POST /workspaces/{id}/ai/brainstorm`

Request: `{ topic: string; count?: number; platform?: Platform }`

Response: `{ angles: BrainstormAngle[]; credits_used: number }`

```typescript
interface BrainstormAngle {
  title: string;
  description: string;
  estimated_effort: 'low' | 'medium' | 'high';
  platform_suggestions: Platform[];
  hook?: string;
}
```

**AC-3.2.A**:
- Given: user types "CSS performance tips" and clicks Brainstorm
- When: API responds
- Then: 10 angle cards render with title, description, effort badge; each card has "Save as Idea" and "Add to Pipeline" actions

---

### 3.3 Title / Thumbnail Lab

**FR-3.3.1**: Title Lab accessible from content detail panel (tab: "AI Tools") and standalone at `GET /[locale]/ai-chat?tool=title-lab`.

```typescript
interface TitleLabProps {
  initialTitle?: string;
  contentId?: string;
  onSelectTitle: (title: string) => void;
}
```

**API**: `POST /workspaces/{id}/ai/title-lab`

Request: `{ topic: string; platform: Platform; current_title?: string }`

Response:
```typescript
interface TitleLabResponse {
  titles: Array<{
    title: string;
    ctr_score: number;          // 1-10 predicted CTR score
    rationale: string;
    character_count: number;
  }>;
  credits_used: number;
}
```

"Use This" action: calls `PATCH /workspaces/{id}/contents/{id}` with `{ title: selectedTitle }`, closes lab, shows toast "Title updated".

**FR-3.3.2**: SEO Description Generator tab in the same panel.

**API**: `POST /workspaces/{id}/ai/seo-description`

Request: `{ title: string; outline?: string; platform: Platform }`

Response: `{ description: string; character_count: number; keywords: string[] }`

**AC-3.3.A**:
- Given: user has a content piece in "Review" stage
- When: they open Title Lab and click "Use This" on a title
- Then: the content title updates immediately (optimistic); `PATCH` fires; title in pipeline card refreshes

---

### 3.4 Script Doctor

**FR-3.4.1**: Script editor integrated into content detail drawer, Script tab. Available for content in `scripting` or `filming` stage.

**Editor implementation**: `@tiptap/react` with extensions: `StarterKit`, `Placeholder`, `CharacterCount`.

```typescript
interface ScriptEditorProps {
  contentId: string;
  initialContent: string;
  onSave: (content: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysisResult?: ScriptAnalysisResult;
}
```

Script is auto-saved every 30 seconds via debounced `PATCH /workspaces/{id}/contents/{id}` with `{ script: content }`.

**FR-3.4.2**: AI Script Doctor sidebar panel (appears on "Analyze" button click):

**API**: `POST /workspaces/{id}/ai/script-doctor`

Request: `{ content_id: string; script: string }`

Response:
```typescript
interface ScriptAnalysisResult {
  hook_score: number;           // 0-100
  retention_risk_sections: Array<{
    start_offset: number;       // character offset in script
    end_offset: number;
    risk_level: 'low' | 'medium' | 'high';
    suggestion: string;
    improved_text?: string;
  }>;
  overall_score: number;
  suggestions: string[];
  credits_used: number;
}
```

Highlighting: overlay colored marks on editor using Tiptap `Decoration` API. Clicking a marked section expands inline suggestion panel with "Apply Suggestion" button.

"Apply Suggestion": replaces `script[start_offset..end_offset]` with `improved_text`, calls auto-save.

**Script version history**: last 5 saves stored in `localStorage` keyed by `contentId`. "Version history" button shows list; clicking a version restores it to the editor.

**AC-3.4.A**:
- Given: user has typed a 500-word script
- When: they click "Analyze Script"
- Then: Script Doctor sidebar opens; high-risk sections are highlighted in red; medium-risk in yellow; hook score renders as a circular progress indicator

---

### 3.5 Repurposing Engine / Remix

**FR-3.5.1**: `/[locale]/remix` — content atomization hub.

```typescript
interface RemixPageProps {}

interface RemixVariant {
  platform: Platform;
  format: 'thread' | 'post' | 'carousel' | 'script' | 'newsletter';
  content: string;
  suggested_hashtags?: string[];
  character_count: number;
  slides?: string[];           // for carousel format
  tweets?: string[];           // for thread format
}
```

**API**: `POST /workspaces/{id}/ai/repurpose`

Request: `{ content_id: string; platforms: Platform[] }`

Response: `{ variants: RemixVariant[]; viral_moments: ViralMoment[]; credits_used: number }`

```typescript
interface ViralMoment {
  quote: string;
  timestamp_seconds?: number;
  engagement_prediction: number;   // 0-100
}
```

**Variant card**:
```typescript
interface RemixVariantCardProps {
  variant: RemixVariant;
  onEdit: (content: string) => void;
  onSchedule: (variant: RemixVariant) => void;
  onCopy: () => void;
}
```

"Schedule" action opens publishing drawer pre-filled with variant content, platform pre-selected, and any suggested hashtags injected.

**FR-3.5.2**: Hook Generator accessible from script editor sidebar:

**API**: `POST /workspaces/{id}/ai/hooks`

Request: `{ topic: string; platform: Platform; style?: 'question' | 'stat' | 'story' | 'bold-claim' }`

Response: `{ hooks: Array<{ text: string; style: string; explanation: string }>; credits_used: number }`

**AC-3.5.A**:
- Given: user selects a published video and clicks "Remix"
- When: API responds
- Then: 5 platform variant cards render; viral moments section shows highlighted quotes; each variant is editable in-place

---

### 3.6 Hashtag + Caption Generator

**FR-3.6.1**: Integrated into publishing post creation form as two tabs: "Hashtags" and "Captions".

**Hashtag API**: `POST /workspaces/{id}/ai/hashtags`

Request: `{ topic: string; platform: Platform; count?: number }`

Response: `{ hashtags: Array<{ tag: string; volume: 'low' | 'medium' | 'high'; }> }`

**Caption API**: `POST /workspaces/{id}/ai/caption`

Request: `{ content_summary: string; platform: Platform; tone?: 'professional' | 'casual' | 'humorous' }`

Response: `{ captions: Array<{ text: string; character_count: number }> }`

"Insert" action: injects hashtags/caption into the respective field of the post creation form.

**AC-3.6.A**:
- Given: user is creating a post for Instagram
- When: they open the Hashtags tab and click Generate
- Then: 20-30 hashtags appear categorized by volume; clicking any hashtag toggles it selected; "Insert Selected" button injects selected tags into the post body

---

## Phase 4: Growth — Analytics, Gamification, Sponsorships

### 4.1 Analytics Dashboard

**FR-4.1.1**: `/[locale]/analytics` — cross-platform analytics hub.

```typescript
interface AnalyticsDashboardFilters {
  dateRange: '7d' | '30d' | '90d' | 'custom';
  customStart?: string;
  customEnd?: string;
  platforms: Platform[];
}
```

**Tier gates**:
- `30d` date range: Free tier allowed
- `90d` date range: PRO required
- `custom` date range: PRO required

**Metric cards**:
```typescript
interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'stable' };
  isLoading: boolean;
}
```

Metrics: total views, new subscribers, engagement rate (%), average watch time.

**Chart**: `recharts` `<ComposedChart>` with line series per platform. X-axis: dates. Y-axis: selected metric. Legend: platform colors.

**API endpoints**:
- `GET /workspaces/{id}/analytics/metrics?period={range}&platforms={csv}`
- `GET /workspaces/{id}/analytics/audience?period={range}`
- `GET /workspaces/{id}/analytics/velocity?period={range}`

**RQ keys**:
- `['analytics', workspaceId, 'metrics', filters]` — `staleTime: 300_000` (5 min)
- `['analytics', workspaceId, 'audience', filters]`

**Top content table**:
```typescript
interface TopContentRow {
  contentId: string;
  title: string;
  platform: Platform;
  views: number;
  engagementRate: number;
  publishedAt: string;
}
```

**AC-4.1.A**:
- Given: free tier user attempts to select "90-day" date range
- When: they click the selector
- Then: `<TierGate tier="pro">` intercepts; upgrade modal appears; the 90-day option is visually marked with a PRO badge

#### 4.1.1 Consistency Hub

**FR-4.1.2**: `/[locale]/consistency` — dedicated consistency tracking page.

**Heatmap component**:
```typescript
interface ConsistencyHeatmapProps {
  data: Array<{
    date: string;           // ISO date string
    count: number;          // pieces published (0-4+)
    intensity: 0 | 1 | 2 | 3 | 4;
  }>;
  year: number;
  onCellHover: (date: string, count: number) => void;
}
```

52 columns × 7 rows grid. Cell color: `intensity 0` = `--color-muted`, `1–4` = progressively saturated `--color-pipeline` (violet). Tooltip on hover: "March 10 — 3 pieces published".

**API**: `GET /workspaces/{id}/analytics/heatmap?year={year}`

**Streak multiplier display**:
```typescript
interface StreakMultiplierBadgeProps {
  streakDays: number;
  multiplier: number;        // e.g., 1.5, 2.0, 3.0
  nextMilestone: number;     // days until next multiplier tier
}
```

Multiplier tiers: 7 days → 1.5x, 30 days → 2.0x, 90 days → 2.5x, 365 days → 3.0x.

**AC-4.1.B**:
- Given: heatmap renders with 52 weeks of data
- When: user hovers over a cell
- Then: tooltip shows date and count; no other cells shift position (no layout shift)

#### 4.1.2 Goals

**FR-4.1.3**: `/[locale]/goals` — goal management.

```typescript
interface GoalFormSchema {
  title: z.string().min(3).max(255);
  type: z.enum(['publish_frequency', 'subscriber_milestone', 'revenue_milestone', 'custom']);
  target_value: z.number().positive();
  target_unit: z.string();                    // "videos/week", "subscribers", "USD"
  deadline?: z.string().datetime();
}
```

Goal card:
```typescript
interface GoalCardProps {
  goal: Goal;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
}
```

Progress bar fills based on `current_value / target_value`. On goal completion (progress reaches 100%): confetti animation + achievement toast.

---

### 4.2 Gamification

**FR-4.2.1**: `/[locale]/gamification` — creator profile gamification view.

```typescript
interface GamificationProfileProps {
  profile: GamificationProfile;
  achievements: Achievement[];
}

interface GamificationProfile {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  streakDays: number;
  streakMultiplier: number;
  recentTransactions: XPTransaction[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt?: string;        // null = locked
  category: 'streak' | 'content' | 'ideas' | 'ai' | 'social' | 'milestone';
  xpReward: number;
}

interface XPTransaction {
  id: string;
  xpAmount: number;
  action: string;             // e.g., "Idea captured", "Content published"
  multiplierApplied?: number;
  createdAt: string;
}
```

**API**:
- `GET /workspaces/{id}/gamification/profile`
- `GET /workspaces/{id}/gamification/achievements`

**RQ keys**:
- `['gamification', workspaceId, 'profile']` — `staleTime: 60_000`
- `['gamification', workspaceId, 'achievements']` — `staleTime: 300_000`

**FR-4.2.2**: Real-time XP events via WebSocket.

WebSocket event subscriptions:
```typescript
interface XPEarnedEvent {
  type: 'xp_earned';
  xp_amount: number;
  action: string;
  multiplier?: number;
  new_total: number;
}

interface AchievementUnlockedEvent {
  type: 'achievement_unlocked';
  achievement: Achievement;
}

interface LevelUpEvent {
  type: 'level_up';
  new_level: number;
  xp_total: number;
}
```

On `xp_earned`: show toast "+{xp} XP — {action}" (auto-dismiss 4s); update `gamificationStore.currentXP`.

On `achievement_unlocked`: show full-screen celebration overlay (confetti + badge reveal animation); dismissable with `Esc` or click outside.

On `level_up`: show centered modal with new level badge; "Awesome!" dismiss button.

**ZS: `gamificationStore`**:
```typescript
interface GamificationStore {
  profile: GamificationProfile | null;
  pendingCelebration: Achievement | null;    // set by WS, cleared on display
  pendingLevelUp: number | null;

  setProfile(profile: GamificationProfile): void;
  addXP(amount: number): void;
  unlockAchievement(achievement: Achievement): void;
  setLevelUp(newLevel: number): void;
  clearCelebration(): void;
}
```

**AC-4.2.A**:
- Given: user captures an idea (which awards XP)
- When: backend emits `xp_earned` WebSocket event
- Then: XP toast appears within 500ms; XP progress bar in dashboard and gamification page updates; toast auto-dismisses after 4 seconds

---

### 4.3 Reports

**FR-4.3.1**: `/[locale]/reports` — pre-built report dashboard.

Report types:
- **Weekly Summary**: pieces published, XP earned, consistency score, top platform — `GET /workspaces/{id}/analytics/reports/weekly`
- **Monthly Summary**: growth metrics, top 3 content, income summary — `GET /workspaces/{id}/analytics/reports/monthly`
- **Best Content**: top 10 by views — `GET /workspaces/{id}/analytics/reports/best-content`

**CSV Export** (PRO gate): "Export CSV" button calls `GET /workspaces/{id}/analytics/reports/{type}/export` → triggers file download.

**AC-4.3.A**:
- Given: free tier user clicks "Export CSV"
- When: `<TierGate tier="pro">` evaluates
- Then: upgrade prompt modal appears; no file download is initiated

---

### 4.4 Sponsorships CRM

**FR-4.4.1**: `/[locale]/sponsorships` — brand deal pipeline.

View modes: kanban (default) or list (toggle). State persisted in `localStorage`.

**Kanban columns** (deal stages):
```typescript
type DealStage = 'lead' | 'negotiation' | 'signed' | 'delivered' | 'paid';
```

**Deal card**:
```typescript
interface DealCardProps {
  deal: DealSummary;
  onOpen: (id: string) => void;
  onStageChange: (id: string, stage: DealStage) => void;
}

interface DealSummary {
  id: string;
  brandName: string;
  dealValue: number;
  currency: string;
  stage: DealStage;
  deliverablesTotal: number;
  deliverablesCompleted: number;
  nextDeadline?: string;
}
```

**Create deal form**:
```typescript
interface CreateDealFormSchema {
  brand_name: z.string().min(2).max(255);
  contact_email: z.string().email().optional();
  deal_value: z.number().positive();
  currency: z.enum(['USD', 'EUR', 'GBP', 'BRL']).default('USD');
  notes: z.string().max(2000).optional();
}
```

**API**: `POST /workspaces/{id}/sponsorships`

**FR-4.4.2**: Deal detail drawer:

```typescript
interface DealDrawerProps {
  dealId: string;
  open: boolean;
  onClose: () => void;
}
```

Sections:
1. **Brand info**: name, website, contact email
2. **Deal terms**: value, currency, payment status toggle (`unpaid → invoiced → paid`)
3. **Deliverables**: checklist with due dates; add/remove deliverables; `POST/PATCH /workspaces/{id}/sponsorships/{id}/deliverables`
4. **Linked content**: searchable content selector (links content from pipeline to deal); `POST /workspaces/{id}/sponsorships/{id}/content-links`
5. **File attachments**: contract/brief uploads via presigned URL
6. **Status stepper**: visual stage timeline

**FR-4.4.3**: Income tracker section on sponsorships page:

- Monthly bar chart: `recharts` `<BarChart>` showing total deal value by month (PAID deals)
- Revenue breakdown by source (sponsorship only for now)
- **API**: `GET /workspaces/{id}/sponsorships/income?period={range}`

**AC-4.4.A**:
- Given: user creates a deal and marks all deliverables complete
- When: they move the deal to "Paid" stage
- Then: income chart updates; deal count badge on "Paid" column increments; deal moves to Paid column

---

## Phase 5: Billing, Settings, Global Polish

### 5.1 Billing & Subscription

**FR-5.1.1**: `/[locale]/settings/billing` — billing management page.

```typescript
interface BillingPageProps {}

interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  currentPeriodEnd: string;
  monthlyPrice: number;
  currency: string;
  features: string[];
}
```

**API**:
- `GET /workspaces/{id}/billing/subscription` → `SubscriptionInfo`
- `POST /workspaces/{id}/billing/checkout` → `{ checkout_url: string }` → `window.location.href = checkout_url`
- `POST /workspaces/{id}/billing/portal` → `{ portal_url: string }` → `window.location.href = portal_url`

**Pricing display**:
```typescript
const PRICING = {
  pro: { monthly: 12, annual: 99, currency: 'USD' },
  enterprise: { monthly: 29, annual: 249, currency: 'USD' },
};
```

**Subscription updated via WebSocket**:
```typescript
interface SubscriptionUpdatedEvent {
  type: 'subscription_updated';
  tier: 'free' | 'pro' | 'enterprise';
  status: string;
}
```

On receipt: `workspaceStore.tier` updates; all `<TierGate>` components re-evaluate; success toast "Plan updated to PRO!"

**AC-5.1.A**:
- Given: free user clicks "Upgrade to PRO"
- When: `POST /billing/checkout` succeeds
- Then: user is redirected to Stripe-hosted checkout; on Stripe success, they return to `/settings/billing?success=true`; a toast "Welcome to PRO!" appears; tier gates update

**AC-5.1.B**:
- Given: user's plan updates via Stripe webhook → backend → WebSocket
- When: `subscription_updated` event arrives
- Then: `workspaceStore.tier` changes; features previously gated by PRO become accessible immediately without page refresh

---

### 5.2 Settings

**FR-5.2.1**: `/[locale]/settings` — tabbed settings hub.

```typescript
interface SettingsTab {
  id: 'profile' | 'workspace' | 'team' | 'integrations' | 'notifications' | 'billing' | 'danger';
  label: string;
  icon: React.ReactNode;
}
```

**Profile tab**:
```typescript
interface ProfileFormSchema {
  name: z.string().min(2).max(255);
  timezone: z.string();
  locale: z.enum(['en', 'es', 'pt']);
}
```

Avatar upload: click avatar → file input (accepts `image/*`, max 5MB) → `POST /uploads/presigned?type=avatar` → PUT to S3 → `PATCH /users/{id}` with `{ avatar_url }`.

**Workspace tab**:
```typescript
interface WorkspaceFormSchema {
  name: z.string().min(3).max(100);
  description: z.string().max(500).optional();
  timezone: z.string();
  settings: z.object({
    default_content_type: z.enum(['video', 'short', 'post', 'podcast', 'newsletter']).optional(),
    auto_publish_on_schedule: z.boolean().optional(),
    require_approval: z.boolean().optional(),
  }).optional();
}
```

**Team tab** (PRO gate for > 1 member):

```typescript
interface TeamMemberRowProps {
  member: WorkspaceMember;
  currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer';
  onRoleChange: (userId: string, role: MemberRole) => void;
  onRemove: (userId: string) => void;
}
```

Invite form: email input + role select + "Send Invite" → `POST /workspaces/{id}/invitations`.

**Integrations tab**:

```typescript
interface IntegrationCardProps {
  provider: string;
  displayName: string;
  icon: React.ReactNode;
  isConnected: boolean;
  lastSyncAt?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}
```

Providers: Google Calendar, Slack, GitHub, YouTube, Telegram.

Connect: redirects to `GET /auth/oauth/{provider}/authorize?redirect_uri=...&scope=...`

Disconnect: `DELETE /workspaces/{id}/integrations/{provider}`

**Notifications tab**:

```typescript
interface NotificationPreferences {
  email: {
    achievements: boolean;
    collaboration: boolean;
    reminders: boolean;
    ai_suggestions: boolean;
    system_updates: boolean;
  };
  push: {
    achievements: boolean;
    collaboration: boolean;
    reminders: boolean;
  };
  digest_frequency: 'realtime' | 'daily' | 'weekly' | 'never';
}
```

Each toggle calls `PATCH /users/{id}/preferences` on change with debounce (500ms).

**Danger zone tab**: "Delete Workspace" button opens confirmation dialog (user must type workspace name). "Deactivate Account" button opens similar dialog. Both are irreversible-warning styled (red border, destructive button).

**AC-5.2.A**:
- Given: user uploads a new avatar
- When: image is cropped and confirmed in the crop modal
- Then: avatar uploads to S3 via presigned URL; profile updates via PATCH; new avatar renders in the header within 2 seconds; old avatar is no longer visible

---

### 5.3 Notifications

**FR-5.3.1**: Notification bell in `Header`:

```typescript
interface NotificationBellProps {
  unreadCount: number;
  onOpen: () => void;
}
```

Unread count badge: red circle with number; max display "9+" for counts > 9.

**FR-5.3.2**: Notification panel (slide-in from right, 380px wide):

```typescript
interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: 'pipeline_stage' | 'mention' | 'xp_earned' | 'achievement' | 'sponsorship_deadline' | 'content_scheduled' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
}
```

**API**:
- `GET /users/{id}/notifications?read=false&limit=50` (unread first)
- `PATCH /users/{id}/notifications/{notif_id}` with `{ read: true }`
- "Mark all read": `PATCH /users/{id}/notifications` with `{ read_all: true }` (bulk)

**Real-time**: WebSocket `notification` event → `notificationStore.addNotification(event.notification)` → unread count badge updates.

**ZS: `notificationStore`**:
```typescript
interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;

  addNotification(notification: NotificationItem): void;
  markRead(id: string): void;
  markAllRead(): void;
  setNotifications(notifications: NotificationItem[]): void;
}
```

**AC-5.3.A**:
- Given: user receives a new pipeline stage notification via WebSocket
- When: the `notification` event arrives
- Then: unread count badge increments; if notification panel is open, the new notification appears at the top without requiring a refresh

---

### 5.4 Global Search

**FR-5.4.1**: `Cmd+K` command palette in `search` mode (type "/" to toggle from `capture` mode).

```typescript
interface SearchResult {
  id: string;
  type: 'idea' | 'content' | 'series' | 'sponsorship' | 'page';
  title: string;
  subtitle?: string;
  url: string;
  icon?: React.ReactNode;
}

interface SearchResultGroup {
  type: string;
  label: string;
  results: SearchResult[];
}
```

**Debounce**: 300ms after last keystroke before calling `GET /workspaces/{id}/search?q={query}&limit=10`.

**RQ key**: `['search', workspaceId, query]` — `staleTime: 10_000`, `enabled: query.length >= 2`

Results grouped by type: Ideas, Content, Series, Sponsorships. Keyboard navigation: Arrow keys cycle through results, Enter navigates, Esc closes.

**AC-5.4.A**:
- Given: user types "React" in search mode
- When: 300ms debounce fires
- Then: results appear grouped; keyboard navigation works without mouse; pressing Enter on a result closes palette and navigates to that page

---

### 5.5 Global UX Polish

**FR-5.5.1**: Error boundaries — every page-level component wrapped:

```typescript
interface PageErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

Default fallback: centered card with error icon, "Something went wrong" message, and "Try again" button that reloads the page.

**FR-5.5.2**: Page transitions — `framer-motion` `<AnimatePresence>` with `fadeInUp` variant:

```typescript
const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};
```

Wrapped in `prefers-reduced-motion`: if user has reduced motion preference, animations are skipped (no transition).

**FR-5.5.3**: Unified inbox — `/[locale]/inbox`.

```typescript
interface InboxMessageProps {
  message: InboxMessage;
  onReply: (id: string, content: string) => void;
  onStar: (id: string) => void;
  onMarkRead: (id: string) => void;
}

interface InboxMessage {
  id: string;
  platform: Platform;
  authorName: string;
  authorAvatar?: string;
  content: string;
  contentUrl?: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
}
```

**API**: `GET /workspaces/{id}/inbox?platform={platform}&read={bool}&page={n}`

Platform filter tabs: All, YouTube, Instagram, TikTok, Twitter, LinkedIn.

**AC-5.5.A**:
- Given: user's browser has `prefers-reduced-motion: reduce`
- When: user navigates between pages
- Then: no animations play; `AnimatePresence` outputs static renders with no transform/opacity transitions

---

## Phase 6: Performance, Testing, Deployment Hardening

### 6.1 Performance Targets & Techniques

**FR-6.1.1**: Core Web Vitals targets (measured by Lighthouse CI on dashboard and ideas pages):

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 90 |
| Lighthouse Best Practices | ≥ 90 |

**FR-6.1.2**: Mandatory performance implementations:

- All `<img>` tags replaced with `next/image` with explicit `width`/`height` or `fill` + `sizes`
- Above-fold images use `priority` prop
- `next/font` for Inter; no Google Fonts CDN link
- All heavy components lazy-loaded with `next/dynamic`:
  - Kanban board
  - Calendar
  - Chart components (Recharts)
  - Script editor (Tiptap)
  - Command palette
- React Server Components: dashboard widgets, analytics lists, series list use RSC for initial data fetch
- React Query `staleTime` tuning:
  - User profile: `Infinity` (changes via WS only)
  - Analytics: `300_000` (5 min)
  - Ideas/contents: `30_000` (30s)
  - Search: `10_000` (10s)
- Kanban virtualization: `@tanstack/virtual` for columns with > 20 cards
- Bundle analysis: `ANALYZE=true pnpm build` runs `@next/bundle-analyzer`; no single chunk > 500KB

**FR-6.1.3**: WebSocket reconnection:

```typescript
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // ms, max 5 attempts
```

After 5 failed attempts: show non-intrusive "Reconnecting..." banner; stop retrying; expose manual "Reconnect" button.

---

### 6.2 Testing

**FR-6.2.1**: Unit tests (Jest + React Testing Library, `jsdom` environment):

Coverage targets:
- `packages/api-client`: ≥ 80% line coverage
- `packages/validations`: ≥ 95% (every schema tested with valid + invalid data)
- `packages/stores`: ≥ 80%
- `packages/core`: ≥ 80%

Key test cases:

```typescript
// api-client: auth module
describe('authApi', () => {
  it('calls POST /auth/login with correct payload');
  it('throws ApiError with code AUTHENTICATION_FAILED on 401');
  it('normalizes error details array from 400 response');
  it('silent refresh: retries original request after 401');
  it('logout: calls authStore.logout() when refresh fails');
});

// validations: CreateIdeaRequest
describe('CreateIdeaRequestSchema', () => {
  it('accepts valid input');
  it('rejects title shorter than 3 chars');
  it('rejects description longer than 2000 chars');
  it('rejects more than 10 tags');
  it('coerces missing source to "manual"');
});

// stores: workspaceStore
describe('workspaceStore', () => {
  it('setActiveWorkspace updates tier correctly');
  it('switchWorkspace fetches new workspace and updates store');
});
```

**FR-6.2.2**: Component tests (React Testing Library):

```typescript
// IdeaCard
describe('IdeaCard', () => {
  it('renders title and tags');
  it('calls onPromote when "Promote" is clicked');
  it('shows validation score when set');
  it('has correct aria-label on kebab menu button');
});

// PipelineCard
describe('PipelineCard', () => {
  it('renders content type icon for each ContentType');
  it('renders overdue badge when dueDate is in the past');
  it('has drag handle accessible via keyboard');
});
```

**FR-6.2.3**: Integration tests (MSW for API mocking):

```typescript
describe('Idea creation flow', () => {
  it('Given: user opens command palette; When: types title and presses Enter; Then: idea appears in list');
  it('Given: MSW returns 409; When: idea with duplicate title submitted; Then: error message shown, idea not in list');
});

describe('Auth flow', () => {
  it('register → login → token refresh → logout full cycle');
  it('protected route redirects to login when unauthenticated');
  it('silent refresh succeeds and request is retried transparently');
});

describe('Pipeline drag', () => {
  it('dragging card optimistically updates column; API call fires; success = stays in new column');
  it('API failure causes card to revert to original column');
});
```

**FR-6.2.4**: End-to-end tests (Playwright):

```typescript
// e2e/happy-path.spec.ts
test('full creator onboarding flow', async ({ page }) => {
  // 1. Sign up with email
  // 2. Complete onboarding wizard (workspace + preferences + 2 ideas)
  // 3. Land on dashboard
  // 4. Capture idea via Cmd+K
  // 5. Promote idea to pipeline
  // 6. Drag pipeline card to "Filming"
  // 7. Schedule a post on calendar
  // 8. Verify post appears on publishing page
});

test('authentication: login with email', async ({ page }) => { /* ... */ });
test('authentication: logout clears session', async ({ page }) => { /* ... */ });
test('upgrade: click upgrade → Stripe redirect fires', async ({ page }) => {
  // Intercept window.location.href assignment
  // Verify correct checkout_url is called
});
```

Cross-browser: Chromium, Firefox, WebKit (all three in CI).

**Test file organization**:
```
packages/api-client/src/__tests__/
packages/validations/src/__tests__/
packages/stores/src/__tests__/
apps/web/src/__tests__/components/
apps/web/e2e/
```

---

### 6.3 Error Monitoring & Observability

**FR-6.3.1**: Sentry integration via `@sentry/nextjs`:

`sentry.client.config.ts`:
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV,
  tracesSampleRate: process.env.NEXT_PUBLIC_ENV === 'production' ? 0.1 : 1.0,
  integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Attach workspace context
    const workspaceId = workspaceStore.getState().activeWorkspaceId;
    const tier = workspaceStore.getState().tier;
    if (workspaceId) {
      event.tags = { ...event.tags, workspace_id: workspaceId, tier };
    }
    return event;
  },
});
```

User context attached on auth: `Sentry.setUser({ id: user.id, email: user.email })`. Cleared on logout.

**FR-6.3.2**: Internal analytics events (no third-party tracking):

```typescript
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  workspaceId: string;
  userId: string;
  timestamp: string;
}

// Events to track:
// 'idea_captured' — { source, has_tags }
// 'content_stage_changed' — { from_stage, to_stage, content_type }
// 'ai_credit_used' — { feature, credits_used, credits_remaining }
// 'upgrade_clicked' — { from_tier, feature_blocked }
// 'ai_title_selected' — { content_type }
// 'remix_scheduled' — { platform, variant_type }
```

---

### 6.4 CI/CD Pipeline

**FR-6.4.1**: GitHub Actions workflows:

**`.github/workflows/ci.yml`** (on: `pull_request`):
```yaml
jobs:
  lint-typecheck:
    - pnpm lint
    - pnpm type-check
  unit-tests:
    - pnpm test --filter=./packages/...
  component-tests:
    - pnpm test --filter=./apps/web
  build:
    - pnpm build
    - Check bundle sizes (fail if any chunk > 500KB)
```

CI must complete in < 10 minutes on standard GitHub-hosted runner.

**`.github/workflows/e2e.yml`** (on: `schedule: '0 2 * * *'` — nightly, on `develop` branch):
```yaml
jobs:
  playwright:
    - pnpm playwright install --with-deps
    - pnpm playwright test
    - Upload test results + screenshots on failure
```

**`.github/workflows/deploy-staging.yml`** (on: `push` to `develop`):
```yaml
jobs:
  deploy:
    - pnpm build
    - Deploy to Vercel preview (or staging environment)
    - Post deployment URL to PR/commit
```

**`.github/workflows/deploy-production.yml`** (on: `push` to `main`, requires manual approval):
```yaml
jobs:
  approve:
    environment: production   # Requires manual approval in GitHub UI
  deploy:
    needs: approve
    - pnpm build
    - Deploy to Vercel production
    - Notify Sentry of new release: sentry-cli releases new + finalize
```

**FR-6.4.2**: Environment variable management:

| Variable | Used in | Secret? |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Client + Server | No |
| `NEXT_PUBLIC_WS_URL` | Client | No |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | No |
| `NEXT_PUBLIC_ENV` | Client | No |
| `SENTRY_AUTH_TOKEN` | Build only | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | No |

No secrets in code or checked-in `.env` files. All secrets in Vercel environment variables / GitHub Actions secrets.

**AC-6.4.A**:
- Given: PR is opened with a failing unit test
- When: CI runs
- Then: CI job fails with test failure output; PR cannot be merged (branch protection rules); no deployment is triggered

**AC-6.4.B**:
- Given: merge to `main` is attempted
- When: deploy-production workflow triggers
- Then: workflow pauses at `approve` step; a reviewer must approve in GitHub UI; only then does deployment proceed

---

## Cross-Cutting Specifications

### Accessibility Requirements

All interactive elements must:
- Be reachable by Tab key
- Have visible focus ring (`ring-2 ring-primary`)
- Have `aria-label` on icon-only buttons
- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<aside>`, `<section>`)
- Color not be the only means of conveying information (badges use text + color)
- Pass minimum 4.5:1 color contrast ratio for normal text, 3:1 for large text

Kanban board: each draggable card must have keyboard-accessible drag via Space (pick up) + Arrow keys (move) + Space/Enter (drop) + Escape (cancel). This follows `@dnd-kit` keyboard accessibility preset.

Screen reader announcements for:
- Route changes: `aria-live="polite"` region updated with new page title
- Toast notifications: `role="status"` or `role="alert"` depending on type
- Loading states: `aria-busy="true"` on loading containers

### Loading States

All data-fetching components must implement:
1. **Skeleton**: matches layout dimensions of loaded content (prevents CLS)
2. **Loading spinners**: only for user-triggered actions (button loading state), not page-level data
3. **Stale data**: show previous data during refetch (React Query default behavior); add subtle "Refreshing..." indicator

### Error States

Three tiers:
1. **Field-level**: inline error below form field (red text, `aria-describedby` linked)
2. **Component-level**: inline error message within the component with retry button
3. **Page-level**: full error boundary fallback with "Something went wrong" and "Try again"

Network error detection: `navigator.onLine` listener + React Query `networkMode: 'offlineFirst'`. When offline: toast "You're offline — changes will sync when reconnected."

### i18n Keys Structure

Translation files at `packages/i18n/src/messages/{locale}.json`:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try again",
    "empty": {
      "ideas": "No ideas yet — capture your first one!",
      "pipeline": "Your pipeline is empty — promote an idea to get started",
      "sponsorships": "No deals yet — add your first brand deal"
    }
  },
  "auth": { /* ... */ },
  "ideas": { /* ... */ },
  "pipeline": { /* ... */ },
  // ... per feature namespace
}
```

TypeScript-strict key inference via `next-intl` `Messages` type augmentation. CI check: `pnpm i18n:check` fails if any key used in code is missing from any locale file.

---

## Zod Schema Index (complete reference)

| Schema | Location | Used for |
|--------|---------|---------|
| `RegisterRequestSchema` | `validations/auth` | Registration form |
| `LoginFormSchema` | `validations/auth` | Login form |
| `CreateIdeaRequestSchema` | `validations/ideas` | Quick capture + idea form |
| `UpdateIdeaRequestSchema` | `validations/ideas` | Idea drawer save |
| `CreateContentRequestSchema` | `validations/contents` | New content form |
| `UpdateContentRequestSchema` | `validations/contents` | Content drawer save |
| `CreateSeriesFormSchema` | `validations/series` | Series creation modal |
| `CreatePostFormSchema` | `validations/publishing` | Post creation form |
| `WorkspaceCreationFormSchema` | `validations/workspaces` | Onboarding step 1 |
| `ProfileFormSchema` | `validations/users` | Settings profile tab |
| `WorkspaceFormSchema` | `validations/workspaces` | Settings workspace tab |
| `CreateDealFormSchema` | `validations/sponsorships` | Deal creation modal |
| `GoalFormSchema` | `validations/goals` | Goals creation |
| `RegisterFormSchema` | `validations/auth` | Client-side extended registration |
| `AIChatRequest` | `validations/ai` | Chat API call |

---

## State Management Summary

| Store | Package | Persisted | Key State |
|-------|---------|-----------|-----------|
| `authStore` | `@ordo/stores` | user (localStorage), refreshToken (httpOnly cookie) | user, isAuthenticated, _accessToken |
| `workspaceStore` | `@ordo/stores` | activeWorkspaceId (localStorage) | activeWorkspace, tier, role |
| `uiStore` | `@ordo/stores` | theme, sidebarCollapsed (localStorage) | theme, modals, toasts, sidebarCollapsed |
| `notificationStore` | `@ordo/stores` | No | notifications, unreadCount |
| `gamificationStore` | `@ordo/stores` | No | profile, pendingCelebration, pendingLevelUp |
| `aiStore` | `@ordo/stores` | No | sessions, creditsRemaining, isStreaming |

All React Query (TanStack Query) server state is separate from Zustand. Zustand stores contain only client-side UI state and session state. Server data is always in React Query cache.

---

## API Endpoints Consumed — Complete Reference

| Phase | Method | Path | Purpose |
|-------|--------|------|---------|
| 1 | POST | `/auth/register` | Registration |
| 1 | POST | `/auth/login` | Login |
| 1 | POST | `/auth/refresh` | Silent token refresh |
| 1 | POST | `/auth/logout` | Logout |
| 1 | GET | `/auth/oauth/{provider}/authorize` | OAuth redirect |
| 1 | POST | `/auth/oauth/callback` | OAuth callback |
| 1 | GET | `/auth/me` | Session check |
| 1 | POST | `/auth/forgot-password` | Password reset email |
| 1 | POST | `/auth/reset-password` | Password reset |
| 1 | GET | `/workspaces` | List workspaces |
| 1 | POST | `/workspaces` | Create workspace |
| 1 | GET | `/workspaces/{id}` | Get workspace |
| 1 | PATCH | `/workspaces/{id}` | Update workspace |
| 1 | PATCH | `/users/{id}` | Update user profile |
| 2 | GET | `/workspaces/{id}/ideas` | List ideas |
| 2 | POST | `/workspaces/{id}/ideas` | Create idea |
| 2 | GET | `/workspaces/{id}/ideas/{id}` | Get idea |
| 2 | PATCH | `/workspaces/{id}/ideas/{id}` | Update idea |
| 2 | DELETE | `/workspaces/{id}/ideas/{id}` | Delete idea |
| 2 | POST | `/workspaces/{id}/ideas/{id}/promote` | Promote to content |
| 2 | GET | `/workspaces/{id}/contents` | List/pipeline contents |
| 2 | POST | `/workspaces/{id}/contents` | Create content |
| 2 | PATCH | `/workspaces/{id}/contents/{id}` | Update content |
| 2 | PATCH | `/workspaces/{id}/contents/{id}/stage` | Stage change |
| 2 | GET | `/workspaces/{id}/contents/{id}/checklist` | Smart checklist |
| 2 | POST | `/workspaces/{id}/contents/{id}/time-sessions` | Time tracking |
| 2 | POST | `/uploads/presigned` | Presigned upload URL |
| 2 | GET | `/workspaces/{id}/series` | List series |
| 2 | POST | `/workspaces/{id}/series` | Create series |
| 2 | GET | `/workspaces/{id}/series/{id}` | Series detail |
| 2 | PATCH | `/workspaces/{id}/series/{id}` | Update series |
| 2 | PATCH | `/workspaces/{id}/series/{id}/episodes/reorder` | Reorder episodes |
| 2 | GET | `/workspaces/{id}/publishing/posts` | Scheduled posts |
| 2 | POST | `/workspaces/{id}/publishing/schedule` | Schedule post |
| 2 | PATCH | `/workspaces/{id}/publishing/posts/{id}` | Reschedule/update post |
| 2 | GET | `/workspaces/{id}/publishing/calendar` | Calendar view |
| 3 | POST | `/workspaces/{id}/ai/chat` | AI chat |
| 3 | POST | `/workspaces/{id}/ai/brainstorm` | Brainstormer |
| 3 | POST | `/workspaces/{id}/ai/validate` | Idea validation |
| 3 | POST | `/workspaces/{id}/ai/title-lab` | Title generation |
| 3 | POST | `/workspaces/{id}/ai/seo-description` | SEO descriptions |
| 3 | POST | `/workspaces/{id}/ai/script-doctor` | Script analysis |
| 3 | POST | `/workspaces/{id}/ai/repurpose` | Content remix |
| 3 | POST | `/workspaces/{id}/ai/hooks` | Hook generation |
| 3 | POST | `/workspaces/{id}/ai/hashtags` | Hashtag generation |
| 3 | POST | `/workspaces/{id}/ai/caption` | Caption generation |
| 4 | GET | `/workspaces/{id}/analytics/metrics` | Analytics metrics |
| 4 | GET | `/workspaces/{id}/analytics/audience` | Audience data |
| 4 | GET | `/workspaces/{id}/analytics/velocity` | Pipeline velocity |
| 4 | GET | `/workspaces/{id}/analytics/consistency` | Consistency score |
| 4 | GET | `/workspaces/{id}/analytics/heatmap` | Activity heatmap |
| 4 | GET | `/workspaces/{id}/analytics/reports` | Reports |
| 4 | GET | `/workspaces/{id}/gamification/profile` | XP profile |
| 4 | GET | `/workspaces/{id}/gamification/achievements` | Achievements |
| 4 | GET | `/workspaces/{id}/sponsorships` | List deals |
| 4 | POST | `/workspaces/{id}/sponsorships` | Create deal |
| 4 | PATCH | `/workspaces/{id}/sponsorships/{id}` | Update deal |
| 4 | POST | `/workspaces/{id}/sponsorships/{id}/deliverables` | Add deliverable |
| 4 | GET | `/workspaces/{id}/sponsorships/income` | Income tracker |
| 5 | GET | `/workspaces/{id}/billing/subscription` | Subscription info |
| 5 | POST | `/workspaces/{id}/billing/checkout` | Stripe checkout |
| 5 | POST | `/workspaces/{id}/billing/portal` | Stripe portal |
| 5 | GET | `/users/{id}/notifications` | Notifications |
| 5 | PATCH | `/users/{id}/notifications/{id}` | Mark read |
| 5 | GET | `/users/{id}/preferences` | User preferences |
| 5 | PATCH | `/users/{id}/preferences` | Update preferences |
| 5 | GET | `/workspaces/{id}/search` | Global search |
| 5 | GET | `/workspaces/{id}/inbox` | Unified inbox |
| 5 | GET | `/workspaces/{id}/members` | Team members |
| 5 | POST | `/workspaces/{id}/invitations` | Send invite |
| 5 | DELETE | `/workspaces/{id}/integrations/{provider}` | Disconnect integration |

---

## WebSocket Events Consumed

| Event | Phase | Handler |
|-------|-------|---------|
| `xp_earned` | 4 | Show XP toast; update `gamificationStore.currentXP` |
| `achievement_unlocked` | 4 | Show celebration overlay; `gamificationStore.unlockAchievement()` |
| `level_up` | 4 | Show level-up modal; `gamificationStore.setLevelUp()` |
| `notification` | 5 | `notificationStore.addNotification()` |
| `subscription_updated` | 5 | `workspaceStore.tier`; invalidate billing RQ cache |
| `chat_response_chunk` | 3 | Append chunk to active chat message |
| `chat_response_complete` | 3 | Mark streaming complete; re-enable input |
| `content_stage_changed` | 2 | Invalidate pipeline RQ cache (collaborative editing) |

---

*This specification is the authoritative functional contract for the Ordo Creator OS frontend web application. All implementation decisions that diverge from this document must be recorded as ADRs.*
