package service

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
)

// AIService defines all AI assistant and credit management operations.
type AIService interface {
	// CheckAndDeductCredits atomically deducts credits from the user's balance.
	// Returns AI_002 error with 402 if the balance is insufficient.
	CheckAndDeductCredits(ctx context.Context, userID uuid.UUID, cost int) error
	// SendMessage streams the assistant response to w and persists both messages.
	SendMessage(ctx context.Context, conversationID uuid.UUID, userID uuid.UUID, workspaceID uuid.UUID, content string, w io.Writer) error
	// Brainstorm returns a non-streaming brainstorm response for the given topic.
	Brainstorm(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID, topic string) (string, error)
	// GenerateScript returns a non-streaming script for the given title and description.
	GenerateScript(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID, title, description string) (string, error)
	// AnalyzeScript returns AI suggestions for improving the given script text.
	AnalyzeScript(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID, scriptText string) ([]domain.ScriptSuggestion, error)
	// Atomize generates platform-specific micro-content variations from an existing content item.
	Atomize(ctx context.Context, userID, workspaceID, contentID uuid.UUID) (*domain.AtomizeResponse, error)
	// GetCreditBalance returns the current AI credit balance for the user.
	GetCreditBalance(ctx context.Context, userID uuid.UUID) (int, error)
}

// RemixService defines all remix analysis job operations.
type RemixService interface {
	// SubmitAnalysis creates a DB record and enqueues an async analysis task.
	SubmitAnalysis(ctx context.Context, workspaceID, userID uuid.UUID, inputURL string) (*domain.RemixJob, error)
	// GetJobStatus returns the current status of a remix job.
	GetJobStatus(ctx context.Context, jobID uuid.UUID) (*domain.RemixJob, error)
	// GetJobResults returns the results of a completed remix job; 404 if not complete.
	GetJobResults(ctx context.Context, jobID uuid.UUID) (map[string]any, error)
	// ApplyResults creates Content records for the selected clip IDs.
	ApplyResults(ctx context.Context, jobID uuid.UUID, clipIDs []string) ([]*domain.Content, error)
}

// WorkspaceService defines all workspace management and RBAC operations.
type WorkspaceService interface {
	CreateWorkspace(ctx context.Context, ownerID uuid.UUID, name, description string) (*domain.Workspace, error)
	GetWorkspace(ctx context.Context, id uuid.UUID) (*domain.Workspace, error)
	ListWorkspaces(ctx context.Context, userID uuid.UUID) ([]*domain.Workspace, error)
	UpdateWorkspace(ctx context.Context, id uuid.UUID, name, description *string) (*domain.Workspace, error)
	DeleteWorkspace(ctx context.Context, id uuid.UUID, requesterID uuid.UUID) error
	ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceMember, error)
	UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, newRole domain.WorkspaceRole) error
	RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error
	InviteMember(ctx context.Context, workspaceID, inviterID uuid.UUID, email string, role domain.WorkspaceRole) (*domain.WorkspaceInvitation, error)
	AcceptInvitation(ctx context.Context, token string, userID uuid.UUID) error
	ListInvitations(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceInvitation, error)
	DeleteInvitation(ctx context.Context, id uuid.UUID) error
	GetBrandKit(ctx context.Context, workspaceID uuid.UUID) (*domain.BrandKit, error)
	UpdateBrandKit(ctx context.Context, workspaceID uuid.UUID, kit *domain.BrandKit) error
}

// IdeaService defines all idea management operations.
type IdeaService interface {
	Create(ctx context.Context, workspaceID, createdBy uuid.UUID, title string, description *string, platformTarget *domain.PlatformType) (*domain.Idea, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error)
	List(ctx context.Context, workspaceID uuid.UUID, filter domain.IdeaFilter) ([]*domain.Idea, error)
	Update(ctx context.Context, id uuid.UUID, title *string, description *string) (*domain.Idea, error)
	Delete(ctx context.Context, id uuid.UUID) error
	RequestValidation(ctx context.Context, id uuid.UUID) error
	SetTags(ctx context.Context, id uuid.UUID, tags []string) (*domain.Idea, error)
	Promote(ctx context.Context, ideaID uuid.UUID) (*domain.Content, error)
}

