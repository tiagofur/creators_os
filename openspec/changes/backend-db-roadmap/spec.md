# Technical Specification: Ordo Creator OS — Backend + DB Roadmap

**Change:** `backend-db-roadmap`
**Project:** `creators_os`
**Date:** 2026-03-10
**Status:** Spec Complete
**Depends On:** `proposal.md`

---

## Table of Contents

1. [Phase 1 — Foundation](#phase-1--foundation)
2. [Phase 2 — Auth & Identity](#phase-2--auth--identity)
3. [Phase 3 — Workspaces & RBAC](#phase-3--workspaces--rbac)
4. [Phase 4 — Core Content Platform](#phase-4--core-content-platform)
5. [Phase 5 — Intelligence & Integrations](#phase-5--intelligence--integrations)
6. [Phase 6 — Hardening](#phase-6--hardening)

---

## Phase 1 — Foundation

### 1.1 Go Module Specification (`go.mod`)

**Module path:** `github.com/ordo/creators-os`

**Required direct dependencies and pinned versions:**

```
github.com/go-chi/chi/v5           v5.2.1
github.com/go-chi/cors             v1.2.1
github.com/jackc/pgx/v5            v5.7.2
github.com/redis/go-redis/v9       v9.7.3
github.com/hibiken/asynq            v0.24.1
github.com/golang-migrate/migrate/v4 v4.18.1
github.com/google/wire             v0.6.0
github.com/google/uuid             v1.6.0
github.com/spf13/viper             v1.19.0
github.com/prometheus/client_golang v1.20.5
github.com/aws/aws-sdk-go-v2       v1.32.7
github.com/aws/aws-sdk-go-v2/service/s3 v1.71.0
github.com/minio/minio-go/v7       v7.0.82
golang.org/x/oauth2                v0.25.0
github.com/golang-jwt/jwt/v5       v5.2.1
golang.org/x/crypto                v0.32.0
github.com/sqlc-dev/sqlc           v1.27.0   (dev/codegen tool, not a runtime dep)
github.com/testcontainers/testcontainers-go v0.35.0
github.com/stretchr/testify        v1.10.0
go.uber.org/mock                   v0.5.0
```

**Go version directive:** `go 1.23`

**Toolchain directive:** `toolchain go1.23.4`

---

### 1.2 Chi Router Setup Specification

**File:** `internal/server/router.go`

**Middleware stack order (applied globally via `r.Use()`):**

1. `middleware.RequestID` — generates `X-Request-ID` header (UUID v4). Injects into context under key `RequestIDKey`.
2. `chimiddleware.RealIP` — populates `r.RemoteAddr` from `X-Forwarded-For` / `X-Real-IP`.
3. `requestlog.Middleware` — structured slog request/response logging (see §1.6). Must be after RealIP so IP is accurate.
4. `middleware.Recoverer` — catches panics, logs stack trace at ERROR level with request_id, returns `500 Internal Server Error`.
5. `cors.Handler(cors.Options{...})` — CORS (see below).
6. `middleware.Timeout(30 * time.Second)` — global request timeout. Individual routes may override via `middleware.Timeout(d)` applied to sub-routers.

**CORS configuration:**
```go
cors.Options{
    AllowedOrigins:   cfg.CORSAllowedOrigins, // []string from config, e.g. ["https://app.ordo.so"]
    AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
    ExposedHeaders:   []string{"X-Request-ID"},
    AllowCredentials: true,
    MaxAge:           300,
}
```

**Health endpoint contract:**

```
GET /health
```

Response `200 OK`:
```json
{
  "status": "ok",
  "checks": {
    "postgres": "ok",
    "redis": "ok",
    "s3": "ok"
  },
  "version": "1.0.0",
  "timestamp": "2026-03-10T00:00:00Z"
}
```

Response `503 Service Unavailable` (any check fails):
```json
{
  "status": "degraded",
  "checks": {
    "postgres": "ok",
    "redis": "error: dial tcp: connection refused",
    "s3": "ok"
  },
  "version": "1.0.0",
  "timestamp": "2026-03-10T00:00:00Z"
}
```

**Readiness endpoint contract:**

```
GET /ready
```

Identical schema to `/health`. Used by ECS health checks. Returns `200` only when all checks pass. No caching — each call performs a live ping.

**Metrics endpoint:**
```
GET /metrics
```
No authentication. Returns Prometheus text format. Should be on a separate internal port (`cfg.MetricsPort`, default `9090`) not exposed to public internet. Chi sub-router on `metricsServer` (separate `http.Server` instance).

**Route grouping convention:**
```go
r.Route("/api/v1", func(r chi.Router) {
    r.Use(authMiddleware.Authenticate) // JWT validation for all /api/v1 routes
    r.Mount("/auth", authRouter)       // auth routes bypass JWT (registered before Use)
    r.Mount("/workspaces", workspaceRouter)
    // ... etc
})
```

Auth routes are registered on the root router (not under `/api/v1`) or on a sub-router with `authMiddleware.Authenticate` excluded for public endpoints.

---

### 1.3 PostgreSQL Connection Pool Specification

**File:** `internal/database/postgres.go`

**Pool configuration (`pgxpool.Config`):**

```go
pgxpool.Config{
    ConnConfig: &pgx.ConnConfig{
        // DSN from environment variable DATABASE_URL
        // Format: postgres://user:pass@host:5432/dbname?sslmode=require
    },
    MinConns:          2,
    MaxConns:          20,
    MaxConnLifetime:   30 * time.Minute,
    MaxConnIdleTime:   5 * time.Minute,
    HealthCheckPeriod: 1 * time.Minute,
    // ConnectTimeout applied via context deadline on pool.Acquire
}
```

**Connection acquisition timeout:** 5 seconds. Applied via `ctx, cancel := context.WithTimeout(ctx, 5*time.Second)` before `pool.Acquire(ctx)`.

**Startup health check:** `pool.Ping(ctx)` with 10-second timeout. Service panics (fails fast) if ping fails on startup.

**DSN environment variable:** `DATABASE_URL` (12-factor). Fallback components: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE`.

**pgx type registrations:**
- Register `pgxuuid` codec for `uuid` type (maps to `[16]byte` / `google/uuid.UUID`)
- Register `pgtype.Numeric` for `NUMERIC` columns
- Register `pgtype.Timestamptz` (default behavior, explicit for clarity)

**Connection string SSL spec:**
- Dev: `sslmode=disable`
- Staging/Prod: `sslmode=require` (RDS enforces TLS, no cert verification needed unless using RDS Proxy)

---

### 1.4 Redis Connection Specification

**File:** `internal/cache/redis.go`

**Client:** `github.com/redis/go-redis/v9`

**Configuration:**
```go
redis.Options{
    Addr:            cfg.RedisAddr,        // "localhost:6379" or REDIS_URL
    Password:        cfg.RedisPassword,    // empty string if no auth
    DB:              0,
    MaxRetries:      3,
    MinRetryBackoff: 8 * time.Millisecond,
    MaxRetryBackoff: 512 * time.Millisecond,
    DialTimeout:     5 * time.Second,
    ReadTimeout:     3 * time.Second,
    WriteTimeout:    3 * time.Second,
    PoolSize:        10,
    MinIdleConns:    2,
    MaxIdleConns:    5,
    ConnMaxIdleTime: 5 * time.Minute,
    ConnMaxLifetime: 30 * time.Minute,
}
```

**Startup health check:** `client.Ping(ctx).Err()` with 5-second timeout. Service panics on failure.

**Key namespace convention:** `ordo:{env}:{module}:{key}` e.g. `ordo:prod:ratelimit:user_123:auth:2026031012`.

**Environment variable:** `REDIS_URL` (format: `redis://:password@host:6379/0`) or individual `REDIS_ADDR` + `REDIS_PASSWORD`.

---

### 1.5 golang-migrate Conventions

**File location:** `migrations/` (project root)

**Naming convention:** `{6-digit-sequence}_{snake_case_description}.{up|down}.sql`

Examples:
```
000001_create_extensions.up.sql
000001_create_extensions.down.sql
000002_create_users.up.sql
000002_create_users.down.sql
000003_create_user_sessions.up.sql
000003_create_user_sessions.down.sql
```

**Sequence zero-padding:** Always 6 digits (`000001`, not `1` or `001`).

**First migration** (`000001_create_extensions.up.sql`) must always be:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for LIKE/ILIKE index acceleration
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- for FTS normalization (Phase 6)
```

**Down migration requirement:** Every up migration must have a corresponding down migration. Down migrations must be reversible. If not reversible, the down file contains a comment `-- irreversible: data deletion` and is explicitly documented.

**Auto-migrate behavior:**
- Dev (`APP_ENV=development`): `migrate.Up()` runs automatically on startup after pool connect.
- Prod (`APP_ENV=production`): auto-migrate is **disabled**. Migrations run via `make migrate-up` before deploy, or via ECS task override.

**Makefile targets:**
```makefile
migrate-up:    migrate -path ./migrations -database $$DATABASE_URL up
migrate-down:  migrate -path ./migrations -database $$DATABASE_URL down 1
migrate-create: migrate create -ext sql -dir ./migrations -seq $(name)
migrate-status: migrate -path ./migrations -database $$DATABASE_URL version
```

**sqlc codegen dependency:** `sqlc.yaml` must be regenerated (`make sqlc`) after every migration that adds/alters tables. CI enforces: `sqlc generate --dry-run` must produce no diff.

---

### 1.6 Structured Logging Specification

**Library:** `log/slog` (stdlib, Go 1.21+)

**Format:** JSON handler (`slog.NewJSONHandler`) in all environments. Human-readable text format available via `LOG_FORMAT=text` env var for local dev only.

**Log level:** Configured via `LOG_LEVEL` env var. Default: `info`. Valid: `debug`, `info`, `warn`, `error`.

**Global logger initialization:**
```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level:     slog.LevelInfo, // from config
    AddSource: cfg.AppEnv == "development",
}))
slog.SetDefault(logger)
```

**Required fields on every log line:**

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `time` | RFC3339Nano string | auto (slog) | Timestamp |
| `level` | string | auto (slog) | `INFO`, `WARN`, `ERROR`, `DEBUG` |
| `msg` | string | caller | Human-readable message |
| `trace_id` | string | middleware | X-Request-ID or generated UUID |
| `user_id` | string (UUID) | auth middleware | Authenticated user, `""` if unauthenticated |
| `workspace_id` | string (UUID) | workspace middleware | Active workspace, `""` if not in workspace context |
| `duration_ms` | float64 | request log middleware | Request duration in milliseconds (2 decimal places) |
| `status` | int | request log middleware | HTTP response status code |
| `method` | string | request log middleware | HTTP method |
| `path` | string | request log middleware | URL path (not query string) |
| `source` | object | slog (dev only) | `{"function": "...", "file": "...", "line": N}` |

**Context propagation:** Use `slog.With` to attach `trace_id`, `user_id`, `workspace_id` to a derived logger stored in `context.Context` via a `ContextLogger` helper:
```go
// internal/logger/context.go
func WithContext(ctx context.Context, logger *slog.Logger) context.Context
func FromContext(ctx context.Context) *slog.Logger
```

**Error logging convention:** Always include `err` attribute: `logger.Error("description", "err", err)`. Stack traces are NOT logged by default (noise). On panics (recovery middleware), log the stack trace at `ERROR` level with `"stack"` attribute.

**Request log middleware** (`internal/middleware/requestlog.go`):
- Logs at `INFO` for 2xx/3xx, `WARN` for 4xx, `ERROR` for 5xx.
- `duration_ms` calculated as `float64(time.Since(start).Microseconds()) / 1000.0`.
- Does NOT log request/response bodies (PII risk). Body logging available only via `LOG_LEVEL=debug` + explicit `DEBUG_LOG_BODIES=true` flag.

---

### 1.7 Prometheus Metrics Specification

**Registry:** Default `prometheus.DefaultRegisterer` / `prometheus.DefaultGatherer`. In tests, use a fresh `prometheus.NewRegistry()` to avoid cross-test pollution.

**Required metrics:**

#### `http_requests_total`
- **Type:** Counter
- **Labels:** `method`, `path`, `status_code`
- **Description:** Total number of HTTP requests processed.
- **Note:** `path` must be the Chi route pattern (e.g. `/api/v1/workspaces/{workspaceId}`), NOT the actual URL (prevents high cardinality from UUID values). Use `chi.RouteContext(r.Context()).RoutePattern()`.

#### `http_request_duration_seconds`
- **Type:** Histogram
- **Labels:** `method`, `path`, `status_code`
- **Buckets:** `[]float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}`
- **Description:** HTTP request latency distribution.

#### `db_query_duration_seconds`
- **Type:** Histogram
- **Labels:** `operation`, `table`
- **Buckets:** `[]float64{.001, .005, .01, .025, .05, .1, .25, .5, 1}`
- **Description:** PostgreSQL query execution time.
- **Implementation:** Thin wrapper around sqlc-generated queries; each repository method records start/end time.

#### `db_pool_connections`
- **Type:** Gauge
- **Labels:** `state` (`idle`, `in_use`, `total`)
- **Description:** Current pgxpool connection states.
- **Collection:** Polled via `pgxpool.Stat()` in a background goroutine every 15 seconds.

#### `redis_operations_total`
- **Type:** Counter
- **Labels:** `command`, `status` (`ok`, `error`)
- **Description:** Redis command invocations.

#### `asynq_tasks_total`
- **Type:** Counter
- **Labels:** `queue`, `task_type`, `status` (`processed`, `failed`, `retried`)
- **Description:** Asynq task processing counts.

**Metric registration:** All metrics registered in `internal/metrics/metrics.go` with package-level vars. Initialized once at startup via `metrics.Init()`.

---

### 1.8 Docker Compose Services Specification

**File:** `docker-compose.yml` (project root)

**Services:**

#### `postgres`
```yaml
image: postgres:16-alpine
environment:
  POSTGRES_DB: ordo_dev
  POSTGRES_USER: ordo
  POSTGRES_PASSWORD: ordo_dev_password
ports:
  - "5432:5432"
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./scripts/postgres-init:/docker-entrypoint-initdb.d
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ordo -d ordo_dev"]
  interval: 5s
  timeout: 5s
  retries: 5
```

#### `redis`
```yaml
image: redis:7-alpine
command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
ports:
  - "6379:6379"
volumes:
  - redis_data:/data
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 3s
  retries: 5
```

#### `minio`
```yaml
image: minio/minio:latest
command: server /data --console-address ":9001"
environment:
  MINIO_ROOT_USER: ordo_minio
  MINIO_ROOT_PASSWORD: ordo_minio_secret
ports:
  - "9000:9000"    # S3 API
  - "9001:9001"    # Console UI
volumes:
  - minio_data:/data
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
  interval: 10s
  timeout: 5s
  retries: 3
```

#### `mailhog`
```yaml
image: mailhog/mailhog:latest
ports:
  - "1025:1025"    # SMTP
  - "8025:8025"    # Web UI
```

**MinIO bucket initialization:** `scripts/postgres-init/` contains SQL init; separately, a `make minio-init` target calls `mc mb` to create the `ordo-uploads` bucket with public-read policy for dev.

**App service (local dev):**
```yaml
app:
  build: .
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  env_file: .env.local
  ports:
    - "8080:8080"
    - "9090:9090"   # metrics
  volumes:
    - .:/app        # live reload via air
```

**Volumes declared:**
```yaml
volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

### 1.9 CI Pipeline Specification

**File:** `.github/workflows/ci.yml`

**Trigger:** `push` to any branch; `pull_request` targeting `main` or `develop`.

**Jobs and order (sequential, each depends on prior):**

#### Job 1: `lint`
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-go@v5
    with: { go-version: '1.23' }
  - name: golangci-lint
    uses: golangci/golangci-lint-action@v6
    with:
      version: v1.62.0
      args: --timeout=5m
  - name: staticcheck
    run: go install honnef.co/go/tools/cmd/staticcheck@latest && staticcheck ./...
  - name: go vet
    run: go vet ./...
  - name: sqlc diff check
    run: |
      go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
      sqlc generate --dry-run
      git diff --exit-code internal/db/
```

#### Job 2: `test`
```yaml
needs: lint
services:
  # No services needed — testcontainers-go spins up its own
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-go@v5
    with: { go-version: '1.23' }
  - name: Cache Go modules
    uses: actions/cache@v4
    with:
      path: ~/go/pkg/mod
      key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
  - name: Run tests
    run: go test -race -coverprofile=coverage.out -covermode=atomic ./...
    env:
      TESTCONTAINERS_RYUK_DISABLED: false
  - name: Upload coverage
    uses: codecov/codecov-action@v4
    with: { files: coverage.out }
  - name: Check coverage threshold
    run: |
      COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
      echo "Coverage: $COVERAGE%"
      awk -v cov="$COVERAGE" 'BEGIN { if (cov+0 < 70) { print "Coverage below 70%"; exit 1 } }'
```

#### Job 3: `build`
```yaml
needs: test
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-go@v5
    with: { go-version: '1.23' }
  - name: Build binary
    run: CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s -X main.Version=${GITHUB_SHA::8}" -o bin/api ./cmd/api/
  - name: Build Docker image
    run: docker build -t ordo-api:${GITHUB_SHA::8} .
  - name: Run govulncheck
    run: go install golang.org/x/vuln/cmd/govulncheck@latest && govulncheck ./...
  - name: Run gosec
    run: go install github.com/securego/gosec/v2/cmd/gosec@latest && gosec -severity medium -confidence medium ./...
```

#### Job 4: `docker-push` (main branch only)
```yaml
needs: build
if: github.ref == 'refs/heads/main'
steps:
  - name: Login to ECR
    uses: aws-actions/amazon-ecr-login@v2
  - name: Push to ECR
    run: |
      docker tag ordo-api:${GITHUB_SHA::8} $ECR_REGISTRY/ordo-api:${GITHUB_SHA::8}
      docker tag ordo-api:${GITHUB_SHA::8} $ECR_REGISTRY/ordo-api:latest
      docker push $ECR_REGISTRY/ordo-api:${GITHUB_SHA::8}
      docker push $ECR_REGISTRY/ordo-api:latest
```

**golangci-lint config** (`.golangci.yml`): Enable `errcheck`, `gosimple`, `govet`, `ineffassign`, `staticcheck`, `unused`, `gofmt`, `goimports`, `misspell`, `bodyclose`, `noctx`.

---

## Phase 2 — Auth & Identity

### 2.1 JWT Claims Specification

**Algorithm:** RS256 (RSA SHA-256 signature). Private key signs; public key verifies.

**Key management:**
- Private key: `JWT_PRIVATE_KEY` env var (PEM-encoded, base64 if multiline)
- Public key: `JWT_PUBLIC_KEY` env var (PEM-encoded)
- Key size: 2048-bit RSA minimum; 4096-bit recommended for prod
- Key rotation: new key pair deployed with both old+new public keys accepted during rotation window (30-minute overlap)

#### Access Token Claims

```json
{
  "iss": "https://api.ordo.so",
  "sub": "01934b2a-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "aud": ["ordo-api"],
  "exp": 1741566000,
  "iat": 1741565100,
  "nbf": 1741565100,
  "jti": "01934b2b-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "user_id": "01934b2a-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com",
  "subscription_tier": "pro",
  "token_type": "access"
}
```

**Access token TTL:** 15 minutes. `exp = iat + 900`.

**Standard claims used:** `iss`, `sub`, `aud`, `exp`, `iat`, `nbf`, `jti`.

Custom claims MUST NOT include sensitive data (no `password_hash`, no OAuth tokens, no PII beyond `email`).

#### Refresh Token Claims

```json
{
  "iss": "https://api.ordo.so",
  "sub": "01934b2a-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "aud": ["ordo-api"],
  "exp": 1742170800,
  "iat": 1741565100,
  "nbf": 1741565100,
  "jti": "01934b2c-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "user_id": "01934b2a-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "session_id": "01934b2d-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "family_id": "01934b2e-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "token_type": "refresh"
}
```

**Refresh token TTL:** 7 days. `exp = iat + 604800`.

**`family_id`:** Groups all refresh tokens issued within a single original login event. If a refresh token is presented that was already used (replay detected), the entire family is revoked immediately.

**`session_id`:** Maps to `user_sessions.id`. Used to look up the stored token hash.

---

### 2.2 Refresh Token Storage Specification

**Table:** `user_sessions`

```sql
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  TEXT NOT NULL,      -- SHA-256(raw_refresh_jwt), hex-encoded
    family_id       UUID NOT NULL,          -- detects token replay across rotation chain
    device_info     JSONB,                  -- { "user_agent": "...", "platform": "..." }
    ip_address      INET,
    used_at         TIMESTAMPTZ,            -- NULL = not yet used; set on first (and only) use
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,            -- NULL = active
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_family_id ON user_sessions(family_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at)
    WHERE revoked_at IS NULL;
```

**Hash computation:** `hex(SHA-256(raw_jwt_string))`. Do NOT store the raw JWT.

**Token rotation flow:**
1. Client presents refresh JWT.
2. Service validates JWT signature + expiry.
3. Compute `SHA-256(raw_jwt)` → `token_hash`.
4. Query: `SELECT * FROM user_sessions WHERE refresh_token_hash = $hash AND revoked_at IS NULL AND expires_at > NOW()`.
5. If `used_at IS NOT NULL` → token already used → revoke entire family (set `revoked_at = NOW()` WHERE `family_id = $family_id`) → return `401 Unauthorized` with error code `TOKEN_REPLAYED`.
6. Mark current session `used_at = NOW()`.
7. Issue new access token + new refresh token with same `family_id`, new `session_id`.
8. Insert new `user_sessions` row.
9. Return new token pair.

**Cleanup job:** Asynq periodic task (`ExpiredSessionCleanupJob`) runs daily. Deletes rows where `expires_at < NOW() - interval '7 days'` (keep expired for forensics window).

---

### 2.3 OAuth2 PKCE Flow Specification

**Library:** `golang.org/x/oauth2`

**PKCE requirement:** All three providers require PKCE (code_verifier / code_challenge). Apple additionally requires `response_mode=form_post`.

#### Code Verifier / Challenge Generation
```go
// code_verifier: 32 random bytes, base64url-encoded (no padding) → 43 chars
verifier := base64.RawURLEncoding.EncodeToString(randomBytes(32))
// code_challenge: SHA-256(verifier), base64url-encoded
challenge := base64.RawURLEncoding.EncodeToString(sha256Sum([]byte(verifier)))
// code_challenge_method: S256
```

**State parameter:** UUID v4, stored in Redis with TTL 10 minutes. Key: `ordo:prod:oauth:state:{state_value}`. Value: JSON `{"provider": "google", "code_verifier": "...", "redirect_uri": "..."}`. Validated on callback; deleted after use.

#### Google OAuth2

**Scopes:** `openid email profile`

**Config:**
```go
oauth2.Config{
    ClientID:     cfg.GoogleClientID,
    ClientSecret: cfg.GoogleClientSecret,
    RedirectURL:  cfg.BaseURL + "/api/v1/auth/oauth/google/callback",
    Scopes:       []string{"openid", "email", "profile"},
    Endpoint:     google.Endpoint,
}
```

**Callback validation:**
- Verify `state` matches Redis-stored value
- Exchange `code` for token using `code_verifier`
- Call `https://www.googleapis.com/oauth2/v3/userinfo` to get profile
- Fields used: `sub` (provider_id), `email`, `name`, `picture`

#### GitHub OAuth2

**Scopes:** `read:user user:email`

**Config:**
```go
oauth2.Config{
    ClientID:     cfg.GitHubClientID,
    ClientSecret: cfg.GitHubClientSecret,
    RedirectURL:  cfg.BaseURL + "/api/v1/auth/oauth/github/callback",
    Scopes:       []string{"read:user", "user:email"},
    Endpoint:     github.Endpoint,
}
```

**Note:** GitHub does not support PKCE natively in its standard OAuth flow. Use state parameter CSRF protection only. PKCE omitted for GitHub.

**Callback validation:**
- Exchange `code` → token
- `GET https://api.github.com/user` (Authorization: Bearer token) → `id` (provider_id), `login`, `name`, `avatar_url`
- `GET https://api.github.com/user/emails` → find primary + verified email

#### Apple Sign-In

**Scopes:** `name email`

**Special requirements:**
- `response_mode=form_post` (POST callback, not GET)
- Client secret is a JWT signed with Apple private key (ES256), TTL 6 months, regenerated before expiry
- Apple only sends `name` on first authorization; must store it from first callback

**Config:**
```go
oauth2.Config{
    ClientID:     cfg.AppleClientID,          // bundle ID e.g. "so.ordo.creators"
    ClientSecret: generateAppleClientSecret(), // signed JWT
    RedirectURL:  cfg.BaseURL + "/api/v1/auth/oauth/apple/callback",
    Scopes:       []string{"name", "email"},
    Endpoint: oauth2.Endpoint{
        AuthURL:  "https://appleid.apple.com/auth/authorize",
        TokenURL: "https://appleid.apple.com/auth/token",
    },
}
```

**`generateAppleClientSecret()`:** Signs a JWT with:
- `iss`: Team ID
- `iat`: now
- `exp`: now + 15552000 (180 days)
- `aud`: `https://appleid.apple.com`
- `sub`: client ID
Signed with ES256 using Apple-issued private key (`.p8` file, loaded from `APPLE_PRIVATE_KEY` env var).

---

### 2.4 Auth Endpoint Contracts

All endpoints under `/api/v1/auth/`. Content-Type: `application/json`.

Error response shape (all auth errors):
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Human-readable message",
    "request_id": "uuid"
  }
}
```

#### `POST /api/v1/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "full_name": "Jane Doe"
}
```

**Validation:**
- `email`: valid RFC 5322 format, max 255 chars, lowercased before storage
- `password`: min 8 chars, max 72 chars (bcrypt limit), must contain at least one uppercase, one lowercase, one digit
- `full_name`: min 1 char, max 100 chars, trimmed

**Response `201 Created`:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "subscription_tier": "free",
    "is_email_verified": false,
    "created_at": "2026-03-10T00:00:00Z"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 900
}
```

