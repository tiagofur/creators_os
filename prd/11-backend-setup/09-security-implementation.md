# Security Implementation Specification
## Ordo Creator OS — Go Backend

**Status**: Final
**Version**: 1.0
**Last Updated**: 2026-03-10
**Phase**: Core Implementation

---

## 1. Security Principles

All security decisions follow these foundational principles:

### 1.1 Defense in Depth
- **Multiple layers** of protection at each boundary (network, application, database)
- No single point of failure; compromise at one layer does not expose the system
- Example: HTTPS + API token auth + RBAC + RLS + field-level filtering

### 1.2 Least Privilege
- Every user, service, and process gets **minimal permissions needed** to function
- Default: deny access; grant explicitly only what is required
- Workspace isolation enforced at query level (not trusted client filtering)

### 1.3 Fail Secure
- **Deny by default** in all authentication and authorization checks
- Errors never leak system internals (no stack traces in API responses)
- Rate limits fail closed (reject traffic over limits, not ignore)

### 1.4 Security by Design
- Security is part of the architecture, not bolted on later
- Every handler, every database query, every file operation includes security controls
- Security reviews happen before code merge, not after production incidents

---

## 2. HTTPS & TLS Configuration

### 2.1 Protocol Requirements

**Production**:
- TLS 1.3 **only** (TLS 1.2 disabled)
- No fallback to HTTP; all traffic encrypted

**Development**:
- TLS 1.3 preferred; TLS 1.2 acceptable for local testing
- Self-signed certs for localhost

### 2.2 HTTP Strict Transport Security (HSTS)

