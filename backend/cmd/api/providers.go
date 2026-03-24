package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"log/slog"
	"os"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/ai"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/cache"
	"github.com/ordo/creators-os/internal/config"
	"github.com/ordo/creators-os/internal/database"
	"github.com/ordo/creators-os/internal/handler"
	applogger "github.com/ordo/creators-os/internal/logger"
	"github.com/ordo/creators-os/internal/metrics"
	"github.com/ordo/creators-os/internal/repository"
	"github.com/ordo/creators-os/internal/server"
	"github.com/ordo/creators-os/internal/service"
	"github.com/ordo/creators-os/internal/storage"
	appws "github.com/ordo/creators-os/internal/ws"
	"github.com/redis/go-redis/v9"
)

// provideConfig loads and validates application configuration.
func provideConfig() (*config.Config, error) {
	return config.Load()
}

// provideLogger initializes the global structured slog logger.
func provideLogger(cfg *config.Config) *slog.Logger {
	return applogger.New(cfg.LogLevel, cfg.LogFormat, cfg.IsDevelopment())
}

// provideDB creates the PostgreSQL connection pool.
func provideDB(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	return database.NewPool(ctx, cfg.DatabaseURL)
}

// provideRedis creates the Redis client.
func provideRedis(ctx context.Context, cfg *config.Config) (*redis.Client, error) {
	return cache.NewClient(ctx, cfg.RedisURL)
}

// provideStorage creates the appropriate storage client based on config.
func provideStorage(ctx context.Context, cfg *config.Config) (storage.StorageClient, error) {
	return storage.NewClient(ctx, cfg)
}

// provideHealthHandler creates the health check HTTP handler.
func provideHealthHandler(db *pgxpool.Pool, redisClient *redis.Client) *handler.HealthHandler {
	return handler.NewHealthHandler(db, redisClient, "1.0.0")
}

// provideJWTManager loads the RS256 key pair from paths in config,
// or generates an ephemeral key pair in non-production environments.
func provideJWTManager(cfg *config.Config, logger *slog.Logger) (*auth.JWTManager, error) {
	if cfg.JWTPrivateKeyPath != "" && cfg.JWTPublicKeyPath != "" {
		privPEM, err := os.ReadFile(cfg.JWTPrivateKeyPath)
		if err != nil {
			return nil, err
		}
		pubPEM, err := os.ReadFile(cfg.JWTPublicKeyPath)
		if err != nil {
			return nil, err
		}
		return auth.NewJWTManager(privPEM, pubPEM)
	}

	logger.Warn("JWT key paths not configured — generating ephemeral key pair (NOT for production)")
	return generateEphemeralJWTManager()
}

// generateEphemeralJWTManager creates a temporary RSA-2048 key pair for development.
func generateEphemeralJWTManager() (*auth.JWTManager, error) {
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}

	privDER, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return nil, err
	}
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privDER})

	pubDER, err := x509.MarshalPKIXPublicKey(&priv.PublicKey)
	if err != nil {
		return nil, err
	}
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})

	return auth.NewJWTManager(privPEM, pubPEM)
}

// provideOAuthManager creates the OAuthManager.
// OAuth provider credentials are optional; omit them if not used.
func provideOAuthManager(cfg *config.Config, redisClient *redis.Client) *auth.OAuthManager {
	return auth.NewOAuthManager(
		redisClient,
		cfg.AppEnv,
		cfg.OAuthGoogleClientID,
		cfg.OAuthGoogleClientSecret,
		cfg.OAuthGithubClientID,
		cfg.OAuthGithubClientSecret,
		cfg.OAuthRedirectBaseURL,
	)
}

// provideAsynqClient creates the Asynq task queue client.
func provideAsynqClient(redisClient *redis.Client) *asynq.Client {
	opts := redisClient.Options()
	return asynq.NewClient(asynq.RedisClientOpt{
		Addr:     opts.Addr,
		Password: opts.Password,
		DB:       opts.DB,
	})
}

// provideRepositories creates the repository layer instances.
func provideRepositories(db *pgxpool.Pool, c *cache.Cache) (repository.UserRepository, repository.SessionRepository) {
	return repository.NewUserRepository(db, c), repository.NewSessionRepository(db)
}

