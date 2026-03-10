# Architecture Design: Ordo Creator OS — Backend + DB

**Change:** `backend-db-roadmap`
**Project:** `creators_os`
**Date:** 2026-03-10
**Status:** Design Complete

---

## 1. Package Dependency Graph

```
cmd/api
  └── main.go            (signal handling, graceful shutdown, Wire injector call)
  └── wire.go            (Wire provider declarations)
  └── wire_gen.go        (Wire-generated injector, never edit manually)

internal/
  ├── config/            (typed env config via envconfig; validated at startup)
  ├── server/            (Chi router, Server struct, Start/Shutdown)
  │     ├── imports: internal/handler, internal/middleware, internal/job, internal/ws
  │     └── mounts all subrouters
  ├── handler/           (HTTP handlers — one file per module)
  │     ├── imports: internal/service, internal/domain, internal/apperr
  │     └── zero business logic; translates HTTP ↔ service calls
  ├── middleware/        (Chi middleware: auth, workspace, credit check, rate limit)
  │     ├── imports: internal/service (auth), internal/cache (rate limit), internal/domain
  │     └── no repository imports
  ├── service/           (business logic, orchestration)
  │     ├── imports: internal/repository, internal/domain, internal/ai, internal/cache, internal/ws
  │     └── no net/http imports
  ├── repository/        (all DB access via sqlc-generated queries)
  │     ├── imports: internal/domain, db/sqlc (generated)
  │     └── no business logic; pure data access
  ├── domain/            (value objects, enums, aggregate types)
  │     └── zero external imports — only standard library
  ├── ai/                (AI provider interface + implementations)
  │     ├── imports: internal/domain only
  │     └── provider.go, claude.go, openai.go, router.go
  ├── cache/             (Redis abstraction — rate limit counters, short-lived KV)
  │     └── imports: internal/domain
  ├── job/               (Asynq workers + scheduler)
  │     ├── imports: internal/service, internal/domain
  │     └── worker.go, scheduler.go, tasks/*.go
  ├── ws/                (WebSocket hub)
  │     ├── imports: internal/domain
  │     └── hub.go, client.go, events.go
  └── apperr/            (AppError types, error code catalog)
        └── zero external imports

db/
  ├── migrations/        (golang-migrate SQL files, numbered 000001–000030)
  └── sqlc/              (sqlc-generated code: db.go, models.go, queries/*.sql.go)
        └── schema is single source of truth — never edit generated files

tests/
  ├── testutil/          (testcontainers setup, testutil.NewTestApp(), fixtures loader)
  ├── fixtures/          (SQL seed files per module)
  ├── integration/       (per-module integration tests)
  └── load/              (k6 scripts)
```

Import direction is strictly top-down. No layer may import a layer above it. `internal/domain` is the only package that nothing imports from outside.

---

## 2. Wire DI Provider Sets

All provider sets are declared in `cmd/api/wire.go`. Wire generates `cmd/api/wire_gen.go`.

```go
// DatabaseProviderSet — pgxpool connection
var DatabaseProviderSet = wire.NewSet(
    config.ProvideDBConfig,
    repository.NewPgxPool,          // returns *pgxpool.Pool, error
    repository.NewReadReplicaPool,  // returns *pgxpool.Pool (read replica)
)

// CacheProviderSet — Redis client
var CacheProviderSet = wire.NewSet(
    config.ProvideRedisConfig,
    cache.NewRedisClient,           // returns *redis.Client, error
)

// StorageProviderSet — S3 or MinIO depending on config flag
var StorageProviderSet = wire.NewSet(
    config.ProvideStorageConfig,
    storage.NewClient,              // returns storage.Client interface, error
)

// AIProviderSet — Claude + OpenAI + Router
var AIProviderSet = wire.NewSet(
    config.ProvideAIConfig,
    ai.NewClaudeProvider,           // returns ai.AIProvider
    ai.NewOpenAIProvider,           // returns ai.AIProvider
    ai.NewRouter,                   // returns *ai.Router (primary=Claude, fallback=OpenAI)
)

// RepositoryProviderSet — all repositories
var RepositoryProviderSet = wire.NewSet(
    DatabaseProviderSet,
    repository.NewUserRepository,
    repository.NewWorkspaceRepository,
    repository.NewIdeaRepository,
    repository.NewContentRepository,
    repository.NewSeriesRepository,
    repository.NewPublishingRepository,
    repository.NewAIRepository,
    repository.NewAnalyticsRepository,
    repository.NewSponsorshipRepository,
    repository.NewAuditRepository,
)

// ServiceProviderSet — all services
var ServiceProviderSet = wire.NewSet(
    RepositoryProviderSet,
    CacheProviderSet,
    AIProviderSet,
    StorageProviderSet,
    service.NewAuthService,
    service.NewUserService,
    service.NewWorkspaceService,
    service.NewIdeaService,
    service.NewContentService,
    service.NewAIService,
    service.NewRemixService,
    service.NewPublishingService,
    service.NewAnalyticsService,
    service.NewGamificationService,
    service.NewSponsorshipService,
    service.NewBillingService,
    service.NewAuditService,
)

// HandlerProviderSet — all HTTP handlers
var HandlerProviderSet = wire.NewSet(
    ServiceProviderSet,
    handler.NewAuthHandler,
    handler.NewUserHandler,
    handler.NewWorkspaceHandler,
    handler.NewIdeaHandler,
    handler.NewContentHandler,
    handler.NewSeriesHandler,
    handler.NewUploadHandler,
    handler.NewAIHandler,
    handler.NewRemixHandler,
    handler.NewPublishingHandler,
    handler.NewAnalyticsHandler,
    handler.NewGamificationHandler,
    handler.NewSponsorshipHandler,
    handler.NewBillingHandler,
    handler.NewSearchHandler,
    handler.NewAuditHandler,
)

// ServerProviderSet — router, middleware, server
var ServerProviderSet = wire.NewSet(
    HandlerProviderSet,
    middleware.NewAuthMiddleware,
    middleware.NewWorkspaceMiddleware,
    middleware.NewRateLimiter,
    ws.NewHub,
    server.NewRouter,
    server.NewServer,
)

// JobProviderSet — Asynq server, workers, scheduler
var JobProviderSet = wire.NewSet(
    ServiceProviderSet,
    job.NewAsynqServer,
    job.NewAsynqScheduler,
    job.NewWorkerRegistry,          // registers all task handlers
    job.NewEmailWorker,
    job.NewIdeaValidationWorker,
    job.NewRemixWorker,
    job.NewPublishWorker,
    job.NewAnalyticsSyncWorker,
    job.NewConsistencyScoreWorker,
    job.NewAuditBatchWriter,
)
```

The top-level `InitializeApp()` function in `wire.go` binds `ServerProviderSet` + `JobProviderSet` and returns `*server.Server, func(), error` (the cleanup func tears down DB pool, Redis, Asynq).

---

## 3. Core Interface Definitions

### `internal/repository/interfaces.go`

