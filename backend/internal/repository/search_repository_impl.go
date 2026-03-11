package repository

import (
	"context"
	"sort"
	"sync"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
)

type pgSearchRepository struct {
	pool *pgxpool.Pool
}

// NewSearchRepository creates a SearchRepository backed by the provided pool.
func NewSearchRepository(pool *pgxpool.Pool) SearchRepository {
	return &pgSearchRepository{pool: pool}
}

// wantType returns true when the given type should be included in this search.
func wantType(types []domain.SearchResultType, t domain.SearchResultType) bool {
	if len(types) == 0 {
		return true
	}
	for _, tt := range types {
		if tt == t {
			return true
		}
	}
	return false
}

// Search runs parallel FTS queries for each requested entity type, merges the
// results, and returns them sorted by rank descending.
func (r *pgSearchRepository) Search(
	ctx context.Context,
	workspaceID uuid.UUID,
	query string,
	types []domain.SearchResultType,
	limit, offset int,
) (*domain.SearchResponse, error) {
	if limit <= 0 {
		limit = 20
	}

	type queryResult struct {
		results []*domain.SearchResult
		err     error
	}

	var wg sync.WaitGroup
	resultCh := make(chan queryResult, 4)

	// ideas
	if wantType(types, domain.SearchResultIdea) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rows, err := r.pool.Query(ctx, `
				SELECT id::text, title, description,
				       ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
				FROM ideas
				WHERE search_vector @@ plainto_tsquery('english', $1)
				  AND workspace_id = $2
				  AND deleted_at IS NULL
				ORDER BY rank DESC
			`, query, workspaceID)
			if err != nil {
				resultCh <- queryResult{err: err}
				return
			}
			defer rows.Close()
			var results []*domain.SearchResult
			for rows.Next() {
				sr := &domain.SearchResult{Type: domain.SearchResultIdea}
				if err := rows.Scan(&sr.ID, &sr.Title, &sr.Description, &sr.Rank); err != nil {
					resultCh <- queryResult{err: err}
					return
				}
				results = append(results, sr)
			}
			resultCh <- queryResult{results: results, err: rows.Err()}
		}()
	}

	// contents
	if wantType(types, domain.SearchResultContent) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rows, err := r.pool.Query(ctx, `
				SELECT id::text, title, description,
				       ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
				FROM contents
				WHERE search_vector @@ plainto_tsquery('english', $1)
				  AND workspace_id = $2
				  AND deleted_at IS NULL
				ORDER BY rank DESC
			`, query, workspaceID)
			if err != nil {
				resultCh <- queryResult{err: err}
				return
			}
			defer rows.Close()
			var results []*domain.SearchResult
			for rows.Next() {
				sr := &domain.SearchResult{Type: domain.SearchResultContent}
				if err := rows.Scan(&sr.ID, &sr.Title, &sr.Description, &sr.Rank); err != nil {
					resultCh <- queryResult{err: err}
					return
				}
				results = append(results, sr)
			}
			resultCh <- queryResult{results: results, err: rows.Err()}
		}()
	}

	// series
	if wantType(types, domain.SearchResultSeries) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rows, err := r.pool.Query(ctx, `
				SELECT id::text, title, description,
				       ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
				FROM series
				WHERE search_vector @@ plainto_tsquery('english', $1)
				  AND workspace_id = $2
				  AND deleted_at IS NULL
				ORDER BY rank DESC
			`, query, workspaceID)
			if err != nil {
				resultCh <- queryResult{err: err}
				return
			}
			defer rows.Close()
			var results []*domain.SearchResult
			for rows.Next() {
				sr := &domain.SearchResult{Type: domain.SearchResultSeries}
				if err := rows.Scan(&sr.ID, &sr.Title, &sr.Description, &sr.Rank); err != nil {
					resultCh <- queryResult{err: err}
					return
				}
				results = append(results, sr)
			}
			resultCh <- queryResult{results: results, err: rows.Err()}
		}()
	}

	// sponsorships
	if wantType(types, domain.SearchResultSponsorship) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rows, err := r.pool.Query(ctx, `
				SELECT id::text, brand_name, notes,
				       ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
				FROM sponsorships
				WHERE search_vector @@ plainto_tsquery('english', $1)
				  AND workspace_id = $2
				  AND deleted_at IS NULL
				ORDER BY rank DESC
			`, query, workspaceID)
			if err != nil {
				resultCh <- queryResult{err: err}
				return
			}
			defer rows.Close()
			var results []*domain.SearchResult
			for rows.Next() {
				sr := &domain.SearchResult{Type: domain.SearchResultSponsorship}
				if err := rows.Scan(&sr.ID, &sr.Title, &sr.Description, &sr.Rank); err != nil {
					resultCh <- queryResult{err: err}
					return
				}
				results = append(results, sr)
			}
			resultCh <- queryResult{results: results, err: rows.Err()}
		}()
	}

	// Wait in a separate goroutine so we can drain resultCh.
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	all := make([]*domain.SearchResult, 0)
	for qr := range resultCh {
		if qr.err != nil {
			return nil, qr.err
		}
		all = append(all, qr.results...)
	}

	// Sort merged results by rank descending.
	sort.Slice(all, func(i, j int) bool {
		return all[i].Rank > all[j].Rank
	})

	total := len(all)

	// Apply offset and limit.
	if offset > total {
		offset = total
	}
	all = all[offset:]
	if limit < len(all) {
		all = all[:limit]
	}

	return &domain.SearchResponse{
		Results:    all,
		TotalCount: total,
		Query:      query,
	}, nil
}

// Compile-time interface check.
var _ SearchRepository = (*pgSearchRepository)(nil)
