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

// BrandKit holds workspace-level brand voice, tone, style, and boilerplate guidelines.
// It is stored as a JSON object inside Workspace.Settings["brand_kit"].
type BrandKit struct {
	Voice            string   `json:"voice"`
	Tone             string   `json:"tone"`
	StyleRules       string   `json:"style_rules"`
	BoilerplateIntro string   `json:"boilerplate_intro"`
	BoilerplateOutro string   `json:"boilerplate_outro"`
	Keywords         []string `json:"keywords"`
	AntiKeywords     []string `json:"anti_keywords"`
}

// Workspace is the core workspace aggregate.
type Workspace struct {
	ID          uuid.UUID      `json:"id"`
	OwnerID     uuid.UUID      `json:"owner_id"`
	Name        string         `json:"name"`
	Slug        string         `json:"slug"`
	Description *string        `json:"description,omitempty"`
	AvatarURL   *string        `json:"avatar_url,omitempty"`
	Settings    map[string]any `json:"settings,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   *time.Time     `json:"deleted_at,omitempty"`
}

// WorkspaceMember represents a user's membership in a workspace.
type WorkspaceMember struct {
	ID          uuid.UUID     `json:"id"`
	WorkspaceID uuid.UUID     `json:"workspace_id"`
	UserID      uuid.UUID     `json:"user_id"`
	Role        WorkspaceRole `json:"role"`
	JoinedAt    time.Time     `json:"joined_at"`
	// Denormalized for convenience
	UserEmail string `json:"user_email"`
	UserName  string `json:"user_name"`
}

// WorkspaceInvitation represents a pending invitation to join a workspace.
type WorkspaceInvitation struct {
	ID          uuid.UUID     `json:"id"`
	WorkspaceID uuid.UUID     `json:"workspace_id"`
	InvitedBy   uuid.UUID     `json:"invited_by"`
	Email       string        `json:"email"`
	Role        WorkspaceRole `json:"role"`
	Token       string        `json:"token"`
	AcceptedAt  *time.Time    `json:"accepted_at,omitempty"`
	ExpiresAt   time.Time     `json:"expires_at"`
	CreatedAt   time.Time     `json:"created_at"`
}