**Error codes:**
- `EMAIL_ALREADY_EXISTS` → `409 Conflict`
- `VALIDATION_ERROR` → `422 Unprocessable Entity` (with `fields` array)
- `RATE_LIMITED` → `429 Too Many Requests` (Retry-After header set)

**Side effect:** Dispatches `EmailVerificationJob` to Asynq queue `critical`.

#### `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response `200 OK`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "subscription_tier": "pro",
    "is_email_verified": true
  }
}
```

**Error codes:**
- `INVALID_CREDENTIALS` → `401 Unauthorized` (same message for wrong email or wrong password — no enumeration)
- `EMAIL_NOT_VERIFIED` → `403 Forbidden` (with `resend_verification_available: true`)
- `ACCOUNT_DELETED` → `403 Forbidden`
- `RATE_LIMITED` → `429 Too Many Requests`

**Rate limit:** 10 requests per minute per IP (sliding window, Redis). Not per-user — protects against credential stuffing.

#### `POST /api/v1/auth/refresh`

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response `200 OK`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 900
}
```

**Error codes:**
- `TOKEN_EXPIRED` → `401`
- `TOKEN_INVALID` → `401`
- `TOKEN_REPLAYED` → `401` (triggers family revocation, logs security event)
- `SESSION_REVOKED` → `401`

