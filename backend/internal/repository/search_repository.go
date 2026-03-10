package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
)

// SearchRepository provides full-text search across workspace resources.
type SearchRepository interface {
	// Search queries ideas, contents, series, and sponsorships for the given
	// freetext query within a workspace. If types is non-empty only those
	// resource types are queried. Results are ranked by ts_rank descending.
	Search(ctx context.Context, workspaceID uuid.UUID, query string, types []domain.SearchResultType, limit, offset int) (*domain.SearchResponse, error)
}
