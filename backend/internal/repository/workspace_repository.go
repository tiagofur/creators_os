package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/cache"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
)

// pgWorkspaceRepository implements WorkspaceRepository using pgx/v5.
type pgWorkspaceRepository struct {
	pool  *pgxpool.Pool
	cache *cache.Cache // optional; nil disables caching
}

// pgInvitationRepository implements InvitationRepository using pgx/v5.
type pgInvitationRepository struct {
	pool *pgxpool.Pool
}

// NewWorkspaceRepository creates a new WorkspaceRepository backed by the provided pool.
// Pass nil for c to disable caching (e.g. in tests).
func NewWorkspaceRepository(pool *pgxpool.Pool, c ...*cache.Cache) WorkspaceRepository {
	r := &pgWorkspaceRepository{pool: pool}
	if len(c) > 0 {
		r.cache = c[0]
	}
	return r
}

// NewInvitationRepository creates a new InvitationRepository backed by the provided pool.
func NewInvitationRepository(pool *pgxpool.Pool) InvitationRepository {
	return &pgInvitationRepository{pool: pool}
}

// ---- slug helpers ----

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9-]+`)

// toSlug converts a workspace name into a URL-safe slug.
func toSlug(name string) string {
	s := strings.ToLower(name)
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	slug := nonAlphanumeric.ReplaceAllString(b.String(), "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "workspace"
	}
	return slug
}

// randomSuffix returns a 4-character random alphanumeric string.
func randomSuffix() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 4)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

// ---- scan helpers ----

func scanWorkspace(row pgx.Row) (*domain.Workspace, error) {
	w := &domain.Workspace{}
	var settingsJSON []byte
	err := row.Scan(
		&w.ID,
		&w.OwnerID,
		&w.Name,
		&w.Slug,
		&w.Description,
		&w.AvatarURL,
		&settingsJSON,
		&w.CreatedAt,
		&w.UpdatedAt,
		&w.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if len(settingsJSON) > 0 {
		if err := json.Unmarshal(settingsJSON, &w.Settings); err != nil {
			return nil, fmt.Errorf("workspace: unmarshal settings: %w", err)
		}
	}
	if w.Settings == nil {
		w.Settings = map[string]any{}
	}
	return w, nil
}

func scanMember(row pgx.Row) (*domain.WorkspaceMember, error) {
	m := &domain.WorkspaceMember{}
	err := row.Scan(
		&m.ID,
		&m.WorkspaceID,
		&m.UserID,
		&m.Role,
		&m.JoinedAt,
		&m.UserEmail,
		&m.UserName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return m, nil
}

func scanMemberNoUser(row pgx.Row) (*domain.WorkspaceMember, error) {
	m := &domain.WorkspaceMember{}
	err := row.Scan(
		&m.ID,
		&m.WorkspaceID,
		&m.UserID,
		&m.Role,
		&m.JoinedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return m, nil
}

func scanInvitation(row pgx.Row) (*domain.WorkspaceInvitation, error) {
	inv := &domain.WorkspaceInvitation{}
	err := row.Scan(
		&inv.ID,
		&inv.WorkspaceID,
		&inv.InvitedBy,
		&inv.Email,
		&inv.Role,
		&inv.Token,
		&inv.AcceptedAt,
		&inv.ExpiresAt,
		&inv.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return inv, nil
}

// ---- WorkspaceRepository implementation ----

func (r *pgWorkspaceRepository) Create(ctx context.Context, ws *domain.Workspace) (*domain.Workspace, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.create").Observe(time.Since(start).Seconds())
	}()

	settingsJSON, err := json.Marshal(ws.Settings)
	if err != nil {
		settingsJSON = []byte("{}")
	}

	baseSlug := toSlug(ws.Name)
	slug := baseSlug

	const q = `
		INSERT INTO workspaces (owner_id, name, slug, description, avatar_url, settings)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, owner_id, name, slug, description, avatar_url, settings,
		          created_at, updated_at, deleted_at`

	// Retry up to 5 times on UNIQUE slug violation
	for attempt := 0; attempt <= 5; attempt++ {
		if attempt > 0 {
			slug = baseSlug + "-" + randomSuffix()
		}
		row := r.pool.QueryRow(ctx, q,
			ws.OwnerID,
			ws.Name,
			slug,
			ws.Description,
			ws.AvatarURL,
			settingsJSON,
		)
		created, scanErr := scanWorkspace(row)
		if scanErr == nil {
			return created, nil
		}
		// Check if it's a unique constraint violation on slug (Postgres error code 23505)
		if strings.Contains(scanErr.Error(), "23505") || strings.Contains(scanErr.Error(), "unique") {
			if attempt < 5 {
				continue
			}
		}
		return nil, scanErr
	}
	return nil, domain.NewError("WORKSPACE_SLUG", "could not generate unique slug after retries", 500)
}

func (r *pgWorkspaceRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Workspace, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.get_by_id").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, owner_id, name, slug, description, avatar_url, settings, created_at, updated_at, deleted_at
		FROM workspaces WHERE id = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, id)
	return scanWorkspace(row)
}

func (r *pgWorkspaceRepository) GetBySlug(ctx context.Context, slug string) (*domain.Workspace, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.get_by_slug").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, owner_id, name, slug, description, avatar_url, settings, created_at, updated_at, deleted_at
		FROM workspaces WHERE slug = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, slug)
	return scanWorkspace(row)
}

func (r *pgWorkspaceRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Workspace, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.list_by_user").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT w.id, w.owner_id, w.name, w.slug, w.description, w.avatar_url, w.settings,
		       w.created_at, w.updated_at, w.deleted_at
		FROM workspaces w
		INNER JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE wm.user_id = $1 AND w.deleted_at IS NULL
		ORDER BY w.created_at DESC`

	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*domain.Workspace
	for rows.Next() {
		w, err := scanWorkspace(rows)
		if err != nil {
			return nil, err
		}
		workspaces = append(workspaces, w)
	}
	return workspaces, rows.Err()
}