#### `POST /api/v1/auth/logout`

**Auth:** Required (Bearer access token).

**Request:** Empty body or `{}`.

**Response `204 No Content`.**

**Behavior:** Revokes the specific session identified by `session_id` in the refresh token claims. Access token is short-lived and cannot be revoked (stateless by design). Client must discard both tokens.

#### `POST /api/v1/auth/logout-all`

**Auth:** Required.

**Request:** Empty body.

**Response `204 No Content`.**

**Behavior:** Sets `revoked_at = NOW()` on all `user_sessions` rows for this `user_id`.

#### `POST /api/v1/auth/forgot-password`

**Request:**
```json
{ "email": "user@example.com" }
```

**Response `200 OK`:**
```json
{ "message": "If an account with that email exists, a reset link has been sent." }
```

Always returns 200 regardless of whether email exists (prevents email enumeration). Dispatches `PasswordResetJob` if user found.

**Rate limit:** 5 requests per minute per IP.

#### `POST /api/v1/auth/reset-password`

**Request:**
```json
{
  "token": "hex-encoded-token",
  "new_password": "NewSecureP@ss123"
}
```

**Response `200 OK`:**
```json
{ "message": "Password reset successfully." }
```

**Error codes:**
- `TOKEN_EXPIRED` → `400`
- `TOKEN_INVALID` → `400`

**Behavior:** Validates token (stored as SHA-256 hash on `users.password_reset_token_hash`), updates password hash, deletes token, revokes all sessions.

#### `POST /api/v1/auth/verify-email`

**Request:**
```json
{ "token": "hex-encoded-verification-token" }
```

**Response `200 OK`:**
```json
{ "message": "Email verified successfully." }
```

**Error codes:**
- `TOKEN_EXPIRED` → `400`
- `TOKEN_INVALID` → `400`
- `ALREADY_VERIFIED` → `400`

#### `GET /api/v1/auth/oauth/{provider}`

**Path params:** `provider` ∈ `{google, github, apple}`

**Response `302 Found`:** Redirect to provider authorization URL with `state`, `code_challenge`, `code_challenge_method=S256`.

**Error:** `400 Bad Request` if provider unknown.

#### `GET /api/v1/auth/oauth/{provider}/callback` (Apple: POST)

**Query params (GET):** `code`, `state`
**Form params (Apple POST):** `code`, `state`, `user` (JSON, first auth only)

**Response `302 Found`:** Redirect to frontend with fragment `#access_token=...&refresh_token=...` OR to frontend error page on failure.

**Behavior on new user:** Auto-registers user with `is_email_verified=true` (email sourced from verified OAuth provider). No password set (`password_hash` = NULL).

**Behavior on existing user (same email):** Links OAuth provider to existing account. Logs in.

#### `GET /api/v1/users/me`

**Auth:** Required.

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "avatar_url": "https://...",
  "subscription_tier": "pro",
  "ai_credits_balance": 450,
  "streak_current": 7,
  "streak_longest": 21,
  "is_email_verified": true,
  "oauth_provider": "google",
  "last_active_at": "2026-03-10T00:00:00Z",
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### `PUT /api/v1/users/me`

**Auth:** Required.

**Request:**
```json
{
  "full_name": "Jane Smith",
  "avatar_url": "https://cdn.example.com/avatar.jpg"
}
```

**Response `200 OK`:** Updated user object (same shape as GET /me).

**Validation:** `full_name` max 100 chars; `avatar_url` valid URL or null.

#### `PUT /api/v1/users/me/preferences`

**Auth:** Required.

**Request:** Arbitrary JSONB object stored in `users.preferences`. No fixed schema enforced server-side; client owns preference keys. Max size: 16KB.

**Response `200 OK`:** `{ "preferences": { ... } }`.

---

### 2.5 Auth Rate Limiting Specification

**Implementation:** Redis sliding window. Middleware in `internal/middleware/ratelimit.go`.

**Algorithm:** Sliding window log using Redis sorted set.
```
Key: ordo:{env}:ratelimit:{endpoint_group}:{ip_address}:{window_start_minute}
Command sequence:
  ZADD key {now_unix_ms} {now_unix_ms}   -- add current request timestamp
  ZREMRANGEBYSCORE key 0 {now_unix_ms - window_ms}  -- remove old entries
  ZCARD key  -- count remaining
  EXPIRE key {window_seconds + 10}  -- cleanup TTL
```

**Limits:**

| Endpoint | Limit | Window | Key Dimension |
|----------|-------|--------|---------------|
| `POST /auth/login` | 10 req | 1 min | Per IP |
| `POST /auth/register` | 5 req | 1 min | Per IP |
| `POST /auth/forgot-password` | 5 req | 1 min | Per IP |
| `POST /auth/reset-password` | 5 req | 1 min | Per IP |
| `POST /auth/refresh` | 20 req | 1 min | Per IP |

**Response on limit exceeded:**
```
HTTP 429 Too Many Requests
Retry-After: 45   (seconds until window resets)
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1741565160  (unix timestamp)
```

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 45
  }
}
```

---

### 2.6 Password Hashing Specification

**Algorithm:** bcrypt, cost factor 12.

**Library:** `golang.org/x/crypto/bcrypt`

```go
// Hashing (registration / password change)
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)

// Verification (login)
err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(inputPassword))
// err == nil → match
// err == bcrypt.ErrMismatchedHashAndPassword → no match
```

**Timing:** At cost 12, hashing takes ~250–400ms on typical hardware. This is intentional (slows brute force). Do NOT parallelize bcrypt calls; the delay is the security property.

**Password change flow:** Hash new password, update `users.password_hash`, revoke all existing sessions, require re-login.

**Pepper:** NOT used (complexity without proportional security gain at this scale; key rotation of pepper is operationally risky). bcrypt cost is the primary defense.

**Maximum input length:** 72 characters. Validate and reject passwords longer than 72 chars before hashing (bcrypt silently truncates at 72 bytes, leading to a security footgun if not caught).

---

### 2.7 Email Verification Flow Specification

**Token generation:**
```go
// 32 random bytes → hex string (64 chars)
rawBytes := make([]byte, 32)
rand.Read(rawBytes)
token := hex.EncodeToString(rawBytes)
tokenHash := hex.EncodeToString(sha256.Sum256([]byte(token))[:])
// Store tokenHash in users.email_verification_token_hash
// Store token expiry: users.email_verification_token_expires_at = NOW() + 24h
// Send raw token to user via email
```

**Token TTL:** 24 hours.

**Email content:** Contains link `https://app.ordo.so/verify-email?token={raw_token}`.

