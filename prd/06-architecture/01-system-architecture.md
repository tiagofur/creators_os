# Ordo Creator OS — System Architecture

> A comprehensive technical blueprint for building the operating system for content creators.

---

## 1. Architecture Overview

### 1.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐           │
│  │   Web App    │  │  Mobile App  │  │   Desktop App        │           │
│  │ (Next.js 16) │  │ (React Native)  │ (Electron + Vite)    │           │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────────┘           │
│         │                 │                    │                         │
│         └─────────────────┼────────────────────┘                         │
│                           │ REST/WebSocket                               │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   API GATEWAY & MIDDLEWARE TIER                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  Auth (JWT) | Logging | CORS | Rate Limiting | Request ID     │     │
│  │  Circuit Breaker | Tracing | Compression                       │     │
│  └────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  MODULAR MONOLITH (Go) — API LAYER                       │
│                                                                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐           │
│  │    Auth      │   Users &    │  Workspaces  │   Ideas &    │           │
│  │   Service    │  Workspaces  │   Service    │  Ideation    │           │
│  │              │              │              │              │           │
│  └──────────────┴──────────────┴──────────────┴──────────────┘           │
│                                                                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐           │
│  │  Pipeline &  │   Content &  │  Publishing  │   Analytics  │           │
│  │   Series     │  Versioning  │   Service    │   Service    │           │
│  │              │              │              │              │           │
│  └──────────────┴──────────────┴──────────────┴──────────────┘           │
│                                                                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐           │
│  │      AI      │   Media      │  Gamification│ Notifications│           │
│  │   Gateway    │   Processing │              │              │           │
│  │              │              │              │              │           │
│  └──────────────┴──────────────┴──────────────┴──────────────┘           │
│                                                                           │
│  ┌──────────────┬──────────────┬──────────────┐                          │
│  │ Sponsorships │  Integration │  Webhooks &  │                          │
│  │   & CRM      │   Manager    │  Automation  │                          │
│  │              │              │              │                          │
│  └──────────────┴──────────────┴──────────────┘                          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              INTERNAL COMMUNICATION LAYER                        │    │
│  │  Domain Events | Service Interfaces | Dependency Injection      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────────┐ ┌────────────────┐ ┌─────────────────┐
│  PostgreSQL      │ │     Redis      │ │  S3/R2 Storage  │
│  (Primary DB)    │ │  (Cache/Queue) │ │  (Media Files)  │
│                  │ │                │ │  (CDN delivery) │
└──────────────────┘ └────────────────┘ └─────────────────┘
         │
         └─────────────────┬──────────────────┐
                           │                  │
                           ▼                  ▼
                    ┌─────────────┐   ┌─────────────┐
                    │  OpenAI     │   │  Anthropic  │
                    │  Gemini     │   │  (Fallback) │
                    │  Whisper    │   └─────────────┘
                    └─────────────┘
                           │
         ┌─────────────────┼─────────────────┬──────────────┐
         │                 │                 │              │
         ▼                 ▼                 ▼              ▼
    ┌─────────┐    ┌──────────────┐   ┌──────────┐  ┌──────────┐
    │ YouTube │    │  TikTok      │   │Instagram │  │ Twitter/ │
    │  API    │    │  API         │   │  API     │  │LinkedIn  │
    └─────────┘    └──────────────┘   └──────────┘  └──────────┘
```

### 1.2 Architectural Decision: Modular Monolith

**Decision: Go-based Modular Monolith with Clear Module Boundaries**

For Ordo Creator OS, we recommend a **modular monolith** approach over microservices at launch:

**Why Monolith?**
- **Startup stage**: The team is small; microservice overhead is organizational friction
- **Shared data patterns**: Content pipeline, ideas, and publishing are tightly coupled
- **Simpler operations**: Single deployment, unified logging, easier debugging
- **Cost efficient**: Reduce infrastructure complexity in Year 1

**Why "Modular"?**
- Each domain (auth, ideas, pipeline, publishing, etc.) is a **separate Go package** with clear interfaces
- Services communicate via **defined package contracts**, not APIs
- Modules can be extracted to microservices later without rewriting core logic
- Event-driven internal communication (domain events) prepares for future async processing

**Future Path to Microservices:**
- Media processing (video/image) → Extract to dedicated workers
- Analytics ingestion → Extract to separate service
- AI gateway → Extract to service with independent scaling
- Notifications → Extract to async service
- Each extraction is simple because module boundaries are already clear

**Module Boundaries:**
```
internal/
├── auth/           # JWT, session management
├── users/          # User profiles, preferences
├── workspaces/     # Multi-tenancy, RBAC
├── ideas/          # Ideation, capture, validation
├── pipeline/       # Content lifecycle (Kanban)
├── content/        # Versioning, scripts, assets
├── series/         # Episode management, scheduling
├── publishing/     # Social post scheduling, multi-platform
├── analytics/      # Metrics, heatmaps, consistency score
├── ai/             # AI gateway, credit system, queue
├── media/          # Upload, processing, storage
├── gamification/   # XP, levels, achievements, streaks
├── notifications/  # Real-time alerts, notification center
├── sponsorships/   # Deal pipeline, brand CRM
├── integrations/   # OAuth, webhooks, automations
├── realtime/       # WebSocket management, presence
└── common/         # Shared utilities, domain models
```

Each module has:
- Clear **domain models** (entities)
- **Use case interfaces** (what operations it supports)
- **Repository pattern** (data access)
- **Event publishers** (domain events for other modules)
- **Dependency injection setup**

### 1.3 Communication Patterns

**Synchronous (HTTP/REST + gRPC):**
- Frontend ↔ Backend: REST + WebSocket
- Internal service-to-service: Go package functions (in-process)
- Will migrate to gRPC for extracted microservices

**Asynchronous (Event-Driven):**
- Heavy AI tasks: Queue-based (Bull/Redis) → Workers
- Analytics ingestion: Event stream → Processor
- Notifications: Domain events → Publisher → WebSocket broadcast
- Publishing webhooks: Platform events → Listener → Handler

**Real-Time (WebSocket):**
- Pipeline updates (drag-drop, status changes)
- AI responses streaming
- Notifications arriving
- Presence (who's online)
- Redis Pub/Sub for cross-instance communication

---

## 2. Go Backend Architecture

### 2.1 Project Structure (Go Best Practices)

```
ordo-backend/
├── cmd/
│   ├── server/              # Main HTTP server
│   │   └── main.go
│   ├── worker/              # Background job worker
│   │   └── main.go
│   └── migrate/             # Database migration CLI
│       └── main.go
│
├── internal/                # Private to this module (cannot be imported elsewhere)
│   ├── auth/
│   │   ├── service.go
│   │   ├── models.go
│   │   └── repository.go
│   ├── ideas/
│   │   ├── service.go
│   │   ├── models.go
│   │   ├── repository.go
│   │   └── handlers.go
│   ├── pipeline/
│   │   ├── service.go
│   │   ├── models.go
│   │   ├── repository.go
│   │   └── handlers.go
│   ├── [other modules...]
│   │
│   ├── common/              # Shared internals
│   │   ├── models.go        # Domain models
│   │   ├── errors.go        # Error types
│   │   ├── events.go        # Domain event definitions
│   │   └── middleware.go    # HTTP middleware
│   │
│   └── platform/            # Infrastructure layer
│       ├── db/
│       │   ├── postgres.go
│       │   └── queries.go   # Auto-generated sqlc
│       ├── redis/
│       │   └── client.go
│       ├── storage/
│       │   └── s3.go
│       ├── ai/
│       │   ├── openai.go
│       │   ├── anthropic.go
│       │   └── circuit_breaker.go
│       ├── events/
│       │   ├── emitter.go
│       │   └── subscriber.go
│       └── logging/
│           └── logger.go
│
├── api/                     # OpenAPI/Swagger definitions
│   └── openapi.yaml         # Auto-generated from code
│
├── migrations/              # Database migrations (golang-migrate)
│   ├── 001_create_users.up.sql
│   ├── 001_create_users.down.sql
│   ├── 002_create_workspaces.up.sql
│   └── [...]
│
├── scripts/                 # Utility scripts
│   └── dev-setup.sh
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── go.mod                   # Dependency management
├── go.sum
├── main.go                  # Application bootstrap
├── config.go                # Configuration loading
├── routes.go                # Route registration
├── middleware.go            # Middleware setup
└── README.md
```

### 2.2 Module Breakdown: Services & Handlers

Each module follows this pattern:

```go
// internal/ideas/service.go
type IdeaService struct {
  repo IdeaRepository
  eventBus EventBus
  aiGateway AIGateway
}

func (s *IdeaService) CreateIdea(ctx context.Context, input CreateIdeaInput) (*Idea, error) {
  // Business logic
  // Validate
  // Call repository
  // Publish domain event
  return idea, nil
}

// internal/ideas/handlers.go
func (h *IdeaHandlers) CreateIdea(w http.ResponseWriter, r *http.Request) {
  // Unmarshal request
  // Call service
  // Marshal response
  // Return 201 Created
}

// internal/ideas/repository.go
type IdeaRepository interface {
  Create(ctx context.Context, idea *Idea) (*Idea, error)
  GetByID(ctx context.Context, id string) (*Idea, error)
  List(ctx context.Context, filters IdeaFilters) ([]*Idea, error)
  Update(ctx context.Context, idea *Idea) (*Idea, error)
  Delete(ctx context.Context, id string) error
}
```

**Module Dependency Graph:**
```
auth (no dependencies)
  ↓
