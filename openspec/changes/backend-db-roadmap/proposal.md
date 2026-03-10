# Proposal: Ordo Creator OS — Backend + DB Development Roadmap

**Change:** `backend-db-roadmap`
**Project:** `creators_os`
**Date:** 2026-03-10
**Status:** Proposed

---

## Executive Summary

This roadmap defines a **6-phase backend-first development plan** for Ordo Creator OS. The constraint is absolute: no frontend work begins until all backend phases are complete and verified. Each phase is independently deployable (behind feature flags or internal tooling) and has its own integration test suite. Phases are ordered by dependency depth and value unlock — earlier phases unblock the most downstream work.

The total scope covers:
- 25+ PostgreSQL tables with migrations
- 40+ HTTP endpoints across 16 modules
- Async job infrastructure (Asynq/Redis)
- AI routing layer (Claude + GPT-4)
- Real-time WebSocket infrastructure
- Stripe billing integration
- S3/MinIO file storage
- Full test coverage with testcontainers-go

---

## Constraints & Principles

1. **Backend-first, always.** Frontend is blocked until Phase 6 (Backend Complete) sign-off.
2. **Independently testable phases.** Each phase ships with integration tests using testcontainers-go (real Postgres + Redis in CI).
3. **Migrations are append-only.** No destructive schema changes after a phase is committed to main.
4. **Feature-flagged where needed.** Incomplete features gate behind config flags, not code removal.
5. **Clean Architecture boundaries are hard.** Domain layer has zero external deps. Repository layer has zero business logic.
6. **sqlc over raw SQL strings.** All queries go through sqlc-generated code. No `database/sql` raw queries in service or handler layers.

---

## Phase Dependency Graph

```
Phase 1: Foundation
       ↓
Phase 2: Auth & Identity
       ↓
Phase 3: Workspaces & RBAC
       ↓
Phase 4: Core Content Platform
  ├── Ideas Module
  ├── Content Pipeline (Kanban)
  ├── Series & Episodes
  └── File Uploads (S3/MinIO)
       ↓
Phase 5: Intelligence & Integrations
  ├── AI / Creators Studio
  ├── Remix Engine
  ├── Publishing & Platform Creds
  ├── Analytics (cross-platform)
  ├── Gamification
  ├── Sponsorships CRM
  ├── Billing (Stripe)
  └── WebSocket / Real-time
       ↓
Phase 6: Hardening & Global Features
  ├── Global Search
  ├── Audit Logs
  ├── Rate limiting (per-tier)
  ├── Load/stress testing
  └── Backend sign-off → Frontend unblocked
```

---

## Phase 1: Foundation

**Goal:** Working Go service skeleton. Everything compiles, connects, and is observable. No domain logic yet.

**Duration estimate:** 1–2 weeks

### Deliverables

#### Project Scaffold
- `cmd/api/main.go` — entry point, signal handling, graceful shutdown
- `cmd/api/wire.go` + `wire_gen.go` — Wire DI provider graph
- `internal/config/` — typed config via env vars (Viper or envconfig), validated at startup
- `internal/server/` — Chi router setup, server struct, `Start()` / `Shutdown()`

#### Infrastructure Connections
- PostgreSQL connection pool (`pgxpool`) with health check
- Redis connection (go-redis v9) with health check
- MinIO client (dev) / AWS S3 client (prod) — selectable by config flag
- All connections verified at startup; service refuses to start on failed health check

#### Observability
- Structured logging (zerolog or slog) — request ID propagation, level config
- Prometheus metrics endpoint (`/metrics`)
- Health check endpoint (`GET /health`) — returns DB, Redis, S3 liveness
- Readiness endpoint (`GET /ready`) — same, used by ECS health checks

#### Middleware Stack (Chi)
- Request ID injection
- Structured request/response logging
- Recovery (panic → 500, logged with stack trace)
- CORS (configurable origins)
- Timeout middleware (configurable per-route default)