**Frontend flow:** Frontend extracts `token` from URL, calls `POST /api/v1/auth/verify-email` with token in body.

**Resend:** `POST /api/v1/auth/resend-verification` (rate limited: 3 per hour per user). Generates new token, invalidates old.

**Asynq job** (`EmailVerificationJob`):
```go
type EmailVerificationPayload struct {
    UserID    string `json:"user_id"`
    Email     string `json:"email"`
    Token     string `json:"token"`    // raw token, NOT hash
    FullName  string `json:"full_name"`
}
```
Queue: `critical`. Max retries: 3. Retry backoff: exponential (10s, 100s, 1000s).

---

## Phase 3 — Workspaces & RBAC

### 3.1 Workspace Middleware Specification

**File:** `internal/middleware/workspace.go`

**Middleware: `RequireWorkspace`**

Applied to all routes under `/api/v1/workspaces/{workspaceId}/...`.

```go
func (m *WorkspaceMiddleware) RequireWorkspace(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        workspaceID := chi.URLParam(r, "workspaceId")
        // 1. Parse workspaceID as UUID; return 400 if invalid
        // 2. Load UserClaims from context (set by auth middleware)
        // 3. Query workspace_members WHERE workspace_id=$1 AND user_id=$2
        //    → cache result in Redis for 5 minutes
        //    Key: ordo:{env}:ws_member:{workspace_id}:{user_id}
        // 4. If no membership found → 403 Forbidden, code: NOT_WORKSPACE_MEMBER
        // 5. Load workspace record; if deleted → 404 Not Found
        // 6. Inject WorkspaceContext{workspace, membership} into context
        next.ServeHTTP(w, r)
    })
}
```

**Context keys** (`internal/contextkeys/keys.go`):
```go
type contextKey string
const (
    ContextKeyUserClaims   contextKey = "user_claims"
    ContextKeyWorkspace    contextKey = "workspace"
    ContextKeyMembership   contextKey = "membership"
    ContextKeyRequestID    contextKey = "request_id"
    ContextKeyLogger       contextKey = "logger"
)
```

**WorkspaceContext type:**
```go
type WorkspaceContext struct {
    Workspace  *db.Workspace
    Membership *db.WorkspaceMember
}
```

**Cache invalidation:** When a member is removed or role is changed, delete key `ordo:{env}:ws_member:{workspace_id}:{user_id}`.

---

### 3.2 RBAC Enforcement Specification

**Role hierarchy:** `owner > admin > editor > viewer`

**Role type:**
```go
type WorkspaceRole string
const (
    RoleOwner  WorkspaceRole = "owner"
    RoleAdmin  WorkspaceRole = "admin"
    RoleEditor WorkspaceRole = "editor"
    RoleViewer WorkspaceRole = "viewer"
)
```

**Middleware factory:**
```go
func RequireRole(roles ...WorkspaceRole) func(http.Handler) http.Handler
```

Example usage in router: `r.With(workspaceMiddleware.RequireRole(RoleOwner, RoleAdmin)).Delete("/members/{userId}", handler.RemoveMember)`.

**Permission table:**

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| View workspace | Y | Y | Y | Y |
| Update workspace settings | Y | Y | N | N |
| Delete workspace | Y | N | N | N |
| Invite members | Y | Y | N | N |
| Remove members | Y | Y | N | N |
| Change member roles | Y | Y | N | N |
| Transfer ownership | Y | N | N | N |
| Create/edit/delete content | Y | Y | Y | N |
| View content | Y | Y | Y | Y |
| Publish content | Y | Y | Y | N |
| Manage platform credentials | Y | Y | N | N |
| View analytics | Y | Y | Y | Y |
| Manage AI conversations | Y | Y | Y | N |
| View audit logs | Y | Y | N | N |
| Manage sponsorships | Y | Y | Y | N |
| View sponsorships | Y | Y | Y | Y |
| Manage billing | Y | N | N | N |

**RBAC error response:**
```json
{
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "This action requires admin or owner role.",
    "required_roles": ["admin", "owner"],
    "your_role": "editor"
  }
}
```
HTTP status: `403 Forbidden`.

**Rule: workspace_id from context, never URL.** Repository methods receive `workspace_id` extracted from the authenticated `WorkspaceContext`, not from URL params. URL param is used only to route to the correct workspace middleware load; all downstream queries use the context value. This prevents IDOR.

---

### 3.3 Invitation Token Specification

**Token generation:**
```go
// 32 random bytes → base64url-encoded (no padding) → 43 chars
rawBytes := make([]byte, 32)
rand.Read(rawBytes)
token := base64.RawURLEncoding.EncodeToString(rawBytes)
// Store token directly in workspace_invitations.token (indexed as UNIQUE)
// Token is not hashed — it is already high entropy and single-use
```

**Token TTL:** 7 days from creation. `expires_at = NOW() + interval '7 days'`.

**Single-use enforcement:** `accepted_at IS NOT NULL` → token already used → return `400 Bad Request`, code `INVITATION_ALREADY_ACCEPTED`.

**Invitation link format:** `https://app.ordo.so/invite/{token}`

**Accept flow:**
1. `POST /api/v1/workspaces/invitations/{token}/accept` — authenticated endpoint (user must be logged in).
2. Validate token: not expired, not accepted, invitation email must match authenticated user's email.
3. Check workspace member limits (tier enforcement, §3.4).
4. Insert `workspace_members` row.
5. Set `workspace_invitations.accepted_at = NOW()`.
6. Return `200 OK` with workspace object.

**Email mismatch:** If authenticated user's email differs from invitation email, return `403 Forbidden`, code `INVITATION_EMAIL_MISMATCH`. This prevents token sharing.

---

### 3.4 Tier Enforcement Specification

**Tier limits enforced in service layer** (`internal/workspace/service.go`):

| Limit | Free | Pro | Enterprise |
|-------|------|-----|------------|
| Max workspaces owned | 1 | 3 | Unlimited |
| Max workspace members | 3 | 10 | Unlimited |
| Max invitations pending | 5 | 20 | Unlimited |

**Workspace creation check:**
```go
count, err := repo.CountOwnedWorkspaces(ctx, userID)
if count >= tierLimit(user.SubscriptionTier, "workspaces") {
    return ErrWorkspaceLimitReached
}
```

**Error response:**
```json
{
  "error": {
    "code": "WORKSPACE_LIMIT_REACHED",
    "message": "Your plan allows a maximum of 1 workspace. Upgrade to Pro to create more.",
    "current_tier": "free",
    "limit": 1,
    "upgrade_url": "https://app.ordo.so/billing/upgrade"
  }
}
```
HTTP status: `402 Payment Required`.

**Source of truth for tier:** `users.subscription_tier` column (updated by Stripe webhook in Phase 5). NOT the JWT claim for tier enforcement in workspace operations (JWT can be stale during the 15-min TTL). Make a DB read for limit checks.

---

### 3.5 Workspace Endpoint Contracts

#### `POST /api/v1/workspaces`

**Auth:** Required. No workspace context needed.

**Request:**
```json
{
  "name": "My Creator Studio",
  "logo_url": "https://..."   // optional
}
```

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "name": "My Creator Studio",
  "slug": "my-creator-studio",
  "owner_id": "uuid",
  "plan_tier": "free",
  "logo_url": null,
  "settings": {},
  "member_count": 1,
  "created_at": "2026-03-10T00:00:00Z"
}
```

**Slug generation:** `slug = strings.ToLower(regexp.ReplaceAll(name, /[^a-z0-9]+/, "-"))`. On collision, append `-2`, `-3`, etc. Max 3 retries then return `409 Conflict`.

#### `GET /api/v1/workspaces`

**Auth:** Required.

**Response `200 OK`:**
```json
{
  "workspaces": [
    {
      "id": "uuid",
      "name": "My Creator Studio",
      "slug": "my-creator-studio",
      "plan_tier": "free",
      "role": "owner",
      "member_count": 3,
      "created_at": "..."
    }
  ]
}
```

Returns all workspaces where `user_id` is a member (any role).

#### `GET /api/v1/workspaces/{workspaceId}`

**Auth + Workspace middleware.**

**Response `200 OK`:** Full workspace object including `settings` JSONB.

#### `PUT /api/v1/workspaces/{workspaceId}`

**Required role:** `admin`, `owner`.

**Request:**
```json
{
  "name": "Updated Name",
  "logo_url": "https://...",
  "settings": { "default_platform": "youtube" }
}
```

**Response `200 OK`:** Updated workspace object.

**Note:** `slug` is NOT updated when `name` changes (changing slug would break existing links). Slug is immutable after creation.

#### `DELETE /api/v1/workspaces/{workspaceId}`

**Required role:** `owner` only.

**Request:** Empty body. Requires confirmation header: `X-Confirm-Delete: {workspace_slug}`.

**Response `204 No Content`.**

**Behavior:** Soft delete (`deleted_at = NOW()`). All workspace data retained for 30 days before hard delete (background job).

#### `GET /api/v1/workspaces/{workspaceId}/members`

**Auth + Workspace middleware (any role).**

**Response `200 OK`:**
```json
{
  "members": [
    {
      "id": "membership_uuid",
      "user_id": "uuid",
      "email": "user@example.com",
      "full_name": "Jane Doe",
      "avatar_url": "...",
      "role": "editor",
      "joined_at": "..."
    }
  ],
  "total": 3
}
```

#### `POST /api/v1/workspaces/{workspaceId}/members/{userId}/role`

**Required role:** `admin`, `owner`.

**Request:**
```json
{ "role": "editor" }
```

**Response `200 OK`:** Updated member object.

**Constraints:** Cannot change owner's role via this endpoint. Use ownership transfer endpoint.

#### `DELETE /api/v1/workspaces/{workspaceId}/members/{userId}`

**Required role:** `admin`, `owner`.

**Response `204 No Content`.**

**Constraints:** Cannot remove workspace owner. Cannot remove yourself (use leave endpoint).

#### `POST /api/v1/workspaces/{workspaceId}/invitations`

**Required role:** `admin`, `owner`.

**Request:**
```json
{
  "email": "newmember@example.com",
  "role": "editor"
}
```

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "email": "newmember@example.com",
  "role": "editor",
  "token": "base64url-token",
  "expires_at": "..."
}
```

**Side effect:** Dispatches `WorkspaceInvitationJob` (Asynq) to send invitation email.

#### `GET /api/v1/workspaces/{workspaceId}/invitations`

**Required role:** `admin`, `owner`.

**Response `200 OK`:** Array of pending invitations (where `accepted_at IS NULL AND expires_at > NOW()`).

#### `DELETE /api/v1/workspaces/{workspaceId}/invitations/{invitationId}`

**Required role:** `admin`, `owner`.

**Response `204 No Content`.** Hard deletes the invitation record.

#### `POST /api/v1/workspaces/invitations/{token}/accept`

**Auth:** Required (no workspace context middleware — workspace derived from token).

**Response `200 OK`:** Workspace object for the joined workspace.

---

## Phase 4 — Core Content Platform

### 4.1 Ideas Module: Endpoint Contracts