// provideWorkspaceRepositories creates the workspace and invitation repository instances.
func provideWorkspaceRepositories(db *pgxpool.Pool, c *cache.Cache) (repository.WorkspaceRepository, repository.InvitationRepository) {
	return repository.NewWorkspaceRepository(db, c), repository.NewInvitationRepository(db)
}

// provideContentRepositories creates the idea, content, and series repository instances.
func provideContentRepositories(db *pgxpool.Pool) (repository.IdeaRepository, repository.ContentRepository, repository.SeriesRepository) {
	return repository.NewIdeaRepository(db), repository.NewContentRepository(db), repository.NewSeriesRepository(db)
}

// provideIdeaService creates the IdeaService.
func provideIdeaService(
	ideaRepo repository.IdeaRepository,
	contentRepo repository.ContentRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) service.IdeaService {
	return service.NewIdeaService(ideaRepo, contentRepo, asynqClient, logger)
}

// provideContentService creates the ContentService.
func provideContentService(
	contentRepo repository.ContentRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) service.ContentService {
	return service.NewContentService(contentRepo, asynqClient, logger)
}

// provideSeriesService creates the SeriesService.
func provideSeriesService(
	seriesRepo repository.SeriesRepository,
	logger *slog.Logger,
) service.SeriesService {
	return service.NewSeriesService(seriesRepo, logger)
}

// provideIdeaHandler creates the idea HTTP handler.
func provideIdeaHandler(ideaSvc service.IdeaService) *handler.IdeaHandler {
	return handler.NewIdeaHandler(ideaSvc)
}

// provideContentHandler creates the content HTTP handler.
func provideContentHandler(contentSvc service.ContentService) *handler.ContentHandler {
	return handler.NewContentHandler(contentSvc)
}

// provideSeriesHandler creates the series HTTP handler.
func provideSeriesHandler(seriesSvc service.SeriesService) *handler.SeriesHandler {
	return handler.NewSeriesHandler(seriesSvc)
}

// provideUploadHandler creates the upload HTTP handler.
// Returns nil if storageClient is nil (storage not configured).
func provideUploadHandler(storageClient storage.StorageClient) *handler.UploadHandler {
	if storageClient == nil {
		return nil
	}
	return handler.NewUploadHandler(storageClient)
}

// provideWorkspaceService creates the WorkspaceService.
func provideWorkspaceService(
	wsRepo repository.WorkspaceRepository,
	invRepo repository.InvitationRepository,
	userRepo repository.UserRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) service.WorkspaceService {
	return service.NewWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, logger)
}

// provideWorkspaceHandler creates the workspace HTTP handler.
func provideWorkspaceHandler(wsService service.WorkspaceService) *handler.WorkspaceHandler {
	return handler.NewWorkspaceHandler(wsService)
}

// provideAuthService creates the AuthService.
func provideAuthService(
	userRepo repository.UserRepository,
	sessionRepo repository.SessionRepository,
	jwtManager *auth.JWTManager,
	asynqClient *asynq.Client,
	oauthMgr *auth.OAuthManager,
	logger *slog.Logger,
) service.AuthService {
	return service.NewAuthService(userRepo, sessionRepo, jwtManager, asynqClient, oauthMgr, logger)
}

// provideAuthHandler creates the auth HTTP handler.
func provideAuthHandler(authSvc service.AuthService, jwtManager *auth.JWTManager, oauthMgr *auth.OAuthManager) *handler.AuthHandler {
	return handler.NewAuthHandler(authSvc, jwtManager, oauthMgr)
}

// provideUserHandler creates the user HTTP handler.
func provideUserHandler(userRepo repository.UserRepository) *handler.UserHandler {
	return handler.NewUserHandler(userRepo)
}

