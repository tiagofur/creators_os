# Proposal: Frontend Web Roadmap
## Ordo Creator OS — Next.js Web Application

**Change name**: `frontend-web-roadmap`
**Author**: sdd-propose
**Date**: 2026-03-10
**Status**: PROPOSED

---

## Executive Summary

The Ordo Creator OS backend is fully complete — 40+ REST endpoints, JWT/OAuth2 auth, PostgreSQL, Redis, WebSocket hub, and all business logic. The frontend web application (Next.js 15, App Router, TypeScript, Tailwind CSS, shadcn/ui) needs to be built from scratch to consume this API.

This proposal defines a **6-phase, 24-week roadmap** that:
1. Establishes the monorepo foundation, design system, and authentication shell
2. Builds the core creator workflow (ideas capture + content pipeline)
3. Adds the AI-powered Creators Studio
4. Delivers analytics, gamification, and sponsorships CRM
5. Completes billing, settings, and global polish
6. Hardens performance, testing, and deployment

The result is a production-ready web application serving all three business tiers (Free / Pro / Enterprise) across the full feature catalog.

---

## Background & Constraints

### What Exists

- **Backend**: Complete. Go 1.25, Chi v5, PostgreSQL 16+, Redis, Asynq, Gorilla WebSocket. All migrations done. API documented at `/prd/10-technical-specs/02-api-endpoints.md`.
- **PRD documentation**: Vision, feature catalog, user journeys, information architecture, design system foundations, Next.js project structure spec, frontend integration guide — all written and available under `/prd/`.
- **Design system**: Fully specified — OKLCH color tokens, typography scale, spacing grid, animation library, dark/light theme, responsive breakpoints.

### What Does Not Exist

- The `apps/web/` directory and all Next.js source
- The `packages/` monorepo libraries (`ui`, `hooks`, `stores`, `api-client`, `validations`, `i18n`, `types`, `config`, `core`)
- Any Turborepo configuration

### Key Constraints

- **API-first**: No raw fetch calls from app code. All backend communication must go through `@ordo/api-client`.
- **No transparencies or gradients**: Hard rule from the design system.
- **Dark mode mandatory**: Every component must support both themes from day one.
- **i18n from day one**: English, Spanish, Portuguese via `next-intl`. Routes use `/{locale}/...` pattern.
- **Responsive mandatory**: 320px mobile through 2560px ultrawide.
- **Tier enforcement on the frontend**: Free/Pro/Enterprise capability gates must be respected in every feature.

---

## Proposed Solution: 6-Phase Roadmap

### Phase Structure Overview

| Phase | Name | Duration | Weeks |
|-------|------|----------|-------|
| 1 | Foundation: Monorepo, Design System, Auth | 4 weeks | 1–4 |
| 2 | Core Creator Experience: Ideas + Pipeline | 5 weeks | 5–9 |
| 3 | Creators Studio AI | 4 weeks | 10–13 |
| 4 | Growth: Analytics, Gamification, Sponsorships | 4 weeks | 14–17 |
| 5 | Billing, Settings, Global Polish | 3 weeks | 18–20 |
| 6 | Performance, Testing, Deployment Hardening | 4 weeks | 21–24 |

**Total estimated duration**: 24 weeks (6 months)

---

## Phase 1: Foundation — Monorepo, Design System, Auth

**Duration**: 4 weeks
**Goal**: Every future feature is built on a solid, consistent base. No UI debt from day one.

### Deliverables

#### 1.1 Turborepo Monorepo Setup (Week 1)

- Initialize Turborepo workspace at repo root
- Configure `pnpm-workspace.yaml` with all package paths
- Create `turbo.json` with build/dev/test/lint pipelines
- Root `package.json` with workspace scripts
- Shared `packages/config/` — ESLint, TypeScript, Tailwind base configs

**Packages scaffolded**:
```
packages/
├── config/         # eslint-config, tsconfig, tailwind.config
├── types/          # Shared TypeScript interfaces (generated from API + manual)
├── validations/    # Zod schemas for all API request/response shapes
├── i18n/           # next-intl message files (en/es/pt) + utilities
├── ui/             # shadcn/ui components + Ordo custom components
├── hooks/          # Shared React hooks
├── stores/         # Zustand stores
├── api-client/     # HTTP client + all resource modules
└── core/           # Domain entities and use-case logic
```

#### 1.2 Design System Implementation (Week 1–2)

- CSS variables: full OKLCH color token set (light + dark theme)
- Tailwind theme extension: all custom tokens, spacing, radius, animation
- `packages/ui/` base component library built on shadcn/ui:
  - **Layout**: Sidebar, Header, PageShell, SectionDivider
  - **Forms**: Input, Textarea, Select, Checkbox, Switch, DatePicker
  - **Feedback**: Button (variants), Badge, Toast, Alert, Spinner, Skeleton
  - **Data display**: Card, Table, Avatar, Tooltip, Popover, Dialog/Modal
  - **Navigation**: Tabs, Breadcrumb, DropdownMenu, CommandPalette