All endpoints prefixed: `/api/v1/workspaces/{workspaceId}/ideas`

**Required role for mutations:** `editor`, `admin`, `owner`.
**Required role for reads:** any member.

#### `POST /api/v1/workspaces/{workspaceId}/ideas`

**Request:**
```json
{
  "title": "10 productivity hacks for developers",
  "description": "A breakdown of tools and techniques...",
  "platform_target": ["youtube", "tiktok"],
  "content_type": "video",
  "tags": ["productivity", "developer", "tools"]
}
```

**Validation:**
- `title`: required, 1–200 chars
- `description`: optional, max 5000 chars
- `platform_target`: array of valid platform strings, min 1 element
- `content_type`: one of `video`, `short`, `post`, `newsletter`, `podcast`
- `tags`: optional, max 10 items, each max 50 chars

**Response `201 Created`:** Full idea object.

**Initial status:** `captured` (see §4.2 for state machine).

#### `GET /api/v1/workspaces/{workspaceId}/ideas`

**Query params:**
- `status`: filter by status (comma-separated for multiple)
- `platform`: filter by platform_target contains
- `tag`: filter by tag
- `created_by`: filter by user UUID
- `page`: integer, default 1
- `per_page`: integer, default 20, max 100
- `sort`: `created_at`, `updated_at`, `validation_score` (default `created_at`)
- `order`: `asc`, `desc` (default `desc`)

**Response `200 OK`:**
```json
{
  "ideas": [ { ...idea objects... } ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

#### `GET /api/v1/workspaces/{workspaceId}/ideas/{ideaId}`

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "created_by": { "id": "uuid", "full_name": "Jane Doe", "avatar_url": "..." },
  "title": "...",
  "description": "...",
  "status": "validated",
  "platform_target": ["youtube"],
  "content_type": "video",
  "tags": ["productivity"],
  "validation_score": 78.5,
  "validation_scores": {
    "originality": 80,
    "audience_fit": 85,
    "trend_alignment": 70,
    "monetization_potential": 75,
    "overall": 78.5,
    "ai_reasoning": "...",
    "scored_at": "...",
    "scored_by_model": "claude-3-5-sonnet-20241022"
  },
  "promoted_to_content_id": null,
  "created_at": "...",
  "updated_at": "..."
}
```

#### `PUT /api/v1/workspaces/{workspaceId}/ideas/{ideaId}`

**Request:** Same fields as POST, all optional.

**Constraints:** Cannot edit if status is `archived` or `promoted`.

**Response `200 OK`:** Updated idea object.

#### `DELETE /api/v1/workspaces/{workspaceId}/ideas/{ideaId}`

**Required role:** `admin`, `owner`.

**Response `204 No Content`.** Soft delete.

#### `POST /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/validate`

**Required role:** `editor`, `admin`, `owner`.

**Request:** Empty body.

**Response `202 Accepted`:**
```json
{
  "message": "Validation job queued.",
  "job_id": "asynq-task-id",
  "idea_id": "uuid",
  "estimated_completion_seconds": 30
}
```

**Behavior:** Dispatches `IdeaValidationJob` to Asynq queue `default`. Sets idea status to `validating`. Does NOT wait for AI response.

**Error:** `409 Conflict` if idea is already being validated (`status = "validating"`).

#### `POST /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/promote`

**Required role:** `editor`, `admin`, `owner`.

**Request:**
```json
{
  "content_type": "video",    // optional override
  "platform_target": ["youtube"]  // optional override
}
```

**Response `201 Created`:**
```json
{
  "content_id": "uuid",
  "idea_id": "uuid",
  "message": "Idea promoted to content pipeline."
}
```

**Behavior:** Creates a `contents` record with `idea_id` FK set, status `scripting`. Updates idea `promoted_to_content_id` and `status = promoted`.

**Error:** `409 Conflict` if already promoted.

#### `PUT /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/tags`

**Request:**
```json
{ "tags": ["productivity", "dev-tools"] }
```

**Response `200 OK`:** `{ "tags": [...] }`. Replaces existing tags entirely.

---

### 4.2 Ideas Status Machine

**States:** `captured` → `validating` → `validated` → `promoted` | `archived`

```
captured
  │
  ├──[POST /validate]──→ validating
  │                          │
  │                    (async AI job)
  │                          │
  │                          ├──[success]──→ validated
  │                          └──[failure]──→ captured (reset, retry allowed)
  │
  └──[POST /promote (from captured, skipping validation)]──→ promoted

validated
  ├──[POST /promote]──→ promoted
  └──[DELETE]──→ archived

archived (terminal, read-only)
promoted (terminal, read-only)
```

**Service layer enforces transitions:** `ErrInvalidStatusTransition` returned for invalid moves.

**IdeaValidationJob** (`internal/jobs/idea_validation.go`):
```go
type IdeaValidationPayload struct {
    IdeaID      string `json:"idea_id"`
    WorkspaceID string `json:"workspace_id"`
    UserID      string `json:"user_id"`
}
```
Queue: `default`. Max retries: 2. Timeout: 60 seconds.

**Validation score schema** (written to `idea_validation_scores`):
```json
{
  "idea_id": "uuid",
  "originality_score": 80,
  "audience_fit_score": 85,
  "trend_alignment_score": 70,
  "monetization_potential_score": 75,
  "overall_score": 78.5,
  "ai_reasoning": "This idea demonstrates strong audience fit based on...",
  "scored_at": "2026-03-10T00:05:00Z",
  "scored_by_model": "claude-3-5-sonnet-20241022"
}
```

**Score range:** 0–100 per dimension. `overall_score = weighted_average(dimensions)` with weights: originality 20%, audience_fit 30%, trend_alignment 20%, monetization_potential 30%.

**AI prompt structure** (internal, not exposed in API): System prompt instructs Claude to return JSON matching the score schema. Temperature: 0.3 (low variance for scoring). Max tokens: 1000.

---

### 4.3 Content Pipeline Status Machine

**States (kanban columns):**

```
idea → scripting → filming → editing → review → scheduled → published → archived
```

**Valid transitions:**

| From | To (allowed) |
|------|-------------|
| `idea` | `scripting`, `archived` |
| `scripting` | `filming`, `idea`, `archived` |
| `filming` | `editing`, `scripting`, `archived` |
| `editing` | `review`, `filming`, `archived` |
| `review` | `scheduled`, `editing`, `archived` |
| `scheduled` | `published`, `review`, `archived` |
| `published` | `archived` |
| `archived` | (none — terminal) |

**Note:** The proposal uses `recording` but the spec uses `filming` as the canonical status string (maps to `recording` in older docs — use `filming` everywhere going forward).

**Transition endpoint:**

```
PUT /api/v1/workspaces/{workspaceId}/contents/{contentId}/status
```

**Request:**
```json
{ "status": "filming", "reason": "optional human note" }
```

**Response `200 OK`:** Updated content object.

**Error:** `409 Conflict` if transition not allowed. Body includes `{ "current_status": "...", "allowed_transitions": [...] }`.

**Side effects on transition:**
- `→ review`: notify assigned reviewer via Asynq job (future WebSocket in Phase 5)
- `→ published`: trigger analytics job, update `published_at`, update `series_episodes.published_at` if linked
- `→ archived`: update `deleted_at` field; content is soft-deleted from kanban view

**Kanban list endpoint:**

```
GET /api/v1/workspaces/{workspaceId}/contents?group_by=status
```

Response shape with `group_by=status`:
```json
{
  "columns": {
    "idea": { "items": [...], "count": 5 },
    "scripting": { "items": [...], "count": 3 },
    "filming": { "items": [...], "count": 2 },
    "editing": { "items": [...], "count": 4 },
    "review": { "items": [...], "count": 1 },
    "scheduled": { "items": [...], "count": 2 },
    "published": { "items": [...], "count": 12 },
    "archived": { "items": [], "count": 0 }
  },
  "total": 29
}
```

Items in each column are abbreviated content objects (id, title, thumbnail_url, assigned_to, due_date, platform_target).

---

### 4.4 Content Analytics Partitioning Specification

**Table:** `content_analytics` partitioned by `RANGE (recorded_at)` on monthly boundaries.

**Partition naming convention:** `content_analytics_YYYY_MM` e.g. `content_analytics_2026_03`.

**DDL for initial partition creation:**
```sql
CREATE TABLE content_analytics (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    content_id      UUID NOT NULL REFERENCES contents(id),
    workspace_id    UUID NOT NULL,
    platform        TEXT NOT NULL,
    views           BIGINT DEFAULT 0,
    likes           BIGINT DEFAULT 0,
    comments        BIGINT DEFAULT 0,
    shares          BIGINT DEFAULT 0,
    saves           BIGINT DEFAULT 0,
    watch_time_seconds BIGINT DEFAULT 0,
    revenue         NUMERIC(12, 4) DEFAULT 0,
    recorded_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

CREATE TABLE content_analytics_2026_03
    PARTITION OF content_analytics
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

**Partition creation automation:** Asynq periodic task `CreateAnalyticsPartitionJob` runs on the 20th of each month. Creates next month's partition if it does not already exist. Uses `IF NOT EXISTS` (idempotent).

```go
// Partition creation query executed by job:
// CREATE TABLE IF NOT EXISTS content_analytics_{YYYY}_{MM}
//   PARTITION OF content_analytics
//   FOR VALUES FROM ('{YYYY}-{MM}-01') TO ('{YYYY}-{MM+1}-01');
```

**Indexes on each partition** (applied to parent, inherited):
```sql
CREATE INDEX ON content_analytics (content_id, recorded_at);
CREATE INDEX ON content_analytics (workspace_id, recorded_at);
CREATE INDEX ON content_analytics (platform, recorded_at);
```

**Retention policy:** Partitions older than 24 months are detached and dropped by `PruneAnalyticsPartitionJob` (runs monthly). Detach first (`ALTER TABLE ... DETACH PARTITION`), wait 24h, then drop (separate job run).

---

### 4.5 Series & Episodes Specification

**Status machines:**

**Series status:** `active` → `paused` → `active` | `completed`. `completed` is terminal.

**Episode status:** `draft` → `scheduled` → `published` | `cancelled`. `cancelled` is soft-terminal (can revert to `draft`).

**Episode-Content linkage:** `series_episodes.content_id` is nullable. An episode can exist as a placeholder before content is assigned. When content is promoted to `published`, update the linked episode's status to `published`.

**Publishing schedule spec (`series_publishing_schedule`):**
```sql
frequency: 'weekly' | 'biweekly' | 'monthly' | 'custom'
day_of_week: 0-6 (0=Sunday, ISO: 1=Monday)
time_of_day: TIME (UTC)
next_publish_at: TIMESTAMPTZ -- computed from frequency + day_of_week + time_of_day
```

`next_publish_at` is recalculated every time a scheduled episode is published (advance by one interval). Managed by `AdvanceSeriesScheduleJob` (Asynq, triggered after publish event).

---

### 4.6 S3 Presigned Upload Flow Specification

**Endpoint 1: `POST /api/v1/uploads/presign`**

**Auth:** Required + workspace context via `X-Workspace-ID` header (alternative to URL param for upload endpoints).

**Request:**
```json
{
  "workspace_id": "uuid",
  "content_type": "video/mp4",
  "file_name": "my-video.mp4",
  "file_size_bytes": 524288000,
  "purpose": "content_video"   // content_video | content_thumbnail | script | avatar
}
```

**Allowed MIME types by purpose:**

| Purpose | Allowed MIME types | Max size |
|---------|-------------------|----------|
| `content_video` | `video/mp4`, `video/quicktime`, `video/webm` | 5 GB |
| `content_thumbnail` | `image/jpeg`, `image/png`, `image/webp` | 10 MB |
| `script` | `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 50 MB |
| `avatar` | `image/jpeg`, `image/png`, `image/webp` | 5 MB |