users ← auth
workspaces ← auth, users
ideas ← workspaces
pipeline ← workspaces, ideas, series
content ← workspaces, pipeline
series ← workspaces
publishing ← workspaces, content, integrations
analytics ← workspaces, content, publishing
ai ← workspaces (uses MediaProcessing for video)
media ← workspaces
gamification ← workspaces, analytics
notifications ← workspaces (publishes events)
sponsorships ← workspaces
integrations ← workspaces
realtime ← all (listens to domain events)
```

**Key Modules Detail:**

| Module | Responsibilities |
|--------|------------------|
| **auth** | JWT token generation/validation, refresh token rotation, OAuth flow orchestration |
| **users** | User registration, profile management, preferences, account deletion (GDPR) |
| **workspaces** | Workspace CRUD, multi-tenancy isolation, workspace members, RBAC enforcement |
| **ideas** | Idea creation, status lifecycle, tagging, validation scoring, AI expansion |
| **pipeline** | Kanban state machine, card lifecycle, series association, time tracking, assignments |
| **content** | Script versioning, asset storage references, checklist generation, comments |
| **series** | Template creation, episode ordering, publish schedule, aggregate metrics |
| **publishing** | Social post creation, platform-specific metadata, scheduling queue, auto-publish cron |
| **analytics** | Daily metrics ingestion, consistency score calculation, heatmap data, report generation |
| **ai** | Credit tracking, OpenAI/Anthropic proxying, Whisper transcription, circuit breaker, response caching |
| **media** | Presigned S3 URLs, upload tracking, FFmpeg orchestration, image optimization, CDN integration |
| **gamification** | XP calculation, level progression, achievement unlock logic, streak tracking, leaderboard queries |
| **notifications** | In-app notification persistence, WebSocket broadcast, email digests, notification preferences |
| **sponsorships** | Deal pipeline stages, brand CRM, deliverable tracking, income logging, export |
| **integrations** | OAuth provider handlers, webhook receiver registration, automation rule engine |
| **realtime** | WebSocket connection management, Pub/Sub to Redis, presence tracking, connection pooling |

### 2.3 HTTP Framework: Chi

**Decision: Chi (Lightweight, Composable, Idiomatic Go)**

```go
package main

import (
  "github.com/go-chi/chi/v5"
  "github.com/go-chi/chi/v5/middleware"
)

func setupRouter(services *Services) *chi.Mux {
  r := chi.NewRouter()

  // Global middleware
  r.Use(middleware.Logger)
  r.Use(middleware.Recoverer)
  r.Use(middleware.RequestID)
  r.Use(middleware.Timeout(30 * time.Second))
  r.Use(corsMiddleware)
  r.Use(authMiddleware(services.AuthService))

  // Health checks (no auth required)
  r.Group(func(r chi.Router) {
    r.Use(middleware.StripSlashes)
    r.Get("/health", healthHandler)
    r.Get("/ready", readinessHandler)
  })

  // Public routes (login, signup, oauth)
  r.Group(func(r chi.Router) {
    r.Use(middleware.StripSlashes)
    authHandler := auth.NewHandlers(services)
    r.Post("/auth/register", authHandler.Register)
    r.Post("/auth/login", authHandler.Login)
    r.Post("/auth/refresh", authHandler.Refresh)
    r.Post("/auth/logout", authHandler.Logout)
    r.Get("/auth/oauth/google/callback", authHandler.GoogleCallback)
  })

  // API routes (require auth)
  r.Group(func(r chi.Router) {
    r.Use(middleware.StripSlashes)
    r.Use(rateLimitMiddleware)

    // Ideas endpoints
    ideasHandler := ideas.NewHandlers(services.IdeaService)
    r.Route("/api/v1/ideas", func(r chi.Router) {
      r.Get("/", ideasHandler.List)
      r.Post("/", ideasHandler.Create)
      r.Route("/{id}", func(r chi.Router) {
        r.Get("/", ideasHandler.GetByID)
        r.Put("/", ideasHandler.Update)
        r.Delete("/", ideasHandler.Delete)
        r.Post("/promote", ideasHandler.PromoteToContent)
      })
    })

    // Pipeline endpoints
    pipelineHandler := pipeline.NewHandlers(services.PipelineService)
    r.Route("/api/v1/pipeline", func(r chi.Router) {
      r.Get("/", pipelineHandler.GetBoard)
      r.Post("/move", pipelineHandler.MoveCard)
      // ... more routes
    })

    // ... other routes
  })

  // WebSocket upgrade
  r.Get("/api/v1/ws", wsHandler(services))

  return r
}
```

**Why Chi?**
- Lightweight (no magic)
- Composable middleware
- Idiomatic Go (net/http-compatible)
- Router nesting (clean organization)
- No external dependencies for routing
- Production-ready (used by Uber, Monzo, etc.)

Alternative consideration: **Echo** if you need higher-level features (validation, model binding). **Fiber** if you need raw speed (but adds opinionated abstractions).

### 2.4 Middleware Stack

```go
// core/middleware.go
func setupMiddleware(r chi.Router) {
  // Request ID (tracing)
  r.Use(middleware.RequestID)

  // Structured logging
  r.Use(loggingMiddleware)

  // CORS
  r.Use(corsMiddleware)

  // Security headers
  r.Use(securityHeadersMiddleware)

  // Rate limiting (per IP, per user)
  r.Use(rateLimitMiddleware)

  // Request/response compression
  r.Use(middleware.Compress(5))

  // OpenTelemetry tracing
  r.Use(tracingMiddleware)

  // JWT extraction (but not enforcement — public routes exempt)
  r.Use(tokenExtractionMiddleware)
}

// loggingMiddleware logs structured request/response
func loggingMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    log := logger.WithFields(map[string]interface{}{
      "request_id": middleware.GetReqID(r.Context()),
      "method": r.Method,
      "path": r.URL.Path,
      "remote_addr": r.RemoteAddr,
      "user_agent": r.UserAgent(),
    })

    start := time.Now()
    wrapped := responseWriter{ResponseWriter: w, statusCode: 200}

    next.ServeHTTP(&wrapped, r)

    log.WithFields(map[string]interface{}{
      "status": wrapped.statusCode,
      "duration_ms": time.Since(start).Milliseconds(),
      "response_size": wrapped.bytesWritten,
    }).Info("request completed")
  })
}

// rateLimitMiddleware enforces per-tier rate limits
func rateLimitMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    user := r.Context().Value("user").(*User)
    tier := user.SubscriptionTier // FREE, PRO, ENTERPRISE

    limits := map[string]int{
      "FREE":       100,  // 100 req/min
      "PRO":        1000, // 1000 req/min
      "ENTERPRISE": 5000, // 5000 req/min
    }

    limiter := getLimiter(user.ID, limits[tier])
    if !limiter.Allow() {
      w.Header().Set("Retry-After", "60")
      w.WriteHeader(http.StatusTooManyRequests)
      json.NewEncoder(w).Encode(ErrorResponse{
        Code: "RATE_LIMIT_EXCEEDED",
        Message: "Too many requests",
      })
      return
    }

    next.ServeHTTP(w, r)
  })
}

// securityHeadersMiddleware sets OWASP-recommended headers
func securityHeadersMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("X-Content-Type-Options", "nosniff")
    w.Header().Set("X-Frame-Options", "DENY")
    w.Header().Set("X-XSS-Protection", "1; mode=block")
    w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'")
    next.ServeHTTP(w, r)
  })
}
```

### 2.5 Database Access Layer: sqlc

**Decision: sqlc (Type-Safe SQL in Go)**

sqlc generates Go code from SQL queries. No ORM magic, pure SQL performance.

```bash
# Schema
# migrations/001_create_users.up.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

# Queries
# internal/platform/db/queries.sql
-- name: CreateUser :one
INSERT INTO users (email, password_hash)
VALUES ($1, $2)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: ListUsers :many
SELECT * FROM users WHERE created_at > $1 ORDER BY created_at DESC LIMIT $2;

-- name: UpdateUser :one
UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;
```

```bash
# sqlc.yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "internal/platform/db/queries.sql"
    schema: "migrations"
    gen:
      go:
        package: "db"
        out: "internal/platform/db/generated"
```

```go
// Generated code: internal/platform/db/generated/queries.sql.go
type CreateUserParams struct {
  Email        string
  PasswordHash string
}

type User struct {
  ID           uuid.UUID
  Email        string
  PasswordHash string
  CreatedAt    time.Time
  UpdatedAt    time.Time
}

type Queries struct {
  db *sql.DB
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (*User, error) {
  row := q.db.QueryRowContext(ctx, createUserSQL, arg.Email, arg.PasswordHash)
  var user User
  err := row.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt)
  if err != nil {
    return nil, err
  }
  return &user, nil
}
```

```go
// Usage in repository
// internal/users/repository.go
type UserRepository struct {
  queries *db.Queries
}

func (r *UserRepository) Create(ctx context.Context, user *User) (*User, error) {
  dbUser, err := r.queries.CreateUser(ctx, db.CreateUserParams{
    Email:        user.Email,
    PasswordHash: user.PasswordHash,
  })
  if err != nil {
    return nil, err
  }
  return dbUserToModel(dbUser), nil
}
```

**Why sqlc?**
- Type-safe: Compile-time checking of SQL correctness
- No ORM overhead: Direct control over queries
- Fast: Minimal abstraction layers
- Explicit: SQL is visible and auditable
- Handles migrations: golang-migrate is the standard

### 2.6 Configuration Management: Viper

```go
// config.go
package main

import "github.com/spf13/viper"

type Config struct {
  Server   ServerConfig
  Database DatabaseConfig
  Redis    RedisConfig
  Storage  StorageConfig
  AI       AIConfig
  JWT      JWTConfig
  Features FeatureFlags
}

type ServerConfig struct {
  Port    int
  Env     string // "development", "staging", "production"
  BaseURL string
}

type DatabaseConfig struct {
  Host     string
  Port     int
  User     string
  Password string
  Database string
  SSLMode  string
  MaxConns int
  MinConns int
}

// Load configuration from environment + config file
func LoadConfig(path string) (*Config, error) {
  v := viper.New()
  v.SetConfigFile(path)

  // Environment variable overrides
  v.BindEnv("database.host", "DB_HOST")
  v.BindEnv("database.port", "DB_PORT")
  v.BindEnv("jwt.secret", "JWT_SECRET")
  v.BindEnv("ai.openai_key", "OPENAI_API_KEY")

  // Defaults
  v.SetDefault("server.port", 8080)
  v.SetDefault("server.env", "development")
  v.SetDefault("database.max_conns", 25)

  if err := v.ReadInConfig(); err != nil {
    return nil, err
  }

  var cfg Config
  if err := v.Unmarshal(&cfg); err != nil {
    return nil, err
  }

  return &cfg, nil
}
```

```yaml
# config.yaml
server:
  port: 8080
  env: development
  base_url: "http://localhost:8080"

database:
  host: localhost
  port: 5432
  user: postgres
  password: ${DB_PASSWORD}
  database: ordo_dev
  ssl_mode: disable
  max_conns: 25

redis:
  host: localhost
  port: 6379
  db: 0

storage:
  provider: s3
  bucket: ordo-media-dev
  region: us-east-1

ai:
  primary: openai
  fallback: anthropic
  openai_key: ${OPENAI_API_KEY}
  anthropic_key: ${ANTHROPIC_API_KEY}