#### Migration Infrastructure
- `golang-migrate` wired into startup (auto-migrate on boot in dev, explicit CLI in prod)
- `migrations/` directory initialized with `000001_init.sql` (empty baseline)
- Makefile targets: `migrate-up`, `migrate-down`, `migrate-create`

#### CI Pipeline
- GitHub Actions workflow: `go build`, `go vet`, `staticcheck`, `go test ./...`
- Docker Compose for local dev: postgres, redis, minio containers
- `testcontainers-go` base test helper (`tests/testutil/`) — spins up real Postgres + Redis per test suite

### Exit Criteria
- `GET /health` returns 200 with all backends green
- `go test ./...` passes with zero failures
- Docker Compose brings up full local stack with `make dev`

---

## Phase 2: Auth & Identity

**Goal:** Secure, complete authentication layer. JWT RS256 + OAuth. All subsequent phases depend on the authenticated user context.

**Duration estimate:** 2–3 weeks

### Database Tables
```sql
-- users
id UUID (v7), email, password_hash, full_name, avatar_url,
subscription_tier (free/pro/enterprise), ai_credits_balance,
streak_current, streak_longest, last_active_at,
oauth_provider, oauth_provider_id,
is_email_verified, email_verification_token,
created_at, updated_at, deleted_at (soft delete)

-- user_sessions
id UUID (v7), user_id FK, refresh_token_hash,
device_info JSONB, ip_address, expires_at,
revoked_at, created_at
```

### API Endpoints
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
GET  /api/v1/auth/oauth/{provider}          (Google, GitHub, Apple)
GET  /api/v1/auth/oauth/{provider}/callback
GET  /api/v1/users/me
PUT  /api/v1/users/me
PUT  /api/v1/users/me/preferences
```

### Key Implementation Details
- JWT RS256: `internal/auth/` package — `GenerateAccessToken`, `GenerateRefreshToken`, `ValidateToken`
- RS256 key pair loaded from config (PEM files or env vars)
- Access token: 15min TTL, contains `user_id`, `email`, `subscription_tier`
- Refresh token: 7-day TTL, stored as SHA-256 hash in `user_sessions`
- Refresh rotation: old token invalidated on use, new pair issued
- OAuth: `golang.org/x/oauth2` — PKCE flow, state param CSRF protection
- Password: bcrypt cost 12
- Email verification: time-limited token (24h), sent via job queue (Asynq)
- Auth middleware: `internal/middleware/auth.go` — validates JWT, injects `UserClaims` into context
- Rate limiting on auth endpoints: 5 attempts/min per IP (Redis sliding window)

### sqlc Queries (examples)
- `GetUserByEmail`, `GetUserByID`, `CreateUser`, `UpdateUser`, `SoftDeleteUser`
- `CreateSession`, `GetSessionByTokenHash`, `RevokeSession`, `RevokeAllUserSessions`

### Asynq Jobs
- `EmailVerificationJob` — sends verification email
- `PasswordResetJob` — sends reset email
- `job/worker.go` — Asynq server setup, queue registration

### Tests
- Unit: JWT generation/validation, password hashing
- Integration: full register → login → refresh → logout cycle against real Postgres
- Integration: OAuth callback mock (httptest)
- Integration: session revocation, token replay attack prevention

### Exit Criteria
- Full auth cycle passes integration tests
- JWT auth middleware rejects expired/tampered tokens with correct error codes
- Refresh token rotation prevents replay attacks (tested)
- Rate limiting on login verified

---

## Phase 3: Workspaces & RBAC

**Goal:** Multi-tenant workspace layer. All content in later phases belongs to a workspace. RBAC enforced at middleware level.

**Duration estimate:** 2 weeks

### Database Tables
```sql
-- workspaces
id UUID (v7), name, slug (unique), owner_id FK,
plan_tier, logo_url, settings JSONB,
created_at, updated_at, deleted_at