**Response `200 OK`:**
```json
{
  "upload_url": "https://ordo-uploads.s3.amazonaws.com/...",
  "object_key": "workspaces/uuid-workspace/content_video/01934b2a-uuid.mp4",
  "expires_at": "2026-03-10T00:15:00Z",
  "upload_id": "uuid"   // used in confirm call
}
```

**Object key format:** `workspaces/{workspace_id}/{purpose}/{uuid_v7}.{ext}`

**S3 presigned URL conditions:**
- `Content-Type` must match requested MIME type
- `Content-Length` between 1 and `max_size_bytes` (enforced via S3 condition: `["content-length-range", 1, max_bytes]`)
- Method: `PUT`
- Expiry: 15 minutes

**MinIO SDK vs AWS SDK:** Feature-flagged via `STORAGE_PROVIDER=minio|s3`. Both implement the same `StorageClient` interface (`internal/storage/client.go`).

**Endpoint 2: `POST /api/v1/uploads/confirm`**

**Request:**
```json
{
  "upload_id": "uuid",
  "object_key": "workspaces/..."
}
```

**Behavior:**
1. Look up pending upload record by `upload_id` (stored in Redis, TTL 1 hour, key: `ordo:{env}:pending_upload:{upload_id}`)
2. Call `HeadObject` on S3/MinIO to verify the object exists
3. Verify `Content-Type` and `Content-Length` match expected values
4. Store upload metadata in DB (`file_uploads` table)
5. Delete Redis pending upload record

**Response `200 OK`:**
```json
{
  "object_key": "workspaces/...",
  "url": "https://...",       // permanent CDN URL or presigned download URL
  "content_type": "video/mp4",
  "file_size_bytes": 524288000,
  "created_at": "..."
}
```

**Error:** `404 Not Found` if object does not exist on S3 (client failed to upload). `400 Bad Request` if upload_id invalid/expired.

**Endpoint 3: `GET /api/v1/uploads/{objectKey}`**

**Auth:** Required. Workspace membership verified against object key prefix.

**Response `200 OK`:**
```json
{
  "download_url": "https://...?X-Amz-Expires=3600&...",
  "expires_at": "2026-03-10T01:00:00Z"
}
```

Download URL TTL: 1 hour for videos, 24 hours for images/documents.

---

## Phase 5 — Intelligence & Integrations

### 5.1 AI Router Specification

**File:** `internal/ai/router.go`

**Provider interface:**
```go
type Provider interface {
    Complete(ctx context.Context, req CompletionRequest) (CompletionResponse, error)
    Stream(ctx context.Context, req CompletionRequest) (<-chan StreamChunk, error)
    Name() string
}

type CompletionRequest struct {
    Messages    []Message
    MaxTokens   int
    Temperature float64
    System      string
    Model       string  // optional override; defaults to provider default
}

type CompletionResponse struct {
    Content      string
    InputTokens  int
    OutputTokens int
    Model        string
    FinishReason string
}

type StreamChunk struct {
    Delta string
    Done  bool
    Error error
}
```

**ClaudeProvider defaults:**
- Model: `claude-3-5-sonnet-20241022`
- Max tokens: 4096
- SDK: Anthropic Go SDK (`github.com/anthropics/anthropic-sdk-go`)

**OpenAIProvider defaults:**
- Model: `gpt-4o`
- Max tokens: 4096
- SDK: `github.com/openai/openai-go`

**Router logic:**
```go
type Router struct {
    primary      Provider    // Claude
    fallback      Provider    // OpenAI
    circuitBreaker *circuitbreaker.CircuitBreaker
}

func (r *Router) Complete(ctx context.Context, req CompletionRequest) (CompletionResponse, error) {
    resp, err := r.circuitBreaker.Execute(func() (interface{}, error) {
        return r.primary.Complete(ctx, req)
    })
    if err != nil {
        // Fallback on: 429, 500, 502, 503, context deadline exceeded
        if isFallbackError(err) {
            metrics.RecordAIFallback("claude", "openai", err.Error())
            return r.fallback.Complete(ctx, req)
        }
        return CompletionResponse{}, err
    }
    return resp.(CompletionResponse), nil
}
```

**Circuit breaker spec:**
- Library: `github.com/sony/gobreaker`
- Settings:
  ```go
  gobreaker.Settings{
      Name:        "claude-primary",
      MaxRequests: 1,           // half-open: allow 1 request to test recovery
      Interval:    60 * time.Second,  // reset counts after 60s in closed state
      Timeout:     30 * time.Second,  // half-open after 30s
      ReadyToTrip: func(counts gobreaker.Counts) bool {
          return counts.ConsecutiveFailures >= 5
      },
  }
  ```

**Credit deduction — atomic spec:**
```sql
-- Atomic deduction: fails if insufficient balance
UPDATE users
SET ai_credits_balance = ai_credits_balance - $1
WHERE id = $2
  AND ai_credits_balance >= $1
RETURNING ai_credits_balance;
```

If `0 rows affected` → balance insufficient → return `402 Payment Required` with code `INSUFFICIENT_AI_CREDITS`.

Credit reservation flow:
1. Estimate token cost before API call (input tokens × rate + output_estimate × rate)
2. Attempt atomic deduction for estimated cost
3. Call AI provider
4. Reconcile actual cost: if actual < estimated, refund difference; if actual > estimated, attempt to deduct delta (if insufficient, log discrepancy — do not fail the completed request)

---

### 5.2 SSE Streaming Specification

**Endpoint:** `POST /api/v1/ai/conversations/{conversationId}/messages`

When `Accept: text/event-stream` header is present, response is SSE. Otherwise, response is blocking JSON.

**SSE response headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no    (disables nginx buffering)
Transfer-Encoding: chunked
```

**Event format** (each chunk):
```
id: {chunk_sequence_number}
event: message_delta
data: {"delta": "Hello", "model": "claude-3-5-sonnet-20241022"}

```
(blank line terminates each event)

**Terminal event:**
```
id: {N}
event: message_done
data: {"content": "full assembled content", "input_tokens": 150, "output_tokens": 320, "credits_consumed": 4.7}

```

**Error event:**
```
event: error
data: {"code": "PROVIDER_ERROR", "message": "AI provider unavailable"}

```

**Retry directive:** Include `retry: 5000` (5 seconds) in first event payload so client reconnects after network interruption.

**Connection timeout:** SSE connections closed after 5 minutes of inactivity (no tokens flowing). Client must reconnect. The conversation record persists; reconnection resumes from latest message.

**Flush behavior:** `flusher.Flush()` called after every `StreamChunk` received from AI provider channel. Handler must cast `http.ResponseWriter` to `http.Flusher`.

---

### 5.3 Remix Engine Async Pipeline Specification

**Asynq task:** `RemixAnalysisJob`

**Task type string:** `remix:analyze`

**Queue:** `default` with concurrency limit of 3 (CPU-bound AI calls).

**Payload:**
```go
type RemixAnalysisPayload struct {
    JobID       string `json:"job_id"`
    WorkspaceID string `json:"workspace_id"`
    UserID      string `json:"user_id"`
    VideoURL    string `json:"video_url"`       // S3 object URL or external URL
    Transcript  string `json:"transcript"`      // pre-extracted if available
    Metadata    struct {
        Duration    int    `json:"duration_seconds"`
        Title       string `json:"title"`
        Description string `json:"description"`
    } `json:"metadata"`
}
```

**Multi-step pipeline** (each step updates `remix_jobs.status`):

```
Step 1: ingest
  - Validate video URL is accessible
  - If no transcript: dispatch TranscribeJob (Whisper API)
  - Status: "transcribing"

Step 2: transcribe (separate task, chained via Asynq task result)
  - Call OpenAI Whisper API or use provided transcript
  - Store transcript in remix_jobs.transcript
  - Status: "scoring"

Step 3: score
  - Send transcript + metadata to AI router
  - Identify viral moments, quotable clips, hook-worthy segments
  - Score each segment: virality (0-100), clarity (0-100), platform_fit (per platform)
  - Status: "generating"

Step 4: generate
  - For top N segments (configurable, default 5), generate:
    - Short-form title
    - Description / caption
    - Hashtag suggestions
    - Platform-specific format recommendations
  - Store as structured JSON in remix_jobs.results
  - Status: "ready"

Step 5: ready
  - Emit WebSocket event to workspace: { "event": "remix.complete", "job_id": "..." }
  - Update remix_jobs.completed_at
```

**`remix_jobs` table:**
```sql
CREATE TABLE remix_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    video_url       TEXT NOT NULL,
    transcript      TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',   -- pending|transcribing|scoring|generating|ready|failed
    results         JSONB,                              -- array of clip suggestions
    error_message   TEXT,
    asynq_task_id   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Results JSON schema:**
```json
{
  "clips": [
    {
      "start_seconds": 120,
      "end_seconds": 180,
      "virality_score": 87,
      "clarity_score": 92,
      "title": "Why most developers ignore this...",
      "caption": "You're leaving performance on the table...",
      "hashtags": ["#coding", "#productivity"],
      "platform_fit": {
        "tiktok": 90,
        "instagram_reels": 88,
        "youtube_shorts": 75
      }
    }
  ],
  "total_clips": 5,
  "model_used": "claude-3-5-sonnet-20241022",
  "analyzed_at": "2026-03-10T00:00:00Z"
}
```

---

### 5.4 Platform Credential Encryption Specification

**Algorithm:** AES-256-GCM (authenticated encryption).

**Key source:**
- Prod: AWS KMS data key (envelope encryption)
- Dev/staging: 32-byte key from `PLATFORM_CRED_ENCRYPTION_KEY` env var (hex-encoded)

**Envelope encryption (prod):**
1. Generate data key via `kms:GenerateDataKey` → plaintext key + encrypted key blob
2. Encrypt token with plaintext key (AES-256-GCM)
3. Store: `{base64(encrypted_key_blob)}:{base64(nonce)}:{base64(ciphertext)}` in DB
4. Discard plaintext key from memory
5. On decrypt: call `kms:Decrypt` on blob → plaintext key → decrypt ciphertext

**Encryption helper** (`internal/crypto/encrypt.go`):
```go
func Encrypt(key []byte, plaintext string) (string, error)
// Returns: base64(nonce) + "." + base64(ciphertext+tag)
// Nonce: 12 random bytes (GCM standard)

func Decrypt(key []byte, ciphertext string) (string, error)
// Parses nonce.ciphertext format, decrypts
```

**Storage format in DB:** `{nonce_b64}.{ciphertext_b64}` — single TEXT column `access_token_enc`.

**Key rotation procedure:**
1. New KMS key ID set in config
2. Background job reads all credentials, re-encrypts with new key, writes back
3. Old key deactivated in KMS after rotation job completes
4. Zero downtime: both keys accepted during rotation window