- Section color theming system (cyan/violet/pink/orange/blue/green per section)
- Storybook or equivalent component sandbox (optional but recommended)

#### 1.3 API Client Package (Week 2)

- `packages/api-client/` — Axios or fetch-based HTTP client
  - Base URL configuration, request/response interceptors
  - JWT token storage + silent refresh interceptor
  - Error normalization (typed `ApiError` class)
  - Request cancellation support
- Resource modules: one file per backend domain
  - `auth.ts`, `users.ts`, `workspaces.ts`, `ideas.ts`, `contents.ts`, `series.ts`, `publishing.ts`, `ai.ts`, `analytics.ts`, `gamification.ts`, `sponsorships.ts`, `billing.ts`, `search.ts`
- WebSocket client: event subscription system wrapping Gorilla hub
- React Query integration: typed query hooks per resource (`useIdeas`, `useContents`, etc.)

#### 1.4 Next.js Web App Scaffold (Week 2–3)

- `apps/web/` initialized with Next.js 15 App Router + TypeScript
- Directory structure per `/prd/12-frontend-setup/01-nextjs-project-structure.md`
- `next-intl` configured with `/{locale}/` routing (en/es/pt)
- Middleware for locale detection + auth redirect guard
- Global providers: QueryClientProvider, ThemeProvider, AuthProvider, WorkspaceProvider
- Layout shells: AuthLayout, AppLayout (with sidebar + header)
- Route groups: `(auth)/`, `(app)/`, `(public)/`

#### 1.5 Authentication Flows (Week 3–4)

Pages and flows consuming `/api/v1/auth/*`:

- `/[locale]/login` — Email/password form + "Forgot Password" link
- `/[locale]/register` — Email/password + name
- `/[locale]/auth/callback` — OAuth2 redirect handler (Google, GitHub, Slack)
- `/[locale]/forgot-password` — Email entry
- `/[locale]/reset-password` — Token + new password
- Persistent session: JWT stored in httpOnly cookie (or memory + refresh token in cookie)
- Silent refresh: background token renewal before expiry
- Auth state in Zustand `authStore`: `user`, `isAuthenticated`, `isLoading`
- Route protection middleware: unauthenticated → `/login`

#### 1.6 Workspace Bootstrap (Week 4)

- `/[locale]/workspaces/new` — Create first workspace (triggered post-signup)
- `/[locale]/onboarding` — Guided 3-step wizard: content type selection, publishing goals, optional idea import
- Workspace switcher in header (dropdown showing all user workspaces)
- `workspaceStore` in Zustand: active workspace ID, role, tier
- Workspace context propagated to all API calls via header or query param

### Phase 1 Success Criteria

- [ ] `pnpm dev` starts all packages in watch mode from repo root
- [ ] User can register, log in with email or OAuth, and is redirected to onboarding
- [ ] Onboarding creates a workspace and lands the user on the dashboard shell
- [ ] All design tokens render correctly in light and dark mode
- [ ] i18n works: switching locale changes all UI strings
- [ ] API client successfully calls backend and handles 401 → refresh → retry

### Phase 1 Dependencies

- Backend auth endpoints live (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, OAuth2 callbacks) ✓
- Backend workspace endpoints live ✓
- Design system spec complete ✓

---

## Phase 2: Core Creator Experience — Ideas Capture + Content Pipeline

**Duration**: 5 weeks
**Goal**: The two central creator workflows are fully usable. A creator can go from idea to scheduled content entirely within the web app.

### Deliverables

#### 2.1 Dashboard (Week 5)

- `/[locale]/dashboard` — Home after login
- Widgets:
  - Consistency Score card (% + streak count)
  - Recent pipeline activity (last 5 moves)
  - Ideas captured this week
  - Quick-capture shortcut button
  - Upcoming scheduled content (next 3)
  - XP progress bar + level badge
- All data from: `/analytics/consistency`, `/contents` (recent), `/gamification/profile`
- Skeleton loading states for all widgets

#### 2.2 Ideas — Capture & Management (Week 5–6)

- `/[locale]/ideas` — Full ideas list view
  - Filter bar: status, tags, date range, search
  - Grid/list toggle
  - Sort: newest, impact score, effort score
- Quick Capture:
  - Global `Cmd+K` command palette → inline idea input
  - Floating "+" button on ideas page
  - Input: title + optional description; AI auto-tags on submit
  - POST to `/api/v1/ideas` → optimistic UI update
- Idea card: title, tags (color-coded), status badge, AI validation score, relative timestamp
- Idea detail drawer/modal:
  - Edit title, description, tags
  - Status flow control: ACTIVE → VALIDATED → PROMOTED → GRAVEYARDED
  - Effort vs Impact scoring sliders (Validation Board)
  - AI Expander button: calls `/api/v1/ai/brainstorm` → shows 5 variations
  - AI Validator button: calls `/api/v1/ai/validate` → shows honest critique
  - "Promote to Content" button → POST to pipeline