-- workspace_members
id UUID (v7), workspace_id FK, user_id FK,
role (owner/admin/editor/viewer),
invited_by FK, joined_at, created_at
UNIQUE (workspace_id, user_id)

-- workspace_invitations
id UUID (v7), workspace_id FK, invited_by FK,
email, role, token (unique), expires_at,
accepted_at, created_at
```

### API Endpoints
```
POST   /api/v1/workspaces
GET    /api/v1/workspaces
GET    /api/v1/workspaces/{workspaceId}
PUT    /api/v1/workspaces/{workspaceId}
DELETE /api/v1/workspaces/{workspaceId}
GET    /api/v1/workspaces/{workspaceId}/members
POST   /api/v1/workspaces/{workspaceId}/members/{userId}/role
DELETE /api/v1/workspaces/{workspaceId}/members/{userId}
POST   /api/v1/workspaces/{workspaceId}/invitations
GET    /api/v1/workspaces/{workspaceId}/invitations
DELETE /api/v1/workspaces/{workspaceId}/invitations/{invitationId}
POST   /api/v1/workspaces/invitations/{token}/accept
```

### RBAC Design
- `internal/middleware/workspace.go` — `RequireWorkspaceMember`, `RequireRole(roles ...Role)` middleware
- Workspace context injected into Chi context after auth middleware
- Role hierarchy: `owner > admin > editor > viewer`
- Owner cannot be removed; ownership transfer requires explicit endpoint
- RLS (Row-Level Security) considered for Postgres but implemented at app layer first for flexibility

### Key Logic
- Slug auto-generated from workspace name (unique, retried on collision)
- Free tier: 1 workspace, 3 members max; enforced in service layer
- Invitation email dispatched via Asynq
- Invitation token: URL-safe random 32 bytes, 7-day expiry

### Tests
- RBAC: viewer cannot call editor-only endpoints (403 verified)
- Invitation: full invite → accept cycle
- Member limits per tier enforced

### Exit Criteria
- All workspace endpoints pass integration tests
- RBAC middleware correctly gates all routes
- Multi-workspace user can switch context cleanly

---

## Phase 4: Core Content Platform

**Goal:** The primary value surface — ideas, content pipeline, series, and file uploads. This is the heart of the product.

**Duration estimate:** 4–5 weeks

### 4a: Ideas Module (Week 1)

#### Database Tables
```sql
-- ideas
id UUID (v7), workspace_id FK, created_by FK,
title, description, status (draft/validated/promoted),
platform_target (text[]), content_type,
validation_score NUMERIC, promoted_to_content_id FK,
created_at, updated_at, deleted_at

-- idea_validation_scores
id UUID (v7), idea_id FK,
originality_score, audience_fit_score, trend_alignment_score,
monetization_potential_score, overall_score,
ai_reasoning TEXT, scored_at, scored_by_model

-- idea_tags
idea_id FK, tag TEXT
PRIMARY KEY (idea_id, tag)
```

#### API Endpoints
```
POST   /api/v1/workspaces/{workspaceId}/ideas
GET    /api/v1/workspaces/{workspaceId}/ideas
GET    /api/v1/workspaces/{workspaceId}/ideas/{ideaId}
PUT    /api/v1/workspaces/{workspaceId}/ideas/{ideaId}
DELETE /api/v1/workspaces/{workspaceId}/ideas/{ideaId}
POST   /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/validate
POST   /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/promote
PUT    /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/tags
```

#### Key Logic
- `validate` endpoint triggers AI scoring (async via Asynq job `IdeaValidationJob`)
- Validation result stored in `idea_validation_scores`; idea status updated to `validated`
- `promote` creates a `content` record from the idea and sets `promoted_to_content_id`

---

### 4b: Content Pipeline — Kanban (Weeks 2–3)

#### Database Tables
```sql
-- contents
id UUID (v7), workspace_id FK, idea_id FK (nullable),
created_by FK, assigned_to FK,
title, description, content_type,
status (idea/scripting/recording/editing/review/scheduled/published),
platform_target (text[]), tags (text[]),
thumbnail_url, video_url, script_url,
metadata JSONB, due_date, published_at,
created_at, updated_at, deleted_at