---

### 5.5 Stripe Webhook Specification

**Endpoint:** `POST /api/v1/billing/webhooks`

**No auth middleware** — authenticated by Stripe signature, not JWT.

**Signature verification:**
```go
event, err := webhook.ConstructEvent(body, r.Header.Get("Stripe-Signature"), cfg.StripeWebhookSecret)
if err != nil {
    return http.StatusBadRequest, "Invalid signature"
}
```

**Idempotency:**
- Key: `ordo:{env}:stripe:processed:{event.ID}`
- Check Redis before processing: if key exists → return `200 OK` immediately (already processed).
- After successful processing: set key with TTL 7 days.
- This prevents double-processing on Stripe retries.

**Event handlers:**

| Event Type | Handler Action |
|-----------|----------------|
| `customer.subscription.created` | Set `users.subscription_tier = plan_tier`, set `users.stripe_customer_id`, allocate AI credits for tier |
| `customer.subscription.updated` | Update `subscription_tier` if plan changed; reallocate AI credits |
| `customer.subscription.deleted` | Set `subscription_tier = "free"`, set AI credits to free tier allocation |
| `customer.subscription.trial_will_end` | Dispatch notification email (3 days before) |
| `invoice.payment_succeeded` | Log payment event (optional analytics table) |
| `invoice.payment_failed` | Dispatch payment failure notification email; begin grace period (3 days before downgrade) |
| `checkout.session.completed` | Link Stripe customer to user if not already linked |

**AI credits allocation by tier:**

| Tier | Monthly AI Credits |
|------|-------------------|
| `free` | 50 |
| `pro` | 500 |
| `enterprise` | 5000 |

Credits reallocated on subscription renewal (monthly) via `invoice.payment_succeeded`.

**Response:** Always `200 OK` immediately after signature verification and idempotency check. Processing is synchronous but fast (DB updates only). Do not hold the webhook response while dispatching emails (use Asynq for side effects).

---

### 5.6 WebSocket Hub Specification

**File:** `internal/ws/hub.go`

**Hub struct:**
```go
type Hub struct {
    clients    map[*Client]bool
    byWorkspace map[string]map[*Client]bool  // workspace_id -> set of clients
    register   chan *Client
    unregister chan *Client
    broadcast  chan BroadcastMessage
    mu         sync.RWMutex  // protects byWorkspace for reads; channel sends handle sync
}

type Client struct {
    hub         *Hub
    conn        *websocket.Conn
    send        chan []byte
    userID      string
    workspaceID string
}

type BroadcastMessage struct {
    WorkspaceID string
    Event       Event
}

type Event struct {
    Event       string          `json:"event"`
    WorkspaceID string          `json:"workspace_id"`
    Payload     json.RawMessage `json:"payload"`
    Timestamp   time.Time       `json:"timestamp"`
}
```

**Hub run loop** (single goroutine, channel-based — no locks needed for client registration):
```go
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
            h.byWorkspace[client.workspaceID][client] = true
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                delete(h.byWorkspace[client.workspaceID], client)
                close(client.send)
            }
        case msg := <-h.broadcast:
            for client := range h.byWorkspace[msg.WorkspaceID] {
                select {
                case client.send <- marshalEvent(msg.Event):
                default:
                    // Client send buffer full — drop and close
                    close(client.send)
                    delete(h.clients, client)
                    delete(h.byWorkspace[msg.WorkspaceID], client)
                }
            }
        }
    }
}
```

**Client send buffer size:** 256 messages.

**Read pump** (per client goroutine):
```go
// Read incoming messages (ping/pong only — clients don't send data events)
// SetReadDeadline extended on each pong received
conn.SetReadLimit(512)
conn.SetReadDeadline(time.Now().Add(60 * time.Second))
conn.SetPongHandler(func(string) error {
    conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    return nil
})
```

**Write pump** (per client goroutine):
```go
ticker := time.NewTicker(30 * time.Second)
defer ticker.Stop()
for {
    select {
    case message, ok := <-client.send:
        conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
        if !ok {
            conn.WriteMessage(websocket.CloseMessage, []byte{})
            return
        }
        conn.WriteMessage(websocket.TextMessage, message)
    case <-ticker.C:
        conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
        conn.WriteMessage(websocket.PingMessage, nil)
    }
}
```

**Heartbeat:** Ping sent every 30 seconds. Read deadline extended to 60 seconds on each pong. Connection closed if no pong received within 60 seconds of last ping.

**Authentication:** JWT passed as `token` query parameter: `GET /api/v1/ws?token={jwt}`. Server validates JWT before upgrading. Invalid/expired token → `401` before upgrade.

**Connection limit per workspace:** Configurable via `WS_MAX_CONNECTIONS_PER_WORKSPACE` (default 50). New connections rejected with `503` if limit reached.

**Workspace-routed events (service layer calls):**
```go
hub.Broadcast(workspaceID, ws.Event{
    Event:       "content.status_changed",
    WorkspaceID: workspaceID,
    Payload:     json.RawMessage(`{"content_id":"...","from":"filming","to":"editing"}`),
    Timestamp:   time.Now().UTC(),
})
```

**Event types:**

| Event | Trigger |
|-------|---------|
| `content.status_changed` | Content status transition |
| `content.assigned` | New assignment created |
| `ai.credits_deducted` | AI credit usage |
| `achievement.unlocked` | Gamification achievement |
| `remix.complete` | Remix job finished |
| `analytics.sync_complete` | Analytics sync finished |

---

### 5.7 Analytics Sync Job Specification

**Asynq task:** `analytics:sync_workspace`

**Schedule:** Asynq periodic task, registered with cron expression `0 2 * * *` (2:00 AM UTC daily).

**Payload:**
```go
type AnalyticsSyncPayload struct {
    WorkspaceID string   `json:"workspace_id"`
    Platforms   []string `json:"platforms"`  // empty = all connected platforms
}
```

**Platform adapter interface:**
```go
type PlatformAnalyticsAdapter interface {
    FetchContentAnalytics(ctx context.Context, credentialID string, contentID string, since time.Time) ([]AnalyticsRecord, error)
    FetchChannelAnalytics(ctx context.Context, credentialID string, since time.Time) (ChannelAnalytics, error)
    Platform() string
}
```

**Implemented adapters:** `YouTubeAdapter`, `TikTokAdapter`, `InstagramAdapter`, `TwitterAdapter`, `LinkedInAdapter` — all in `internal/analytics/platforms/`.

**Job steps:**
1. Load all active `platform_credentials` for workspace
2. For each credential: decrypt tokens (§5.4), check token expiry
3. If token expiring within 5 minutes: refresh OAuth token, re-encrypt, update DB
4. Call adapter `FetchContentAnalytics` for all `published` contents on this platform since `last_synced_at`
5. Upsert records into `content_analytics` (ON CONFLICT (content_id, platform, date_trunc('day', recorded_at)) DO UPDATE)
6. Call `FetchChannelAnalytics` → upsert into `platform_analytics`
7. Update `platform_credentials.last_synced_at = NOW()`
8. Dispatch WebSocket event `analytics.sync_complete`

**Error handling:** Per-platform failures are isolated. One failed platform does not abort others. Failed platforms logged with `ERROR` level; job marked as complete (not failed) with partial results.

---

### 5.8 Gamification Calculation Specification

**Asynq task:** `gamification:calculate_scores`

**Schedule:** Cron `0 0 * * *` (midnight UTC daily).

**Consistency score formula:**

```
consistency_score = min(100, round(
    (posts_last_7_days / 7 * 40)      -- frequency component (max 40 pts)
  + (streak_days / 30 * 30)           -- streak component (max 30 pts, capped at 30 days)
  + (on_time_ratio * 20)              -- on-time publishing ratio last 30 days (max 20 pts)
  + (platform_diversity_bonus * 10)   -- posting to 2+ platforms (max 10 pts)
))

Where:
  posts_last_7_days    = COUNT of published contents in past 7 days
  streak_days          = users.streak_current (consecutive days with at least 1 publish)
  on_time_ratio        = COUNT(published before due_date) / COUNT(published with due_date)
                         in past 30 days; 1.0 if no due dates set
  platform_diversity_bonus = min(1.0, COUNT(DISTINCT platform) / 2) for posts in past 7 days
```

**Streak update logic:**
- A "streak day" counts if at least 1 content is published (`status = 'published'`) that calendar day (UTC).
- Streak resets to 0 if no publish on previous calendar day.
- `streak_current` incremented when today's first publish is recorded.
- `streak_longest` updated if `streak_current > streak_longest`.

**Achievement triggers** (checked after each relevant event, not in batch job):

| Achievement Key | Trigger | Criteria |
|----------------|---------|----------|
| `first_publish` | Content published | `content_published_count == 1` |
| `streak_7` | Daily streak job | `streak_current >= 7` |
| `streak_30` | Daily streak job | `streak_current >= 30` |
| `streak_100` | Daily streak job | `streak_current >= 100` |
| `ideas_10` | Idea created | `ideas_created_count >= 10` |
| `ideas_50` | Idea created | `ideas_created_count >= 50` |
| `publish_10` | Content published | `content_published_count >= 10` |
| `publish_100` | Content published | `content_published_count >= 100` |
| `multiplatform` | Content published | published to 3+ distinct platforms lifetime |
| `team_player` | Member joins workspace | workspace has 3+ members |

**Achievement check:** Service layer calls `achievementService.CheckAndUnlock(ctx, userID, workspaceID, eventType)` after each triggering action. Checks `user_stats.achievements_unlocked` array; if achievement key not present and criteria met, appends key and dispatches WebSocket event.

---

## Phase 6 — Hardening

### 6.1 Global Search Specification

**Design:** PostgreSQL full-text search. No external search engine at MVP scale.

**Searchable tables:** `ideas`, `contents`, `series`, `sponsorships`

**`search_vector` generated column** (added via migration for each table):

```sql
-- Example for contents table:
ALTER TABLE contents
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
) STORED;

CREATE INDEX idx_contents_search_vector ON contents USING GIN (search_vector);
```

**Weight assignments per table:**

| Table | Weight A | Weight B | Weight C |
|-------|----------|----------|----------|
| `ideas` | title | description | tags |
| `contents` | title | description | tags |
| `series` | title | description | platform_target |
| `sponsorships` | brand_name | contact_name | notes |

**Search endpoint:**

```
GET /api/v1/search?q={query}&workspace_id={uuid}&types=ideas,contents&page=1&per_page=20
```

**sqlc query:**
```sql
-- name: GlobalSearch :many
SELECT
    'content' AS entity_type,
    id, title, description, status, created_at,
    ts_rank(search_vector, query) AS rank
FROM contents, plainto_tsquery('english', $1) AS query
WHERE workspace_id = $2
  AND search_vector @@ query
  AND deleted_at IS NULL
UNION ALL
SELECT
    'idea' AS entity_type,
    id, title, description, status, created_at,
    ts_rank(search_vector, query) AS rank
FROM ideas, plainto_tsquery('english', $1) AS query
WHERE workspace_id = $2
  AND search_vector @@ query
  AND deleted_at IS NULL
ORDER BY rank DESC
LIMIT $3 OFFSET $4;
```