```go
package repository

import (
    "context"
    "github.com/gofrs/uuid/v5"
    "creators_os/internal/domain"
)

type UserRepository interface {
    Create(ctx context.Context, params domain.CreateUserParams) (*domain.User, error)
    GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
    GetByEmail(ctx context.Context, email string) (*domain.User, error)
    Update(ctx context.Context, id uuid.UUID, params domain.UpdateUserParams) (*domain.User, error)
    SoftDelete(ctx context.Context, id uuid.UUID) error
    CreateSession(ctx context.Context, params domain.CreateSessionParams) (*domain.UserSession, error)
    GetSessionByTokenHash(ctx context.Context, tokenHash string) (*domain.UserSession, error)
    RevokeSession(ctx context.Context, id uuid.UUID) error
    RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error
    DecrementAICredits(ctx context.Context, userID uuid.UUID, amount int64) error
    GetAICreditsBalance(ctx context.Context, userID uuid.UUID) (int64, error)
}

type WorkspaceRepository interface {
    Create(ctx context.Context, params domain.CreateWorkspaceParams) (*domain.Workspace, error)
    GetByID(ctx context.Context, id uuid.UUID) (*domain.Workspace, error)
    GetBySlug(ctx context.Context, slug string) (*domain.Workspace, error)
    ListByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Workspace, error)
    Update(ctx context.Context, id uuid.UUID, params domain.UpdateWorkspaceParams) (*domain.Workspace, error)
    SoftDelete(ctx context.Context, id uuid.UUID) error
    GetMember(ctx context.Context, workspaceID, userID uuid.UUID) (*domain.WorkspaceMember, error)
    ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceMember, error)
    AddMember(ctx context.Context, params domain.AddMemberParams) (*domain.WorkspaceMember, error)
    UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, role domain.Role) error
    RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error
    CountMembers(ctx context.Context, workspaceID uuid.UUID) (int64, error)
    CreateInvitation(ctx context.Context, params domain.CreateInvitationParams) (*domain.WorkspaceInvitation, error)
    GetInvitationByToken(ctx context.Context, token string) (*domain.WorkspaceInvitation, error)
    ListInvitations(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceInvitation, error)
    AcceptInvitation(ctx context.Context, token string) (*domain.WorkspaceInvitation, error)
    DeleteInvitation(ctx context.Context, id uuid.UUID) error
}

type IdeaRepository interface {
    Create(ctx context.Context, params domain.CreateIdeaParams) (*domain.Idea, error)
    GetByID(ctx context.Context, id, workspaceID uuid.UUID) (*domain.Idea, error)
    List(ctx context.Context, params domain.ListIdeasParams) ([]*domain.Idea, int64, error)
    Update(ctx context.Context, id uuid.UUID, params domain.UpdateIdeaParams) (*domain.Idea, error)
    SoftDelete(ctx context.Context, id, workspaceID uuid.UUID) error
    SaveValidationScore(ctx context.Context, params domain.SaveValidationScoreParams) error
    GetValidationScore(ctx context.Context, ideaID uuid.UUID) (*domain.IdeaValidationScore, error)
    SetTags(ctx context.Context, ideaID uuid.UUID, tags []string) error
    Promote(ctx context.Context, ideaID, contentID uuid.UUID) error
}

type ContentRepository interface {
    Create(ctx context.Context, params domain.CreateContentParams) (*domain.Content, error)
    GetByID(ctx context.Context, id, workspaceID uuid.UUID) (*domain.Content, error)
    List(ctx context.Context, params domain.ListContentsParams) ([]*domain.Content, int64, error)
    Update(ctx context.Context, id uuid.UUID, params domain.UpdateContentParams) (*domain.Content, error)
    UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error
    SoftDelete(ctx context.Context, id, workspaceID uuid.UUID) error
    AddAssignment(ctx context.Context, params domain.AddAssignmentParams) (*domain.ContentAssignment, error)
    ListAssignments(ctx context.Context, contentID uuid.UUID) ([]*domain.ContentAssignment, error)
    SaveRemixJob(ctx context.Context, params domain.SaveRemixJobParams) (*domain.RemixJob, error)
    GetRemixJob(ctx context.Context, jobID uuid.UUID) (*domain.RemixJob, error)
    UpdateRemixJob(ctx context.Context, jobID uuid.UUID, params domain.UpdateRemixJobParams) error
}

type SeriesRepository interface {
    Create(ctx context.Context, params domain.CreateSeriesParams) (*domain.Series, error)
    GetByID(ctx context.Context, id, workspaceID uuid.UUID) (*domain.Series, error)
    List(ctx context.Context, workspaceID uuid.UUID, params domain.ListSeriesParams) ([]*domain.Series, int64, error)
    Update(ctx context.Context, id uuid.UUID, params domain.UpdateSeriesParams) (*domain.Series, error)
    SoftDelete(ctx context.Context, id, workspaceID uuid.UUID) error
    CreateEpisode(ctx context.Context, params domain.CreateEpisodeParams) (*domain.SeriesEpisode, error)
    ListEpisodes(ctx context.Context, seriesID uuid.UUID) ([]*domain.SeriesEpisode, error)
    UpdateEpisode(ctx context.Context, id uuid.UUID, params domain.UpdateEpisodeParams) (*domain.SeriesEpisode, error)
    UpsertSchedule(ctx context.Context, params domain.UpsertSeriesScheduleParams) (*domain.SeriesPublishingSchedule, error)
    GetSchedule(ctx context.Context, seriesID uuid.UUID) (*domain.SeriesPublishingSchedule, error)
}

type PublishingRepository interface {
    SaveCredential(ctx context.Context, params domain.SaveCredentialParams) (*domain.PlatformCredential, error)
    GetCredential(ctx context.Context, id, workspaceID uuid.UUID) (*domain.PlatformCredential, error)
    ListCredentials(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PlatformCredential, error)
    DeleteCredential(ctx context.Context, id, workspaceID uuid.UUID) error
    UpdateCredentialTokens(ctx context.Context, id uuid.UUID, params domain.UpdateTokenParams) error
    SchedulePost(ctx context.Context, params domain.SchedulePostParams) (*domain.ScheduledPost, error)
    GetScheduledPost(ctx context.Context, id uuid.UUID) (*domain.ScheduledPost, error)
    ListScheduledPosts(ctx context.Context, params domain.ListScheduledPostsParams) ([]*domain.ScheduledPost, error)
    UpdateScheduledPost(ctx context.Context, id uuid.UUID, params domain.UpdateScheduledPostParams) error
    DeleteScheduledPost(ctx context.Context, id, workspaceID uuid.UUID) error
    GetDuePosts(ctx context.Context, before time.Time) ([]*domain.ScheduledPost, error)
    MarkPostPublished(ctx context.Context, id uuid.UUID, platformPostID string) error
    MarkPostFailed(ctx context.Context, id uuid.UUID, errMsg string) error
}

type AIRepository interface {
    CreateConversation(ctx context.Context, params domain.CreateConversationParams) (*domain.AIConversation, error)
    GetConversation(ctx context.Context, id, workspaceID uuid.UUID) (*domain.AIConversation, error)
    ListConversations(ctx context.Context, workspaceID, userID uuid.UUID) ([]*domain.AIConversation, error)
    DeleteConversation(ctx context.Context, id, workspaceID uuid.UUID) error
    AddMessage(ctx context.Context, params domain.AddAIMessageParams) (*domain.AIMessage, error)
    ListMessages(ctx context.Context, conversationID uuid.UUID) ([]*domain.AIMessage, error)
    RecordCreditUsage(ctx context.Context, params domain.RecordCreditUsageParams) error
    GetCreditUsageSummary(ctx context.Context, userID uuid.UUID, since time.Time) (*domain.CreditUsageSummary, error)
}

type AnalyticsRepository interface {
    SaveContentAnalytics(ctx context.Context, params domain.SaveContentAnalyticsParams) error
    GetContentAnalytics(ctx context.Context, contentID uuid.UUID, from, to time.Time) ([]*domain.ContentAnalytics, error)
    SavePlatformAnalytics(ctx context.Context, params domain.SavePlatformAnalyticsParams) error
    GetWorkspaceAnalyticsOverview(ctx context.Context, workspaceID uuid.UUID) (*domain.AnalyticsOverview, error)
    GetPlatformAnalytics(ctx context.Context, workspaceID uuid.UUID, platform domain.Platform) ([]*domain.PlatformAnalytics, error)
    EnsurePartitionExists(ctx context.Context, month time.Time) error
}

type SponsorshipRepository interface {
    Create(ctx context.Context, params domain.CreateSponsorshipParams) (*domain.Sponsorship, error)
    GetByID(ctx context.Context, id, workspaceID uuid.UUID) (*domain.Sponsorship, error)
    List(ctx context.Context, params domain.ListSponsorshipsParams) ([]*domain.Sponsorship, int64, error)
    Update(ctx context.Context, id uuid.UUID, params domain.UpdateSponsorshipParams) (*domain.Sponsorship, error)
    SoftDelete(ctx context.Context, id, workspaceID uuid.UUID) error
    AddMessage(ctx context.Context, params domain.AddSponsorshipMessageParams) (*domain.SponsorshipMessage, error)
    ListMessages(ctx context.Context, sponsorshipID uuid.UUID) ([]*domain.SponsorshipMessage, error)
}
```

