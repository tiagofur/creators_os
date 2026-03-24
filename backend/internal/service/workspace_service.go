package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/job/tasks"
	"github.com/ordo/creators-os/internal/repository"
)

// Tier limits enforced in the service layer.
const (
	FreeTierMaxWorkspaces = 1
	FreeTierMaxMembers    = 3
	ProTierMaxWorkspaces  = 3
	ProTierMaxMembers     = 10
)

// workspaceService implements WorkspaceService.
type workspaceService struct {
	wsRepo      repository.WorkspaceRepository
	invRepo     repository.InvitationRepository
	userRepo    repository.UserRepository
	asynqClient *asynq.Client
	logger      *slog.Logger
}

// NewWorkspaceService creates a new WorkspaceService.
func NewWorkspaceService(
	wsRepo repository.WorkspaceRepository,
	invRepo repository.InvitationRepository,
	userRepo repository.UserRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) WorkspaceService {
	if logger == nil {
		logger = slog.Default()
	}
	return &workspaceService{
		wsRepo:      wsRepo,
		invRepo:     invRepo,
		userRepo:    userRepo,
		asynqClient: asynqClient,
		logger:      logger,
	}
}

// workspaceLimit returns the max workspaces for a given tier.
func workspaceLimit(tier domain.SubscriptionTier) int {
	switch tier {
	case domain.TierFree:
		return FreeTierMaxWorkspaces
	case domain.TierPro:
		return ProTierMaxWorkspaces
	case domain.TierEnterprise:
		return -1 // unlimited
	}
	return FreeTierMaxWorkspaces
}

// memberLimit returns the max members for a given tier (-1 = unlimited).
func memberLimit(tier domain.SubscriptionTier) int {
	switch tier {
	case domain.TierFree:
		return FreeTierMaxMembers
	case domain.TierPro:
		return ProTierMaxMembers
	case domain.TierEnterprise:
		return -1 // unlimited
	}
	return FreeTierMaxMembers
}

// CreateWorkspace creates a new workspace and adds the owner as a member.
func (s *workspaceService) CreateWorkspace(ctx context.Context, ownerID uuid.UUID, name, description string) (*domain.Workspace, error) {
	// Fetch owner to check subscription tier (DB read — JWT tier can be stale)
	owner, err := s.userRepo.GetByID(ctx, ownerID)
	if err != nil {
		return nil, fmt.Errorf("workspace: create: get owner: %w", err)
	}

	limit := workspaceLimit(owner.SubscriptionTier)
	if limit >= 0 {
		count, err := s.wsRepo.CountByOwner(ctx, ownerID)
		if err != nil {
			return nil, fmt.Errorf("workspace: create: count workspaces: %w", err)
		}
		if count >= limit {
			return nil, domain.NewError("WORKSPACE_LIMIT_REACHED",
				fmt.Sprintf("your plan allows a maximum of %d workspace(s). Upgrade to create more.", limit),
				402)
		}
	}

	var descPtr *string
	if description != "" {
		descPtr = &description
	}

	ws := &domain.Workspace{
		OwnerID:     ownerID,
		Name:        name,
		Description: descPtr,
		Settings:    map[string]any{},
	}

	created, err := s.wsRepo.Create(ctx, ws)
	if err != nil {
		return nil, fmt.Errorf("workspace: create: %w", err)
	}

	// Add owner as member with owner role
	if _, err := s.wsRepo.AddMember(ctx, created.ID, ownerID, domain.RoleOwner); err != nil {
		return nil, fmt.Errorf("workspace: create: add owner member: %w", err)
	}

	return created, nil
}

// GetWorkspace retrieves a workspace by ID.
func (s *workspaceService) GetWorkspace(ctx context.Context, id uuid.UUID) (*domain.Workspace, error) {
	ws, err := s.wsRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("workspace: get: %w", err)
	}
	return ws, nil
}

// ListWorkspaces returns all workspaces the user is a member of.
func (s *workspaceService) ListWorkspaces(ctx context.Context, userID uuid.UUID) ([]*domain.Workspace, error) {
	workspaces, err := s.wsRepo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("workspace: list: %w", err)
	}
	return workspaces, nil
}