-- content_assignments
id UUID (v7), content_id FK, assigned_by FK, assigned_to FK,
role (writer/editor/reviewer/publisher),
assigned_at, completed_at, notes

-- content_analytics (partitioned by month)
id UUID (v7), content_id FK, workspace_id FK,
platform, views, likes, comments, shares, saves,
watch_time_seconds, revenue NUMERIC,
recorded_at, created_at
PARTITION BY RANGE (recorded_at)
```

#### API Endpoints
```
POST   /api/v1/workspaces/{workspaceId}/contents
GET    /api/v1/workspaces/{workspaceId}/contents          (filter: status, assignee, platform)
GET    /api/v1/workspaces/{workspaceId}/contents/{contentId}
PUT    /api/v1/workspaces/{workspaceId}/contents/{contentId}
DELETE /api/v1/workspaces/{workspaceId}/contents/{contentId}
PUT    /api/v1/workspaces/{workspaceId}/contents/{contentId}/status
POST   /api/v1/workspaces/{workspaceId}/contents/{contentId}/assignments
GET    /api/v1/workspaces/{workspaceId}/contents/{contentId}/assignments
```

#### Key Logic
- Status machine: transitions validated in service layer (not arbitrary jumps)
- Kanban view: `GET /contents` with `group_by=status` returns bucketed response
- Partition management: monthly `content_analytics` partitions auto-created via scheduled Asynq job
- Assignment notifications: Asynq job dispatches in-app notification (WebSocket in Phase 5)

---

### 4c: Series & Episodes (Week 3)

#### Database Tables
```sql
-- series
id UUID (v7), workspace_id FK, created_by FK,
title, description, platform_target (text[]),
thumbnail_url, status (active/paused/completed),
episode_count INT, created_at, updated_at

-- series_episodes
id UUID (v7), series_id FK, content_id FK (nullable),
episode_number INT, title, description,
status, scheduled_at, published_at, created_at

-- series_publishing_schedule
id UUID (v7), series_id FK,
frequency (weekly/biweekly/monthly/custom),
day_of_week INT, time_of_day TIME,
next_publish_at, is_active, created_at, updated_at
```

#### API Endpoints
```
POST   /api/v1/workspaces/{workspaceId}/series
GET    /api/v1/workspaces/{workspaceId}/series
GET    /api/v1/workspaces/{workspaceId}/series/{seriesId}
PUT    /api/v1/workspaces/{workspaceId}/series/{seriesId}
DELETE /api/v1/workspaces/{workspaceId}/series/{seriesId}
POST   /api/v1/workspaces/{workspaceId}/series/{seriesId}/episodes
GET    /api/v1/workspaces/{workspaceId}/series/{seriesId}/episodes
PUT    /api/v1/workspaces/{workspaceId}/series/{seriesId}/episodes/{episodeId}
PUT    /api/v1/workspaces/{workspaceId}/series/{seriesId}/schedule
```

---

### 4d: File Uploads — S3/MinIO (Week 4)

#### Key Design: Presigned URLs (no server-side streaming)
```
POST /api/v1/uploads/presign     → returns { upload_url, object_key, expires_at }
POST /api/v1/uploads/confirm     → client calls after direct upload; server verifies object exists
GET  /api/v1/uploads/{objectKey} → returns signed download URL (short TTL)
```

#### Key Logic
- Server generates presigned PUT URL (S3 or MinIO, config-driven)
- Client uploads directly to object storage — server never proxies bytes
- `confirm` call: server does `HeadObject` to verify upload succeeded, then stores metadata
- Object keys: `{workspace_id}/{content_type}/{uuid_v7}.{ext}`
- Allowed MIME types validated server-side before presign
- File size limits enforced via S3 content-length-range condition on presigned URL

### Phase 4 Exit Criteria
- Full ideas CRUD + AI validation pipeline (async) tested
- Content kanban with status transitions integration-tested
- Series + episode management tested
- Presigned upload + confirm round-trip tested against real MinIO (testcontainers)

---

## Phase 5: Intelligence & Integrations

**Goal:** AI layer, publishing integrations, analytics ingestion, gamification, billing, real-time events.

**Duration estimate:** 6–8 weeks

### 5a: AI / Creators Studio (Weeks 1–2)

#### Database Tables
```sql
-- ai_conversations
id UUID (v7), workspace_id FK, user_id FK,
title, mode (chat/brainstorm/script/analysis),
context_content_id FK (nullable),
created_at, updated_at, deleted_at

