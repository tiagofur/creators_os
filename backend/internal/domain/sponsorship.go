package domain

import (
	"time"

	"github.com/google/uuid"
)

// SponsorshipStatus represents the CRM pipeline stage for a sponsorship deal.
type SponsorshipStatus string

const (
	SponsorshipLead        SponsorshipStatus = "lead"
	SponsorshipNegotiating SponsorshipStatus = "negotiating"
	SponsorshipActive      SponsorshipStatus = "active"
	SponsorshipCompleted   SponsorshipStatus = "completed"
	SponsorshipRejected    SponsorshipStatus = "rejected"
)

// Sponsorship represents a brand sponsorship deal tracked in the CRM.
type Sponsorship struct {
	ID           uuid.UUID
	WorkspaceID  uuid.UUID
	BrandName    string
	ContactName  *string
	ContactEmail *string
	Status       SponsorshipStatus
	DealValue    *float64
	Currency     string
	Notes        *string
	StartDate    *time.Time
	EndDate      *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time
}

// SponsorshipMessage is a communication log entry attached to a sponsorship.
type SponsorshipMessage struct {
	ID            uuid.UUID
	SponsorshipID uuid.UUID
	UserID        uuid.UUID
	Content       string
	CreatedAt     time.Time
}

// SponsorshipFilter defines optional filters for listing sponsorships.
type SponsorshipFilter struct {
	Status *SponsorshipStatus
	From   *time.Time
	To     *time.Time
	Limit  int
	Offset int
}