jwt:
  secret: ${JWT_SECRET}
  expiry: 15m
  refresh_expiry: 7d
```

### 2.7 Dependency Injection Pattern

```go
// di.go
package main

type Services struct {
  AuthService         *auth.Service
  UserService         *users.Service
  WorkspaceService    *workspaces.Service
  IdeaService         *ideas.Service
  PipelineService     *pipeline.Service
  ContentService      *content.Service
  SeriesService       *series.Service
  PublishingService   *publishing.Service
  AnalyticsService    *analytics.Service
  AIService           *ai.Service
  MediaService        *media.Service
  GamificationService *gamification.Service
  NotificationService *notifications.Service
  SponsorshipService  *sponsorships.Service
  IntegrationService  *integrations.Service
  RealtimeService     *realtime.Service
}

func BuildServices(
  db *sql.DB,
  redis *redis.Client,
  s3Client *s3.Client,
  cfg *Config,
) *Services {
  // Initialize platform layer
  queries := db_generated.New(db)
  logger := logging.NewLogger(cfg.Server.Env)
  eventBus := events.NewEventBus(redis)

  // Build repositories
  userRepo := users.NewRepository(queries)
  ideaRepo := ideas.NewRepository(queries)
  pipelineRepo := pipeline.NewRepository(queries)

  // Build services with dependencies
  authService := auth.NewService(userRepo, cfg.JWT, logger)
  ideaService := ideas.NewService(ideaRepo, eventBus, logger)
  aiGateway := ai.NewGateway(cfg.AI, logger)
  mediaService := media.NewService(s3Client, cfg.Storage, logger)

  return &Services{
    AuthService:      authService,
    UserService:      users.NewService(userRepo, logger),
    IdeaService:      ideaService,
    PipelineService:  pipeline.NewService(pipelineRepo, eventBus, logger),
    AIService:        ai.NewService(aiGateway, logger),
    MediaService:     mediaService,
    // ... all others
  }
}
```

```go
// main.go
func main() {
  cfg, err := LoadConfig("config.yaml")
  if err != nil {
    log.Fatal(err)
  }

  db := connectDatabase(cfg.Database)
  redis := connectRedis(cfg.Redis)
  s3Client := connectS3(cfg.Storage)

  services := BuildServices(db, redis, s3Client, cfg)

  router := setupRouter(services)

  log.Printf("Server listening on :%d\n", cfg.Server.Port)
  log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", cfg.Server.Port), router))
}
```

---

## 3. Database Design

### 3.1 Core Tables and Schema

**Multi-Tenancy Strategy:**
Every table has `workspace_id` (except system tables). This is both a foreign key and part of the partition key. Queries always filter by workspace_id.

```sql
-- Users (system-wide, no workspace_id)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- Workspaces (owned by users)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  tier VARCHAR(20) NOT NULL DEFAULT 'FREE', -- FREE, PRO, ENTERPRISE
  settings JSONB DEFAULT '{}', -- Brand colors, voice, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);
CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_deleted_at ON workspaces(deleted_at);

-- Workspace Members (RBAC)
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL, -- OWNER, ADMIN, EDITOR, VIEWER
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- Ideas (raw creative sparks)
CREATE TABLE ideas (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  created_by_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL, -- ACTIVE, VALIDATED, PROMOTED, GRAVEYARDED
  effort_score INT, -- Effort vs Impact matrix
  impact_score INT,
  quality_score FLOAT, -- AI-generated validation score
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  promoted_at TIMESTAMP,
  graveyarded_at TIMESTAMP
);
CREATE INDEX idx_ideas_workspace_id ON ideas(workspace_id);
CREATE INDEX idx_ideas_created_by_id ON ideas(created_by_id);
CREATE INDEX idx_ideas_status ON ideas(workspace_id, status);
CREATE INDEX idx_ideas_created_at ON ideas(workspace_id, created_at DESC);

-- Idea Tags
CREATE TABLE idea_tags (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  idea_id UUID NOT NULL REFERENCES ideas(id),
  tag VARCHAR(100) NOT NULL,
  color VARCHAR(20), -- UI color for tag
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(idea_id, tag)
);
CREATE INDEX idx_idea_tags_workspace_id ON idea_tags(workspace_id);
CREATE INDEX idx_idea_tags_idea_id ON idea_tags(idea_id);

