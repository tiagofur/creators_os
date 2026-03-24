package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
)

// AIRepository defines persistence operations for AI conversations, messages,
// and credit usage records.
type AIRepository interface {
	CreateConversation(ctx context.Context, conv *domain.AIConversation) (*domain.AIConversation, error)
	GetConversation(ctx context.Context, id uuid.UUID) (*domain.AIConversation, error)
	ListConversations(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.AIConversation, error)
	DeleteConversation(ctx context.Context, id uuid.UUID) error
	AddMessage(ctx context.Context, msg *domain.AIMessage) (*domain.AIMessage, error)
	ListMessages(ctx context.Context, conversationID uuid.UUID) ([]*domain.AIMessage, error)
	RecordCreditUsage(ctx context.Context, usage *domain.AICreditUsage) error
	GetCreditUsageSummary(ctx context.Context, userID uuid.UUID, since time.Time) (int, error)
}

// RemixRepository defines persistence operations for remix analysis jobs.
type RemixRepository interface {
	Create(ctx context.Context, job *domain.RemixJob) (*domain.RemixJob, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.RemixJob, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, errorMsg *string) error
	UpdateResults(ctx context.Context, id uuid.UUID, results map[string]any) error
	ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.RemixJob, error)
}

// WorkspaceRepository defines all persistence operations for workspaces and members.
type WorkspaceRepository interface {
	Create(ctx context.Context, ws *domain.Workspace) (*domain.Workspace, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Workspace, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Workspace, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Workspace, error)
	Update(ctx context.Context, ws *domain.Workspace) (*domain.Workspace, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
	GetMember(ctx context.Context, workspaceID, userID uuid.UUID) (*domain.WorkspaceMember, error)
	ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceMember, error)
	AddMember(ctx context.Context, workspaceID, userID uuid.UUID, role domain.WorkspaceRole) (*domain.WorkspaceMember, error)
	UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, role domain.WorkspaceRole) error
	RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error
	CountMembers(ctx context.Context, workspaceID uuid.UUID) (int, error)
	CountByOwner(ctx context.Context, ownerID uuid.UUID) (int, error)
}

// InvitationRepository defines all persistence operations for workspace invitations.
type InvitationRepository interface {
	Create(ctx context.Context, inv *domain.WorkspaceInvitation) (*domain.WorkspaceInvitation, error)
	GetByToken(ctx context.Context, token string) (*domain.WorkspaceInvitation, error)
	ListByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceInvitation, error)
	Accept(ctx context.Context, token string) (*domain.WorkspaceInvitation, error)
	Delete(ctx context.Context, id uuid.UUID) error
	// CountPending returns the number of non-expired, non-accepted invitations for a workspace.
	CountPending(ctx context.Context, workspaceID uuid.UUID) (int, error)
}

// UserRepository defines all persistence operations for users.
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) (*domain.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	GetByOAuth(ctx context.Context, provider, providerID string) (*domain.User, error)
	Update(ctx context.Context, user *domain.User) (*domain.User, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
	UpdateSubscriptionTier(ctx context.Context, id uuid.UUID, tier domain.SubscriptionTier) error
	DecrementAICredits(ctx context.Context, id uuid.UUID, amount int) error
	GetAICreditsBalance(ctx context.Context, id uuid.UUID) (int, error)
	UpdateEmailVerification(ctx context.Context, id uuid.UUID, token string, expiresAt time.Time) error
	MarkEmailVerified(ctx context.Context, token string) error
	UpdatePasswordReset(ctx context.Context, id uuid.UUID, tokenHash string, expiresAt time.Time) error
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
	GetByPasswordResetToken(ctx context.Context, tokenHash string) (*domain.User, error)
	UpsertOAuth(ctx context.Context, email, fullName, provider, providerID string, avatarURL *string) (*domain.User, error)
	UpdateStripeCustomerID(ctx context.Context, id uuid.UUID, stripeCustomerID string) error
	GetByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*domain.User, error)
}

// SessionRepository defines all persistence operations for user sessions.
type SessionRepository interface {
	Create(ctx context.Context, session *domain.UserSession) (*domain.UserSession, error)
	GetByTokenHash(ctx context.Context, tokenHash string) (*domain.UserSession, error)
	Revoke(ctx context.Context, tokenHash string) error
	RevokeAll(ctx context.Context, userID uuid.UUID) error
}

// IdeaRepository defines all persistence operations for ideas.
type IdeaRepository interface {
	Create(ctx context.Context, idea *domain.Idea) (*domain.Idea, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error)
	List(ctx context.Context, workspaceID uuid.UUID, filter domain.IdeaFilter) ([]*domain.Idea, error)
	Update(ctx context.Context, idea *domain.Idea) (*domain.Idea, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.IdeaStatus) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	SaveValidationScore(ctx context.Context, ideaID uuid.UUID, score *domain.IdeaValidationScore) error
	SetTags(ctx context.Context, ideaID uuid.UUID, tags []string) error
	Promote(ctx context.Context, ideaID, contentID uuid.UUID) error
}

