package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/job"
	"github.com/ordo/creators-os/internal/job/tasks"
	"github.com/ordo/creators-os/internal/metrics"
)

func main() {
	ctx := context.Background()

	// --- Configuration ---
	cfg, err := provideConfig()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}

	// --- Logger ---
	log := provideLogger(cfg)
	log.Info("starting Ordo Creator OS API", "env", cfg.AppEnv, "port", cfg.ServerPort)

	// --- Database ---
	db, err := provideDB(ctx, cfg)
	if err != nil {
		log.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer db.Close()
	log.Info("connected to database")

	// --- Redis ---
	redisClient, err := provideRedis(ctx, cfg)
	if err != nil {
		log.Error("failed to connect to redis", "err", err)
		os.Exit(1)
	}
	defer redisClient.Close()
	log.Info("connected to redis")

	// --- JWT Manager ---
	jwtManager, err := provideJWTManager(cfg, log)
	if err != nil {
		log.Error("failed to initialize JWT manager", "err", err)
		os.Exit(1)
	}

	// --- OAuth Manager ---
	oauthManager := provideOAuthManager(cfg, redisClient)

	// --- Asynq Client ---
	asynqClient := provideAsynqClient(redisClient)
	defer asynqClient.Close()

	// --- Cache ---
	appCache := provideCache(redisClient, cfg)

	// --- Repositories ---
	userRepo, sessionRepo := provideRepositories(db, appCache)
	wsRepo, invRepo := provideWorkspaceRepositories(db, appCache)
	ideaRepo, contentRepo, seriesRepo := provideContentRepositories(db)
	aiRepo, remixRepo := provideAIRepositories(db)
	publishingRepo, analyticsRepo, gamificationRepo, sponsorshipRepo := providePublishingRepositories(db)

	// --- Services ---
	authSvc := provideAuthService(userRepo, sessionRepo, jwtManager, asynqClient, oauthManager, log)
	wsSvc := provideWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, log)
	ideaSvc := provideIdeaService(ideaRepo, contentRepo, asynqClient, log)
	contentSvc := provideContentService(contentRepo, asynqClient, log)
	seriesSvc := provideSeriesService(seriesRepo, log)
	publishingSvc := providePublishingService(publishingRepo, cfg, log)
	analyticsSvc := provideAnalyticsService(analyticsRepo, asynqClient, log)
	gamificationSvc := provideGamificationService(gamificationRepo, userRepo, log)
	sponsorshipSvc := provideSponsorshipService(sponsorshipRepo, log)
	billingSvc := provideBillingService(cfg, userRepo, redisClient, log)

	// --- AI providers ---
	aiRouter := provideAIRouter(cfg)
	aiSvc := provideAIService(aiRouter, aiRepo, userRepo, contentRepo, log)
	remixSvc := provideRemixService(remixRepo, contentRepo, asynqClient, log)

	// --- WebSocket Hub ---
	wsHub := provideWSHub()

	// --- Storage ---
	storageClient, err := provideStorage(ctx, cfg)
	if err != nil {
		log.Error("failed to initialize storage client", "err", err)
		// Non-fatal: upload handler will fail gracefully
	} else {
		log.Info("storage client initialized", "backend", cfg.StorageBackend)
	}

	// --- Phase 6: Audit service ---
	auditSvc := provideAuditService(db, log)
	auditSvc.Start(ctx)

	// --- Handlers ---
	healthHandler := provideHealthHandler(db, redisClient)
	authHandler := provideAuthHandler(authSvc, jwtManager, oauthManager)
	userHandler := provideUserHandler(userRepo)
	workspaceHandler := provideWorkspaceHandler(wsSvc)
	ideaHandler := provideIdeaHandler(ideaSvc)
	contentHandler := provideContentHandler(contentSvc)
	seriesHandler := provideSeriesHandler(seriesSvc)
	uploadHandler := provideUploadHandler(storageClient)
	aiHandler := provideAIHandler(aiSvc, aiRepo, userRepo)
	remixHandler := provideRemixHandler(remixSvc)
	publishingHandler := providePublishingHandler(publishingSvc)
	analyticsHandler := provideAnalyticsHandler(analyticsSvc)
	gamificationHandler := provideGamificationHandler(gamificationSvc)
	sponsorshipHandler := provideSponsorshipHandler(sponsorshipSvc)
	billingHandler := provideBillingHandler(billingSvc)
	wsHandlerHTTP := provideWSHandler(wsHub, jwtManager)
	searchHandler := provideSearchHandler(db)
	auditHandler := provideAuditHandler(db)

	// --- Asynq Worker ---
	worker := job.NewWorker(redisClient, log)
	mux := asynq.NewServeMux()
	// Email tasks
	mux.HandleFunc(tasks.TypeEmailVerification, tasks.HandleEmailVerificationTask)
	mux.HandleFunc(tasks.TypePasswordReset, tasks.HandlePasswordResetTask)
	mux.HandleFunc(tasks.TypeInvitation, tasks.HandleInvitationTask)
	// Notification tasks
	mux.HandleFunc(tasks.TypeAssignmentNotification, tasks.HandleAssignmentNotificationTask)
	// Idea validation task
	ideaValidationHandler := &tasks.IdeaValidationHandler{IdeaRepo: ideaRepo, AIRouter: aiRouter}
	mux.HandleFunc(tasks.TypeIdeaValidation, ideaValidationHandler.HandleIdeaValidationTask)
	// Remix worker
	mux.HandleFunc(tasks.TypeRemixAnalysis, tasks.MakeHandleRemixAnalysisTask(remixRepo, aiRouter))
	// Publish worker
	mux.HandleFunc(tasks.TypePublishPost, tasks.NewPublishTaskHandler(db))
	// Analytics sync worker
	mux.HandleFunc(tasks.TypeAnalyticsSync, tasks.NewAnalyticsSyncHandler(db))
	// Weekly digest email handler
	mux.HandleFunc(tasks.TypeWeeklyDigest, tasks.NewWeeklyDigestHandler(db))
	// Publish scheduler handler — triggered every minute to enqueue due posts
	mux.HandleFunc("publish:scheduler", func(ctx context.Context, t *asynq.Task) error {
		return tasks.HandlePublishScheduler(ctx, t, db, asynqClient)
	})

	go func() {
		if err := worker.Run(mux); err != nil {
			log.Error("asynq worker error", "err", err)
		}
	}()

	// --- Asynq Scheduler ---
	scheduler := job.NewScheduler(redisClient)
	// Daily analytics sync at 02:00 UTC
	if _, err := scheduler.Register("0 2 * * *", asynq.NewTask(tasks.TypeAnalyticsSync, nil)); err != nil {
		log.Error("failed to register analytics sync scheduler", "err", err)
	}
	// Publish scheduler every minute
	publishSchedulerTask := asynq.NewTask("publish:scheduler", nil)
	if _, err := scheduler.Register("* * * * *", publishSchedulerTask); err != nil {
		log.Error("failed to register publish scheduler", "err", err)
	}
	// Weekly digest email — every Sunday at 18:00 UTC
	if _, err := scheduler.Register("0 18 * * 0", asynq.NewTask(tasks.TypeWeeklyDigest, nil)); err != nil {
		log.Error("failed to register weekly digest scheduler", "err", err)
	}

	go func() {
		if err := scheduler.Run(); err != nil {
			log.Error("asynq scheduler error", "err", err)
		}
	}()

	// --- Metrics ---
	metrics.Init()
	metricsServer := provideMetricsServer(cfg)
	go func() {
		if err := metricsServer.Start(); err != nil {
			log.Error("metrics server error", "err", err)
		}
	}()

	// --- HTTP Server ---
	apiServer := provideRouter(cfg, redisClient, healthHandler, authHandler, userHandler, workspaceHandler, jwtManager, wsRepo,
		ideaHandler, contentHandler, seriesHandler, uploadHandler, aiHandler, remixHandler,
		publishingHandler, analyticsHandler, gamificationHandler, sponsorshipHandler, billingHandler, wsHandlerHTTP,
		searchHandler, auditHandler)

	// Start API server in background
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- apiServer.Start(ctx)
	}()

	// --- Graceful shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	select {
	case sig := <-quit:
		log.Info("received shutdown signal", "signal", sig.String())
	case err := <-serverErr:
		if err != nil {
			log.Error("server error", "err", err)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := apiServer.Shutdown(shutdownCtx); err != nil {
		log.Error("graceful shutdown failed", "err", err)
		os.Exit(1)
	}

	if err := metricsServer.Shutdown(shutdownCtx); err != nil {
		log.Warn("metrics server shutdown error", "err", err)
	}

	worker.Shutdown()
	scheduler.Shutdown()

	log.Info("server stopped cleanly")
}