-- Series (episodic content groups)
CREATE TABLE series (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  created_by_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  publish_schedule VARCHAR(50), -- DAILY, WEEKLY, BI_WEEKLY, MONTHLY
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_series_workspace_id ON series(workspace_id);
CREATE INDEX idx_series_created_by_id ON series(created_by_id);

-- Pipeline Items (content pieces in workflow)
CREATE TABLE pipeline_items (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  created_by_id UUID NOT NULL REFERENCES users(id),
  series_id UUID REFERENCES series(id),
  idea_id UUID REFERENCES ideas(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content_type VARCHAR(50) NOT NULL, -- VIDEO, TWEET, POST, NEWSLETTER, PODCAST
  status VARCHAR(50) NOT NULL, -- SCRIPTING, FILMING, EDITING, REVIEW, SCHEDULED, PUBLISHED
  priority INT DEFAULT 0,
  assigned_to_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP,
  deleted_at TIMESTAMP
);
CREATE INDEX idx_pipeline_items_workspace_id ON pipeline_items(workspace_id);
CREATE INDEX idx_pipeline_items_status ON pipeline_items(workspace_id, status);
CREATE INDEX idx_pipeline_items_assigned_to_id ON pipeline_items(assigned_to_id);
CREATE INDEX idx_pipeline_items_series_id ON pipeline_items(series_id);

-- Content Assets (versioning, scripts, files)
CREATE TABLE content_assets (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  pipeline_item_id UUID NOT NULL REFERENCES pipeline_items(id),
  asset_type VARCHAR(50) NOT NULL, -- SCRIPT, TRANSCRIPT, MEDIA, THUMBNAIL
  version INT NOT NULL DEFAULT 1,
  content TEXT,
  metadata JSONB, -- size, duration, format, etc.
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(pipeline_item_id, asset_type, version)
);
CREATE INDEX idx_content_assets_pipeline_item_id ON content_assets(pipeline_item_id);

-- Content Checklists
CREATE TABLE content_checklists (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  pipeline_item_id UUID NOT NULL REFERENCES pipeline_items(id),
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_content_checklists_pipeline_item_id ON content_checklists(pipeline_item_id);

-- Time Sessions (time tracking per piece)
CREATE TABLE time_sessions (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  pipeline_item_id UUID NOT NULL REFERENCES pipeline_items(id),
  user_id UUID NOT NULL REFERENCES users(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_time_sessions_pipeline_item_id ON time_sessions(pipeline_item_id);
CREATE INDEX idx_time_sessions_user_id ON time_sessions(user_id);

-- Social Posts (publishing to platforms)
CREATE TABLE social_posts (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  pipeline_item_id UUID REFERENCES pipeline_items(id),
  platform VARCHAR(50) NOT NULL, -- YOUTUBE, TIKTOK, INSTAGRAM, TWITTER, LINKEDIN
  platform_post_id VARCHAR(255), -- Platform's unique ID after publishing
  caption TEXT,
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  status VARCHAR(50) NOT NULL, -- DRAFT, SCHEDULED, PUBLISHED, FAILED
  metadata JSONB, -- hashtags, custom fields per platform
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_social_posts_workspace_id ON social_posts(workspace_id);
CREATE INDEX idx_social_posts_status ON social_posts(workspace_id, status);
CREATE INDEX idx_social_posts_published_at ON social_posts(workspace_id, published_at DESC);

-- Analytics Events (daily metrics)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  pipeline_item_id UUID REFERENCES pipeline_items(id),
  event_type VARCHAR(50) NOT NULL, -- VIEW, LIKE, COMMENT, SHARE, SUBSCRIBE
  platform VARCHAR(50), -- YOUTUBE, TIKTOK, etc.
  metric_value INT DEFAULT 1,
  event_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_analytics_events_workspace_id_date ON analytics_events(workspace_id, event_date DESC);
CREATE INDEX idx_analytics_events_pipeline_item_id ON analytics_events(pipeline_item_id);

-- Consistency Score (gamification)
CREATE TABLE consistency_scores (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  score INT NOT NULL DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_contribution_date DATE,
  calculation_date DATE NOT NULL,
  UNIQUE(workspace_id, user_id, calculation_date)
);
CREATE INDEX idx_consistency_scores_user_id ON consistency_scores(workspace_id, user_id);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_type VARCHAR(100) NOT NULL, -- FIRST_POST, 7_DAY_STREAK, 100_VIEWS, etc.
  unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id, achievement_type)
);
CREATE INDEX idx_achievements_user_id ON achievements(workspace_id, user_id);

-- Sponsorships (brand CRM)
CREATE TABLE sponsorships (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  brand_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_person VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- LEAD, NEGOTIATING, PAID, COMPLETED, DECLINED
  amount_usd DECIMAL(10, 2),
  deliverables TEXT,
  deadline DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sponsorships_workspace_id ON sponsorships(workspace_id);
CREATE INDEX idx_sponsorships_status ON sponsorships(workspace_id, status);

-- Integrations (OAuth connections)
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  provider VARCHAR(50) NOT NULL, -- YOUTUBE, TIKTOK, INSTAGRAM, TWITTER, etc.
  access_token VARCHAR(1000),
  refresh_token VARCHAR(1000),
  token_expires_at TIMESTAMP,
  metadata JSONB, -- channel_id, handle, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);
CREATE INDEX idx_integrations_workspace_id ON integrations(workspace_id);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  event_type VARCHAR(100) NOT NULL, -- idea.created, pipeline.moved, etc.
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_webhooks_workspace_id ON webhooks(workspace_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50), -- INFO, SUCCESS, WARNING, ERROR
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP
);
CREATE INDEX idx_notifications_user_id ON notifications(workspace_id, user_id, is_read);

-- Media Uploads
CREATE TABLE media_uploads (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(50),
  size_bytes BIGINT,
  s3_key VARCHAR(500) NOT NULL,
  processing_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, READY, FAILED
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_media_uploads_workspace_id ON media_uploads(workspace_id);
CREATE INDEX idx_media_uploads_created_at ON media_uploads(workspace_id, created_at DESC);

-- AI Credit Ledger (track usage)
CREATE TABLE ai_credits (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  credits_allocated INT NOT NULL,
  credits_used INT DEFAULT 0,
  credits_remaining INT NOT NULL,
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id, cycle_start_date)
);
CREATE INDEX idx_ai_credits_user_id ON ai_credits(workspace_id, user_id);

-- Audit Logs (compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- idea.created, pipeline.moved, user.deleted, etc.
  resource_type VARCHAR(50), -- idea, pipeline_item, workspace_member, etc.
  resource_id UUID,
  changes JSONB, -- before/after values
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(workspace_id, created_at DESC);
```

### 3.2 Indexes and Query Optimization

**Indexes by Access Pattern:**

| Table | Index | Why |
|-------|-------|-----|
| ideas | (workspace_id, status) | Filter ideas by workspace + status |
| ideas | (workspace_id, created_at DESC) | List ideas ordered by recency |
| pipeline_items | (workspace_id, status) | Kanban board filtering |
| pipeline_items | (assigned_to_id) | Show items assigned to user |
| social_posts | (workspace_id, published_at DESC) | List published posts by date |
| analytics_events | (workspace_id, event_date DESC) | Daily metrics |
| consistency_scores | (workspace_id, user_id, calculation_date) | Leaderboards, streaks |
| notifications | (workspace_id, user_id, is_read) | Notification inbox |

**Partitioning (Year 2):**
Once analytics_events grows large:
```sql
CREATE TABLE analytics_events_y2026 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### 3.3 Multi-Tenancy Strategy

**Isolation Model: Logical (Row-Level Security)**

```sql
-- Row-level security policy: Users can only see their workspace's data
CREATE POLICY workspace_isolation ON ideas
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = current_user_id
    UNION
    SELECT workspace_id FROM workspace_members WHERE user_id = current_user_id
  ));

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
```

**In Application:**
```go
// Every query enforces workspace_id
func (r *IdeaRepository) List(ctx context.Context, workspaceID string, filters IdeaFilters) ([]*Idea, error) {
  // Query always includes: WHERE workspace_id = $1
  rows, err := r.queries.ListIdeas(ctx, db.ListIdeasParams{
    WorkspaceID: workspaceID,
    Status:      filters.Status,
    Limit:       filters.Limit,
    Offset:      filters.Offset,
  })
  // ...
}
```

### 3.4 Migration Strategy: golang-migrate

```bash
# Create migration
migrate create -ext sql -dir migrations -seq create_users

# Run migrations (up)
migrate -path migrations -database postgres://... up

# Rollback (down)
migrate -path migrations -database postgres://... down 1
```

**Migration Safety:**
- All migrations are reversible (separate .up.sql and .down.sql)
- Migrations run in transactions
- Add columns as nullable before making them required (in later migration)

---

## 4. API Design

### 4.1 RESTful API with Versioning

**URL Pattern:** `/api/v1/{resource}/{id}/{action}`

```
GET    /api/v1/ideas                     # List ideas
POST   /api/v1/ideas                     # Create idea
GET    /api/v1/ideas/{id}                # Get idea
PUT    /api/v1/ideas/{id}                # Update idea
DELETE /api/v1/ideas/{id}                # Delete idea
POST   /api/v1/ideas/{id}/promote        # Promote to pipeline
POST   /api/v1/ideas/{id}/validate       # AI validation

GET    /api/v1/pipeline                  # Get board
POST   /api/v1/pipeline/move             # Move card
GET    /api/v1/pipeline/{id}             # Get card detail
```

### 4.2 Authentication: JWT + Refresh Tokens

```go
// Token structure
type Claims struct {
  UserID      string `json:"sub"`
  Email       string `json:"email"`
  WorkspaceID string `json:"workspace_id"` // Current active workspace
  Tier        string `json:"tier"`
  jwt.RegisteredClaims
}

// Issue tokens
func (s *AuthService) Login(ctx context.Context, email, password string) (*LoginResponse, error) {
  user, err := s.userRepo.GetByEmail(ctx, email)
  if err != nil {
    return nil, ErrInvalidCredentials
  }

  if !bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) {
    return nil, ErrInvalidCredentials
  }

  accessToken := s.issueAccessToken(user)
  refreshToken := s.issueRefreshToken(user)

  // Store refresh token in Redis with expiry
  s.redis.Set(ctx, fmt.Sprintf("refresh:%s", refreshToken), user.ID, 7*24*time.Hour)

  return &LoginResponse{
    AccessToken:  accessToken,  // 15m expiry
    RefreshToken: refreshToken, // 7d expiry
    ExpiresIn:    900,
    TokenType:    "Bearer",
  }, nil
}

// Refresh access token
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*RefreshResponse, error) {
  userID, err := s.redis.Get(ctx, fmt.Sprintf("refresh:%s", refreshToken)).Result()
  if err != nil {
    return nil, ErrInvalidRefreshToken
  }

  user, err := s.userRepo.GetByID(ctx, userID)
  if err != nil {
    return nil, ErrInvalidRefreshToken
  }

  newAccessToken := s.issueAccessToken(user)

  return &RefreshResponse{
    AccessToken: newAccessToken,
    ExpiresIn:   900,
  }, nil
}
```

### 4.3 Authorization: RBAC

```go
// Workspace member roles
type Role string

const (
  RoleOwner  Role = "OWNER"
  RoleAdmin  Role = "ADMIN"
  RoleEditor Role = "EDITOR"
  RoleViewer Role = "VIEWER"
)

var permissions = map[Role][]string{
  RoleOwner: {"*"}, // All permissions
  RoleAdmin: {
    "workspace.read",
    "workspace.update",
    "members.manage",
    "content.create",
    "content.edit",
    "content.delete",
    "analytics.read",
  },
  RoleEditor: {
    "workspace.read",
    "content.create",
    "content.edit",
    "analytics.read",
  },
  RoleViewer: {
    "workspace.read",
    "analytics.read",
  },
}

// Middleware to enforce permissions
func requirePermission(permission string) func(http.Handler) http.Handler {
  return func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      user := r.Context().Value("user").(*User)
      workspaceID := r.URL.Query().Get("workspace_id") // or from route

      member, err := workspaceService.GetMember(r.Context(), workspaceID, user.ID)
      if err != nil {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
      }

      if !hasPermission(member.Role, permission) {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
      }

      next.ServeHTTP(w, r)
    })
  }
}

// Usage
r.With(requirePermission("content.create")).Post("/api/v1/ideas", handler)
```

### 4.4 Rate Limiting by Tier

```go
// Limits per minute
const (
  FreeTierLimit       = 100
  ProTierLimit        = 1000
  EnterpriseTierLimit = 5000
)

// Redis-backed sliding window
type RateLimiter struct {
  redis *redis.Client
}

func (rl *RateLimiter) Allow(ctx context.Context, userID string, limit int) bool {
  key := fmt.Sprintf("ratelimit:%s", userID)

  current, _ := rl.redis.Incr(ctx, key).Result()

  if current == 1 {
    rl.redis.Expire(ctx, key, 1*time.Minute)
  }

  return current <= int64(limit)
}
```

### 4.5 Pagination, Filtering, Sorting

```go
// Standard pagination
GET /api/v1/ideas?page=2&limit=20
GET /api/v1/ideas?cursor=eyJpZCI6IjEyMyJ9&limit=20 # Cursor-based

// Filtering
GET /api/v1/ideas?status=ACTIVE&created_after=2026-01-01

// Sorting
GET /api/v1/ideas?sort=-created_at,title
// - = descending, no prefix = ascending

// Response structure
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 153,
    "pages": 8
  },
  "links": {
    "self": "/api/v1/ideas?page=2&limit=20",
    "first": "/api/v1/ideas?page=1&limit=20",
    "prev": "/api/v1/ideas?page=1&limit=20",
    "next": "/api/v1/ideas?page=3&limit=20",
    "last": "/api/v1/ideas?page=8&limit=20"
  }
}
```

### 4.6 WebSocket Real-Time

```go
// Upgrade to WebSocket
func (h *WebSocketHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
  conn, err := upgrader.Upgrade(w, r, nil)
  if err != nil {
    return
  }
  defer conn.Close()

  user := r.Context().Value("user").(*User)
  client := &Client{
    ID:        user.ID,
    Conn:      conn,
    Workspace: r.URL.Query().Get("workspace"),
  }

  h.hub.Register(client)
  defer h.hub.Unregister(client)

  for {
    var msg Message
    err := conn.ReadJSON(&msg)
    if err != nil {
      return
    }

    switch msg.Type {
    case "pipeline.move":
      h.handlePipelineMove(user.ID, client.Workspace, msg)
    case "presence.update":
      h.hub.Broadcast(client.Workspace, Message{
        Type: "presence",
        Data: map[string]interface{}{
          "user_id": user.ID,
          "page": msg.Data["page"],
        },
      })
    }
  }
}

// Hub manages connections
type Hub struct {
  clients map[string]*Client
  mu      sync.RWMutex
}

func (h *Hub) Broadcast(workspace string, msg Message) {
  h.mu.RLock()
  defer h.mu.RUnlock()

  for _, client := range h.clients {
    if client.Workspace == workspace {
      client.Conn.WriteJSON(msg)
    }
  }
}
```

**WebSocket Channels:**
- `pipeline.move` — Drag-drop updates in real-time
- `ai.response` — Streaming AI responses
- `notifications` — Incoming alerts
- `presence` — Who's viewing what
- `updates` — Content changes

### 4.7 OpenAPI/Swagger Documentation

```go
// Swagger annotations
// @Summary      List ideas
// @Description  Get all ideas in workspace with filters
// @Tags         ideas
// @Accept       json
// @Produce      json
// @Param        status query string false "Filter by status"
// @Param        page   query int    false "Page number" default(1)
// @Success      200 {object} IdeaListResponse
// @Failure      401 {object} ErrorResponse
// @Router       /ideas [get]
func (h *IdeaHandlers) List(w http.ResponseWriter, r *http.Request) {
  // ...
}

// Generate OpenAPI spec
// go install github.com/swaggo/swag/cmd/swag@latest
// swag init -g cmd/server/main.go
```

---

## 5. AI Integration Layer

### 5.1 AI Gateway Architecture

The AI Gateway is a dedicated Go service (extracted to microservice in Year 2) that handles all AI interactions.

```go
// internal/ai/gateway.go
type Gateway struct {
  openaiClient   *openai.Client
  anthropicClient *anthropic.Client
  config         *AIConfig
  circuitBreaker *CircuitBreaker
  cache          *Cache
  logger         Logger
}

func (g *Gateway) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
  // Check cache first
  if cached, ok := g.cache.Get(req.Hash()); ok {
    return cached, nil
  }

  // Circuit breaker pattern
  if !g.circuitBreaker.Allow() {
    return nil, ErrCircuitBreakerOpen
  }

  // Try primary (OpenAI)
  resp, err := g.openaiClient.CreateChatCompletion(ctx, req.toOpenAIReq())
  if err == nil {
    g.cache.Set(req.Hash(), resp, 24*time.Hour)
    g.circuitBreaker.RecordSuccess()
    return resp, nil
  }

  g.logger.Warn("OpenAI failed, trying fallback", map[string]interface{}{
    "error": err.Error(),
  })

  // Try fallback (Anthropic)
  resp, err = g.anthropicClient.CreateMessage(ctx, req.toAnthropicReq())
  if err != nil {
    g.circuitBreaker.RecordFailure()
    return nil, err
  }

  g.cache.Set(req.Hash(), resp, 24*time.Hour)
  g.circuitBreaker.RecordSuccess()
  return resp, nil
}

// Circuit breaker
type CircuitBreaker struct {
  state          string // CLOSED, OPEN, HALF_OPEN
  failureCount   int
  failureThresh  int
  successThresh  int
  lastFailTime   time.Time
  openDuration   time.Duration
  mu             sync.RWMutex
}

func (cb *CircuitBreaker) Allow() bool {
  cb.mu.RLock()
  defer cb.mu.RUnlock()

  if cb.state == "CLOSED" {
    return true
  }

  if cb.state == "OPEN" {
    if time.Since(cb.lastFailTime) > cb.openDuration {
      cb.state = "HALF_OPEN"
      return true
    }
    return false
  }

  // HALF_OPEN: allow one request
  return true
}

func (cb *CircuitBreaker) RecordSuccess() {
  cb.mu.Lock()
  defer cb.mu.Unlock()

  if cb.state == "HALF_OPEN" {
    cb.state = "CLOSED"
    cb.failureCount = 0
  }
}

func (cb *CircuitBreaker) RecordFailure() {
  cb.mu.Lock()
  defer cb.mu.Unlock()

  cb.failureCount++
  cb.lastFailTime = time.Now()

  if cb.failureCount >= cb.failureThresh {
    cb.state = "OPEN"
  }
}
```

### 5.2 AI Models & Use Cases

| Use Case | Primary | Fallback | Model Type | Example |
|----------|---------|----------|------------|---------|
| Text generation (scripts, titles) | OpenAI GPT-4 | Anthropic Claude 3 | Chat completion | "Turn this outline into a script" |
| Idea brainstorming | OpenAI GPT-4 | Gemini 2.0 | Chat completion | "5 angles for a video about React" |
| Transcription | Whisper | Google Speech-to-Text | Audio-to-text | Convert podcast audio to transcript |
| Image generation | DALL-E 3 | Midjourney | Image generation | Generate thumbnail concepts |
| Content analysis | OpenAI GPT-4 | Claude 3 | Chat completion | "Analyze retention in this script" |

### 5.3 Credit System

```go
// internal/ai/credits.go
type CreditManager struct {
  repo repository.AICreditRepository
  redis *redis.Client
}

const (
  CostTextGeneration = 10
  CostTranscription  = 50
  CostImageGen       = 100
)

func (m *CreditManager) Deduct(ctx context.Context, workspaceID, userID string, cost int) error {
  // Check current credits
  credits, err := m.GetBalance(ctx, workspaceID, userID)
  if err != nil {
    return err
  }

  if credits.CreditsRemaining < cost {
    return ErrInsufficientCredits
  }

  // Deduct from cache (Redis) for speed
  m.redis.IncrBy(ctx, fmt.Sprintf("credits:%s:%s", workspaceID, userID), -cost)

  // Sync to DB every hour (batch writes)
  m.scheduleSync(workspaceID, userID)

  return nil
}

func (m *CreditManager) Refund(ctx context.Context, workspaceID, userID string, cost int) error {
  m.redis.IncrBy(ctx, fmt.Sprintf("credits:%s:%s", workspaceID, userID), cost)
  return nil
}
```

### 5.4 Queue-Based Processing

For long-running AI tasks:

```go
// internal/ai/queue.go
type Task struct {
  ID          string
  Type        string // TRANSCRIBE, ANALYZE_VIDEO, GENERATE_REPURPOSING
  WorkspaceID string
  UserID      string
  Input       map[string]interface{}
  Status      string // PENDING, PROCESSING, COMPLETED, FAILED
  Result      map[string]interface{}
  CreatedAt   time.Time
}

// Enqueue task
func (m *TaskManager) Enqueue(ctx context.Context, task *Task) error {
  // Save to DB
  err := m.repo.Create(ctx, task)
  if err != nil {
    return err
  }

  // Publish to Redis Queue
  return m.redis.LPush(ctx, "ai_tasks:queue", task.ID).Err()
}

// Worker loop
func (m *TaskManager) StartWorker(ctx context.Context, concurrency int) {
  for i := 0; i < concurrency; i++ {
    go m.processQueue(ctx)
  }
}

func (m *TaskManager) processQueue(ctx context.Context) {
  for {
    taskID, err := m.redis.BRPop(ctx, 0, "ai_tasks:queue").Result()
    if err != nil {
      continue
    }

    task, err := m.repo.GetByID(ctx, taskID)
    if err != nil {
      continue
    }

    m.repo.UpdateStatus(ctx, taskID, "PROCESSING")

    result, err := m.execute(ctx, task)
    if err != nil {
      m.repo.UpdateStatus(ctx, taskID, "FAILED")
      continue
    }

    m.repo.UpdateResult(ctx, taskID, "COMPLETED", result)

    // Notify user via WebSocket
    m.notificationService.Notify(ctx, task.UserID, map[string]interface{}{
      "type": "ai_task_completed",
      "task_id": taskID,
    })
  }
}
```

---

## 6. Media Processing Pipeline

### 6.1 Upload Flow

```
Client                    Backend                S3
   │                        │                     │
   ├─ Request presigned ─────>                    │
   │   URL                   │                    │
   │                  <─ presigned URL ─────────  │
   │                         │                    │
   ├─────────── Direct upload to S3 ────────────>│
   │                         │                    │
   │                  <──── 200 OK ───────────────│
   │                         │                    │
   ├─ Notify upload ──────────>                   │
   │   complete              │                    │
   │                  Queue → FFmpeg worker       │
   │                         │                    │
   │              Process (transcode, thumbnails) │
   │                         │                    │
   │              <── Notify via WebSocket ────   │
   │         (processing 50%, 100% complete)      │
   │                         │                    │
   └─ Fetch media URL ─────>─┐                    │
                         URL to CDN/S3
```

```go
// internal/media/service.go
type Service struct {
  s3Client     *s3.Client
  taskManager  *TaskManager
  repository   Repository
}

func (s *Service) GeneratePresignedURL(ctx context.Context, workspaceID, filename string) (string, error) {
  // Generate a unique S3 key
  s3Key := fmt.Sprintf("%s/%s", workspaceID, uuid.New().String())

  // Create presigned PUT URL (15 min validity)
  presigner := s3.NewPresignerFromClient(s.s3Client)

  putObjectInput := &s3.PutObjectInput{
    Bucket: aws.String("ordo-media"),
    Key:    aws.String(s3Key),
  }

  presignedURL, err := presigner.PresignPutObject(ctx, putObjectInput,
    func(opts *s3.PresignOptions) {
      opts.Expires = time.Duration(15 * time.Minute)
    })

  if err != nil {
    return "", err
  }

  return presignedURL.URL, nil
}

func (s *Service) OnUploadComplete(ctx context.Context, workspaceID, s3Key, mimeType string) error {
  // Create media record
  media := &Media{
    ID:           uuid.New().String(),
    WorkspaceID:  workspaceID,
    S3Key:        s3Key,
    MimeType:     mimeType,
    ProcessingStatus: "PENDING",
  }

  err := s.repository.Create(ctx, media)
  if err != nil {
    return err
  }

  // Queue processing task
  task := &Task{
    ID:          media.ID,
    Type:        "PROCESS_MEDIA",
    WorkspaceID: workspaceID,
    Input: map[string]interface{}{
      "s3_key":    s3Key,
      "mime_type": mimeType,
    },
  }

  return s.taskManager.Enqueue(ctx, task)
}
```

### 6.2 Video Processing (FFmpeg)

```go
// internal/media/processor.go
type VideoProcessor struct {
  ffmpegPath string
  logger     Logger
}

func (p *VideoProcessor) Process(ctx context.Context, inputPath string) (*ProcessingResult, error) {
  // Generate multiple outputs
  outputs := []struct {
    name   string
    format string
    bitrate string
    scale  string
  }{
    // Full quality (HLS stream)
    {"1080p", "hls", "5000k", "1920:1080"},
    // Mobile quality
    {"360p", "hls", "1000k", "640:360"},
    // Thumbnail
    {"thumbnail", "png", "", "640:360"},
  }

  results := &ProcessingResult{}

  for _, output := range outputs {
    outputPath := filepath.Join(filepath.Dir(inputPath), output.name)

    cmd := exec.CommandContext(ctx, p.ffmpegPath,
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-b:v", output.bitrate,
      "-vf", fmt.Sprintf("scale=%s", output.scale),
      "-c:a", "aac",
      "-b:a", "128k",
      outputPath,
    )

    if err := cmd.Run(); err != nil {
      return nil, err
    }

    // Upload to S3
    s3Key := fmt.Sprintf("%s/%s.%s", filepath.Base(inputPath), output.name, output.format)
    results.Files = append(results.Files, map[string]interface{}{
      "type": output.name,
      "s3_key": s3Key,
    })
  }

  return results, nil
}
```

### 6.3 Image Processing

```go
// internal/media/image_processor.go
// Use github.com/kolesa-team/go-webp for WebP encoding

func (p *ImageProcessor) Optimize(ctx context.Context, inputPath string) (string, error) {
  img, err := imaging.Open(inputPath)
  if err != nil {
    return "", err
  }

  // Resize to common sizes
  thumb := imaging.Resize(img, 640, 360, imaging.Lanczos)

  // Encode as WebP
  outPath := strings.TrimSuffix(inputPath, filepath.Ext(inputPath)) + ".webp"
  err = webp.Encode(outPath, thumb, 85)
  if err != nil {
    return "", err
  }

  return outPath, nil
}
```

### 6.4 CDN Integration

```go
// Serve via Cloudflare CDN
// S3 bucket + Cloudflare Cache Rules

const CDNBase = "https://cdn.ordo.app"

func (s *Service) GetMediaURL(s3Key string) string {
  return fmt.Sprintf("%s/%s", CDNBase, s3Key)
}

// Cache: 7 days for processed media, 1 hour for originals
```

---

## 7. Publishing & Integration Layer

### 7.1 Social Platform OAuth

```go
// internal/integrations/oauth.go
type OAuthManager struct {
  providers map[string]Provider
  repo      repository.IntegrationRepository
}

type Provider interface {
  GetAuthURL(state string) string
  ExchangeCode(ctx context.Context, code string) (*TokenResponse, error)
  Publish(ctx context.Context, token string, content *PublishRequest) (*PublishResponse, error)
  FetchAnalytics(ctx context.Context, token string, postID string) (*Analytics, error)
}

// YouTube OAuth
type YouTubeProvider struct {
  clientID     string
  clientSecret string
  redirectURL  string
}

func (p *YouTubeProvider) GetAuthURL(state string) string {
  return fmt.Sprintf(
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s",
    p.clientID, p.redirectURL, "youtube", state,
  )
}

func (p *YouTubeProvider) ExchangeCode(ctx context.Context, code string) (*TokenResponse, error) {
  req, _ := http.NewRequest("POST", "https://oauth2.googleapis.com/token", nil)
  q := req.URL.Query()
  q.Add("client_id", p.clientID)
  q.Add("client_secret", p.clientSecret)
  q.Add("code", code)
  q.Add("grant_type", "authorization_code")
  q.Add("redirect_uri", p.redirectURL)
  req.URL.RawQuery = q.Encode()

  resp, err := http.DefaultClient.Do(req)
  if err != nil {
    return nil, err
  }
  defer resp.Body.Close()

  var tokenResp TokenResponse
  json.NewDecoder(resp.Body).Decode(&tokenResp)
  return &tokenResp, nil
}

func (p *YouTubeProvider) Publish(ctx context.Context, token string, content *PublishRequest) (*PublishResponse, error) {
  // Use youtube-go package to upload video
  service, err := youtube.New(getHTTPClient(token))
  if err != nil {
    return nil, err
  }

  upload := &youtube.Video{
    Snippet: &youtube.VideoSnippet{
      Title:       content.Title,
      Description: content.Description,
      Tags:        content.Tags,
    },
    Status: &youtube.VideoStatus{
      PrivacyStatus: content.Visibility, // "public", "unlisted", "private"
    },
  }

  call := service.Videos.Insert([]string{"snippet", "status"}, upload)

  // Open video file
  file, _ := os.Open(content.FilePath)
  defer file.Close()

  response, err := call.Media(ctx, file).Do()
  if err != nil {
    return nil, err
  }

  return &PublishResponse{
    PlatformPostID: response.Id,
    URL:            fmt.Sprintf("https://youtube.com/watch?v=%s", response.Id),
  }, nil
}
```

### 7.2 Publishing Queue with Retry Logic

```go
// internal/publishing/scheduler.go
type PublishingScheduler struct {
  repo      repository.PublishingRepository
  taskQueue TaskQueue
  logger    Logger
}

// Cron job: every 5 minutes, check for scheduled posts
func (ps *PublishingScheduler) CheckScheduledPosts(ctx context.Context) {
  posts, err := ps.repo.GetScheduledPosts(ctx, time.Now())
  if err != nil {
    ps.logger.Error("Failed to fetch scheduled posts", err)
    return
  }

  for _, post := range posts {
    task := &PublishTask{
      ID:       post.ID,
      Platform: post.Platform,
      Retry:    0,
      MaxRetry: 3,
    }
    ps.taskQueue.Enqueue(ctx, task)
  }
}

// Worker processes publish tasks
func (ps *PublishingScheduler) ProcessPublishTask(ctx context.Context, task *PublishTask) error {
  post, err := ps.repo.GetByID(ctx, task.ID)
  if err != nil {
    return err
  }

  // Get OAuth token
  integration, err := ps.integrationService.GetActive(ctx, post.WorkspaceID, task.Platform)
  if err != nil {
    return err
  }

  provider := ps.getProvider(task.Platform)

  response, err := provider.Publish(ctx, integration.AccessToken, &PublishRequest{
    Title:       post.Title,
    Caption:     post.Caption,
    FilePath:    post.MediaPath,
    Tags:        post.Metadata["tags"].([]string),
  })

  if err != nil {
    task.Retry++
    if task.Retry < task.MaxRetry {
      // Exponential backoff: 5s, 25s, 125s
      backoff := time.Duration(math.Pow(5, float64(task.Retry))) * time.Second
      ps.taskQueue.EnqueueWithDelay(ctx, task, backoff)
      return nil
    }
    // Max retries exceeded
    ps.repo.UpdateStatus(ctx, task.ID, "FAILED")
    return err
  }

  // Success
  ps.repo.UpdateStatus(ctx, task.ID, "PUBLISHED")
  ps.repo.SetPlatformPostID(ctx, task.ID, response.PlatformPostID)

  return nil
}
```

### 7.3 Webhook Receivers

```go
// Platform webhooks (YouTube, TikTok, Instagram) notify about analytics

// internal/integrations/webhooks.go
func (h *WebhookHandler) HandleYouTubeAnalytics(w http.ResponseWriter, r *http.Request) {
  // Verify webhook signature
  signature := r.Header.Get("X-Goog-IAM-Authority-Selector")
  // ... verify signature ...

  var event YouTubeWebhookEvent
  json.NewDecoder(r.Body).Decode(&event)

  // Record analytics
  analytics := &AnalyticsEvent{
    WorkspaceID: extractWorkspaceID(event),
    PlatformPostID: event.VideoID,
    Views:       event.ViewCount,
    Likes:       event.LikeCount,
    Comments:    event.CommentCount,
    EventDate:   event.Date,
  }

  h.analyticsService.RecordEvent(r.Context(), analytics)

  w.WriteHeader(http.StatusOK)
}
```

---

## 8. Real-Time Architecture

### 8.1 WebSocket Server

```go
// internal/realtime/hub.go
type Hub struct {
  clients    map[*Client]bool
  broadcast  chan Message
  register   chan *Client
  unregister chan *Client
  mu         sync.RWMutex
}

type Client struct {
  ID        string
  Workspace string
  Conn      *websocket.Conn
  Send      chan Message
}

type Message struct {
  Type      string                 `json:"type"`
  Workspace string                 `json:"workspace"`
  Data      map[string]interface{} `json:"data"`
  Timestamp time.Time              `json:"timestamp"`
}

func (h *Hub) Run(ctx context.Context) {
  for {
    select {
    case client := <-h.register:
      h.mu.Lock()
      h.clients[client] = true
      h.mu.Unlock()
      h.broadcastPresence(client.Workspace, "user_joined", client.ID)

    case client := <-h.unregister:
      h.mu.Lock()
      delete(h.clients, client)
      h.mu.Unlock()
      close(client.Send)
      h.broadcastPresence(client.Workspace, "user_left", client.ID)

    case message := <-h.broadcast:
      h.mu.RLock()
      for client := range h.clients {
        if client.Workspace == message.Workspace {
          select {
          case client.Send <- message:
          default:
            close(client.Send)
            delete(h.clients, client)
          }
        }
      }
      h.mu.RUnlock()
    }
  }
}

func (h *Hub) broadcastPresence(workspace, action, userID string) {
  h.broadcast <- Message{
    Type:      "presence",
    Workspace: workspace,
    Data: map[string]interface{}{
      "action":  action,
      "user_id": userID,
    },
    Timestamp: time.Now(),
  }
}
```

### 8.2 Redis Pub/Sub for Cross-Instance

```go
// For distributed deployments (multiple server instances)
// Use Redis Pub/Sub to sync WebSocket messages across instances

type RedisSubscriber struct {
  hub  *Hub
  redis *redis.Client
}

func (rs *RedisSubscriber) Subscribe(ctx context.Context) {
  pubsub := rs.redis.Subscribe(ctx, "ordo:messages")
  defer pubsub.Close()

  for msg := range pubsub.Channel() {
    var wsMsg Message
    json.Unmarshal([]byte(msg.Payload), &wsMsg)
    rs.hub.broadcast <- wsMsg
  }
}

// When a message arrives on instance A, broadcast to Redis
// All instances subscribed to the channel receive it
```

### 8.3 Real-Time Event Types

| Event | When | Data | Recipients |
|-------|------|------|------------|
| `pipeline.moved` | Card dragged in Kanban | {item_id, from_status, to_status} | Workspace members |
| `ai.response` | AI generation completes | {task_id, content} | Requesting user |
| `notification` | Event requires user attention | {type, message, action_url} | Specific user |
| `presence` | User joins/leaves | {user_id, action, page} | Workspace members |
| `content.updated` | Script/asset modified | {item_id, field, old_value, new_value} | Workspace members |

---

## 9. Observability

### 9.1 Structured Logging (Zerogivenlog)

```go
// internal/common/logging/logger.go
import "github.com/rs/zerolog"

func NewLogger(env string) zerolog.Logger {
  var logger zerolog.Logger
  if env == "production" {
    logger = zerolog.New(os.Stderr).With().Timestamp().Logger()
  } else {
    logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).
      With().Timestamp().Logger()
  }
  return logger
}

// Usage
logger.Info().
  Str("module", "ideas").
  Str("user_id", userID).
  Str("action", "create_idea").
  Err(err).
  Msg("idea creation successful")

// Output (production):
// {"level":"info","module":"ideas","user_id":"uuid","action":"create_idea","ts":"2026-03-10T12:34:56.789Z","message":"idea creation successful"}
```

### 9.2 Metrics (Prometheus)

```go
// internal/platform/metrics.go
import "github.com/prometheus/client_golang/prometheus"

var (
  httpRequestsTotal = prometheus.NewCounterVec(
    prometheus.CounterOpts{
      Name: "http_requests_total",
      Help: "Total HTTP requests",
    },
    []string{"method", "endpoint", "status"},
  )

  httpRequestDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
      Name:    "http_request_duration_seconds",
      Help:    "HTTP request latency",
      Buckets: []float64{.001, .01, .05, .1, .5, 1, 2, 5},
    },
    []string{"method", "endpoint"},
  )

  dbQueryDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
      Name:    "db_query_duration_seconds",
      Help:    "Database query latency",
      Buckets: []float64{.001, .005, .01, .05, .1, .5},
    },
    []string{"query_name"},
  )
)

// Middleware to record metrics
func metricsMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    wrapped := responseWriter{ResponseWriter: w}

    next.ServeHTTP(&wrapped, r)

    duration := time.Since(start).Seconds()
    endpoint := r.URL.Path
    status := strconv.Itoa(wrapped.statusCode)

    httpRequestsTotal.WithLabelValues(r.Method, endpoint, status).Inc()
    httpRequestDuration.WithLabelValues(r.Method, endpoint).Observe(duration)
  })
}

// Expose metrics endpoint
r.Handle("/metrics", promhttp.Handler())
```

### 9.3 Distributed Tracing (OpenTelemetry)

```go
// internal/platform/tracing/init.go
import (
  "go.opentelemetry.io/otel"
  "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
  "go.opentelemetry.io/otel/sdk/resource"
  "go.opentelemetry.io/otel/sdk/trace"
  semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func InitTracing(env string) func(context.Context) error {
  exporter, err := otlptracehttp.New(context.Background(),
    otlptracehttp.WithEndpoint("localhost:4318"),
  )
  if err != nil {
    log.Fatal(err)
  }

  resource, _ := resource.New(context.Background(),
    resource.WithAttributes(
      semconv.ServiceNameKey.String("ordo-api"),
      semconv.ServiceVersionKey.String("1.0.0"),
      semconv.DeploymentEnvironmentKey.String(env),
    ),
  )

  tp := trace.NewTracerProvider(
    trace.WithBatcher(exporter),
    trace.WithResource(resource),
  )

  otel.SetTracerProvider(tp)

  return tp.Shutdown
}

// Usage
tracer := otel.Tracer("ordo/ideas")
ctx, span := tracer.Start(r.Context(), "create_idea")
defer span.End()

span.SetAttributes(
  attribute.String("user_id", userID),
  attribute.String("idea_title", input.Title),
)
```

### 9.4 Error Tracking (Sentry)

```go
import "github.com/getsentry/sentry-go"

func init() {
  sentry.Init(sentry.ClientOptions{
    Dsn:             os.Getenv("SENTRY_DSN"),
    Environment:     os.Getenv("ENVIRONMENT"),
    TracesSampleRate: 0.1,
  })
}

// Capture errors
if err != nil {
  sentry.CaptureException(err)
}

// Capture messages
sentry.CaptureMessage("Something important happened",
  sentry.LevelInfo,
)
```

### 9.5 Health Checks

```go
// Health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(http.StatusOK)
  json.NewEncoder(w).Encode(map[string]string{
    "status": "healthy",
    "time":   time.Now().RFC3339,
  })
}

// Readiness check (dependencies available)
func readinessHandler(w http.ResponseWriter, r *http.Request) {
  ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
  defer cancel()

  checks := []struct {
    name  string
    check func(context.Context) bool
  }{
    {"database", func(ctx context.Context) bool {
      return db.PingContext(ctx) == nil
    }},
    {"redis", func(ctx context.Context) bool {
      return redis.Ping(ctx).Err() == nil
    }},
    {"ai_gateway", func(ctx context.Context) bool {
      return aiGateway.Health(ctx) == nil
    }},
  }

  ready := true
  statuses := make(map[string]bool)

  for _, check := range checks {
    statuses[check.name] = check.check(ctx)
    if !statuses[check.name] {
      ready = false
    }
  }

  status := http.StatusOK
  if !ready {
    status = http.StatusServiceUnavailable
  }

  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(status)
  json.NewEncoder(w).Encode(statuses)
}
```

---

## 10. Infrastructure

### 10.1 Docker & Containerization

```dockerfile
# Dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates ffmpeg
WORKDIR /root/
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/ordo
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./config.yaml:/root/config.yaml

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ordo
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 10.2 Kubernetes Deployment

```yaml
# k8s/deployment.yaml
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
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ordo-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ordo-secrets
              key: openai-key
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: ordo-api
spec:
  selector:
    app: ordo-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

### 10.3 CI/CD: GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
      redis:
        image: redis:7

    steps:
    - uses: actions/checkout@v3

    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: 1.22

    - name: Run tests
      run: go test ./...

    - name: Run linter
      run: golangci-lint run

    - name: Build image
      run: docker build -t ordo-api:${{ github.sha }} .

    - name: Push to registry
      run: docker push ordo-api:${{ github.sha }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/ordo-api \
          api=ordo-api:${{ github.sha }} \
          --record
```

---

## 11. Security

### 11.1 OWASP Top 10 Mitigations

| Risk | Mitigation |
|------|-----------|
| **A01: Injection** | Use parameterized queries (sqlc), input validation, output encoding |
| **A02: Broken Auth** | JWT with secure refresh tokens, HTTPS only, SameSite cookies |
| **A03: Broken Access Control** | RBAC middleware, resource ownership verification, audit logs |
| **A04: Insecure Design** | Threat modeling, secure defaults, principle of least privilege |
| **A05: Security Misconfiguration** | Environment-based config, no secrets in code, security headers |
| **A06: Vulnerable Components** | Dependency scanning (Dependabot), automated updates |
| **A07: Auth Failure** | Rate limiting, account lockout, strong password requirements |
| **A08: Soft Data Integrity Failure** | Signed JWTs, HTTPS, HSTS headers |
| **A09: Logging/Monitoring Failure** | Structured logging, anomaly detection, security monitoring |
| **A10: SSRF** | URL validation, blocklist internal IPs, disable redirects |

### 11.2 Input Validation & Sanitization

```go
// Use zod-equivalent validation in Go: github.com/go-playground/validator

type CreateIdeaInput struct {
  Title       string `validate:"required,max=500"`
  Description string `validate:"max=5000"`
  Tags        []string `validate:"max=10,dive,max=50"`
}

func (h *IdeaHandlers) Create(w http.ResponseWriter, r *http.Request) {
  var input CreateIdeaInput
  json.NewDecoder(r.Body).Decode(&input)

  if err := validator.Validate(input); err != nil {
    w.WriteHeader(http.StatusUnprocessableEntity)
    json.NewEncoder(w).Encode(ValidationErrorResponse{
      Errors: formatValidationErrors(err),
    })
    return
  }

  // Safe to use input
}
```

### 11.3 CORS Configuration

```go
func corsMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    allowedOrigins := []string{
      "https://ordo.app",
      "https://app.ordo.app",
      "https://studio.ordo.app",
    }

    origin := r.Header.Get("Origin")
    for _, allowed := range allowedOrigins {
      if origin == allowed {
        w.Header().Set("Access-Control-Allow-Origin", origin)
        break
      }
    }

    w.Header().Set("Access-Control-Allow-Credentials", "true")
    w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
    w.Header().Set("Access-Control-Max-Age", "3600")

    if r.Method == "OPTIONS" {
      w.WriteHeader(http.StatusOK)
      return
    }

    next.ServeHTTP(w, r)
  })
}
```

### 11.4 Secrets Management

```go
// Use AWS Secrets Manager or HashiCorp Vault

import "github.com/aws/aws-sdk-go-v2/service/secretsmanager"

func loadSecrets(ctx context.Context) (*Secrets, error) {
  client := secretsmanager.NewFromConfig(cfg)

  result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
    SecretId: aws.String("ordo/prod/secrets"),
  })
  if err != nil {
    return nil, err
  }

  var secrets Secrets
  json.Unmarshal([]byte(*result.SecretString), &secrets)
  return &secrets, nil
}