### `internal/service/interfaces.go`

```go
package service

import (
    "context"
    "io"
    "github.com/gofrs/uuid/v5"
    "creators_os/internal/domain"
)

type AuthService interface {
    Register(ctx context.Context, params domain.RegisterParams) (*domain.AuthTokens, error)
    Login(ctx context.Context, email, password string) (*domain.AuthTokens, error)
    RefreshTokens(ctx context.Context, refreshToken string) (*domain.AuthTokens, error)
    Logout(ctx context.Context, refreshToken string) error
    LogoutAll(ctx context.Context, userID uuid.UUID) error
    ForgotPassword(ctx context.Context, email string) error
    ResetPassword(ctx context.Context, token, newPassword string) error
    VerifyEmail(ctx context.Context, token string) error
    OAuthCallback(ctx context.Context, provider string, code string, state string) (*domain.AuthTokens, error)
    ValidateAccessToken(ctx context.Context, tokenString string) (*domain.UserClaims, error)
}

type UserService interface {
    GetMe(ctx context.Context, userID uuid.UUID) (*domain.User, error)
    UpdateMe(ctx context.Context, userID uuid.UUID, params domain.UpdateUserParams) (*domain.User, error)
    UpdatePreferences(ctx context.Context, userID uuid.UUID, prefs domain.UserPreferences) error
    GetAICreditsBalance(ctx context.Context, userID uuid.UUID) (int64, error)
}

type WorkspaceService interface {
    Create(ctx context.Context, ownerID uuid.UUID, params domain.CreateWorkspaceParams) (*domain.Workspace, error)
    GetByID(ctx context.Context, id uuid.UUID) (*domain.Workspace, error)
    ListForUser(ctx context.Context, userID uuid.UUID) ([]*domain.Workspace, error)
    Update(ctx context.Context, id uuid.UUID, params domain.UpdateWorkspaceParams) (*domain.Workspace, error)
    Delete(ctx context.Context, id uuid.UUID) error
    GetMembership(ctx context.Context, workspaceID, userID uuid.UUID) (*domain.WorkspaceMember, error)
    ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceMember, error)
    UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, role domain.Role) error
    RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error
    InviteMember(ctx context.Context, workspaceID, inviterID uuid.UUID, params domain.InviteParams) error
    AcceptInvitation(ctx context.Context, token string, acceptingUserID uuid.UUID) error
    ListInvitations(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceInvitation, error)
    DeleteInvitation(ctx context.Context, workspaceID, invitationID uuid.UUID) error
}

type IdeaService interface {
    Create(ctx context.Context, workspaceID, userID uuid.UUID, params domain.CreateIdeaParams) (*domain.Idea, error)
    GetByID(ctx context.Context, id, workspaceID uuid.UUID) (*domain.Idea, error)
    List(ctx context.Context, params domain.ListIdeasParams) ([]*domain.Idea, int64, error)
    Update(ctx context.Context, id, workspaceID uuid.UUID, params domain.UpdateIdeaParams) (*domain.Idea, error)
    Delete(ctx context.Context, id, workspaceID uuid.UUID) error
    RequestValidation(ctx context.Context, id, workspaceID uuid.UUID) error
    Promote(ctx context.Context, id, workspaceID, userID uuid.UUID) (*domain.Content, error)
    SetTags(ctx context.Context, id, workspaceID uuid.UUID, tags []string) error
}

type ContentService interface {
    Create(ctx context.Context, workspaceID, userID uuid.UUID, params domain.CreateContentParams) (*domain.Content, error)
    GetByID(ctx context.Context, id, workspaceID uuid.UUID) (*domain.Content, error)
    List(ctx context.Context, params domain.ListContentsParams) ([]*domain.Content, int64, error)
    Update(ctx context.Context, id, workspaceID uuid.UUID, params domain.UpdateContentParams) (*domain.Content, error)
    Delete(ctx context.Context, id, workspaceID uuid.UUID) error
    TransitionStatus(ctx context.Context, id, workspaceID uuid.UUID, to domain.ContentStatus) error
    AddAssignment(ctx context.Context, contentID, workspaceID uuid.UUID, params domain.AddAssignmentParams) error
    ListAssignments(ctx context.Context, contentID, workspaceID uuid.UUID) ([]*domain.ContentAssignment, error)
}

type AIService interface {
    CreateConversation(ctx context.Context, workspaceID, userID uuid.UUID, params domain.CreateConversationParams) (*domain.AIConversation, error)
    GetConversation(ctx context.Context, id, workspaceID uuid.UUID) (*domain.AIConversation, error)
    ListConversations(ctx context.Context, workspaceID, userID uuid.UUID) ([]*domain.AIConversation, error)
    DeleteConversation(ctx context.Context, id, workspaceID uuid.UUID) error
    SendMessage(ctx context.Context, conversationID, workspaceID, userID uuid.UUID, content string) (*domain.AIMessage, error)
    StreamMessage(ctx context.Context, conversationID, workspaceID, userID uuid.UUID, content string, out io.Writer) error
    Brainstorm(ctx context.Context, userID uuid.UUID, prompt string) (string, error)
    GenerateScript(ctx context.Context, userID uuid.UUID, params domain.ScriptGenParams) (string, error)
    AnalyzeContent(ctx context.Context, userID uuid.UUID, params domain.ContentAnalyzeParams) (*domain.ContentAnalysis, error)
    GetCreditsBalance(ctx context.Context, userID uuid.UUID) (int64, error)
    CheckAndDeductCredits(ctx context.Context, userID uuid.UUID, estimatedCost int64) error
}

type RemixService interface {
    SubmitJob(ctx context.Context, workspaceID, userID uuid.UUID, params domain.RemixJobParams) (*domain.RemixJob, error)
    GetJobStatus(ctx context.Context, jobID, workspaceID uuid.UUID) (*domain.RemixJob, error)
    GetJobResults(ctx context.Context, jobID, workspaceID uuid.UUID) (*domain.RemixResults, error)
    ApplyResults(ctx context.Context, jobID, workspaceID, userID uuid.UUID, selectedClipIDs []string) ([]*domain.Content, error)
    ProcessJob(ctx context.Context, jobID uuid.UUID) error // called by Asynq worker
}

type PublishingService interface {
    ConnectCredential(ctx context.Context, workspaceID, userID uuid.UUID, provider string, code, state string) (*domain.PlatformCredential, error)
    ListCredentials(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PlatformCredential, error)
    DeleteCredential(ctx context.Context, id, workspaceID uuid.UUID) error
    SchedulePost(ctx context.Context, workspaceID uuid.UUID, params domain.SchedulePostParams) (*domain.ScheduledPost, error)
    UpdateScheduledPost(ctx context.Context, id, workspaceID uuid.UUID, params domain.UpdateScheduledPostParams) error
    DeleteScheduledPost(ctx context.Context, id, workspaceID uuid.UUID) error
    GetCalendar(ctx context.Context, workspaceID uuid.UUID, from, to time.Time) ([]*domain.ScheduledPost, error)
    ExecuteScheduledPost(ctx context.Context, postID uuid.UUID) error // called by Asynq worker
}

type AnalyticsService interface {
    GetOverview(ctx context.Context, workspaceID uuid.UUID) (*domain.AnalyticsOverview, error)
    GetContentAnalytics(ctx context.Context, contentID, workspaceID uuid.UUID) ([]*domain.ContentAnalytics, error)
    GetPlatformAnalytics(ctx context.Context, workspaceID uuid.UUID, platform domain.Platform) ([]*domain.PlatformAnalytics, error)
    TriggerSync(ctx context.Context, workspaceID uuid.UUID) error
    RunSync(ctx context.Context, workspaceID uuid.UUID) error // called by Asynq worker
}

type GamificationService interface {
    GetStats(ctx context.Context, userID, workspaceID uuid.UUID) (*domain.UserStats, error)
    ListAchievements(ctx context.Context) ([]*domain.Achievement, error)
    GetLeaderboard(ctx context.Context, workspaceID uuid.UUID) ([]*domain.LeaderboardEntry, error)
    RecalculateConsistencyScores(ctx context.Context) error // called by Asynq scheduler
    CheckAndUnlockAchievements(ctx context.Context, userID, workspaceID uuid.UUID, event domain.GamificationEvent) error
}

type SponsorshipService interface {
    Create(ctx context.Context, workspaceID, userID uuid.UUID, params domain.CreateSponsorshipParams) (*domain.Sponsorship, error)
    GetByID(ctx context.Context, id, workspaceID uuid.UUID) (*domain.Sponsorship, error)
    List(ctx context.Context, params domain.ListSponsorshipsParams) ([]*domain.Sponsorship, int64, error)
    Update(ctx context.Context, id, workspaceID uuid.UUID, params domain.UpdateSponsorshipParams) (*domain.Sponsorship, error)
    Delete(ctx context.Context, id, workspaceID uuid.UUID) error
    AddMessage(ctx context.Context, sponsorshipID, workspaceID, userID uuid.UUID, params domain.AddSponsorshipMessageParams) (*domain.SponsorshipMessage, error)
    ListMessages(ctx context.Context, sponsorshipID, workspaceID uuid.UUID) ([]*domain.SponsorshipMessage, error)
}

type BillingService interface {
    CreateCheckoutSession(ctx context.Context, userID uuid.UUID, priceID string, successURL, cancelURL string) (string, error)
    CreatePortalSession(ctx context.Context, userID uuid.UUID, returnURL string) (string, error)
    GetSubscription(ctx context.Context, userID uuid.UUID) (*domain.SubscriptionStatus, error)
    HandleWebhook(ctx context.Context, payload []byte, signature string) error
}
```

