package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/ordo/creators-os/internal/domain"
)

const maxBodyBytes = 1 << 20 // 1 MB

// JSON encodes v as JSON and writes it with the given HTTP status.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error maps an error to an HTTP response.
// If the error is a *domain.AppError the code and status are used directly.
// All other errors produce a generic 500.
func Error(w http.ResponseWriter, err error) {
	var appErr *domain.AppError
	if errors.As(err, &appErr) {
		JSON(w, appErr.HTTPStatus, appErr)
		return
	}
	JSON(w, http.StatusInternalServerError, domain.NewError("INTERNAL", "internal server error", 500))
}

// Decode reads and decodes the JSON body into v, enforcing the 1 MB size limit.
func Decode(r *http.Request, v any) error {
	limited := http.MaxBytesReader(noopResponseWriter{}, r.Body, maxBodyBytes)
	dec := json.NewDecoder(limited)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// noopResponseWriter satisfies http.ResponseWriter for MaxBytesReader without writing anything.
type noopResponseWriter struct{}

func (noopResponseWriter) Header() http.Header       { return http.Header{} }
func (noopResponseWriter) Write(b []byte) (int, error) { return len(b), nil }
func (noopResponseWriter) WriteHeader(int)            {}
