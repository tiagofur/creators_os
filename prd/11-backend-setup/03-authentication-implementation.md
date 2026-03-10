# Authentication Implementation — Ordo Creator OS (Go Backend)

**Production-Ready JWT + OAuth2 Implementation Guide**

Last Updated: 2026-03-10
Status: Ready for Implementation
Framework: Go + Chi Router
Database: PostgreSQL 16+
Cache: Redis (sessions, rate limiting)

---

## Table of Contents

1. [Authentication Strategy Overview](#1-authentication-strategy-overview)
2. [JWT Token Structure](#2-jwt-token-structure)
3. [Token Lifecycle](#3-token-lifecycle)
4. [Password Management](#4-password-management)
5. [OAuth 2.0 Flow](#5-oauth-20-flow)
6. [Middleware Chain](#6-middleware-chain--go-implementation)
7. [Context Helpers](#7-context-helpers)
8. [Session Management](#8-session-management)
9. [API Key Authentication](#9-api-key-authentication)
10. [Security Considerations](#10-security-considerations)
11. [Error Handling](#11-error-handling)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Authentication Strategy Overview

Ordo Creator OS uses a **stateless JWT-based authentication system** with refresh token rotation and session tracking for revocation and security monitoring.

### Token Architecture

| Token Type | Lifespan | Storage | Use Case |
|------------|----------|---------|----------|
| **Access Token** | 15 minutes | Memory (frontend) | Authorize API requests |
| **Refresh Token** | 7 days | HttpOnly cookie (web), SecureStore (mobile), SafeStorage (desktop) | Obtain new access tokens |
| **API Key** | 90 days (manual rotation) | App environment (Enterprise tier) | Machine-to-machine auth |

### Security Properties

- **Stateless**: Access tokens are self-contained JWTs, no DB lookup on every request
- **Refresh Rotation**: New refresh token issued on every refresh cycle (prevents token theft)
- **Token Family**: All refresh tokens in a family tracked; reuse detected → entire family invalidated
- **Session Tracking**: DB tracks all active sessions for revocation, suspicious activity detection
- **Rate Limiting**: Per IP (login), per user (API), per workspace (resources)

---

## 2. JWT Token Structure

### Access Token (RS256 signed, 15-minute expiry)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "creator@ordo.app",
  "name": "Creator Name",
  "role": "pro",
  "workspace_id": "660e8400-e29b-41d4-a716-446655440001",
  "workspace_name": "My Studio",
  "tier": "pro",
  "iat": 1710086400,
  "exp": 1710087300,
  "jti": "7fa8e2d1-3c4f-4a2b-8d9e-1f6a7c8b9d0e"
}
```

**Claims explanation:**
- `sub`: User UUID (subject)
- `email`: User email (for logging, debugging)
- `name`: Display name
- `role`: User role (user, creator, admin)
- `workspace_id`: Current workspace UUID
- `workspace_name`: Current workspace name
- `tier`: Subscription tier (free, pro, enterprise)
- `iat`: Issued at (Unix timestamp)
- `exp`: Expires at (Unix timestamp) — 15 minutes from issue
- `jti`: Unique token ID (for revocation tracking)

**Key Rule**: No sensitive data (passwords, API keys, PII beyond email) in payload.

### Refresh Token (RS256 signed, 7-day expiry)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "family": "token-family-uuid-for-theft-detection",
  "jti": "8ga9f3e2-4d5g-5b3c-9e0f-2g7b8d9c0e1f",
  "iat": 1710086400,
  "exp": 1710691200
}
```

**Claims explanation:**
- `sub`: User UUID
- `family`: Token family UUID (all refresh tokens in same family have same UUID)
- `jti`: Unique token ID (changes with each rotation)
- `iat`: Issued at
- `exp`: Expires at — 7 days from issue

**Minimal payload** for security: only what's needed for rotation + theft detection.

### Token Signing

- **Algorithm**: RS256 (RSA SHA-256)
- **Key Pair**: Generated once during deployment setup
  - Public key distributed to all API instances
  - Private key stored in secure env variable or vault (AWS Secrets Manager, HashiCorp Vault)
- **Key Rotation**: Supported via `kid` (Key ID) header for zero-downtime key rollover

---

## 3. Token Lifecycle

### 3.1 Login Flow

```
POST /auth/login { email, password }
  ↓
Validate credentials (bcrypt verify)
  ↓
Look up user by email
  ↓
Check user status (active, not deleted)
  ↓
Generate token family UUID
  ↓
Issue access token (15 min)
Issue refresh token (7 days)
  ↓
Create session in DB:
  - session_id (UUID)
  - user_id
  - refresh_token_jti
  - token_family
  - ip_address
  - user_agent
  - created_at
  - expires_at (7 days from now)
  - revoked_at (NULL)
  ↓
Return:
  {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 900,
    "token_type": "Bearer"
  }

Set-Cookie: refresh_token=...;
  HttpOnly; Secure; SameSite=Strict; Path=/;
  Max-Age=604800
```

**Error cases:**
- Invalid email format → 400 Bad Request
- User not found → 401 Unauthorized (generic: "Invalid credentials")
- User inactive/deleted → 401 Unauthorized
- Too many failed attempts → 429 Too Many Requests (rate limit)
- Password incorrect → 401 Unauthorized (constant-time comparison)

### 3.2 API Request Flow

```
GET /v1/ideas
Header: Authorization: Bearer eyJhbGc...

  ↓
AuthMiddleware intercepts request
  ↓
Extract Bearer token from Authorization header
  ↓
Validate JWT signature (using public key)
  ↓
Check token not expired
  ↓
Extract claims (sub, jti, workspace_id, etc.)
  ↓
Inject into context:
  ctx.user = User{ID, Email, Role, WorkspaceID}
  ctx.requestID = X-Request-ID header or generate
  ↓
Call next handler with enriched context
  ↓
Handler uses UserFromContext(ctx) to access user

✓ Valid → proceed
✗ Invalid → 401 Unauthorized
✗ Expired → 401 Unauthorized
```

### 3.3 Token Refresh Flow

```
POST /auth/refresh
Cookie: refresh_token=...

  ↓
Extract refresh token from httpOnly cookie
  ↓
Validate JWT signature
  ↓
Check token not expired
  ↓
Extract claims (sub, family, jti)
  ↓
Look up session by user_id + family + refresh_token_jti
  ↓
Check session not revoked
  ↓
Check session not expired
  ↓
Verify IP address matches (optional: strict mode checks exact IP)
  ↓
Verify user agent matches (warning only if doesn't match)
  ↓
Generate new token family (or keep same)
  ↓
Issue new access token (15 min)
Issue new refresh token (7 days, new jti, same family)
  ↓
Update session:
  - refresh_token_jti = new_jti
  - last_refreshed_at = now
  ↓
Invalidate old refresh token jti (add to blacklist in Redis for 7 days)
  ↓
Return:
  {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 900
  }

✓ Valid → return new pair
✗ Token reused → 401 Unauthorized + invalidate entire family (theft detected)
✗ Expired → 401 Unauthorized
✗ Session revoked → 401 Unauthorized
```

### 3.4 Logout Flow

```
POST /auth/logout
Header: Authorization: Bearer ...
Cookie: refresh_token=...

  ↓
Extract user from JWT (AuthMiddleware already done)
  ↓
Extract refresh token from cookie
  ↓
Extract family from refresh token claims
  ↓
Mark session as revoked:
  UPDATE sessions
  SET revoked_at = NOW()
  WHERE user_id = $1 AND family = $2
  ↓
Add refresh token jti to revocation blacklist (Redis, 7-day TTL)
  ↓
Clear refresh token cookie:
  Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict;
    Path=/; Max-Age=0
  ↓
Return:
  { "message": "Logged out successfully" }
```

**Optional:** Logout all sessions (user clicks "Logout everywhere"):
```sql
UPDATE sessions
SET revoked_at = NOW()
WHERE user_id = $1
```

### 3.5 Suspicious Activity (Refresh Token Reuse)

**Threat**: If a refresh token is reused, someone has stolen it.

```
POST /auth/refresh
Refresh token jti = old_jti (already used)

  ↓
Lookup session by jti
  ↓
Session.last_refreshed_at is in the past
  ↓
Current jti != what we just issued
  ↓
**THEFT DETECTED**
  ↓
Revoke entire family:
  UPDATE sessions
  SET revoked_at = NOW()
  WHERE family = $1
  ↓
Log security event
  ↓
Return 401 Unauthorized
  ↓
Alert user (optional: send email "Your session was revoked")
```

---

## 4. Password Management

### 4.1 Password Hashing

- **Algorithm**: bcrypt
- **Cost**: 12 (takes ~250ms on modern hardware, sufficient for login endpoints)
- **Stored in DB**: `password_hash` field (never plain text)

```go
import "golang.org/x/crypto/bcrypt"

// Hash password on signup
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
if err != nil {
    return err
}
// Store hash in DB

// Verify on login
err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
if err != nil {
    return ErrInvalidCredentials
}
```

### 4.2 Password Requirements

Minimum complexity enforced at signup and password reset:

- **Length**: 8+ characters
- **Uppercase**: At least 1 (A-Z)
- **Lowercase**: At least 1 (a-z)
- **Number**: At least 1 (0-9)
- **Special**: Recommended but not required (allows easier onboarding)

**Validation function:**
```go
func ValidatePassword(password string) error {
    if len(password) < 8 {
        return ErrPasswordTooShort
    }
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

    if !hasUpper || !hasLower || !hasDigit {
        return ErrPasswordComplexity
    }
    return nil
}
```

### 4.3 Password Reset Flow

```
POST /auth/password-reset-request
{ "email": "user@ordo.app" }

  ↓
Look up user by email
  ↓
Generate reset token:
  - Random 32 bytes
  - Encode as base64url
  - Hash with SHA256 (store hash in DB, not token itself)
  ↓
Store in password_reset_tokens table:
  {
    id: UUID,
    user_id: UUID,
    token_hash: SHA256(token),
    used: false,
    created_at: NOW(),
    expires_at: NOW() + 1 hour,
    ip_address,
    user_agent
  }
  ↓
Send email:
  Click here: https://app.ordo.app/reset?token={base64_encoded_token}
  Expires in 1 hour
  ↓
Return 200 OK (don't leak whether email exists)

---

POST /auth/password-reset
{
  "token": "base64_encoded_token",
  "password": "NewSecure123"
}

  ↓
Validate password meets requirements
  ↓
Hash token: token_hash = SHA256(token)
  ↓
Look up password_reset_tokens by token_hash
  ↓
Check:
  - not used (used = false)
  - not expired (expires_at > NOW())
  - belongs to valid user
  ↓
Update user.password_hash = bcrypt(new_password)
  ↓
Mark token as used:
  UPDATE password_reset_tokens
  SET used = true
  WHERE id = $1
  ↓
Revoke all existing sessions for this user:
  UPDATE sessions
  SET revoked_at = NOW()
  WHERE user_id = $1
  ↓
Return 200 OK
```

**Why revoke sessions?** Protects against account takeover: if someone had the account, they lose access now that password changed.

### 4.4 Rate Limiting: Login Attempts

Prevent brute force attacks:

- **Per IP**: 5 failed attempts per 15 minutes → lockout 15 minutes
- **Per User**: 10 failed attempts per hour → require password reset
- **Tracking**: Redis key: `login_failures:{ip_address}` and `login_failures_user:{user_id}`

```go
func RateLimitLoginAttempts(ctx context.Context, redis *redis.Client, ip, userID string) error {
    // Check IP-based limit
    ipKey := fmt.Sprintf("login_failures:%s", ip)
    ipFailures, _ := redis.Incr(ctx, ipKey).Val()
    redis.Expire(ctx, ipKey, 15*time.Minute)

    if ipFailures > 5 {
        return ErrTooManyLoginAttempts
    }

    // Check user-based limit
    userKey := fmt.Sprintf("login_failures_user:%s", userID)
    userFailures, _ := redis.Incr(ctx, userKey).Val()
    redis.Expire(ctx, userKey, 1*time.Hour)

    if userFailures > 10 {
        // Revoke all sessions, force password reset
        return ErrAccountLockedRequirePasswordReset
    }

    return nil
}

func ClearLoginFailures(ctx context.Context, redis *redis.Client, ip, userID string) {
    redis.Del(ctx, fmt.Sprintf("login_failures:%s", ip))
    redis.Del(ctx, fmt.Sprintf("login_failures_user:%s", userID))
}
```

---

## 5. OAuth 2.0 Flow

Support social login for Google, GitHub, Apple (and others as needed).

### 5.1 Supported Providers

| Provider | Flow | Client ID Location | Use Cases |
|----------|------|-------------------|-----------|
| **Google** | Authorization Code + PKCE | env: `OAUTH_GOOGLE_CLIENT_ID` | Email-first platform |
| **GitHub** | Authorization Code + PKCE | env: `OAUTH_GITHUB_CLIENT_ID` | Developers, integrations |
| **Apple** | Authorization Code + PKCE + Nonce | env: `OAUTH_APPLE_CLIENT_ID` | iOS, macOS native auth |

### 5.2 Authorization Code Flow with PKCE

```
1. Frontend initiates login:
   POST /auth/oauth/authorize
   {
     "provider": "google",
     "redirect_uri": "https://app.ordo.app/auth/callback"
   }

2. Backend generates PKCE parameters:
   code_verifier = random 128 characters (unreserved chars)
   code_challenge = base64url(SHA256(code_verifier))
   state = random 32 bytes (CSRF protection)
   nonce = random 32 bytes (replay prevention)

3. Store in Redis (5-minute TTL):
   {
     "pkce:{state}": {
       "code_verifier": "...",
       "nonce": "...",
       "provider": "google",
       "created_at": "...",
       "ip_address": "..."
     }
   }

4. Return authorization URL:
   {
     "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?
       client_id=...&
       redirect_uri=...&
       scope=openid email profile&
       response_type=code&
       state={state}&
       code_challenge={code_challenge}&
       code_challenge_method=S256&
       nonce={nonce}"
   }

5. Frontend redirects user to auth_url
   → User logs in with Google
   → Google redirects back to callback with code + state

6. Frontend calls callback:
   GET /auth/oauth/callback?code=...&state=...

7. Backend validates:
   - Retrieve pkce:{state} from Redis
   - Verify state is valid and not expired
   - Verify IP matches (or just log warning)

8. Exchange code for token:
   POST https://oauth2.googleapis.com/token
   {
     "grant_type": "authorization_code",
     "code": code,
     "client_id": CLIENT_ID,
     "client_secret": CLIENT_SECRET,
     "redirect_uri": redirect_uri,
     "code_verifier": code_verifier
   }

   Response:
   {
     "access_token": "...",
     "id_token": "...",
     "expires_in": 3600,
     "token_type": "Bearer"
   }

9. Decode and verify ID token (JWT):
   - Verify signature (using provider's public keys)
   - Verify issuer
   - Verify audience (client_id)
   - Verify nonce matches
   - Extract user info: email, name, picture, sub (provider user ID)

10. Create or link account:
    Check if user with oauth_provider_id exists:

    a) User exists → issue JWT pair (login)
    b) User doesn't exist → create account with:
       {
         "email": from id_token,
         "name": from id_token,
         "picture_url": from id_token,
         "oauth_provider": "google",
         "oauth_provider_id": "sub" from id_token,
         "password_hash": NULL (no password)
       }
       Then issue JWT pair (signup + login in one)

11. Return JWT pair:
    {
      "access_token": "...",
      "refresh_token": "...",
      "expires_in": 900
    }
    Set-Cookie: refresh_token=...

    Redirect to: https://app.ordo.app/dashboard?access_token=...
    (or store in secure localStorage on native)

12. Clean up Redis:
    Delete pkce:{state}
```

### 5.3 Provider-Specific Notes

**Google:**
- `https://accounts.google.com/o/oauth2/v2/auth` (authorization endpoint)
- `https://oauth2.googleapis.com/token` (token endpoint)
- `https://www.googleapis.com/oauth2/v1/certs` (JWKS)
- Scopes: `openid email profile`

**GitHub:**
- `https://github.com/login/oauth/authorize` (authorization endpoint)
- `https://github.com/login/oauth/access_token` (token endpoint)
- No ID token; fetch user info from `https://api.github.com/user`
- Scopes: `user:email`

**Apple:**
- `https://appleid.apple.com/auth/authorize` (authorization endpoint)
- `https://appleid.apple.com/auth/token` (token endpoint)
- `https://appleid.apple.com/auth/keys` (JWKS)
- Scopes: `openid email name`
- Must include nonce in request; verified in ID token

### 5.4 Storing Provider Tokens

For platform integrations (publishing to YouTube, Twitter, etc.), store the access token:

```sql
CREATE TABLE oauth_provider_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(50),  -- 'google', 'github', 'twitter', etc.
  access_token TEXT,     -- encrypted at rest
  refresh_token TEXT,    -- encrypted at rest (if applicable)
  expires_at TIMESTAMP,
  scopes TEXT,           -- comma-separated
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Encryption**: Use PostgreSQL's `pgcrypto` extension or application-level encryption (e.g., NaCl).

```go
// Example: store encrypted token
encryptedToken := encryptAES256(accessToken, encryptionKey)
db.Exec(`INSERT INTO oauth_provider_tokens (user_id, provider, access_token, expires_at)
  VALUES ($1, $2, $3, $4)`, userID, provider, encryptedToken, expiresAt)
```

---

## 6. Middleware Chain – Go Implementation

### 6.1 AuthMiddleware: JWT Validation

Extracts and validates Bearer token, injects user into context.

```go
package middleware

import (
    "context"
    "fmt"
    "net/http"
    "strings"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
)

type Claims struct {
    Sub          string `json:"sub"`
    Email        string `json:"email"`
    Name         string `json:"name"`
    Role         string `json:"role"`
    WorkspaceID  string `json:"workspace_id"`
    WorkspaceName string `json:"workspace_name"`
    Tier         string `json:"tier"`
    JTI          string `json:"jti"`
    jwt.RegisteredClaims
}

// AuthMiddleware validates JWT access tokens.
func AuthMiddleware(publicKey *rsa.PublicKey) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract Authorization header
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
                return
            }

            // Extract Bearer token
            parts := strings.Split(authHeader, " ")
            if len(parts) != 2 || parts[0] != "Bearer" {
                http.Error(w, `{"error":"invalid authorization header format"}`, http.StatusUnauthorized)
                return
            }
            tokenString := parts[1]

            // Parse and validate JWT
            claims := &Claims{}
            token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
                // Verify algorithm is RS256
                if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
                    return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
                }
                return publicKey, nil
            })
            if err != nil {
                http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
                return
            }

            if !token.Valid {
                http.Error(w, `{"error":"token invalid or expired"}`, http.StatusUnauthorized)
                return
            }

            // Verify claims
            if err := claims.Valid(); err != nil {
                http.Error(w, `{"error":"token claims invalid"}`, http.StatusUnauthorized)
                return
            }

            // Inject into context
            user := &domain.User{
                ID:          uuid.MustParse(claims.Sub),
                Email:       claims.Email,
                Name:        claims.Name,
                Role:        domain.Role(claims.Role),
                WorkspaceID: uuid.MustParse(claims.WorkspaceID),
                Tier:        domain.Tier(claims.Tier),
            }

            ctx := context.WithValue(r.Context(), "user", user)
            ctx = context.WithValue(ctx, "token_jti", claims.JTI)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// OptionalAuthMiddleware validates JWT if present, but doesn't require it.
func OptionalAuthMiddleware(publicKey *rsa.PublicKey) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                // No token; continue
                next.ServeHTTP(w, r)
                return
            }

            parts := strings.Split(authHeader, " ")
            if len(parts) != 2 || parts[0] != "Bearer" {
                next.ServeHTTP(w, r)
                return
            }
            tokenString := parts[1]

            // Try to parse; don't fail if invalid
            claims := &Claims{}
            token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
                if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
                    return nil, fmt.Errorf("unexpected signing method")
                }
                return publicKey, nil
            })
            if err == nil && token.Valid && claims.Valid() == nil {
                user := &domain.User{
                    ID:          uuid.MustParse(claims.Sub),
                    Email:       claims.Email,
                    Name:        claims.Name,
                    Role:        domain.Role(claims.Role),
                    WorkspaceID: uuid.MustParse(claims.WorkspaceID),
                    Tier:        domain.Tier(claims.Tier),
                }
                ctx := context.WithValue(r.Context(), "user", user)
                r = r.WithContext(ctx)
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

### 6.2 WorkspaceMiddleware: Workspace Context Injection

Validates workspace membership and injects workspace into context.

```go
// WorkspaceMiddleware extracts and validates workspace from X-Workspace-ID header.
func WorkspaceMiddleware(db *sql.DB) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user, err := UserFromContext(r.Context())
            if err != nil {
                http.Error(w, `{"error":"user not authenticated"}`, http.StatusUnauthorized)
                return
            }

            workspaceIDStr := r.Header.Get("X-Workspace-ID")
            if workspaceIDStr == "" {
                // Use user's default workspace
                var workspace domain.Workspace
                err := db.QueryRowContext(r.Context(),
                    `SELECT id, name, owner_id FROM workspaces
                     WHERE id = $1 AND (owner_id = $2 OR id IN
                     (SELECT workspace_id FROM workspace_members WHERE user_id = $2))
                     ORDER BY created_at LIMIT 1`,
                    user.WorkspaceID, user.ID).Scan(&workspace.ID, &workspace.Name, &workspace.OwnerID)
                if err != nil {
                    http.Error(w, `{"error":"workspace not found"}`, http.StatusNotFound)
                    return
                }
                ctx := context.WithValue(r.Context(), "workspace", &workspace)
                next.ServeHTTP(w, r.WithContext(ctx))
                return
            }

            workspaceID, err := uuid.Parse(workspaceIDStr)
            if err != nil {
                http.Error(w, `{"error":"invalid workspace id"}`, http.StatusBadRequest)
                return
            }

            // Verify membership
            var workspace domain.Workspace
            err = db.QueryRowContext(r.Context(),
                `SELECT w.id, w.name, w.owner_id FROM workspaces w
                 WHERE w.id = $1 AND (w.owner_id = $2 OR $1 IN
                 (SELECT workspace_id FROM workspace_members WHERE user_id = $2))`,
                workspaceID, user.ID).Scan(&workspace.ID, &workspace.Name, &workspace.OwnerID)
            if err == sql.ErrNoRows {
                http.Error(w, `{"error":"workspace not found or not member"}`, http.StatusForbidden)
                return
            }
            if err != nil {
                http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
                return
            }

            ctx := context.WithValue(r.Context(), "workspace", &workspace)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

### 6.3 RoleMiddleware: Role-Based Access Control

Enforces minimum role requirement.

```go
// RoleMiddleware checks if user has minimum required role.
func RoleMiddleware(minRole domain.Role) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user, err := UserFromContext(r.Context())
            if err != nil {
                http.Error(w, `{"error":"user not authenticated"}`, http.StatusUnauthorized)
                return
            }

            // Role hierarchy: guest < user < creator < pro < admin
            roleHierarchy := map[domain.Role]int{
                domain.RoleGuest:   0,
                domain.RoleUser:    1,
                domain.RoleCreator: 2,
                domain.RolePro:     3,
                domain.RoleAdmin:   4,
            }

            if roleHierarchy[user.Role] < roleHierarchy[minRole] {
                http.Error(w, `{"error":"insufficient permissions"}`, http.StatusForbidden)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

### 6.4 RateLimitMiddleware: Tier-Based Rate Limiting

Rate limits based on subscription tier using Redis.

```go
// RateLimitMiddleware enforces rate limits based on user tier.
func RateLimitMiddleware(redis *redis.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user, err := UserFromContext(r.Context())
            if err != nil {
                // Anonymous users: 60 requests per hour per IP
                limiter(w, r, next, redis, "anon:"+r.RemoteAddr, 60, time.Hour)
                return
            }

            // Tier-based limits
            limits := map[domain.Tier]struct {
                RPM int
                RPH int
            }{
                domain.TierFree:       {60, 1000},
                domain.TierPro:        {300, 5000},
                domain.TierEnterprise: {1000, 50000},
            }

            limit := limits[user.Tier]
            if err := checkRateLimit(r.Context(), redis, user.ID.String(), limit.RPM, time.Minute); err != nil {
                w.Header().Set("Retry-After", "60")
                http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

func checkRateLimit(ctx context.Context, redis *redis.Client, key string, limit int, window time.Duration) error {
    current, err := redis.Incr(ctx, key).Val()
    if err != nil {
        // If Redis is down, allow request (fail open)
        return nil
    }

    if current == 1 {
        redis.Expire(ctx, key, window)
    }

    if current > int64(limit) {
        return fmt.Errorf("rate limit exceeded")
    }

    return nil
}
```

### 6.5 TokenBlacklistMiddleware: Check Revoked Tokens

Check if token JTI is in revocation blacklist.

```go
// TokenBlacklistMiddleware checks if token is revoked.
func TokenBlacklistMiddleware(redis *redis.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            jti, ok := r.Context().Value("token_jti").(string)
            if !ok {
                next.ServeHTTP(w, r)
                return
            }

            blacklistKey := fmt.Sprintf("revoked_token:%s", jti)
            exists := redis.Exists(r.Context(), blacklistKey).Val()
            if exists > 0 {
                http.Error(w, `{"error":"token revoked"}`, http.StatusUnauthorized)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

// RevokeToken adds token to blacklist for its remaining lifetime.
func RevokeToken(ctx context.Context, redis *redis.Client, jti string, expiresAt time.Time) error {
    ttl := time.Until(expiresAt)
    if ttl < 0 {
        ttl = 0 // Already expired
    }
    blacklistKey := fmt.Sprintf("revoked_token:%s", jti)
    return redis.Set(ctx, blacklistKey, "1", ttl).Err()
}
```

### 6.6 RequestIDMiddleware: Distributed Tracing

Ensures every request has a unique ID for logging and debugging.

```go
// RequestIDMiddleware extracts or generates X-Request-ID.
func RequestIDMiddleware() func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            requestID := r.Header.Get("X-Request-ID")
            if requestID == "" {
                requestID = uuid.New().String()
            }

            // Add to response header
            w.Header().Set("X-Request-ID", requestID)

            ctx := context.WithValue(r.Context(), "request_id", requestID)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

### 6.7 Middleware Chain Registration

In `routes.go` or `middleware.go`, register the chain:

```go
func SetupMiddleware(router *chi.Mux, db *sql.DB, redis *redis.Client, publicKey *rsa.PublicKey) {
    // Global middleware (all routes)
    router.Use(RequestIDMiddleware())
    router.Use(LoggingMiddleware()) // Log all requests
    router.Use(RecoveryMiddleware()) // Panic recovery
    router.Use(CORSMiddleware())
    router.Use(CompressionMiddleware()) // gzip

    // Auth and token blacklist (for protected routes)
    // Applied per route:
    //   r := chi.NewRouter()
    //   r.Use(AuthMiddleware(publicKey))
    //   r.Use(TokenBlacklistMiddleware(redis))
    //   r.Post("/ideas", CreateIdea) // Protected

    // Rate limiting (apply to API routes)
    router.Use(RateLimitMiddleware(redis))
}

// Example: Protected route group
func RegisterProtectedRoutes(router *chi.Mux, db *sql.DB, redis *redis.Client, publicKey *rsa.PublicKey, handler *handler.Handler) {
    r := chi.NewRouter()

    r.Use(AuthMiddleware(publicKey))
    r.Use(TokenBlacklistMiddleware(redis))
    r.Use(WorkspaceMiddleware(db))

    // Protected endpoints
    r.Get("/ideas", handler.ListIdeas)
    r.Post("/ideas", handler.CreateIdea)
    r.Get("/ideas/{id}", handler.GetIdea)
    r.Patch("/ideas/{id}", handler.UpdateIdea)
    r.Delete("/ideas/{id}", handler.DeleteIdea)

    // Admin-only endpoints
    adminRouter := chi.NewRouter()
    adminRouter.Use(RoleMiddleware(domain.RoleAdmin))
    adminRouter.Get("/users", handler.AdminListUsers)
    adminRouter.Post("/users/{id}/ban", handler.AdminBanUser)

    r.Mount("/admin", adminRouter)

    router.Mount("/v1", r)
}
```

---

## 7. Context Helpers

Helper functions to safely extract values from context.

```go
package domain

import (
    "context"
    "fmt"
)

// UserFromContext extracts user from context.
func UserFromContext(ctx context.Context) (*User, error) {
    user, ok := ctx.Value("user").(*User)
    if !ok {
        return nil, fmt.Errorf("user not found in context")
    }
    return user, nil
}

// UserFromContextOrNil returns user or nil if not authenticated.
func UserFromContextOrNil(ctx context.Context) *User {
    user, ok := ctx.Value("user").(*User)
    if !ok {
        return nil
    }
    return user
}

// WorkspaceFromContext extracts workspace from context.
func WorkspaceFromContext(ctx context.Context) (*Workspace, error) {
    ws, ok := ctx.Value("workspace").(*Workspace)
    if !ok {
        return nil, fmt.Errorf("workspace not found in context")
    }
    return ws, nil
}

// RequestIDFromContext extracts request ID for distributed tracing.
func RequestIDFromContext(ctx context.Context) string {
    id, ok := ctx.Value("request_id").(string)
    if !ok {
        return ""
    }
    return id
}

// TokenJTIFromContext extracts JWT JTI for revocation.
func TokenJTIFromContext(ctx context.Context) string {
    jti, ok := ctx.Value("token_jti").(string)
    if !ok {
        return ""
    }
    return jti
}
```

---

## 8. Session Management

### 8.1 Sessions Table Schema

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_jti VARCHAR(255) NOT NULL UNIQUE,
    token_family UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_by_device VARCHAR(50), -- 'web', 'ios', 'android', 'desktop'

    CONSTRAINT sessions_not_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_family ON sessions(token_family);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_revoked_at ON sessions(revoked_at);
```

### 8.2 Session Service

```go
package service

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    "github.com/google/uuid"
)

type SessionService struct {
    db *sql.DB
}

// CreateSession creates a new session after login.
func (s *SessionService) CreateSession(ctx context.Context, userID, tokenFamily, refreshTokenJTI uuid.UUID, ipAddress, userAgent, device string) error {
    expiresAt := time.Now().Add(7 * 24 * time.Hour)

    _, err := s.db.ExecContext(ctx,
        `INSERT INTO sessions (user_id, token_family, refresh_token_jti, ip_address, user_agent, created_by_device, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        userID, tokenFamily, refreshTokenJTI, ipAddress, userAgent, device, expiresAt)
    return err
}

// ValidateSession checks if session is valid (not revoked, not expired).
func (s *SessionService) ValidateSession(ctx context.Context, tokenFamily uuid.UUID) error {
    var revokedAt sql.NullTime

    err := s.db.QueryRowContext(ctx,
        `SELECT revoked_at FROM sessions
         WHERE token_family = $1 AND expires_at > CURRENT_TIMESTAMP
         LIMIT 1`,
        tokenFamily).Scan(&revokedAt)

    if err == sql.ErrNoRows {
        return fmt.Errorf("session not found or expired")
    }
    if err != nil {
        return err
    }

    if revokedAt.Valid {
        return fmt.Errorf("session revoked")
    }

    return nil
}

// UpdateSessionOnRefresh updates session with new JTI after token refresh.
func (s *SessionService) UpdateSessionOnRefresh(ctx context.Context, tokenFamily uuid.UUID, newJTI string) error {
    _, err := s.db.ExecContext(ctx,
        `UPDATE sessions
         SET refresh_token_jti = $1, last_refreshed_at = CURRENT_TIMESTAMP
         WHERE token_family = $2`,
        newJTI, tokenFamily)
    return err
}

// RevokeSession marks a session as revoked.
func (s *SessionService) RevokeSession(ctx context.Context, tokenFamily uuid.UUID) error {
    _, err := s.db.ExecContext(ctx,
        `UPDATE sessions
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE token_family = $1`,
        tokenFamily)
    return err
}

// RevokeAllUserSessions revokes all sessions for a user (logout everywhere).
func (s *SessionService) RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error {
    _, err := s.db.ExecContext(ctx,
        `UPDATE sessions
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND revoked_at IS NULL`,
        userID)
    return err
}

// CleanupExpiredSessions deletes expired sessions (cron job, daily).
func (s *SessionService) CleanupExpiredSessions(ctx context.Context) error {
    _, err := s.db.ExecContext(ctx,
        `DELETE FROM sessions
         WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days'`)
    return err
}

// DetectTokenTheft checks if refresh token JTI was reused (theft detected).
func (s *SessionService) DetectTokenTheft(ctx context.Context, tokenFamily uuid.UUID, currentJTI string) (bool, error) {
    var foundJTI string

    err := s.db.QueryRowContext(ctx,
        `SELECT refresh_token_jti FROM sessions
         WHERE token_family = $1 AND refresh_token_jti != $2
         LIMIT 1`,
        tokenFamily, currentJTI).Scan(&foundJTI)

    if err == sql.ErrNoRows {
        return false, nil // No theft
    }
    if err != nil {
        return false, err
    }

    return true, nil // JTI mismatch = theft detected
}
```

### 8.3 Session Cleanup Cron Job

In `cmd/api/main.go` or a separate cron service:

```go
package main

import (
    "context"
    "log"
    "time"
)

func startSessionCleanupCron(sessionService *service.SessionService) {
    ticker := time.NewTicker(24 * time.Hour)
    defer ticker.Stop()

    go func() {
        for range ticker.C {
            ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
            if err := sessionService.CleanupExpiredSessions(ctx); err != nil {
                log.Printf("error cleaning up expired sessions: %v", err)
            }
            cancel()
        }
    }()
}
```

---

## 9. API Key Authentication

For Enterprise tier machine-to-machine integrations.

### 9.1 API Keys Table

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash of actual key
    name VARCHAR(255) NOT NULL,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scopes TEXT NOT NULL -- comma-separated, e.g. 'content:read,analytics:read'
);

CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
```

### 9.2 API Key Generation and Validation

```go
package service

import (
    "crypto/rand"
    "crypto/sha256"
    "fmt"
    "hex"
)

const APIKeyPrefix = "ordo_live_"
const APIKeyLength = 32

// GenerateAPIKey creates a new API key.
func GenerateAPIKey() (string, error) {
    bytes := make([]byte, APIKeyLength)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return APIKeyPrefix + hex.EncodeToString(bytes), nil
}

// HashAPIKey returns SHA256 hash of the key for storage.
func HashAPIKey(key string) string {
    hash := sha256.Sum256([]byte(key))
    return hex.EncodeToString(hash[:])
}

// ValidateAPIKey checks if API key is valid and active.
func (s *APIKeyService) ValidateAPIKey(ctx context.Context, key string) (workspaceID uuid.UUID, err error) {
    keyHash := HashAPIKey(key)

    var revokedAt sql.NullTime
    var expiresAt sql.NullTime

    err = s.db.QueryRowContext(ctx,
        `SELECT workspace_id, revoked_at, expires_at FROM api_keys
         WHERE key_hash = $1`,
        keyHash).Scan(&workspaceID, &revokedAt, &expiresAt)

    if err == sql.ErrNoRows {
        return uuid.Nil, fmt.Errorf("invalid API key")
    }
    if err != nil {
        return uuid.Nil, err
    }

    if revokedAt.Valid {
        return uuid.Nil, fmt.Errorf("API key revoked")
    }

    if expiresAt.Valid && time.Now().After(expiresAt.Time) {
        return uuid.Nil, fmt.Errorf("API key expired")
    }

    // Update last_used_at
    s.db.ExecContext(ctx,
        `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_hash = $1`,
        keyHash)

    return workspaceID, nil
}
```

### 9.3 API Key Middleware

```go
// APIKeyMiddleware validates API key from Authorization header.
func APIKeyMiddleware(apiKeyService *service.APIKeyService) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                http.Error(w, `{"error":"missing API key"}`, http.StatusUnauthorized)
                return
            }

            parts := strings.Split(authHeader, " ")
            if len(parts) != 2 || parts[0] != "Bearer" {
                http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
                return
            }

            key := parts[1]

            // Validate format
            if !strings.HasPrefix(key, APIKeyPrefix) {
                http.Error(w, `{"error":"invalid API key format"}`, http.StatusUnauthorized)
                return
            }

            workspaceID, err := apiKeyService.ValidateAPIKey(r.Context(), key)
            if err != nil {
                http.Error(w, `{"error":"invalid or revoked API key"}`, http.StatusUnauthorized)
                return
            }

            ws := &domain.Workspace{ID: workspaceID}
            ctx := context.WithValue(r.Context(), "workspace", ws)
            ctx = context.WithValue(ctx, "api_key_auth", true) // Flag for API key auth

            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

---

## 10. Security Considerations

### 10.1 Token Handling

- **Never log tokens**: Ensure tokens are never written to logs or error messages.
  ```go
  // BAD: Do NOT do this
  log.Printf("Token: %s", tokenString)

  // GOOD: Log only the first 10 chars or omit entirely
  log.Printf("Token validation for user %s", userID)
  ```

- **HTTPS Only in Production**: All tokens transmitted only over TLS.
  - Enforce HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

- **Token Lifetime**: Access tokens must be short-lived (15 min). If a token is stolen, damage is limited.

### 10.2 Refresh Token Security

- **HttpOnly Cookie**: Prevents JavaScript access (XSS mitigation).
  ```go
  http.SetCookie(w, &http.Cookie{
      Name:     "refresh_token",
      Value:    token,
      HttpOnly: true,
      Secure:   true, // HTTPS only
      SameSite: http.SameSiteSt
,
      Path:     "/",
      MaxAge:   604800, // 7 days
  })
  ```

- **SameSite=Strict**: Prevents CSRF attacks. Cookie sent only on same-site requests.

- **Secure Flag**: Ensures cookie only sent over HTTPS.

### 10.3 Password Security

- **Bcrypt Cost 12**: ~250ms per login (sufficient entropy, acceptable latency).
- **Never Log Passwords**: Not in request logs, not in error messages.
- **Password Reset Tokens**: One-time use, time-limited (1 hour), sent via email.

### 10.4 JWT Security

- **RS256 (RSA-SHA256)**: Asymmetric signing. Public key widely distributed; private key kept secret.
  - Alternative: ES256 (ECDSA) for slightly faster verification.

- **Signature Verification**: Always verify signature before using claims.
  ```go
  // Verify algorithm
  if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
      return fmt.Errorf("unexpected signing method")
  }
  ```

- **Constant-Time Comparison**: Use `subtle.ConstantTimeCompare` for sensitive comparisons.
  ```go
  import "crypto/subtle"

  if subtle.ConstantTimeCompare([]byte(expected), []byte(actual)) != 1 {
      return fmt.Errorf("mismatch")
  }
  ```

### 10.5 OAuth Security

- **PKCE (Proof Key for Public Clients)**: Mandatory for all OAuth flows.
  - Code verifier: 128 random characters
  - Code challenge: SHA256(verifier)
  - Prevents authorization code interception attacks

- **State Parameter**: Random 32 bytes, prevents CSRF.

- **Nonce**: Prevents replay attacks and token substitution.

- **ID Token Verification**: Always verify signature, issuer, audience, nonce.
  ```go
  // Verify claims
  if claims["iss"] != expectedIssuer {
      return fmt.Errorf("invalid issuer")
  }
  if claims["aud"] != expectedAudience {
      return fmt.Errorf("invalid audience")
  }
  if claims["nonce"] != expectedNonce {
      return fmt.Errorf("invalid nonce")
  }
  ```

### 10.6 CORS Configuration

Whitelist allowed origins; don't use `*` (all origins).

```go
func CORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            origin := r.Header.Get("Origin")

            // Check if origin is in whitelist
            allowed := false
            for _, ao := range allowedOrigins {
                if origin == ao {
                    allowed = true
                    break
                }
            }

            if !allowed {
                http.Error(w, "CORS not allowed", http.StatusForbidden)
                return
            }

            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Workspace-ID, X-Request-ID")
            w.Header().Set("Access-Control-Allow-Credentials", "true") // Allow cookies
            w.Header().Set("Access-Control-Max-Age", "3600")

            if r.Method == http.MethodOptions {
                w.WriteHeader(http.StatusNoContent)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

### 10.7 Rate Limiting Headers

Include rate limit info in every response:

```go
w.Header().Set("X-RateLimit-Limit", "300")
w.Header().Set("X-RateLimit-Remaining", "299")
w.Header().Set("X-RateLimit-Reset", fmt.Sprint(resetTime.Unix()))
```

---

## 11. Error Handling

### 11.1 Auth Error Responses

All errors should be consistent, non-leaky, and helpful for debugging.

```go
package domain

var (
    ErrInvalidCredentials    = &APIError{Code: "INVALID_CREDENTIALS", StatusCode: 401, Message: "Invalid email or password"}
    ErrTokenExpired          = &APIError{Code: "TOKEN_EXPIRED", StatusCode: 401, Message: "Token expired. Please refresh."}
    ErrTokenInvalid          = &APIError{Code: "TOKEN_INVALID", StatusCode: 401, Message: "Invalid or malformed token"}
    ErrTokenRevoked          = &APIError{Code: "TOKEN_REVOKED", StatusCode: 401, Message: "Token has been revoked"}
    ErrUnauthorized          = &APIError{Code: "UNAUTHORIZED", StatusCode: 401, Message: "Unauthorized"}
    ErrForbidden             = &APIError{Code: "FORBIDDEN", StatusCode: 403, Message: "Forbidden"}
    ErrUserNotFound          = &APIError{Code: "USER_NOT_FOUND", StatusCode: 404, Message: "User not found"}
    ErrWorkspaceNotFound     = &APIError{Code: "WORKSPACE_NOT_FOUND", StatusCode: 404, Message: "Workspace not found"}
    ErrPasswordTooShort      = &APIError{Code: "PASSWORD_TOO_SHORT", StatusCode: 400, Message: "Password must be at least 8 characters"}
    ErrPasswordComplexity    = &APIError{Code: "PASSWORD_COMPLEXITY", StatusCode: 400, Message: "Password must contain uppercase, lowercase, and number"}
    ErrEmailAlreadyExists    = &APIError{Code: "EMAIL_ALREADY_EXISTS", StatusCode: 409, Message: "Email already registered"}
    ErrTooManyLoginAttempts  = &APIError{Code: "TOO_MANY_ATTEMPTS", StatusCode: 429, Message: "Too many login attempts. Try again later."}
    ErrAccountLockedReset    = &APIError{Code: "ACCOUNT_LOCKED", StatusCode: 403, Message: "Account locked. Please reset your password."}
)

type APIError struct {
    Code       string      `json:"code"`
    StatusCode int         `json:"-"`
    Message    string      `json:"message"`
    Details    interface{} `json:"details,omitempty"`
}
```

### 11.2 Handler Error Response

```go
func respondError(w http.ResponseWriter, err error) {
    if apiErr, ok := err.(*domain.APIError); ok {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(apiErr.StatusCode)
        json.NewEncoder(w).Encode(apiErr)
        return
    }

    // Default 500
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(&domain.APIError{
        Code:    "INTERNAL_ERROR",
        Message: "Internal server error",
    })
}
```

---

## 12. Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Set up RSA key pair generation and management
- [ ] Implement bcrypt password hashing
- [ ] Create `users` and `sessions` tables
- [ ] Implement `TokenService` for JWT issuance/validation
- [ ] Implement `PasswordService` with complexity validation
- [ ] Implement `SessionService` (CRUD operations)
- [ ] Implement `AuthMiddleware` and `OptionalAuthMiddleware`
- [ ] Implement `RequestIDMiddleware`
- [ ] Test token generation, validation, expiration

### Phase 2: Login & Logout (Week 2-3)

- [ ] Implement `POST /auth/signup` handler
- [ ] Implement `POST /auth/login` handler with rate limiting
- [ ] Implement `POST /auth/logout` handler
- [ ] Implement `POST /auth/refresh` handler with token rotation
- [ ] Test login/logout/refresh flows end-to-end
- [ ] Implement theft detection (token reuse)

### Phase 3: Password Reset (Week 3)

- [ ] Create `password_reset_tokens` table
- [ ] Implement `POST /auth/password-reset-request` handler
- [ ] Implement email sending service
- [ ] Implement `POST /auth/password-reset` handler
- [ ] Test reset flow with time-limited tokens

### Phase 4: OAuth (Week 4)

- [ ] Set up Google OAuth credentials
- [ ] Implement `POST /auth/oauth/authorize` (PKCE generation)
- [ ] Implement `GET /auth/oauth/callback` (code exchange, ID token verification)
- [ ] Create `oauth_provider_tokens` table
- [ ] Add GitHub OAuth support
- [ ] Add Apple OAuth support
- [ ] Test full OAuth flow on web and mobile

### Phase 5: Authorization (Week 4-5)

- [ ] Implement `WorkspaceMiddleware`
- [ ] Implement `RoleMiddleware`
- [ ] Implement `RateLimitMiddleware` with Redis
- [ ] Implement rate limiting headers
- [ ] Test permission checking on protected endpoints

### Phase 6: API Keys (Week 5)

- [ ] Create `api_keys` table
- [ ] Implement API key generation and hashing
- [ ] Implement `APIKeyMiddleware`
- [ ] Implement API key management endpoints
- [ ] Test machine-to-machine authentication

### Phase 7: Security Hardening (Week 5-6)

- [ ] Add `TokenBlacklistMiddleware`
- [ ] Implement CORS whitelist
- [ ] Add HSTS and security headers
- [ ] Implement token cleanup cron job
- [ ] Add comprehensive logging (no sensitive data)
- [ ] Audit all error messages (no info leakage)

### Phase 8: Testing & Documentation (Week 6)

- [ ] Unit tests for TokenService, PasswordService, SessionService
- [ ] Integration tests for auth endpoints
- [ ] End-to-end tests for login/logout/refresh flows
- [ ] Security tests (brute force, token reuse, CORS)
- [ ] Load test rate limiting
- [ ] Update API documentation
- [ ] Write runbooks for key rotation, breach response

---

## Database Migrations

Create migrations in `internal/migrations/`:

```sql
-- migrations/001_create_users.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    picture_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    tier VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    oauth_provider VARCHAR(50),
    oauth_provider_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);

-- migrations/002_create_sessions.sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_jti VARCHAR(255) NOT NULL UNIQUE,
    token_family UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_family ON sessions(token_family);

-- migrations/003_create_password_reset_tokens.sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);
```

---

## Key Configuration Variables

Store in `.env` (dev) or AWS Secrets Manager (prod):

```bash
# JWT
JWT_PRIVATE_KEY_PATH=/etc/ordo/jwt-private-key.pem
JWT_PUBLIC_KEY_PATH=/etc/ordo/jwt-public-key.pem
JWT_ACCESS_TOKEN_EXPIRY=900  # 15 minutes in seconds
JWT_REFRESH_TOKEN_EXPIRY=604800  # 7 days in seconds

# OAuth - Google
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GOOGLE_REDIRECT_URI=https://api.ordo.app/v1/auth/oauth/callback/google

# OAuth - GitHub
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
OAUTH_GITHUB_REDIRECT_URI=https://api.ordo.app/v1/auth/oauth/callback/github

# OAuth - Apple
OAUTH_APPLE_CLIENT_ID=...
OAUTH_APPLE_TEAM_ID=...
OAUTH_APPLE_KEY_ID=...
OAUTH_APPLE_PRIVATE_KEY_PATH=/etc/ordo/apple-private-key.p8

# Security
BCRYPT_COST=12
PASSWORD_MIN_LENGTH=8
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_DURATION=900  # 15 minutes
SESSION_CLEANUP_INTERVAL=86400  # 24 hours

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=...
EMAIL_FROM=noreply@ordo.app

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://app.ordo.app,https://staging.ordo.app,http://localhost:3000
```

---

## Summary

This specification provides everything needed to implement production-grade JWT-based authentication with OAuth2, password reset, rate limiting, and session management.

**Key principles:**
1. **Stateless**: Access tokens require no DB lookup
2. **Secure**: Tokens never logged, HTTPS-only, HttpOnly cookies
3. **Rotational**: Refresh tokens rotate on each use; theft detected via family tracking
4. **Scalable**: Redis-backed rate limiting and revocation
5. **Observable**: Request IDs for distributed tracing, audit logs for security events

Start with Phase 1 (Foundation), ensuring all tests pass before moving to Phase 2. Each phase builds on the previous.