### `internal/ai/provider.go`

```go
package ai

import (
    "context"
    "io"
)

// AIProvider is the interface all AI backends must satisfy.
type AIProvider interface {
    // Complete performs a non-streaming completion and returns the full response.
    Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error)

    // Stream performs a streaming completion, writing SSE-formatted chunks to w.
    // Callers must close or drain w after Stream returns.
    Stream(ctx context.Context, req CompletionRequest, w io.Writer) error

    // EstimateTokens returns a rough token count for the given messages.
    // Used for pre-flight credit checks before issuing the actual request.
    EstimateTokens(messages []Message) int64

    // Name returns the provider identifier (e.g. "claude", "openai").
    Name() string
}

type CompletionRequest struct {
    Model       string
    Messages    []Message
    MaxTokens   int
    Temperature float32
    System      string
}

type CompletionResponse struct {
    Content      string
    InputTokens  int64
    OutputTokens int64
    Model        string
}

type Message struct {
    Role    string // "user" | "assistant" | "system"
    Content string
}
```

---

## 4. Data Flow Diagrams

### 4a. Auth Flow

```
HTTP POST /api/v1/auth/login
  → Chi router
  → RequestID middleware (injects X-Request-ID)
  → Logger middleware (logs incoming request)
  → Recoverer middleware
  → RateLimiter middleware (5/min per IP, Redis sliding window; returns 429 on breach)
  → handler.AuthHandler.Login()
      → validates request body (binding + validation tags)
      → service.AuthService.Login(ctx, email, password)
          → repo.UserRepository.GetByEmail(ctx, email)
          → bcrypt.CompareHashAndPassword(hash, password)
          → on failure: return apperr.New(AUTH_001, "invalid credentials", 401)
          → jwt.GenerateAccessToken(userID, email, tier)   // RS256, 15min TTL
          → jwt.GenerateRefreshToken()                     // random 32 bytes
          → repo.UserRepository.CreateSession(ctx, params) // stores SHA-256(refreshToken)
          → return domain.AuthTokens{AccessToken, RefreshToken, ExpiresAt}
      → handler writes JSON 200 response
```

### 4b. Content Status Update

```
HTTP PUT /api/v1/workspaces/{workspaceId}/contents/{contentId}/status
  → Auth middleware (JWT parse → injects UserClaims into ctx)
  → WorkspaceContext middleware
      → repo.WorkspaceRepository.GetMember(ctx, workspaceID, userID)
      → RequireRole(editor, admin, owner)
      → injects WorkspaceMember into ctx
  → handler.ContentHandler.UpdateStatus()
      → service.ContentService.TransitionStatus(ctx, contentID, workspaceID, newStatus)
          → current = repo.ContentRepository.GetByID(...)
          → domain.ValidateStatusTransition(current.Status, newStatus)
              // allowed transitions are a hard-coded adjacency map in domain layer
              // e.g. scripting → recording is valid; published → scripting is not
          → repo.ContentRepository.UpdateStatus(ctx, contentID, newStatus)
          → ws.Hub.Broadcast(workspaceID, events.ContentStatusChanged{...})
      → 200 OK
```

### 4c. AI Generation (Streaming)

```
HTTP POST /api/v1/ai/conversations/{id}/messages
  → Auth middleware
  → CreditCheck middleware (reads subscription_tier from JWT claims)
  → handler.AIHandler.SendMessage()
      → service.AIService.StreamMessage(ctx, conversationID, workspaceID, userID, content, w)
          → repo.AIRepository.GetConversation(ctx, ...) // load history
          → ai.Provider.EstimateTokens(messages)        // rough pre-flight estimate
          → repo.UserRepository.DecrementAICredits(ctx, userID, estimatedCost)
              // atomic: UPDATE users SET ai_credits_balance = ai_credits_balance - $1
              //         WHERE id = $2 AND ai_credits_balance >= $1
              // returns apperr AI_002 if balance insufficient
          → ai.Router.Stream(ctx, req, responseWriter)
              → ClaudeProvider.Stream() → Anthropic API
              → on 429/5xx: fallback to OpenAIProvider.Stream()
          → actual token counts extracted from stream completion event
          → delta = actualCost - estimatedCost; if delta != 0: reconcile in DB
          → repo.AIRepository.RecordCreditUsage(ctx, params)
          → repo.AIRepository.AddMessage(ctx, assistantMsg)
      → handler flushes SSE stream, sends final [DONE] event
```

### 4d. Remix Job

```
HTTP POST /api/v1/remix/analyze
  → Auth middleware
  → WorkspaceContext middleware
  → handler.RemixHandler.SubmitJob()
      → service.RemixService.SubmitJob(ctx, workspaceID, userID, params)
          → repo.ContentRepository.SaveRemixJob(ctx, ...)
          → asynq.Client.Enqueue(tasks.NewRemixAnalysisTask(jobID), asynq.Queue("low"))
          → return RemixJob{ID: jobID, Status: "pending"}
      → 202 Accepted, { job_id, status_url }

Asynq worker: job/remix_worker.go — RemixAnalysisWorker.ProcessTask()
  → service.RemixService.ProcessJob(ctx, jobID)
      → repo.ContentRepository.GetRemixJob(ctx, jobID)
      → Step 1 (Ingest): fetch video metadata / transcript from provided URL
      → Step 2 (Transcribe): call external transcription or use provided transcript
      → Step 3 (Score): ai.Router.Complete(ctx, scoringPrompt) → structured clip suggestions
      → Step 4 (Generate): ai.Router.Complete(ctx, contentGenPrompt) → titles + descriptions per clip
      → repo.ContentRepository.UpdateRemixJob(ctx, jobID, {Status: "complete", Results: jsonb})
      → ws.Hub.Broadcast(workspaceID, events.RemixJobComplete{JobID: jobID})
```

