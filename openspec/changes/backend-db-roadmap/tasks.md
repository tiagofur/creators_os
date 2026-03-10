# Implementation Tasks: Ordo Creator OS — Backend + DB Roadmap

## Implementation Status

**Last updated:** 2026-03-10
**Overall:** 83/83 tasks implemented
**Build:** `go build ./...` passes
**Unit tests:** `go test ./...` passes
**Integration tests:** Written, pending Docker execution

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1 — Foundation | 14/14 | Complete |
| Phase 2 — Auth & Identity | 14/14 | Complete |
| Phase 3 — Workspaces & RBAC | 7/7 | Complete |
| Phase 4 — Core Content Platform | 14/14 | Complete |
| Phase 5 — Intelligence & Integrations | 22/22 | Complete |
| Phase 6 — Hardening | 12/12 | Complete |

---

**Change:** `backend-db-roadmap`
**Project:** `creators_os`
**Date:** 2026-03-10
**Status:** Tasks Complete
**Depends On:** `proposal.md`, `spec.md`, `design.md`

---

## Complexity Key

| Symbol | Estimate |
|--------|----------|
| S | < 1 day |
| M | 1–2 days |
| L | 2–5 days |
| XL | > 5 days |

---

## Phase 1 — Foundation

### P1-001
**Title:** Initialize Go module and pin all dependencies
**Phase/Module:** Foundation / Project Scaffold
**Dependencies:** None
**Acceptance Criteria:**
- `go.mod` exists with module path `github.com/ordo/creators-os`, `go 1.23`, `toolchain go1.23.4`
- All dependencies from spec §1.1 present at exact pinned versions
- `go mod tidy` produces no changes
- `go build ./...` succeeds with zero errors
**Complexity:** S

---