-- ai_messages
id UUID (v7), conversation_id FK,
role (user/assistant/system),
content TEXT, model_used, tokens_input INT, tokens_output INT,
created_at

-- ai_credit_usage
id UUID (v7), user_id FK, workspace_id FK,
conversation_id FK, message_id FK,
credits_consumed NUMERIC, model_used,
operation_type, created_at
```

#### API Endpoints
```
POST   /api/v1/ai/conversations
GET    /api/v1/ai/conversations
GET    /api/v1/ai/conversations/{conversationId}
DELETE /api/v1/ai/conversations/{conversationId}
POST   /api/v1/ai/conversations/{conversationId}/messages
GET    /api/v1/ai/conversations/{conversationId}/messages
POST   /api/v1/ai/brainstorm        (stateless, no conversation stored)
POST   /api/v1/ai/script-generate
POST   /api/v1/ai/content-analyze
POST   /api/v1/ai/credits/balance
```

#### AI Routing Layer (`internal/ai/`)
- `Provider` interface: `Complete(ctx, req) (Response, error)`
- `ClaudeProvider` — Anthropic SDK, claude-3-5-sonnet default
- `OpenAIProvider` — OpenAI SDK, gpt-4o default
- `Router`: primary = Claude, fallback = OpenAI on 429/5xx
- Credit deduction: atomic Postgres update `WHERE ai_credits_balance >= cost`
- Streaming: SSE (`text/event-stream`) for `POST /messages` — chunked response
- Token counting: estimate before call, reconcile actual after

---

### 5b: Remix Engine (Week 2)

**Purpose:** Transform long-form video metadata into multi-platform short-form content plans.

#### API Endpoints
```
POST /api/v1/remix/analyze          → submit video for analysis (async job)
GET  /api/v1/remix/{jobId}/status   → poll job status
GET  /api/v1/remix/{jobId}/results  → retrieve remix suggestions
POST /api/v1/remix/{jobId}/apply    → create content records from selected suggestions
```

#### Key Logic
- Async: `RemixAnalysisJob` dispatched via Asynq
- AI layer called with video transcript/metadata; returns structured clip suggestions
- Results stored in JSONB on a `remix_jobs` table (add to Phase 4 migration)
- `apply` creates `contents` records for selected clips

---

### 5c: Publishing & Platform Integrations (Weeks 3–4)

#### Database Tables
```sql
-- platform_credentials
id UUID (v7), workspace_id FK, user_id FK,
platform (youtube/tiktok/instagram/twitter/linkedin),
access_token_enc TEXT (AES-256-GCM encrypted),
refresh_token_enc TEXT,
token_expires_at, scopes (text[]),
channel_id, channel_name, created_at, updated_at

