package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ordo/creators-os/internal/middleware"
)

func TestSecurityHeaders_AllEnvironments(t *testing.T) {
	for _, env := range []string{"development", "staging", "test"} {
		t.Run(env, func(t *testing.T) {
			handler := middleware.SecurityHeaders(env)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest(http.MethodGet, "/health", nil)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			h := rr.Header()
			assertHeader(t, h, "X-Content-Type-Options", "nosniff")
			assertHeader(t, h, "X-Frame-Options", "DENY")
			assertHeader(t, h, "Referrer-Policy", "strict-origin-when-cross-origin")
			assertHeader(t, h, "Permissions-Policy", "camera=(), microphone=(), geolocation=()")

			// HSTS must NOT be set outside production.
			if got := h.Get("Strict-Transport-Security"); got != "" {
				t.Errorf("env=%s: expected no HSTS header but got %q", env, got)
			}
		})
	}
}

func TestSecurityHeaders_Production_HSTS(t *testing.T) {
	handler := middleware.SecurityHeaders("production")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	h := rr.Header()
	assertHeader(t, h, "X-Content-Type-Options", "nosniff")
	assertHeader(t, h, "X-Frame-Options", "DENY")
	assertHeader(t, h, "Referrer-Policy", "strict-origin-when-cross-origin")
	assertHeader(t, h, "Permissions-Policy", "camera=(), microphone=(), geolocation=()")
	assertHeader(t, h, "Strict-Transport-Security", "max-age=31536000; includeSubDomains")
}

func assertHeader(t *testing.T, h http.Header, name, want string) {
	t.Helper()
	if got := h.Get(name); got != want {
		t.Errorf("header %q: want %q, got %q", name, want, got)
	}
}
