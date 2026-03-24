package domain

import (
	"time"

	"github.com/google/uuid"
)

// AIConversation represents a conversation session with an AI assistant.
type AIConversation struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	UserID      uuid.UUID
	Title       *string
	Mode        string
	ContextData map[string]any
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
}

// AIMessage represents a single message within an AI conversation.
type AIMessage struct {
	ID             uuid.UUID
	ConversationID uuid.UUID
	Role           string // "user" or "assistant"
	Content        string
	TokensUsed     int
	Model          *string
	CreatedAt      time.Time
}

// ScriptSuggestion represents a single AI suggestion for improving a script.
type ScriptSuggestion struct {
	ID                   string `json:"id"`
	Type                 string `json:"type"` // hook, clarity, cta, pacing, engagement
	AffectedText         string `json:"affected_text"`
	SuggestedImprovement string `json:"suggested_improvement"`
}

// AICreditUsage records AI credit consumption for billing and auditing.
type AICreditUsage struct {
	ID             uuid.UUID
	UserID         uuid.UUID
	WorkspaceID    uuid.UUID
	OperationType  string
	TokensUsed     int
	CreditsCharged int
	Model          *string
	CreatedAt      time.Time
}