// ContentRepository defines all persistence operations for content items.
type ContentRepository interface {
	Create(ctx context.Context, content *domain.Content) (*domain.Content, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Content, error)
	List(ctx context.Context, workspaceID uuid.UUID, filter domain.ContentFilter) ([]*domain.Content, error)
	Update(ctx context.Context, content *domain.Content) (*domain.Content, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	AddAssignment(ctx context.Context, assignment *domain.ContentAssignment) (*domain.ContentAssignment, error)
	RemoveAssignment(ctx context.Context, contentID, userID uuid.UUID) error
	ListAssignments(ctx context.Context, contentID uuid.UUID) ([]*domain.ContentAssignment, error)
	EnsurePartitionExists(ctx context.Context, month time.Time) error
}

// PublishingRepository defines all persistence operations for platform credentials and scheduled posts.
type PublishingRepository interface {
	SaveCredential(ctx context.Context, cred *domain.PlatformCredential) (*domain.PlatformCredential, error)
	GetCredential(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType) (*domain.PlatformCredential, error)
	ListCredentials(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PlatformCredential, error)
	DeleteCredential(ctx context.Context, id uuid.UUID) error
	CreateScheduledPost(ctx context.Context, post *domain.ScheduledPost) (*domain.ScheduledPost, error)
	GetScheduledPost(ctx context.Context, id uuid.UUID) (*domain.ScheduledPost, error)
	ListScheduledPosts(ctx context.Context, workspaceID uuid.UUID, from, to time.Time) ([]*domain.ScheduledPost, error)
	GetDuePosts(ctx context.Context, before time.Time) ([]*domain.ScheduledPost, error)
	UpdatePostStatus(ctx context.Context, id uuid.UUID, status string, platformPostID *string, errorMsg *string) error
}

// AnalyticsRepository defines all persistence operations for platform analytics.
type AnalyticsRepository interface {
	SavePlatformAnalytics(ctx context.Context, a *domain.PlatformAnalytics) error
	GetOverview(ctx context.Context, workspaceID uuid.UUID) (*domain.AnalyticsOverview, error)
	GetContentAnalytics(ctx context.Context, contentID uuid.UUID, from, to time.Time) ([]*domain.ContentAnalyticsSummary, error)
	GetPlatformAnalytics(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType, limit int) ([]*domain.PlatformAnalytics, error)
	GetConsistencyScore(ctx context.Context, workspaceID uuid.UUID) (*domain.ConsistencyScore, error)
	GetHeatmap(ctx context.Context, workspaceID uuid.UUID, year int) ([]*domain.HeatmapDay, error)
	GetPipelineVelocity(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PipelineVelocity, error)
	GetWeeklyReport(ctx context.Context, workspaceID uuid.UUID) (*domain.WeeklyReport, error)
	GetMonthlyReport(ctx context.Context, workspaceID uuid.UUID) (*domain.MonthlyReport, error)
	ListGoals(ctx context.Context, workspaceID uuid.UUID) ([]*domain.AnalyticsGoal, error)
	CreateGoal(ctx context.Context, goal *domain.AnalyticsGoal) (*domain.AnalyticsGoal, error)
	UpdateGoal(ctx context.Context, goalID uuid.UUID, input domain.UpdateGoalInput) (*domain.AnalyticsGoal, error)
	DeleteGoal(ctx context.Context, goalID uuid.UUID) error
}

// GamificationRepository defines all persistence operations for gamification data.
type GamificationRepository interface {
	UpsertUserStats(ctx context.Context, stats *domain.UserStats) (*domain.UserStats, error)
	GetUserStats(ctx context.Context, userID, workspaceID uuid.UUID) (*domain.UserStats, error)
	GetLeaderboard(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*domain.UserStats, error)
	InsertConsistencyScore(ctx context.Context, score *domain.ConsistencyScore) error
	ListAchievements(ctx context.Context) ([]*domain.Achievement, error)
	GetRecentPublishedCount(ctx context.Context, userID, workspaceID uuid.UUID, days int) (int, error)
}

// SponsorshipRepository defines all persistence operations for sponsorships.
type SponsorshipRepository interface {
	Create(ctx context.Context, s *domain.Sponsorship) (*domain.Sponsorship, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Sponsorship, error)
	List(ctx context.Context, workspaceID uuid.UUID, filter domain.SponsorshipFilter) ([]*domain.Sponsorship, error)
	Update(ctx context.Context, s *domain.Sponsorship) (*domain.Sponsorship, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
	AddMessage(ctx context.Context, msg *domain.SponsorshipMessage) (*domain.SponsorshipMessage, error)
	ListMessages(ctx context.Context, sponsorshipID uuid.UUID) ([]*domain.SponsorshipMessage, error)
}

// ContentTemplateRepository defines all persistence operations for content templates.
type ContentTemplateRepository interface {
	Create(ctx context.Context, t *domain.ContentTemplate) (*domain.ContentTemplate, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentTemplate, error)
	List(ctx context.Context, workspaceID uuid.UUID) ([]*domain.ContentTemplate, error)
	Update(ctx context.Context, t *domain.ContentTemplate) (*domain.ContentTemplate, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// SeriesRepository defines all persistence operations for series and episodes.
type SeriesRepository interface {
	Create(ctx context.Context, s *domain.Series) (*domain.Series, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Series, error)
	List(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.Series, error)
	Update(ctx context.Context, s *domain.Series) (*domain.Series, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
	AddEpisode(ctx context.Context, ep *domain.SeriesEpisode) (*domain.SeriesEpisode, error)
	GetEpisode(ctx context.Context, id uuid.UUID) (*domain.SeriesEpisode, error)
	ListEpisodes(ctx context.Context, seriesID uuid.UUID) ([]*domain.SeriesEpisode, error)
	UpdateEpisode(ctx context.Context, ep *domain.SeriesEpisode) (*domain.SeriesEpisode, error)
	DeleteEpisode(ctx context.Context, id uuid.UUID) error
	UpsertSchedule(ctx context.Context, schedule *domain.SeriesPublishingSchedule) (*domain.SeriesPublishingSchedule, error)
	GetSchedule(ctx context.Context, seriesID uuid.UUID) (*domain.SeriesPublishingSchedule, error)
}