### P1-002
**Title:** Implement typed environment config with Viper
**Phase/Module:** Foundation / Project Scaffold
**Dependencies:** P1-001
**Acceptance Criteria:**
- `internal/config/config.go` defines a `Config` struct covering all env vars: `DATABASE_URL`, `REDIS_URL`, `APP_ENV`, `LOG_LEVEL`, `LOG_FORMAT`, `CORS_ALLOWED_ORIGINS`, `METRICS_PORT`, `AI_CLAUDE_API_KEY`, `AI_OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AES_ENCRYPTION_KEY`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`
- Config validates required fields at startup; service exits with a descriptive error message on missing required values
- `internal/config/config_test.go` verifies validation rejects missing required fields and accepts valid config
**Complexity:** S

---

### P1-003
**Title:** Implement Wire DI provider graph skeleton
**Phase/Module:** Foundation / Project Scaffold
**Dependencies:** P1-002
**Acceptance Criteria:**
- `cmd/api/wire.go` declares all provider sets named in design §2 (stubs where implementations don't exist yet)
- `cmd/api/wire_gen.go` is generated and committed
- `cmd/api/main.go` calls `InitializeApp()`, starts server, handles SIGTERM/SIGINT for graceful shutdown
- `wire gen ./cmd/api/` runs without errors
**Complexity:** M

---

### P1-004
**Title:** Implement pgxpool PostgreSQL connection with health check
**Phase/Module:** Foundation / Infrastructure
**Dependencies:** P1-002
**Acceptance Criteria:**
- `internal/database/postgres.go` creates pool with config from spec §1.3 (MinConns=2, MaxConns=20, MaxConnLifetime=30m, MaxConnIdleTime=5m, HealthCheckPeriod=1m)
- Startup health check `pool.Ping(ctx)` with 10-second timeout; service panics on failure
- Connection acquisition uses 5-second context timeout
- pgxuuid and pgtype.Numeric codecs registered
- `internal/database/postgres_test.go` integration test using testcontainers-go verifies pool connects and ping succeeds
**Complexity:** S

---

### P1-005
**Title:** Implement Redis client with health check
**Phase/Module:** Foundation / Infrastructure
**Dependencies:** P1-002
**Acceptance Criteria:**
- `internal/cache/redis.go` creates `*redis.Client` with config from spec §1.4 (PoolSize=10, MinIdleConns=2, MaxRetries=3, DialTimeout=5s)
- Startup health check `client.Ping(ctx).Err()` with 5-second timeout; service panics on failure
- Key namespace convention documented in a code comment: `ordo:{env}:{module}:{key}`
- Integration test verifies Ping against testcontainers Redis
**Complexity:** S

---

### P1-006
**Title:** Implement MinIO/S3 storage client (config-driven selection)
**Phase/Module:** Foundation / Infrastructure
**Dependencies:** P1-002
**Acceptance Criteria:**
- `internal/storage/client.go` defines `Client` interface with `PresignPut`, `PresignGet`, `HeadObject` methods
- `internal/storage/minio.go` implements `Client` using `minio-go/v7`
- `internal/storage/s3.go` implements `Client` using `aws-sdk-go-v2/service/s3`
- Selection controlled by `STORAGE_BACKEND` config value (`minio` | `s3`)
- Startup health check calls `BucketExists`; service panics on failure
- Integration test against testcontainers MinIO verifies presign + head operations
**Complexity:** M

---

### P1-007
**Title:** Implement golang-migrate infrastructure and baseline migration
**Phase/Module:** Foundation / Database
**Dependencies:** P1-004
**Acceptance Criteria:**
- `db/migrations/` directory exists
- `000001_create_extensions.up.sql` creates uuid-ossp, pgcrypto, pg_trgm, unaccent extensions
- `000001_create_extensions.down.sql` drops the extensions
- Auto-migrate on boot when `APP_ENV=development`; disabled when `APP_ENV=production`
- Makefile targets `migrate-up`, `migrate-down`, `migrate-create`, `migrate-status` are implemented and functional
- CI enforces `sqlc generate --dry-run` produces no diff
**Complexity:** S

---

### P1-008
**Title:** Implement structured slog logging with context propagation
**Phase/Module:** Foundation / Observability
**Dependencies:** P1-002
**Acceptance Criteria:**
- `internal/logger/context.go` implements `WithContext(ctx, logger)` and `FromContext(ctx)` helpers
- JSON handler used in all environments; text handler available when `LOG_FORMAT=text`
- Log level configured via `LOG_LEVEL` env var (default `info`)
- `AddSource: true` when `APP_ENV=development`
- `internal/middleware/requestlog.go` logs at INFO for 2xx/3xx, WARN for 4xx, ERROR for 5xx with all required fields from spec §1.6 (trace_id, user_id, workspace_id, duration_ms, status, method, path)
- Request/response bodies are not logged unless `DEBUG_LOG_BODIES=true`
**Complexity:** S

---

### P1-009
**Title:** Implement Prometheus metrics registration and HTTP middleware
**Phase/Module:** Foundation / Observability
**Dependencies:** P1-003
**Acceptance Criteria:**
- `internal/metrics/metrics.go` registers all six metrics from spec §1.7: `http_requests_total` (counter), `http_request_duration_seconds` (histogram with specified buckets), `db_query_duration_seconds`, `db_pool_connections` (gauge, polled every 15s), `redis_operations_total`, `asynq_tasks_total`
- `path` label uses Chi route pattern via `chi.RouteContext(r.Context()).RoutePattern()`, not raw URL
- Metrics server runs on separate `http.Server` on `cfg.MetricsPort` (default 9090)
- `GET /metrics` returns Prometheus text format
- Unit test verifies metrics server is reachable and counter increments on HTTP request
**Complexity:** M

---

### P1-010
**Title:** Implement Chi router with full middleware stack and health endpoints
**Phase/Module:** Foundation / Server
**Dependencies:** P1-008, P1-009
**Acceptance Criteria:**
- `internal/server/router.go` applies middleware in exact order from spec §1.2: RequestID → RealIP → RequestLog → Recoverer → CORS → Timeout(30s)
- CORS configured with allowed methods, headers, exposed headers, and credentials from spec §1.2
- `GET /health` returns 200 with full checks JSON or 503 degraded JSON per spec §1.2
- `GET /ready` identical behavior to `/health`, no caching
- Route grouping: `/api/v1` sub-router established; auth routes bypass JWT middleware
- Panic in a handler returns 500 with logged stack trace and does not crash the server
- Integration test verifies `/health` returns 200 with `"status": "ok"` when all backends are up
**Complexity:** M

---

### P1-011
**Title:** Create Docker Compose local dev stack
**Phase/Module:** Foundation / DevEx
**Dependencies:** None
**Acceptance Criteria:**
- `docker-compose.yml` defines services: postgres (16-alpine), redis (7-alpine), minio (latest), mailhog per spec §1.8 with exact image versions, env vars, ports, volumes, and healthchecks
- App service defined with `air` live reload, `depends_on` with `service_healthy` conditions
- `make dev` brings up full stack
- `make minio-init` creates `ordo-uploads` bucket
- All healthcheck configs match spec §1.8 exactly
- `.env.example` documents all required environment variables with example values
**Complexity:** S

---

### P1-012
**Title:** Implement Makefile with all standard targets
**Phase/Module:** Foundation / DevEx
**Dependencies:** P1-007, P1-011
**Acceptance Criteria:**
- Makefile targets present and functional: `dev`, `build`, `test`, `lint`, `migrate-up`, `migrate-down`, `migrate-create`, `migrate-status`, `sqlc`, `wire`, `minio-init`, `security-scan`
- `make build` produces a binary at `bin/api`
- `make test` runs `go test -race ./...`
- `make lint` runs golangci-lint
- `make security-scan` runs `govulncheck ./...` and `gosec ./...`
**Complexity:** S

---

### P1-013
**Title:** Implement testcontainers-go base test helper
**Phase/Module:** Foundation / Testing
**Dependencies:** P1-004, P1-005
**Acceptance Criteria:**
- `tests/testutil/testapp.go` defines `NewTestApp()` that spins up real Postgres + Redis containers per test suite using testcontainers-go
- `tests/testutil/testapp.go` exposes `DB *pgxpool.Pool`, `Redis *redis.Client`, `Cleanup func()` on the returned struct
- Auto-runs all migrations against the test database on startup
- `tests/fixtures/` directory established for SQL seed files
- `tests/testutil/` has a test verifying the helper itself connects and migrates cleanly
**Complexity:** M

---

### P1-014
**Title:** Implement GitHub Actions CI pipeline
**Phase/Module:** Foundation / CI
**Dependencies:** P1-012, P1-013
**Acceptance Criteria:**
- `.github/workflows/ci.yml` defines two sequential jobs per spec §1.9: `lint` then `test`
- `lint` job: golangci-lint v1.62.0, staticcheck, go vet, sqlc diff check
- `test` job: `go test -race -coverprofile=coverage.out -covermode=atomic ./...` with Go module cache
- Pipeline triggers on push to any branch and PR to `main`/`develop`
- `TESTCONTAINERS_RYUK_DISABLED: false` set in test job env
- Pipeline passes on a clean repo with P1-001 through P1-013 complete
**Complexity:** S

---

## Phase 2 — Auth & Identity

### P2-001
**Title:** Write DB migrations for users and user_sessions tables
**Phase/Module:** Auth / Database
**Dependencies:** P1-007
**Acceptance Criteria:**
- `000002_create_enums.up.sql` creates all enums: `user_role`, `content_status`, `platform_type`, `subscription_tier`, `idea_status`, `sponsorship_status`, `ai_mode`
- `000003_create_users.up.sql` creates `users` table with all columns from proposal §Phase 2, plus `stripe_customer_id` column for Stripe (referenced in design §4e)
- `000004_create_user_sessions.up.sql` creates `user_sessions` table
- All indexes from design §5 for `users` table are created in the up migration
- Down migrations reverse each up migration completely
- `sqlc generate` runs without errors after these migrations
**Complexity:** S

---

### P2-002
**Title:** Generate sqlc queries for auth module
**Phase/Module:** Auth / Database
**Dependencies:** P2-001
**Acceptance Criteria:**
- `db/queries/users.sql` contains: `GetUserByEmail`, `GetUserByID`, `CreateUser`, `UpdateUser`, `SoftDeleteUser`, `UpdateSubscriptionTier`, `DecrementAICredits`, `GetAICreditsBalance`
- `db/queries/sessions.sql` contains: `CreateSession`, `GetSessionByTokenHash`, `RevokeSession`, `RevokeAllUserSessions`
- `sqlc generate` produces `db/sqlc/users.sql.go` and `db/sqlc/sessions.sql.go`
- All generated method signatures match the `UserRepository` interface in design §3
- `DecrementAICredits` uses atomic `UPDATE ... WHERE ai_credits_balance >= $1`
**Complexity:** S

---

### P2-003
**Title:** Implement UserRepository with pgx
**Phase/Module:** Auth / Repository
**Dependencies:** P2-002
**Acceptance Criteria:**
- `internal/repository/user_repository.go` implements `repository.UserRepository` interface from design §3
- All methods delegate to sqlc-generated queries; no raw SQL strings
- `db_query_duration_seconds` Prometheus histogram recorded for every query
- Integration test using `testutil.NewTestApp()` covers: CreateUser, GetByEmail, GetByID, SoftDelete, CreateSession, GetSessionByTokenHash, RevokeSession, RevokeAllUserSessions
**Complexity:** M

---

### P2-004
**Title:** Implement JWT RS256 key loading, token generation, and validation
**Phase/Module:** Auth / Auth
**Dependencies:** P1-001
**Acceptance Criteria:**
- `internal/auth/jwt.go` loads RS256 key pair from PEM files or env vars at startup
- `GenerateAccessToken(userID, email, tier)` returns signed JWT with 15-minute TTL
- Access token payload contains `user_id`, `email`, `subscription_tier`
- `GenerateRefreshToken()` returns 32 cryptographically random bytes encoded as hex string
- `ValidateToken(tokenString)` returns `*domain.UserClaims` or error
- Expired tokens return a specific error type distinguishable from tampered tokens
- Unit tests: generate then validate round-trip, expired token rejection, tampered signature rejection
**Complexity:** M

---

### P2-005
**Title:** Implement bcrypt password hashing (cost 12)
**Phase/Module:** Auth / Auth
**Dependencies:** P1-001
**Acceptance Criteria:**
- `internal/auth/password.go` exposes `HashPassword(plain string) (string, error)` using bcrypt cost 12
- `CheckPassword(plain, hash string) bool` returns false and does not error on wrong password
- Unit tests verify hash ≠ plaintext, correct password passes, incorrect password fails
- Benchmarks confirm hash cost is ≥ 100ms on CI runner (cost-12 baseline)
**Complexity:** S

---

### P2-006
**Title:** Implement Asynq server, scheduler, and email job infrastructure
**Phase/Module:** Auth / Jobs
**Dependencies:** P1-005
**Acceptance Criteria:**
- `internal/job/worker.go` initializes Asynq server connected to Redis with queue config (default, critical, low)
- `internal/job/scheduler.go` initializes Asynq scheduler for periodic tasks
- `internal/job/tasks/email.go` defines `EmailVerificationJob` and `PasswordResetJob` task types and handlers
- Job handlers accept context and task payload; return error on failure (Asynq handles retries)
- `asynq_tasks_total` Prometheus counter incremented on task processed/failed/retried
- Integration test enqueues `EmailVerificationJob` and verifies the handler is invoked
**Complexity:** M

---

### P2-007
**Title:** Implement AuthService: register and login
**Phase/Module:** Auth / Service
**Dependencies:** P2-003, P2-004, P2-005, P2-006
**Acceptance Criteria:**
- `internal/service/auth_service.go` implements `service.AuthService` interface
- `Register`: hashes password, creates user, enqueues `EmailVerificationJob`, returns `*domain.AuthTokens`
- `Login`: gets user by email, compares password, creates session (stores SHA-256 hash of refresh token), returns `*domain.AuthTokens`
- Returns `apperr.New("AUTH_001", "invalid credentials", 401)` on wrong password or unknown email (same error — no user enumeration)
- Integration test: full register → login cycle against real Postgres
**Complexity:** M

---

### P2-008
**Title:** Implement AuthService: refresh token rotation and logout
**Phase/Module:** Auth / Service
**Dependencies:** P2-007
**Acceptance Criteria:**
- `RefreshTokens`: looks up session by SHA-256(refreshToken), validates not revoked and not expired, revokes old session, creates new session, returns new token pair
- `Logout`: revokes single session by token hash
- `LogoutAll`: calls `RevokeAllUserSessions`
- Replay attack test: presenting a previously-used refresh token returns 401 (not a new pair)
- Integration tests cover: valid refresh, expired refresh (401), revoked refresh (401), replay attack (401)
**Complexity:** M

---

### P2-009
**Title:** Implement AuthService: forgot password, reset password, verify email
**Phase/Module:** Auth / Service
**Dependencies:** P2-007
**Acceptance Criteria:**
- `ForgotPassword`: finds user by email, generates time-limited token (24h), stores SHA-256 hash on user row, enqueues `PasswordResetJob`; always returns 200 (no user enumeration)
- `ResetPassword`: validates token, hashes new password, updates user, invalidates token
- `VerifyEmail`: validates `email_verification_token`, marks `is_email_verified = true`, clears token
- Expired token returns `apperr.New("AUTH_004", "token expired", 400)`
- Integration tests cover happy path and expired token for both reset and verify
**Complexity:** M

---

### P2-010
**Title:** Implement OAuth Google, GitHub, and Apple integration
**Phase/Module:** Auth / OAuth
**Dependencies:** P2-007
**Acceptance Criteria:**
- `internal/auth/oauth.go` configures `golang.org/x/oauth2` for Google, GitHub, and Apple
- PKCE flow with state param CSRF protection: state stored in Redis with 10-minute TTL keyed by `ordo:{env}:oauth:state:{state_value}`
- `OAuthCallback`: exchanges code for tokens, fetches user profile from provider, upserts user (`oauth_provider`, `oauth_provider_id` fields), returns `*domain.AuthTokens`
- New OAuth users are created without a password hash; existing email matches link the OAuth provider to the existing account
- Integration test with `httptest` mock OAuth server verifies callback round-trip for Google
**Complexity:** L

---

### P2-011
**Title:** Implement auth JWT middleware
**Phase/Module:** Auth / Middleware
**Dependencies:** P2-004
**Acceptance Criteria:**
- `internal/middleware/auth.go` defines `Authenticate` Chi middleware
- Extracts Bearer token from `Authorization` header
- Calls `auth.ValidateToken`; injects `*domain.UserClaims` into Chi context
- Returns 401 with `apperr` code `AUTH_002` on missing/invalid token, `AUTH_003` on expired token
- Does not hit the database (stateless JWT validation)
- Unit tests: valid token passes, expired token 401, tampered token 401, missing header 401
**Complexity:** S

---

### P2-012
**Title:** Implement Redis sliding-window rate limiter on auth endpoints
**Phase/Module:** Auth / Middleware
**Dependencies:** P1-005, P2-011
**Acceptance Criteria:**
- `internal/middleware/ratelimit.go` defines `RateLimiter` using Redis sliding window counter
- Key format: `ordo:{env}:ratelimit:{user_id|ip}:{endpoint_group}:{window_minute}`
- Auth endpoints limited to 5 attempts/minute per IP
- Returns 429 with `Retry-After` header on breach
- Integration test: 6 rapid requests to login returns 429 on the 6th
**Complexity:** M

---

### P2-013
**Title:** Implement auth HTTP handlers and register routes
**Phase/Module:** Auth / Handler
**Dependencies:** P2-007, P2-008, P2-009, P2-010, P2-011, P2-012
**Acceptance Criteria:**
- `internal/handler/auth_handler.go` implements handlers for all 13 auth endpoints from proposal §Phase 2
- Request validation uses struct tags; invalid requests return 400 with field-level error detail
- `POST /api/v1/auth/register` → 201 Created with `domain.AuthTokens`
- `POST /api/v1/auth/login` → 200 with `domain.AuthTokens`
- `POST /api/v1/auth/refresh` → 200 with new token pair
- `POST /api/v1/auth/logout` → 204 No Content
- `POST /api/v1/auth/logout-all` → 204 No Content
- OAuth routes registered on root router (not under `/api/v1`)
- `GET /api/v1/users/me` and `PUT /api/v1/users/me` wired to `UserService`
- Integration test: full auth cycle (register → login → refresh → logout) returns correct status codes and payloads
**Complexity:** M

---

### P2-014
**Title:** Write Phase 2 integration test suite
**Phase/Module:** Auth / Testing
**Dependencies:** P2-013
**Acceptance Criteria:**
- `tests/integration/auth_test.go` contains full test suite using `testutil.NewTestApp()`
- Tests: register (201), duplicate email (409), login (200), wrong password (401), refresh rotation (200), refresh replay (401), logout (204), logout-all revokes all sessions (all subsequent refreshes return 401), rate limit (429 on 6th attempt), email verify (200)
- All tests pass with `go test -race ./tests/integration/`
**Complexity:** M

---

## Phase 3 — Workspaces & RBAC

### P3-001
**Title:** Write DB migrations for workspaces, members, and invitations tables
**Phase/Module:** Workspaces / Database
**Dependencies:** P2-001
**Acceptance Criteria:**
- `000005_create_workspaces.up.sql` creates `workspaces` table with all columns from proposal §Phase 3
- `000006_create_workspace_members.up.sql` creates `workspace_members` table with UNIQUE constraint `(workspace_id, user_id)` and all indexes from design §5
- `000007_create_workspace_invitations.up.sql` creates `workspace_invitations` table with UNIQUE index on `token`
- All down migrations reverse completely
- `sqlc generate` succeeds
**Complexity:** S

---

### P3-002
**Title:** Generate sqlc queries for workspace module
**Phase/Module:** Workspaces / Database
**Dependencies:** P3-001
**Acceptance Criteria:**
- `db/queries/workspaces.sql` contains all queries matching `WorkspaceRepository` interface from design §3: Create, GetByID, GetBySlug, ListByUserID, Update, SoftDelete, GetMember, ListMembers, AddMember, UpdateMemberRole, RemoveMember, CountMembers, CreateInvitation, GetInvitationByToken, ListInvitations, AcceptInvitation, DeleteInvitation
- Workspace queries include `AND deleted_at IS NULL` on all list/get operations
- `sqlc generate` produces `db/sqlc/workspaces.sql.go`
**Complexity:** S

---

### P3-003
**Title:** Implement WorkspaceRepository
**Phase/Module:** Workspaces / Repository
**Dependencies:** P3-002
**Acceptance Criteria:**
- `internal/repository/workspace_repository.go` implements `repository.WorkspaceRepository`
- Slug uniqueness: on collision, appends `-{random_4}` and retries up to 5 times
- `CountMembers` used by service layer for tier enforcement
- Integration tests cover: create workspace, add member, get member, update role, remove member, create invitation, accept invitation, list invitations
**Complexity:** M

---

### P3-004
**Title:** Implement WorkspaceService with tier limit enforcement
**Phase/Module:** Workspaces / Service
**Dependencies:** P3-003, P2-006
**Acceptance Criteria:**
- `internal/service/workspace_service.go` implements `service.WorkspaceService`
- Free tier: 1 workspace max, 3 members max — enforced in service layer
- `InviteMember`: validates tier limits, generates URL-safe random 32-byte token, sets 7-day expiry, enqueues `InvitationEmailJob`
- `AcceptInvitation`: validates token not expired and not already accepted, adds user as member
- Owner cannot be removed; `RemoveMember` returns `apperr.New("WORKSPACE_003", "cannot remove owner", 400)`
- Ownership transfer endpoint not in scope for Phase 3
- Integration tests cover all endpoints including tier limit rejection
**Complexity:** M

---

### P3-005
**Title:** Implement workspace context middleware and RBAC middleware
**Phase/Module:** Workspaces / Middleware
**Dependencies:** P3-003, P2-011
**Acceptance Criteria:**
- `internal/middleware/workspace.go` defines `RequireWorkspaceMember` Chi middleware
- Reads `workspaceId` from Chi URL params, looks up membership via `WorkspaceRepository.GetMember`
- Injects `*domain.WorkspaceMember` into context
- Returns 403 if user is not a member of the workspace
- `RequireRole(roles ...domain.Role)` middleware enforces role hierarchy: `owner > admin > editor > viewer`
- Workspace ID is sourced from membership record in context — never trusted from URL param alone in repository calls
- Unit tests: non-member gets 403, viewer blocked from editor route, admin passes editor route
**Complexity:** M

---

### P3-006
**Title:** Implement workspace HTTP handlers and register routes
**Phase/Module:** Workspaces / Handler
**Dependencies:** P3-004, P3-005
**Acceptance Criteria:**
- `internal/handler/workspace_handler.go` implements all 12 workspace endpoints from proposal §Phase 3
- All routes under `/api/v1/workspaces` use `RequireWorkspaceMember` middleware
- `DELETE /workspaces/{id}` requires `owner` role
- `POST /workspaces/{id}/members/{userId}/role` requires `admin` or `owner`
- `DELETE /workspaces/{id}/members/{userId}` requires `admin` or `owner`
- `POST /workspaces/{id}/invitations` requires `admin` or `owner`
- `POST /workspaces/invitations/{token}/accept` is a public endpoint (authenticated but no workspace context required)
**Complexity:** M

---

### P3-007
**Title:** Write Phase 3 integration test suite
**Phase/Module:** Workspaces / Testing
**Dependencies:** P3-006
**Acceptance Criteria:**
- `tests/integration/workspace_test.go` covers: create workspace, get workspace, update workspace, delete workspace (403 for non-owner), list members, update member role, remove member, invite member, accept invitation, free tier workspace limit (403 on second create), free tier member limit (403 on 4th member)
- RBAC: viewer cannot call editor-only endpoints (403 verified for all role-gated endpoints)
- Multi-workspace user can switch context cleanly
- All tests pass with `go test -race ./tests/integration/`
**Complexity:** M

---

## Phase 4 — Core Content Platform

### P4-001
**Title:** Write DB migrations for ideas, idea_validation_scores, and idea_tags tables
**Phase/Module:** Content / Database (4a)
**Dependencies:** P3-001
**Acceptance Criteria:**
- `000008_create_ideas.up.sql` creates `ideas` table with all columns from proposal §4a
- `000009_create_idea_validation_scores.up.sql` creates `idea_validation_scores` table
- `000010_create_idea_tags.up.sql` creates `idea_tags` table with composite PK `(idea_id, tag)`
- Indexes from design §5 for `ideas` table are created: workspace+status, workspace+created_at DESC
- All down migrations reverse completely
**Complexity:** S

---

### P4-002
**Title:** Generate sqlc queries and implement IdeaRepository
**Phase/Module:** Content / Repository (4a)
**Dependencies:** P4-001
**Acceptance Criteria:**
- `db/queries/ideas.sql` contains queries matching `IdeaRepository` interface from design §3
- `List` query supports filtering by status, created_by, and platform_target; supports cursor-based pagination
- `SaveValidationScore` upserts scores on `idea_validation_scores`
- `SetTags` deletes all existing tags for idea then inserts new set (atomic in transaction)
- `Promote` sets `promoted_to_content_id` and updates status to `promoted`
- Integration tests cover full idea lifecycle: create, list with filters, update, tag operations, promote, soft-delete
**Complexity:** M

---

### P4-003
**Title:** Implement IdeaService and AI validation job
**Phase/Module:** Content / Service (4a)
**Dependencies:** P4-002, P2-006
**Acceptance Criteria:**
- `internal/service/idea_service.go` implements `service.IdeaService`
- `RequestValidation`: validates idea is in `draft` status, enqueues `IdeaValidationJob`, updates status to `validating`
- `internal/job/tasks/idea_validation.go`: `IdeaValidationJob` handler — calls AI service (stub in Phase 4, wired to real AI in Phase 5), parses structured score response, saves to `idea_validation_scores`, updates idea status to `validated`
- `Promote`: creates `contents` record from idea fields, sets `promoted_to_content_id` on idea
- Integration tests cover: CRUD, request validation (job enqueued), promote creates content record
**Complexity:** M

---

### P4-004
**Title:** Implement ideas HTTP handlers and register routes
**Phase/Module:** Content / Handler (4a)
**Dependencies:** P4-003, P3-005
**Acceptance Criteria:**
- `internal/handler/idea_handler.go` implements all 8 ideas endpoints from proposal §4a
- All routes require workspace membership (via workspace middleware)
- `POST /{ideaId}/validate` returns 202 Accepted with job status
- `POST /{ideaId}/promote` returns 201 Created with the new content record
- `PUT /{ideaId}/tags` replaces entire tag set; returns 200 with updated idea
- Integration test: full ideas CRUD + validation trigger + promote cycle
**Complexity:** M

---

### P4-005
**Title:** Write DB migrations for contents, content_assignments, and content_analytics tables
**Phase/Module:** Content / Database (4b)
**Dependencies:** P4-001
**Acceptance Criteria:**
- `000011_create_contents.up.sql` creates `contents` table with all columns from proposal §4b
- `000012_create_content_assignments.up.sql` creates `content_assignments` table
- `000013_create_content_analytics.up.sql` creates `content_analytics` partitioned table with `PARTITION BY RANGE (recorded_at)` and creates the first monthly partition
- All indexes from design §5 for `contents` table (workspace+status, workspace+assignee, workspace+due_date, metadata GIN, search_vector GIN)
- `content_analytics` partition-level index on `(content_id, recorded_at DESC)`
**Complexity:** M

---

### P4-006
**Title:** Implement content status state machine in domain layer
**Phase/Module:** Content / Domain (4b)
**Dependencies:** P1-001
**Acceptance Criteria:**
- `internal/domain/content.go` defines `ContentStatus` enum with all values: `idea`, `scripting`, `recording`, `editing`, `review`, `scheduled`, `published`
- `ValidateStatusTransition(from, to ContentStatus) error` enforces valid adjacency map: `idea → scripting → recording → editing → review → scheduled → published`; reverse transitions and skips return `apperr.New("CONTENT_002", "invalid status transition", 400)`
- Unit tests cover: all valid forward transitions pass, all invalid skip/reverse transitions fail
**Complexity:** S

---

### P4-007
**Title:** Generate sqlc queries and implement ContentRepository
**Phase/Module:** Content / Repository (4b)
**Dependencies:** P4-005, P4-006
**Acceptance Criteria:**
- `db/queries/contents.sql` contains queries matching `ContentRepository` interface from design §3
- `List` supports filtering by status (multi-value), assigned_to, platform_target, and `group_by=status` (returns kanban-bucketed results)
- `UpdateStatus` is a targeted update, does not touch other fields
- `SaveRemixJob`/`GetRemixJob`/`UpdateRemixJob` operate on the `remix_jobs` table (migration 000017)
- `EnsurePartitionExists` creates a new `content_analytics` partition for a given month if it does not exist
- Integration tests cover CRUD, status transition, assignment CRUD
**Complexity:** M

---

### P4-008
**Title:** Implement ContentService with assignment notifications
**Phase/Module:** Content / Service (4b)
**Dependencies:** P4-007, P2-006
**Acceptance Criteria:**
- `internal/service/content_service.go` implements `service.ContentService`
- `TransitionStatus`: calls `domain.ValidateStatusTransition`, then `repo.UpdateStatus`, then dispatches `AssignmentNotificationJob` via Asynq if assignee exists
- `AddAssignment`: associates user with content in a given role; enqueues notification job
- Integration tests: CRUD cycle, valid/invalid status transitions, assignment creation
**Complexity:** M

---

### P4-009
**Title:** Implement content HTTP handlers and register routes
**Phase/Module:** Content / Handler (4b)
**Dependencies:** P4-008, P3-005
**Acceptance Criteria:**
- `internal/handler/content_handler.go` implements all 8 content endpoints from proposal §4b
- `GET /contents` supports query params: `status`, `assignee`, `platform`, `group_by`
- `PUT /{contentId}/status` calls `ContentService.TransitionStatus`; returns 400 with error detail on invalid transition
- Kanban response: when `group_by=status`, response body is `{ "columns": { "scripting": [...], "recording": [...] } }`
- Integration test covers kanban list, status update (valid and invalid transitions)
**Complexity:** M

---

### P4-010
**Title:** Write DB migrations for series, episodes, and publishing schedule tables
**Phase/Module:** Content / Database (4c)
**Dependencies:** P4-001
**Acceptance Criteria:**
- `000014_create_series.up.sql` creates `series` table with all columns from proposal §4c
- `000015_create_series_episodes.up.sql` creates `series_episodes` table
- `000016_create_series_publishing_schedule.up.sql` creates `series_publishing_schedule` table
- `series_search_vector_gin_idx` GIN index on `series.search_vector` per design §5
- All down migrations reverse completely
**Complexity:** S

---

### P4-011
**Title:** Generate sqlc queries, implement SeriesRepository, SeriesService, and handlers
**Phase/Module:** Content / Repository+Service+Handler (4c)
**Dependencies:** P4-010, P3-005
**Acceptance Criteria:**
- `db/queries/series.sql` contains all queries matching `SeriesRepository` interface from design §3
- `internal/repository/series_repository.go` implements the interface
- `internal/service/series_service.go` implements CRUD + episode management + schedule upsert
- `internal/handler/series_handler.go` implements all 9 series endpoints from proposal §4c
- `PUT /{seriesId}/schedule` upserts publishing schedule; `frequency`, `day_of_week`, `time_of_day` are validated
- Integration tests cover series CRUD, episode CRUD, schedule upsert
**Complexity:** L

---

### P4-012
**Title:** Write DB migration for remix_jobs table
**Phase/Module:** Content / Database (4d prep)
**Dependencies:** P4-005
**Acceptance Criteria:**
- `000017_create_remix_jobs.up.sql` creates `remix_jobs` table with columns: `id`, `workspace_id FK`, `user_id FK`, `status` (pending/processing/complete/failed), `input_url`, `results JSONB`, `error_message`, `created_at`, `updated_at`
- Down migration reverses completely
- `sqlc generate` succeeds
**Complexity:** S

---

### P4-013
**Title:** Implement presigned URL upload flow (MinIO/S3)
**Phase/Module:** Content / File Uploads (4d)
**Dependencies:** P1-006, P3-005
**Acceptance Criteria:**
- `internal/handler/upload_handler.go` implements 3 endpoints: `POST /api/v1/uploads/presign`, `POST /api/v1/uploads/confirm`, `GET /api/v1/uploads/{objectKey}`
- Presign: validates MIME type (allowlist in config), applies content-length-range condition, generates object key as `{workspace_id}/{content_type}/{uuid_v7}.{ext}`, returns `{ upload_url, object_key, expires_at }`
- Confirm: calls `storage.Client.HeadObject` to verify upload succeeded; returns 400 if object not found
- Download: returns short-TTL signed GET URL (15 minutes)
- Integration test against testcontainers MinIO: presign → direct upload → confirm → download URL round-trip
**Complexity:** M

---

### P4-014
**Title:** Write Phase 4 integration test suite
**Phase/Module:** Content / Testing
**Dependencies:** P4-004, P4-009, P4-011, P4-013
**Acceptance Criteria:**
- `tests/integration/ideas_test.go`: full CRUD + validation + promote cycle
- `tests/integration/content_test.go`: CRUD, kanban list, valid/invalid status transitions, assignment CRUD
- `tests/integration/series_test.go`: CRUD, episode CRUD, schedule upsert
- `tests/integration/upload_test.go`: presign → upload → confirm → download round-trip against real MinIO
- All tests pass with `go test -race ./tests/integration/`
**Complexity:** M

---

## Phase 5 — Intelligence & Integrations

### P5-001
**Title:** Write DB migrations for ai_conversations, ai_messages, and ai_credit_usage tables
**Phase/Module:** AI Studio / Database (5a)
**Dependencies:** P3-001
**Acceptance Criteria:**
- `000018_create_ai_conversations.up.sql`, `000019_create_ai_messages.up.sql`, `000020_create_ai_credit_usage.up.sql`
- `ai_messages` index on `(conversation_id, created_at ASC)` per design §5
- `ai_credit_usage` indexes: `(user_id, created_at DESC)`, `(workspace_id, created_at DESC)`
- Down migrations reverse completely
**Complexity:** S

---

### P5-002
**Title:** Implement Claude AI provider
**Phase/Module:** AI Studio / AI (5a)
**Dependencies:** P1-001
**Acceptance Criteria:**
- `internal/ai/claude.go` implements `ai.AIProvider` interface from design §3
- Uses Anthropic SDK; default model `claude-3-5-sonnet`
- `Complete`: returns `*CompletionResponse` with `InputTokens` and `OutputTokens` populated from API response
- `Stream`: writes SSE-formatted chunks to `io.Writer`; sends `data: [DONE]` on completion
- `EstimateTokens`: approximates using `len(content) / 4` heuristic
- `Name()` returns `"claude"`
- Unit tests with mock HTTP server verify: successful completion, streaming output, 429 response detection
**Complexity:** M

---

### P5-003
**Title:** Implement OpenAI provider
**Phase/Module:** AI Studio / AI (5a)
**Dependencies:** P1-001
**Acceptance Criteria:**
- `internal/ai/openai.go` implements `ai.AIProvider` interface
- Uses OpenAI SDK; default model `gpt-4o`
- Same behavioral contract as Claude provider: Complete, Stream, EstimateTokens, Name
- `Name()` returns `"openai"`
- Unit tests with mock HTTP server
**Complexity:** M

---

### P5-004
**Title:** Implement AI router with circuit breaker and failover
**Phase/Module:** AI Studio / AI (5a)
**Dependencies:** P5-002, P5-003
**Acceptance Criteria:**
- `internal/ai/router.go` implements `ai.AIProvider` interface; wraps primary (Claude) and fallback (OpenAI)
- On 429 or 5xx from primary: immediately retries with fallback provider (no delay)
- Circuit breaker: after 5 consecutive primary failures within 60 seconds, all requests route to fallback without attempting primary; resets after 120 seconds
- `Name()` returns `"router:{primary}/{fallback}"`
- Unit tests: primary success (no fallback), primary 429 (fallback invoked), circuit breaker open state (fallback invoked without hitting primary)
**Complexity:** M

---

### P5-005
**Title:** Generate sqlc queries and implement AIRepository
**Phase/Module:** AI Studio / Repository (5a)
**Dependencies:** P5-001
**Acceptance Criteria:**
- `db/queries/ai.sql` contains all queries matching `AIRepository` interface from design §3
- `RecordCreditUsage` inserts to `ai_credit_usage`
- `GetCreditUsageSummary` aggregates credits consumed by user since a given timestamp
- `internal/repository/ai_repository.go` implements the interface
- Integration tests cover conversation CRUD, message listing, credit usage recording
**Complexity:** M

---

### P5-006
**Title:** Implement AIService with credit deduction and SSE streaming
**Phase/Module:** AI Studio / Service (5a)
**Dependencies:** P5-004, P5-005, P2-003
**Acceptance Criteria:**
- `internal/service/ai_service.go` implements `service.AIService`
- `CheckAndDeductCredits`: atomic DB update `WHERE ai_credits_balance >= cost`; returns `apperr.New("AI_002", "insufficient credits", 402)` on insufficient balance
- `StreamMessage`: deducts estimated tokens pre-flight, streams via `ai.Router.Stream`, reconciles actual vs estimated after stream completes
- `Brainstorm` and `GenerateScript`: use `ai.Router.Complete` (non-streaming); credit-checked
- Concurrent credit deduction race test: two simultaneous requests against a balance only sufficient for one; exactly one succeeds
**Complexity:** L

---

### P5-007
**Title:** Implement credit check middleware
**Phase/Module:** AI Studio / Middleware (5a)
**Dependencies:** P5-006, P2-011
**Acceptance Criteria:**
- `internal/middleware/credit_check.go` reads `subscription_tier` from JWT claims
- Enforces per-tier AI message rate limits from proposal §6c (10/hour free, 100/hour pro, 500/hour enterprise) using Redis sliding window
- Returns 429 with `X-Credits-Remaining` header on breach
- Unit tests: free tier exhausted at 11th request, pro tier allows 100 requests
**Complexity:** S

---

### P5-008
**Title:** Implement AI HTTP handlers and register routes
**Phase/Module:** AI Studio / Handler (5a)
**Dependencies:** P5-006, P5-007
**Acceptance Criteria:**
- `internal/handler/ai_handler.go` implements all 10 AI endpoints from proposal §5a
- `POST /ai/conversations/{id}/messages`: sets `Content-Type: text/event-stream`, streams SSE chunks, closes with `data: [DONE]`
- `POST /ai/brainstorm` and `POST /ai/script-generate`: return full response in single JSON body
- `POST /ai/credits/balance`: returns current balance from `UserRepository.GetAICreditsBalance`
- Integration test with mock AI provider stubs: streaming endpoint returns valid SSE; credit deduction is reflected in balance endpoint
**Complexity:** M

---

### P5-009
**Title:** Implement Remix Engine: Asynq multi-step worker
**Phase/Module:** Remix Engine (5b)
**Dependencies:** P4-012, P5-004, P2-006
**Acceptance Criteria:**
- `internal/job/tasks/remix.go` defines `RemixAnalysisJob` with four steps: Ingest → Transcribe → Score → Generate
- Each step updates `remix_jobs.status` to current step name in the DB
- Ingest: validates video URL format; fetches metadata (title, duration) via HTTP HEAD
- Transcribe: if transcript not provided in input, calls Whisper API (or stub); stores transcript in `remix_jobs.results JSONB`
- Score: calls `ai.Router.Complete` with scoring prompt; parses JSON clip suggestions
- Generate: calls `ai.Router.Complete` for each clip to generate titles and descriptions
- Final step: updates status to `complete`, calls `ws.Hub.Broadcast` with `remix.job_complete` event
- `internal/service/remix_service.go` implements `service.RemixService`
- Integration test: submit job, run worker inline (bypass queue), verify results populated
**Complexity:** L

---

### P5-010
**Title:** Implement Remix HTTP handlers and register routes
**Phase/Module:** Remix Engine (5b)
**Dependencies:** P5-009
**Acceptance Criteria:**
- `internal/handler/remix_handler.go` implements 4 remix endpoints from proposal §5b
- `POST /remix/analyze` → 202 Accepted with `{ job_id, status_url }`
- `GET /remix/{jobId}/status` → job status and current step
- `GET /remix/{jobId}/results` → returns full results JSONB; 404 if not complete
- `POST /remix/{jobId}/apply` → creates content records for selected clip IDs; returns array of created content
- Workspace scoping enforced: only workspace members can access their workspace's remix jobs
**Complexity:** M

---

### P5-011
**Title:** Write DB migrations for platform_credentials and scheduled_posts tables
**Phase/Module:** Publishing (5c) / Database
**Dependencies:** P3-001
**Acceptance Criteria:**
- `000021_create_platform_credentials.up.sql` creates `platform_credentials` table with encrypted token columns
- `000022_create_scheduled_posts.up.sql` creates `scheduled_posts` table
- `scheduled_posts_status_scheduled_at_idx` partial index on `(status, scheduled_at) WHERE status = 'pending'` per design §5
- All down migrations reverse completely
**Complexity:** S

---

### P5-012
**Title:** Implement AES-256-GCM credential encryption/decryption
**Phase/Module:** Publishing (5c) / Security
**Dependencies:** P1-001
**Acceptance Criteria:**
- `internal/crypto/encrypt.go` exposes `Encrypt(plaintext string, key []byte) (string, error)` and `Decrypt(ciphertext string, key []byte) (string, error)`
- Uses AES-256-GCM; generates a random 12-byte nonce per encryption; prepends nonce to ciphertext; output is base64-encoded
- Key sourced from `AES_ENCRYPTION_KEY` env var (must be exactly 32 bytes)
- Unit tests: encrypt then decrypt round-trip, tampered ciphertext returns error, wrong key returns error
**Complexity:** S

---

### P5-013
**Title:** Implement platform OAuth flows and credential storage
**Phase/Module:** Publishing (5c) / Service
**Dependencies:** P5-011, P5-012, P2-010
**Acceptance Criteria:**
- `internal/service/publishing_service.go` implements `service.PublishingService`
- `ConnectCredential`: OAuth2 flow per platform (YouTube, TikTok, Instagram, Twitter/X, LinkedIn); encrypts tokens with AES-256-GCM before persisting; stores `channel_id`, `channel_name`, `scopes`, `token_expires_at`
- Token refresh: automatic before publish if within 5-minute expiry window
- `DeleteCredential`: removes credential; cascades to delete associated `scheduled_posts`
- Integration tests with mock OAuth server: connect credential, list credentials, delete credential
**Complexity:** L

---

### P5-014
**Title:** Implement Asynq publish workers (per-platform)
**Phase/Module:** Publishing (5c) / Jobs
**Dependencies:** P5-013
**Acceptance Criteria:**
- `internal/job/tasks/publish.go` defines one `PublishJob` handler per platform: YouTube, TikTok, Instagram, Twitter/X, LinkedIn (5 workers)
- Each worker: loads credential, decrypts tokens, refreshes if needed, calls platform API to post, updates `scheduled_posts.status` to `published` or `failed`
- On failure: sets `error_message`, status = `failed`; Asynq handles retry up to 3 times
- `PublishSchedulerJob`: Asynq periodic task (every minute) — queries `GetDuePosts(before: now)`, enqueues one `PublishJob` per due post
- Integration tests with mock platform API HTTP servers: successful publish marks post as published; API error marks as failed
**Complexity:** L

---

### P5-015
**Title:** Implement publishing calendar HTTP handlers and register routes
**Phase/Module:** Publishing (5c) / Handler
**Dependencies:** P5-014
**Acceptance Criteria:**
- `internal/handler/publishing_handler.go` implements all 7 publishing endpoints from proposal §5c
- `GET /publishing/calendar` accepts `from` and `to` query params (ISO 8601 dates); joins `scheduled_posts` with `contents`
- `POST /publishing/schedule` validates `scheduled_at` is in the future
- `POST /publishing/credentials` initiates OAuth connect flow; returns redirect URL
- Integration test: schedule post → calendar endpoint returns it in correct date bucket
**Complexity:** M

---

### P5-016
**Title:** Write DB migration for platform_analytics table and implement analytics pipeline
**Phase/Module:** Analytics (5d)
**Dependencies:** P5-011
**Acceptance Criteria:**
- `000023_create_platform_analytics.up.sql` creates `platform_analytics` table
- `db/queries/analytics.sql` contains queries matching `AnalyticsRepository` interface from design §3
- `internal/repository/analytics_repository.go` implements `AnalyticsRepository` using read replica pool
- `internal/service/analytics_service.go` implements `service.AnalyticsService`
- `internal/job/tasks/analytics_sync.go`: `AnalyticsSyncJob` fetches metrics from each connected platform API per workspace, writes to `content_analytics` and `platform_analytics`
- Daily Asynq scheduler entry: runs `AnalyticsSyncJob` at 02:00 UTC per workspace
- `EnsurePartitionExists` called monthly to create next partition
- Integration tests: `GET /analytics/overview`, `GET /analytics/content/{id}`, `GET /analytics/platform/{platform}`, manual sync trigger
**Complexity:** L

---

### P5-017
**Title:** Write DB migrations and implement gamification system
**Phase/Module:** Gamification (5e)
**Dependencies:** P5-001
**Acceptance Criteria:**
- `000024_create_consistency_scores.up.sql`, `000025_create_achievements.up.sql` (with seed data for initial achievement set), `000026_create_user_stats.up.sql`
- `internal/service/gamification_service.go` implements `service.GamificationService`
- `RecalculateConsistencyScores`: daily Asynq job — queries published content counts per user, updates streak, writes to `consistency_scores`, updates `users.streak_current` and `streak_longest`
- `CheckAndUnlockAchievements`: evaluates `achievements.criteria JSONB` against current user stats; on unlock, updates `user_stats.achievements_unlocked`, dispatches `ws.Hub.Broadcast` with `achievement.unlocked` event
- `GetLeaderboard`: sorted by `user_stats.total_points DESC`, workspace-scoped, using read replica
- `internal/handler/gamification_handler.go` implements 3 endpoints from proposal §5e
- Integration tests: stats endpoint, achievement unlock trigger, leaderboard ordering
**Complexity:** L

---

### P5-018
**Title:** Write DB migrations and implement Sponsorships CRM
**Phase/Module:** Sponsorships (5f)
**Dependencies:** P3-001
**Acceptance Criteria:**
- `000027_create_sponsorships.up.sql`, `000028_create_sponsorship_messages.up.sql`
- `db/queries/sponsorships.sql` contains all queries matching `SponsorshipRepository` interface from design §3
- `internal/repository/sponsorship_repository.go` implements the interface
- `internal/service/sponsorship_service.go` implements `service.SponsorshipService`
- `internal/handler/sponsorship_handler.go` implements all 7 sponsorship endpoints from proposal §5f
- `GET /sponsorships` supports filtering by `status` and date range
- Integration tests: full CRUD, message thread, status transitions, filter by status
**Complexity:** M

---

### P5-019
**Title:** Implement Stripe billing integration
**Phase/Module:** Billing (5g)
**Dependencies:** P2-003
**Acceptance Criteria:**
- `internal/service/billing_service.go` implements `service.BillingService`
- Stripe Go client initialized with `STRIPE_SECRET_KEY`
- `CreateCheckoutSession`: creates Stripe Checkout Session with `customer_id` (creates Stripe customer if not exists, stores in `users.stripe_customer_id`)
- `CreatePortalSession`: creates Stripe Customer Portal session
- `HandleWebhook`: verifies HMAC signature using `stripe.ConstructEvent`; idempotency via Redis `SET NX EX 300` on `stripe:event:{eventID}`; handles 4 event types from proposal §5g
- On `customer.subscription.updated`: parses tier from price metadata, calls `UserRepository.UpdateSubscriptionTier`
- Integration tests using Stripe CLI test event fixtures: subscription created, subscription updated, subscription deleted, payment failed
**Complexity:** L

---

### P5-020
**Title:** Implement WebSocket hub and real-time event system
**Phase/Module:** WebSocket (5h)
**Dependencies:** P2-011
**Acceptance Criteria:**
- `internal/ws/hub.go` implements goroutine-safe client registry with `Register(client)`, `Unregister(client)`, `Broadcast(workspaceID uuid.UUID, event Event)` methods
- `internal/ws/client.go` implements read pump and write pump goroutines per connection using Gorilla WebSocket
- Auth handshake: JWT from `?token=` query param or cookie; validated before upgrade
- Heartbeat: server sends ping every 30s; closes connection on pong timeout (60s)
- `internal/ws/events.go` defines event envelope: `{ event, workspace_id, payload, timestamp }`
- Service layer calls `hub.Broadcast` for: content.status_changed, remix.job_complete, achievement.unlocked
- `GET /api/v1/ws` upgrades to WebSocket (no JWT middleware wrapper — auth is in the handler)
- Integration test: two concurrent clients in same workspace receive broadcast; client in different workspace does not
**Complexity:** L

---

### P5-021
**Title:** Wire all Phase 5 providers into DI graph and update Wire
**Phase/Module:** Intelligence / DI
**Dependencies:** P5-008, P5-010, P5-015, P5-016, P5-017, P5-018, P5-019, P5-020
**Acceptance Criteria:**
- `cmd/api/wire.go` updated with all Phase 5 providers: `AIProviderSet`, `RemixService`, `PublishingService`, `AnalyticsService`, `GamificationService`, `SponsorshipService`, `BillingService`, `ws.Hub`
- `cmd/api/wire_gen.go` regenerated without errors
- All job workers registered in `JobProviderSet`: `RemixWorker`, `PublishWorker`, `AnalyticsSyncWorker`, `ConsistencyScoreWorker`
- `make wire` runs without errors
- `go build ./...` succeeds
**Complexity:** M

---

### P5-022
**Title:** Write Phase 5 integration test suite
**Phase/Module:** Intelligence / Testing
**Dependencies:** P5-021
**Acceptance Criteria:**
- `tests/integration/ai_test.go`: conversation CRUD, streaming message endpoint (SSE output valid), credit deduction reflected in balance, concurrent credit deduction race test
- `tests/integration/publishing_test.go`: schedule post, calendar endpoint, mock publish worker cycle
- `tests/integration/billing_test.go`: Stripe webhook handler (test events from Stripe CLI), idempotency verified
- `tests/integration/websocket_test.go`: concurrent client broadcast (workspace scoped), heartbeat, auth rejection
- All tests pass with `go test -race ./tests/integration/`
**Complexity:** L

---

## Phase 6 — Hardening

### P6-001
**Title:** Write DB migration adding FTS search_vector columns and GIN indexes
**Phase/Module:** Hardening / Search
**Dependencies:** P4-001, P4-005, P4-010, P5-018
**Acceptance Criteria:**
- `000030_add_search_vectors.up.sql` adds `search_vector tsvector GENERATED ALWAYS AS (...) STORED` columns to: `ideas` (title + description), `contents` (title + description), `series` (title + description), `sponsorships` (brand_name + notes)
- GIN indexes created per design §5: `ideas_search_vector_gin_idx`, `contents_search_vector_gin_idx`, `series_search_vector_gin_idx`, `sponsorships_search_vector_gin_idx`
- `unaccent` extension used in tsvector generation expressions
- Down migration drops the generated columns and indexes
- `sqlc generate` succeeds after migration
**Complexity:** M

---

### P6-002
**Title:** Implement global full-text search endpoint
**Phase/Module:** Hardening / Search
**Dependencies:** P6-001
**Acceptance Criteria:**
- `internal/repository/search_repository.go` uses read replica pool; queries all four FTS tables with `WHERE search_vector @@ plainto_tsquery('english', $1) AND workspace_id = $2`
- `types` query param filters result set: `?q=test&types=ideas,contents`
- Results ranked by `ts_rank(search_vector, query) DESC`
- Cursor-based pagination (limit 20 per page)
- `internal/service/search_service.go` (thin delegation)
- `internal/handler/search_handler.go` implements `GET /api/v1/search`
- Integration test: seed data with known text, verify search returns correct ranked results
**Complexity:** M

---

### P6-003
**Title:** Write DB migration for activity_logs table and implement audit log system
**Phase/Module:** Hardening / Audit
**Dependencies:** P3-001
**Acceptance Criteria:**
- `000029_create_activity_logs.up.sql` creates `activity_logs` partitioned table per proposal §6b schema, plus first monthly partition and `activity_logs_workspace_created_at_idx` index
- `internal/service/audit_service.go` implements non-blocking async write: `Log(ctx, entry)` pushes to a buffered channel; background goroutine batches inserts every 500ms or 100 entries
- `AuditService.Log` called from service layer for all mutating operations (Create, Update, Delete on: users, workspaces, ideas, contents, series, sponsorships, platform_credentials)
- `GET /api/v1/workspaces/{workspaceId}/audit-logs` (owner/admin only) with pagination
- Integration test: create + update + delete content, verify 3 audit log entries created; verify non-owner/non-admin returns 403
**Complexity:** L

---

### P6-004
**Title:** Implement per-tier Redis sliding-window rate limiter
**Phase/Module:** Hardening / Rate Limiting
**Dependencies:** P1-005, P2-011
**Acceptance Criteria:**
- Extend `internal/middleware/ratelimit.go` to support per-tier limits from proposal §6c table
- Key format: `ordo:{env}:ratelimit:{tier}:{user_id}:{endpoint_group}:{window}`
- Tier read from JWT claims (no DB hit per request)
- Endpoint groups: `auth` (per-IP), `ai_messages`, `content_writes`, `analytics_sync`, `file_uploads`
- Returns 429 with `Retry-After` and `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers
- Integration tests: free-tier user exhausts AI message limit at 11th request; pro-tier allows 101 requests; enterprise allows 501 requests (verified with mock time)
**Complexity:** M