// Never log secrets
logger.Debug().Str("secret", "***").Msg("secret loaded")
```

### 11.5 GDPR Compliance

```go
// User data export
func (s *UserService) ExportData(ctx context.Context, userID string) (*DataExport, error) {
  user, _ := s.repo.GetByID(ctx, userID)
  ideas, _ := s.ideaRepo.ListByUser(ctx, userID)
  pipeline, _ := s.pipelineRepo.ListByUser(ctx, userID)
  analytics, _ := s.analyticsRepo.ListByUser(ctx, userID)

  export := &DataExport{
    User:      user,
    Ideas:     ideas,
    Pipeline:  pipeline,
    Analytics: analytics,
  }

  // Return as downloadable JSON
  return export, nil
}

// User deletion (soft delete + anonymization)
func (s *UserService) Delete(ctx context.Context, userID string) error {
  // Mark as deleted
  s.repo.UpdateDeleted(ctx, userID, time.Now())

  // Anonymize personal data
  s.repo.UpdateEmail(ctx, userID, fmt.Sprintf("deleted_%s", uuid.New()))
  s.repo.UpdatePasswordHash(ctx, userID, "")

  // Optionally delete associated data
  s.ideaRepo.DeleteByUser(ctx, userID)

  return nil
}
```

---

## 12. Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| API p50 latency | < 50ms | Index optimization, caching, query optimization |
| API p99 latency | < 200ms | Connection pooling, batch queries, async processing |
| WebSocket latency | < 100ms | Direct Redis Pub/Sub, optimized message serialization |
| Media upload | 5GB support | Chunked uploads, presigned URLs, progress tracking |
| Concurrent users (Y1) | 10K | Load testing, horizontal scaling via K8s |
| Concurrent users (Y2) | 100K | Database read replicas, caching layer tuning |
| Dashboard load | < 1s | Optimized aggregation queries, materialized views |

### 12.1 Caching Strategy

```go
// Layer 1: Redis (distributed cache)
// - User sessions: 24h TTL
// - Workspace metadata: 1h TTL
// - Analytics aggregates: 15m TTL
// - AI response cache: 24h TTL