All responses include:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- **max-age=31536000**: 1 year cache (prevent HTTPS downgrade attacks)
- **includeSubDomains**: All subdomains must use HTTPS
- **preload**: Domain added to HSTS preload list (browsers don't connect over HTTP even on first visit)

### 2.3 HTTP → HTTPS Redirect

Configured at **load balancer level** (not in Go app):
- Request to `http://api.ordocreator.com/*` → 301 Moved Permanently to `https://api.ordocreator.com/*`
- Prevents accidental unencrypted traffic
- Load balancer terminates TLS; Go app receives requests on port 8080 over private network

### 2.4 Certificates

**AWS ACM (Certificate Manager)**:
- Free SSL/TLS certificates for `ordocreator.com` and `*.ordocreator.com`
- Auto-renewal 30 days before expiry
- Installed on ALB (Application Load Balancer)
- Never expires without intervention

**Monitoring**:
- CloudWatch alert if certificate expires in <7 days
- Automated renewal pipeline tested monthly

---

## 3. CORS Configuration

### 3.1 Origins Whitelist

```
Production:
  - https://app.ordocreator.com
  - https://dashboard.ordocreator.com (future)

Development:
  - http://localhost:3000
  - http://127.0.0.1:3000
```

**No wildcards.** Exact origin matching only.

### 3.2 Allowed HTTP Methods

```
GET, POST, PATCH, DELETE, OPTIONS
```

- PUT excluded (use PATCH for partial updates)
- HEAD excluded (GET is sufficient for metadata)

### 3.3 Allowed Headers

**Request headers clients can send**:
```
Authorization, Content-Type, X-Request-ID, X-Workspace-ID, X-CSRF-Token
```

**Response headers clients can read**:
```
Content-Type, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID
```

### 3.4 Credentials

```
Access-Control-Allow-Credentials: true
```

- Required because tokens/cookies are sent with all requests
- Client must pass `credentials: 'include'` in fetch/axios calls

### 3.5 Preflight Cache

```
Access-Control-Max-Age: 86400
```

- 24 hours: browser caches preflight (OPTIONS) responses
- Reduces OPTIONS requests for repeated endpoints

### 3.6 Go Chi CORS Middleware

```go
// middleware/cors.go
package middleware

import (
	"github.com/go-chi/chi/v5"
	"github.com/rs/cors"
)

func CORS() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		c := cors.New(cors.Options{
			AllowedOrigins: []string{
				"https://app.ordocreator.com",
				"https://dashboard.ordocreator.com",
			},
			AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID", "X-Workspace-ID", "X-CSRF-Token"},
			ExposedHeaders:   []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "X-Request-ID"},
			AllowCredentials: true,
			MaxAge:           86400,
		})
		return c.Handler(next)
	}
}

// Register in router
r.Use(CORS())
```

---

## 4. CSRF Protection

### 4.1 SameSite Cookies (Primary Defense)

**All session/auth cookies set with**:
```
Set-Cookie: refresh_token=...; SameSite=Strict; Secure; HttpOnly; Path=/; Max-Age=604800
```

- **SameSite=Strict**: Cookie **never** sent on cross-site requests (GET or POST)
- **Secure**: Cookie only sent over HTTPS
- **HttpOnly**: Cookie not accessible to JavaScript (prevents XSS token theft)
- **Path=/**: Available to entire domain

This **eliminates most CSRF attacks**. A malicious site cannot trigger state-changing requests with the auth cookie.

### 4.2 Double-Submit Cookie Pattern (Extra Layer)

For **sensitive state-changing requests**, use double-submit pattern:

1. **Backend generates CSRF token** at login/page load
2. **Client receives token in response header** (not a cookie)
3. **Client sends token back in `X-CSRF-Token` header**
4. **Backend validates token matches session**

Implementation:

```go
// Generate CSRF token
func (s *Session) GenerateCSRFToken() (string, error) {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return "", err
	}
	tokenStr := base64.StdEncoding.EncodeToString(token)
	s.CSRFToken = tokenStr
	s.CSRFTokenExpiry = time.Now().Add(24 * time.Hour)
	return tokenStr, nil
}

// Middleware to validate CSRF token
func ValidateCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip for safe methods and API key auth
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		// Check if using API key (skip CSRF)
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer sk_") {
			next.ServeHTTP(w, r)
			return
		}

		// Extract session and CSRF token from request
		session := r.Context().Value("session").(*Session)
		clientToken := r.Header.Get("X-CSRF-Token")

		if session == nil || session.CSRFToken == "" || clientToken != session.CSRFToken {
			http.Error(w, "CSRF token invalid", http.StatusForbidden)
			return
		}

		if time.Now().After(session.CSRFTokenExpiry) {
			http.Error(w, "CSRF token expired", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

### 4.3 Exemptions

**CSRF token NOT required for**:
- API key authentication (machine-to-machine, no cookie involved)
- Webhook handlers (external, verify signature instead)
- GET/HEAD/OPTIONS (safe methods, no state change)

### 4.4 When to Use Each Layer

| Scenario | SameSite=Strict | CSRF Token |
|----------|-----------------|-----------|
| Browser form submission with cookie | ✓ (primary) | Optional (extra) |
| Third-party app calling API with key | ✗ | ✗ |
| Mobile app with JWT | ✗ | ✗ |
| Webhook from Stripe | ✗ | ✗ (verify signature) |

---

## 5. Input Validation & Sanitization

### 5.1 Validation Framework: go-playground/validator

Install:
```bash
go get github.com/go-playground/validator/v10
```

Validate all request bodies at handler entry point:

```go
// models/user.go
package models

type CreateUserRequest struct {
	Email    string `json:"email" validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=8,max=128"`
	Name     string `json:"name" validate:"required,max=255"`
}

// handlers/auth.go
package handlers

import "github.com/go-playground/validator/v10"

var validate = validator.New()

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate struct
	if err := validate.Struct(req); err != nil {
		http.Error(w, fmt.Sprintf("Validation failed: %v", err), http.StatusBadRequest)
		return
	}

	// Process...
}
```

### 5.2 String Sanitization

**All string inputs**:
- Trim leading/trailing whitespace
- Limit length based on field (email: 255, name: 255, title: 500)
- Reject null bytes (`\x00`)

```go
// helpers/sanitize.go
package helpers

import (
	"strings"
	"unicode"
)

func SanitizeString(s string, maxLen int) (string, error) {
	// Trim whitespace
	s = strings.TrimSpace(s)

	// Check for null bytes
	if strings.ContainsRune(s, '\x00') {
		return "", fmt.Errorf("null bytes not allowed")
	}

	// Check length
	if len(s) > maxLen {
		return "", fmt.Errorf("exceeds max length %d", maxLen)
	}

	// Remove control characters (except newlines for text areas)
	for _, r := range s {
		if unicode.IsControl(r) && r != '\n' && r != '\r' {
			return "", fmt.Errorf("control characters not allowed")
		}
	}

	return s, nil
}
```

### 5.3 HTML Sanitization: bluemonday

Install:
```bash
go get github.com/microcosm-cc/bluemonday
```

Strip all HTML from user input by default:

```go
// helpers/html.go
package helpers

import (
	"github.com/microcosm-cc/bluemonday"
)

var (
	// Strict policy: strip all HTML
	StrictPolicy = bluemonday.StrictPolicy()

	// Relaxed policy: allow safe HTML (links, bold, italic)
	RelaxedPolicy = bluemonday.UGCPolicy()
)

func SanitizeHTML(dirty string, policy *bluemonday.Policy) string {
	return policy.Sanitize(dirty)
}

// Usage
description := SanitizeHTML(userInput, helpers.StrictPolicy) // Strip all HTML
```

### 5.4 SQL Injection Prevention: sqlc

**Never write raw SQL.** Use [sqlc](https://sqlc.dev) for type-safe parameterized queries.

```sql
-- queries/users.sql
-- name: GetUserByEmail :one
SELECT id, email, password_hash, workspace_id
FROM users
WHERE email = $1 AND workspace_id = $2;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, workspace_id, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING id, email, workspace_id, created_at;
```

Generated Go code (type-safe, parameterized):
```go
user, err := q.GetUserByEmail(ctx, db.GetUserByEmailParams{
	Email:       email,
	WorkspaceID: workspaceID,
})
```

### 5.5 Path Traversal Prevention

Validate file paths; reject `..` sequences:

```go
// helpers/path.go
package helpers

import (
	"fmt"
	"path/filepath"
	"strings"
)

func ValidateSafePath(baseDir, userPath string) (string, error) {
	// Prevent directory traversal
	if strings.Contains(userPath, "..") {
		return "", fmt.Errorf("path traversal detected")
	}

	// Resolve to absolute path
	fullPath := filepath.Join(baseDir, userPath)
	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		return "", err
	}

	// Ensure result is still under baseDir
	absBase, _ := filepath.Abs(baseDir)
	if !strings.HasPrefix(absPath, absBase) {
		return "", fmt.Errorf("path escapes base directory")
	}

	return absPath, nil
}
```

### 5.6 Request Body Size Limits

Enforce at middleware level:

```go
// middleware/request_limits.go
package middleware

import "net/http"

const (
	MaxGeneralBody   = 1 * 1024 * 1024        // 1MB for general requests
	MaxFileMetadata  = 10 * 1024 * 1024       // 10MB for file metadata
	MaxPresignedBody = 2 * 1024 * 1024 * 1024 // 2GB for presigned upload body
)

func LimitRequestBody(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// In router setup
r.Use(LimitRequestBody(MaxGeneralBody))
```

### 5.7 Content-Type Validation

Validate `Content-Type` header on all POST/PATCH requests:

```go
// middleware/content_type.go
package middleware

import (
	"net/http"
	"strings"
)

func ValidateContentType(allowedTypes []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost && r.Method != http.MethodPatch {
				next.ServeHTTP(w, r)
				return
			}

			contentType := r.Header.Get("Content-Type")
			valid := false
			for _, allowed := range allowedTypes {
				if strings.HasPrefix(contentType, allowed) {
					valid = true
					break
				}
			}

			if !valid {
				http.Error(w, "Invalid Content-Type", http.StatusUnsupportedMediaType)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Usage
r.Post("/users", ValidateContentType([]string{"application/json"}), handlers.CreateUser)
```

---

## 6. Rate Limiting

### 6.1 Tier-Based Limits

| Plan | Limit | Window |
|------|-------|--------|
| Free | 100 req/min | 1 minute |
| Pro | 500 req/min | 1 minute |
| Enterprise | 2000 req/min | 1 minute |

Per **user_id + endpoint group**, not per-endpoint (finer granularity causes false positives).

### 6.2 Endpoint Groups

```
general     → GET /workspaces, POST /workspaces, etc. (100% of limit)
ai          → POST /chat, POST /generate (share 50% of limit)
auth        → POST /auth/login, POST /auth/register (separate, see 6.4)
file_upload → POST /files/upload (separate, see 6.4)
```

### 6.3 Implementation: Redis Sliding Window

Redis `MULTI/EXEC` ensures atomic counter increments:

```go
// services/rate_limiter.go
package services

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
	redis *redis.Client
}

func NewRateLimiter(rdb *redis.Client) *RateLimiter {
	return &RateLimiter{redis: rdb}
}

type RateLimitConfig struct {
	Limit   int           // Requests allowed
	Window  time.Duration // Time window
	UserID  string
	Group   string // "general", "ai", "auth"
}

// CheckLimit returns (allowed, remaining, resetTime, error)
func (rl *RateLimiter) CheckLimit(ctx context.Context, cfg RateLimitConfig) (bool, int, time.Time, error) {
	key := fmt.Sprintf("rate_limit:%s:%s", cfg.UserID, cfg.Group)
	now := time.Now().Unix()
	windowStart := now - int64(cfg.Window.Seconds())

	// Atomic transaction: remove old entries, increment, get count
	res, err := rl.redis.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		// Remove entries outside window
		pipe.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("(%d", windowStart))
		// Add current request with timestamp
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: fmt.Sprintf("%d", now)})
		// Set expiry to window duration
		pipe.Expire(ctx, key, cfg.Window+time.Second)
		// Count requests in window
		pipe.ZCard(ctx, key)
		return nil
	})

	if err != nil {
		return false, 0, time.Time{}, err
	}

	count := int(res[3].(*redis.IntCmd).Val())
	remaining := cfg.Limit - count
	resetTime := time.Unix(now+int64(cfg.Window.Seconds()), 0)

	allowed := count <= cfg.Limit

	return allowed, remaining, resetTime, nil
}
```

### 6.4 Specialized Limits

**Authentication (per IP, not user)**:
```
POST /auth/login:   5 attempts per 15 minutes
POST /auth/register: 3 attempts per hour
```

```go
// Separate rate limiter keyed by IP
authLimiter.CheckLimit(ctx, RateLimitConfig{
	Limit:   5,
	Window:  15 * time.Minute,
	UserID:  clientIP,
	Group:   "auth_login",
})
```

**File Upload**:
```
POST /files/upload: 10 uploads per hour per user
```

**AI Requests** (use credit system in addition to rate limit):
```
POST /chat: Limited by plan + credit balance
```

### 6.5 Rate Limit Headers

All responses include:

```
X-RateLimit-Limit:     100
X-RateLimit-Remaining: 42
X-RateLimit-Reset:     1678886400
```

`X-RateLimit-Reset` is Unix timestamp when limit resets.

### 6.6 429 Response

When limit exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please retry after 45 seconds.",
  "retry_after": 45
}
```

### 6.7 Middleware Integration

```go
// middleware/rate_limit.go
package middleware

import (
	"net/http"
	"strconv"
	"time"

	"ordo-backend/models"
	"ordo-backend/services"
)

func RateLimitMiddleware(limiter *services.RateLimiter, userPlan models.PlanTier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := r.Context().Value("user").(*models.User)
			if user == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Determine limit based on plan
			var limit int
			switch userPlan {
			case models.PlanFree:
				limit = 100
			case models.PlanPro:
				limit = 500
			case models.PlanEnterprise:
				limit = 2000
			}

			allowed, remaining, resetTime, err := limiter.CheckLimit(r.Context(), services.RateLimitConfig{
				Limit:   limit,
				Window:  time.Minute,
				UserID:  user.ID,
				Group:   "general",
			})

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(max(0, remaining)))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

			if !allowed {
				w.Header().Set("Retry-After", strconv.Itoa(int(resetTime.Sub(time.Now()).Seconds())))
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error":       "rate_limit_exceeded",
					"retry_after": int(resetTime.Sub(time.Now()).Seconds()),
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
```

---

## 7. Authentication Security

### 7.1 Password Requirements

- **Minimum length**: 8 characters
- **Maximum length**: 128 characters
- **Hashing**: bcrypt with cost 12 (takes ~100ms per hash)
- **Never store plaintext**; never use MD5, SHA1, or SHA256 for passwords

```go
// services/password.go
package services

import "golang.org/x/crypto/bcrypt"

const BcryptCost = 12

func HashPassword(password string) (string, error) {
	return bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
}

func VerifyPassword(passwordHash, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password))
	return err == nil
}
```

### 7.2 JWT Configuration

**Signing algorithm**: RS256 (asymmetric, RSA)
- **Private key**: Sign tokens (server only)
- **Public key**: Verify tokens (server or client)
- **Never use HS256** (symmetric); secret would need to be shared with clients

**Key rotation**: Rotate keys every 90 days in production

```go
// services/jwt.go
package services

import (
	"crypto/rand"
	"crypto/rsa"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTConfig struct {
	PrivateKey *rsa.PrivateKey
	PublicKey  *rsa.PublicKey
	Issuer     string // "ordo-creator-os"
}

type TokenClaims struct {
	UserID      string `json:"user_id"`
	WorkspaceID string `json:"workspace_id"`
	TokenType   string `json:"token_type"` // "access" or "refresh"
	Family      string `json:"family"`     // Token family ID for rotation detection
	jwt.RegisteredClaims
}

// Generate access token (15 minute expiry)
func (jc *JWTConfig) GenerateAccessToken(userID, workspaceID, family string) (string, error) {
	claims := TokenClaims{
		UserID:      userID,
		WorkspaceID: workspaceID,
		TokenType:   "access",
		Family:      family,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    jc.Issuer,
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(jc.PrivateKey)
}

// Generate refresh token (7 day expiry)
func (jc *JWTConfig) GenerateRefreshToken(userID, workspaceID string) (string, string, error) {
	// Generate family ID (used to detect token reuse abuse)
	family := fmt.Sprintf("%d", time.Now().UnixNano())

	claims := TokenClaims{
		UserID:      userID,
		WorkspaceID: workspaceID,
		TokenType:   "refresh",
		Family:      family,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    jc.Issuer,
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tokenStr, err := token.SignedString(jc.PrivateKey)
	return tokenStr, family, err
}

// Verify token
func (jc *JWTConfig) VerifyToken(tokenStr string) (*TokenClaims, error) {
	claims := &TokenClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("invalid signing method")
		}
		return jc.PublicKey, nil
	})

	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
```

### 7.3 Access Tokens

- **Expiry**: 15 minutes
- **Storage**: Memory only (no persistence)
- **Rotation**: Must refresh before expiry
- **Scope**: Single workspace

### 7.4 Refresh Tokens

- **Expiry**: 7 days
- **Storage**: Secure httpOnly cookie, rotated on use
- **Format**:
  ```
  Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
  ```

### 7.5 Token Family (Reuse Detection)

When refresh token is used, generate new family and invalidate old one. If old token used again, invalidate entire family (indicates compromise):

```go
// models/session.go
type Session struct {
	ID                string    // Session ID
	UserID            string
	WorkspaceID       string
	RefreshTokenFamily string // Current family ID
	CreatedAt         time.Time
	ExpiresAt         time.Time
	RevokedAt         *time.Time // NULL if active
	LastRotation      time.Time
}

// services/auth.go
func (a *AuthService) RefreshToken(ctx context.Context, oldRefreshToken string) (newAccessToken, newRefreshToken string, err error) {
	claims, err := a.jwt.VerifyToken(oldRefreshToken)
	if err != nil {
		return "", "", fmt.Errorf("invalid refresh token")
	}

	// Load session
	session, err := a.db.GetSessionByID(ctx, claims.Subject)
	if err != nil || session.RevokedAt != nil {
		return "", "", fmt.Errorf("session not found or revoked")
	}

	// Check if token family matches (reuse detection)
	if claims.Family != session.RefreshTokenFamily {
		// Token from old family used; compromise detected
		a.db.RevokeSessionFamily(ctx, session.ID) // Invalidate entire family
		return "", "", fmt.Errorf("token reuse detected; session invalidated")
	}

	// Generate new tokens with new family
	accessToken, err := a.jwt.GenerateAccessToken(claims.UserID, claims.WorkspaceID, claims.Family)
	if err != nil {
		return "", "", err
	}

	newRefreshToken, newFamily, err := a.jwt.GenerateRefreshToken(claims.UserID, claims.WorkspaceID)
	if err != nil {
		return "", "", err
	}

	// Update session with new family
	session.RefreshTokenFamily = newFamily
	session.LastRotation = time.Now()
	if err := a.db.UpdateSession(ctx, session); err != nil {
		return "", "", err
	}

	return accessToken, newRefreshToken, nil
}
```

### 7.6 Session Management

All sessions tracked in database; sessions are revocable:

```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  workspace_id VARCHAR(255) NOT NULL,
  refresh_token_family VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  last_rotation TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

Users can revoke sessions (logout all devices, logout specific device):

```go
// handlers/auth.go
func (h *Handler) LogoutAll(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)

	if err := h.authService.RevokeAllSessions(r.Context(), user.ID); err != nil {
		http.Error(w, "Failed to logout", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
```

### 7.7 Brute Force Protection

**Progressive delay**:
```
1st failed attempt: 0 ms
2nd failed attempt: 0 ms
3rd failed attempt: 1 second delay
4th failed attempt: 2 second delay
5th failed attempt: 4 second delay
```

**Account lockout** after 10 failed attempts in 1 hour → lock for 1 hour

```go
// services/brute_force.go
package services

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type BruteForceProtection struct {
	redis *redis.Client
}

func (b *BruteForceProtection) RecordFailedAttempt(ctx context.Context, email string) error {
	key := fmt.Sprintf("failed_login:%s", email)

	// Increment counter
	count, err := b.redis.Incr(ctx, key).Result()
	if err != nil {
		return err
	}

	// Set expiry on first attempt
	if count == 1 {
		b.redis.Expire(ctx, key, 1*time.Hour)
	}

	return nil
}

func (b *BruteForceProtection) GetFailedAttempts(ctx context.Context, email string) (int, error) {
	key := fmt.Sprintf("failed_login:%s", email)
	count, err := b.redis.Get(ctx, key).Int()
	if err == redis.Nil {
		return 0, nil
	}
	return count, err
}

func (b *BruteForceProtection) IsLocked(ctx context.Context, email string) bool {
	count, _ := b.GetFailedAttempts(ctx, email)
	return count >= 10
}

func (b *BruteForceProtection) GetDelay(ctx context.Context, email string) time.Duration {
	count, _ := b.GetFailedAttempts(ctx, email)
	if count < 3 {
		return 0
	}

	// Exponential backoff: 1s, 2s, 4s, 8s, ...
	return time.Second * time.Duration(1<<(count-3))
}

func (b *BruteForceProtection) ClearFailedAttempts(ctx context.Context, email string) error {
	return b.redis.Del(ctx, fmt.Sprintf("failed_login:%s", email)).Err()
}
```

**Login handler**:

```go
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	json.NewDecoder(r.Body).Decode(&req)

	// Check if locked
	if h.bruteForce.IsLocked(r.Context(), req.Email) {
		http.Error(w, "Account temporarily locked", http.StatusTooManyRequests)
		return
	}

	// Simulate login
	user, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		// Record failed attempt and apply delay
		h.bruteForce.RecordFailedAttempt(r.Context(), req.Email)
		delay := h.bruteForce.GetDelay(r.Context(), req.Email)
		time.Sleep(delay)

		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Success: clear failed attempts
	h.bruteForce.ClearFailedAttempts(r.Context(), req.Email)

	// Create session, issue tokens...
}
```

---

## 8. Authorization

### 8.1 RBAC: Role-Based Access Control

Roles per workspace:

| Role | Permissions |
|------|-------------|
| Owner | Full access; invite/remove members; delete workspace; billing |
| Admin | Invite/remove members; change workspace settings; delete resources |
| Editor | Create/edit/delete own resources; view team resources |
| Viewer | Read-only access to resources |

### 8.2 Role Checks in Service Layer

**Never trust client to send role.** Always fetch from database:

```go
// handlers/workspace.go
func (h *Handler) UpdateWorkspace(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)
	workspaceID := chi.URLParam(r, "workspace_id")

	// Fetch user's role for this workspace
	membership, err := h.membershipService.GetMembership(r.Context(), user.ID, workspaceID)
	if err != nil || membership == nil {
		http.Error(w, "Not a member of this workspace", http.StatusForbidden)
		return
	}

	// Check permission
	if membership.Role != models.RoleOwner && membership.Role != models.RoleAdmin {
		http.Error(w, "Insufficient permissions", http.StatusForbidden)
		return
	}

	// Process update...
}
```

### 8.3 Workspace Isolation

Every query scoped to workspace_id (not client-provided, from auth context):

```go
// Prevent: SELECT * FROM files WHERE id = $1
// Use: SELECT * FROM files WHERE id = $1 AND workspace_id = $2

// handlers/file.go
func (h *Handler) GetFile(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)
	fileID := chi.URLParam(r, "file_id")

	// workspace_id always comes from session, not from client
	file, err := h.fileService.GetFile(r.Context(), fileID, user.WorkspaceID)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(file)
}
```

### 8.4 Row Level Security (RLS) as Backup

PostgreSQL enforces workspace isolation at database level (defense in depth):

```sql
-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see files in their workspace
CREATE POLICY files_isolation ON files
  USING (workspace_id = current_setting('app.workspace_id')::UUID)
  WITH CHECK (workspace_id = current_setting('app.workspace_id')::UUID);

-- Set workspace context for each request
SET app.workspace_id = 'user-workspace-id';
```

### 8.5 Resource Ownership

Users can only modify resources they own (unless elevated role):

```go
// models/file.go
type File struct {
	ID          string
	WorkspaceID string
	CreatedBy   string // User who created file
	Name        string
	// ...
}

// handlers/file.go
func (h *Handler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)
	fileID := chi.URLParam(r, "file_id")

	file, err := h.fileService.GetFile(r.Context(), fileID, user.WorkspaceID)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Check ownership or elevated role
	membership, _ := h.membershipService.GetMembership(r.Context(), user.ID, file.WorkspaceID)
	canDelete := file.CreatedBy == user.ID || membership.Role == models.RoleOwner || membership.Role == models.RoleAdmin

	if !canDelete {
		http.Error(w, "Insufficient permissions", http.StatusForbidden)
		return
	}

	if err := h.fileService.DeleteFile(r.Context(), fileID); err != nil {
		http.Error(w, "Failed to delete file", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
```

---

## 9. Data Encryption

### 9.1 Encryption at Rest

**RDS (PostgreSQL)**:
- Enable **AWS RDS encryption** (AES-256)
- Enabled by default in production
- Automatic key rotation by AWS

**S3 (File Storage)**:
- Enable **S3 Server-Side Encryption** (SSE-S3, AES-256)
- Default encryption policy on bucket
- No performance overhead

### 9.2 Encryption in Transit

All data in flight uses TLS 1.3:
- Client ↔ Load Balancer: TLS 1.3
- Load Balancer ↔ Go App: Private network (no encryption needed)
- Go App ↔ RDS: TLS (enforced via security group)
- Go App ↔ S3: TLS (auto via SDK)
- Go App ↔ Redis: TLS (enforced via auth token)

### 9.3 Application-Level Encryption

Sensitive fields encrypted with AES-256-GCM (e.g., OAuth tokens, API keys):

```go
// helpers/encryption.go
package helpers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
)

type Encrypter struct {
	key []byte // 32 bytes for AES-256
}

func NewEncrypter(key []byte) (*Encrypter, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("key must be 32 bytes for AES-256")
	}
	return &Encrypter{key: key}, nil
}

// Encrypt returns base64-encoded ciphertext with nonce prepended
func (e *Encrypter) Encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(e.key)
	if err != nil {
		return "", err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt extracts nonce and decrypts
func (e *Encrypter) Decrypt(ciphertext string) (string, error) {
	block, err := aes.NewCipher(e.key)
	if err != nil {
		return "", err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	nonceSize := aead.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, data := data[:nonceSize], data[nonceSize:]
	plaintext, err := aead.Open(nil, nonce, data, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
```

**Usage**:

```go
// models/integration.go
type Integration struct {
	ID          string
	UserID      string
	Provider    string // "github", "slack", etc.
	TokenHash   string // Encrypted OAuth token
}

// handlers/integrations.go
func (h *Handler) CreateIntegration(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)
	var req struct {
		Provider string
		Token    string
	}
	json.NewDecoder(r.Body).Decode(&req)

	// Encrypt token
	encryptedToken, err := h.encrypter.Encrypt(req.Token)
	if err != nil {
		http.Error(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

	integration := models.Integration{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		Provider:  req.Provider,
		TokenHash: encryptedToken,
	}

	if err := h.db.CreateIntegration(r.Context(), integration); err != nil {
		http.Error(w, "Failed to create integration", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
```

### 9.4 Key Management: AWS KMS

Encryption keys stored in **AWS Key Management Service** (not in app config):

```go
// helpers/kms.go
package helpers

import (
	"context"
	"encoding/base64"

	"github.com/aws/aws-sdk-go-v2/service/kms"
	kmstypes "github.com/aws/aws-sdk-go-v2/service/kms/types"
)

type KMSEncrypter struct {
	kmsClient *kms.Client
	keyID     string // AWS KMS Key ID
}

func NewKMSEncrypter(client *kms.Client, keyID string) *KMSEncrypter {
	return &KMSEncrypter{kmsClient: client, keyID: keyID}
}

func (k *KMSEncrypter) Encrypt(ctx context.Context, plaintext []byte) (string, error) {
	output, err := k.kmsClient.Encrypt(ctx, &kms.EncryptInput{
		KeyId:     &k.keyID,
		Plaintext: plaintext,
	})
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(output.CiphertextBlob), nil
}

func (k *KMSEncrypter) Decrypt(ctx context.Context, ciphertext string) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return nil, err
	}

	output, err := k.kmsClient.Decrypt(ctx, &kms.DecryptInput{
		CiphertextBlob: data,
	})
	if err != nil {
		return nil, err
	}

	return output.Plaintext, nil
}
```

### 9.5 Secrets Management: AWS Secrets Manager

API keys, database passwords, JWT keys stored in **AWS Secrets Manager**:

```go
// config/secrets.go
package config

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type SecretsManager struct {
	client *secretsmanager.Client
}

type DBSecrets struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	DBName   string `json:"dbname"`
}

func (s *SecretsManager) GetDBSecrets(ctx context.Context) (*DBSecrets, error) {
	output, err := s.client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: "prod/database/credentials",
	})
	if err != nil {
		return nil, err
	}

	var secrets DBSecrets
	if err := json.Unmarshal([]byte(*output.SecretString), &secrets); err != nil {
		return nil, err
	}

	return &secrets, nil
}
```

**Never store secrets in**:
- Environment variables (visible in process list, logs)
- Config files (checked into version control)
- Docker environment (visible in container inspect)

---

## 10. Security Headers

All responses include these security headers:

```go
// middleware/security_headers.go
package middleware

import "net/http"

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		w.Header().Set("X-Frame-Options", "DENY")

		// CSP: restrict resource loading
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: https:; "+
				"font-src 'self'; "+
				"connect-src 'self' https://api.stripe.com; "+
				"frame-ancestors 'none'; "+
				"base-uri 'self'; "+
				"form-action 'self'")

		// Referrer policy: only send Origin header to same-origin requests
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Feature policy: disable dangerous features
		w.Header().Set("Permissions-Policy",
			"camera=(), "+
				"microphone=(), "+
				"geolocation=(), "+
				"usb=(), "+
				"payment=()")

		// HSTS: enforce HTTPS for 1 year
		w.Header().Set("Strict-Transport-Security",
			"max-age=31536000; includeSubDomains; preload")

		// No XSS protection header (rely on CSP instead)
		// w.Header().Set("X-XSS-Protection", "0")

		next.ServeHTTP(w, r)
	})
}
```

**Explanation of each header**:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent browser from guessing MIME type; must match Content-Type |
| X-Frame-Options | DENY | Prevent embedding in iframe (clickjacking protection) |
| Content-Security-Policy | (see above) | Whitelist which scripts/styles/images can load |
| Referrer-Policy | strict-origin-when-cross-origin | Only send origin to same-site requests; hide full URL |
| Permissions-Policy | (see above) | Disable access to camera, microphone, geolocation |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Force HTTPS; preload in browser |

Register in router:

```go
r.Use(middleware.SecurityHeaders)
```

---

## 11. API Security

### 11.1 Never Send Sensitive Data in URLs

Sensitive data (tokens, keys, passwords) **never** in URLs or query strings:

```go
// WRONG: Password in URL
POST /api/users?password=secret123

// CORRECT: Password in request body
POST /api/users
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "secret123"
}

// WRONG: API key in URL
GET /api/files?api_key=sk_1234567890

// CORRECT: API key in Authorization header
GET /api/files
Authorization: Bearer sk_1234567890
```

### 11.2 Pagination Limits

Enforce maximum page size to prevent DoS:

```go
// handlers/utils.go
package handlers

import (
	"net/http"
	"strconv"
)

type PaginationParams struct {
	Page  int
	Limit int
}

func ParsePagination(r *http.Request) PaginationParams {
	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	limit := 20 // Default
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			if parsed > 100 { // Max 100 items per page
				parsed = 100
			}
			limit = parsed
		}
	}

	return PaginationParams{Page: page, Limit: limit}
}

// Usage
func (h *Handler) ListFiles(w http.ResponseWriter, r *http.Request) {
	pagination := ParsePagination(r)
	files, err := h.fileService.ListFiles(r.Context(), pagination.Page, pagination.Limit)
	// ...
}
```

### 11.3 Field-Level Access Control

Redact sensitive fields from responses based on user role:

```go
// models/user.go
type User struct {
	ID            string `json:"id"`
	Email         string `json:"email"` // Only visible to self or admin
	Name          string `json:"name"`
	PasswordHash  string `json:"-"` // Never exposed
	WorkspaceID   string `json:"workspace_id"`
	Role          string `json:"role"` // Only visible to self or admin
	CreatedAt     time.Time `json:"created_at"`
}

// Redacted version for non-admin viewers
type UserPublic struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	WorkspaceID string `json:"workspace_id"`
	CreatedAt   time.Time `json:"created_at"`
}

func (u *User) ToPublic() *UserPublic {
	return &UserPublic{
		ID:          u.ID,
		Name:        u.Name,
		WorkspaceID: u.WorkspaceID,
		CreatedAt:   u.CreatedAt,
	}
}

// handlers/user.go
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	requester := r.Context().Value("user").(*models.User)
	userID := chi.URLParam(r, "user_id")

	user, err := h.userService.GetUser(r.Context(), userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Self or admin can see full details
	if requester.ID == user.ID || requester.Role == "admin" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(user)
		return
	}

	// Others see public version
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user.ToPublic())
}
```

### 11.4 Request Tracing

Every request gets a unique ID for debugging and audit:

```go
// middleware/request_id.go
package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		w.Header().Set("X-Request-ID", requestID)

		ctx := context.WithValue(r.Context(), "request_id", requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

### 11.5 Response Filtering

Never return in API responses:
- Password hashes
- Internal database IDs (use UUIDs instead)
- Stack traces or debug info
- Raw error messages that leak implementation details

```go
// Good error responses
http.Error(w, "Resource not found", http.StatusNotFound)
http.Error(w, "Invalid input", http.StatusBadRequest)
http.Error(w, "Insufficient permissions", http.StatusForbidden)

// Bad error responses (leak implementation)
http.Error(w, "User with email not found in users table", http.StatusNotFound)
http.Error(w, "sql: no rows in result set", http.StatusInternalServerError)
http.Error(w, "NullPointerException at line 42 in UserService.java", http.StatusInternalServerError)
```

---

## 12. File Upload Security

### 12.1 MIME Type Validation

Validate file type by **magic bytes**, not extension:

```go
// helpers/mime.go
package helpers

import (
	"bytes"
	"fmt"
)

var (
	// Magic bytes for common file types
	MimeSignatures = map[string][]byte{
		"image/jpeg": {0xFF, 0xD8, 0xFF},
		"image/png":  {0x89, 0x50, 0x4E, 0x47},
		"image/gif":  {0x47, 0x49, 0x46},
		"image/webp": {0x52, 0x49, 0x46, 0x46}, // RIFF
		"text/plain": {},                        // No magic bytes; allow all
	}
)

func DetectMIME(data []byte) (string, error) {
	for mimeType, signature := range MimeSignatures {
		if len(signature) == 0 {
			continue
		}
		if bytes.HasPrefix(data, signature) {
			return mimeType, nil
		}
	}
	return "", fmt.Errorf("unknown MIME type")
}

func ValidateFileType(data []byte, allowedTypes []string) error {
	detected, err := DetectMIME(data)
	if err != nil {
		return err
	}

	for _, allowed := range allowedTypes {
		if detected == allowed {
			return nil
		}
	}

	return fmt.Errorf("file type not allowed: %s", detected)
}
```

### 12.2 Virus Scanning

Scan all uploads with **ClamAV** or AWS antivirus:

```go
// helpers/virus_scan.go
package helpers

import (
	"fmt"
	"io"

	"github.com/dutchcoders/go-clamd"
)

type VirusScanner struct {
	clamd *clamd.ClamdConn
}

func NewVirusScanner(host string, port int) (*VirusScanner, error) {
	conn, err := clamd.Dial("tcp", fmt.Sprintf("%s:%d", host, port))
	if err != nil {
		return nil, err
	}
	return &VirusScanner{clamd: conn}, nil
}

func (vs *VirusScanner) ScanStream(r io.Reader) error {
	resp, err := vs.clamd.ScanStream(r, nil)
	if err != nil {
		return err
	}

	if resp.Status == "FOUND" {
		return fmt.Errorf("virus detected: %s", resp.Description)
	}

	return nil
}
```

### 12.3 File Size Limits

Enforce at presigned URL generation time:

```go
// services/file_upload.go
package services

import (
	"fmt"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go/logging"
)

const (
	MaxImageSize   = 10 * 1024 * 1024 // 10MB
	MaxDocumentSize = 50 * 1024 * 1024 // 50MB
	MaxVideoSize   = 2 * 1024 * 1024 * 1024 // 2GB
)

func (s *FileService) GeneratePresignedUploadURL(fileType string, fileSizeBytes int64) (string, error) {
	// Validate size based on type
	var maxSize int64
	switch fileType {
	case "image/jpeg", "image/png":
		maxSize = MaxImageSize
	case "application/pdf":
		maxSize = MaxDocumentSize
	case "video/mp4":
		maxSize = MaxVideoSize
	default:
		return "", fmt.Errorf("unsupported file type")
	}

	if fileSizeBytes > maxSize {
		return "", fmt.Errorf("file exceeds maximum size of %d bytes", maxSize)
	}

	// Generate presigned URL (expires in 1 hour)
	presigner := s3.NewPresignFromClient(s.s3Client)
	request, err := presigner.PresignPutObject(s.ctx, &s3.PutObjectInput{
		Bucket:        &s.bucket,
		Key:           &s.key,
		ContentLength: fileSizeBytes,
		ContentType:   &fileType,
	})

	if err != nil {
		return "", err
	}

	return request.URL, nil
}
```

### 12.4 Separate Domain for File Serving

Files served from **CDN or separate domain** to prevent XSS and cookie theft:

```
API domain:   api.ordocreator.com
Files domain: cdn.ordocreator.com (CloudFront distribution)
```

Benefits:
- Cookies from api.ordocreator.com **never sent** to cdn.ordocreator.com
- Malicious JavaScript in uploaded HTML cannot read auth cookies
- Isolate file serving infrastructure

```go
// handlers/file.go
func (h *Handler) GetFile(w http.ResponseWriter, r *http.Request) {
	fileID := chi.URLParam(r, "file_id")

	// Don't serve file directly; redirect to CDN URL
	cdnURL := fmt.Sprintf("https://cdn.ordocreator.com/files/%s", fileID)
	http.Redirect(w, r, cdnURL, http.StatusTemporaryRedirect)
}
```

### 12.5 No Executable Files

Reject potentially dangerous file types:

```go
// helpers/safe_upload.go
package helpers

var DangerousExtensions = []string{
	".exe", ".bat", ".cmd", ".com", ".scr", ".vbs", ".js", ".jar",
	".zip", ".rar", ".7z", // Archives can contain executables
	".app", ".dmg", ".pkg", // macOS executables
}

func IsDangerousExtension(filename string) bool {
	for _, ext := range DangerousExtensions {
		if strings.HasSuffix(strings.ToLower(filename), ext) {
			return true
		}
	}
	return false
}
```

### 12.6 EXIF Data Removal

Strip metadata from images (contains location, camera info, timestamps):

```go
// helpers/image_sanitize.go
package helpers

import (
	"bytes"
	"image"
	"image/jpeg"
	"image/png"
	"io"
)

func RemoveExifData(input io.Reader, format string) ([]byte, error) {
	// Decode image
	img, _, err := image.Decode(input)
	if err != nil {
		return nil, err
	}

	// Re-encode without metadata
	var buf bytes.Buffer
	switch format {
	case "jpeg":
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
			return nil, err
		}
	case "png":
		if err := png.Encode(&buf, img); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported format")
	}

	return buf.Bytes(), nil
}
```

---

## 13. Webhook Security

### 13.1 Stripe Webhook Signature Verification

Verify every webhook from Stripe:

```go
// handlers/stripe_webhook.go
package handlers

import (
	"io"
	"net/http"

	"github.com/stripe/stripe-go/v72/webhook"
)

func (h *Handler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	// Read raw body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	// Verify signature
	sig := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(body, sig, os.Getenv("STRIPE_WEBHOOK_SECRET"))
	if err != nil {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Process event
	switch event.Type {
	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			http.Error(w, "Failed to parse subscription", http.StatusBadRequest)
			return
		}
		h.billingService.UpdateSubscription(r.Context(), sub)
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
```

### 13.2 Generic Webhook Signature Verification

For all webhooks:

```go
// helpers/webhook_signature.go
package helpers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

func VerifyWebhookSignature(payload []byte, signature string, secret string) error {
	// Verify signature using HMAC-SHA256
	expectedSig := hex.EncodeToString(
		hmac.New(sha256.New, []byte(secret)).
			Sum(payload),
	)

	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return fmt.Errorf("invalid signature")
	}

	return nil
}

// Check timestamp to prevent replay
func VerifyWebhookTimestamp(timestamp int64, maxAge time.Duration) error {
	age := time.Since(time.Unix(timestamp, 0))
	if age > maxAge {
		return fmt.Errorf("webhook too old: %v", age)
	}
	return nil
}
```

### 13.3 Idempotency

Process each webhook at most once using event ID tracking:

```go
// handlers/generic_webhook.go
package handlers

import (
	"encoding/json"
	"io"
	"net/http"
)

type WebhookEvent struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Timestamp int64  `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	defer r.Body.Close()

	var event WebhookEvent
	json.Unmarshal(body, &event)

	// Verify signature
	sig := r.Header.Get("X-Signature")
	if err := helpers.VerifyWebhookSignature(body, sig, os.Getenv("WEBHOOK_SECRET")); err != nil {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Verify timestamp
	if err := helpers.VerifyWebhookTimestamp(event.Timestamp, 5*time.Minute); err != nil {
		http.Error(w, "Webhook expired", http.StatusUnauthorized)
		return
	}

	// Check if already processed
	exists, err := h.db.WebhookEventExists(r.Context(), event.ID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if exists {
		// Already processed; return success to avoid retries
		w.WriteHeader(http.StatusOK)
		return
	}

	// Process event
	h.processorService.ProcessEvent(r.Context(), event)

	// Mark as processed
	h.db.RecordWebhookEvent(r.Context(), event.ID)

	w.WriteHeader(http.StatusOK)
}
```

---

## 14. Logging & Audit Trail

### 14.1 Audit Log Schema

Track all security-relevant actions:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL, -- "login", "logout", "create_api_key", "delete_member"
  resource_type VARCHAR(100), -- "user", "workspace", "api_key"
  resource_id VARCHAR(255),
  changes JSONB, -- What changed (old vs new)
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  workspace_id VARCHAR(255)
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
```

### 14.2 Log All Auth Events

```go
// services/auth_audit.go
package services

import (
	"context"
	"encoding/json"
	"net/http"
)

func (a *AuthService) LogLogin(ctx context.Context, userID, ip, userAgent string) {
	a.db.CreateAuditLog(ctx, models.AuditLog{
		UserID:    userID,
		Action:    "login",
		IPAddress: ip,
		UserAgent: userAgent,
		CreatedAt: time.Now(),
	})
}

func (a *AuthService) LogLogout(ctx context.Context, userID, ip string) {
	a.db.CreateAuditLog(ctx, models.AuditLog{
		UserID:    userID,
		Action:    "logout",
		IPAddress: ip,
		CreatedAt: time.Now(),
	})
}

func (a *AuthService) LogPasswordChange(ctx context.Context, userID, ip string) {
	a.db.CreateAuditLog(ctx, models.AuditLog{
		UserID:    userID,
		Action:    "password_change",
		IPAddress: ip,
		CreatedAt: time.Now(),
	})
}

// Log admin actions
func (a *AdminService) LogMemberAdded(ctx context.Context, adminID, workspaceID, newMemberID, ip string) {
	a.db.CreateAuditLog(ctx, models.AuditLog{
		UserID:      adminID,
		Action:      "member_added",
		ResourceType: "user",
		ResourceID:  newMemberID,
		WorkspaceID: workspaceID,
		IPAddress:   ip,
		Changes: map[string]interface{}{
			"added_user_id": newMemberID,
		},
		CreatedAt: time.Now(),
	})
}
```

### 14.3 Extract IP and User Agent

Middleware to capture client info:

```go
// middleware/client_info.go
package middleware

import (
	"context"
	"net"
	"net/http"
	"strings"
)

func ClientInfo(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)
		userAgent := r.Header.Get("User-Agent")

		ctx := context.WithValue(r.Context(), "client_ip", ip)
		ctx = context.WithValue(ctx, "user_agent", userAgent)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For (from load balancer)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	return host
}
```

### 14.4 PII Redaction in Logs

Never log passwords, tokens, or sensitive data:

```go
// helpers/log_redact.go
package helpers

import (
	"regexp"
	"strings"
)

func RedactSensitive(msg string) string {
	// Redact emails
	emailRegex := regexp.MustCompile(`[\w\.-]+@[\w\.-]+\.\w+`)
	msg = emailRegex.ReplaceAllString(msg, "[EMAIL]")

	// Redact tokens
	msg = strings.ReplaceAll(msg, "Bearer ", "Bearer [REDACTED]")
	tokenRegex := regexp.MustCompile(`(sk_[a-zA-Z0-9]{32})`)
	msg = tokenRegex.ReplaceAllString(msg, "[TOKEN]")

	// Redact passwords
	passwordRegex := regexp.MustCompile(`password":\s*"[^"]*"`)
	msg = passwordRegex.ReplaceAllString(msg, `password": "[REDACTED]"`)

	return msg
}

// Usage in logging
log.Infof("User login attempt: %s", RedactSensitive(err.Error()))
```

### 14.5 Log Retention

**CloudWatch**: 90 days (real-time queries)
**S3 Archive**: 1 year (compliance)

```go
// config/logging.go
package config

import (
	"log/slog"
	"os"

	"github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs"
)

func InitLogging() {
	// Use structured logging (slog)
	handler := slog.NewJSONHandler(os.Stdout, nil)
	logger := slog.New(handler)

	// Ship to CloudWatch Logs
	_ = cloudwatchlogs.NewClient()
}

// Archive old logs to S3
// Use S3 lifecycle policy: move to Glacier after 90 days
```

---

## 15. Dependency Security

### 15.1 Dependabot

Enable GitHub Dependabot in repository:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "gomod"
    directory: "/"
    schedule:
      interval: "weekly"
    allow:
      - dependency-type: "direct"
      - dependency-type: "indirect"
```

Automatically creates PRs for vulnerable dependencies.

### 15.2 govulncheck in CI

Add to CI pipeline:

```bash
# Install
go install golang.org/x/vuln/cmd/govulncheck@latest

# Run before build
govulncheck ./...

# Fails if vulnerabilities found
```

### 15.3 Dependency Pinning

Always use go.sum for reproducible builds:

```bash
go mod tidy   # Update go.mod and go.sum
go mod verify # Verify checksums
```

Never commit `replace` directives unless absolutely necessary.

---

## 16. OWASP Top 10 Mapping

Map each OWASP risk to Ordo's controls:

### A01 Broken Access Control

**Risk**: Users access resources they shouldn't
**Mitigation**:
- RBAC with role checks in service layer (not middleware)
- Workspace isolation: all queries scoped to workspace_id
- RLS at database level as backup
- Resource ownership validation before modifications

### A02 Cryptographic Failures

**Risk**: Data exposed due to weak encryption
**Mitigation**:
- TLS 1.3 for all transit
- AES-256-GCM for sensitive fields at rest
- bcrypt cost 12 for passwords
- RS256 (asymmetric) for JWT, not HS256

### A03 Injection

**Risk**: SQL, NoSQL, command injection
**Mitigation**:
- sqlc generates parameterized queries (no concatenation)
- Never execute user input as code
- Input validation and sanitization

### A04 Insecure Design

**Risk**: Architecture doesn't support security
**Mitigation**:
- Security reviews before PR merge
- Threat modeling during design phase
- Least privilege by default
- Defense in depth (multiple layers)

### A05 Security Misconfiguration

**Risk**: Debug features left on, defaults insecure
**Mitigation**:
- No debug output in production
- Security headers middleware applied globally
- CORS whitelist (no wildcards)
- Secrets in AWS Secrets Manager, not config files

### A06 Vulnerable Components

**Risk**: Outdated libraries with known exploits
**Mitigation**:
- Dependabot monitors Go modules
- govulncheck in CI pipeline
- Pin all versions in go.sum
- Review new dependencies before merge

### A07 Authentication Failures

**Risk**: Weak password policies, no MFA
**Mitigation**:
- bcrypt cost 12, min 8 characters
- JWT with 15-min access tokens, 7-day refresh
- Token family for reuse detection
- Brute force protection with progressive delay
- Account lockout after 10 failures in 1 hour

### A08 Software and Data Integrity Failures

**Risk**: Malicious updates, unsigned webhooks
**Mitigation**:
- Verify Stripe webhook signatures
- Track webhook event IDs to prevent replays
- Verify webhook timestamp (max 5 min old)

### A09 Logging and Monitoring Failures

**Risk**: Breaches go undetected
**Mitigation**:
- Audit log for all auth and admin actions
- PII redaction in logs (mask emails, tokens)
- 90-day CloudWatch retention, 1-year S3 archive
- Structured logging (JSON) for parsing

### A10 Server-Side Request Forgery (SSRF)

**Risk**: Server fetches attacker-controlled URLs
**Mitigation**:
- Never make HTTP requests to user-provided URLs
- Validate and whitelist domains
- Use separate internal service for external requests (if needed)

---

## Implementation Checklist

- [ ] TLS 1.3 only in production
- [ ] HSTS, CSP, security headers middleware
- [ ] CORS whitelist with exact origins
- [ ] CSRF protection: SameSite=Strict + token validation
- [ ] Input validation (go-playground/validator)
- [ ] SQL parameterization (sqlc)
- [ ] Rate limiting per user+group (Redis)
- [ ] bcrypt password hashing (cost 12)
- [ ] RS256 JWT tokens
- [ ] Token rotation and family tracking
- [ ] Workspace isolation in all queries
- [ ] RBAC role checks in service layer
- [ ] RLS policies on all sensitive tables
- [ ] Encrypt sensitive fields (AES-256-GCM)
- [ ] Secrets in AWS Secrets Manager
- [ ] MIME type validation (magic bytes)
- [ ] Virus scanning on file uploads
- [ ] Separate CDN domain for files
- [ ] Webhook signature verification
- [ ] Webhook idempotency (event ID tracking)
- [ ] Audit logging for all security events
- [ ] PII redaction in logs
- [ ] Dependabot enabled
- [ ] govulncheck in CI

---

## Testing Strategy

### Unit Tests

- Password hashing and comparison
- Input validation rules
- Token generation and verification
- Rate limit logic

### Integration Tests

- Login flow with brute force protection
- Workspace isolation (user A cannot see user B's workspace)
- CSRF token validation
- Webhook processing and idempotency

### Security Tests

- Penetration testing by third party (annually)
- OWASP Top 10 checklist
- Dependency scanning (Dependabot + govulncheck)

### Penetration Testing Scope

- SQL injection attempts
- XSS in input fields
- CSRF attacks
- Privilege escalation
- Path traversal
- Authentication bypass

---

## Incident Response

### Compromise Detection

1. Check audit logs for unusual activity
2. Review failed login attempts (spike = brute force)
3. Check token usage from unexpected IPs
4. Verify file uploads for suspicious content

### Response Procedure

1. Revoke all sessions for affected user
2. Force password reset
3. Audit all resources created/modified by user
4. Notify security team and user
5. Review logs for other compromised accounts
6. Update threat model if new attack pattern discovered

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Go Security Best Practices](https://golang.org/security)
- [AWS Well-Architected Framework - Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Document Version**: 1.0
**Last Reviewed**: 2026-03-10
**Next Review**: 2026-06-10 (quarterly)