**Query handling:**
- Sanitize query: strip special FTS operators if not using `to_tsquery` (use `plainto_tsquery` for safety)
- Minimum query length: 2 characters
- Maximum query length: 200 characters
- Empty `types` param → search all types
- `workspace_id` from JWT context (not from query param) — IDOR protection

**Response `200 OK`:**
```json
{
  "results": [
    {
      "entity_type": "content",
      "id": "uuid",
      "title": "10 productivity hacks",
      "description": "...",
      "status": "published",
      "rank": 0.0759,
      "created_at": "..."
    }
  ],
  "query": "productivity",
  "total": 23,
  "page": 1,
  "per_page": 20
}
```

---

### 6.2 Audit Log Specification

**Table:** `activity_logs` (partitioned monthly, same pattern as `content_analytics`).

```sql
CREATE TABLE activity_logs (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL,
    user_id         UUID,             -- NULL for system-generated events
    action          TEXT NOT NULL,    -- e.g. "content.status_changed", "member.invited"
    entity_type     TEXT NOT NULL,    -- "content", "idea", "member", etc.
    entity_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

**Action naming convention:** `{entity}.{verb}` e.g. `content.created`, `content.status_changed`, `member.invited`, `member.removed`, `workspace.updated`, `idea.promoted`, `credential.connected`.

**Async batch insert spec:**

```go
// internal/audit/service.go
type AuditService struct {
    ch     chan LogEntry   // buffered channel, size 1000
    repo   AuditRepository
}

func (s *AuditService) Log(ctx context.Context, entry LogEntry) {
    // Non-blocking: drop if buffer full (log warning, never block request)
    select {
    case s.ch <- entry:
    default:
        slog.Warn("audit log buffer full, dropping entry", "action", entry.Action)
    }
}

func (s *AuditService) flushWorker() {
    ticker := time.NewTicker(500 * time.Millisecond)
    batch := make([]LogEntry, 0, 100)
    for {
        select {
        case entry := <-s.ch:
            batch = append(batch, entry)
            if len(batch) >= 100 {
                s.flushBatch(batch)
                batch = batch[:0]
            }
        case <-ticker.C:
            if len(batch) > 0 {
                s.flushBatch(batch)
                batch = batch[:0]
            }
        }
    }
}
```

**Flush trigger:** 100 entries accumulated OR 500ms timer fires, whichever comes first.

**Batch insert:** Single `INSERT INTO activity_logs (...) VALUES (...), (...), (...)` with all batch entries. Uses `pgx` batch (not individual inserts).

**Read endpoint:**

```
GET /api/v1/workspaces/{workspaceId}/audit-logs
```

**Required role:** `owner`, `admin`.

**Query params:** `action` (filter), `entity_type` (filter), `entity_id` (filter), `from` (ISO8601), `to` (ISO8601), `page`, `per_page` (max 100).

---

### 6.3 Rate Limiting Specification

**Implementation:** Redis sliding window, middleware layer `internal/middleware/tier_ratelimit.go`.

**Key format:** `ordo:{env}:ratelimit:{tier}:{user_id}:{endpoint_group}:{window}`

Where `window = floor(unix_timestamp / window_seconds)` — a stable integer that advances each window period.

**Full tier limit table:**

| Endpoint Group | Key | Free | Pro | Enterprise |
|---------------|-----|------|-----|------------|
| Auth (all auth endpoints) | `auth` | 5/min | 10/min | 20/min |
| AI messages | `ai_messages` | 10/hour | 100/hour | 500/hour |
| Content writes (POST/PUT/DELETE contents, ideas) | `content_writes` | 20/hour | 200/hour | unlimited |
| Analytics sync | `analytics_sync` | 1/day | 4/day | 24/day |
| File uploads | `file_uploads` | 5/day | 50/day | 500/day |
| WebSocket connections | `ws_connect` | 2 concurrent | 5 concurrent | 20 concurrent |
| Search queries | `search` | 30/min | 100/min | unlimited |
| API (global fallback) | `global` | 500/hour | 2000/hour | unlimited |

**"Unlimited"** is implemented as a limit of 999999 (effectively unlimited but avoids special-case code).

**Middleware reads `subscription_tier` from JWT claims** (no DB hit per request). Tier downgrade propagates on next token refresh.

**Per-endpoint overrides:** Some endpoints override the group limit. Overrides registered in a map:
```go
endpointOverrides = map[string]RateLimit{
    "POST /api/v1/auth/login":           {10, time.Minute},
    "POST /api/v1/auth/register":        {5, time.Minute},
    "POST /api/v1/auth/forgot-password": {5, time.Minute},
}
```

**Sliding window algorithm** (see §2.5 for implementation detail — same algorithm used here with tier-keyed keys).

**Headers returned on every rate-limited response:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1741569600
Retry-After: 3547
```

---

### 6.4 Load Test Acceptance Criteria

**Tool:** k6. Test files in `tests/load/`.

**Baseline targets (must PASS in CI before Phase 6 sign-off):**

| Scenario | Endpoint | Load | p50 | p95 | p99 | Error rate |
|----------|----------|------|-----|-----|-----|------------|
| Content list (kanban) | `GET /api/v1/workspaces/{id}/contents` | 1000 RPS | <20ms | <60ms | <100ms | <0.1% |
| Auth login | `POST /api/v1/auth/login` | 500 RPS | <80ms | <150ms | <200ms | <0.1% |
| Idea creation | `POST /api/v1/workspaces/{id}/ideas` | 200 RPS | <50ms | <100ms | <150ms | <0.1% |
| AI (streaming) | `POST /api/v1/ai/conversations/{id}/messages` | 50 RPS | <1s TTFB | <3s TTFB | <5s TTFB | <1% |
| WebSocket connect | `GET /api/v1/ws` | 200 concurrent | — | — | — | <0.1% |

**Redis caching requirements to hit content list target:**
- Workspace member list cached in Redis, TTL 5 minutes: `ordo:{env}:ws_members:{workspace_id}`
- User profile cached, TTL 1 minute: `ordo:{env}:user:{user_id}`
- Content list queries must use pgxpool efficiently (no N+1 queries)

**k6 script structure** (`tests/load/content_list.js`):
```javascript
export const options = {
    scenarios: {
        content_list: {
            executor: 'constant-arrival-rate',
            rate: 1000,
            timeUnit: '1s',
            duration: '2m',
            preAllocatedVUs: 200,
            maxVUs: 500,
        }
    },
    thresholds: {
        'http_req_duration{scenario:content_list}': ['p(99)<100'],
        'http_req_failed{scenario:content_list}': ['rate<0.001'],
    },
};
```

---

### 6.5 Security Scan Requirements

**Command:** `make security-scan`

**Makefile target:**
```makefile
security-scan:
	govulncheck ./...
	gosec -severity medium -confidence medium -exclude G104 ./...
	go vet ./...
```

**Acceptance criteria: 0 findings** from both tools at `medium` severity or above.

**govulncheck:** Must be run against latest vulnerability DB. Fails build on any known vulnerability in direct or transitive dependencies.

**gosec rules enabled:** All default rules. Exclusions:
- `G104` (Errors unhandled): excluded — handled by errcheck linter instead, gosec false-positives on defer close patterns.

**Additional OWASP checklist** (manual review gates, not automated):

| Check | Implementation Reference |
|-------|--------------------------|
| SQL Injection | Impossible via sqlc — all queries are parameterized at codegen time. Verified by CI sqlc diff check. |
| Authentication bypass | JWT validation enforced at router level; every `/api/v1` route goes through `authMiddleware.Authenticate`. |
| IDOR | All repo queries filter by `workspace_id` from context (§3.2). No repo method accepts workspace_id from URL param directly. |
| Secrets in logs | `DEBUG_LOG_BODIES` flag required for body logging; tokens never logged (request log middleware logs path/method/status only). |
| Token storage | Refresh tokens stored as SHA-256 hash (§2.2). Platform credentials AES-256-GCM encrypted (§5.4). |
| Dependency audit | `govulncheck` in CI. `go mod tidy` enforced in CI (`git diff --exit-code go.sum`). |
| TLS | Enforced by load balancer (ALB) in prod; sslmode=require on DB connections. |
| CORS | Explicit allowlist in Chi CORS middleware (§1.2). No wildcard origins in prod. |

---

## Appendix: Error Code Registry

All API errors follow the envelope:
```json
{
  "error": {
    "code": "SNAKE_CASE_CODE",
    "message": "Human-readable description",
    "request_id": "uuid"
  }
}
```

| Code | HTTP Status | Phase | Description |
|------|-------------|-------|-------------|
| `VALIDATION_ERROR` | 422 | All | Request body failed validation; includes `fields` array |
| `UNAUTHORIZED` | 401 | All | No valid JWT provided |
| `FORBIDDEN` | 403 | All | Valid JWT but insufficient permissions |
| `NOT_FOUND` | 404 | All | Resource does not exist or is not accessible |
| `CONFLICT` | 409 | All | State conflict (duplicate, invalid transition) |
| `RATE_LIMITED` | 429 | All | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | All | Unexpected server error |
| `EMAIL_ALREADY_EXISTS` | 409 | 2 | Registration with existing email |
| `INVALID_CREDENTIALS` | 401 | 2 | Wrong email/password |
| `EMAIL_NOT_VERIFIED` | 403 | 2 | Login before email verified |
| `TOKEN_EXPIRED` | 401 | 2 | JWT or reset/verify token expired |
| `TOKEN_INVALID` | 401 | 2 | JWT or token tampered/malformed |
| `TOKEN_REPLAYED` | 401 | 2 | Refresh token already used |
| `SESSION_REVOKED` | 401 | 2 | Session explicitly revoked |
| `INVITATION_EXPIRED` | 400 | 3 | Workspace invitation token expired |
| `INVITATION_ALREADY_ACCEPTED` | 400 | 3 | Invitation already accepted |
| `INVITATION_EMAIL_MISMATCH` | 403 | 3 | Authenticated user email != invitation email |
| `NOT_WORKSPACE_MEMBER` | 403 | 3 | User is not a member of the workspace |
| `INSUFFICIENT_ROLE` | 403 | 3 | User's role cannot perform this action |
| `WORKSPACE_LIMIT_REACHED` | 402 | 3 | Tier workspace count limit exceeded |
| `MEMBER_LIMIT_REACHED` | 402 | 3 | Tier member count limit exceeded |
| `INVALID_STATUS_TRANSITION` | 409 | 4 | Invalid state machine transition |
| `IDEA_ALREADY_PROMOTED` | 409 | 4 | Idea already promoted to content |
| `IDEA_VALIDATING` | 409 | 4 | Validation already in progress |
| `UPLOAD_NOT_FOUND` | 404 | 4 | Upload record expired or invalid |
| `MIME_TYPE_NOT_ALLOWED` | 422 | 4 | File type not permitted for purpose |
| `FILE_TOO_LARGE` | 413 | 4 | File exceeds size limit for purpose |
| `INSUFFICIENT_AI_CREDITS` | 402 | 5 | AI credits balance too low |
| `AI_PROVIDER_ERROR` | 503 | 5 | AI provider unavailable (after fallback) |
| `CREDENTIAL_DECRYPTION_FAILED` | 500 | 5 | Platform credential decrypt error (KMS issue) |
| `STRIPE_SIGNATURE_INVALID` | 400 | 5 | Webhook signature verification failed |

---

*Generated by sdd-spec | Ordo Creator OS | 2026-03-10*