// Layer 2: In-process (go-cache / memory)
// - Enum lookups (roles, statuses)
// - Configuration (feature flags)

type CacheManager struct {
  redis     *redis.Client
  local     *cache.Cache
}

func (cm *CacheManager) GetIdea(ctx context.Context, id string) (*Idea, error) {
  // Try local cache first
  if cached, found := cm.local.Get(fmt.Sprintf("idea:%s", id)); found {
    return cached.(*Idea), nil
  }

  // Try Redis
  idea, err := cm.redis.Get(ctx, fmt.Sprintf("idea:%s", id)).Result()
  if err == nil {
    cm.local.Set(fmt.Sprintf("idea:%s", id), idea, 5*time.Minute)
    return idea, nil
  }

  // Hit database
  idea, err = cm.repo.GetByID(ctx, id)
  if err != nil {
    return nil, err
  }

  // Populate caches
  cm.redis.Set(ctx, fmt.Sprintf("idea:%s", id), idea, 1*time.Hour)
  cm.local.Set(fmt.Sprintf("idea:%s", id), idea, 5*time.Minute)

  return idea, nil
}
```

### 12.2 Database Read Replicas

```yaml
# Kubernetes StatefulSet for PostgreSQL with replicas
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: ordo-db
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised

  postgresql:
    parameters:
      shared_buffers: "256MB"
      max_connections: "200"

  monitoring:
    enabled: true
    prometheusRule:
      enabled: true