// provideRouter creates the Chi router with all middleware and routes.
func provideRouter(
	cfg *config.Config,
	redisClient *redis.Client,
	healthHandler *handler.HealthHandler,
	authHandler *handler.AuthHandler,
	userHandler *handler.UserHandler,
	workspaceHandler *handler.WorkspaceHandler,
	jwtManager *auth.JWTManager,
	wsRepo repository.WorkspaceRepository,
	ideaHandler *handler.IdeaHandler,
	contentHandler *handler.ContentHandler,
	seriesHandler *handler.SeriesHandler,
	uploadHandler *handler.UploadHandler,
	aiHandler *handler.AIHandler,
	remixHandler *handler.RemixHandler,
	publishingHandler *handler.PublishingHandler,
	analyticsHandler *handler.AnalyticsHandler,
	gamificationHandler *handler.GamificationHandler,
	sponsorshipHandler *handler.SponsorshipHandler,
	billingHandler *handler.BillingHandler,
	wsHandler *handler.WSHandler,
	searchHandler *handler.SearchHandler,
	auditHandler *handler.AuditHandler,
	contentTemplateHandler *handler.ContentTemplateHandler,
) *server.Server {
	router := server.NewRouter(cfg, redisClient, healthHandler, authHandler, userHandler, workspaceHandler, jwtManager, wsRepo,
		ideaHandler, contentHandler, seriesHandler, uploadHandler, aiHandler, remixHandler,
		publishingHandler, analyticsHandler, gamificationHandler, sponsorshipHandler, billingHandler, wsHandler,
		searchHandler, auditHandler, contentTemplateHandler)
	return server.NewServer(cfg.ServerPort, router)
}

// providePublishingRepositories creates the publishing, analytics, gamification, and sponsorship repositories.
func providePublishingRepositories(db *pgxpool.Pool) (
	repository.PublishingRepository,
	repository.AnalyticsRepository,
	repository.GamificationRepository,
	repository.SponsorshipRepository,
) {
	return repository.NewPublishingRepository(db),
		repository.NewAnalyticsRepository(db),
		repository.NewGamificationRepository(db),
		repository.NewSponsorshipRepository(db)
}

// providePublishingService creates the PublishingService.
func providePublishingService(
	repo repository.PublishingRepository,
	cfg *config.Config,
	logger *slog.Logger,
) service.PublishingService {
	key := []byte(cfg.AESEncryptionKey)
	// Pad or truncate to 32 bytes for AES-256.
	if len(key) < 32 {
		padded := make([]byte, 32)
		copy(padded, key)
		key = padded
	} else if len(key) > 32 {
		key = key[:32]
	}
	return service.NewPublishingService(repo, key, logger)
}

// provideAnalyticsService creates the AnalyticsService.
func provideAnalyticsService(
	repo repository.AnalyticsRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) service.AnalyticsService {
	return service.NewAnalyticsService(repo, asynqClient, logger)
}

// provideGamificationService creates the GamificationService.
func provideGamificationService(
	repo repository.GamificationRepository,
	userRepo repository.UserRepository,
	logger *slog.Logger,
) service.GamificationService {
	return service.NewGamificationService(repo, userRepo, logger)
}

// provideSponsorshipService creates the SponsorshipService.
func provideSponsorshipService(
	repo repository.SponsorshipRepository,
	logger *slog.Logger,
) service.SponsorshipService {
	return service.NewSponsorshipService(repo, logger)
}

// provideBillingService creates the BillingService.
func provideBillingService(
	cfg *config.Config,
	userRepo repository.UserRepository,
	redisClient *redis.Client,
	logger *slog.Logger,
) service.BillingService {
	return service.NewBillingService(cfg.StripeSecretKey, cfg.StripeWebhookSecret, userRepo, redisClient, logger)
}

// providePublishingHandler creates the publishing HTTP handler.
func providePublishingHandler(svc service.PublishingService) *handler.PublishingHandler {
	return handler.NewPublishingHandler(svc)
}

// provideAnalyticsHandler creates the analytics HTTP handler.
func provideAnalyticsHandler(svc service.AnalyticsService) *handler.AnalyticsHandler {
	return handler.NewAnalyticsHandler(svc)
}

// provideGamificationHandler creates the gamification HTTP handler.
func provideGamificationHandler(svc service.GamificationService) *handler.GamificationHandler {
	return handler.NewGamificationHandler(svc)
}

// provideSponsorshipHandler creates the sponsorship HTTP handler.
func provideSponsorshipHandler(svc service.SponsorshipService) *handler.SponsorshipHandler {
	return handler.NewSponsorshipHandler(svc)
}

// provideBillingHandler creates the billing HTTP handler.
func provideBillingHandler(svc service.BillingService) *handler.BillingHandler {
	return handler.NewBillingHandler(svc)
}