- Idea Graveyard: `/[locale]/graveyard` — filtered view of GRAVEYARDED ideas with restore action
- Free tier gate: 50 ideas/month counter + upgrade prompt at limit

#### 2.3 Content Pipeline — Kanban (Week 6–7)

- `/[locale]/pipeline` — Kanban board
  - Columns: SCRIPTING, FILMING, EDITING, REVIEW, SCHEDULED, PUBLISHED
  - Drag-and-drop between columns (using `@dnd-kit/core`)
  - Stage change calls PATCH `/api/v1/contents/{id}/stage`
  - Optimistic UI: card moves immediately, reverts on error
- Content card (type-aware):
  - Title, content type icon (Video/Post/Tweet/Podcast), assignee avatar, due date, series badge
  - Stage-specific color accent
- Content detail panel (slide-in drawer):
  - Metadata: title, type, description, tags, assignee, due date, series link
  - Stage stepper
  - Smart checklist (AI-generated): calls `/api/v1/contents/{id}/checklist`
  - Time tracker widget: start/stop session, total time display
  - Asset attachments: file upload via presigned URL `/api/v1/uploads/presigned`
  - Comments thread
- Filter bar: by type, assignee, series, date range
- New content: "+" button → create form (title, type, series optional)
- Batch operations: multi-select → bulk stage change or archive

#### 2.4 Series Management (Week 7–8)

- `/[locale]/series` — Series list (card grid with thumbnails)
- `/[locale]/series/[id]` — Series detail:
  - Episode list (drag to reorder)
  - Publishing schedule (daily/weekly/bi-weekly/monthly)
  - Series thumbnail upload
  - Series tags + description
  - Series performance metrics (aggregate views, consistency)
  - Series duplication button
  - Archive/restore
- Create series modal: title, description, publishing schedule, thumbnail upload
- Content cards in pipeline show series badge → clicking links to series detail

#### 2.5 Publishing & Calendar (Week 8–9)

- `/[locale]/publishing` — Scheduled posts management
  - List of scheduled posts with platform icons, status, scheduled time
  - Filter: platform, status, date range
  - Create social post: title, content, platform(s), media attachment, schedule time
  - Platform-specific metadata: hashtags per platform, captions
  - Calls: POST `/api/v1/publishing/schedule`, GET `/api/v1/publishing/posts`
- `/[locale]/calendar` — Visual publishing calendar
  - Month/week/day views
  - Drag-and-drop rescheduling
  - Click slot → quick-schedule drawer
  - Content type color coding
  - Calls: GET `/api/v1/publishing/calendar`
- Platform credentials status indicator in publishing header (OAuth connections)
- Free tier: manual scheduling only; PRO badge prompt for auto-publish

### Phase 2 Success Criteria

- [ ] Creator can capture idea in < 5 seconds via `Cmd+K`
- [ ] Ideas list renders, filters, and paginates correctly
- [ ] Pipeline kanban renders all stages; drag-and-drop moves content and persists to backend
- [ ] Series can be created, episodes added and reordered
- [ ] Social post can be scheduled and appears on calendar
- [ ] Free tier limits enforced with clear upgrade prompts
- [ ] All pages have skeleton loading and empty states

### Phase 2 Dependencies

- Phase 1 complete (auth, workspace, API client)
- Backend ideas, contents, series, publishing endpoints ✓
- File upload / presigned URL endpoint ✓

---

## Phase 3: Creators Studio AI

**Duration**: 4 weeks
**Goal**: The AI-powered creative layer is functional, bringing the AI copilot, script writing, title lab, and repurposing into the web experience.

### Deliverables

#### 3.1 AI Chat (Week 10)