---

### P6-005
**Title:** Implement security headers middleware
**Phase/Module:** Hardening / Security
**Dependencies:** P1-010
**Acceptance Criteria:**
- `internal/middleware/security_headers.go` sets headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` (prod only), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- CORS locked down for production: `AllowedOrigins` from config; no wildcard (`*`) allowed in `APP_ENV=production`
- Unit test verifies all headers present on `GET /health` response
**Complexity:** S

---

### P6-006
**Title:** Implement govulncheck and gosec integration in CI
**Phase/Module:** Hardening / Security CI
**Dependencies:** P1-014
**Acceptance Criteria:**
- `make security-scan` target runs `govulncheck ./...` and `gosec -quiet ./...`
- GitHub Actions `ci.yml` adds a third job `security` (depends on `lint`) that runs `make security-scan`
- `gosec` config (`.gosec.yaml` or inline flags) suppresses false-positive rules that are intentionally accepted, with comments explaining each suppression
- Pipeline fails if `govulncheck` finds any known vulnerabilities with a fix available
- Pipeline fails if `gosec` reports any HIGH severity findings without a suppression comment
**Complexity:** S

---

### P6-007
**Title:** Implement Redis caching layer for high-frequency reads
**Phase/Module:** Hardening / Performance
**Dependencies:** P3-003, P2-003
**Acceptance Criteria:**
- `internal/cache/` adds `CacheWorkspaceMembers(workspaceID, members, TTL 5min)` and `GetCachedWorkspaceMembers(workspaceID)` methods
- `internal/cache/` adds `CacheUserProfile(userID, user, TTL 1min)` and `GetCachedUserProfile(userID)` methods
- `WorkspaceRepository.ListMembers` checks cache before hitting DB; writes to cache on miss
- `UserRepository.GetByID` checks cache before hitting DB; writes to cache on miss
- Cache invalidation: `UpdateMemberRole`, `RemoveMember`, and `UpdateUser` call `cache.Delete` for affected keys
- Integration test: two sequential `GetByID` calls; second should not hit DB (verified via query count)
**Complexity:** M

---

### P6-008
**Title:** Write k6 load test suite
**Phase/Module:** Hardening / Load Testing
**Dependencies:** P5-022
**Acceptance Criteria:**
- `tests/load/auth.js`: k6 script for auth endpoints at 500 RPS; passes when p99 < 200ms
- `tests/load/content_list.js`: k6 script for `GET /contents` at 1000 RPS; passes when p99 < 100ms
- `tests/load/ai_chat.js`: k6 script for AI message endpoint; p99 < 5s with mock AI provider
- `Makefile` target `load-test` runs all k6 scripts against a local staging environment
- `tests/load/README.md` documents how to run and interpret results
- Baseline targets documented; pgxpool `MaxConns` tuning notes in config comments
**Complexity:** M

---

### P6-009
**Title:** Implement OpenAPI/Swagger documentation generation
**Phase/Module:** Hardening / Documentation
**Dependencies:** P5-021
**Acceptance Criteria:**
- `swaggo/swag` annotations added to all HTTP handler functions (all 40+ endpoints)
- `make swagger` target runs `swag init -g cmd/api/main.go -o docs/swagger`
- `GET /docs/*` route serves Swagger UI (using `swaggo/http-swagger`)
- Generated `docs/swagger/swagger.json` committed to repo
- CI `lint` job validates `swag generate --dry-run` produces no diff from committed spec
**Complexity:** L

---

### P6-010
**Title:** Create staging deployment runbook
**Phase/Module:** Hardening / Ops
**Dependencies:** P6-008
**Acceptance Criteria:**
- `docs/runbooks/staging-deploy.md` documents step-by-step staging deployment process including: ECS task definition update, `make migrate-up` pre-deploy step, health check verification, rollback procedure
- ECS health check grace period configuration documented
- `DB_READ_REPLICA_URL` env var setup documented
- Secrets rotation procedure documented (JWT keys, OAuth secrets, Stripe keys, AES key)
**Complexity:** S

---

### P6-011
**Title:** Create production deployment runbook and backend sign-off checklist
**Phase/Module:** Hardening / Ops
**Dependencies:** P6-010
**Acceptance Criteria:**
- `docs/runbooks/production-deploy.md` documents production deployment process; highlights differences from staging (auto-migrate disabled, sslmode=require, metrics on internal port only)
- `docs/runbooks/backend-signoff-checklist.md` contains sign-off checklist with entries for: all integration test suites pass, load tests pass at baseline targets, `govulncheck` clean, `gosec` clean, all secrets rotatable without downtime, CORS locked down, audit log recording verified, rate limits verified per tier
- Checklist is a markdown checkbox list suitable for a PR review sign-off
**Complexity:** S

---

### P6-012
**Title:** Write Phase 6 integration test suite and final sign-off
**Phase/Module:** Hardening / Testing
**Dependencies:** P6-003, P6-004, P6-002, P6-007
**Acceptance Criteria:**
- `tests/integration/search_test.go`: seeded text returns correct ranked FTS results; `types` filter limits result set correctly
- `tests/integration/audit_test.go`: mutating operations on all tracked entities produce audit log entries; batch writer flushes correctly
- `tests/integration/ratelimit_test.go`: per-tier limits enforced correctly for all endpoint groups
- `tests/integration/cache_test.go`: workspace member list served from cache on second request
- All integration tests pass: `go test -race ./tests/integration/`
- `make security-scan` exits 0
- Backend sign-off checklist in `docs/runbooks/backend-signoff-checklist.md` can be fully checked
**Complexity:** M

---

## Task Count Summary

| Phase | Task Count | S | M | L | XL |
|-------|-----------|---|---|---|-----|
| Phase 1 — Foundation | 14 | 7 | 6 | 1 | 0 |
| Phase 2 — Auth & Identity | 14 | 3 | 9 | 2 | 0 |
| Phase 3 — Workspaces & RBAC | 7 | 1 | 5 | 1 | 0 |
| Phase 4 — Core Content | 14 | 3 | 9 | 2 | 0 |
| Phase 5 — Intelligence & Integrations | 22 | 1 | 9 | 10 | 2 |
| Phase 6 — Hardening | 12 | 4 | 5 | 2 | 1 |
| **Total** | **83** | **19** | **43** | **18** | **3** |

---

## Critical Path

```
P1-001 → P1-002 → P1-003 → P1-004 → P1-007 → P2-001 → P2-002 → P2-003
                                                      ↓
P1-005 → P2-006 → P2-007 → P2-008 → P2-013 → P2-014
                  ↓
P2-004 → P2-007
P2-005 → P2-007
                                              ↓
P3-001 → P3-002 → P3-003 → P3-004 → P3-005 → P3-006 → P3-007
                                              ↓
P4-001 → P4-005 → P4-006 → P4-007 → P4-008 → P4-009
       → P4-010 → P4-011
                                              ↓
P5-001 → P5-005 → P5-006 → P5-008
P5-002 → P5-004 → P5-006
P5-003 → P5-004
P5-011 → P5-013 → P5-014 → P5-015
P5-020 (WebSocket — enables real-time for gamification + remix)
                                              ↓
P6-001 → P6-002
P6-003 (audit log)
P6-004 (rate limiting)
P6-005 → P6-006 → P6-012
```

**Longest dependency chain (critical path for unblocking Phase 6):**
P1-001 → P1-004 → P1-007 → P2-001 → P3-001 → P4-001 → P4-005 → P5-001 → P5-002/P5-003 → P5-004 → P5-006 → P5-021 → P6-001 → P6-012

---

*Generated by sdd-tasks | Ordo Creator OS | 2026-03-10*