```

```go
// Query analytics from replica
type ReadPool struct {
  primary   *sql.DB
  replicas  []*sql.DB
  roundRobin int
}

func (rp *ReadPool) GetAnalytics(ctx context.Context) (*Analytics, error) {
  // Route read to replica
  db := rp.replicas[rp.roundRobin%len(rp.replicas)]
  rp.roundRobin++

  rows, err := db.QueryContext(ctx, "SELECT * FROM analytics_events WHERE ...")
  // ...
  return analytics, nil
}
```

---

## Summary

This architecture provides:


## 13. Performance SLAs & Targets

### 13.1 API Response Latency

| Metric | Target | Achievement | SLA |
|--------|--------|-------------|-----|
| **p50 (median)** | < 50ms | Database queries, cache hits | 99.0% |
| **p95 (95th percentile)** | < 200ms | Most API calls, with occasional DB hits | 99.5% |
| **p99 (99th percentile)** | < 500ms | Worst-case scenarios, cold starts | 99.9% |

**Implementation**:
- Use local in-memory cache (2-5 min TTL) for frequently accessed data
- Redis layer for shared cache (1 hour TTL) across instances
- Connection pooling: `max_connections = 200` per instance
- Query optimization: Indexed lookups, batch queries, n+1 prevention

### 13.2 Page Load Performance

| Platform | Target | Measurement | Notes |
|----------|--------|-------------|-------|
| **Web (Next.js)** | < 2s | First Contentful Paint (FCP) | Mobile-first; optimize for 4G |
| **Mobile (React Native)** | < 1.5s | App startup to first screen | Exclude download time; includes cold start |
| **Desktop (Electron)** | < 1.0s | Window ready + first render | Offline-capable; cached data ready |

**Optimization**:
- Code splitting (route-based, component lazy-loading)
- Image optimization: WebP, AVIF, responsive sizes
- Gzip compression (85% reduction for text)
- Service Worker for offline caching
- Asset CDN (Cloudflare or AWS CloudFront)

### 13.3 AI Operations Latency

| Operation | p50 | p95 | p99 | Notes |
|-----------|-----|-----|-----|-------|
| **Idea Scoring** | 300ms | 800ms | 2s | Claude API call + local scoring |
| **Title Generation (5 variants)** | 600ms | 1.5s | 3s | Parallel requests, concatenate results |
| **Script Generation** | 1.2s | 2.5s | 5s | Longer prompt; ~500 tokens output |
| **Hashtag Generation** | 200ms | 500ms | 1s | Fast; <100 tokens |
| **Repurposing Engine (5-7 variants)** | 2s | 4s | 8s | Parallel processing; 2-5s is modal |
| **Performance Analytics** | 800ms | 1.5s | 3s | Includes aggregation from platforms |
| **Engagement Prediction** | 500ms | 1.2s | 2s | ML inference; cached models |
| **Best Time to Post** | 400ms | 900ms | 2s | Time series analysis; historical data |

**Strategy**:
- Use Claude as primary (faster); fallback to GPT if unavailable (+1-2s)
- Parallel processing: Generate all titles/variants concurrently
- Caching: Store recent scores, titles, hashtags (1-day TTL)
- Async queues: Long operations (repurposing > 5s) dispatch to background workers
- Return immediate response to user; deliver results via WebSocket

### 13.4 Media Processing Performance

| Operation | Duration | Platform | Notes |
|-----------|----------|----------|-------|
| **Video transcoding** | 1 min video → 30s | Short-form (vertical 9:16) | HLS/DASH; adaptive bitrate |
| **Video transcoding** | 10 min video → 5 min | Full format (16:9) | One-pass encoding |
| **Image optimization** | 5MB JPEG → 200KB WebP | Cloudinary API | 95% size reduction |
| **Thumbnail generation** | 3 variations → 2-3s | DALL-E 3 API | Parallel requests |
| **Audio transcription** | 60 min audio → 5 min | Whisper API | Batch processing |

**Implementation**:
- Use cloud services (Cloudinary, Mux, AWS Elemental) for heavy lifting
- Async workers: Dispatch to job queue (Redis Queue or AWS SQS)
- Webhooks: Notify frontend when processing complete
- User max file size: 5GB video, 100MB audio, 50MB images
- Storage: S3 with lifecycle policies (archive after 30 days, delete after 1 year)

### 13.5 Database Performance

| Operation | Target | Strategy |
|-----------|--------|----------|
| **SELECT (indexed)** | < 10ms | B-tree indexes on frequently queried fields |
| **SELECT (full table scan)** | < 100ms | Only for analytics; use pagination |
| **INSERT (single row)** | < 5ms | No triggers; async audit log |
| **UPSERT (batch 100 rows)** | < 50ms | Use COPY or INSERT ... ON CONFLICT |
| **JOIN (2-3 tables)** | < 50ms | Denormalize if needed; avoid N+1 |
| **Aggregation (1M rows)** | < 500ms | Pre-aggregate; materialized views |

**Indexes**:
```sql
CREATE INDEX idx_ideas_user_id ON ideas(user_id, created_at DESC);
CREATE INDEX idx_pipeline_user_status ON content_pipeline(user_id, status);
CREATE INDEX idx_analytics_date ON daily_metrics(user_id, date DESC);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_at) WHERE status = 'scheduled';
```

**Monitoring**:
- Query performance logs: Enable `log_min_duration_statement = 100ms`
- pg_stat_statements: Track slow queries
- Connection pooling: PgBouncer with 200-connection limit per instance
- Replication lag: Keep < 100ms (stream replication)

### 13.6 Uptime & Availability

| Metric | Target | Definition |
|--------|--------|-----------|
| **API Uptime** | 99.9% | Excluding planned maintenance |
| **Web Platform Uptime** | 99.95% | CDN fallback if origin down |
| **Free Tier** | 99.5% | Single region; no redundancy |
| **Pro/Enterprise** | 99.95% | Multi-region; auto-failover |

**Implementation**:
- Health checks: Every 10s on `/health` endpoint
- Auto-restart: Kubernetes liveness probes
- Database failover: 3-node PostgreSQL cluster; automatic promotion
- Load balancer: Distribute across 3+ API instances
- CDN: Serve static assets from edge locations
- Monitoring: Datadog or New Relic; alert on >0.1% error rate

### 13.7 Real-Time (WebSocket) Latency

| Scenario | Target | Notes |
|----------|--------|-------|
| **Message delivery** | < 100ms | User → Server → Connected clients |
| **Notification push** | < 500ms | Includes mobile app delivery |
| **Live collaboration** | < 200ms | Conflict-free replicated data types (CRDTs) |
| **Connection establish** | < 1s | TLS handshake + WebSocket upgrade |
| **Reconnection** | < 2s | Exponential backoff (max 30s) |

**Architecture**:
- Go HTTP/2 multiplexing: Multiple streams per connection
- Redis Pub/Sub: Broadcast messages to all instances
- Heartbeat: Ping/pong every 30s to detect dead connections
- Message ordering: Use message IDs; client-side deduplication
- Fallback: Long-polling if WebSocket unavailable (+ 500ms latency)

### 13.8 Error Rates & Reliability

| Error Type | Target | SLA |
|-----------|--------|-----|
| **5xx Server Errors** | < 0.1% | P99 of API calls should succeed |
| **4xx Client Errors** | < 2% | Invalid input; client should handle |
| **Timeouts (API)** | < 0.05% | Rare; includes slow AI calls |
| **Failed AI requests** | < 1% | Fallback provider activates |
| **Database connection errors** | < 0.01% | Connection pool healthy |

**Monitoring**:
- Error tracking: Sentry or Rollbar
- Alert thresholds: >0.1% 5xx rate, >2% error rate trend
- Automated remediation: Restart pods, reset connection pool, trigger fallback
- Post-mortems: Document all incidents > 5 minutes duration

### 13.9 Load Testing Targets

**Concurrent users**:
- Phase 1 MVP: 1,000 concurrent → 5,000 MAU
- Phase 2 Growth: 5,000 concurrent → 50,000 MAU
- Phase 3 Scale: 20,000 concurrent → 100,000 MAU

**Load test scenarios**:
```
Scenario 1: Idea capture (light load)
- 100 concurrent users
- 1 request per user per 10 seconds
- Expected: p95 < 100ms