func (r *pgWorkspaceRepository) Update(ctx context.Context, ws *domain.Workspace) (*domain.Workspace, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.update").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE workspaces
		SET name = COALESCE($2, name),
		    description = COALESCE($3, description),
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, owner_id, name, slug, description, avatar_url, settings,
		          created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q, ws.ID, ws.Name, ws.Description)
	return scanWorkspace(row)
}

func (r *pgWorkspaceRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.soft_delete").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE workspaces SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *pgWorkspaceRepository) GetMember(ctx context.Context, workspaceID, userID uuid.UUID) (*domain.WorkspaceMember, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.get_member").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at,
		       u.email AS user_email, u.full_name AS user_name
		FROM workspace_members wm
		INNER JOIN users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1 AND wm.user_id = $2`

	row := r.pool.QueryRow(ctx, q, workspaceID, userID)
	return scanMember(row)
}

func (r *pgWorkspaceRepository) ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceMember, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.list_members").Observe(time.Since(start).Seconds())
	}()

	// Try cache first.
	if r.cache != nil {
		if data, err := r.cache.GetWorkspaceMembers(ctx, workspaceID.String()); err == nil {
			var members []*domain.WorkspaceMember
			if jsonErr := json.Unmarshal(data, &members); jsonErr == nil {
				return members, nil
			}
		}
	}

	const q = `
		SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at,
		       u.email AS user_email, u.full_name AS user_name
		FROM workspace_members wm
		INNER JOIN users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1
		ORDER BY wm.joined_at ASC`

	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*domain.WorkspaceMember
	for rows.Next() {
		m, err := scanMember(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Populate cache.
	if r.cache != nil {
		_ = r.cache.SetWorkspaceMembers(ctx, workspaceID.String(), members)
	}

	return members, nil
}

func (r *pgWorkspaceRepository) AddMember(ctx context.Context, workspaceID, userID uuid.UUID, role domain.WorkspaceRole) (*domain.WorkspaceMember, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.add_member").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING id, workspace_id, user_id, role, joined_at`

	row := r.pool.QueryRow(ctx, q, workspaceID, userID, role)
	member, err := scanMemberNoUser(row)
	if err != nil {
		return nil, err
	}
	if r.cache != nil {
		_ = r.cache.DeleteWorkspaceMembers(ctx, workspaceID.String())
	}
	return member, nil
}