### 4e. Stripe Webhook

```
HTTP POST /api/v1/billing/webhooks
  → (no Auth middleware — Stripe uses HMAC signature, not JWT)
  → StripeSignatureVerify middleware
      → stripe.ConstructEvent(payload, signature, webhookSecret)
      → on invalid signature: 400 Bad Request (logged)
  → handler.BillingHandler.HandleWebhook()
      → service.BillingService.HandleWebhook(ctx, payload, signature)
          → check idempotency: Redis GET "stripe:event:{eventID}"
          → if already processed: return nil (200 OK to Stripe — do not retry)
          → Redis SET "stripe:event:{eventID}" "1" EX 300
          → switch event.Type:
              case "customer.subscription.created",
                   "customer.subscription.updated":
                  → parse subscription tier from price metadata
                  → repo.UserRepository.UpdateSubscriptionTier(ctx, stripeCustomerID, tier)
              case "customer.subscription.deleted":
                  → repo.UserRepository.UpdateSubscriptionTier(ctx, stripeCustomerID, "free")
              case "invoice.payment_failed":
                  → job.Enqueue(tasks.NewPaymentFailedNotificationTask(userID))
          → 200 OK
```

---

## 5. Database Design Decisions

### UUID v7 Generation

- Library: `github.com/gofrs/uuid/v5`
- UUID v7 encodes a millisecond-precise timestamp in the most-significant bits, making primary keys monotonically increasing — dramatically improving B-tree insert performance vs. v4 random UUIDs.
- Generation point: **service layer only**. Repositories accept `uuid.UUID` as a parameter; they never generate IDs themselves. This keeps ID generation testable and consistent.
- sqlc type override maps `uuid` PostgreSQL type to `github.com/gofrs/uuid/v5.UUID`.

```yaml
# sqlc.yaml (type override excerpt)
overrides:
  - db_type: "uuid"
    go_type:
      import: "github.com/gofrs/uuid/v5"
      type: "UUID"
  - db_type: "jsonb"
    go_type:
      import: "encoding/json"
      type: "RawMessage"
  - db_type: "pg_catalog.text[]"
    go_type: "[]string"
  - db_type: "content_status"
    go_type:
      import: "creators_os/internal/domain"
      type: "ContentStatus"
  - db_type: "user_role"
    go_type:
      import: "creators_os/internal/domain"
      type: "Role"
  - db_type: "platform_type"
    go_type:
      import: "creators_os/internal/domain"
      type: "Platform"
```

Full `sqlc.yaml`:

```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "db/queries/"
    schema: "db/migrations/"
    gen:
      go:
        package: "sqlcdb"
        out: "db/sqlc"
        emit_json_tags: true
        emit_prepared_queries: false
        emit_interface: true
        emit_exact_table_names: false
        emit_empty_slices: true
        overrides: [...]    # see above
```

### RLS Policy Design

Row-Level Security is implemented at the **application layer via pgxpool connection-level session variables**, not PostgreSQL RLS policies. This is intentional: application-layer enforcement is easier to test, debug, and refactor than database-enforced RLS, and avoids complications with `pgxpool` connection multiplexing.

The pattern used for every workspace-scoped query:

1. Every `workspace_id` is sourced from the authenticated `WorkspaceMember` in the Chi context — never trusted directly from the URL parameter alone.
2. Every sqlc query for workspace resources has an explicit `AND workspace_id = $n` clause.
3. There is no `SET LOCAL app.current_workspace_id` pattern — that approach is fragile with connection pools because connections are reused across requests and session variables can bleed between connections unless explicitly managed.

If true PostgreSQL RLS is added in a future hardening phase, it will use `SET LOCAL` within an explicit transaction per-request — not at the pool level.

### Migration Sequencing

Migrations are in `db/migrations/`, numbered `000001` through `000030`. The sequence follows phase dependencies:

| Migration Range | Content |
|-----------------|---------|
| 000001 | Baseline (empty, establishes `schema_migrations` table) |
| 000002 | Create enums: `user_role`, `content_status`, `platform_type`, `subscription_tier`, `idea_status`, `sponsorship_status`, `ai_mode` |
| 000003 | `users` table |
| 000004 | `user_sessions` table |
| 000005 | `workspaces` table |
| 000006 | `workspace_members` table |
| 000007 | `workspace_invitations` table |
| 000008 | `ideas` table |
| 000009 | `idea_validation_scores` table |
| 000010 | `idea_tags` table |
| 000011 | `contents` table |
| 000012 | `content_assignments` table |
| 000013 | `content_analytics` partitioned table + first partition |
| 000014 | `series` table |
| 000015 | `series_episodes` table |
| 000016 | `series_publishing_schedule` table |
| 000017 | `remix_jobs` table |
| 000018 | `ai_conversations` table |
| 000019 | `ai_messages` table |
| 000020 | `ai_credit_usage` table |
| 000021 | `platform_credentials` table |
| 000022 | `scheduled_posts` table |
| 000023 | `platform_analytics` table |
| 000024 | `consistency_scores` table |
| 000025 | `achievements` + seed data |
| 000026 | `user_stats` table |
| 000027 | `sponsorships` table |
| 000028 | `sponsorship_messages` table |
| 000029 | `activity_logs` partitioned table + first partition |
| 000030 | Full-text search vectors: add `search_vector` generated columns + GIN indexes on `ideas`, `contents`, `series`, `sponsorships` |

### Index Strategy

Beyond primary keys and foreign keys, the following indexes are created:

```sql
-- users
CREATE UNIQUE INDEX users_email_idx ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX users_stripe_customer_id_idx ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- workspace_members
CREATE UNIQUE INDEX workspace_members_unique_idx ON workspace_members (workspace_id, user_id);
CREATE INDEX workspace_members_user_id_idx ON workspace_members (user_id);

-- workspace_invitations
CREATE UNIQUE INDEX workspace_invitations_token_idx ON workspace_invitations (token);

-- ideas (workspace-scoped list queries)
CREATE INDEX ideas_workspace_status_idx ON ideas (workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ideas_workspace_created_at_idx ON ideas (workspace_id, created_at DESC) WHERE deleted_at IS NULL;
-- Full-text search
CREATE INDEX ideas_search_vector_gin_idx ON ideas USING GIN (search_vector);

-- contents (Kanban filtering)
CREATE INDEX contents_workspace_status_idx ON contents (workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX contents_workspace_assignee_idx ON contents (workspace_id, assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX contents_workspace_due_date_idx ON contents (workspace_id, due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;
-- Full-text search
CREATE INDEX contents_search_vector_gin_idx ON contents USING GIN (search_vector);
-- metadata JSONB
CREATE INDEX contents_metadata_gin_idx ON contents USING GIN (metadata);

-- content_analytics (partitioned — each partition inherits the index definition)
CREATE INDEX content_analytics_content_id_recorded_at_idx
    ON content_analytics (content_id, recorded_at DESC);

-- ai_messages
CREATE INDEX ai_messages_conversation_id_created_at_idx
    ON ai_messages (conversation_id, created_at ASC);

-- scheduled_posts (scheduler query: find due posts)
CREATE INDEX scheduled_posts_status_scheduled_at_idx
    ON scheduled_posts (status, scheduled_at) WHERE status = 'pending';

-- sponsorships
CREATE INDEX sponsorships_workspace_status_idx ON sponsorships (workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX sponsorships_search_vector_gin_idx ON sponsorships USING GIN (search_vector);

-- activity_logs (partitioned)
CREATE INDEX activity_logs_workspace_created_at_idx
    ON activity_logs (workspace_id, created_at DESC);

-- series
CREATE INDEX series_search_vector_gin_idx ON series USING GIN (search_vector);
```

