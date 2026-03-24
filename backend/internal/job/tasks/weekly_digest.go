package tasks

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"log/slog"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
	"github.com/ordo/creators-os/internal/repository"
)

// TypeWeeklyDigest is the task type identifier for weekly digest emails.
const TypeWeeklyDigest = "email:weekly_digest"

// WeeklyDigestHandler handles sending weekly digest emails to all active workspaces.
type WeeklyDigestHandler struct {
	pool *pgxpool.Pool
}

// NewWeeklyDigestHandler returns a handler function for the weekly digest task.
func NewWeeklyDigestHandler(pool *pgxpool.Pool) func(ctx context.Context, t *asynq.Task) error {
	h := &WeeklyDigestHandler{pool: pool}
	return h.Handle
}

// Handle processes the weekly digest task.
// It iterates over all active workspaces, fetches each workspace's weekly report,
// builds an HTML email, and sends it to the workspace owner.
func (h *WeeklyDigestHandler) Handle(ctx context.Context, t *asynq.Task) error {
	slog.InfoContext(ctx, "starting weekly digest email task")

	// Fetch all active workspaces.
	workspaces, err := h.listActiveWorkspaces(ctx)
	if err != nil {
		return fmt.Errorf("weekly_digest: list active workspaces: %w", err)
	}

	slog.InfoContext(ctx, "found workspaces for weekly digest", "count", len(workspaces))

	analyticsRepo := repository.NewAnalyticsRepository(h.pool)
	userRepo := repository.NewUserRepository(h.pool)

	var successCount, failCount int
	for _, ws := range workspaces {
		if err := h.processWorkspace(ctx, ws, analyticsRepo, userRepo); err != nil {
			slog.WarnContext(ctx, "weekly digest failed for workspace",
				"workspace_id", ws.ID,
				"workspace_name", ws.Name,
				"err", err,
			)
			failCount++
			continue
		}
		successCount++
	}

	slog.InfoContext(ctx, "weekly digest task completed",
		"success", successCount,
		"failed", failCount,
		"total", len(workspaces),
	)

	metrics.AsynqTasksTotal.WithLabelValues("default", "processed").Inc()
	return nil
}