Scenario 2: Publishing (medium load)
- 50 concurrent users
- Publish 1 post every 30s (coordinated)
- Expected: p95 < 200ms, no queue > 5s

Scenario 3: AI generation (heavy load)
- 20 concurrent users
- Request title generation every 5s
- Expected: p95 < 2s, 100% fallback success

Scenario 4: Analytics dashboard (aggregation heavy)
- 500 concurrent users (dashboard view)
- Load analytics every 30s
- Expected: p95 < 500ms, no timeout > 3s
```

---

✅ **Startup-ready**: Modular monolith with clear module boundaries
✅ **Scalable**: Designed for growth to 100K concurrent users
✅ **Maintainable**: Type-safe SQL, clear dependency injection, structured logging
✅ **Resilient**: Circuit breakers, retry logic, fallback AI providers, health checks
✅ **Observable**: Metrics, tracing, logs, error tracking
✅ **Secure**: RBAC, input validation, GDPR compliance, OWASP coverage
✅ **Real-time**: WebSocket + Redis Pub/Sub for low-latency collaboration
✅ **Production-grade**: Kubernetes-ready, CI/CD, database backups

**Next Steps:**
1. Initialize Go project: `go mod init github.com/ordo-creator/api`
2. Set up sqlc for type-safe SQL generation
3. Implement module structure with clear boundaries
4. Add comprehensive test coverage (unit, integration, E2E)
5. Deploy to Kubernetes cluster with monitoring
6. Iterate based on real user traffic and feedback

---

*"Architecture is about making the right code easy to write and the wrong code hard to write." — Every architect ever*