func (r *pgWorkspaceRepository) UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, role domain.WorkspaceRole) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.update_member_role").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, q, workspaceID, userID, role)
	if err != nil {
		return err
	}
	if r.cache != nil {
		_ = r.cache.DeleteWorkspaceMembers(ctx, workspaceID.String())
	}
	return nil
}

func (r *pgWorkspaceRepository) RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.remove_member").Observe(time.Since(start).Seconds())
	}()

	const q = `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, q, workspaceID, userID)
	if err != nil {
		return err
	}
	if r.cache != nil {
		_ = r.cache.DeleteWorkspaceMembers(ctx, workspaceID.String())
	}
	return nil
}

func (r *pgWorkspaceRepository) CountMembers(ctx context.Context, workspaceID uuid.UUID) (int, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.count_members").Observe(time.Since(start).Seconds())
	}()

	const q = `SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1`
	var count int
	err := r.pool.QueryRow(ctx, q, workspaceID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *pgWorkspaceRepository) CountByOwner(ctx context.Context, ownerID uuid.UUID) (int, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("workspaces.count_by_owner").Observe(time.Since(start).Seconds())
	}()

	const q = `SELECT COUNT(*) FROM workspaces WHERE owner_id = $1 AND deleted_at IS NULL`
	var count int
	err := r.pool.QueryRow(ctx, q, ownerID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// Compile-time interface check.
var _ WorkspaceRepository = (*pgWorkspaceRepository)(nil)

// ---- InvitationRepository implementation ----

func (r *pgInvitationRepository) Create(ctx context.Context, inv *domain.WorkspaceInvitation) (*domain.WorkspaceInvitation, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("invitations.create").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO workspace_invitations (workspace_id, invited_by, email, role, token, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at`

	row := r.pool.QueryRow(ctx, q,
		inv.WorkspaceID,
		inv.InvitedBy,
		inv.Email,
		inv.Role,
		inv.Token,
		inv.ExpiresAt,
	)
	return scanInvitation(row)
}

func (r *pgInvitationRepository) GetByToken(ctx context.Context, token string) (*domain.WorkspaceInvitation, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("invitations.get_by_token").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at
		FROM workspace_invitations WHERE token = $1`

	row := r.pool.QueryRow(ctx, q, token)
	return scanInvitation(row)
}

func (r *pgInvitationRepository) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceInvitation, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("invitations.list_by_workspace").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at
		FROM workspace_invitations WHERE workspace_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invitations []*domain.WorkspaceInvitation
	for rows.Next() {
		inv, err := scanInvitation(rows)
		if err != nil {
			return nil, err
		}
		invitations = append(invitations, inv)
	}
	return invitations, rows.Err()
}

func (r *pgInvitationRepository) Accept(ctx context.Context, token string) (*domain.WorkspaceInvitation, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("invitations.accept").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE workspace_invitations
		SET accepted_at = NOW()
		WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
		RETURNING id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at`

	row := r.pool.QueryRow(ctx, q, token)
	inv, err := scanInvitation(row)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.NewError("WORKSPACE_004", "invitation not found, expired, or already accepted", 400)
		}
		return nil, err
	}
	return inv, nil
}

func (r *pgInvitationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("invitations.delete").Observe(time.Since(start).Seconds())
	}()

	const q = `DELETE FROM workspace_invitations WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

// CountPending returns the number of pending (non-accepted, non-expired) invitations for a workspace.
func (r *pgInvitationRepository) CountPending(ctx context.Context, workspaceID uuid.UUID) (int, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("invitations.count_pending").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT COUNT(*) FROM workspace_invitations
		WHERE workspace_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`
	var count int
	err := r.pool.QueryRow(ctx, q, workspaceID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// Compile-time interface check.
var _ InvitationRepository = (*pgInvitationRepository)(nil)