// ContentService defines all content management operations.
type ContentService interface {
	Create(ctx context.Context, workspaceID, createdBy uuid.UUID, title string, description *string, contentType domain.ContentType, platformTarget *domain.PlatformType) (*domain.Content, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Content, error)
	List(ctx context.Context, workspaceID uuid.UUID, filter domain.ContentFilter) ([]*domain.Content, error)
	Update(ctx context.Context, id uuid.UUID, title *string, description *string, platformTarget *domain.PlatformType, dueDate *string, scheduledAt *string, metadata map[string]any) (*domain.Content, error)
	Delete(ctx context.Context, id uuid.UUID) error
	TransitionStatus(ctx context.Context, contentID uuid.UUID, to domain.ContentStatus) error
	AddAssignment(ctx context.Context, contentID, userID uuid.UUID, role string) (*domain.ContentAssignment, error)
	RemoveAssignment(ctx context.Context, contentID, userID uuid.UUID) error
}

// ContentTemplateService defines all content template management operations.
type ContentTemplateService interface {
	Create(ctx context.Context, workspaceID uuid.UUID, name string, description *string, contentType domain.ContentType, platformTarget *domain.PlatformType, defaultChecklist map[string]any, promptTemplate *string, metadata map[string]any) (*domain.ContentTemplate, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentTemplate, error)
	List(ctx context.Context, workspaceID uuid.UUID) ([]*domain.ContentTemplate, error)
	Update(ctx context.Context, id uuid.UUID, name *string, description *string, contentType *domain.ContentType, platformTarget *domain.PlatformType, defaultChecklist map[string]any, promptTemplate *string, metadata map[string]any) (*domain.ContentTemplate, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Instantiate(ctx context.Context, templateID, workspaceID, userID uuid.UUID, topic string, useAI bool) (*domain.Content, error)
}

// SeriesService defines all series management operations.
type SeriesService interface {
	Create(ctx context.Context, workspaceID, createdBy uuid.UUID, title string, description *string, platform *domain.PlatformType) (*domain.Series, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Series, error)
	List(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.Series, error)
	Update(ctx context.Context, id uuid.UUID, title *string, description *string, platform *domain.PlatformType) (*domain.Series, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AddEpisode(ctx context.Context, seriesID uuid.UUID, contentID *uuid.UUID, episodeNumber int, title string) (*domain.SeriesEpisode, error)
	UpdateEpisode(ctx context.Context, id uuid.UUID, title *string, status *domain.ContentStatus, contentID *uuid.UUID) (*domain.SeriesEpisode, error)
	DeleteEpisode(ctx context.Context, id uuid.UUID) error
	UpsertSchedule(ctx context.Context, schedule *domain.SeriesPublishingSchedule) (*domain.SeriesPublishingSchedule, error)
}

// PublishingService defines all publishing credential and scheduling operations.
type PublishingService interface {
	StoreCredential(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType, accessToken, refreshToken *string, scopes []string, expiresAt *time.Time) (*domain.PlatformCredential, error)
	GetDecryptedCredential(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType) (*domain.PlatformCredential, string, string, error)
	ListCredentials(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PlatformCredential, error)
	DeleteCredential(ctx context.Context, id uuid.UUID) error
	SchedulePost(ctx context.Context, workspaceID, contentID uuid.UUID, platform domain.PlatformType, scheduledAt time.Time) (*domain.ScheduledPost, error)
	GetCalendar(ctx context.Context, workspaceID uuid.UUID, from, to time.Time) ([]*domain.ScheduledPost, error)
	CancelScheduledPost(ctx context.Context, id uuid.UUID) error
	GetOAuthURL(platform domain.PlatformType, state string) string
}

// AnalyticsService defines all analytics retrieval and sync operations.
type AnalyticsService interface {
	GetOverview(ctx context.Context, workspaceID uuid.UUID) (*domain.AnalyticsOverview, error)
	GetContentAnalytics(ctx context.Context, contentID uuid.UUID, from, to time.Time) ([]*domain.ContentAnalyticsSummary, error)
	GetPlatformAnalytics(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType, limit int) ([]*domain.PlatformAnalytics, error)
	TriggerSync(ctx context.Context, workspaceID uuid.UUID) error
	GetConsistencyScore(ctx context.Context, workspaceID uuid.UUID) (*domain.ConsistencyScore, error)
	GetHeatmap(ctx context.Context, workspaceID uuid.UUID, year int) ([]*domain.HeatmapDay, error)
	GetPipelineVelocity(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PipelineVelocity, error)
	GetWeeklyReport(ctx context.Context, workspaceID uuid.UUID) (*domain.WeeklyReport, error)
	GetMonthlyReport(ctx context.Context, workspaceID uuid.UUID) (*domain.MonthlyReport, error)
	ListGoals(ctx context.Context, workspaceID uuid.UUID) ([]*domain.AnalyticsGoal, error)
	CreateGoal(ctx context.Context, workspaceID uuid.UUID, input domain.CreateGoalInput) (*domain.AnalyticsGoal, error)
	UpdateGoal(ctx context.Context, goalID uuid.UUID, input domain.UpdateGoalInput) (*domain.AnalyticsGoal, error)
	DeleteGoal(ctx context.Context, goalID uuid.UUID) error
	GetBestPostingTimes(ctx context.Context, workspaceID uuid.UUID, platform string) (*domain.BestTimesResponse, error)
}

// GamificationService defines all gamification operations.
type GamificationService interface {
	RecalculateConsistencyScore(ctx context.Context, userID, workspaceID uuid.UUID) error
	CheckAndUnlockAchievements(ctx context.Context, userID, workspaceID uuid.UUID) error
	GetLeaderboard(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*domain.UserStats, error)
	GetMyStats(ctx context.Context, userID, workspaceID uuid.UUID) (*domain.UserStats, error)
	ListAchievements(ctx context.Context) ([]*domain.Achievement, error)
}

// SponsorshipService defines all sponsorship CRM operations.
type SponsorshipService interface {
	Create(ctx context.Context, workspaceID uuid.UUID, s *domain.Sponsorship) (*domain.Sponsorship, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Sponsorship, error)
	List(ctx context.Context, workspaceID uuid.UUID, filter domain.SponsorshipFilter) ([]*domain.Sponsorship, error)
	Update(ctx context.Context, s *domain.Sponsorship) (*domain.Sponsorship, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AddMessage(ctx context.Context, msg *domain.SponsorshipMessage) (*domain.SponsorshipMessage, error)
	ListMessages(ctx context.Context, sponsorshipID uuid.UUID) ([]*domain.SponsorshipMessage, error)
}

// BillingService defines all Stripe billing operations.
type BillingService interface {
	CreateCheckoutSession(ctx context.Context, userID uuid.UUID, priceID string) (string, error)
	CreatePortalSession(ctx context.Context, userID uuid.UUID) (string, error)
	HandleWebhook(ctx context.Context, payload []byte, signature string) error
}

// SearchService defines the global full-text search operation.
type SearchServiceInterface interface {
	Search(ctx context.Context, workspaceID uuid.UUID, query string, types []domain.SearchResultType, limit, offset int) (*domain.SearchResponse, error)
}

// ApprovalService defines all approval link operations.
type ApprovalService interface {
	CreateApprovalLink(ctx context.Context, contentID, workspaceID uuid.UUID, reviewerName, reviewerEmail string, expiresIn time.Duration) (*domain.ApprovalLink, error)
	GetApprovalByToken(ctx context.Context, token string) (*domain.ApprovalLink, *domain.Content, error)
	SubmitDecision(ctx context.Context, token string, decision domain.ApprovalDecision) error
	ListApprovalLinks(ctx context.Context, contentID uuid.UUID) ([]*domain.ApprovalLink, error)
}

// AuthService defines all authentication and session management operations.
type AuthService interface {
	Register(ctx context.Context, email, password, fullName string) (*domain.AuthTokens, error)
	Login(ctx context.Context, email, password string) (*domain.AuthTokens, error)
	RefreshTokens(ctx context.Context, refreshToken string) (*domain.AuthTokens, error)
	Logout(ctx context.Context, refreshToken string) error
	LogoutAll(ctx context.Context, userID uuid.UUID) error
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, newPassword string) error
	VerifyEmail(ctx context.Context, token string) error
	OAuthLogin(ctx context.Context, provider, code, state string) (*domain.AuthTokens, error)
}
