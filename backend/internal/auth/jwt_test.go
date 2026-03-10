package auth_test

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"testing"
	"time"

	jwtpkg "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func generateTestKeyPair(t *testing.T) ([]byte, []byte, *rsa.PrivateKey) {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	privDER, err := x509.MarshalPKCS8PrivateKey(priv)
	require.NoError(t, err)
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privDER})

	pubDER, err := x509.MarshalPKIXPublicKey(&priv.PublicKey)
	require.NoError(t, err)
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})

	return privPEM, pubPEM, priv
}

func TestJWTRoundTrip(t *testing.T) {
	privPEM, pubPEM, _ := generateTestKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	userID := uuid.New()
	email := "test@example.com"
	tier := domain.TierPro

	token, err := mgr.GenerateAccessToken(userID, email, tier)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := mgr.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, tier, claims.SubscriptionTier)
}

func TestJWTExpiredRejection(t *testing.T) {
	privPEM, pubPEM, privKey := generateTestKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	// Build an already-expired token
	past := time.Now().Add(-1 * time.Hour)
	claims := jwtpkg.MapClaims{
		"sub":   uuid.New().String(),
		"email": "expired@example.com",
		"tier":  "free",
		"iat":   past.Unix(),
		"exp":   past.Add(15 * time.Minute).Unix(), // still in the past
		"jti":   uuid.New().String(),
	}
	token := jwtpkg.NewWithClaims(jwtpkg.SigningMethodRS256, claims)
	signed, err := token.SignedString(privKey)
	require.NoError(t, err)

	_, err = mgr.ValidateToken(signed)
	assert.ErrorIs(t, err, domain.ErrTokenExpired)
}

func TestJWTTamperedRejection(t *testing.T) {
	privPEM, pubPEM, _ := generateTestKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	token, err := mgr.GenerateAccessToken(uuid.New(), "test@example.com", domain.TierFree)
	require.NoError(t, err)

	// Tamper with the token by appending garbage
	tampered := token + "tampered"
	_, err = mgr.ValidateToken(tampered)
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

func TestJWTRefreshTokenGeneration(t *testing.T) {
	privPEM, pubPEM, _ := generateTestKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	tok1, err := mgr.GenerateRefreshToken()
	require.NoError(t, err)
	assert.Len(t, tok1, 64) // 32 bytes = 64 hex chars

	tok2, err := mgr.GenerateRefreshToken()
	require.NoError(t, err)
	assert.NotEqual(t, tok1, tok2)
}

func TestJWTTokenHash(t *testing.T) {
	privPEM, pubPEM, _ := generateTestKeyPair(t)
	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)

	h1 := mgr.TokenHash("sometoken")
	h2 := mgr.TokenHash("sometoken")
	assert.Equal(t, h1, h2)

	h3 := mgr.TokenHash("different")
	assert.NotEqual(t, h1, h3)
}

func TestJWTWrongKey(t *testing.T) {
	privPEM, pubPEM, _ := generateTestKeyPair(t)
	_, pubPEM2, _ := generateTestKeyPair(t)

	// Sign with key1, verify with key2
	mgr1, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)
	mgr2, err := auth.NewJWTManager(privPEM, pubPEM2) // wrong pub key
	require.NoError(t, err)

	token, err := mgr1.GenerateAccessToken(uuid.New(), "x@x.com", domain.TierFree)
	require.NoError(t, err)

	_, err = mgr2.ValidateToken(token)
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}
