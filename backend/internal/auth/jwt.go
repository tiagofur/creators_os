package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
)

const accessTokenTTL = 15 * time.Minute

// jwtClaims extends the standard JWT registered claims with app-specific fields.
type jwtClaims struct {
	jwt.RegisteredClaims
	Email string                  `json:"email"`
	Tier  domain.SubscriptionTier `json:"tier"`
}

// JWTManager handles RS256 token generation and validation.
type JWTManager struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
}

// NewJWTManager parses the PEM-encoded RS256 key pair and returns a JWTManager.
func NewJWTManager(privateKeyPEM, publicKeyPEM []byte) (*JWTManager, error) {
	privBlock, _ := pem.Decode(privateKeyPEM)
	if privBlock == nil {
		return nil, fmt.Errorf("jwt: failed to decode private key PEM")
	}
	privKey, err := x509.ParsePKCS8PrivateKey(privBlock.Bytes)
	if err != nil {
		// Fall back to PKCS1
		privKey, err = x509.ParsePKCS1PrivateKey(privBlock.Bytes)
		if err != nil {
			return nil, fmt.Errorf("jwt: parse private key: %w", err)
		}
	}
	rsaPriv, ok := privKey.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("jwt: private key is not RSA")
	}

	pubBlock, _ := pem.Decode(publicKeyPEM)
	if pubBlock == nil {
		return nil, fmt.Errorf("jwt: failed to decode public key PEM")
	}
	pubKeyIface, err := x509.ParsePKIXPublicKey(pubBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("jwt: parse public key: %w", err)
	}
	rsaPub, ok := pubKeyIface.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("jwt: public key is not RSA")
	}

	return &JWTManager{privateKey: rsaPriv, publicKey: rsaPub}, nil
}

// GenerateAccessToken creates a signed RS256 JWT with a 15-minute TTL.
func (m *JWTManager) GenerateAccessToken(userID uuid.UUID, email string, tier domain.SubscriptionTier) (string, error) {
	now := time.Now()
	claims := jwtClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTokenTTL)),
			ID:        uuid.New().String(),
		},
		Email: email,
		Tier:  tier,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signed, err := token.SignedString(m.privateKey)
	if err != nil {
		return "", fmt.Errorf("jwt: sign access token: %w", err)
	}
	return signed, nil
}

// GenerateRefreshToken returns 32 cryptographically random bytes as a hex string.
func (m *JWTManager) GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("jwt: generate refresh token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// ValidateToken parses and validates the given JWT string.
// Returns domain.ErrTokenExpired or domain.ErrUnauthorized on failure.
func (m *JWTManager) ValidateToken(tokenString string) (*domain.UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwtClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("jwt: unexpected signing method: %v", t.Header["alg"])
		}
		return m.publicKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, domain.ErrTokenExpired
		}
		return nil, domain.ErrUnauthorized
	}

	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return nil, domain.ErrUnauthorized
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	return &domain.UserClaims{
		UserID:           userID,
		Email:            claims.Email,
		SubscriptionTier: claims.Tier,
	}, nil
}

// TokenHash returns the SHA-256 hex digest of the given token string.
// Used for storing refresh tokens securely.
func (m *JWTManager) TokenHash(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
