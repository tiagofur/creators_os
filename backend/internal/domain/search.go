package domain

// SearchResultType identifies which resource type a search result belongs to.
type SearchResultType string

const (
	SearchResultIdea        SearchResultType = "idea"
	SearchResultContent     SearchResultType = "content"
	SearchResultSeries      SearchResultType = "series"
	SearchResultSponsorship SearchResultType = "sponsorship"
)

// SearchResult is a single FTS hit returned from the global search endpoint.
type SearchResult struct {
	ID          string           `json:"id"`
	Type        SearchResultType `json:"type"`
	Title       string           `json:"title"`
	Description *string          `json:"description,omitempty"`
	Rank        float64          `json:"rank"`
}

// SearchResponse is the envelope returned by GET /workspaces/{id}/search.
type SearchResponse struct {
	Results    []*SearchResult `json:"results"`
	TotalCount int             `json:"total_count"`
	Query      string          `json:"query"`
}