// UpdateWorkspace updates a workspace's name and/or description.
func (s *workspaceService) UpdateWorkspace(ctx context.Context, id uuid.UUID, name, description *string) (*domain.Workspace, error) {
	ws, err := s.wsRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("workspace: update: get: %w", err)
	}

	if name != nil {
		ws.Name = *name
	}
	if description != nil {
		ws.Description = description
	}

	updated, err := s.wsRepo.Update(ctx, ws)
	if err != nil {
		return nil, fmt.Errorf("workspace: update: %w", err)
	}
	return updated, nil
}

// DeleteWorkspace soft-deletes a workspace. Only the owner can delete.
func (s *workspaceService) DeleteWorkspace(ctx context.Context, id uuid.UUID, requesterID uuid.UUID) error {
	ws, err := s.wsRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("workspace: delete: get: %w", err)
	}

	if ws.OwnerID != requesterID {
		return domain.ErrForbidden
	}

	if err := s.wsRepo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("workspace: delete: %w", err)
	}
	return nil
}

// ListMembers returns all members of a workspace.
func (s *workspaceService) ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceMember, error) {
	members, err := s.wsRepo.ListMembers(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("workspace: list members: %w", err)
	}
	return members, nil
}

// UpdateMemberRole changes a member's role. The owner's role cannot be changed.
func (s *workspaceService) UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, newRole domain.WorkspaceRole) error {
	member, err := s.wsRepo.GetMember(ctx, workspaceID, userID)
	if err != nil {
		return fmt.Errorf("workspace: update role: get member: %w", err)
	}

	if member.Role == domain.RoleOwner {
		return domain.NewError("WORKSPACE_001", "cannot change the owner's role", 400)
	}

	if err := s.wsRepo.UpdateMemberRole(ctx, workspaceID, userID, newRole); err != nil {
		return fmt.Errorf("workspace: update role: %w", err)
	}
	return nil
}

// RemoveMember removes a member from the workspace. The owner cannot be removed.
func (s *workspaceService) RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error {
	member, err := s.wsRepo.GetMember(ctx, workspaceID, userID)
	if err != nil {
		return fmt.Errorf("workspace: remove member: get member: %w", err)
	}

	if member.Role == domain.RoleOwner {
		return domain.NewError("WORKSPACE_003", "cannot remove workspace owner", 400)
	}

	if err := s.wsRepo.RemoveMember(ctx, workspaceID, userID); err != nil {
		return fmt.Errorf("workspace: remove member: %w", err)
	}
	return nil
}

// InviteMember creates an invitation for a new workspace member.
// Checks tier limits before creating the invitation.
func (s *workspaceService) InviteMember(ctx context.Context, workspaceID, inviterID uuid.UUID, email string, role domain.WorkspaceRole) (*domain.WorkspaceInvitation, error) {
	// Fetch inviter to check tier
	inviter, err := s.userRepo.GetByID(ctx, inviterID)
	if err != nil {
		return nil, fmt.Errorf("workspace: invite: get inviter: %w", err)
	}

	limit := memberLimit(inviter.SubscriptionTier)
	if limit >= 0 {
		memberCount, err := s.wsRepo.CountMembers(ctx, workspaceID)
		if err != nil {
			return nil, fmt.Errorf("workspace: invite: count members: %w", err)
		}
		pendingCount, err := s.invRepo.CountPending(ctx, workspaceID)
		if err != nil {
			return nil, fmt.Errorf("workspace: invite: count pending invitations: %w", err)
		}
		if memberCount+pendingCount >= limit {
			return nil, domain.NewError("MEMBER_LIMIT_REACHED",
				fmt.Sprintf("your plan allows a maximum of %d members. Upgrade to add more.", limit),
				402)
		}
	}

	token, err := generateInvitationToken()
	if err != nil {
		return nil, fmt.Errorf("workspace: invite: generate token: %w", err)
	}

	inv := &domain.WorkspaceInvitation{
		WorkspaceID: workspaceID,
		InvitedBy:   inviterID,
		Email:       email,
		Role:        role,
		Token:       token,
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour),
	}

	created, err := s.invRepo.Create(ctx, inv)
	if err != nil {
		return nil, fmt.Errorf("workspace: invite: create invitation: %w", err)
	}

	// Enqueue invitation email job
	task, taskErr := tasks.NewInvitationTask(workspaceID.String(), inviterID.String(), email, token)
	if taskErr == nil {
		if _, enqErr := s.asynqClient.EnqueueContext(ctx, task); enqErr != nil {
			s.logger.WarnContext(ctx, "failed to enqueue invitation email", "err", enqErr)
		}
	}

	return created, nil
}

