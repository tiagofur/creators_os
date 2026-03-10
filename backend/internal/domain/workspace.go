package domain

import (
	"time"

	"github.com/google/uuid"
)

// WorkspaceRole represents a member's role within a workspace.
type WorkspaceRole string

const (
	RoleOwner  WorkspaceRole = "owner"
	RoleAdmin  WorkspaceRole = "admin"
	RoleEditor WorkspaceRole = "editor"
	RoleViewer WorkspaceRole = "viewer"
)

// RoleRank returns a numeric rank for role comparison.
// Higher value means more permissions.
func RoleRank(r WorkspaceRole) int {
	switch r {
	case RoleOwner:
		return 4
	case RoleAdmin:
		return 3
	case RoleEditor:
		return 2
	case RoleViewer:
		return 1
	}
	return 0
}

// Workspace is the core workspace aggregate.
type Workspace struct {
	ID          uuid.UUID
	OwnerID     uuid.UUID
	Name        string
	Slug        string
	Description *string
	AvatarURL   *string
	Settings    map[string]any
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
}

// WorkspaceMember represents a user's membership in a workspace.
type WorkspaceMember struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	UserID      uuid.UUID
	Role        WorkspaceRole
	JoinedAt    time.Time
	// Denormalized for convenience
	UserEmail string
	UserName  string
}

// WorkspaceInvitation represents a pending invitation to join a workspace.
type WorkspaceInvitation struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	InvitedBy   uuid.UUID
	Email       string
	Role        WorkspaceRole
	Token       string
	AcceptedAt  *time.Time
	ExpiresAt   time.Time
	CreatedAt   time.Time
}
