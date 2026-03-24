package server

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/config"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/handler"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/repository"
	"github.com/redis/go-redis/v9"
)

// NewRouter creates and returns the root chi.Router with the full middleware
// stack and all routes registered.
//
// Middleware order (applied globally):
//  1. RequestID    — generates X-Request-ID header
//  2. RealIP       — populates RemoteAddr from X-Forwarded-For / X-Real-IP
//  3. RequestLogger — structured slog request/response logging
//  4. Recoverer    — catches panics, returns 500
//  5. CORS         — cross-origin resource sharing
//  6. Timeout(30s) — global request timeout
func NewRouter(
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
) chi.Router {
	r := chi.NewRouter()

	// --- Global middleware ---
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.SecurityHeaders(cfg.AppEnv))
	r.Use(middleware.RequestLogger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(chimiddleware.Timeout(30 * time.Second))
	r.Use(middleware.MetricsMiddleware)

	// --- Health / readiness endpoints ---
	r.Get("/health", healthHandler.ServeHTTP)
	r.Get("/ready", healthHandler.ServeHTTP)

	// --- API v1 sub-router ---
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"message":"pong"}`))
		})

		// Auth routes — rate limited at 5 req/min
		r.Route("/auth", func(r chi.Router) {
			r.Use(middleware.RateLimiter(redisClient, cfg.AppEnv, 5, time.Minute))
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
			r.With(middleware.Authenticate(jwtManager)).Post("/logout-all", authHandler.LogoutAll)
			r.Post("/forgot-password", authHandler.ForgotPassword)
			r.Post("/reset-password", authHandler.ResetPassword)
			r.Get("/verify-email", authHandler.VerifyEmail)
			r.Get("/oauth/{provider}", authHandler.OAuthRedirect)
			r.Get("/oauth/{provider}/callback", authHandler.OAuthCallback)
		})

		// User routes — require authentication
		r.Route("/users", func(r chi.Router) {
			r.Use(middleware.Authenticate(jwtManager))
			r.Get("/me", userHandler.GetMe)
			r.Put("/me", userHandler.UpdateMe)
			// AI credit balance
			if aiHandler != nil {
				r.Get("/me/ai/credits", aiHandler.GetCreditBalance)
			}
		})

		// Workspace routes — require authentication
		r.Route("/workspaces", func(r chi.Router) {
			r.Use(middleware.Authenticate(jwtManager))
			r.Post("/", workspaceHandler.Create)
			r.Get("/", workspaceHandler.List)
			r.Route("/{workspaceId}", func(r chi.Router) {
				r.Use(middleware.RequireWorkspaceMember(wsRepo))
				r.Get("/", workspaceHandler.Get)
				// Update workspace — admin or owner
				r.With(middleware.RequireRole(domain.RoleAdmin)).Put("/", workspaceHandler.Update)
				// Delete workspace — owner only
				r.With(middleware.RequireRole(domain.RoleOwner)).Delete("/", workspaceHandler.Delete)

				// Member management
				r.Get("/members", workspaceHandler.ListMembers)
				r.With(middleware.RequireRole(domain.RoleAdmin)).Put("/members/{userId}/role", workspaceHandler.UpdateMemberRole)
				r.With(middleware.RequireRole(domain.RoleAdmin)).Delete("/members/{userId}", workspaceHandler.RemoveMember)

				// Invitation management
				r.With(middleware.RequireRole(domain.RoleAdmin)).Post("/invitations", workspaceHandler.InviteMember)
				r.With(middleware.RequireRole(domain.RoleAdmin)).Get("/invitations", workspaceHandler.ListInvitations)
				r.With(middleware.RequireRole(domain.RoleAdmin)).Delete("/invitations/{id}", workspaceHandler.DeleteInvitation)

				// Ideas
				if ideaHandler != nil {
					r.Route("/ideas", func(r chi.Router) {
						r.Post("/", ideaHandler.Create)
						r.Get("/", ideaHandler.List)
						r.Route("/{ideaId}", func(r chi.Router) {
							r.Get("/", ideaHandler.Get)
							r.Put("/", ideaHandler.Update)
							r.Delete("/", ideaHandler.Delete)
							r.Post("/validate", ideaHandler.RequestValidation)
							r.Put("/tags", ideaHandler.SetTags)
							r.Post("/promote", ideaHandler.Promote)
						})
					})
				}

				// Contents
				if contentHandler != nil {
					r.Route("/contents", func(r chi.Router) {
						r.With(middleware.TieredRateLimiter(redisClient, cfg.AppEnv, "content_writes", middleware.DefaultTierLimits["content_writes"])).Post("/", contentHandler.Create)
						r.Get("/", contentHandler.List)
						r.Route("/{contentId}", func(r chi.Router) {
							r.Get("/", contentHandler.Get)
							r.With(middleware.TieredRateLimiter(redisClient, cfg.AppEnv, "content_writes", middleware.DefaultTierLimits["content_writes"])).Put("/", contentHandler.Update)
							r.With(middleware.TieredRateLimiter(redisClient, cfg.AppEnv, "content_writes", middleware.DefaultTierLimits["content_writes"])).Delete("/", contentHandler.Delete)
							r.Put("/status", contentHandler.TransitionStatus)
							r.Post("/assignments", contentHandler.AddAssignment)
							r.Delete("/assignments/{userId}", contentHandler.RemoveAssignment)
						})
					})
				}

				// Series
				if seriesHandler != nil {
					r.Route("/series", func(r chi.Router) {
						r.Post("/", seriesHandler.Create)
						r.Get("/", seriesHandler.List)
						r.Route("/{seriesId}", func(r chi.Router) {
							r.Get("/", seriesHandler.Get)
							r.Put("/", seriesHandler.Update)
							r.Delete("/", seriesHandler.Delete)
							r.Post("/episodes", seriesHandler.AddEpisode)
							r.Route("/episodes/{epId}", func(r chi.Router) {
								r.Put("/", seriesHandler.UpdateEpisode)
								r.Delete("/", seriesHandler.DeleteEpisode)
							})
							r.Put("/schedule", seriesHandler.UpsertSchedule)
						})
					})
				}

				// Search
				if searchHandler != nil {
					r.Get("/search", searchHandler.Search)
				}

				// Audit logs — owner/admin only
				if auditHandler != nil {
					r.Get("/audit-logs", auditHandler.ListAuditLogs)
				}

				// AI Studio routes
				if aiHandler != nil {
					r.Route("/ai", func(r chi.Router) {
						r.Use(middleware.CreditCheck(redisClient, cfg.AppEnv))
						r.Use(middleware.TieredRateLimiter(redisClient, cfg.AppEnv, "ai_messages", middleware.DefaultTierLimits["ai_messages"]))
						r.Post("/conversations", aiHandler.CreateConversation)
						r.Get("/conversations", aiHandler.ListConversations)
						r.Route("/conversations/{convId}", func(r chi.Router) {
							r.Get("/", aiHandler.GetConversation)
							r.Delete("/", aiHandler.DeleteConversation)
							r.Post("/messages", aiHandler.SendMessage)
						})
						r.Post("/brainstorm", aiHandler.Brainstorm)
						r.Post("/script-generate", aiHandler.GenerateScript)
						r.Post("/atomize", aiHandler.Atomize)
					})
				}

				// Remix Engine routes
				if remixHandler != nil {
					r.Route("/remix", func(r chi.Router) {
						r.Post("/analyze", remixHandler.SubmitAnalysis)
						r.Route("/{jobId}", func(r chi.Router) {
							r.Get("/status", remixHandler.GetJobStatus)
							r.Get("/results", remixHandler.GetJobResults)
							r.Post("/apply", remixHandler.ApplyResults)
						})
					})
				}

				// Publishing routes
				if publishingHandler != nil {
					r.Route("/publishing", func(r chi.Router) {
						r.Post("/credentials", publishingHandler.StoreCredential)
						r.Get("/credentials", publishingHandler.ListCredentials)
						r.Delete("/credentials/{id}", publishingHandler.DeleteCredential)
						r.Post("/schedule", publishingHandler.SchedulePost)
						r.Get("/calendar", publishingHandler.GetCalendar)
						r.Delete("/schedule/{id}", publishingHandler.CancelScheduledPost)
					})
				}

				// Analytics routes
				if analyticsHandler != nil {
					r.Route("/analytics", func(r chi.Router) {
						r.Get("/overview", analyticsHandler.GetOverview)
						r.Get("/consistency", analyticsHandler.GetConsistencyScore)
						r.Get("/heatmap", analyticsHandler.GetHeatmap)
						r.Get("/velocity", analyticsHandler.GetPipelineVelocity)
						r.Get("/reports/weekly", analyticsHandler.GetWeeklyReport)
						r.Get("/reports/monthly", analyticsHandler.GetMonthlyReport)
						r.Get("/goals", analyticsHandler.ListGoals)
						r.Post("/goals", analyticsHandler.CreateGoal)
						r.Patch("/goals/{goalId}", analyticsHandler.UpdateGoal)
						r.Delete("/goals/{goalId}", analyticsHandler.DeleteGoal)
						r.Get("/content/{contentId}", analyticsHandler.GetContentAnalytics)
						r.Get("/platform/{platform}", analyticsHandler.GetPlatformAnalytics)
						r.With(middleware.TieredRateLimiter(redisClient, cfg.AppEnv, "analytics_sync", middleware.DefaultTierLimits["analytics_sync"])).Post("/sync", analyticsHandler.TriggerSync)
					})
				}

				// Gamification routes
				if gamificationHandler != nil {
					r.Route("/gamification", func(r chi.Router) {
						r.Get("/leaderboard", gamificationHandler.GetLeaderboard)
						r.Get("/my-stats", gamificationHandler.GetMyStats)
						r.Get("/achievements", gamificationHandler.ListAchievements)
					})
				}

				// Sponsorships routes
				if sponsorshipHandler != nil {
					r.Route("/sponsorships", func(r chi.Router) {
						r.Post("/", sponsorshipHandler.Create)
						r.Get("/", sponsorshipHandler.List)
						r.Route("/{id}", func(r chi.Router) {
							r.Get("/", sponsorshipHandler.Get)
							r.Put("/", sponsorshipHandler.Update)
							r.Delete("/", sponsorshipHandler.Delete)
							r.Post("/messages", sponsorshipHandler.AddMessage)
							r.Get("/messages", sponsorshipHandler.ListMessages)
						})
					})
				}
			})
		})

		// Accept invitation — authenticated, no workspace context required
		r.With(middleware.Authenticate(jwtManager)).Post("/invitations/{token}/accept", workspaceHandler.AcceptInvitation)

		// Billing routes — require authentication
		if billingHandler != nil {
			r.Route("/billing", func(r chi.Router) {
				r.Use(middleware.Authenticate(jwtManager))
				r.Post("/checkout", billingHandler.CreateCheckoutSession)
				r.Post("/portal", billingHandler.CreatePortalSession)
			})
		}

		// WebSocket — auth done inside handler via ?token= query param (no JWT middleware)
		if wsHandler != nil {
			r.Get("/ws", wsHandler.ServeHTTP)
		}

		// Upload routes — require authentication
		if uploadHandler != nil {
			r.Route("/uploads", func(r chi.Router) {
				r.Use(middleware.Authenticate(jwtManager))
				r.Use(middleware.TieredRateLimiter(redisClient, cfg.AppEnv, "file_uploads", middleware.DefaultTierLimits["file_uploads"]))
				r.Post("/presign", uploadHandler.Presign)
				r.Post("/confirm", uploadHandler.Confirm)
				r.Get("/{objectKey}", uploadHandler.Download)
			})
		}
	})

	// Stripe webhook — raw body, outside /api/v1, no JSON middleware
	if billingHandler != nil {
		r.Post("/webhooks/stripe", billingHandler.HandleWebhook)
	}

	// Swagger/OpenAPI docs — serve static JSON spec
	docsFS := http.Dir("docs/swagger")
	r.Handle("/docs/*", http.StripPrefix("/docs/", http.FileServer(docsFS)))

	return r
}