- `/[locale]/ai-chat` — Conversational AI assistant
  - Full-page chat interface (message list + input)
  - Streaming responses via WebSocket or SSE
  - Message history (session-scoped, stored locally + optional backend persist)
  - Calls: POST `/api/v1/ai/chat`
  - Quick action chips: "Brainstorm ideas", "Write a hook", "Improve this title"
  - Code/markdown rendering in responses
  - Token usage indicator (relevant for Free tier's 50 AI credit limit)

#### 3.2 Brainstormer (Week 10–11)

- Accessible from Ideas page + standalone panel in AI Chat
- Input: topic or keyword
- Output: 10 content angle cards
  - Each card: angle title, 1-sentence description, estimated effort, platform suggestions
  - "Save as Idea" action → POST to ideas
  - "Add to Pipeline" action → POST to contents
- Calls: POST `/api/v1/ai/brainstorm`
- Credit counter: visible, decrements per use; upgrade prompt at 80% usage

#### 3.3 Title / Thumbnail Lab (Week 11)

- Accessible from content detail panel (pipeline) + standalone in Studio
- **Title Lab**:
  - Input: topic, target platform, optional existing draft title
  - Output: 5 title variations with CTR-optimization notes
  - "Copy", "Use This" actions
  - Calls: POST `/api/v1/ai/title-lab`
- **Thumbnail Lab** (planned feature, partial UI):
  - Input: content title + 3 keywords
  - Output: 3 thumbnail concept descriptions (full DALL-E generation is PLANNED; show concept text for now)
- SEO Description Generator:
  - Input: title + outline
  - Output: platform-optimized descriptions (YouTube, LinkedIn, etc.)
  - Calls: POST `/api/v1/ai/seo-description`

#### 3.4 Script Doctor (Week 11–12)

- Accessible from content detail panel when stage = SCRIPTING
- Block-based script editor (lightweight — `@tiptap` or `Lexical`)
  - Plain text blocks + heading blocks
  - Character count, word count, estimated read time
- AI Script Doctor sidebar:
  - Analyze button → calls POST `/api/v1/ai/script-doctor`
  - Returns: retention risk flagged sections, hook strength score, suggested improvements
  - Inline highlight of weak sections
  - One-click "Apply Suggestion" replaces flagged text with AI-generated improvement
- Script version history: save/restore previous drafts
- Script stored in content record via PATCH `/api/v1/contents/{id}`

#### 3.5 Repurposing Engine / Remix (Week 12–13)

- `/[locale]/remix` — Content atomization and repurposing hub
  - Select a published or ready content piece
  - "Remix" button → POST `/api/v1/ai/repurpose`
  - AI returns variants:
    - Twitter/X thread (N tweets)
    - LinkedIn post (professional framing)
    - Instagram carousel (slide outline)
    - TikTok script (60-second hook)
    - Newsletter section (long-form)
  - Each variant shown as editable card
  - "Schedule" action → opens publishing drawer pre-filled with variant content
  - Viral moment detection: timestamps or sections flagged as high-engagement
- Hook Generator:
  - Accessible from script editor sidebar
  - Input: topic + platform
  - Output: 5 platform-specific hook variations
  - Calls: POST `/api/v1/ai/hooks`

#### 3.6 Hashtag + Caption Generator (Week 13)

- Integrated into publishing post creation form
- Hashtag tab: input topic + platform → generates platform-specific hashtag sets
  - Calls: POST `/api/v1/ai/hashtags`
- Caption tab: input content summary + platform → generates caption variants
  - Calls: POST `/api/v1/ai/caption`
- One-click insert into post form field

### Phase 3 Success Criteria

- [ ] AI Chat is responsive and streams responses
- [ ] Brainstormer generates 10 angles and ideas can be saved directly to pipeline
- [ ] Title Lab generates 5 CTR-optimized titles; selected title updates content record
- [ ] Script editor works; Script Doctor highlights weak sections and applies suggestions
- [ ] Remix generates 5 platform variants from a content piece; any variant can be scheduled
- [ ] AI credit counter is visible and accurate; Free tier users see upgrade prompt at limit

### Phase 3 Dependencies

- Phase 1 + 2 complete
- Backend AI endpoints live: brainstorm, title-lab, script-doctor, repurpose, hooks, hashtags, caption, seo-description ✓
- WebSocket hub live for streaming (or SSE fallback if streaming is REST-based) ✓

---

## Phase 4: Growth — Analytics, Gamification, Sponsorships CRM

**Duration**: 4 weeks
**Goal**: The data and monetization layer is usable. Creators can measure consistency, celebrate milestones, and manage brand deals.

### Deliverables

#### 4.1 Analytics Dashboard (Week 14–15)

- `/[locale]/analytics` — Cross-platform analytics hub
  - Date range picker (7d / 30d / 90d / custom; PRO gate on > 7 days)
  - Platform selector (filter by connected platform)
  - Key metrics cards: total views, subscribers gained, engagement rate, average watch time
  - Daily metric chart (line/bar — Chart.js or Recharts)
  - Top content by views table
  - Audience insights: top fans, best engagement time
  - Pipeline velocity: avg days per stage
  - Calls: GET `/api/v1/analytics/metrics`, GET `/api/v1/analytics/audience`, GET `/api/v1/analytics/velocity`
- `/[locale]/consistency` — Consistency hub
  - Consistency Score card (% with sparkline trend)
  - Streak counter with multiplier badge (7d 1.5x → 365d 3.0x)
  - GitHub-style creation heatmap (52 weeks × 7 days grid)
    - Cell color = publishing intensity (0 → 4+ pieces)
    - Hover tooltip: date + pieces published
  - Calls: GET `/api/v1/analytics/consistency`, GET `/api/v1/analytics/heatmap`
- `/[locale]/goals` — Goal setting
  - Create goals: e.g., "Publish 2 videos/week", "Reach 10K subs by June"
  - Progress bars per goal
  - Milestone celebration animations on goal completion

#### 4.2 Gamification (Week 15–16)

- `/[locale]/gamification` — Creator profile gamification view
  - Current level badge + XP progress bar to next level
  - Recent XP transactions list
  - Achievement gallery: unlocked badges (full color) vs locked (greyed out)
  - Active streak display with multiplier
  - Calls: GET `/api/v1/gamification/profile`, GET `/api/v1/gamification/achievements`
- XP toast notifications:
  - After any XP-earning action (idea captured, content published, streak milestone), show a toast: "+45 XP — Streak Multiplier 1.5x applied!"
  - Triggered via WebSocket event `xp_earned`
- Achievement unlock celebration:
  - Full-screen confetti overlay + badge reveal on first unlock
  - Calls: WebSocket event `achievement_unlocked`
- Level-up animation:
  - Modal with new level badge reveal
  - Triggered via WebSocket event `level_up`

#### 4.3 Reports (Week 16)

- `/[locale]/reports` — Report dashboard
  - Pre-built report cards: Weekly Summary, Monthly Summary, Best Content
  - Weekly summary: pieces published, XP earned, consistency score, top platform
  - Monthly summary: growth metrics, top 3 content, income summary
  - Export button (CSV) — PRO gate
  - Calls: GET `/api/v1/analytics/reports`

#### 4.4 Sponsorships CRM (Week 16–17)

- `/[locale]/sponsorships` — Brand deal pipeline
  - Kanban or list view of deals by status: LEAD, NEGOTIATION, SIGNED, DELIVERED, PAID
  - Deal card: brand name, deal value, deliverables count, next deadline
  - Create deal modal: brand name, contact email, deal value, currency, notes
  - Deal detail drawer:
    - Brand info (name, website, contact)
    - Deal value + payment status
    - Deliverables list with checkboxes + due dates
    - Linked content pieces (from pipeline)
    - File attachments (contracts, briefs)
    - Status stepper
  - Brand CRM: brands panel showing all brand contacts
    - Brand card: logo (via Clearbit or fallback), name, total deal value, deal count
  - Income tracker: total revenue by month (bar chart), breakdown by source (sponsorship / other)
  - Calls: GET/POST/PATCH `/api/v1/sponsorships/*`, GET `/api/v1/sponsorships/brands/*`

### Phase 4 Success Criteria

- [ ] Analytics dashboard shows real data for connected platforms
- [ ] Heatmap renders 52-week grid with correct intensity coloring
- [ ] XP toast fires correctly after idea capture and content publish actions
- [ ] Achievement unlock triggers confetti animation on first unlock
- [ ] Sponsorship deal can be created, moved through statuses, deliverables checked off
- [ ] Income chart shows monthly breakdown
- [ ] PRO tier gates (90-day analytics, CSV export) show upgrade prompts for free users

### Phase 4 Dependencies

- Phase 1 + 2 complete (auth, workspace, pipeline)
- Backend analytics, gamification, sponsorships endpoints live ✓
- WebSocket events: `xp_earned`, `achievement_unlocked`, `level_up` ✓

---

## Phase 5: Billing, Settings, Global Polish

**Duration**: 3 weeks
**Goal**: The product is commercially complete. Users can upgrade, manage their account, and every detail of the UX is polished.

### Deliverables

#### 5.1 Billing & Subscription (Week 18)

- `/[locale]/settings/billing` — Billing management page
  - Current plan card: tier name, features list, renewal date, monthly cost
  - Upgrade CTA: "Upgrade to PRO ($12/mo)" or "Upgrade to Enterprise ($29/mo)"
  - Stripe Checkout: opens Stripe-hosted checkout via redirect
    - Calls: POST `/api/v1/billing/checkout` → redirect to Stripe URL
  - Stripe Customer Portal: manage payment method, view invoices, cancel
    - Calls: POST `/api/v1/billing/portal` → redirect to Stripe portal URL
  - Webhook-driven plan update: backend handles Stripe webhooks, frontend reacts via WebSocket event `subscription_updated`
  - Calls: GET `/api/v1/billing/subscription`
- Tier gates globally enforced:
  - `useTier()` hook reads workspace tier from store
  - `<TierGate tier="PRO">` wrapper component — renders upgrade prompt if below required tier
  - Applied to: 90-day analytics, AI credits > 50, workspace count > 1, team invite, auto-publish

#### 5.2 Settings (Week 18–19)

- `/[locale]/settings` — Settings hub (tabbed layout)
  - **Profile**: avatar upload, display name, email, password change
  - **Workspace**: workspace name, description, timezone, content type preferences
  - **Team**: invite members, manage roles (Owner/Admin/Member/Viewer), revoke access
  - **Integrations**: OAuth connection cards (Google Calendar, Slack, GitHub, YouTube, Telegram)
    - Each card: connected status, connect/disconnect button, last sync time
    - Calls: GET `/api/v1/integrations`, POST `/api/v1/integrations/{provider}/connect`
  - **Notifications**: toggle notification types (email, in-app, push)
  - **Billing**: link to billing tab (see 5.1)
  - **Danger Zone**: delete workspace, deactivate account

#### 5.3 Notifications (Week 19)

- Notification bell in header: unread count badge
- Notification panel (slide-in drawer):
  - List of notifications: icon, message, timestamp, read/unread state
  - Types: pipeline stage change, mention, XP earned, achievement, sponsorship deadline, content scheduled
  - Mark all as read, mark individual as read
  - Click notification → navigate to relevant page
  - Calls: GET `/api/v1/notifications`, PATCH `/api/v1/notifications/{id}/read`
- Real-time new notification via WebSocket event `notification`

#### 5.4 Search (Week 19)

- Global search via `Cmd+K` command palette (enhanced from quick-capture)
  - Two modes: (a) Quick Capture (default), (b) Search (type "/" to switch)
  - Search results grouped: Ideas, Content, Series, Sponsorships
  - Keyboard navigation
  - Calls: GET `/api/v1/search?q=...`

#### 5.5 Global UX Polish (Week 20)

- **Empty states**: illustrated empty states for all major lists (Ideas, Pipeline, Sponsorships, Analytics)
- **Error boundaries**: per-page React error boundaries with retry button
- **Loading states**: consistent skeleton loaders for all data-fetching components
- **Transitions**: page-level transitions (fadeInUp, 300ms)
- **Toast system**: unified `useToast()` hook — success, error, warning, info toasts with auto-dismiss
- **Keyboard accessibility audit**: all interactive elements reachable via keyboard; focus ring visible
- **Reduced motion**: all animations wrapped in `prefers-reduced-motion` media query
- **Mobile responsiveness audit**: all pages tested at 320px, 768px, 1280px breakpoints
- **Unified inbox**: `/[locale]/inbox` — social comments/messages aggregator
  - Platform-filtered tabs
  - Reply, star, mark-as-read actions
  - Calls: GET `/api/v1/inbox`

### Phase 5 Success Criteria

- [ ] User can upgrade from Free to PRO via Stripe Checkout; plan updates reflect immediately
- [ ] All tier gates show correct content based on subscription
- [ ] Settings page allows avatar upload, workspace name change, team invite
- [ ] At least 3 integrations can be connected/disconnected
- [ ] Notification bell shows real-time unread count; clicking a notification navigates correctly
- [ ] Global search returns results across all content types
- [ ] All pages pass a basic accessibility audit (keyboard nav, focus visible, color contrast)

### Phase 5 Dependencies

- Phase 1–4 complete
- Backend billing endpoints live (Stripe configured) ✓
- Backend search endpoint live ✓
- Backend notifications endpoint live ✓

---

## Phase 6: Performance, Testing, Deployment Hardening

**Duration**: 4 weeks
**Goal**: The application is production-ready. Performance meets targets, test coverage is sufficient, and CI/CD is fully automated.

### Deliverables

#### 6.1 Performance Optimization (Week 21–22)

**Core Web Vitals targets**:
- LCP < 2.5s (all pages)
- CLS < 0.1 (no layout shift)
- INP < 200ms (all interactions)

**Techniques**:
- Next.js Image optimization: `next/image` for all images, priority flag on above-fold images
- Code splitting: verify no unnecessary large bundles via `@next/bundle-analyzer`
- React Server Components: maximize RSC for data-fetching pages (dashboard, analytics, lists)
- Static generation for marketing/public pages
- React Query caching strategy: staleTime, gcTime tuning per resource type
- Skeleton loaders prevent CLS on async content
- Font optimization: `next/font` for Inter
- Lazy load heavy components: Kanban board, Calendar, Chart.js/Recharts
- WebSocket reconnection strategy: exponential backoff, max 5 retries
- Zustand store cleanup: no stale subscriptions on unmount

#### 6.2 Testing (Week 22–23)

**Unit tests** (Jest + React Testing Library):
- All `packages/api-client` resource modules (mock fetch, test error handling)
- All Zustand stores (state transitions, actions)
- All Zod validation schemas
- Key utility functions in `packages/core`
- Coverage target: 80% for packages

**Component tests** (React Testing Library):
- Design system components: Button, Input, Card, Toast, Modal
- Key feature components: IdeaCard, PipelineCard, CalendarCell, ConsistencyHeatmap
- Test: render, interaction, accessibility (aria roles, labels)

**Integration tests** (React Testing Library + MSW for API mocking):
- Auth flow: register → login → token refresh → logout
- Idea creation flow: Cmd+K → submit → appears in list
- Pipeline flow: create content → drag to next stage → stage persists
- Billing flow: click upgrade → Stripe redirect triggered

**End-to-end tests** (Playwright):
- Happy path: Sign up → onboarding → capture idea → promote to pipeline → schedule content
- Auth: Login with email, login with OAuth (Google — mocked), logout
- Payment: upgrade plan (Stripe test mode)
- Cross-browser: Chromium, Firefox, WebKit

**CI integration**: all tests run in GitHub Actions on every PR; e2e tests run nightly on staging.

#### 6.3 Error Monitoring & Observability (Week 23)

- Sentry integration: `@sentry/nextjs`
  - Capture unhandled errors + rejected promises
  - User context (workspace ID, tier) attached to events
  - Performance monitoring: transaction tracing for key routes
- Custom analytics events (internal, not third-party for now):
  - Track: idea captured, content stage changed, AI credit used, upgrade clicked
  - POST to internal event endpoint or use Sentry custom events
- Structured logging for SSR: consistent log format with request ID

#### 6.4 CI/CD Pipeline (Week 23–24)

**GitHub Actions workflows**:
- `ci.yml`: on PR — lint, type-check, unit tests, component tests
- `e2e.yml`: nightly — Playwright tests against staging
- `deploy-staging.yml`: on merge to `develop` — deploy to staging (Vercel/Railway/Fly.io)
- `deploy-production.yml`: on merge to `main` with manual approval gate — deploy to production

**Environment management**:
- `.env.local` for local dev
- Vercel/platform env vars for staging + production
- No secrets in code; all API keys and Stripe secrets in environment vars

**Deployment targets**:
- Web app: Vercel (Next.js native) or alternative (Railway, Fly.io)
- Static assets: CDN-backed (Vercel Edge Network or CloudFront)
- API base URL: environment-configurable per deployment

#### 6.5 Documentation (Week 24)

- `apps/web/README.md`: local dev setup, env vars, available scripts
- `packages/api-client/README.md`: how to add new resource modules
- `packages/ui/README.md`: how to add new components, naming conventions
- Architecture decision records (ADRs) for key choices: state management, routing, auth token strategy

### Phase 6 Success Criteria

- [ ] Lighthouse score ≥ 90 on Performance, Accessibility, Best Practices for dashboard and ideas pages
- [ ] Unit test coverage ≥ 80% for all packages
- [ ] E2E happy path passes in Chromium, Firefox, and WebKit
- [ ] CI pipeline runs in < 10 minutes on every PR
- [ ] Staging deployment is fully automated on every merge to `develop`
- [ ] Production deployment requires manual approval and completes in < 5 minutes
- [ ] Sentry capturing errors in staging with correct user context

---

## Timeline Summary

| Phase | Name | Weeks | Key Milestones |
|-------|------|-------|----------------|
| 1 | Foundation | 1–4 | Monorepo ready; Auth flows complete; Design system live |
| 2 | Core Creator | 5–9 | Ideas + Pipeline usable; Series + Calendar working |
| 3 | AI Studio | 10–13 | Chat, Brainstormer, Script Doctor, Remix working |
| 4 | Growth | 14–17 | Analytics, heatmap, gamification, sponsorships CRM |
| 5 | Polish | 18–20 | Billing, settings, notifications, search, UX polish |
| 6 | Hardening | 21–24 | Performance, testing, CI/CD, monitoring |

**MVP cutoff** (Phases 1–2, ~9 weeks): A creator can capture ideas, manage the content pipeline, and schedule posts. This is the minimum for a private beta.

**Full feature complete** (Phases 1–5, ~20 weeks): All features except polish-level test coverage and deployment automation.

**Production ready** (All 6 phases, ~24 weeks): Fully tested, monitored, automated.

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Backend API fully live | DONE | 40+ endpoints, auth, WS hub complete |
| API endpoint documentation | DONE | `/prd/10-technical-specs/02-api-endpoints.md` |
| Design system spec | DONE | `/prd/02-design-system/01-foundations.md` |
| Next.js project structure spec | DONE | `/prd/12-frontend-setup/01-nextjs-project-structure.md` |
| Stripe account + webhooks configured on backend | ASSUMED | Verify before Phase 5 |
| OAuth app registrations (Google, GitHub, Slack) | ASSUMED | Verify client IDs available for frontend env |
| S3/MinIO bucket + CORS for browser uploads | ASSUMED | Verify presigned URL CORS headers allow frontend origin |
| Platform OAuth for publishing (YouTube, TikTok, etc.) | BACKEND HANDLED | Frontend only needs to initiate OAuth flow |

---

## Risks

### R1 — Monorepo Complexity Overhead (HIGH likelihood, MEDIUM impact)
Turborepo with 8+ packages creates real build complexity. Package resolution bugs, circular dependencies, and Turborepo cache misses can slow early-phase development.

**Mitigation**: Scaffold packages incrementally. Start with `api-client`, `types`, `ui`, `config` in Phase 1. Add `stores`, `hooks`, `validations`, `core` as needed. Avoid premature abstraction — promote code to shared packages only after it's needed in 2+ places.

### R2 — API Contract Drift (MEDIUM likelihood, HIGH impact)
Backend endpoint shapes may differ from what's documented in the PRD. Any mismatch causes silent failures or type errors.

**Mitigation**: Define Zod schemas from actual API responses (not from documentation alone). Run backend locally during development. Add an integration test that calls the real API against a test database in CI.

### R3 — Drag-and-Drop Performance on Large Boards (MEDIUM likelihood, MEDIUM impact)
`@dnd-kit` with 100+ cards in the pipeline kanban can cause jank, especially with virtual DOM reconciliation during drag.

**Mitigation**: Virtualize kanban columns with `@tanstack/virtual`. Limit initial column fetch to 50 items with "load more". Profile before shipping Phase 2.

### R4 — WebSocket Reliability in Serverless Deployment (MEDIUM likelihood, HIGH impact)
Vercel's serverless architecture doesn't support persistent WebSocket connections. The Gorilla hub on the backend is long-lived; the frontend must connect directly to the backend, not via Next.js API routes.

**Mitigation**: WebSocket connects directly to the backend URL (not proxied through Next.js). Client implements exponential backoff reconnection. Vercel Edge Functions are not used for WS routing.

### R5 — Stripe Integration Complexity (LOW likelihood, HIGH impact)
Stripe Checkout + Customer Portal requires correct webhook handling on backend + correct redirect URL configuration per environment (local/staging/production).

**Mitigation**: Test Stripe integration in Stripe test mode against staging environment before Phase 5 completes. Never test billing against production Stripe in development.

### R6 — i18n Coverage Gaps (MEDIUM likelihood, MEDIUM impact)
Adding i18n from day one is the right call but requires discipline: every string must go through `next-intl`, no hardcoded English in components. With 3 locales and a large feature set, translation files will have coverage gaps.

**Mitigation**: Use TypeScript-strict translation key inference (`useTranslations()` type safety). Add a CI check for missing translation keys. Launch with English + Spanish complete; Portuguese can be partial at launch.

### R7 — Free Tier Gate Consistency (MEDIUM likelihood, MEDIUM impact)
With tier gates spread across 30+ features, inconsistent enforcement creates both UX confusion and potential for users to access paid features without upgrading.

**Mitigation**: Centralize tier logic in a single `useTier()` hook + `<TierGate>` component. Never hard-code tier checks inline. Add a "tier audit" step to Phase 5 QA that walks every gated feature.

### R8 — Team Bandwidth (MEDIUM likelihood, HIGH impact)
24 weeks is achievable with 2–3 senior frontend engineers. With 1 engineer, the timeline extends to 40+ weeks. The roadmap is deliberately phased so MVP (Phases 1–2) can ship to beta at week 9 regardless of team size.

**Mitigation**: Phases are designed as independent vertical slices. If bandwidth is constrained, defer Phase 3 (AI Studio) or Phase 4 (Growth) without breaking the core experience.

---

## Success Criteria (Overall)

| Metric | Target | How Measured |
|--------|--------|--------------|
| Time to first idea captured (new user) | < 3 minutes from landing page | User testing sessions |
| Core Web Vitals — LCP | < 2.5s | Lighthouse CI |
| Core Web Vitals — CLS | < 0.1 | Lighthouse CI |
| Core Web Vitals — INP | < 200ms | Lighthouse CI |
| Unit test coverage (packages) | ≥ 80% | Jest coverage report |
| E2E happy path pass rate | 100% (Chromium, Firefox, WebKit) | Playwright CI |
| Accessibility score | ≥ 90 (Lighthouse) | Lighthouse CI |
| Sentry error rate at launch | < 0.1% of sessions | Sentry dashboard |
| PRO upgrade flow completion | > 60% of users who click "Upgrade" | Stripe analytics |

---

## Alternatives Considered

### Alt 1: Build Without a Monorepo (Single `apps/web` Repo)

**Rejected because**: The PRD explicitly specifies mobile (React Native) and desktop (Electron) apps as future platforms. The shared `api-client`, `ui`, `types`, and `i18n` packages will be consumed by all three platforms. Building them as part of a monorepo now avoids a painful migration later.

### Alt 2: Vite + React SPA Instead of Next.js

**Rejected because**: The PRD explicitly specifies Next.js with App Router. RSC provides meaningful benefits for data-heavy pages (dashboard, analytics). SSR improves SEO for public marketing pages. `next/image` and `next/font` solve performance concerns out of the box.

### Alt 3: Skip i18n in Initial Phases, Add Later

**Rejected because**: Retrofitting i18n onto an existing codebase with 30+ pages is extremely painful (every string must be extracted). Adding it from Phase 1 adds modest overhead per component but avoids a major refactor. The Spanish-language brand tagline ("Consistencia es la unica metrica que importa") signals a multilingual audience from day one.

### Alt 4: Use Server Components for Everything, No Client State

**Rejected because**: The kanban board, real-time WebSocket updates, AI streaming responses, and drag-and-drop interactions fundamentally require client-side state. A hybrid RSC + client component approach (RSC for data fetching, client components for interactivity) is the correct architecture.

---

## Recommended Next Steps

1. **Approve this proposal** or request changes.
2. **Run `sdd-spec`** to produce the detailed functional specification (API contracts, component interfaces, state machine definitions) for Phase 1 + 2.
3. **Run `sdd-design`** to produce the technical design (architecture diagrams, package dependency graph, data flow, component hierarchy).
4. **Run `sdd-tasks`** to generate the atomic task list for Phase 1 implementation.
5. **Start Phase 1** — monorepo scaffold and design system can begin immediately; no additional approvals needed.

---

*This proposal reflects the full scope of the Ordo Creator OS frontend web application. The backend is done. The creative work begins now.*