// provideWSHub creates and starts the WebSocket hub.
func provideWSHub() *appws.Hub {
	hub := appws.NewHub()
	go hub.Run()
	return hub
}

// provideWSHandler creates the WebSocket upgrade handler.
func provideWSHandler(hub *appws.Hub, jwtManager *auth.JWTManager) *handler.WSHandler {
	return handler.NewWSHandler(hub, jwtManager)
}

// provideMetricsServer creates the separate Prometheus metrics HTTP server.
func provideMetricsServer(cfg *config.Config) *metrics.MetricsServer {
	return metrics.NewMetricsServer(cfg.MetricsPort)
}

// provideAIRouter creates the AI router with Claude as primary and OpenAI as fallback.
func provideAIRouter(cfg *config.Config) *ai.Router {
	claudeProvider := ai.NewClaudeProvider(cfg.AIClaudeAPIKey, "")
	openAIProvider := ai.NewOpenAIProvider(cfg.AIOpenAIAPIKey, "")
	return ai.NewRouter(claudeProvider, openAIProvider)
}

// provideAIRepositories creates the AI and Remix repository instances.
func provideAIRepositories(db *pgxpool.Pool) (repository.AIRepository, repository.RemixRepository) {
	return repository.NewAIRepository(db), repository.NewRemixRepository(db)
}

// provideAIService creates the AIService.
func provideAIService(
	aiRouter *ai.Router,
	aiRepo repository.AIRepository,
	userRepo repository.UserRepository,
	contentRepo repository.ContentRepository,
	logger *slog.Logger,
) service.AIService {
	return service.NewAIService(aiRouter, aiRepo, userRepo, contentRepo, logger)
}

// provideRemixService creates the RemixService.
func provideRemixService(
	remixRepo repository.RemixRepository,
	contentRepo repository.ContentRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) service.RemixService {
	return service.NewRemixService(remixRepo, contentRepo, asynqClient, logger)
}

// provideAIHandler creates the AI HTTP handler.
func provideAIHandler(aiSvc service.AIService, aiRepo repository.AIRepository, userRepo repository.UserRepository) *handler.AIHandler {
	return handler.NewAIHandler(aiSvc, aiRepo, userRepo)
}

// provideRemixHandler creates the Remix Engine HTTP handler.
func provideRemixHandler(remixSvc service.RemixService) *handler.RemixHandler {
	return handler.NewRemixHandler(remixSvc)
}

// provideCache creates the application-level Redis cache wrapper.
func provideCache(redisClient *redis.Client, cfg *config.Config) *cache.Cache {
	return cache.NewCache(redisClient, cfg.AppEnv)
}

// provideSearchHandler creates the search HTTP handler.
func provideSearchHandler(db *pgxpool.Pool) *handler.SearchHandler {
	searchRepo := repository.NewSearchRepository(db)
	searchSvc := service.NewSearchService(searchRepo)
	return handler.NewSearchHandler(searchSvc)
}

// provideAuditService creates and returns the AuditService.
// Call auditService.Start(ctx) in main after construction.
func provideAuditService(db *pgxpool.Pool, logger *slog.Logger) *service.AuditService {
	return service.NewAuditService(db, logger)
}

// provideAuditHandler creates the audit log HTTP handler.
func provideAuditHandler(db *pgxpool.Pool) *handler.AuditHandler {
	return handler.NewAuditHandler(db)
}

// provideContentTemplateRepository creates the ContentTemplateRepository.
func provideContentTemplateRepository(db *pgxpool.Pool) repository.ContentTemplateRepository {
	return repository.NewContentTemplateRepository(db)
}

// provideContentTemplateService creates the ContentTemplateService.
func provideContentTemplateService(
	templateRepo repository.ContentTemplateRepository,
	contentRepo repository.ContentRepository,
	aiSvc service.AIService,
	logger *slog.Logger,
) service.ContentTemplateService {
	return service.NewContentTemplateService(templateRepo, contentRepo, aiSvc, logger)
}

// provideContentTemplateHandler creates the content template HTTP handler.
func provideContentTemplateHandler(templateSvc service.ContentTemplateService) *handler.ContentTemplateHandler {
	return handler.NewContentTemplateHandler(templateSvc)
}