-- scheduled_posts
id UUID (v7), workspace_id FK, content_id FK,
platform_credential_id FK,
platform, scheduled_at, status (pending/publishing/published/failed),
platform_post_id, error_message,
created_at, updated_at
```

#### API Endpoints
```
GET  /api/v1/publishing/calendar              (date-range query)
POST /api/v1/publishing/schedule
PUT  /api/v1/publishing/schedule/{postId}
DELETE /api/v1/publishing/schedule/{postId}
POST /api/v1/publishing/credentials           (OAuth connect)
GET  /api/v1/publishing/credentials
DELETE /api/v1/publishing/credentials/{credId}
```

#### Key Logic
- Platform OAuth flows: each platform has its own OAuth2 config
- Token storage: encrypted at rest (AES-256-GCM, key from AWS KMS or env)
- `PublishJob` (Asynq): runs at scheduled time, calls platform API, updates status
- Token refresh: automatic before publish if within 5-min expiry window
- Calendar endpoint: joins `scheduled_posts` with `contents`, returns by date

---

### 5d: Analytics (Week 4)

#### Database Tables
```sql
-- platform_analytics
id UUID (v7), workspace_id FK, platform_credential_id FK,
platform, followers_count, total_views, total_revenue NUMERIC,
engagement_rate NUMERIC, recorded_at, created_at
```

#### API Endpoints
```
GET /api/v1/analytics/overview           (workspace summary)
GET /api/v1/analytics/content/{contentId}
GET /api/v1/analytics/platform/{platform}
POST /api/v1/analytics/sync              (trigger manual sync)
```

#### Key Logic
- `AnalyticsSyncJob` (Asynq, scheduled daily): fetches metrics from platform APIs
- Writes to `content_analytics` (partitioned) + `platform_analytics`
- Partition creation job runs monthly (add to cron-style Asynq periodic tasks)

---

### 5e: Gamification (Week 5)

#### Database Tables
```sql
-- consistency_scores
id UUID (v7), user_id FK, workspace_id FK,
score NUMERIC, streak_days INT, posts_this_week INT,
calculated_at

-- achievements
id UUID (v7), key (unique), name, description,
icon_url, points INT, criteria JSONB, created_at

-- user_stats
id UUID (v7), user_id FK, workspace_id FK,
total_points INT, level INT,
achievements_unlocked (text[]),
content_published_count INT,
ideas_created_count INT,
updated_at
```

#### API Endpoints
```
GET /api/v1/gamification/stats
GET /api/v1/gamification/achievements
GET /api/v1/gamification/leaderboard    (workspace scoped)
```

#### Key Logic
- `ConsistencyScoreJob` (Asynq, daily): recalculates scores, updates streaks on `users` table
- Achievement unlock: checked after content publish, idea creation, streak milestone events
- Unlock notification dispatched via WebSocket (Phase 5f)

---

### 5f: Sponsorships CRM (Week 5)

#### Database Tables
```sql
-- sponsorships
id UUID (v7), workspace_id FK, created_by FK,
brand_name, contact_name, contact_email, contact_phone,
status (lead/negotiating/active/completed/declined),
deal_value NUMERIC, currency,
platform_target (text[]), deliverables JSONB,
contract_url, start_date, end_date,
notes TEXT, created_at, updated_at