### Connection Pool Strategy

Two `*pgxpool.Pool` instances are provisioned:

**Primary pool** (`repository.NewPgxPool`): used for all writes and latency-sensitive reads.
- `MaxConns`: `min(CPU_count * 4, 20)` — tuned at startup from config
- `MinConns`: 2
- `MaxConnLifetime`: 30 minutes
- `MaxConnIdleTime`: 10 minutes

**Read replica pool** (`repository.NewReadReplicaPool`): used exclusively for analytics queries, leaderboard, and search — workloads that can tolerate slight replication lag.
- Connection string: `DB_READ_REPLICA_URL` env var; falls back to primary if not set (dev convenience)
- `MaxConns`: 10
- Used by: `AnalyticsRepository`, `GamificationRepository` (leaderboard), `SearchRepository`
- Repositories that use the read replica receive it as a named parameter: `NewAnalyticsRepository(readPool *pgxpool.Pool)` — Wire disambiguates via provider function naming.

---

## 6. Error Handling Architecture

### `AppError` Struct (`internal/apperr/`)

```go
package apperr

import "net/http"

type AppError struct {
    Code       string         // e.g. "AUTH_001"
    Message    string         // user-facing message
    HTTPStatus int            // maps to HTTP response status
    Details    map[string]any // optional structured details (validation errors, etc.)
    Cause      error          // internal cause, not serialized to response
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.Cause }

func New(code string, message string, httpStatus int) *AppError { ... }
func Wrap(code string, message string, httpStatus int, cause error) *AppError { ... }
func WithDetails(e *AppError, details map[string]any) *AppError { ... }

// Sentinel constructors for common cases
func Unauthorized(code, message string) *AppError { return New(code, message, http.StatusUnauthorized) }
func Forbidden(code, message string) *AppError    { return New(code, message, http.StatusForbidden) }
func NotFound(code, message string) *AppError     { return New(code, message, http.StatusNotFound) }
func Conflict(code, message string) *AppError     { return New(code, message, http.StatusConflict) }
func BadRequest(code, message string) *AppError   { return New(code, message, http.StatusBadRequest) }
func Internal(cause error) *AppError              { return Wrap("INTERNAL_001", "internal server error", 500, cause) }

// IsAppError tests if err (or any wrapped error) is *AppError
func IsAppError(err error) (*AppError, bool) { ... }
```

### Error Code Catalog

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_001` | 401 | Invalid credentials |
| `AUTH_002` | 401 | Token expired |
| `AUTH_003` | 401 | Token invalid |
| `AUTH_004` | 401 | Token revoked |
| `AUTH_005` | 409 | Email already registered |
| `AUTH_006` | 400 | Email not verified |
| `AUTH_007` | 400 | Invalid or expired reset token |
| `AUTH_008` | 429 | Too many auth attempts |
| `WORKSPACE_001` | 404 | Workspace not found |
| `WORKSPACE_002` | 403 | Not a workspace member |
| `WORKSPACE_003` | 403 | Insufficient role |
| `WORKSPACE_004` | 409 | Slug already taken |
| `WORKSPACE_005` | 422 | Member limit reached for tier |
| `WORKSPACE_006` | 404 | Invitation not found or expired |
| `CONTENT_001` | 404 | Content not found |
| `CONTENT_002` | 422 | Invalid status transition |
| `CONTENT_003` | 404 | Assignment not found |
| `IDEA_001` | 404 | Idea not found |
| `IDEA_002` | 409 | Idea already promoted |
| `SERIES_001` | 404 | Series not found |
| `UPLOAD_001` | 400 | Unsupported MIME type |
| `UPLOAD_002` | 400 | File too large |
| `UPLOAD_003` | 404 | Upload not confirmed (object not found in storage) |
| `AI_001` | 404 | Conversation not found |
| `AI_002` | 402 | Insufficient AI credits |
| `AI_003` | 503 | AI provider unavailable |
| `AI_004` | 429 | AI rate limit exceeded |
| `REMIX_001` | 404 | Remix job not found |
| `REMIX_002` | 409 | Job not in a retrievable state |
| `PUBLISHING_001` | 404 | Platform credential not found |
| `PUBLISHING_002` | 422 | Token refresh failed |
| `PUBLISHING_003` | 404 | Scheduled post not found |
| `BILLING_001` | 400 | Invalid Stripe signature |
| `BILLING_002` | 404 | Subscription not found |
| `SPONSORSHIP_001` | 404 | Sponsorship not found |
| `SEARCH_001` | 400 | Query too short |
| `RATE_LIMIT_001` | 429 | Rate limit exceeded |
| `INTERNAL_001` | 500 | Internal server error |

### Middleware Error Handler

`internal/middleware/error_handler.go` — registered as the final Chi `NotFound` and `MethodNotAllowed` handler, and called by all handlers via a shared `Render` helper:

```go
func Render(w http.ResponseWriter, r *http.Request, err error) {
    var appErr *apperr.AppError
    if errors.As(err, &appErr) {
        // Structured log at warn level (4xx) or error level (5xx)
        // Do NOT include appErr.Cause in response body
        writeJSON(w, appErr.HTTPStatus, ErrorResponse{
            Code:    appErr.Code,
            Message: appErr.Message,
            Details: appErr.Details,
        })
        return
    }
    // Unknown error — log at error level with full cause, return generic 500
    log.Error().Err(err).Str("request_id", GetRequestID(r.Context())).Msg("unhandled error")
    writeJSON(w, 500, ErrorResponse{Code: "INTERNAL_001", Message: "internal server error"})
}
```

### Error Wrapping Convention

- Use `fmt.Errorf("operation description: %w", err)` to add context without losing type.
- Sentinel domain errors are defined in `internal/domain/errors.go` (e.g., `var ErrIdeaAlreadyPromoted = errors.New("idea already promoted")`).
- `AppError` wraps domain sentinels at the service layer: `return apperr.Wrap("IDEA_002", "idea already promoted", 409, domain.ErrIdeaAlreadyPromoted)`.
- Repository layer never wraps into `AppError` — it returns raw errors or domain sentinels. The service layer is responsible for the AppError conversion.

---

## 7. Middleware Stack Design

### Global Middleware (applied to all routes)

```go
r := chi.NewRouter()

// Order is significant — these execute in declaration order for requests
// and in reverse order for responses.
r.Use(middleware.RequestID)       // 1. inject X-Request-ID (chi built-in)
r.Use(middleware.RealIP)          // 2. set RemoteAddr from X-Forwarded-For (chi built-in)
r.Use(mw.StructuredLogger)        // 3. zerolog request/response log (internal)
r.Use(middleware.Recoverer)       // 4. panic → 500, log stack trace (chi built-in)
r.Use(mw.PrometheusMetrics)       // 5. record request count + duration histograms
r.Use(mw.CORS)                    // 6. CORS headers (configurable origins)
r.Use(mw.RateLimiter)             // 7. global sliding window rate limiter (Redis)
r.Use(mw.Auth)                    // 8. JWT parse + validate → inject UserClaims into ctx
                                  //    (pass-through for unauthenticated routes, not a hard gate)
