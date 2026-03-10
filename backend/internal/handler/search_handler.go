package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// SearchHandler handles GET /api/v1/workspaces/{workspaceId}/search.
type SearchHandler struct {
	searchSvc *service.SearchService
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(searchSvc *service.SearchService) *SearchHandler {
	return &SearchHandler{searchSvc: searchSvc}
}

// Search handles GET /api/v1/workspaces/{workspaceId}/search
//
// Query params:
//   - q        (required) — search query string
//   - types    (optional) — comma-separated list of resource types (ideas,contents,series,sponsorships)
//   - limit    (optional, default 20)
//   - offset   (optional, default 0)
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		Error(w, domain.NewError("VALIDATION", "query parameter 'q' is required", 400))
		return
	}

	var types []domain.SearchResultType
	if typesParam := r.URL.Query().Get("types"); typesParam != "" {
		for _, t := range strings.Split(typesParam, ",") {
			t = strings.TrimSpace(t)
			switch domain.SearchResultType(t) {
			case domain.SearchResultIdea, domain.SearchResultContent, domain.SearchResultSeries, domain.SearchResultSponsorship:
				types = append(types, domain.SearchResultType(t))
			}
		}
	}

	limit := 20
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := 0
	if oStr := r.URL.Query().Get("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil && o >= 0 {
			offset = o
		}
	}

	resp, err := h.searchSvc.Search(r.Context(), member.WorkspaceID, q, types, limit, offset)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, resp)
}
