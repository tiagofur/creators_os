package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

// SearchService provides global full-text search across workspace resources.
type SearchService struct {
	repo repository.SearchRepository
}

// NewSearchService creates a new SearchService.
func NewSearchService(repo repository.SearchRepository) *SearchService {
	return &SearchService{repo: repo}
}

// Search delegates to the search repository.
func (s *SearchService) Search(ctx context.Context, workspaceID uuid.UUID, query string, types []domain.SearchResultType, limit, offset int) (*domain.SearchResponse, error) {
	return s.repo.Search(ctx, workspaceID, query, types, limit, offset)
}