-- sponsorship_messages
id UUID (v7), sponsorship_id FK, sent_by FK,
direction (inbound/outbound), channel (email/call/message),
subject, body TEXT, sent_at, created_at
```

#### API Endpoints
```
POST   /api/v1/sponsorships
GET    /api/v1/sponsorships           (filter: status, date range)
GET    /api/v1/sponsorships/{id}
PUT    /api/v1/sponsorships/{id}
DELETE /api/v1/sponsorships/{id}
POST   /api/v1/sponsorships/{id}/messages
GET    /api/v1/sponsorships/{id}/messages
```

---

### 5g: Billing — Stripe (Week 6)

#### Key Design
- No billing tables in app DB — Stripe is the source of truth for payment state
- Minimal local state: `subscription_tier` + `stripe_customer_id` on `users` table

#### API Endpoints
```
POST /api/v1/billing/checkout           → create Stripe Checkout session
POST /api/v1/billing/portal             → create Stripe Customer Portal session
GET  /api/v1/billing/subscription       → current subscription status
POST /api/v1/billing/webhooks           → Stripe webhook handler (HMAC verified)
```

#### Webhook Events Handled
- `customer.subscription.created` → update user `subscription_tier`
- `customer.subscription.updated` → update tier + AI credits allocation
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → send notification, grace period logic

---

### 5h: WebSocket — Real-time Events (Week 7)

#### Key Design
- Single `/ws` endpoint, authenticated via JWT query param or cookie
- Hub pattern: `internal/ws/hub.go` — goroutine-safe client registry
- Events pushed to connected clients: content status updates, assignment notifications, AI credit deductions, achievement unlocks

#### API
```
GET /api/v1/ws?token={jwt}         → upgrade to WebSocket
```

#### Event Envelope
```json
{
  "event": "content.status_changed",
  "workspace_id": "...",
  "payload": { ... },
  "timestamp": "..."
}
```

#### Key Logic
- Gorilla WebSocket: read pump + write pump goroutines per connection
- Hub routes events by `workspace_id`
- Service layer calls `hub.Broadcast(workspaceID, event)` — no direct WS coupling in domain
- Heartbeat: ping/pong every 30s, connection closed on timeout

### Phase 5 Exit Criteria
- AI routing with fallover integration-tested (mock provider stubs)
- Credit deduction race condition tested (concurrent requests against same balance)
- Publishing job schedule + execute cycle tested
- Stripe webhook handler integration-tested with Stripe CLI test events
- WebSocket hub integration-tested (concurrent client broadcast)

---

## Phase 6: Hardening & Backend Sign-off

**Goal:** Production readiness. Global search, audit trail, rate limiting per subscription tier, performance testing. After this phase, frontend development is unblocked.

**Duration estimate:** 2–3 weeks

### 6a: Global Search

#### Design
- PostgreSQL full-text search using `tsvector` columns + GIN indexes (no external search engine needed at MVP scale)
- Tables searched: `ideas`, `contents`, `series`, `sponsorships`
- `search_vector tsvector` generated column on each searchable table
- `GET /api/v1/search?q=...&workspace_id=...&types=ideas,contents`
- Result ranked by `ts_rank`, paginated

### 6b: Audit Logs

#### Database Table
```sql
-- activity_logs
id UUID (v7), workspace_id FK, user_id FK,
action TEXT, entity_type, entity_id UUID,
old_value JSONB, new_value JSONB,
ip_address, user_agent, created_at
PARTITION BY RANGE (created_at)   -- monthly partitions
```

#### Design
- Written by service layer (not triggers) to keep logic in Go, not DB
- `AuditService.Log(ctx, entry)` — non-blocking, async write via channel + batch insert
- `GET /api/v1/workspaces/{workspaceId}/audit-logs` (owner/admin only)

### 6c: Per-Tier Rate Limiting

Tiers: Free / Pro / Enterprise

| Endpoint Group      | Free     | Pro      | Enterprise |
|---------------------|----------|----------|------------|
| Auth                | 5/min    | 10/min   | 20/min     |
| AI messages         | 10/hour  | 100/hour | 500/hour   |
| Content writes      | 20/hour  | 200/hour | unlimited  |
| Analytics sync      | 1/day    | 4/day    | 24/day     |
| File uploads        | 5/day    | 50/day   | 500/day    |

- Redis sliding window counter, key: `ratelimit:{tier}:{user_id}:{endpoint_group}:{window}`
- Middleware reads `subscription_tier` from JWT claims (no DB hit per request)

### 6d: Performance & Load Testing
- k6 load test suite: `tests/load/`
- Baseline targets:
  - Auth endpoints: p99 < 200ms at 500 RPS
  - Content list: p99 < 100ms at 1000 RPS (Redis cache for workspace queries)
  - AI endpoints: p99 < 5s (AI provider latency dominates; measure separately)
- Redis caching layer: workspace member list (TTL 5min), user profile (TTL 1min)
- Connection pool tuning: pgxpool `MaxConns` tuned to RDS instance class

### 6e: Security Hardening
- OWASP Top 10 review checklist
- SQL injection: impossible via sqlc (all queries parameterized at codegen time)
- XSS: not applicable (API-only, no HTML rendering)
- IDOR: every repository query filters by `workspace_id` from JWT context, not URL param alone
- Secrets rotation: all tokens (OAuth, Stripe webhook, JWT keys) rotatable without downtime
- `Makefile` target: `security-scan` — runs `govulncheck` + `gosec`

### Phase 6 Exit Criteria
- Global search returns correct ranked results (integration tested)
- Audit log records every mutating operation (verified by test assertions)
- Rate limits enforced per tier (integration tested with Redis)
- Load tests pass at baseline targets
- `govulncheck` + `gosec` clean
- **Backend sign-off document signed → Frontend development unblocked**

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI provider rate limits or outages | Medium | High | Dual-provider routing (Claude primary, GPT-4 fallback); circuit breaker in `ai.Router` |
| Platform API credential encryption key management | Medium | Critical | Use AWS KMS from day one, even in dev (localstack); never store plaintext tokens |
| `content_analytics` partition growth | Low | Medium | Monthly partition job + partition pruning policy; monitor partition sizes in Phase 5 |
| Stripe webhook replay attacks | Low | High | Idempotency key stored in Redis (5-min window); Stripe signature HMAC verified |
| WebSocket hub memory leak (connection cleanup) | Medium | Medium | Explicit `defer hub.Unregister(client)` on disconnect; connection limit per workspace |
| Refresh token replay (stolen token) | Low | Critical | Token hash stored (not plaintext); one-use rotation; revoke-all endpoint for compromise response |
| sqlc query drift (schema vs. generated code) | Low | Medium | CI enforces `sqlc generate` is up to date (diff check in GitHub Actions) |
| Test coverage gaps in async jobs | Medium | Medium | Asynq test helpers; integration tests inject job directly into handler, bypass queue |
| ECS Fargate cold start latency | Low | Low | Minimal dependencies, fast Go startup; health check grace period configured in task def |
| Over-engineered auth before core value | Low | Medium | Phase ordering deliberately puts auth before content — but auth scope is fixed; no feature creep |

---

## Summary Table

| Phase | Focus | Est. Duration | Unblocks |
|-------|-------|---------------|----------|
| 1 | Foundation (scaffold, infra, CI) | 1–2 weeks | Everything |
| 2 | Auth & Identity (JWT, OAuth, sessions) | 2–3 weeks | Phases 3–6 |
| 3 | Workspaces & RBAC | 2 weeks | Phases 4–6 |
| 4 | Core Content (ideas, kanban, series, uploads) | 4–5 weeks | Phase 5 |
| 5 | Intelligence & Integrations (AI, publishing, analytics, billing, WS) | 6–8 weeks | Phase 6 |
| 6 | Hardening & Backend Sign-off | 2–3 weeks | **Frontend unblocked** |
| **Total** | | **17–23 weeks** | |

---

## Next Recommended Steps

1. **`/sdd-spec backend-db-roadmap`** — produce detailed technical specs per module (DB schema DDL, sqlc query files, handler signatures, error codes)
2. **`/sdd-design backend-db-roadmap`** — produce architecture design doc (package structure, DI graph, interface definitions, data flow diagrams)
3. **`/sdd-tasks backend-db-roadmap`** — break each phase into discrete, assignable implementation tasks with acceptance criteria
4. Start Phase 1 scaffold immediately — it has zero dependencies and unblocks all parallel planning work

---

*Generated by sdd-propose | Ordo Creator OS | 2026-03-10*