```

Auth endpoints are mounted without an explicit auth requirement — the handler itself determines whether a valid token is needed. Protected endpoints use the `mw.RequireAuth` helper which reads from context and returns 401 if claims are absent.

### Per-Subrouter Middleware

```go
// Workspace-scoped routes
r.Route("/v1/workspaces/{workspaceID}", func(r chi.Router) {
    r.Use(mw.RequireAuth)              // hard gate: must have valid JWT
    r.Use(mw.WorkspaceContext)         // load workspace + membership, inject into ctx
    // subroutes for contents, ideas, series, members, etc.
})

// AI routes
r.Route("/v1/ai", func(r chi.Router) {
    r.Use(mw.RequireAuth)
    r.Use(mw.CreditCheck)              // reads subscription_tier from claims;
                                       // returns 402 if account is suspended or credits = 0
    // conversation + stateless AI endpoints
})

// Billing webhooks — no auth, but signature middleware
r.Route("/v1/billing/webhooks", func(r chi.Router) {
    r.Use(mw.StripeSignatureVerify)    // validates Stripe-Signature header
})

// WebSocket
r.Get("/v1/ws", handler.WSHandler)    // auth via JWT query param parsed in handler
```

---

## 8. Async Job Architecture

### Queue Names and Priorities

Asynq supports weighted priority queues. Configuration:

```go
asynq.Config{
    Queues: map[string]int{
        "critical": 10,   // auth emails, password resets, payment failure notifications
        "default":  5,    // analytics sync, content assignment notifications
        "low":      1,    // remix analysis, idea validation, consistency score recalc
    },
    Concurrency: 10,      // goroutines per worker process
}
```

### Job Definitions

| Task Type Constant | Queue | Description |
|--------------------|-------|-------------|
| `TypeEmailVerification` | critical | Send email verification link |
| `TypePasswordReset` | critical | Send password reset email |
| `TypePaymentFailed` | critical | Notify user of failed invoice |
| `TypeInvitationEmail` | default | Send workspace invitation email |
| `TypeContentAssignmentNotify` | default | Notify assignee of new content assignment |
| `TypeAchievementUnlock` | default | Process and notify achievement unlock |
| `TypeAnalyticsSync` | default | Fetch platform metrics for a workspace |
| `TypePartitionCreate` | default | Create next month's DB partition |
| `TypePublishPost` | default | Execute a scheduled social post |
| `TypeIdeaValidation` | low | Run AI scoring on an idea |
| `TypeRemixAnalysis` | low | Run remix job (ingest → transcribe → score → generate) |
| `TypeConsistencyScore` | low | Recalculate gamification scores for all users |
| `TypeAuditBatchWrite` | low | Flush buffered audit log entries to DB |

### Retry Policy Per Queue

```go
// critical — fast retry, fail loud
asynq.MaxRetry(3), asynq.Timeout(30 * time.Second), asynq.Retention(24 * time.Hour)

// default — moderate retry
asynq.MaxRetry(5), asynq.Timeout(2 * time.Minute), asynq.Retention(72 * time.Hour)

// low — patient retry with exponential backoff
asynq.MaxRetry(10), asynq.Timeout(10 * time.Minute), asynq.Retention(7 * 24 * time.Hour)
```

Asynq uses exponential backoff by default between retries. Dead tasks (exhausted retries) remain in the Asynq dead-letter queue (Redis sorted set `asynq:{queuename}:dead`). A Makefile target `make jobs-inspect` opens the Asynq web UI (asynqmon) for inspection.

### Scheduler Cron Entries

Managed by `job.NewAsynqScheduler` which uses `asynq.Scheduler`:

```go
scheduler.Register("0 2 * * *", asynq.NewTask(TypeAnalyticsSync, nil))
    // Daily at 02:00 UTC — triggers analytics sync for all active workspaces

scheduler.Register("0 3 * * *", asynq.NewTask(TypeConsistencyScore, nil))
    // Daily at 03:00 UTC — gamification score recalculation

scheduler.Register("0 0 1 * *", asynq.NewTask(TypePartitionCreate, nil))
    // 1st of each month at 00:00 UTC — create next month's partitions

scheduler.Register("*/5 * * * *", asynq.NewTask(TypePublishPost, nil))
    // Every 5 minutes — check for due scheduled posts and enqueue TypePublishPost per post
```

---

## 9. Configuration Architecture

### Config Struct

All configuration is loaded from environment variables via `envconfig` struct tags. No config file in production — AWS Secrets Manager injects secrets as env vars at ECS task start.

```go
// internal/config/config.go
package config

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    Storage  StorageConfig
    Auth     AuthConfig
    AI       AIConfig
    Stripe   StripeConfig
    Email    EmailConfig
}

type ServerConfig struct {
    Port            int    `envconfig:"PORT" default:"8080"`
    Env             string `envconfig:"ENV" default:"development"`  // development | staging | production
    ReadTimeout     int    `envconfig:"SERVER_READ_TIMEOUT_SEC" default:"15"`
    WriteTimeout    int    `envconfig:"SERVER_WRITE_TIMEOUT_SEC" default:"15"`
    ShutdownTimeout int    `envconfig:"SERVER_SHUTDOWN_TIMEOUT_SEC" default:"30"`
}

type DatabaseConfig struct {
    URL            string `envconfig:"DATABASE_URL" required:"true"`
    ReadReplicaURL string `envconfig:"DATABASE_READ_REPLICA_URL"` // optional; falls back to URL
    MaxConns       int    `envconfig:"DB_MAX_CONNS" default:"20"`
    MigrateOnBoot  bool   `envconfig:"DB_MIGRATE_ON_BOOT" default:"true"` // false in prod
}

type RedisConfig struct {
    URL      string `envconfig:"REDIS_URL" required:"true"`
    Password string `envconfig:"REDIS_PASSWORD"`
    DB       int    `envconfig:"REDIS_DB" default:"0"`
}

type StorageConfig struct {
    Provider  string `envconfig:"STORAGE_PROVIDER" default:"minio"` // minio | s3
    Endpoint  string `envconfig:"STORAGE_ENDPOINT"`                  // MinIO only
    Bucket    string `envconfig:"STORAGE_BUCKET" required:"true"`
    Region    string `envconfig:"STORAGE_REGION" default:"us-east-1"`
    AccessKey string `envconfig:"STORAGE_ACCESS_KEY"`
    SecretKey string `envconfig:"STORAGE_SECRET_KEY"`
}

type AuthConfig struct {
    JWTPrivateKeyPEM  string        `envconfig:"JWT_PRIVATE_KEY_PEM" required:"true"`
    JWTPublicKeyPEM   string        `envconfig:"JWT_PUBLIC_KEY_PEM" required:"true"`
    AccessTokenTTL    time.Duration `envconfig:"ACCESS_TOKEN_TTL" default:"15m"`
    RefreshTokenTTL   time.Duration `envconfig:"REFRESH_TOKEN_TTL" default:"168h"` // 7 days
    GoogleClientID    string        `envconfig:"GOOGLE_CLIENT_ID"`
    GoogleClientSecret string       `envconfig:"GOOGLE_CLIENT_SECRET"`
    GithubClientID    string        `envconfig:"GITHUB_CLIENT_ID"`
    GithubClientSecret string       `envconfig:"GITHUB_CLIENT_SECRET"`
    OAuthCallbackBase string        `envconfig:"OAUTH_CALLBACK_BASE" required:"true"`
}

type AIConfig struct {
    AnthropicAPIKey     string `envconfig:"ANTHROPIC_API_KEY" required:"true"`
    OpenAIAPIKey        string `envconfig:"OPENAI_API_KEY" required:"true"`
    DefaultClaudeModel  string `envconfig:"CLAUDE_DEFAULT_MODEL" default:"claude-3-5-sonnet-20241022"`
    DefaultOpenAIModel  string `envconfig:"OPENAI_DEFAULT_MODEL" default:"gpt-4o"`
    CreditsPerToken     int64  `envconfig:"AI_CREDITS_PER_1K_TOKENS" default:"10"`
}

