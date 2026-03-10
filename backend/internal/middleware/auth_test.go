package middleware_test

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func generateKeyPair(t *testing.T) ([]byte, []byte) {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	privDER, err := x509.MarshalPKCS8PrivateKey(priv)
	require.NoError(t, err)
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privDER})

	pubDER, err := x509.MarshalPKIXPublicKey(&priv.PublicKey)
	require.NoError(t, err)
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})

	return privPEM, pubPEM
}

func TestAuthenticate_ValidToken(t *testing.T) {
	privPEM, pubPEM := generateKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	userID := uuid.New()
	token, err := mgr.GenerateAccessToken(userID, "user@example.com", domain.TierFree)
	require.NoError(t, err)

	var capturedClaims *domain.UserClaims
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := middleware.UserClaimsFromContext(r.Context())
		assert.True(t, ok)
		capturedClaims = claims
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.Authenticate(mgr)(next)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, capturedClaims)
	assert.Equal(t, userID, capturedClaims.UserID)
	assert.Equal(t, "user@example.com", capturedClaims.Email)
}

func TestAuthenticate_MissingHeader(t *testing.T) {
	privPEM, pubPEM := generateKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next should not be called")
	})

	handler := middleware.Authenticate(mgr)(next)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestAuthenticate_InvalidToken(t *testing.T) {
	privPEM, pubPEM := generateKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next should not be called")
	})

	handler := middleware.Authenticate(mgr)(next)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer notavalidtoken")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
