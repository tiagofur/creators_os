package domain

import (
	"testing"
)

func TestValidateStatusTransition_ValidForward(t *testing.T) {
	cases := []struct {
		from ContentStatus
		to   ContentStatus
	}{
		{ContentStatusIdea, ContentStatusScripting},
		{ContentStatusScripting, ContentStatusRecording},
		{ContentStatusRecording, ContentStatusEditing},
		{ContentStatusEditing, ContentStatusReview},
		{ContentStatusReview, ContentStatusScheduled},
		{ContentStatusScheduled, ContentStatusPublished},
		{ContentStatusPublished, ContentStatusArchived},
	}
	for _, tc := range cases {
		if err := ValidateStatusTransition(tc.from, tc.to); err != nil {
			t.Errorf("expected valid transition %s -> %s, got error: %v", tc.from, tc.to, err)
		}
	}
}

func TestValidateStatusTransition_SkippingStepErrors(t *testing.T) {
	cases := []struct {
		from ContentStatus
		to   ContentStatus
	}{
		{ContentStatusIdea, ContentStatusRecording},
		{ContentStatusIdea, ContentStatusEditing},
		{ContentStatusScripting, ContentStatusEditing},
		{ContentStatusRecording, ContentStatusReview},
		{ContentStatusEditing, ContentStatusScheduled},
		{ContentStatusReview, ContentStatusPublished},
	}
	for _, tc := range cases {
		if err := ValidateStatusTransition(tc.from, tc.to); err == nil {
			t.Errorf("expected error for skipped transition %s -> %s, got nil", tc.from, tc.to)
		}
	}
}

func TestValidateStatusTransition_ReverseErrors(t *testing.T) {
	cases := []struct {
		from ContentStatus
		to   ContentStatus
	}{
		{ContentStatusRecording, ContentStatusIdea},
		{ContentStatusEditing, ContentStatusIdea},
		{ContentStatusReview, ContentStatusIdea},
		{ContentStatusScheduled, ContentStatusIdea},
		{ContentStatusPublished, ContentStatusIdea},
		{ContentStatusArchived, ContentStatusIdea},
		{ContentStatusArchived, ContentStatusScripting},
	}
	for _, tc := range cases {
		if err := ValidateStatusTransition(tc.from, tc.to); err == nil {
			t.Errorf("expected error for reverse transition %s -> %s, got nil", tc.from, tc.to)
		}
	}
}

func TestValidateStatusTransition_UnknownSourceError(t *testing.T) {
	err := ValidateStatusTransition(ContentStatus("unknown"), ContentStatusScripting)
	if err == nil {
		t.Error("expected error for unknown source status, got nil")
	}
}

func TestValidateStatusTransition_ValidReverseAllowed(t *testing.T) {
	// Scripting -> Idea is a valid step-back
	if err := ValidateStatusTransition(ContentStatusScripting, ContentStatusIdea); err != nil {
		t.Errorf("expected scripting -> idea to be valid, got: %v", err)
	}
}