// AcceptInvitation validates a token and adds the user as a workspace member.
func (s *workspaceService) AcceptInvitation(ctx context.Context, token string, userID uuid.UUID) error {
	inv, err := s.invRepo.GetByToken(ctx, token)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.NewError("WORKSPACE_004", "invitation not found", 404)
		}
		return fmt.Errorf("workspace: accept: get invitation: %w", err)
	}

	if inv.AcceptedAt != nil {
		return domain.NewError("WORKSPACE_004", "invitation already accepted", 400)
	}
	if time.Now().After(inv.ExpiresAt) {
		return domain.NewError("WORKSPACE_004", "invitation has expired", 400)
	}

	// Accept marks the invitation as accepted in DB
	if _, err := s.invRepo.Accept(ctx, token); err != nil {
		return fmt.Errorf("workspace: accept: mark accepted: %w", err)
	}

	// Add user as member with invitation role
	if _, err := s.wsRepo.AddMember(ctx, inv.WorkspaceID, userID, inv.Role); err != nil {
		return fmt.Errorf("workspace: accept: add member: %w", err)
	}

	return nil
}

// ListInvitations returns all invitations for a workspace.
func (s *workspaceService) ListInvitations(ctx context.Context, workspaceID uuid.UUID) ([]*domain.WorkspaceInvitation, error) {
	invitations, err := s.invRepo.ListByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("workspace: list invitations: %w", err)
	}
	return invitations, nil
}

// DeleteInvitation removes an invitation.
func (s *workspaceService) DeleteInvitation(ctx context.Context, id uuid.UUID) error {
	if err := s.invRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("workspace: delete invitation: %w", err)
	}
	return nil
}

// GetBrandKit reads the brand kit from Workspace.Settings["brand_kit"].
func (s *workspaceService) GetBrandKit(ctx context.Context, workspaceID uuid.UUID) (*domain.BrandKit, error) {
	ws, err := s.wsRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("workspace: get brand kit: %w", err)
	}

	raw, ok := ws.Settings["brand_kit"]
	if !ok || raw == nil {
		return &domain.BrandKit{}, nil
	}

	// Marshal back to JSON so we can unmarshal into the typed struct
	data, err := json.Marshal(raw)
	if err != nil {
		return nil, fmt.Errorf("workspace: get brand kit: marshal: %w", err)
	}

	var kit domain.BrandKit
	if err := json.Unmarshal(data, &kit); err != nil {
		return nil, fmt.Errorf("workspace: get brand kit: unmarshal: %w", err)
	}
	return &kit, nil
}

// UpdateBrandKit writes the brand kit to Workspace.Settings["brand_kit"].
func (s *workspaceService) UpdateBrandKit(ctx context.Context, workspaceID uuid.UUID, kit *domain.BrandKit) error {
	ws, err := s.wsRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("workspace: update brand kit: get: %w", err)
	}

	if ws.Settings == nil {
		ws.Settings = map[string]any{}
	}
	ws.Settings["brand_kit"] = kit

	if _, err := s.wsRepo.Update(ctx, ws); err != nil {
		return fmt.Errorf("workspace: update brand kit: save: %w", err)
	}
	return nil
}

// generateInvitationToken creates a cryptographically secure URL-safe token (32 bytes).
func generateInvitationToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate invitation token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// Ensure workspaceService implements WorkspaceService at compile time.
var _ WorkspaceService = (*workspaceService)(nil)