// listActiveWorkspaces queries all non-deleted workspaces.
func (h *WeeklyDigestHandler) listActiveWorkspaces(ctx context.Context) ([]*domain.Workspace, error) {
	rows, err := h.pool.Query(ctx,
		`SELECT id, owner_id, name, slug, description, avatar_url, created_at, updated_at
		 FROM workspaces
		 WHERE deleted_at IS NULL
		 ORDER BY created_at`)
	if err != nil {
		return nil, fmt.Errorf("query workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []*domain.Workspace
	for rows.Next() {
		ws := &domain.Workspace{}
		if err := rows.Scan(
			&ws.ID, &ws.OwnerID, &ws.Name, &ws.Slug,
			&ws.Description, &ws.AvatarURL,
			&ws.CreatedAt, &ws.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan workspace: %w", err)
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, rows.Err()
}

// processWorkspace fetches the weekly report and sends the digest email to the owner.
func (h *WeeklyDigestHandler) processWorkspace(
	ctx context.Context,
	ws *domain.Workspace,
	analyticsRepo repository.AnalyticsRepository,
	userRepo repository.UserRepository,
) error {
	// Fetch the weekly report for this workspace.
	report, err := analyticsRepo.GetWeeklyReport(ctx, ws.ID)
	if err != nil {
		return fmt.Errorf("get weekly report: %w", err)
	}

	// Fetch the workspace owner.
	owner, err := userRepo.GetByID(ctx, ws.OwnerID)
	if err != nil {
		return fmt.Errorf("get owner: %w", err)
	}

	// Build the motivational nudge.
	nudge := buildMotivationalNudge(owner.CurrentStreak, report.ConsistencyScore)

	// Build the email HTML.
	html, err := buildWeeklyDigestHTML(ws, report, owner, nudge)
	if err != nil {
		return fmt.Errorf("build email html: %w", err)
	}

	// TODO: replace with real SMTP / mailhog integration
	slog.InfoContext(ctx, "sending weekly digest email",
		"workspace_id", ws.ID,
		"workspace_name", ws.Name,
		"owner_email", owner.Email,
		"owner_name", owner.FullName,
		"published", report.Published,
		"ideas_captured", report.IdeasCaptured,
		"consistency_score", report.ConsistencyScore,
		"streak", owner.CurrentStreak,
		"nudge", nudge,
		"email_html_length", len(html),
	)

	return nil
}

// buildMotivationalNudge returns a motivational message based on streak and consistency.
func buildMotivationalNudge(currentStreak, consistencyScore int) string {
	if currentStreak == 0 {
		return "Start a new streak this week! Even one piece of content keeps the momentum going."
	}
	if currentStreak < 3 {
		return fmt.Sprintf("You're on a %d-day streak — keep it going! A few more days and you'll build a strong habit.", currentStreak)
	}
	if consistencyScore < 40 {
		return "Your consistency score has room to grow. Try scheduling content ahead of time to stay on track."
	}
	if currentStreak >= 7 {
		return fmt.Sprintf("Amazing %d-day streak! You're on fire — keep up the incredible work!", currentStreak)
	}
	return fmt.Sprintf("Nice %d-day streak! You're building great momentum. Keep creating!", currentStreak)
}

// weeklyDigestData holds template data for the weekly digest email.
type weeklyDigestData struct {
	WorkspaceName    string
	OwnerName        string
	WeekStart        string
	WeekEnd          string
	Published        int
	IdeasCaptured    int
	ConsistencyScore int
	CurrentStreak    int
	LongestStreak    int
	AICreditsUsed    int
	TopPlatform      string
	Nudge            string
	ShowNudge        bool
}

// buildWeeklyDigestHTML renders the weekly digest email as HTML.
func buildWeeklyDigestHTML(
	ws *domain.Workspace,
	report *domain.WeeklyReport,
	owner *domain.User,
	nudge string,
) (string, error) {
	data := weeklyDigestData{
		WorkspaceName:    ws.Name,
		OwnerName:        owner.FullName,
		WeekStart:        report.WeekStart,
		WeekEnd:          report.WeekEnd,
		Published:        report.Published,
		IdeasCaptured:    report.IdeasCaptured,
		ConsistencyScore: report.ConsistencyScore,
		CurrentStreak:    owner.CurrentStreak,
		LongestStreak:    owner.LongestStreak,
		AICreditsUsed:    report.AICreditsUsed,
		TopPlatform:      report.TopPlatform,
		Nudge:            nudge,
		ShowNudge:        owner.CurrentStreak < 3 || report.ConsistencyScore < 40,
	}

	tmpl, err := template.New("weekly_digest").Parse(weeklyDigestTemplate)
	if err != nil {
		return "", fmt.Errorf("parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("execute template: %w", err)
	}

	return buf.String(), nil
}

// NewWeeklyDigestTask creates an asynq task for the weekly digest.
// This is used by the scheduler to enqueue the task on a weekly cron.
func NewWeeklyDigestTask() (*asynq.Task, error) {
	return asynq.NewTask(TypeWeeklyDigest, nil, asynq.Queue("default"), asynq.MaxRetry(2)), nil
}

const weeklyDigestTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f7;">
<tr>
<td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Weekly Digest</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">{{.WorkspaceName}} &mdash; {{.WeekStart}} to {{.WeekEnd}}</p>
</td>
</tr>

<!-- Greeting -->
<tr>
<td style="padding:32px 40px 16px;">
<p style="margin:0;font-size:16px;color:#374151;">Hi {{.OwnerName}},</p>
<p style="margin:8px 0 0;font-size:15px;color:#6b7280;">Here's a summary of your creative week:</p>
</td>
</tr>

<!-- Stats Grid -->
<tr>
<td style="padding:0 40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td width="50%" style="padding:12px 8px 12px 0;">
<div style="background-color:#f0fdf4;border-radius:8px;padding:20px;text-align:center;">
<div style="font-size:28px;font-weight:700;color:#16a34a;">{{.Published}}</div>
<div style="font-size:13px;color:#6b7280;margin-top:4px;">Published</div>
</div>
</td>
<td width="50%" style="padding:12px 0 12px 8px;">
<div style="background-color:#eff6ff;border-radius:8px;padding:20px;text-align:center;">
<div style="font-size:28px;font-weight:700;color:#2563eb;">{{.IdeasCaptured}}</div>
<div style="font-size:13px;color:#6b7280;margin-top:4px;">Ideas Captured</div>
</div>
</td>
</tr>
<tr>
<td width="50%" style="padding:12px 8px 12px 0;">
<div style="background-color:#faf5ff;border-radius:8px;padding:20px;text-align:center;">
<div style="font-size:28px;font-weight:700;color:#7c3aed;">{{.ConsistencyScore}}</div>
<div style="font-size:13px;color:#6b7280;margin-top:4px;">Consistency Score</div>
</div>
</td>
<td width="50%" style="padding:12px 0 12px 8px;">
<div style="background-color:#fff7ed;border-radius:8px;padding:20px;text-align:center;">
<div style="font-size:28px;font-weight:700;color:#ea580c;">{{.CurrentStreak}}</div>
<div style="font-size:13px;color:#6b7280;margin-top:4px;">Day Streak</div>
</div>
</td>
</tr>
</table>
</td>
</tr>

<!-- Additional Details -->
<tr>
<td style="padding:16px 40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e5e7eb;padding-top:16px;">
<tr>
<td style="padding:8px 0;font-size:14px;color:#6b7280;">Longest Streak</td>
<td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#374151;">{{.LongestStreak}} days</td>
</tr>
<tr>
<td style="padding:8px 0;font-size:14px;color:#6b7280;">AI Credits Used</td>
<td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#374151;">{{.AICreditsUsed}}</td>
</tr>
{{if .TopPlatform}}
<tr>
<td style="padding:8px 0;font-size:14px;color:#6b7280;">Top Platform</td>
<td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#374151;">{{.TopPlatform}}</td>
</tr>
{{end}}
</table>
</td>
</tr>

{{if .ShowNudge}}
<!-- Motivational Nudge -->
<tr>
<td style="padding:8px 40px 24px;">
<div style="background-color:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;">
<p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">{{.Nudge}}</p>
</div>
</td>
</tr>
{{end}}

<!-- Footer -->
<tr>
<td style="padding:24px 40px 32px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you have weekly digest emails enabled.</p>
<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Manage your preferences in Settings &gt; Notifications.</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`