type StripeConfig struct {
    SecretKey      string `envconfig:"STRIPE_SECRET_KEY" required:"true"`
    WebhookSecret  string `envconfig:"STRIPE_WEBHOOK_SECRET" required:"true"`
    ProPriceID     string `envconfig:"STRIPE_PRO_PRICE_ID"`
    EntPriceID     string `envconfig:"STRIPE_ENT_PRICE_ID"`
}

type EmailConfig struct {
    Provider   string `envconfig:"EMAIL_PROVIDER" default:"ses"` // ses | smtp
    FromAddress string `envconfig:"EMAIL_FROM" required:"true"`
    SMTPHost   string `envconfig:"SMTP_HOST"`
    SMTPPort   int    `envconfig:"SMTP_PORT" default:"587"`
    SMTPUser   string `envconfig:"SMTP_USER"`
    SMTPPass   string `envconfig:"SMTP_PASS"`
    SESRegion  string `envconfig:"SES_REGION" default:"us-east-1"`
}
```

Local dev uses `godotenv.Load(".env")` in `cmd/api/main.go`, gated by `if cfg.Server.Env == "development"`. The `.env` file is gitignored; `.env.example` is checked in with all required keys and placeholder values.

---

## 10. Testing Architecture

### testcontainers-go Setup

`tests/testutil/containers.go` provides a package-level singleton that spins up one PostgreSQL and one Redis container per test binary invocation (not per test):

```go
package testutil

type TestContainers struct {
    PgDSN    string
    RedisDSN string
    cleanup  func()
}

var containers *TestContainers
var containersOnce sync.Once

func GetTestContainers(t testing.TB) *TestContainers {
    containersOnce.Do(func() {
        pg, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
            ContainerRequest: testcontainers.ContainerRequest{
                Image:        "postgres:16-alpine",
                Env:          map[string]string{"POSTGRES_PASSWORD": "test", ...},
                ExposedPorts: []string{"5432/tcp"},
                WaitingFor:   wait.ForListeningPort("5432/tcp"),
            },
            Started: true,
        })
        // similar for Redis
        containers = &TestContainers{PgDSN: ..., RedisDSN: ...}
    })
    t.Cleanup(containers.cleanup)
    return containers
}
```

### `testutil.NewTestApp()`

```go
// NewTestApp returns a fully wired *server.Server backed by testcontainers.
// The DB is migrated and seeded from the fixture path if provided.
func NewTestApp(t testing.TB, fixture string) *TestApp {
    tc := GetTestContainers(t)
    cfg := testConfig(tc.PgDSN, tc.RedisDSN)

    // Run migrations against the test DB
    RunMigrations(t, tc.PgDSN)

    // Optionally seed fixtures
    if fixture != "" {
        SeedFixture(t, tc.PgDSN, fixture)
    }

    app, cleanup, err := InitializeApp(cfg) // Wire-generated
    require.NoError(t, err)
    t.Cleanup(cleanup)

    return &TestApp{Server: app, DB: tc.PgDSN, Redis: tc.RedisDSN}
}
```

Each integration test file calls `testutil.NewTestApp(t, "auth")` (or the relevant fixture name). Tests run against the real containers; no mocking at the DB level for integration tests.

### SQL Seed Fixtures

`tests/fixtures/` contains one SQL file per module:

```
tests/fixtures/
  auth.sql       — seed users, sessions
  workspace.sql  — seed workspaces, members
  content.sql    — seed ideas, contents, series
  ai.sql         — seed conversations, credit balances
  analytics.sql  — seed analytics data
  billing.sql    — seed users with stripe_customer_id
```

### Mock Generation

`mockery` generates mocks for all interfaces defined in `internal/repository/interfaces.go` and `internal/service/interfaces.go`. Command:

```bash
mockery --dir=internal/repository --name=".*Repository" --output=tests/mocks/repository --outpkg=mockrepo
mockery --dir=internal/service --name=".*Service" --output=tests/mocks/service --outpkg=mocksvc
mockery --dir=internal/ai --name="AIProvider" --output=tests/mocks/ai --outpkg=mockai
```

A `make mocks` Makefile target runs all three. Mocks are committed to the repository (not gitignored) — they are regenerated only when interfaces change.

Unit tests (handler layer, service logic that doesn't need DB) use `mockrepo` and `mocksvc`. Integration tests use `testutil.NewTestApp` with real containers.

### Table-Driven Test Conventions

```go
func TestAuthService_Login(t *testing.T) {
    app := testutil.NewTestApp(t, "auth")

    tests := []struct {
        name    string
        email   string
        password string
        wantErr string // empty string = expect success; otherwise expect AppError.Code
    }{
        {name: "valid credentials", email: "user@example.com", password: "correct", wantErr: ""},
        {name: "wrong password",   email: "user@example.com", password: "wrong",   wantErr: "AUTH_001"},
        {name: "unknown email",    email: "no@example.com",   password: "any",     wantErr: "AUTH_001"},
        {name: "unverified email", email: "unverified@example.com", password: "pw", wantErr: "AUTH_006"},
    }

    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            tokens, err := app.AuthService.Login(context.Background(), tc.email, tc.password)
            if tc.wantErr != "" {
                var appErr *apperr.AppError
                require.ErrorAs(t, err, &appErr)
                assert.Equal(t, tc.wantErr, appErr.Code)
            } else {
                require.NoError(t, err)
                assert.NotEmpty(t, tokens.AccessToken)
            }
        })
    }
}
```

All integration test packages are tagged with `//go:build integration` and run separately from unit tests:
- `go test ./...` — unit tests only (fast, no containers)
- `go test -tags integration ./...` — all tests (requires Docker)

---

## Appendix: Key Third-Party Library Decisions

| Concern | Library | Rationale |
|---------|---------|-----------|
| HTTP router | `github.com/go-chi/chi/v5` | Lightweight, stdlib-compatible, excellent middleware support |
| DB pool | `github.com/jackc/pgx/v5/pgxpool` | Fastest PG driver; supports LISTEN/NOTIFY; pgx v5 is stable |
| Query codegen | `sqlc` | Type-safe SQL; eliminates string interpolation bugs; schema is truth |
| Migrations | `github.com/golang-migrate/migrate/v4` | SQL-first, supports both up/down files, integrates with pgx |
| DI | `github.com/google/wire` | Compile-time DI graph; no runtime reflection; errors are Go compile errors |
| Async jobs | `github.com/hibiken/asynq` | Redis-backed; battle-tested; built-in scheduler; asynqmon web UI |
| UUID v7 | `github.com/gofrs/uuid/v5` | Only major Go UUID library with v7 support as of 2025 |
| JWT | `github.com/golang-jwt/jwt/v5` | RS256 support; actively maintained |
| Logging | `github.com/rs/zerolog` | Zero-allocation structured logging; request ID propagation |
| Metrics | `github.com/prometheus/client_golang` | Standard Prometheus instrumentation |
| WebSocket | `github.com/gorilla/websocket` | Most widely used; read/write pump pattern well-documented |
| Config | `github.com/kelseyhightower/envconfig` | Clean struct tag binding; no YAML required |
| Test containers | `github.com/testcontainers/testcontainers-go` | Real DB/Redis in CI; no mock divergence |
| Mock gen | `github.com/vektra/mockery/v2` | Interface-based mock generation; integrates with testify |
| Stripe | `github.com/stripe/stripe-go/v78` | Official SDK |
| OAuth2 | `golang.org/x/oauth2` | Standard library; PKCE support |
| Crypto | stdlib `crypto/aes` + `crypto/cipher` | AES-256-GCM for platform credential encryption |

---

*Generated by sdd-design | Ordo Creator OS | 2026-03-10*
