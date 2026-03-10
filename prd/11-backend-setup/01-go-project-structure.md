# Go Project Structure — Ordo Creator OS Backend

**Complete architecture blueprint for the modular monolith API**

Last Updated: 2026-03-10
Framework: Chi Router + PostgreSQL + Redis
Database: sqlc (type-safe SQL) + golang-migrate
Deployment: Docker + Kubernetes (future)

---

## Table of Contents

1. [Repository Structure](#1-repository-structure)
2. [Directory Reference](#2-directory-reference)
3. [Package Architecture & Dependencies](#3-package-architecture--dependencies)
4. [Module Pattern (Each Feature)](#4-module-pattern-each-feature)
5. [Configuration & Dependency Injection](#5-configuration--dependency-injection)
6. [Build & Development Tools](#6-build--development-tools)
7. [Key Go Packages & Versions](#7-key-go-packages--versions)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment & Docker](#9-deployment--docker)
10. [Development Workflow](#10-development-workflow)

---

## 1. Repository Structure

```
ordo-api/
│
├── cmd/
│   └── api/
│       ├── main.go                  # Entry point, bootstrap all services
│       └── wire.go                  # Dependency injection (wire syntax)
│
├── internal/                        # Private to this module (Go convention)
│   ├── config/
│   │   ├── config.go                # EnvConfig struct + loader (envconfig)
│   │   ├── database.go              # DB connection config
│   │   └── services.go              # Service config flags
│   │
│   ├── server/
│   │   ├── server.go                # HTTP server setup, graceful shutdown
│   │   ├── routes.go                # Route registration (all endpoints)
│   │   └── middleware.go            # Global middleware setup
│   │
│   ├── middleware/
│   │   ├── auth.go                  # JWT validation, token extraction
│   │   ├── workspace.go             # Workspace context injection
│   │   ├── ratelimit.go             # Rate limiting per tier (Redis backed)
│   │   ├── requestid.go             # X-Request-ID middleware
│   │   ├── logger.go                # Request/response logging (zerolog)
│   │   ├── recovery.go              # Panic recovery, error handling
│   │   ├── cors.go                  # CORS headers (configurable)
│   │   └── compression.go           # gzip compression
│   │
│   ├── domain/                      # Domain models (pure Go, NO DB deps)
│   │   ├── user.go                  # User structs, enums, methods
│   │   ├── workspace.go             # Workspace, WorkspaceMember
│   │   ├── idea.go                  # Idea, IdeaStatus enums
│   │   ├── content.go               # Content, Version, ContentStatus
│   │   ├── series.go                # Series, Episode
│   │   ├── publishing.go            # Schedule, Platform, PublishingPlan
│   │   ├── ai.go                    # AIRequest, AICredit, Model enums
│   │   ├── remix.go                 # RemixJob, RemixFormat
│   │   ├── analytics.go             # Event, ContentAnalytics, Consistency
│   │   ├── gamification.go          # XP, Achievement, Streak, Level
│   │   ├── sponsorship.go           # Deal, Sponsor, DealStatus
│   │   ├── integration.go           # OAuth, WebhookEvent
│   │   ├── notification.go          # Notification, NotificationType
│   │   ├── errors.go                # Custom error types (ErrNotFound, ErrUnauthorized, etc.)
│   │   └── pagination.go            # Cursor, PageInfo structs
│   │
│   ├── handler/                     # HTTP request handlers (thin layer)
│   │   ├── auth.go                  # POST /auth/signup, /auth/login, /auth/refresh
│   │   ├── user.go                  # GET /users/{id}, PATCH /users/{id}
│   │   ├── workspace.go             # GET /workspaces, POST /workspaces, /workspaces/{id}/*
│   │   ├── idea.go                  # GET /ideas, POST /ideas, PATCH /ideas/{id}
│   │   ├── content.go               # GET /content, POST /content, PATCH /content/{id}
│   │   ├── series.go                # GET /series, POST /series, PATCH /series/{id}
│   │   ├── publishing.go            # GET /publishing, POST /publishing, PATCH /schedule
│   │   ├── ai.go                    # POST /ai/generate, /ai/transcribe, /ai/remix
│   │   ├── remix.go                 # POST /remix, GET /remix/{id}
│   │   ├── analytics.go             # GET /analytics/*, POST /events
│   │   ├── consistency.go           # GET /consistency, PUT /consistency-settings
│   │   ├── sponsorship.go           # GET /sponsorships, POST /deals, PATCH /deals/{id}
│   │   ├── integration.go           # GET /integrations, POST /webhooks
│   │   ├── template.go              # GET /templates, POST /templates
│   │   ├── upload.go                # POST /upload/media, /upload/assets
│   │   ├── billing.go               # GET /billing/*, POST /billing/subscribe
│   │   ├── search.go                # GET /search/global, /search/{entity_type}
│   │   ├── ws.go                    # WebSocket handler, upgrade logic
│   │   └── health.go                # GET /health (liveness, readiness)
│   │
│   ├── service/                     # Business logic layer (orchestrates domain + repos)
│   │   ├── auth.go                  # JWT generation, token validation, OAuth flow
│   │   ├── user.go                  # User CRUD, profile updates, preferences
│   │   ├── workspace.go             # Workspace CRUD, member management, RBAC
│   │   ├── idea.go                  # Idea capture, validation, search, brainstorm
│   │   ├── content.go               # Content lifecycle, versioning, status transitions
│   │   ├── series.go                # Series management, episode scheduling
│   │   ├── publishing.go            # Scheduling posts, multi-platform publishing
│   │   ├── ai.go                    # AI request routing, credit system, queue mgmt
│   │   ├── remix.go                 # Remix processing orchestration
│   │   ├── analytics.go             # Event aggregation, metrics computation
│   │   ├── consistency.go           # Consistency score calculation, streak logic
│   │   ├── sponsorship.go           # Deal pipeline, CRM operations
│   │   ├── integration.go           # OAuth, webhook registration
│   │   ├── notification.go          # Notification creation, delivery orchestration
│   │   ├── template.go              # Template CRUD, content defaults
│   │   ├── billing.go               # Subscription management, plan upgrades
│   │   └── search.go                # Multi-entity search orchestration
│   │
│   ├── repository/                  # Data access layer (sqlc + custom queries)
│   │   ├── db.go                    # DB pool setup, connection helpers
│   │   ├── user.go                  # User repository interface + impl
│   │   ├── workspace.go             # Workspace repository interface + impl
│   │   ├── workspace_member.go      # WorkspaceMember repository
│   │   ├── idea.go                  # Idea repository + search
│   │   ├── content.go               # Content + version queries
│   │   ├── content_version.go       # Content version repository
│   │   ├── series.go                # Series + episode queries
│   │   ├── publishing_schedule.go   # Publishing schedule repository
│   │   ├── ai_request.go            # AI request log + credit tracking
│   │   ├── ai_conversation.go       # Conversation history
│   │   ├── remix_job.go             # Remix job tracking
│   │   ├── content_analytics.go     # Analytics events + aggregates
│   │   ├── gamification.go          # XP, achievements, streaks
│   │   ├── sponsorship.go           # Deal records, sponsor info
│   │   ├── integration.go           # OAuth tokens, webhook registrations
│   │   ├── notification.go          # Notification records
│   │   ├── template.go              # Template library
│   │   └── sqlc/                    # Auto-generated by sqlc tool
│   │       ├── db.go                # DB connection + transaction helpers
│   │       ├── models.go            # Auto-generated struct models
│   │       └── querier.go           # Auto-generated query interface
│   │
│   ├── ws/                          # WebSocket real-time communication
│   │   ├── hub.go                   # Connection hub, broadcast manager
│   │   ├── client.go                # Client connection, message queue
│   │   ├── events.go                # Event type definitions (server → client)
│   │   ├── rooms.go                 # Room/channel management, presence
│   │   ├── auth.go                  # WebSocket JWT validation
│   │   └── messages.go              # Message marshaling, protocol
│   │
│   ├── ai/                          # AI provider integrations
│   │   ├── provider.go              # Provider interface (Anthropic, OpenAI, Whisper)
│   │   ├── anthropic.go             # Claude API client + streaming
│   │   ├── openai.go                # OpenAI fallback (gpt-4, gpt-3.5)
│   │   ├── whisper.go               # Speech-to-text (Whisper)
│   │   ├── router.go                # Model selection, routing logic
│   │   └── credits.go               # Credit cost calculation per model
│   │
│   ├── queue/                       # Background job processing (Redis backed)
│   │   ├── worker.go                # Worker pool, job dispatch
│   │   ├── jobs.go                  # Job type definitions, handlers
│   │   └── processors/              # Async job processors
│   │       ├── remix.go             # Remix generation (can run 5-10min)
│   │       ├── publish.go           # Social platform publishing
│   │       ├── analytics.go         # Analytics aggregation
│   │       ├── notification.go      # Email, push notifications
│   │       └── cleanup.go           # Stale data cleanup tasks
│   │
│   ├── cache/                       # Redis cache layer
│   │   ├── client.go                # Redis client setup
│   │   ├── user_cache.go            # User cache (TTL: 1 hour)
│   │   ├── workspace_cache.go       # Workspace cache (TTL: 1 hour)
│   │   ├── idea_search.go           # Idea search cache (TTL: 5 min)
│   │   └── rate_limit.go            # Rate limit buckets
│   │
│   ├── storage/                     # Cloud storage (S3/MinIO)
│   │   ├── client.go                # S3/MinIO client setup
│   │   ├── uploader.go              # File upload + multipart handling
│   │   ├── preprocessor.go          # Image/video optimization
│   │   └── cdn.go                   # CDN URL generation
│   │
│   ├── logger/                      # Structured logging
│   │   ├── logger.go                # zerolog setup + context helpers
│   │   └── hooks.go                 # Custom hooks (Sentry, etc.)
│   │
│   └── pkg/                         # Shared internal utilities
│       ├── validator/
│       │   ├── email.go             # Email validation, normalization
│       │   ├── slug.go              # URL slug validation
│       │   ├── uuid.go              # UUID validation
│       │   └── request.go           # Multi-field validation
│       │
│       ├── response/
│       │   ├── json.go              # Standard JSON response helpers
│       │   ├── error.go             # Error response formatting
│       │   └── pagination.go        # Pagination response wrapper
│       │
│       ├── pagination/
│       │   ├── cursor.go            # Cursor encoding/decoding
│       │   ├── keyset.go            # Keyset pagination helpers
│       │   └── offset.go            # Offset pagination (legacy)
│       │
│       ├── crypto/
│       │   ├── jwt.go               # JWT sign/verify, claims struct
│       │   ├── password.go          # bcrypt hashing + verification
│       │   └── oauth.go             # OAuth state generation
│       │
│       ├── time/
│       │   ├── helpers.go           # Time parsing, UTC normalization
│       │   └── providers.go         # Clock abstraction for testing
│       │
│       └── pointer/
│           └── helpers.go           # Go 1.20 generic pointer helpers
│
├── migrations/                      # Database migrations (golang-migrate)
│   ├── 000001_initial_schema.up.sql
│   ├── 000001_initial_schema.down.sql
│   ├── 000002_add_analytics.up.sql
│   ├── 000002_add_analytics.down.sql
│   └── ... (one per feature)
│
├── queries/                         # sqlc SQL query files
│   ├── users.sql                    # User CRUD + search
│   ├── workspaces.sql               # Workspace + members
│   ├── ideas.sql                    # Idea queries + search
│   ├── contents.sql                 # Content + versions
│   ├── series.sql                   # Series + episodes
│   ├── publishing.sql               # Publishing schedule
│   ├── ai_requests.sql              # AI request logging
│   ├── ai_conversations.sql         # Conversation history
│   ├── remix.sql                    # Remix job tracking
│   ├── analytics.sql                # Events + aggregates
│   ├── gamification.sql             # XP, achievements
│   ├── sponsorships.sql             # Deal records
│   ├── integrations.sql             # OAuth, webhooks
│   ├── notifications.sql            # Notification records
│   ├── templates.sql                # Template library
│   └── search.sql                   # Full-text search queries
│
├── test/                            # Test utilities and fixtures
│   ├── fixtures/
│   │   ├── user_fixtures.go         # Sample user data
│   │   ├── workspace_fixtures.go    # Sample workspace data
│   │   └── ...
│   │
│   ├── mocks/
│   │   ├── mock_repository.go       # Auto-generated mocks (mockgen)
│   │   └── mock_provider.go
│   │
│   └── testdb/
│       ├── setup.go                 # Test DB setup, cleanup
│       └── seeder.go                # Test data seeding
│
├── scripts/
│   ├── seed_dev.sql                 # Development data seed
│   ├── schema_docs.sh               # Generate schema docs
│   └── setup_test_db.sh             # Create test database
│
├── sqlc.yaml                        # sqlc code generation config
├── .sqlc.yaml                       # Alternative sqlc location
├── docker-compose.yml               # Local dev: PostgreSQL, Redis, MinIO
├── docker-compose.test.yml          # Test: PostgreSQL, Redis
├── Dockerfile                       # Production container image
├── .dockerignore                    # Optimize docker build
├── Makefile                         # Development commands
├── .golangci.yml                    # Linter configuration
├── .env.example                     # Example environment variables
├── .env.test.example                # Test environment variables
├── go.mod                           # Module definition
├── go.sum                           # Dependency checksums
└── README.md                        # Project setup guide
```

---

## 2. Directory Reference

### `/cmd/api/` — Application Entry Point

**Purpose**: Bootstrap the application, wire dependencies, start the server.

**main.go**: Parses config, initializes DB/Redis, wires services, starts HTTP server.

```go
// cmd/api/main.go (pseudocode structure)
func main() {
    cfg := config.LoadFromEnv()

    // Initialize infrastructure
    db := initDB(cfg)
    redis := initRedis(cfg)
    s3 := initS3(cfg)

    // Wire services
    repos := wireRepositories(db)
    services := wireServices(repos, redis, s3)
    handlers := wireHandlers(services)

    // Start server
    srv := server.New(cfg, handlers)
    srv.Start()
}
```

### `/internal/config/` — Configuration Management

**Reads from environment variables** using `github.com/kelseyhightower/envconfig`.

Files:
- **config.go**: Main `Config` struct with all flags (DB URL, JWT secret, AI keys, etc.)
- **database.go**: Database connection pool config (min/max conns, SSL, timeout)
- **services.go**: Service-specific flags (rate limits, feature flags, AI model selection)

Example:
```go
// internal/config/config.go
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    JWT      JWTConfig
    AI       AIConfig
    S3       S3Config
}

func LoadFromEnv() (*Config, error) {
    var cfg Config
    err := envconfig.Process("ORDO", &cfg)
    return &cfg, err
}
```

### `/internal/server/` — HTTP Server Setup

**Files**:
- **server.go**: Chi router initialization, graceful shutdown, server struct
- **routes.go**: Register all route handlers with middleware chains
- **middleware.go**: Attach global middleware (auth, logging, recovery, etc.)

Example route registration:
```go
// internal/server/routes.go
func (s *Server) RegisterRoutes(h *handler.Handlers) {
    r := s.router

    // Health checks
    r.Get("/health", h.Health.Liveness)
    r.Get("/ready", h.Health.Readiness)

    // Auth (no middleware)
    r.Post("/v1/auth/signup", h.Auth.SignUp)
    r.Post("/v1/auth/login", h.Auth.Login)

    // Protected routes
    protected := r.Group(func(r chi.Router) {
        r.Use(middleware.JWT)
        r.Use(middleware.Workspace) // Extract workspace from JWT
    })

    protected.Get("/v1/users/{id}", h.User.GetByID)
    protected.Get("/v1/ideas", h.Idea.List)
    // ... etc
}
```

### `/internal/middleware/` — HTTP Middleware

**One file per middleware concern**:

- **auth.go**: JWT token extraction + validation
- **workspace.go**: Inject workspace_id into context from JWT claims
- **ratelimit.go**: Redis-backed rate limiting per tier
- **requestid.go**: Generate/extract X-Request-ID
- **logger.go**: Request/response logging (zerolog)
- **recovery.go**: Panic recovery → error response
- **cors.go**: CORS header injection
- **compression.go**: gzip response compression

Each middleware is a `func(http.Handler) http.Handler` for Chi compatibility.

### `/internal/domain/` — Domain Models

**Pure Go structs, NO database dependencies. These are source of truth for the business logic.**

One file per feature area:

**user.go**:
```go
type User struct {
    ID        uuid.UUID
    Email     string
    FirstName string
    LastName  string
    // ... etc
}

func (u *User) Validate() error { ... }
func (u *User) SetPassword(pwd string) error { ... }
```

**errors.go** — Domain error types:
```go
var (
    ErrNotFound           = errors.New("resource not found")
    ErrUnauthorized       = errors.New("unauthorized")
    ErrForbidden          = errors.New("forbidden")
    ErrValidationFailed   = errors.New("validation failed")
    ErrDuplicateEmail     = errors.New("email already exists")
    ErrInsufficientCredits = errors.New("insufficient AI credits")
)
```

### `/internal/handler/` — HTTP Request Handlers

**Thin layer**: Parse request → call service → write response.

**One file per feature area**, matching `/internal/service/`:

```go
// internal/handler/idea.go
type IdeaHandler struct {
    svc *service.IdeaService
    log *zerolog.Logger
}

func (h *IdeaHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Title       string `json:"title" validate:"required"`
        Description string `json:"description"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        response.Error(w, http.StatusBadRequest, "invalid request")
        return
    }

    // Validate
    if err := validator.Struct(req); err != nil {
        response.Error(w, http.StatusBadRequest, err.Error())
        return
    }

    // Call service
    workspaceID := r.Context().Value("workspace_id").(uuid.UUID)
    userID := r.Context().Value("user_id").(uuid.UUID)

    idea, err := h.svc.Create(r.Context(), workspaceID, userID, req.Title, req.Description)
    if err != nil {
        // Handle service errors → HTTP status
        if errors.Is(err, domain.ErrValidationFailed) {
            response.Error(w, http.StatusBadRequest, err.Error())
            return
        }
        response.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    // Write response
    response.JSON(w, http.StatusCreated, idea)
}
```

### `/internal/service/` — Business Logic

**Orchestrates**:
- Domain models + validation
- Repository access
- External service calls (AI, storage, etc.)
- Authorization checks
- Event publishing

**One file per feature**, matching domain:

```go
// internal/service/idea.go
type IdeaService struct {
    ideaRepo   *repository.IdeaRepository
    wsRepo     *repository.WorkspaceRepository
    aiSvc      *AIService
    cache      *cache.RedisCache
    log        *zerolog.Logger
}

func (s *IdeaService) Create(ctx context.Context, workspaceID, userID uuid.UUID, title, desc string) (*domain.Idea, error) {
    // Validate workspace membership
    isMember, err := s.wsRepo.IsMember(ctx, workspaceID, userID)
    if err != nil {
        return nil, err
    }
    if !isMember {
        return nil, domain.ErrForbidden
    }

    // Create domain model
    idea := domain.NewIdea(title, desc)
    if err := idea.Validate(); err != nil {
        return nil, domain.ErrValidationFailed
    }

    // Persist
    if err := s.ideaRepo.Create(ctx, workspaceID, idea); err != nil {
        return nil, err
    }

    // Publish domain event (for other services to react)
    s.publishEvent(ctx, domain.IdeaCreatedEvent{IdeaID: idea.ID})

    return idea, nil
}
```

### `/internal/repository/` — Data Access Layer

**Abstractions** over the database layer. Uses sqlc for type-safe queries.

**Pattern**:
```go
// internal/repository/idea.go

// Interface (contract)
type IdeaRepository interface {
    Create(ctx context.Context, idea *domain.Idea) error
    GetByID(ctx context.Context, ideaID uuid.UUID) (*domain.Idea, error)
    List(ctx context.Context, workspaceID uuid.UUID) ([]*domain.Idea, error)
}

// Implementation (using sqlc)
type ideaRepository struct {
    db *sqlc.Queries
}

func (r *ideaRepository) Create(ctx context.Context, idea *domain.Idea) error {
    return r.db.CreateIdea(ctx, sqlc.CreateIdeaParams{
        ID:          idea.ID,
        WorkspaceID: idea.WorkspaceID,
        Title:       idea.Title,
        Description: idea.Description,
    })
}
```

**sqlc/** subdirectory contains **auto-generated code** (never edit manually):
- `db.go` — Database connection
- `models.go` — Struct models matching DB schema
- `queries.sql.go` — Query method implementations

### `/internal/ws/` — WebSocket Real-Time Communication

**hub.go**: Central connection hub, broadcasts to rooms.

```go
// internal/ws/hub.go
type Hub struct {
    rooms    map[string]*Room       // room_id → Room
    register chan *Client
    unregister chan *Client
}

func (h *Hub) Broadcast(roomID string, event *Event) {
    if room, ok := h.rooms[roomID]; ok {
        room.Broadcast(event)
    }
}
```

**client.go**: Individual client connection, message queue.

**events.go**: Event definitions (server → client):
```go
type Event struct {
    Type      string          `json:"type"`      // "idea.created", "content.updated", etc.
    Timestamp time.Time       `json:"timestamp"`
    Data      json.RawMessage `json:"data"`
}
```

**rooms.go**: Room/channel management, presence tracking.

### `/internal/ai/` — AI Provider Integration

**provider.go** — Interface for pluggable AI providers:
```go
type Provider interface {
    Generate(ctx context.Context, req *domain.AIRequest) (*domain.AIResponse, error)
    Stream(ctx context.Context, req *domain.AIRequest, callback StreamCallback) error
    Transcribe(ctx context.Context, audio []byte) (string, error)
}
```

**anthropic.go** — Claude integration (primary).
**openai.go** — OpenAI fallback (gpt-4, gpt-3.5).
**whisper.go** — Speech-to-text.
**router.go** — Model selection logic based on request type & cost.

### `/internal/queue/` — Background Job Processing

Uses **Redis** as job queue + PostgreSQL for persistence.

**worker.go**: Worker pool, job dispatch.

**processors/**: Job-specific handlers
- **remix.go**: Long-running remix generation
- **publish.go**: Social platform publishing
- **analytics.go**: Event aggregation
- **notification.go**: Email, push notifications
- **cleanup.go**: Stale data purges

### `/internal/cache/` — Redis Caching Layer

One file per cache type:

- **user_cache.go**: User profiles (TTL: 1 hour)
- **workspace_cache.go**: Workspace info (TTL: 1 hour)
- **idea_search.go**: Idea search results (TTL: 5 minutes)
- **rate_limit.go**: Rate limit counters (TTL: 1 minute)

### `/internal/storage/` — Cloud Storage (S3/MinIO)

- **client.go**: S3 client initialization
- **uploader.go**: Multipart file upload, chunking
- **preprocessor.go**: Image/video optimization, thumbnail generation
- **cdn.go**: CDN URL generation + signed URLs

### `/migrations/` — Database Migrations

Uses **golang-migrate** format:

```sql
-- migrations/000001_initial_schema.up.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- migrations/000001_initial_schema.down.sql
DROP TABLE users;
```

### `/queries/` — sqlc SQL Query Files

**Format**: `.sql` files that define named queries.

```sql
-- queries/ideas.sql

-- name: CreateIdea :exec
INSERT INTO ideas (id, workspace_id, user_id, title, description, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

-- name: GetIdeaByID :one
SELECT id, workspace_id, user_id, title, description, status, created_at, updated_at
FROM ideas
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListIdeas :many
SELECT id, workspace_id, user_id, title, description, status, created_at, updated_at
FROM ideas
WHERE workspace_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

sqlc generates Go code from these → type-safe, compile-time checked queries.

### `/test/` — Test Utilities

- **fixtures/**: Sample data for tests
- **mocks/**: Auto-generated mocks (using mockgen)
- **testdb/**: Test database setup/cleanup

### Root Config Files

**sqlc.yaml** — sqlc code generation config:
```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "./queries/"
    schema: "./migrations/"
    gen:
      go:
        package: "sqlc"
        out: "./internal/repository/sqlc"
```

**Dockerfile** — Production container:
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o api ./cmd/api

FROM alpine:latest
COPY --from=builder /app/api /api
EXPOSE 8080
CMD ["/api"]
```

**docker-compose.yml** — Local development environment:
```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ordo_dev
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
```

**Makefile** — Development commands (see section 6).

**.golangci.yml** — Linter rules (gofmt, go vet, golint, etc.).

**.env.example** — Template for environment variables:
```bash
ORDO_SERVER_ADDR=:8080
ORDO_DATABASE_URL=postgres://user:pass@localhost:5432/ordo_dev
ORDO_REDIS_ADDR=localhost:6379
ORDO_JWT_SECRET=your-secret-key
ORDO_AI_ANTHROPIC_KEY=sk-...
ORDO_S3_BUCKET=ordo-dev
```

---

## 3. Package Architecture & Dependencies

### Dependency Flow

```
handler
    ↓
service
    ↓
repository + domain + external services (ai, storage, cache, queue)
    ↓
domain (no external deps)
```

**Strict rules**:
1. **handler** → **service** ONLY (never direct repo access)
2. **service** → **repository** + **domain** + **pkg** + external services
3. **repository** → **domain** + **sqlc**
4. **domain** → ZERO external imports (only stdlib + uuid)
5. **middleware** → **domain** + **pkg** (for errors, JWT parsing)

### Circular Dependency Prevention

Example: Service A needs Service B, but B needs A?

**Solution**: Use **domain events** instead of direct calls.

```go
// Service A publishes event
type IdeaCreatedEvent struct {
    IdeaID uuid.UUID
}

// Service B listens
func (s *NotificationService) OnIdeaCreated(ctx context.Context, evt *domain.IdeaCreatedEvent) {
    // React to event asynchronously
}
```

---

## 4. Module Pattern (Each Feature)

For every feature (ideas, content, publishing, etc.), follow this pattern:

### File Structure
```
internal/
├── domain/
│   └── {feature}.go          # Structs, enums, validation methods
├── handler/
│   └── {feature}.go          # HTTP handlers
├── service/
│   └── {feature}.go          # Business logic
├── repository/
│   └── {feature}.go          # Data access interface + impl
└── queries/
    └── {feature}.sql        # sqlc queries
```

### Domain Model Example (Ideas)

```go
// internal/domain/idea.go

// Enums
type IdeaStatus string
const (
    IdeaStatusDraft       IdeaStatus = "draft"
    IdeaStatusValidated   IdeaStatus = "validated"
    IdeaStatusInPipeline  IdeaStatus = "in_pipeline"
    IdeaStatusArchived    IdeaStatus = "archived"
)

// Struct
type Idea struct {
    ID          uuid.UUID
    WorkspaceID uuid.UUID
    UserID      uuid.UUID
    Title       string
    Description string
    Status      IdeaStatus
    Tags        []string
    CreatedAt   time.Time
    UpdatedAt   time.Time
    DeletedAt   *time.Time
}

// Validation
func (i *Idea) Validate() error {
    if i.Title == "" {
        return ErrValidationFailed
    }
    if len(i.Title) > 255 {
        return ErrValidationFailed
    }
    return nil
}

// Business logic
func (i *Idea) Archive() error {
    if i.Status != IdeaStatusValidated && i.Status != IdeaStatusInPipeline {
        return ErrInvalidStateTransition
    }
    i.Status = IdeaStatusArchived
    return nil
}
```

### Handler Example

```go
// internal/handler/idea.go

type IdeaHandler struct {
    svc *service.IdeaService
    log *zerolog.Logger
}

func NewIdeaHandler(svc *service.IdeaService, log *zerolog.Logger) *IdeaHandler {
    return &IdeaHandler{svc: svc, log: log}
}

// POST /v1/ideas
func (h *IdeaHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Title       string   `json:"title" validate:"required,max=255"`
        Description string   `json:"description"`
        Tags        []string `json:"tags"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        response.Error(w, http.StatusBadRequest, "invalid request body")
        return
    }

    if err := validator.Struct(req); err != nil {
        response.Error(w, http.StatusBadRequest, "validation error")
        return
    }

    workspaceID := r.Context().Value("workspace_id").(uuid.UUID)
    userID := r.Context().Value("user_id").(uuid.UUID)

    idea, err := h.svc.Create(r.Context(), workspaceID, userID, req.Title, req.Description, req.Tags)
    if err != nil {
        h.log.Error().Err(err).Msg("failed to create idea")
        response.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    response.JSON(w, http.StatusCreated, idea)
}

// GET /v1/ideas
func (h *IdeaHandler) List(w http.ResponseWriter, r *http.Request) {
    page := r.URL.Query().Get("page")
    limit := r.URL.Query().Get("limit")

    workspaceID := r.Context().Value("workspace_id").(uuid.UUID)

    ideas, total, err := h.svc.List(r.Context(), workspaceID, page, limit)
    if err != nil {
        response.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    response.JSON(w, http.StatusOK, map[string]interface{}{
        "data": ideas,
        "pagination": map[string]interface{}{
            "total": total,
            "page":  page,
            "limit": limit,
        },
    })
}

// GET /v1/ideas/{id}
func (h *IdeaHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    ideaID := chi.URLParam(r, "id")
    id, err := uuid.Parse(ideaID)
    if err != nil {
        response.Error(w, http.StatusBadRequest, "invalid id")
        return
    }

    workspaceID := r.Context().Value("workspace_id").(uuid.UUID)

    idea, err := h.svc.GetByID(r.Context(), workspaceID, id)
    if err != nil {
        if errors.Is(err, domain.ErrNotFound) {
            response.Error(w, http.StatusNotFound, "idea not found")
            return
        }
        response.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    response.JSON(w, http.StatusOK, idea)
}

// PATCH /v1/ideas/{id}
func (h *IdeaHandler) Update(w http.ResponseWriter, r *http.Request) {
    ideaID := chi.URLParam(r, "id")
    id, err := uuid.Parse(ideaID)
    if err != nil {
        response.Error(w, http.StatusBadRequest, "invalid id")
        return
    }

    var req struct {
        Title       *string  `json:"title"`
        Description *string  `json:"description"`
        Tags        []string `json:"tags"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        response.Error(w, http.StatusBadRequest, "invalid request body")
        return
    }

    workspaceID := r.Context().Value("workspace_id").(uuid.UUID)

    idea, err := h.svc.Update(r.Context(), workspaceID, id, req.Title, req.Description, req.Tags)
    if err != nil {
        if errors.Is(err, domain.ErrNotFound) {
            response.Error(w, http.StatusNotFound, "idea not found")
            return
        }
        response.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    response.JSON(w, http.StatusOK, idea)
}
```

### Service Example

```go
// internal/service/idea.go

type IdeaService struct {
    ideaRepo    repository.IdeaRepository
    wsRepo      repository.WorkspaceRepository
    cache       *cache.RedisCache
    eventBus    *events.EventBus
    log         *zerolog.Logger
}

func NewIdeaService(
    ideaRepo repository.IdeaRepository,
    wsRepo repository.WorkspaceRepository,
    cache *cache.RedisCache,
    eventBus *events.EventBus,
    log *zerolog.Logger,
) *IdeaService {
    return &IdeaService{
        ideaRepo:    ideaRepo,
        wsRepo:      wsRepo,
        cache:       cache,
        eventBus:    eventBus,
        log:         log,
    }
}

func (s *IdeaService) Create(ctx context.Context, workspaceID, userID uuid.UUID, title, description string, tags []string) (*domain.Idea, error) {
    // Check workspace membership
    isMember, err := s.wsRepo.IsMember(ctx, workspaceID, userID)
    if err != nil {
        s.log.Error().Err(err).Msg("failed to check workspace membership")
        return nil, err
    }
    if !isMember {
        return nil, domain.ErrForbidden
    }

    // Create domain model
    idea := &domain.Idea{
        ID:          uuid.New(),
        WorkspaceID: workspaceID,
        UserID:      userID,
        Title:       title,
        Description: description,
        Tags:        tags,
        Status:      domain.IdeaStatusDraft,
        CreatedAt:   time.Now().UTC(),
        UpdatedAt:   time.Now().UTC(),
    }

    // Validate
    if err := idea.Validate(); err != nil {
        return nil, domain.ErrValidationFailed
    }

    // Persist
    if err := s.ideaRepo.Create(ctx, idea); err != nil {
        s.log.Error().Err(err).Msg("failed to create idea")
        return nil, err
    }

    // Publish event (other services react)
    s.eventBus.Publish(ctx, &domain.IdeaCreatedEvent{
        IdeaID:      idea.ID,
        WorkspaceID: workspaceID,
        UserID:      userID,
        Timestamp:   time.Now(),
    })

    return idea, nil
}

func (s *IdeaService) GetByID(ctx context.Context, workspaceID, ideaID uuid.UUID) (*domain.Idea, error) {
    // Try cache first
    cached, err := s.cache.GetIdea(ctx, ideaID)
    if err == nil {
        return cached, nil
    }

    // Fetch from DB
    idea, err := s.ideaRepo.GetByID(ctx, ideaID)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            return nil, domain.ErrNotFound
        }
        s.log.Error().Err(err).Msg("failed to get idea")
        return nil, err
    }

    // Check access
    if idea.WorkspaceID != workspaceID {
        return nil, domain.ErrForbidden
    }

    // Cache for 1 hour
    _ = s.cache.SetIdea(ctx, idea, 1*time.Hour)

    return idea, nil
}

func (s *IdeaService) List(ctx context.Context, workspaceID uuid.UUID, page, limit string) ([]*domain.Idea, int64, error) {
    p := 1
    l := 25

    if pageNum, err := strconv.Atoi(page); err == nil && pageNum > 0 {
        p = pageNum
    }
    if limitNum, err := strconv.Atoi(limit); err == nil && limitNum > 0 && limitNum <= 100 {
        l = limitNum
    }

    offset := (p - 1) * l

    ideas, total, err := s.ideaRepo.ListByWorkspace(ctx, workspaceID, offset, l)
    if err != nil {
        s.log.Error().Err(err).Msg("failed to list ideas")
        return nil, 0, err
    }

    return ideas, total, nil
}
```

### Repository Example

```go
// internal/repository/idea.go

type IdeaRepository interface {
    Create(ctx context.Context, idea *domain.Idea) error
    GetByID(ctx context.Context, ideaID uuid.UUID) (*domain.Idea, error)
    ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, offset, limit int) ([]*domain.Idea, int64, error)
    Update(ctx context.Context, idea *domain.Idea) error
    Delete(ctx context.Context, ideaID uuid.UUID) error
}

type ideaRepository struct {
    db *sqlc.Queries
}

func NewIdeaRepository(db *sqlc.Queries) IdeaRepository {
    return &ideaRepository{db: db}
}

func (r *ideaRepository) Create(ctx context.Context, idea *domain.Idea) error {
    return r.db.CreateIdea(ctx, sqlc.CreateIdeaParams{
        ID:          idea.ID,
        WorkspaceID: idea.WorkspaceID,
        UserID:      idea.UserID,
        Title:       idea.Title,
        Description: idea.Description,
        Status:      string(idea.Status),
        Tags:        idea.Tags,
        CreatedAt:   idea.CreatedAt,
        UpdatedAt:   idea.UpdatedAt,
    })
}

func (r *ideaRepository) GetByID(ctx context.Context, ideaID uuid.UUID) (*domain.Idea, error) {
    row, err := r.db.GetIdeaByID(ctx, ideaID)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, ErrNotFound
        }
        return nil, err
    }

    return &domain.Idea{
        ID:          row.ID,
        WorkspaceID: row.WorkspaceID,
        UserID:      row.UserID,
        Title:       row.Title,
        Description: row.Description,
        Status:      domain.IdeaStatus(row.Status),
        Tags:        row.Tags,
        CreatedAt:   row.CreatedAt,
        UpdatedAt:   row.UpdatedAt,
        DeletedAt:   row.DeletedAt,
    }, nil
}

func (r *ideaRepository) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, offset, limit int) ([]*domain.Idea, int64, error) {
    rows, err := r.db.ListIdeas(ctx, sqlc.ListIdeasParams{
        WorkspaceID: workspaceID,
        Offset:      int32(offset),
        Limit:       int32(limit),
    })
    if err != nil {
        return nil, 0, err
    }

    ideas := make([]*domain.Idea, 0, len(rows))
    for _, row := range rows {
        ideas = append(ideas, &domain.Idea{
            ID:          row.ID,
            WorkspaceID: row.WorkspaceID,
            UserID:      row.UserID,
            Title:       row.Title,
            Description: row.Description,
            Status:      domain.IdeaStatus(row.Status),
            Tags:        row.Tags,
            CreatedAt:   row.CreatedAt,
            UpdatedAt:   row.UpdatedAt,
            DeletedAt:   row.DeletedAt,
        })
    }

    // Get total count
    total, err := r.db.CountIdeas(ctx, workspaceID)
    if err != nil {
        return nil, 0, err
    }

    return ideas, total, nil
}
```

### sqlc Query Example

```sql
-- queries/ideas.sql

-- name: CreateIdea :exec
INSERT INTO ideas (id, workspace_id, user_id, title, description, status, tags, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: GetIdeaByID :one
SELECT id, workspace_id, user_id, title, description, status, tags, created_at, updated_at, deleted_at
FROM ideas
WHERE id = $1;

-- name: ListIdeas :many
SELECT id, workspace_id, user_id, title, description, status, tags, created_at, updated_at, deleted_at
FROM ideas
WHERE workspace_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountIdeas :one
SELECT COUNT(*)
FROM ideas
WHERE workspace_id = $1 AND deleted_at IS NULL;

-- name: UpdateIdea :exec
UPDATE ideas
SET title = $2, description = $3, status = $4, tags = $5, updated_at = $6
WHERE id = $1;

-- name: DeleteIdea :exec
UPDATE ideas
SET deleted_at = $2
WHERE id = $1;
```

---

## 5. Configuration & Dependency Injection

### No DI Framework — Manual Wiring

All dependencies are wired manually in `cmd/api/main.go`:

```go
// cmd/api/main.go (simplified)

func main() {
    // Load config
    cfg := config.LoadFromEnv()

    // Setup infrastructure
    dbConn := initDB(cfg)
    redisClient := initRedis(cfg)
    s3Client := initS3(cfg)

    // Setup logging
    log := logger.New(cfg.LogLevel)

    // Wire repositories (all use same DB conn)
    queries := sqlc.New(dbConn)
    userRepo := repository.NewUserRepository(queries)
    workspaceRepo := repository.NewWorkspaceRepository(queries)
    ideaRepo := repository.NewIdeaRepository(queries)
    // ... etc for each domain

    // Wire cache
    cache := cache.NewRedisCache(redisClient)

    // Wire services (services depend on repos + cache)
    authSvc := service.NewAuthService(userRepo, cache, log)
    workspaceSvc := service.NewWorkspaceService(workspaceRepo, cache, log)
    ideaSvc := service.NewIdeaService(ideaRepo, workspaceRepo, cache, log)
    // ... etc for each domain

    // Wire handlers (handlers depend on services)
    handlers := &handler.Handlers{
        Auth:      handler.NewAuthHandler(authSvc, log),
        Workspace: handler.NewWorkspaceHandler(workspaceSvc, log),
        Idea:      handler.NewIdeaHandler(ideaSvc, log),
        // ... etc
    }

    // Wire WebSocket
    wsHub := ws.NewHub(log)

    // Start background workers
    worker := queue.NewWorker(redisClient, services, log)
    worker.Start()

    // Start HTTP server
    srv := server.New(cfg, handlers, wsHub, log)
    if err := srv.Start(); err != nil {
        log.Fatal().Err(err).Msg("server failed")
    }
}

func initDB(cfg *config.Config) *pgx.Conn {
    conn, err := pgx.Connect(context.Background(), cfg.Database.URL)
    if err != nil {
        panic(err)
    }
    return conn
}

func initRedis(cfg *config.Config) redis.UniversalClient {
    return redis.NewClient(&redis.Options{
        Addr: cfg.Redis.Addr,
    })
}

func initS3(cfg *config.Config) *s3.Client {
    // ... S3 client setup
}
```

### Environment Variables

All config from environment (no config files):

```bash
# Server
ORDO_SERVER_ADDR=:8080
ORDO_LOG_LEVEL=info

# Database
ORDO_DATABASE_URL=postgres://user:pass@localhost:5432/ordo
ORDO_DATABASE_MAX_CONNS=50
ORDO_DATABASE_MIN_CONNS=10

# Redis
ORDO_REDIS_ADDR=localhost:6379
ORDO_REDIS_PASSWORD=""

# JWT
ORDO_JWT_SECRET=your-secret-key
ORDO_JWT_EXPIRY=24h

# AI
ORDO_AI_ANTHROPIC_KEY=sk-...
ORDO_AI_OPENAI_KEY=sk-...
ORDO_AI_MODEL_PRIMARY=claude-3-sonnet
ORDO_AI_MODEL_FALLBACK=gpt-4

# S3
ORDO_S3_ENDPOINT=https://s3.amazonaws.com
ORDO_S3_REGION=us-east-1
ORDO_S3_BUCKET=ordo-prod
ORDO_S3_ACCESS_KEY=...
ORDO_S3_SECRET_KEY=...

# Stripe
ORDO_STRIPE_SECRET_KEY=sk_live_...

# Features
ORDO_FEATURE_REMIX_ENABLED=true
ORDO_FEATURE_AI_ENABLED=true
ORDO_FEATURE_ANALYTICS_ENABLED=true
```

Load with `github.com/kelseyhightower/envconfig`:

```go
func LoadFromEnv() (*Config, error) {
    var cfg Config
    if err := envconfig.Process("ORDO", &cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

---

## 6. Build & Development Tools

### Makefile

```makefile
.PHONY: help run build test test-unit test-int lint format clean docker-up docker-down migrate-new migrate-up migrate-down seed sqlc

help:
	@echo "Ordo API Development Commands"
	@echo "============================="
	@echo "make run              # Run API locally"
	@echo "make build            # Build binary"
	@echo "make test             # Run all tests"
	@echo "make test-unit        # Unit tests only"
	@echo "make test-int         # Integration tests (requires Docker)"
	@echo "make lint             # Lint with golangci-lint"
	@echo "make format           # Format code with gofmt"
	@echo "make sqlc             # Generate sqlc code"
	@echo "make migrate-new      # Create new migration (name=...)"
	@echo "make migrate-up       # Apply pending migrations"
	@echo "make migrate-down     # Rollback last migration"
	@echo "make seed             # Seed development data"
	@echo "make docker-up        # Start Docker services"
	@echo "make docker-down      # Stop Docker services"
	@echo "make clean            # Clean build artifacts"

run:
	go run ./cmd/api/main.go

build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/api ./cmd/api/main.go

test:
	go test -v -race -coverprofile=coverage.out ./...

test-unit:
	go test -v -short -race ./...

test-int:
	docker-compose -f docker-compose.test.yml up -d
	sleep 5
	go test -v -run TestIntegration ./...
	docker-compose -f docker-compose.test.yml down

lint:
	golangci-lint run ./...

format:
	go fmt ./...
	goimports -w .

sqlc:
	sqlc generate

migrate-new:
	@test -n "$(name)" || (echo "Usage: make migrate-new name=description" && exit 1)
	migrate create -ext sql -dir migrations -seq $(name)

migrate-up:
	migrate -path migrations -database "postgres://localhost/ordo" up

migrate-down:
	migrate -path migrations -database "postgres://localhost/ordo" down 1

seed:
	psql -d ordo < scripts/seed_dev.sql

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

clean:
	rm -rf bin/
	go clean
```

### Script Examples

**scripts/setup_test_db.sh**:
```bash
#!/bin/bash
set -e

DB_NAME="ordo_test"
psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -U postgres -c "CREATE DATABASE $DB_NAME;"

migrate -path migrations -database "postgres://postgres:password@localhost/$DB_NAME" up
```

**scripts/seed_dev.sql**:
```sql
-- Insert test users
INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'alice@example.com', '$2a$12$...', 'Alice', 'Creator'),
  ('550e8400-e29b-41d4-a716-446655440001', 'bob@example.com', '$2a$12$...', 'Bob', 'Creator');

-- Insert test workspace
INSERT INTO workspaces (id, owner_id, name, slug) VALUES
  ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', 'Alice Studio', 'alice-studio');

-- Insert test ideas
INSERT INTO ideas (id, workspace_id, user_id, title, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', 'AI Podcast Series', 'draft');
```

---

## 7. Key Go Packages & Versions

### go.mod (Example)

```go
module github.com/ordo-ai/ordo-api

go 1.22

require (
    // HTTP
    github.com/go-chi/chi/v5 v5.0.11
    github.com/go-chi/cors v1.2.1
    github.com/go-chi/render v1.0.3
    github.com/go-chi/middleware v1.4.1

    // Database
    github.com/jackc/pgx/v5 v5.5.5
    github.com/jackc/pgconn v1.14.3
    github.com/golang-migrate/migrate/v4 v4.17.0

    // Code generation (sqlc is CLI-only, not imported)

    // Redis
    github.com/redis/go-redis/v9 v9.4.0

    // JWT
    github.com/golang-jwt/jwt/v5 v5.2.0

    // AI Providers
    github.com/anthropics/anthropic-sdk-go v0.1.0
    github.com/sashabaranov/go-openai v1.20.2

    // Storage
    github.com/aws/aws-sdk-go-v2 v1.24.0
    github.com/aws/aws-sdk-go-v2/service/s3 v1.47.0

    // Stripe (payments)
    github.com/stripe/stripe-go/v81 v81.0.0

    // WebSocket
    github.com/gorilla/websocket v1.5.1

    // Logging
    github.com/rs/zerolog v1.31.0

    // Configuration
    github.com/kelseyhightower/envconfig v1.4.0

    // Validation
    github.com/go-playground/validator/v10 v10.16.0

    // Utilities
    github.com/google/uuid v1.6.0
    golang.org/x/crypto v0.21.0
    golang.org/x/sync v0.6.0
)

require (
    // Indirect dependencies...
)
```

### Package Descriptions

| Package | Purpose | Version |
|---------|---------|---------|
| `github.com/go-chi/chi/v5` | HTTP router | 5.0.11 |
| `github.com/jackc/pgx/v5` | PostgreSQL driver | 5.5.5 |
| `github.com/golang-migrate/migrate/v4` | Database migrations | 4.17.0 |
| `github.com/redis/go-redis/v9` | Redis client | 9.4.0 |
| `github.com/golang-jwt/jwt/v5` | JWT signing/validation | 5.2.0 |
| `github.com/anthropics/anthropic-sdk-go` | Claude API client | Latest |
| `github.com/sashabaranov/go-openai` | OpenAI API client | 1.20.2 |
| `github.com/aws/aws-sdk-go-v2/service/s3` | S3 client | Latest |
| `github.com/stripe/stripe-go/v81` | Stripe API client | 81.0.0 |
| `github.com/gorilla/websocket` | WebSocket support | 1.5.1 |
| `github.com/rs/zerolog` | Structured logging | 1.31.0 |
| `github.com/kelseyhightower/envconfig` | Env var parsing | 1.4.0 |
| `github.com/go-playground/validator/v10` | Struct validation | 10.16.0 |
| `github.com/google/uuid` | UUID utilities | 1.6.0 |
| `golang.org/x/crypto` | bcrypt + encryption | 0.21.0 |

### Go Version

Requires **Go 1.22+** (for better iterator/range support).

---

## 8. Testing Strategy

### Unit Tests (No External Services)

Files: `*_test.go` next to implementation.

Example: **internal/service/idea_test.go**

```go
func TestIdeaService_Create(t *testing.T) {
    mockRepo := &mockIdeaRepo{}
    mockRepo.on.Create = func(ctx context.Context, idea *domain.Idea) error {
        return nil
    }

    svc := service.NewIdeaService(mockRepo, nil, nil, nil, nil)

    idea, err := svc.Create(context.Background(), uuid.New(), uuid.New(), "Test", "", nil)

    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if idea.Title != "Test" {
        t.Fatalf("expected title 'Test', got '%s'", idea.Title)
    }
}
```

Run with: `make test-unit`

### Integration Tests (With DB)

Files: `internal/*_integration_test.go`

Example: **internal/repository/idea_integration_test.go**

```go
func TestIdeaRepository_Create(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    // Setup test DB
    db := testdb.Setup(t)
    defer testdb.Cleanup(t, db)

    repo := repository.NewIdeaRepository(sqlc.New(db))

    idea := &domain.Idea{
        ID:          uuid.New(),
        WorkspaceID: uuid.New(),
        UserID:      uuid.New(),
        Title:       "Test Idea",
    }

    err := repo.Create(context.Background(), idea)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }

    // Verify it was persisted
    fetched, err := repo.GetByID(context.Background(), idea.ID)
    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if fetched.Title != idea.Title {
        t.Fatalf("expected title '%s', got '%s'", idea.Title, fetched.Title)
    }
}
```

Run with: `make test-int`

### Test Utilities

**test/testdb/setup.go**:
```go
func Setup(t *testing.T) *pgx.Conn {
    ctx := context.Background()

    // Connect to test DB
    conn, err := pgx.Connect(ctx, "postgres://localhost/ordo_test")
    if err != nil {
        t.Fatalf("failed to connect to test DB: %v", err)
    }

    // Run migrations
    m, err := migrate.New("file://migrations", "postgres://localhost/ordo_test")
    if err != nil {
        t.Fatalf("failed to init migrator: %v", err)
    }
    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        t.Fatalf("failed to run migrations: %v", err)
    }

    return conn
}

func Cleanup(t *testing.T, conn *pgx.Conn) {
    conn.Close(context.Background())
}
```

---

## 9. Deployment & Docker

### Dockerfile (Multi-stage Build)

```dockerfile
# Stage 1: Builder
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy go.mod and go.sum
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o api ./cmd/api/main.go

# Stage 2: Runtime
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 ordo && adduser -D -u 1000 -G ordo ordo

WORKDIR /home/ordo

# Copy binary from builder
COPY --from=builder /app/api ./

# Set ownership
RUN chown -R ordo:ordo /home/ordo

USER ordo

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./api"]
```

### docker-compose.yml (Development)

```yaml
version: "3.8"

services:
  # PostgreSQL 16
  postgres:
    image: postgres:16-alpine
    container_name: ordo_postgres
    environment:
      POSTGRES_DB: ordo_dev
      POSTGRES_USER: ordo
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ordo"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 7
  redis:
    image: redis:7-alpine
    container_name: ordo_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    container_name: ordo_minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    volumes:
      - minio_data:/minio_data
    command: server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Kubernetes Deployment (Example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ordo-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ordo-api
  template:
    metadata:
      labels:
        app: ordo-api
    spec:
      containers:
      - name: api
        image: ordo-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: ORDO_DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ordo-secrets
              key: database-url
        - name: ORDO_REDIS_ADDR
          value: "ordo-redis:6379"
        - name: ORDO_JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: ordo-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## 10. Development Workflow

### Local Setup

```bash
# 1. Clone repository
git clone https://github.com/ordo-ai/ordo-api.git
cd ordo-api

# 2. Install Go 1.22+
# (via Homebrew, asdf, or direct download)

# 3. Copy environment template
cp .env.example .env

# 4. Start Docker services
make docker-up
sleep 5

# 5. Run migrations
make migrate-up

# 6. Seed development data (optional)
make seed

# 7. Generate sqlc code
make sqlc

# 8. Run tests
make test

# 9. Start API server
make run
# Server listens on http://localhost:8080
```

### Adding a New Feature

Example: Adding a "Favorites" feature to ideas.

**Step 1: Domain Model** (`internal/domain/idea.go`)
```go
type Idea struct {
    // ... existing fields ...
    IsFavorited bool
}
```

**Step 2: Database Migration** (`make migrate-new name=add_idea_favorites`)
```sql
ALTER TABLE ideas ADD COLUMN is_favorited BOOLEAN DEFAULT FALSE;
```

**Step 3: sqlc Queries** (`queries/ideas.sql`)
```sql
-- name: ToggleIdeaFavorite :exec
UPDATE ideas SET is_favorited = NOT is_favorited WHERE id = $1;
```

**Step 4: Repository** (`internal/repository/idea.go`)
```go
func (r *ideaRepository) ToggleFavorite(ctx context.Context, ideaID uuid.UUID) error {
    return r.db.ToggleIdeaFavorite(ctx, ideaID)
}
```

**Step 5: Service** (`internal/service/idea.go`)
```go
func (s *IdeaService) ToggleFavorite(ctx context.Context, ideaID uuid.UUID) error {
    return s.ideaRepo.ToggleFavorite(ctx, ideaID)
}
```

**Step 6: Handler** (`internal/handler/idea.go`)
```go
func (h *IdeaHandler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
    ideaID := chi.URLParam(r, "id")
    id, _ := uuid.Parse(ideaID)

    if err := h.svc.ToggleFavorite(r.Context(), id); err != nil {
        response.Error(w, http.StatusInternalServerError, "internal error")
        return
    }

    response.JSON(w, http.StatusOK, map[string]bool{"success": true})
}
```

**Step 7: Routes** (`internal/server/routes.go`)
```go
protected.Post("/v1/ideas/{id}/favorite", h.Idea.ToggleFavorite)
```

**Step 8: Test**
```bash
make sqlc          # Regenerate sqlc code
make test-unit    # Run unit tests
make run          # Start server
```

### Code Review Checklist

Before pushing:

1. **Unit tests pass**: `make test-unit`
2. **Integration tests pass**: `make test-int`
3. **Linting passes**: `make lint`
4. **Code is formatted**: `make format`
5. **sqlc code generated**: `make sqlc`
6. **Migration created** (if DB schema changed)
7. **Handler → Service → Repository → Domain** (dependency flow)
8. **No circular dependencies**
9. **Error handling** (all paths checked)
10. **Logging** (debug traces for debugging)
11. **Authorization** (workspace membership checked)
12. **Documentation** (if non-obvious)

---

## Summary

This structure provides:

- **Clear separation of concerns**: handler → service → repository → domain
- **Type safety**: sqlc eliminates SQL-related runtime errors
- **Modularity**: Each feature is self-contained, easily extracted to microservice later
- **Testability**: Mock repositories, no framework magic
- **Scalability**: Database connections pooled, Redis caching, background workers
- **Developer experience**: Clear folder structure, predictable patterns, Makefile commands

A developer new to the project can:
1. Read this spec
2. Know exactly where to add new code
3. Follow the module pattern for consistency
4. Run `make run` to start immediately
5. Submit PRs without architectural confusion

---

**Maintained by**: Ordo Engineering
**Last Updated**: 2026-03-10
**Status**: Complete & Production-Ready
