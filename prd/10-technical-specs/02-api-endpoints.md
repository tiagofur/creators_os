# API Endpoints Specification — Ordo Creator OS

**Production-Ready REST + WebSocket API Reference**

Last Updated: 2026-03-10
Status: Complete
Framework: Go + Chi Router
Database: PostgreSQL 16+
Authentication: JWT + OAuth

---

## Table of Contents

1. [API Conventions](#api-conventions)
2. [Authentication](#authentication)
3. [Auth Endpoints](#auth-endpoints)
4. [Users Endpoints](#users-endpoints)
5. [Workspaces Endpoints](#workspaces-endpoints)
6. [Ideas Endpoints](#ideas-endpoints)
7. [Content Pipeline Endpoints](#content-pipeline-endpoints)
8. [Series Endpoints](#series-endpoints)
9. [Publishing & Calendar Endpoints](#publishing--calendar-endpoints)
10. [AI / Creators Studio Endpoints](#ai--creators-studio-endpoints)
11. [Remix Engine Endpoints](#remix-engine-endpoints)
12. [Analytics Endpoints](#analytics-endpoints)
13. [Consistency & Gamification Endpoints](#consistency--gamification-endpoints)
14. [Sponsorships CRM Endpoints](#sponsorships-crm-endpoints)
15. [Templates Endpoints](#templates-endpoints)
16. [File Upload Endpoints](#file-upload-endpoints)
17. [Billing Endpoints](#billing-endpoints)
18. [WebSocket Events](#websocket-events)
19. [Global Search Endpoints](#global-search-endpoints)

---

## API Conventions

### Base URL
```
Production: https://api.ordo.app/v1
Development: http://localhost:8080/v1
Staging: https://staging-api.ordo.app/v1
```

### API Versioning
- **Version in URL path**: `/v1/`, `/v2/`, etc.
- **Deprecation header**: `Deprecation: true`, `Sunset: <RFC 7231 date>`
- **Current version**: v1 (stable)

### HTTP Methods
- **GET**: Retrieve resource(s)
- **POST**: Create resource or perform action
- **PATCH**: Partial update to resource
- **PUT**: Full replacement of resource
- **DELETE**: Delete resource (soft delete unless noted)

### Status Codes
- **200 OK**: Successful GET, PATCH, PUT, DELETE
- **201 Created**: Successful POST creating a resource
- **202 Accepted**: Async operation accepted
- **204 No Content**: Successful DELETE or HEAD
- **400 Bad Request**: Invalid input, validation error
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated but lacks permission
- **404 Not Found**: Resource does not exist
- **409 Conflict**: Resource conflict (e.g., duplicate email)
- **422 Unprocessable Entity**: Semantic validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily down

### Pagination

All list endpoints support pagination via query parameters:
```
?page=1&limit=25&sort=created_at&order=desc
```

**Response format**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "pages": 6,
    "has_next": true,
    "has_prev": false
  }
}
```

**Default limits by endpoint**:
- Most list endpoints: 25 items/page
- Analytics: 50 items/page
- Search: 10 items/page

### Error Response Format

All error responses follow this format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "status": 400,
    "timestamp": "2026-03-10T14:30:00Z",
    "request_id": "req_abc123def456",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      }
    ]
  }
}
```

**Error codes**:
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_FAILED`: Auth failed
- `PERMISSION_DENIED`: Authorization failed
- `RESOURCE_NOT_FOUND`: Resource doesn't exist
- `RESOURCE_CONFLICT`: Conflict (duplicate, etc.)
- `RATE_LIMIT_EXCEEDED`: Rate limit hit
- `INTERNAL_ERROR`: Server error
- `SERVICE_UNAVAILABLE`: Maintenance/down
- `INVALID_REQUEST`: Malformed request

### Request Headers

**Required**:
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Optional**:
```
X-Request-ID: {request_id}           # For tracing (auto-generated if missing)
X-Workspace-ID: {workspace_id}       # For multi-workspace context
Accept-Language: en-US               # For localization
User-Agent: {client_identifier}      # Client info
```

### Response Headers

All responses include:
```
X-Request-ID: {request_id}
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678540800
Cache-Control: private, max-age=0
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

### Timestamps

- **Format**: ISO 8601 with UTC timezone
- **Example**: `2026-03-10T14:30:00Z`
- All timestamps immutable after creation (created_at)
- updated_at updates on any modification

### Rate Limiting

Rate limits are **per user per endpoint**, tracked via sliding window:

| Tier | Request Limit | Window | Burst |
|------|---------------|--------|-------|
| Free | 100 req/hour | 1 hour | 10 req/min |
| Pro | 1,000 req/hour | 1 hour | 100 req/min |
| Enterprise | Unlimited | N/A | N/A |

**Rate limit headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678540800
```

When limit exceeded: **HTTP 429** with `Retry-After: {seconds}` header.

---

## Authentication

### JWT Token Structure

**Access Token** (short-lived, 15 minutes):
```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "workspace_id": "workspace_uuid",
  "role": "owner|admin|editor|viewer",
  "tier": "free|pro|enterprise",
  "iat": 1678540200,
  "exp": 1678541100
}
```

**Refresh Token** (long-lived, 7 days):
```json
{
  "sub": "user_uuid",
  "type": "refresh",
  "iat": 1678540200,
  "exp": 1679145000
}
```

### Token Exchange Flow

1. User logs in → receive `access_token` + `refresh_token` + `expires_in`
2. Store `refresh_token` securely (HttpOnly cookie or secure storage)
3. Use `access_token` in `Authorization: Bearer {token}` header
4. When access token expires (HTTP 401), call `/auth/refresh` with `refresh_token`
5. Receive new `access_token` + new `refresh_token`

### OAuth Flow

**Implicit grant for web/mobile**:
1. Redirect to `/oauth/{provider}/authorize?redirect_uri=...&state=...`
2. User authenticates with provider
3. Provider redirects to your app with `code=...&state=...`
4. Your backend calls `/auth/oauth/callback?code=...&provider=google`
5. Receive `access_token` + `refresh_token`

**Supported providers**: google, github, slack

---

## Auth Endpoints

### 1. Register (Email/Password)

**POST** `/auth/register`

Create a new user account with email and password.

**Auth**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "timezone": "America/New_York",
  "locale": "en"
}
```

**Query Parameters**: None

**Validation**:
- `email`: Valid email format, unique
- `password`: Min 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- `name`: Min 2 chars, max 255 chars
- `timezone`: Valid IANA timezone
- `locale`: Valid ISO 639-1 code (en, es, fr, etc.)

**Success Response (201 Created)**:
```json
{
  "user": {
    "id": "user_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": null,
    "timezone": "America/New_York",
    "locale": "en",
    "subscription_tier": "free",
    "onboarding_completed": false,
    "created_at": "2026-03-10T14:30:00Z"
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "expires_in": 900
  }
}
```

**Error Codes**:
- `400 Bad Request`: Validation failed
- `409 Conflict`: Email already registered
- `503 Service Unavailable`: Email service down

---

### 2. Login (Email/Password)

**POST** `/auth/login`

Authenticate with email and password.

**Auth**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Query Parameters**: None

**Success Response (200 OK)**:
```json
{
  "user": {
    "id": "user_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://cdn.ordo.app/avatars/user_123abc.jpg",
    "subscription_tier": "pro",
    "created_at": "2026-03-10T14:30:00Z"
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "expires_in": 900
  }
}
```

**Error Codes**:
- `401 Unauthorized`: Invalid email or password
- `400 Bad Request`: Validation failed

---

### 3. Refresh Token

**POST** `/auth/refresh`

Get a new access token using a refresh token.

**Auth**: Not required (uses refresh token in body or cookie)

**Request Body** (either body or cookie):
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Or Cookie-based** (HttpOnly):
```
Cookie: refresh_token=eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Success Response (200 OK)**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expires_in": 900
}
```

**Error Codes**:
- `401 Unauthorized`: Invalid or expired refresh token
- `400 Bad Request`: Refresh token missing

---

### 4. Logout

**POST** `/auth/logout`

Invalidate access and refresh tokens.

**Auth**: Required (any authenticated user)

**Request Body**: Empty or `{ "all_devices": false }`

**Query Parameters**: None

**Response (204 No Content)**:
```
(empty body)
```

**Optional param**: `?all_devices=true` to logout from all devices

**Error Codes**:
- `401 Unauthorized`: Not authenticated

---

### 5. Forgot Password

**POST** `/auth/forgot-password`

Request a password reset email.

**Auth**: Not required

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK)**:
```json
{
  "message": "Password reset email sent",
  "email": "user@example.com"
}
```

**Note**: Always returns 200 for security (doesn't reveal if email exists)

**Error Codes**:
- `400 Bad Request`: Invalid email format
- `503 Service Unavailable`: Email service down

---

### 6. Reset Password

**POST** `/auth/reset-password`

Set a new password using a reset token from email.

**Auth**: Not required

**Request Body**:
```json
{
  "reset_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "new_password": "NewSecurePassword456!"
}
```

**Validation**:
- `reset_token`: Valid and not expired (24 hour window)
- `new_password`: Same rules as register password

**Success Response (200 OK)**:
```json
{
  "message": "Password reset successfully",
  "user": {
    "id": "user_123abc",
    "email": "user@example.com"
  }
}
```

**Error Codes**:
- `400 Bad Request`: Invalid/expired token
- `422 Unprocessable Entity`: Password doesn't meet requirements

---

### 7. OAuth Authorization

**GET** `/auth/oauth/{provider}/authorize`

Redirect user to OAuth provider login page.

**Providers**: `google`, `github`, `slack`

**Query Parameters**:
- `redirect_uri` (required): URL to redirect back to after auth
- `state` (required): CSRF token (generate on client)
- `scope` (optional): Space-separated scopes

**Response**: 302 Found, redirects to provider login

**Example**:
```
GET /auth/oauth/google/authorize?redirect_uri=https://app.ordo.app/auth/callback&state=abc123xyz
```

---

### 8. OAuth Callback

**POST** `/auth/oauth/callback`

Handle OAuth provider callback.

**Auth**: Not required

**Request Body**:
```json
{
  "code": "4/0AX4XfWi_...",
  "provider": "google",
  "state": "abc123xyz"
}
```

**Query Parameters**:
- `code`: Authorization code from provider
- `state`: CSRF token (must match initial state)

**Success Response (200 OK)**:
```json
{
  "user": {
    "id": "user_456def",
    "email": "user@gmail.com",
    "name": "John Doe",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "subscription_tier": "free"
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "expires_in": 900
  },
  "is_new_user": true
}
```

**Error Codes**:
- `400 Bad Request`: Invalid code or state mismatch
- `403 Forbidden`: Provider not configured
- `503 Service Unavailable`: Provider down

---

### 9. Get Current Session

**GET** `/auth/me`

Get currently authenticated user info and active workspace.

**Auth**: Required

**Query Parameters**: None

**Success Response (200 OK)**:
```json
{
  "user": {
    "id": "user_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://cdn.ordo.app/avatars/user_123abc.jpg",
    "timezone": "America/New_York",
    "locale": "en",
    "subscription_tier": "pro",
    "ai_credits_remaining": 450,
    "streak_count": 7,
    "xp_total": 2500,
    "xp_level": 5,
    "created_at": "2026-03-10T14:30:00Z"
  },
  "workspace": {
    "id": "workspace_789ghi",
    "name": "My Creator Studio",
    "role": "owner",
    "tier": "pro"
  }
}
```

**Error Codes**:
- `401 Unauthorized`: Invalid or expired token

---

## Users Endpoints

### 1. Get User Profile

**GET** `/users/{user_id}`

Get user profile by ID.

**Auth**: Required (can view own profile or workspace admin viewing members)

**Minimum Role**: Viewer

**Path Parameters**:
- `user_id`: UUID of user to fetch

**Query Parameters**: None

**Success Response (200 OK)**:
```json
{
  "id": "user_123abc",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://cdn.ordo.app/avatars/user_123abc.jpg",
  "timezone": "America/New_York",
  "locale": "en",
  "subscription_tier": "pro",
  "onboarding_completed": true,
  "ai_credits_remaining": 450,
  "streak_count": 7,
  "streak_best": 15,
  "xp_total": 2500,
  "xp_level": 5,
  "created_at": "2026-03-10T14:30:00Z",
  "updated_at": "2026-03-10T14:30:00Z"
}
```

**Error Codes**:
- `404 Not Found`: User doesn't exist
- `403 Forbidden`: No access to this user's data

---

### 2. Update User Profile

**PATCH** `/users/{user_id}`

Update authenticated user's profile.

**Auth**: Required (can only update own profile)

**Minimum Role**: Any

**Path Parameters**:
- `user_id`: Must be current user

**Request Body** (all optional):
```json
{
  "name": "Jane Doe",
  "avatar_url": "https://cdn.ordo.app/avatars/new-avatar.jpg",
  "timezone": "Europe/London",
  "locale": "es"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "user_123abc",
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar_url": "https://cdn.ordo.app/avatars/new-avatar.jpg",
  "timezone": "Europe/London",
  "locale": "es",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

**Error Codes**:
- `404 Not Found`: User doesn't exist
- `403 Forbidden`: Cannot update other user profiles
- `400 Bad Request`: Validation failed

---

### 3. Get User Preferences

**GET** `/users/{user_id}/preferences`

Get user notification and feature preferences.

**Auth**: Required (own preferences)

**Minimum Role**: Any

**Query Parameters**: None

**Success Response (200 OK)**:
```json
{
  "user_id": "user_123abc",
  "notifications": {
    "email": {
      "achievements": true,
      "collaboration": true,
      "reminders": true,
      "ai_suggestions": false,
      "system_updates": true
    },
    "push": {
      "achievements": true,
      "collaboration": true,
      "reminders": false,
      "ai_suggestions": false
    },
    "digest_frequency": "daily"
  },
  "feature_flags": {
    "beta_ai_studio": true,
    "experimental_analytics": false
  },
  "updated_at": "2026-03-10T14:30:00Z"
}
```

---

### 4. Update User Preferences

**PATCH** `/users/{user_id}/preferences`

Update notification and feature preferences.

**Auth**: Required

**Request Body**:
```json
{
  "notifications": {
    "email": {
      "achievements": true,
      "collaboration": false
    },
    "digest_frequency": "weekly"
  },
  "feature_flags": {
    "beta_ai_studio": false
  }
}
```

**Success Response (200 OK)**: Same as GET preferences

---

### 5. Get User Stats

**GET** `/users/{user_id}/stats`

Get user statistics (content, metrics, etc.).

**Auth**: Required

**Query Parameters**: None

**Success Response (200 OK)**:
```json
{
  "user_id": "user_123abc",
  "total_ideas": 45,
  "total_content": 32,
  "content_published": 28,
  "total_words_written": 12500,
  "total_time_spent": 14400,
  "consistency_score": 85,
  "avg_pipeline_velocity": 3.2,
  "platforms": {
    "youtube": 12,
    "instagram": 8,
    "twitter": 8
  },
  "last_publication": "2026-03-10T10:00:00Z",
  "best_performing_content": {
    "id": "content_111",
    "title": "How to Master AI",
    "platform": "youtube",
    "views": 50000,
    "engagement_rate": 8.5
  }
}
```

---

### 6. List User Notifications

**GET** `/users/{user_id}/notifications`

Get user's notification history.

**Auth**: Required (own notifications)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25, max: 100)
- `type`: Filter by type (achievement, collaboration, reminder, ai_suggestion, system)
- `read`: Filter by read status (true/false)
- `sort`: Sort by created_at or updated_at (default: created_at)
- `order`: asc or desc (default: desc)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "notif_123",
      "user_id": "user_123abc",
      "type": "achievement",
      "title": "Consistency King",
      "message": "You've published 7 days in a row!",
      "data": {
        "streak_count": 7,
        "multiplier": 1.5
      },
      "read": false,
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "pages": 6,
    "has_next": true
  }
}
```

---

### 7. Mark Notification as Read

**PATCH** `/users/{user_id}/notifications/{notif_id}`

Mark a notification as read.

**Auth**: Required

**Request Body**:
```json
{
  "read": true
}
```

**Success Response (200 OK)**:
```json
{
  "id": "notif_123",
  "read": true
}
```

---

### 8. Delete Account

**DELETE** `/users/{user_id}`

Permanently delete user account (soft delete).

**Auth**: Required (own account only)

**Query Parameters**: None

**Request Body** (optional):
```json
{
  "reason": "Not using anymore"
}
```

**Success Response (204 No Content)**:
```
(empty)
```

**Note**: Soft deletes user and all workspace data. Data retained for 30 days before hard deletion.

---

## Workspaces Endpoints

### 1. List User Workspaces

**GET** `/workspaces`

Get all workspaces user is a member of.

**Auth**: Required

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `sort`: Sort by name or created_at (default: created_at)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "workspace_789ghi",
      "name": "My Creator Studio",
      "description": "Personal content studio",
      "tier": "pro",
      "owner_id": "user_123abc",
      "member_count": 3,
      "role": "owner",
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 2,
    "pages": 1,
    "has_next": false
  }
}
```

---

### 2. Create Workspace

**POST** `/workspaces`

Create a new workspace.

**Auth**: Required

**Request Body**:
```json
{
  "name": "My Creator Studio",
  "description": "Personal content studio",
  "timezone": "America/New_York"
}
```

**Validation**:
- `name`: Min 3 chars, max 100 chars, unique per user
- `description`: Max 500 chars
- `timezone`: Valid IANA timezone

**Success Response (201 Created)**:
```json
{
  "id": "workspace_789ghi",
  "name": "My Creator Studio",
  "description": "Personal content studio",
  "tier": "free",
  "owner_id": "user_123abc",
  "member_count": 1,
  "role": "owner",
  "created_at": "2026-03-10T14:30:00Z"
}
```

**Error Codes**:
- `409 Conflict`: Workspace name already exists for user
- `400 Bad Request`: Validation failed

---

### 3. Get Workspace

**GET** `/workspaces/{workspace_id}`

Get workspace details.

**Auth**: Required (must be member)

**Minimum Role**: Viewer

**Path Parameters**:
- `workspace_id`: UUID

**Success Response (200 OK)**:
```json
{
  "id": "workspace_789ghi",
  "name": "My Creator Studio",
  "description": "Personal content studio",
  "tier": "pro",
  "owner_id": "user_123abc",
  "member_count": 3,
  "role": "owner",
  "settings": {
    "default_content_type": "video",
    "auto_publish_on_schedule": true,
    "require_approval": false
  },
  "created_at": "2026-03-10T14:30:00Z",
  "updated_at": "2026-03-10T14:30:00Z"
}
```

---

### 4. Update Workspace

**PATCH** `/workspaces/{workspace_id}`

Update workspace settings.

**Auth**: Required (Owner or Admin only)

**Minimum Role**: Admin

**Request Body** (all optional):
```json
{
  "name": "Updated Studio Name",
  "description": "Updated description",
  "settings": {
    "default_content_type": "short",
    "auto_publish_on_schedule": false,
    "require_approval": true
  }
}
```

**Success Response (200 OK)**:
```json
{
  "id": "workspace_789ghi",
  "name": "Updated Studio Name",
  "description": "Updated description",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 5. Delete Workspace

**DELETE** `/workspaces/{workspace_id}`

Soft-delete workspace (only owner).

**Auth**: Required (Owner only)

**Minimum Role**: Owner

**Query Parameters**: None

**Success Response (204 No Content)**:
```
(empty)
```

**Note**: Workspace and all content recoverable for 30 days.

---

### 6. List Workspace Members

**GET** `/workspaces/{workspace_id}/members`

Get all members in workspace.

**Auth**: Required (must be member)

**Minimum Role**: Viewer

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `role`: Filter by role (owner, admin, editor, viewer)
- `sort`: Sort by name or created_at

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "member_123",
      "user_id": "user_123abc",
      "workspace_id": "workspace_789ghi",
      "user": {
        "id": "user_123abc",
        "email": "john@example.com",
        "name": "John Doe",
        "avatar_url": "https://cdn.ordo.app/avatars/user_123abc.jpg"
      },
      "role": "owner",
      "joined_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 3,
    "pages": 1
  }
}
```

---

### 7. Invite Workspace Member

**POST** `/workspaces/{workspace_id}/invitations`

Send invitation to join workspace.

**Auth**: Required (Admin or Owner)

**Minimum Role**: Admin

**Request Body**:
```json
{
  "email": "newmember@example.com",
  "role": "editor",
  "message": "Join our creator team!"
}
```

**Validation**:
- `email`: Valid email format, not already member
- `role`: owner, admin, editor, or viewer

**Success Response (201 Created)**:
```json
{
  "id": "invite_456jkl",
  "workspace_id": "workspace_789ghi",
  "email": "newmember@example.com",
  "role": "editor",
  "status": "pending",
  "invited_by": "user_123abc",
  "expires_at": "2026-03-17T14:30:00Z",
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 8. List Workspace Invitations

**GET** `/workspaces/{workspace_id}/invitations`

Get pending invitations for workspace.

**Auth**: Required (Admin or Owner)

**Minimum Role**: Admin

**Query Parameters**:
- `status`: pending, accepted, declined (default: pending)
- `page`: Page number

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "invite_456jkl",
      "email": "newmember@example.com",
      "role": "editor",
      "status": "pending",
      "expires_at": "2026-03-17T14:30:00Z",
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 9. Accept Workspace Invitation

**POST** `/workspaces/invitations/{invite_id}/accept`

Accept a workspace invitation.

**Auth**: Required (invitee)

**Request Body**: Empty

**Success Response (200 OK)**:
```json
{
  "workspace": {
    "id": "workspace_789ghi",
    "name": "My Creator Studio",
    "tier": "pro"
  },
  "message": "Successfully joined workspace"
}
```

**Error Codes**:
- `404 Not Found`: Invitation doesn't exist
- `409 Conflict`: Invitation already accepted or expired

---

### 10. Reject Workspace Invitation

**POST** `/workspaces/invitations/{invite_id}/reject`

Reject a workspace invitation.

**Auth**: Required

**Request Body**: Empty

**Success Response (200 OK)**:
```json
{
  "message": "Invitation rejected"
}
```

---

### 11. Update Member Role

**PATCH** `/workspaces/{workspace_id}/members/{user_id}`

Update member's role in workspace.

**Auth**: Required (Owner only for most changes)

**Minimum Role**: Owner

**Request Body**:
```json
{
  "role": "admin"
}
```

**Valid roles**: owner, admin, editor, viewer

**Success Response (200 OK)**:
```json
{
  "user_id": "user_456def",
  "role": "admin",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 12. Remove Member

**DELETE** `/workspaces/{workspace_id}/members/{user_id}`

Remove member from workspace.

**Auth**: Required (Admin or Owner)

**Minimum Role**: Admin

**Success Response (204 No Content)**:
```
(empty)
```

---

### 13. Get Workspace Activity Log

**GET** `/workspaces/{workspace_id}/activity`

Get audit log of workspace activities.

**Auth**: Required (Admin or Owner)

**Minimum Role**: Admin

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `type`: Filter by activity type (created, updated, deleted, published, shared)
- `user_id`: Filter by actor
- `since`: ISO timestamp (get changes since)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "activity_123",
      "workspace_id": "workspace_789ghi",
      "user_id": "user_123abc",
      "type": "created",
      "entity_type": "content",
      "entity_id": "content_111",
      "entity_title": "My First Video",
      "changes": {
        "status": {
          "old": null,
          "new": "scripting"
        }
      },
      "timestamp": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

## Ideas Endpoints

### 1. Create Idea

**POST** `/workspaces/{workspace_id}/ideas`

Create a new idea.

**Auth**: Required (Editor+)

**Minimum Role**: Editor

**Request Body**:
```json
{
  "title": "AI-Powered Content Generator",
  "description": "Build a tool that uses AI to generate content ideas",
  "tags": ["ai", "productivity", "content"],
  "source": "manual|telegram|web|slack",
  "metadata": {
    "captured_from": "telegram_bot",
    "raw_content": "Check this out..."
  }
}
```

**Validation**:
- `title`: Min 3 chars, max 255 chars
- `description`: Max 2000 chars
- `tags`: Max 10 tags, each 50 chars max

**Success Response (201 Created)**:
```json
{
  "id": "idea_111",
  "workspace_id": "workspace_789ghi",
  "title": "AI-Powered Content Generator",
  "description": "Build a tool that uses AI to generate content ideas",
  "status": "captured",
  "tags": ["ai", "productivity", "content"],
  "created_by": "user_123abc",
  "created_at": "2026-03-10T14:30:00Z",
  "updated_at": "2026-03-10T14:30:00Z"
}
```

---

### 2. List Ideas

**GET** `/workspaces/{workspace_id}/ideas`

List all ideas in workspace.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `status`: Filter by status (captured, validated, transformed, archived, graveyard)
- `tag`: Filter by tag (comma-separated for AND)
- `search`: Search title/description
- `created_by`: Filter by creator
- `sort`: Sort by created_at, updated_at, or title (default: created_at)
- `order`: asc or desc (default: desc)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "idea_111",
      "workspace_id": "workspace_789ghi",
      "title": "AI-Powered Content Generator",
      "description": "Build a tool...",
      "status": "captured",
      "tags": ["ai", "productivity"],
      "validation_score": null,
      "effort_rating": null,
      "impact_rating": null,
      "created_by": "user_123abc",
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Get Idea

**GET** `/workspaces/{workspace_id}/ideas/{idea_id}`

Get single idea details.

**Auth**: Required (Viewer+)

**Success Response (200 OK)**:
```json
{
  "id": "idea_111",
  "workspace_id": "workspace_789ghi",
  "title": "AI-Powered Content Generator",
  "description": "Build a tool that uses AI to generate content ideas",
  "status": "captured",
  "tags": ["ai", "productivity", "content"],
  "validation_score": null,
  "effort_rating": null,
  "impact_rating": null,
  "transformations": [],
  "created_by": "user_123abc",
  "created_at": "2026-03-10T14:30:00Z",
  "updated_at": "2026-03-10T14:30:00Z"
}
```

---

### 4. Update Idea

**PATCH** `/workspaces/{workspace_id}/ideas/{idea_id}`

Update idea.

**Auth**: Required (Editor+)

**Request Body** (all optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["ai", "tools"],
  "status": "validated"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "idea_111",
  "title": "Updated Title",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 5. Validate Idea (Score)

**POST** `/workspaces/{workspace_id}/ideas/{idea_id}/validate`

Rate idea on effort/impact matrix.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "effort_rating": 7,
  "impact_rating": 9,
  "notes": "High impact, but complex to execute"
}
```

**Validation**:
- `effort_rating`: 1-10
- `impact_rating`: 1-10

**Success Response (200 OK)**:
```json
{
  "id": "idea_111",
  "status": "validated",
  "effort_rating": 7,
  "impact_rating": 9,
  "validation_score": 8.5,
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 6. Transform Idea (AI)

**POST** `/workspaces/{workspace_id}/ideas/{idea_id}/transform`

Use AI to transform idea into content variations.

**Auth**: Required (Editor+, requires AI credits)

**Request Body** (optional):
```json
{
  "num_variations": 5,
  "focus": "angles"
}
```

**Success Response (202 Accepted)** (async):
```json
{
  "job_id": "job_abc123",
  "idea_id": "idea_111",
  "status": "processing",
  "message": "Transformation in progress"
}
```

**Webhook** (when complete):
```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "result": {
    "variations": [
      {
        "angle": "AI as creative assistant for writers",
        "hook": "Stop struggling with writer's block...",
        "outline": "- Problem: Writer's block\n- Solution: AI tools\n- Benefit: 10x faster"
      }
    ]
  }
}
```

---

### 7. Enrich Idea

**POST** `/workspaces/{workspace_id}/ideas/{idea_id}/enrich`

Get AI suggestions for idea expansion.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "aspect": "angles|title|description|tags"
}
```

**Success Response (200 OK)**:
```json
{
  "idea_id": "idea_111",
  "aspect": "angles",
  "suggestions": [
    "How to use AI without losing your unique voice",
    "AI tools every content creator needs in 2026",
    "Why creators who embrace AI will dominate",
    "Building an AI-powered content machine",
    "AI ethics: what creators need to know"
  ]
}
```

---

### 8. Archive Idea

**POST** `/workspaces/{workspace_id}/ideas/{idea_id}/archive`

Archive idea (soft delete).

**Auth**: Required (Editor+)

**Request Body**: Empty

**Success Response (200 OK)**:
```json
{
  "id": "idea_111",
  "status": "archived"
}
```

---

### 9. Delete Idea

**DELETE** `/workspaces/{workspace_id}/ideas/{idea_id}`

Permanently delete idea.

**Auth**: Required (Owner)

**Success Response (204 No Content)**:
```
(empty)
```

---

### 10. Bulk Operations on Ideas

**POST** `/workspaces/{workspace_id}/ideas/bulk`

Perform bulk operations on multiple ideas.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "action": "archive|delete|retag|status_change",
  "idea_ids": ["idea_111", "idea_222", "idea_333"],
  "params": {
    "status": "archived"
  }
}
```

**Success Response (202 Accepted)**:
```json
{
  "job_id": "bulk_job_123",
  "action": "archive",
  "count": 3,
  "status": "processing"
}
```

---

### 11. Get Idea Suggestions (AI)

**GET** `/workspaces/{workspace_id}/ideas/suggestions`

Get AI-generated idea suggestions based on workspace trends.

**Auth**: Required (Editor+)

**Query Parameters**:
- `count`: Number of suggestions (default: 5, max: 20)
- `based_on`: existing_content or user_interests

**Success Response (200 OK)**:
```json
{
  "suggestions": [
    {
      "title": "The Future of Creator AI Assistants",
      "description": "Explore how AI is changing content creation...",
      "estimated_impact": 8.5,
      "related_topics": ["ai", "content-creation"],
      "angle": "How creators will use AI in next 12 months"
    }
  ]
}
```

---

## Content Pipeline Endpoints

### 1. Create Content

**POST** `/workspaces/{workspace_id}/contents`

Create new content in pipeline.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "How to Master AI in 2026",
  "type": "video",
  "description": "A deep dive into AI tools for creators",
  "idea_id": "idea_111",
  "series_id": "series_abc123",
  "status": "scripting",
  "priority": "high",
  "assigned_to": "user_456def",
  "metadata": {
    "duration_target": 1200,
    "target_platforms": ["youtube", "instagram"]
  }
}
```

**Validation**:
- `title`: Min 3 chars, max 255 chars
- `type`: video, short, reel, post, article, tweet, thread, carousel, newsletter, podcast, story
- `priority`: low, medium, high, urgent
- `status`: scripting, filming, editing, review, scheduled, published, archived

**Success Response (201 Created)**:
```json
{
  "id": "content_111",
  "workspace_id": "workspace_789ghi",
  "title": "How to Master AI in 2026",
  "type": "video",
  "status": "scripting",
  "priority": "high",
  "assigned_to": "user_456def",
  "created_by": "user_123abc",
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 2. List Content

**GET** `/workspaces/{workspace_id}/contents`

List content in pipeline with filtering.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `status`: Filter by status (scripting, filming, editing, review, scheduled, published, archived)
- `type`: Filter by content type
- `priority`: Filter by priority
- `assigned_to`: Filter by assignee
- `series_id`: Filter by series
- `search`: Search title/description
- `sort`: created_at, updated_at, title, priority, status
- `order`: asc or desc

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "content_111",
      "workspace_id": "workspace_789ghi",
      "title": "How to Master AI in 2026",
      "type": "video",
      "status": "scripting",
      "priority": "high",
      "assigned_to": {
        "id": "user_456def",
        "name": "Jane Smith",
        "avatar_url": "..."
      },
      "series": {
        "id": "series_abc123",
        "name": "AI Tips"
      },
      "created_at": "2026-03-10T14:30:00Z",
      "updated_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Get Content

**GET** `/workspaces/{workspace_id}/contents/{content_id}`

Get detailed content information.

**Auth**: Required (Viewer+)

**Success Response (200 OK)**:
```json
{
  "id": "content_111",
  "workspace_id": "workspace_789ghi",
  "title": "How to Master AI in 2026",
  "description": "A deep dive into AI tools for creators",
  "type": "video",
  "status": "scripting",
  "priority": "high",
  "assigned_to": {
    "id": "user_456def",
    "name": "Jane Smith"
  },
  "series": {
    "id": "series_abc123",
    "name": "AI Tips"
  },
  "idea_id": "idea_111",
  "time_logged": 3600,
  "versions": 2,
  "comments_count": 5,
  "checklist_items": 8,
  "metadata": {
    "duration_target": 1200,
    "target_platforms": ["youtube", "instagram"],
    "script_status": "draft",
    "thumbnail_generated": false
  },
  "created_by": "user_123abc",
  "created_at": "2026-03-10T14:30:00Z",
  "updated_at": "2026-03-10T14:30:00Z"
}
```

---

### 4. Update Content

**PATCH** `/workspaces/{workspace_id}/contents/{content_id}`

Update content fields.

**Auth**: Required (Editor+)

**Request Body** (all optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "type": "short",
  "priority": "urgent",
  "assigned_to": "user_789ghi",
  "series_id": "series_xyz789",
  "metadata": {
    "duration_target": 900
  }
}
```

**Success Response (200 OK)**:
```json
{
  "id": "content_111",
  "title": "Updated Title",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 5. Change Content Status

**POST** `/workspaces/{workspace_id}/contents/{content_id}/status`

Move content to next pipeline stage.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "new_status": "filming",
  "notes": "Started production yesterday"
}
```

**Valid transitions**:
- scripting → filming
- filming → editing
- editing → review
- review → scheduled or back to editing
- scheduled → published
- Any → archived

**Success Response (200 OK)**:
```json
{
  "id": "content_111",
  "status": "filming",
  "status_changed_at": "2026-03-10T15:00:00Z",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 6. Assign Content

**POST** `/workspaces/{workspace_id}/contents/{content_id}/assign`

Assign content to team member.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "assigned_to": "user_456def"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "content_111",
  "assigned_to": "user_456def",
  "assigned_at": "2026-03-10T15:00:00Z"
}
```

---

### 7. Set Content Priority

**PATCH** `/workspaces/{workspace_id}/contents/{content_id}/priority`

Update content priority.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "priority": "urgent"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "content_111",
  "priority": "urgent"
}
```

---

### 8. Mark as Duplicate

**POST** `/workspaces/{workspace_id}/contents/{content_id}/mark-duplicate`

Mark content as duplicate of another.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "original_content_id": "content_999"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "content_111",
  "is_duplicate": true,
  "duplicate_of": "content_999"
}
```

---

### 9. Get Content Versions

**GET** `/workspaces/{workspace_id}/contents/{content_id}/versions`

Get all versions of a content piece.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "version_1",
      "content_id": "content_111",
      "version_number": 2,
      "title": "How to Master AI in 2026",
      "created_by": "user_456def",
      "created_at": "2026-03-10T15:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 10. Get Content Comments

**GET** `/workspaces/{workspace_id}/contents/{content_id}/comments`

Get comments on content (feedback, collaboration).

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `sort`: created_at or updated_at
- `order`: asc or desc

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "comment_123",
      "content_id": "content_111",
      "author": {
        "id": "user_456def",
        "name": "Jane Smith",
        "avatar_url": "..."
      },
      "text": "Great script! Maybe shorten the intro?",
      "created_at": "2026-03-10T15:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 11. Add Comment to Content

**POST** `/workspaces/{workspace_id}/contents/{content_id}/comments`

Add a comment to content.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "text": "Great script! Maybe shorten the intro?",
  "mentions": ["user_456def"]
}
```

**Success Response (201 Created)**:
```json
{
  "id": "comment_123",
  "content_id": "content_111",
  "text": "Great script! Maybe shorten the intro?",
  "author_id": "user_123abc",
  "created_at": "2026-03-10T15:00:00Z"
}
```

---

### 12. Get Content Checklist

**GET** `/workspaces/{workspace_id}/contents/{content_id}/checklist`

Get checklist items for content production.

**Auth**: Required (Viewer+)

**Success Response (200 OK)**:
```json
{
  "content_id": "content_111",
  "checklist": [
    {
      "id": "item_1",
      "title": "Write script",
      "completed": true,
      "completed_by": "user_456def",
      "completed_at": "2026-03-09T10:00:00Z"
    },
    {
      "id": "item_2",
      "title": "Record audio",
      "completed": false
    },
    {
      "id": "item_3",
      "title": "Edit video",
      "completed": false
    }
  ]
}
```

---

### 13. Update Checklist Item

**PATCH** `/workspaces/{workspace_id}/contents/{content_id}/checklist/{item_id}`

Mark checklist item complete/incomplete.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "completed": true
}
```

**Success Response (200 OK)**:
```json
{
  "id": "item_2",
  "completed": true,
  "completed_at": "2026-03-10T15:00:00Z"
}
```

---

### 14. Add Checklist Item

**POST** `/workspaces/{workspace_id}/contents/{content_id}/checklist`

Add new checklist item.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "Get feedback from team"
}
```

**Success Response (201 Created)**:
```json
{
  "id": "item_4",
  "title": "Get feedback from team",
  "completed": false
}
```

---

### 15. Reorder Content in Pipeline

**POST** `/workspaces/{workspace_id}/contents/reorder`

Change order of content (for kanban view).

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "moves": [
    {
      "content_id": "content_111",
      "from_status": "scripting",
      "to_status": "filming",
      "position": 3
    }
  ]
}
```

**Success Response (200 OK)**:
```json
{
  "updated": 1,
  "message": "Reordering complete"
}
```

---

### 16. Bulk Content Operations

**POST** `/workspaces/{workspace_id}/contents/bulk`

Perform bulk operations on multiple content pieces.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "action": "archive|delete|status_change|assign|priority_change",
  "content_ids": ["content_111", "content_222"],
  "params": {
    "status": "archived"
  }
}
```

**Success Response (202 Accepted)**:
```json
{
  "job_id": "bulk_job_456",
  "action": "archive",
  "count": 2,
  "status": "processing"
}
```

---

### 17. Get Pipeline Stats

**GET** `/workspaces/{workspace_id}/contents/stats`

Get pipeline statistics.

**Auth**: Required (Viewer+)

**Success Response (200 OK)**:
```json
{
  "workspace_id": "workspace_789ghi",
  "total_content": 45,
  "by_status": {
    "scripting": 5,
    "filming": 3,
    "editing": 2,
    "review": 1,
    "scheduled": 8,
    "published": 26
  },
  "by_priority": {
    "low": 10,
    "medium": 20,
    "high": 12,
    "urgent": 3
  },
  "avg_time_per_stage": {
    "scripting": 86400,
    "filming": 172800,
    "editing": 259200,
    "review": 43200
  },
  "velocity_this_week": 8,
  "velocity_this_month": 26
}
```

---

## Series Endpoints

### 1. Create Series

**POST** `/workspaces/{workspace_id}/series`

Create a new content series.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "name": "AI Tips for Creators",
  "description": "Weekly tips on using AI tools",
  "frequency": "weekly",
  "publish_day": "monday",
  "publish_time": "09:00",
  "color": "#FF5733"
}
```

**Validation**:
- `name`: Min 3 chars, max 100 chars
- `frequency`: daily, weekly, bi_weekly, monthly
- `publish_day`: monday, tuesday, etc. (for weekly)
- `publish_time`: HH:MM format

**Success Response (201 Created)**:
```json
{
  "id": "series_abc123",
  "workspace_id": "workspace_789ghi",
  "name": "AI Tips for Creators",
  "description": "Weekly tips on using AI tools",
  "frequency": "weekly",
  "episode_count": 0,
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 2. List Series

**GET** `/workspaces/{workspace_id}/series`

List all series in workspace.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `status`: active or archived
- `sort`: name, created_at, or episode_count

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "series_abc123",
      "name": "AI Tips for Creators",
      "description": "Weekly tips on using AI tools",
      "episode_count": 8,
      "frequency": "weekly",
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Get Series

**GET** `/workspaces/{workspace_id}/series/{series_id}`

Get series details with episodes.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `include_episodes`: true/false (default: true)

**Success Response (200 OK)**:
```json
{
  "id": "series_abc123",
  "workspace_id": "workspace_789ghi",
  "name": "AI Tips for Creators",
  "description": "Weekly tips on using AI tools",
  "frequency": "weekly",
  "publish_day": "monday",
  "publish_time": "09:00",
  "color": "#FF5733",
  "episode_count": 8,
  "episodes": [
    {
      "id": "episode_1",
      "content_id": "content_111",
      "episode_number": 1,
      "title": "Getting Started with ChatGPT",
      "publish_date": "2026-03-03T09:00:00Z"
    }
  ],
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 4. Update Series

**PATCH** `/workspaces/{workspace_id}/series/{series_id}`

Update series information.

**Auth**: Required (Editor+)

**Request Body** (all optional):
```json
{
  "name": "Updated Series Name",
  "description": "Updated description",
  "frequency": "bi_weekly",
  "color": "#00FF00"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "series_abc123",
  "name": "Updated Series Name",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 5. Add Episode to Series

**POST** `/workspaces/{workspace_id}/series/{series_id}/episodes`

Add content to series as episode.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "content_id": "content_111",
  "episode_number": 1,
  "publish_date": "2026-03-17T09:00:00Z"
}
```

**Success Response (201 Created)**:
```json
{
  "id": "episode_1",
  "series_id": "series_abc123",
  "content_id": "content_111",
  "episode_number": 1,
  "publish_date": "2026-03-17T09:00:00Z"
}
```

---

### 6. List Series Episodes

**GET** `/workspaces/{workspace_id}/series/{series_id}/episodes`

Get all episodes in series.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `sort`: episode_number or publish_date

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "episode_1",
      "episode_number": 1,
      "title": "Getting Started with ChatGPT",
      "content_id": "content_111",
      "status": "published",
      "publish_date": "2026-03-03T09:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 7. Update Episode

**PATCH** `/workspaces/{workspace_id}/series/{series_id}/episodes/{episode_id}`

Update episode information.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "episode_number": 2,
  "publish_date": "2026-03-10T09:00:00Z"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "episode_1",
  "episode_number": 2,
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 8. Remove Episode from Series

**DELETE** `/workspaces/{workspace_id}/series/{series_id}/episodes/{episode_id}`

Remove episode from series.

**Auth**: Required (Editor+)

**Success Response (204 No Content)**:
```
(empty)
```

---

### 9. Reorder Episodes

**POST** `/workspaces/{workspace_id}/series/{series_id}/reorder-episodes`

Reorder episodes in series.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "episode_order": ["episode_3", "episode_1", "episode_2"]
}
```

**Success Response (200 OK)**:
```json
{
  "series_id": "series_abc123",
  "message": "Episodes reordered"
}
```

---

### 10. Archive Series

**POST** `/workspaces/{workspace_id}/series/{series_id}/archive`

Archive a series.

**Auth**: Required (Editor+)

**Request Body**: Empty

**Success Response (200 OK)**:
```json
{
  "id": "series_abc123",
  "status": "archived"
}
```

---

## Publishing & Calendar Endpoints

### 1. Create Publishing Account

**POST** `/workspaces/{workspace_id}/publishing-accounts`

Add a platform account (YouTube, Instagram, etc.).

**Auth**: Required (Admin+)

**Minimum Role**: Admin

**Request Body**:
```json
{
  "platform": "youtube",
  "channel_name": "My Creator Channel",
  "channel_id": "UCxxx...",
  "access_token": "...",
  "refresh_token": "...",
  "metadata": {
    "subscriber_count": 50000
  }
}
```

**Success Response (201 Created)**:
```json
{
  "id": "account_123",
  "workspace_id": "workspace_789ghi",
  "platform": "youtube",
  "channel_name": "My Creator Channel",
  "connected_at": "2026-03-10T14:30:00Z"
}
```

---

### 2. List Publishing Accounts

**GET** `/workspaces/{workspace_id}/publishing-accounts`

List connected platform accounts.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `platform`: Filter by platform
- `status`: active or inactive

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "account_123",
      "platform": "youtube",
      "channel_name": "My Creator Channel",
      "status": "active",
      "connected_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Schedule Content

**POST** `/workspaces/{workspace_id}/publishing/schedule`

Schedule content to publish on platforms.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "content_id": "content_111",
  "platforms": [
    {
      "platform": "youtube",
      "account_id": "account_123",
      "publish_at": "2026-03-15T14:00:00Z",
      "title": "How to Master AI in 2026",
      "description": "Full description here...",
      "tags": ["ai", "tutorial"],
      "thumbnail_url": "https://..."
    },
    {
      "platform": "instagram",
      "account_id": "account_456",
      "publish_at": "2026-03-15T15:00:00Z",
      "caption": "Check out my new video!",
      "hashtags": ["#ai", "#creator"]
    }
  ]
}
```

**Success Response (201 Created)**:
```json
{
  "scheduled_posts": [
    {
      "id": "post_123",
      "content_id": "content_111",
      "platform": "youtube",
      "status": "scheduled",
      "publish_at": "2026-03-15T14:00:00Z"
    }
  ]
}
```

---

### 4. Get Publishing Calendar

**GET** `/workspaces/{workspace_id}/publishing/calendar`

Get scheduled posts in calendar format.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `start_date`: ISO date (default: today)
- `end_date`: ISO date (default: 30 days out)
- `platform`: Filter by platform
- `status`: scheduled, published, failed

**Success Response (200 OK)**:
```json
{
  "events": [
    {
      "id": "post_123",
      "content_id": "content_111",
      "content_title": "How to Master AI in 2026",
      "platform": "youtube",
      "status": "scheduled",
      "publish_at": "2026-03-15T14:00:00Z",
      "channel_name": "My Creator Channel"
    }
  ]
}
```

---

### 5. Get Optimal Publishing Times

**GET** `/workspaces/{workspace_id}/publishing/optimal-times`

Get AI recommendations for best posting times per platform.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `platform`: Filter by platform
- `based_on`: audience_timezone, historical_performance, or both

**Success Response (200 OK)**:
```json
{
  "recommendations": {
    "youtube": {
      "best_hour": 14,
      "best_day": "wednesday",
      "confidence": 0.87,
      "peak_audience_timezone": "America/New_York"
    },
    "instagram": {
      "best_hour": 18,
      "best_day": "tuesday",
      "confidence": 0.82
    }
  }
}
```

---

### 6. Update Scheduled Post

**PATCH** `/workspaces/{workspace_id}/publishing/scheduled/{post_id}`

Update a scheduled post details.

**Auth**: Required (Editor+)

**Request Body** (all optional):
```json
{
  "publish_at": "2026-03-16T14:00:00Z",
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "post_123",
  "publish_at": "2026-03-16T14:00:00Z",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 7. Cancel Scheduled Post

**DELETE** `/workspaces/{workspace_id}/publishing/scheduled/{post_id}`

Cancel a scheduled post.

**Auth**: Required (Editor+)

**Success Response (204 No Content)**:
```
(empty)
```

---

### 8. Bulk Schedule Posts

**POST** `/workspaces/{workspace_id}/publishing/bulk-schedule`

Schedule multiple content pieces at once.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "schedules": [
    {
      "content_id": "content_111",
      "platforms": ["youtube", "instagram"],
      "base_time": "2026-03-15T14:00:00Z",
      "stagger_hours": 1
    }
  ]
}
```

**Success Response (201 Created)**:
```json
{
  "scheduled_posts": [...],
  "total": 4
}
```

---

## AI / Creators Studio Endpoints

### 1. Start AI Chat (SSE Streaming)

**POST** `/workspaces/{workspace_id}/ai/chat`

Start AI chat conversation with SSE streaming.

**Auth**: Required (Editor+, requires AI credits)

**Request Headers**:
```
Accept: text/event-stream
```

**Request Body**:
```json
{
  "conversation_id": "conv_123" | null,
  "message": "Help me create a YouTube video about AI tools",
  "context": {
    "content_id": "content_111",
    "platforms": ["youtube"]
  }
}
```

**Success Response (200 OK)** (SSE stream):
```
event: thinking
data: {"status": "analyzing your request..."}

event: response
data: {"text": "Great topic! Here are some angle ideas:"}

event: response
data: {"text": "\n1. AI Tools Every Creator Needs"}

event: response
data: {"text": "\n2. How AI Can 10x Your Content Production"}

event: done
data: {"conversation_id": "conv_123", "total_tokens": 250}
```

**Streaming events**:
- `thinking`: Model is thinking
- `response`: Chunk of response text
- `done`: Response complete
- `error`: Error occurred

**Error Codes**:
- `401 Unauthorized`: Not authenticated
- `402 Payment Required`: Insufficient AI credits

---

### 2. List AI Conversations

**GET** `/workspaces/{workspace_id}/ai/conversations`

Get chat conversation history.

**Auth**: Required (Editor+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `sort`: created_at or updated_at

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "conv_123",
      "workspace_id": "workspace_789ghi",
      "title": "YouTube Script Ideas",
      "message_count": 12,
      "created_at": "2026-03-10T14:30:00Z",
      "updated_at": "2026-03-10T15:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Get Conversation

**GET** `/workspaces/{workspace_id}/ai/conversations/{conversation_id}`

Get full conversation history.

**Auth**: Required (Editor+)

**Query Parameters**:
- `include_messages`: true/false (default: true)

**Success Response (200 OK)**:
```json
{
  "id": "conv_123",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Help me create a YouTube video about AI tools",
      "created_at": "2026-03-10T14:30:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "Great topic! Here are some angle ideas...",
      "created_at": "2026-03-10T14:30:05Z"
    }
  ]
}
```

---

### 4. Brainstorm Ideas

**POST** `/workspaces/{workspace_id}/ai/brainstorm`

Get AI-generated content ideas.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "topic": "AI tools for creators",
  "count": 10,
  "style": "educational"
}
```

**Success Response (200 OK)**:
```json
{
  "ideas": [
    {
      "title": "AI Tools Every Creator Needs in 2026",
      "angle": "Practical tools overview",
      "hook": "These 5 AI tools have changed my content production...",
      "keywords": ["ai", "tools", "productivity"]
    }
  ],
  "credits_used": 5
}
```

---

### 5. Generate Titles

**POST** `/workspaces/{workspace_id}/ai/titles`

Generate CTR-optimized titles.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "topic": "AI tools for creators",
  "platform": "youtube",
  "count": 5,
  "style": "clickbait|educational|story"
}
```

**Success Response (200 OK)**:
```json
{
  "titles": [
    {
      "title": "I Used AI to Create Content for 30 Days (Here's What Happened)",
      "estimated_ctr": 0.082
    },
    {
      "title": "The #1 AI Tool Every Creator NEEDS",
      "estimated_ctr": 0.075
    }
  ],
  "credits_used": 3
}
```

---

### 6. Generate Descriptions

**POST** `/workspaces/{workspace_id}/ai/descriptions`

Generate platform-optimized descriptions.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "How to Master AI in 2026",
  "content_summary": "Deep dive into AI tools for content creators",
  "platform": "youtube",
  "count": 3
}
```

**Success Response (200 OK)**:
```json
{
  "descriptions": [
    {
      "description": "In this video, I break down the best AI tools...",
      "seo_score": 0.85
    }
  ],
  "credits_used": 2
}
```

---

### 7. Generate Hooks

**POST** `/workspaces/{workspace_id}/ai/hooks`

Generate platform-specific hooks.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "topic": "AI tools for creators",
  "platforms": ["youtube", "instagram", "twitter"],
  "count": 3
}
```

**Success Response (200 OK)**:
```json
{
  "hooks": {
    "youtube": [
      "I spent $10,000 on AI tools so you don't have to..."
    ],
    "instagram": [
      "No more writer's block 👇"
    ],
    "twitter": [
      "Thread: The 5 AI tools that changed my content game 🧵"
    ]
  },
  "credits_used": 4
}
```

---

### 8. Generate Hashtags

**POST** `/workspaces/{workspace_id}/ai/hashtags`

Generate platform-specific hashtags.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "How to Master AI in 2026",
  "description": "A guide to using AI tools",
  "platform": "instagram",
  "count": 20
}
```

**Success Response (200 OK)**:
```json
{
  "hashtags": ["#ai", "#creator", "#contentcreation", "#aitools"],
  "trending": ["#ai", "#contentcreator"],
  "credits_used": 1
}
```

---

### 9. SEO Audit

**POST** `/workspaces/{workspace_id}/ai/seo-audit`

Analyze content for SEO optimization.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "How to Master AI in 2026",
  "description": "Full description here...",
  "content": "Full content text...",
  "platform": "youtube",
  "target_keywords": ["ai", "tutorial"]
}
```

**Success Response (200 OK)**:
```json
{
  "score": 78,
  "issues": [
    {
      "severity": "high",
      "issue": "Description is too short",
      "recommendation": "Aim for 200+ characters"
    }
  ],
  "keyword_density": {
    "ai": 0.05,
    "tutorial": 0.02
  },
  "suggestions": [
    "Add more variations of target keywords"
  ]
}
```

---

### 10. Generate Thumbnail Concepts

**POST** `/workspaces/{workspace_id}/ai/thumbnail-concepts`

Generate AI thumbnail design suggestions.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "How to Master AI in 2026",
  "platform": "youtube",
  "style": "minimal|bold|vibrant",
  "count": 3
}
```

**Success Response (200 OK)**:
```json
{
  "concepts": [
    {
      "concept": "Bold red text 'AI MASTERY' with checkmark graphic",
      "elements": ["text", "icon", "color"],
      "estimated_ctr": 0.082
    }
  ],
  "credits_used": 3
}
```

---

### 11. Analyze Content

**POST** `/workspaces/{workspace_id}/ai/analyze`

Analyze existing content performance and suggestions.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "content_id": "content_111",
  "focus": "engagement|retention|ctr"
}
```

**Success Response (200 OK)**:
```json
{
  "content_id": "content_111",
  "analysis": {
    "retention_score": 0.72,
    "engagement_score": 0.85,
    "ctr_score": 0.78,
    "insights": [
      "Strong hook - keeps viewers for first 30 seconds",
      "Engagement drops at 2:30 - consider adding visual change"
    ]
  }
}
```

---

### 12. Predict Performance

**POST** `/workspaces/{workspace_id}/ai/predict`

Predict content performance before publishing.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "How to Master AI in 2026",
  "description": "Full description",
  "platform": "youtube",
  "similar_content_ids": ["content_111", "content_222"]
}
```

**Success Response (200 OK)**:
```json
{
  "predictions": {
    "estimated_views": 12500,
    "estimated_engagement_rate": 0.085,
    "estimated_ctr": 0.078,
    "confidence": 0.76,
    "factors": [
      "Title uses proven patterns (high CTR)",
      "Topic is trending",
      "Similar content performed well"
    ]
  }
}
```

---

### 13. Get Trending Topics

**GET** `/workspaces/{workspace_id}/ai/trending`

Get trending topics for content ideas.

**Auth**: Required (Editor+)

**Query Parameters**:
- `platform`: Filter by platform (youtube, instagram, twitter)
- `category`: tech, business, lifestyle, entertainment, etc.
- `period`: day, week, month

**Success Response (200 OK)**:
```json
{
  "trending": [
    {
      "topic": "AI tools for content creators",
      "platforms": ["youtube", "instagram", "twitter"],
      "growth": 1.45,
      "search_volume": 85000,
      "estimated_views": 500000
    }
  ]
}
```

---

## Remix Engine Endpoints

### 1. Create Remix Job

**POST** `/workspaces/{workspace_id}/remix`

Create a job to repurpose content into multiple formats.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "source_content_id": "content_111",
  "source_type": "video|transcript|blog",
  "output_types": [
    "short_clip",
    "blog_post",
    "twitter_thread",
    "linkedin_post"
  ],
  "options": {
    "tone": "casual|professional",
    "length": "short|medium|long"
  }
}
```

**Success Response (202 Accepted)**:
```json
{
  "job_id": "remix_job_123",
  "workspace_id": "workspace_789ghi",
  "source_content_id": "content_111",
  "status": "processing",
  "progress": 0,
  "output_types": 4,
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 2. List Remix Jobs

**GET** `/workspaces/{workspace_id}/remix`

Get remix job history.

**Auth**: Required (Editor+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `status`: processing, completed, failed
- `sort`: created_at (default: -created_at)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "job_id": "remix_job_123",
      "source_content_id": "content_111",
      "status": "completed",
      "outputs_count": 4,
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Get Remix Job Status

**GET** `/workspaces/{workspace_id}/remix/{job_id}`

Get status and details of remix job.

**Auth**: Required (Editor+)

**Success Response (200 OK)**:
```json
{
  "job_id": "remix_job_123",
  "status": "completed",
  "progress": 100,
  "source_content_id": "content_111",
  "outputs": [
    {
      "id": "output_1",
      "type": "short_clip",
      "content": "url/to/clip.mp4",
      "duration": 60,
      "created_at": "2026-03-10T14:35:00Z"
    }
  ],
  "created_at": "2026-03-10T14:30:00Z",
  "completed_at": "2026-03-10T14:35:00Z"
}
```

---

### 4. Get Remix Outputs

**GET** `/workspaces/{workspace_id}/remix/{job_id}/outputs`

Get all outputs from a remix job.

**Auth**: Required (Editor+)

**Query Parameters**:
- `type`: Filter by output type

**Success Response (200 OK)**:
```json
{
  "job_id": "remix_job_123",
  "outputs": [
    {
      "id": "output_1",
      "type": "short_clip",
      "title": "Quick AI Tip",
      "content": "...",
      "metadata": {...}
    }
  ]
}
```

---

### 5. Accept Remix Output

**POST** `/workspaces/{workspace_id}/remix/{job_id}/outputs/{output_id}/accept`

Accept remix output and create content from it.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "Quick AI Tip",
  "description": "A short-form version of my longer video"
}
```

**Success Response (201 Created)**:
```json
{
  "content_id": "content_456",
  "output_id": "output_1",
  "message": "Content created from remix output"
}
```

---

### 6. Edit Remix Output

**PATCH** `/workspaces/{workspace_id}/remix/{job_id}/outputs/{output_id}`

Edit remix output before accepting.

**Auth**: Required (Editor+)

**Request Body** (depends on output type):
```json
{
  "content": "Updated content",
  "title": "Updated title"
}
```

**Success Response (200 OK)**:
```json
{
  "id": "output_1",
  "content": "Updated content",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 7. Discard Remix Output

**DELETE** `/workspaces/{workspace_id}/remix/{job_id}/outputs/{output_id}`

Discard a remix output.

**Auth**: Required (Editor+)

**Success Response (204 No Content)**:
```
(empty)
```

---

### 8. Get Transcripts

**GET** `/workspaces/{workspace_id}/contents/{content_id}/transcript`

Get transcript of content (for remix).

**Auth**: Required (Editor+)

**Success Response (200 OK)**:
```json
{
  "content_id": "content_111",
  "transcript": [
    {
      "timestamp": "00:00:00",
      "speaker": "Host",
      "text": "Welcome to the show..."
    }
  ],
  "duration": 3600,
  "language": "en"
}
```

---

## Analytics Endpoints

### 1. Get Analytics Overview

**GET** `/workspaces/{workspace_id}/analytics/overview`

Get high-level analytics dashboard data.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `period`: day, week, month, year (default: month)
- `date`: ISO date (default: today/current period)

**Success Response (200 OK)**:
```json
{
  "workspace_id": "workspace_789ghi",
  "period": "month",
  "metrics": {
    "total_views": 145000,
    "total_engagement": 12300,
    "engagement_rate": 0.085,
    "growth_rate": 0.15,
    "new_followers": 350,
    "total_reach": 500000
  },
  "by_platform": {
    "youtube": {
      "views": 100000,
      "engagement": 8500
    },
    "instagram": {
      "views": 35000,
      "engagement": 2800
    }
  },
  "top_content": [
    {
      "id": "content_111",
      "title": "How to Master AI",
      "platform": "youtube",
      "views": 50000,
      "engagement_rate": 0.12
    }
  ]
}
```

---

### 2. Get Content Performance

**GET** `/workspaces/{workspace_id}/analytics/content`

Get performance metrics for individual content pieces.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `period`: day, week, month, year
- `platform`: Filter by platform
- `sort`: views, engagement_rate, created_at

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "content_id": "content_111",
      "title": "How to Master AI",
      "platform": "youtube",
      "views": 50000,
      "likes": 2500,
      "comments": 450,
      "shares": 350,
      "watch_time": 75000,
      "avg_watch_percentage": 0.78,
      "engagement_rate": 0.12,
      "published_at": "2026-03-01T14:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Get Platform Analytics

**GET** `/workspaces/{workspace_id}/analytics/platforms`

Get aggregated metrics per platform.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `period`: day, week, month, year (default: month)

**Success Response (200 OK)**:
```json
{
  "platforms": {
    "youtube": {
      "total_views": 100000,
      "total_subscribers": 5000,
      "total_engagement": 8500,
      "avg_engagement_rate": 0.085,
      "growth": 0.12,
      "top_video": {
        "id": "content_111",
        "title": "How to Master AI",
        "views": 50000
      }
    },
    "instagram": {
      "total_views": 35000,
      "total_followers": 2500,
      "total_engagement": 2800,
      "avg_engagement_rate": 0.08,
      "growth": 0.08
    }
  }
}
```

---

### 4. Get Audience Analytics

**GET** `/workspaces/{workspace_id}/analytics/audience`

Get audience demographics and insights.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `period`: day, week, month, year (default: month)
- `platform`: Filter by platform

**Success Response (200 OK)**:
```json
{
  "audience": {
    "total_followers": 8500,
    "growth_this_period": 450,
    "demographics": {
      "age_groups": {
        "18-24": 0.25,
        "25-34": 0.35,
        "35-44": 0.25,
        "45+": 0.15
      },
      "gender": {
        "male": 0.55,
        "female": 0.42,
        "other": 0.03
      },
      "top_countries": [
        {"country": "United States", "percentage": 0.45},
        {"country": "United Kingdom", "percentage": 0.15}
      ]
    },
    "top_fans": [
      {
        "user": "top_fan_1",
        "engagement_count": 150
      }
    ]
  }
}
```

---

### 5. Get Best Times to Post

**GET** `/workspaces/{workspace_id}/analytics/best-times`

Get optimal posting times based on historical data.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `platform`: Filter by platform (default: all)

**Success Response (200 OK)**:
```json
{
  "best_times": {
    "youtube": {
      "day": "wednesday",
      "hour": 14,
      "confidence": 0.87,
      "reason": "Historically gets 20% more views"
    },
    "instagram": {
      "day": "tuesday",
      "hour": 18,
      "confidence": 0.82
    }
  }
}
```

---

### 6. Sync Analytics

**POST** `/workspaces/{workspace_id}/analytics/sync`

Manually trigger analytics data sync with platforms.

**Auth**: Required (Admin+)

**Query Parameters**:
- `platform`: Sync specific platform or all

**Success Response (202 Accepted)**:
```json
{
  "job_id": "sync_job_123",
  "status": "processing",
  "message": "Syncing analytics data..."
}
```

---

### 7. Generate Analytics Report

**POST** `/workspaces/{workspace_id}/analytics/report`

Generate PDF/email analytics report.

**Auth**: Required (Viewer+)

**Request Body**:
```json
{
  "period": "month",
  "format": "pdf|email",
  "email": "user@example.com",
  "include_sections": [
    "overview",
    "content_performance",
    "audience",
    "trends"
  ]
}
```

**Success Response (202 Accepted)**:
```json
{
  "report_id": "report_123",
  "status": "generating",
  "format": "pdf",
  "download_url": null
}
```

---

## Consistency & Gamification Endpoints

### 1. Get User Score

**GET** `/workspaces/{workspace_id}/gamification/score`

Get user's gamification score for workspace.

**Auth**: Required (Viewer+)

**Success Response (200 OK)**:
```json
{
  "workspace_id": "workspace_789ghi",
  "user_id": "user_123abc",
  "xp_total": 2500,
  "xp_level": 5,
  "xp_next_level": 3000,
  "xp_to_level_up": 500,
  "consistency_score": 85,
  "streak_count": 7,
  "streak_best": 15,
  "streak_multiplier": 1.5
}
```

---

### 2. Get XP History

**GET** `/workspaces/{workspace_id}/gamification/xp-history`

Get XP transaction history.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `type`: Filter by operation type
- `sort`: created_at (default: -created_at)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "xp_event_1",
      "operation": "content_published",
      "xp_amount": 50,
      "multiplier": 1.5,
      "xp_earned": 75,
      "description": "Published video content",
      "timestamp": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Get Consistency Heatmap

**GET** `/workspaces/{workspace_id}/gamification/heatmap`

Get GitHub-style contribution heatmap for consistency tracking.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `period`: month, quarter, year (default: year)

**Success Response (200 OK)**:
```json
{
  "heatmap": [
    {
      "date": "2026-03-10",
      "contributions": 2,
      "level": "high"
    }
  ],
  "stats": {
    "total_days": 365,
    "active_days": 245,
    "consistency_percentage": 67,
    "current_streak": 7,
    "best_streak": 15
  }
}
```

---

### 4. Get Achievements

**GET** `/workspaces/{workspace_id}/gamification/achievements`

Get user's unlocked and pending achievements.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `status`: unlocked, locked, all (default: all)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "achievement_1",
      "name": "Consistency King",
      "description": "Publish 7 days in a row",
      "icon": "https://cdn.ordo.app/badges/consistency_king.png",
      "status": "unlocked",
      "unlocked_at": "2026-03-08T14:30:00Z",
      "progress": null
    },
    {
      "id": "achievement_2",
      "name": "Content Master",
      "description": "Publish 50 pieces of content",
      "status": "locked",
      "progress": {
        "current": 32,
        "target": 50,
        "percentage": 0.64
      }
    }
  ]
}
```

---

### 5. Get Goals

**GET** `/workspaces/{workspace_id}/gamification/goals`

Get user's goals.

**Auth**: Required (Editor+)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "goal_1",
      "title": "Publish 2x per week",
      "frequency": "weekly",
      "target": 2,
      "current": 1,
      "status": "in_progress",
      "deadline": "2026-03-16",
      "progress_percentage": 0.5
    }
  ]
}
```

---

### 6. Create Goal

**POST** `/workspaces/{workspace_id}/gamification/goals`

Create a new goal.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "title": "Publish 2x per week",
  "frequency": "weekly|monthly|yearly",
  "target": 2,
  "deadline": "2026-03-30"
}
```

**Success Response (201 Created)**:
```json
{
  "id": "goal_1",
  "title": "Publish 2x per week",
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 7. Get Leaderboard

**GET** `/workspaces/{workspace_id}/gamification/leaderboard`

Get workspace leaderboard (top creators).

**Auth**: Required (Viewer+)

**Query Parameters**:
- `metric`: xp_level, consistency_score, content_published (default: xp_level)
- `limit`: Top N users (default: 10)
- `period`: all_time, this_month (default: all_time)

**Success Response (200 OK)**:
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "user_456def",
      "name": "Jane Smith",
      "avatar_url": "...",
      "metric": "xp_level",
      "value": 8,
      "score": 5500
    }
  ]
}
```

---

## Sponsorships CRM Endpoints

### 1. Create Sponsor

**POST** `/workspaces/{workspace_id}/sponsorships/sponsors`

Add a sponsor brand.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "name": "TechFlow",
  "email": "sponsor@techflow.com",
  "contact_person": "John Manager",
  "phone": "+1-555-0123",
  "notes": "Potential sponsor for Q2"
}
```

**Success Response (201 Created)**:
```json
{
  "id": "sponsor_123",
  "workspace_id": "workspace_789ghi",
  "name": "TechFlow",
  "email": "sponsor@techflow.com",
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 2. List Sponsors

**GET** `/workspaces/{workspace_id}/sponsorships/sponsors`

List all sponsors in workspace.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `search`: Search by name or email
- `status`: all, active, inactive

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "sponsor_123",
      "name": "TechFlow",
      "email": "sponsor@techflow.com",
      "contact_person": "John Manager",
      "deal_count": 3,
      "total_value": 15000,
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 3. Create Deal

**POST** `/workspaces/{workspace_id}/sponsorships/deals`

Create sponsorship deal.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "sponsor_id": "sponsor_123",
  "title": "Product Integration - Q2 2026",
  "status": "lead",
  "value": 5000,
  "deliverables": [
    "1 sponsored video",
    "3 social media posts"
  ],
  "deadline": "2026-04-30",
  "notes": "Discussed at conference"
}
```

**Success Response (201 Created)**:
```json
{
  "id": "deal_456",
  "sponsor_id": "sponsor_123",
  "title": "Product Integration - Q2 2026",
  "status": "lead",
  "value": 5000,
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 4. List Deals

**GET** `/workspaces/{workspace_id}/sponsorships/deals`

List all sponsorship deals.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)
- `status`: lead, negotiation, signed, in_progress, delivered, paid, cancelled
- `sponsor_id`: Filter by sponsor

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "deal_456",
      "sponsor": {
        "id": "sponsor_123",
        "name": "TechFlow"
      },
      "title": "Product Integration - Q2 2026",
      "status": "negotiation",
      "value": 5000,
      "deadline": "2026-04-30",
      "progress": 0.5
    }
  ],
  "pagination": {...}
}
```

---

### 5. Update Deal Status

**PATCH** `/workspaces/{workspace_id}/sponsorships/deals/{deal_id}/status`

Change deal status through pipeline.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "new_status": "signed",
  "notes": "Contract signed on March 10"
}
```

**Valid transitions**:
- lead → negotiation
- negotiation → signed or cancelled
- signed → in_progress
- in_progress → delivered
- delivered → paid

**Success Response (200 OK)**:
```json
{
  "id": "deal_456",
  "status": "signed",
  "updated_at": "2026-03-10T15:00:00Z"
}
```

---

### 6. Log Activity

**POST** `/workspaces/{workspace_id}/sponsorships/deals/{deal_id}/activities`

Log activity on deal (call, email, meeting).

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "type": "call|email|meeting|note",
  "title": "Initial discovery call",
  "notes": "Discussed deliverables and timeline",
  "date": "2026-03-10T10:00:00Z"
}
```

**Success Response (201 Created)**:
```json
{
  "id": "activity_123",
  "deal_id": "deal_456",
  "type": "call",
  "title": "Initial discovery call",
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

## Templates Endpoints

### 1. List Templates

**GET** `/workspaces/{workspace_id}/templates`

List content templates for workspace.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `type`: Filter by template type (video, post, script, checklist)
- `category`: Filter by category
- `page`: Page number

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "template_123",
      "name": "YouTube Script Template",
      "type": "script",
      "category": "video",
      "content": "# YouTube Script Format\n\n## Hook (0-10 seconds)\n...",
      "created_at": "2026-03-10T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 2. Create Template

**POST** `/workspaces/{workspace_id}/templates`

Create new template from existing content.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "name": "YouTube Script Template",
  "type": "script",
  "category": "video",
  "content": "Template content...",
  "is_public": false
}
```

**Success Response (201 Created)**:
```json
{
  "id": "template_123",
  "name": "YouTube Script Template",
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

### 3. Get Template

**GET** `/workspaces/{workspace_id}/templates/{template_id}`

Get template details.

**Auth**: Required (Viewer+)

**Success Response (200 OK)**:
```json
{
  "id": "template_123",
  "name": "YouTube Script Template",
  "type": "script",
  "content": "Full template content...",
  "created_by": "user_123abc"
}
```

---

### 4. Use Template

**POST** `/workspaces/{workspace_id}/contents/from-template`

Create content using template.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "template_id": "template_123",
  "title": "My First YouTube Video",
  "variables": {
    "topic": "AI Tools",
    "duration": "1200"
  }
}
```

**Success Response (201 Created)**:
```json
{
  "content_id": "content_789",
  "title": "My First YouTube Video",
  "content": "Populated template content..."
}
```

---

## File Upload Endpoints

### 1. Get Presigned Upload URL

**POST** `/workspaces/{workspace_id}/files/presigned`

Get S3 presigned URL for file upload.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "filename": "thumbnail.jpg",
  "file_type": "image/jpeg",
  "file_size": 254000,
  "purpose": "thumbnail|script|media|asset"
}
```

**Success Response (200 OK)**:
```json
{
  "upload_id": "upload_123",
  "url": "https://s3.amazonaws.com/ordo-uploads/...",
  "fields": {
    "key": "uploads/workspace_789ghi/thumbnail.jpg",
    "AWSAccessKeyId": "...",
    "policy": "...",
    "signature": "..."
  },
  "expires_in": 3600
}
```

---

### 2. Confirm File Upload

**POST** `/workspaces/{workspace_id}/files/confirm`

Mark file as uploaded and receive final URL.

**Auth**: Required (Editor+)

**Request Body**:
```json
{
  "upload_id": "upload_123",
  "file_key": "uploads/workspace_789ghi/thumbnail.jpg"
}
```

**Success Response (200 OK)**:
```json
{
  "file_id": "file_123",
  "url": "https://cdn.ordo.app/uploads/workspace_789ghi/thumbnail.jpg",
  "size": 254000,
  "mime_type": "image/jpeg",
  "created_at": "2026-03-10T14:30:00Z"
}
```

---

## Billing Endpoints

### 1. Get Subscription

**GET** `/workspaces/{workspace_id}/billing/subscription`

Get current subscription details.

**Auth**: Required (Owner)

**Minimum Role**: Owner

**Success Response (200 OK)**:
```json
{
  "workspace_id": "workspace_789ghi",
  "tier": "pro",
  "billing_interval": "monthly",
  "price": 1200,
  "status": "active",
  "current_period_start": "2026-03-01T00:00:00Z",
  "current_period_end": "2026-04-01T00:00:00Z",
  "next_billing_date": "2026-04-01T00:00:00Z",
  "auto_renew": true,
  "stripe_subscription_id": "sub_xxx",
  "features": {
    "ai_credits_monthly": 1000,
    "storage_gb": 100,
    "team_members": 5
  }
}
```

---

### 2. Update Subscription

**PATCH** `/workspaces/{workspace_id}/billing/subscription`

Change subscription tier or billing interval.

**Auth**: Required (Owner)

**Request Body**:
```json
{
  "tier": "enterprise",
  "billing_interval": "yearly"
}
```

**Success Response (200 OK)**:
```json
{
  "tier": "enterprise",
  "new_price": 29000,
  "prorated_credit": 1200,
  "next_billing_date": "2026-04-01T00:00:00Z"
}
```

---

### 3. List Invoices

**GET** `/workspaces/{workspace_id}/billing/invoices`

Get billing invoices.

**Auth**: Required (Owner)

**Query Parameters**:
- `page`: Page number (default: 1)
- `status`: draft, open, paid, void, uncollectible

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "invoice_123",
      "number": "INV-2026-001",
      "date": "2026-03-01",
      "amount": 1200,
      "status": "paid",
      "pdf_url": "https://invoices.stripe.com/...",
      "due_date": "2026-03-15"
    }
  ],
  "pagination": {...}
}
```

---

### 4. Get Billing Portal URL

**POST** `/workspaces/{workspace_id}/billing/portal`

Get Stripe billing portal URL for payment method management.

**Auth**: Required (Owner)

**Request Body**:
```json
{
  "return_url": "https://app.ordo.app/settings/billing"
}
```

**Success Response (200 OK)**:
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

---

### 5. Handle Stripe Webhook

**POST** `/webhooks/stripe`

Stripe webhook endpoint for subscription events.

**Auth**: Webhook signature verification

**Webhook events**:
- `customer.subscription.updated`: Subscription changed
- `customer.subscription.deleted`: Subscription cancelled
- `invoice.payment_succeeded`: Payment successful
- `invoice.payment_failed`: Payment failed

**Success Response (200 OK)**:
```json
{
  "received": true
}
```

---

## WebSocket Events

### Connection

**WebSocket URL**:
```
wss://api.ordo.app/v1/ws?token={access_token}&workspace_id={workspace_id}
```

**Auth**: JWT token in query string or header

**Connection response**:
```json
{
  "type": "connection",
  "status": "connected",
  "user_id": "user_123abc",
  "workspace_id": "workspace_789ghi"
}
```

---

### Server → Client Events

#### Content Updated
```json
{
  "type": "content:updated",
  "data": {
    "content_id": "content_111",
    "field": "status",
    "old_value": "scripting",
    "new_value": "filming",
    "updated_by": "user_456def",
    "updated_at": "2026-03-10T15:00:00Z"
  }
}
```

#### Content Status Changed
```json
{
  "type": "content:status_changed",
  "data": {
    "content_id": "content_111",
    "old_status": "scripting",
    "new_status": "filming",
    "changed_by": "user_456def",
    "timestamp": "2026-03-10T15:00:00Z"
  }
}
```

#### Member Joined
```json
{
  "type": "workspace:member_joined",
  "data": {
    "user_id": "user_789ghi",
    "name": "New Member",
    "role": "editor",
    "joined_at": "2026-03-10T15:00:00Z"
  }
}
```

#### Member Role Changed
```json
{
  "type": "workspace:member_role_changed",
  "data": {
    "user_id": "user_456def",
    "old_role": "editor",
    "new_role": "admin",
    "changed_by": "user_123abc"
  }
}
```

#### AI Response Streaming
```json
{
  "type": "ai:response",
  "data": {
    "conversation_id": "conv_123",
    "chunk": "Great topic! Here are",
    "timestamp": "2026-03-10T15:00:00Z"
  }
}
```

#### Notification
```json
{
  "type": "notification:created",
  "data": {
    "notification_id": "notif_123",
    "type": "achievement",
    "title": "Consistency King",
    "message": "7 day streak!",
    "data": {...}
  }
}
```

#### Analytics Updated
```json
{
  "type": "analytics:updated",
  "data": {
    "metric": "views",
    "platform": "youtube",
    "new_total": 145000,
    "change": 5000,
    "timestamp": "2026-03-10T15:00:00Z"
  }
}
```

#### Remix Job Complete
```json
{
  "type": "remix:completed",
  "data": {
    "job_id": "remix_job_123",
    "outputs_count": 4,
    "completed_at": "2026-03-10T15:00:00Z"
  }
}
```

#### Real-time Collaboration
```json
{
  "type": "collaboration:typing",
  "data": {
    "user_id": "user_456def",
    "user_name": "Jane Smith",
    "content_id": "content_111",
    "field": "script",
    "timestamp": "2026-03-10T15:00:00Z"
  }
}
```

---

### Client → Server Events

#### Subscribe to Content Updates
```json
{
  "type": "subscribe",
  "channel": "content:content_111"
}
```

#### Subscribe to Workspace Events
```json
{
  "type": "subscribe",
  "channel": "workspace:workspace_789ghi"
}
```

#### Keep-Alive Ping
```json
{
  "type": "ping",
  "timestamp": "2026-03-10T15:00:00Z"
}
```

**Response (pong)**:
```json
{
  "type": "pong",
  "timestamp": "2026-03-10T15:00:01Z"
}
```

#### Send Chat Message
```json
{
  "type": "message",
  "data": {
    "conversation_id": "conv_123",
    "content": "What hooks work best?"
  }
}
```

---

## Global Search Endpoints

### 1. Search All Content

**GET** `/workspaces/{workspace_id}/search`

Global search across all workspace content.

**Auth**: Required (Viewer+)

**Query Parameters**:
- `q` (required): Search query
- `type`: Filter by type (ideas, content, series, sponsors, templates)
- `limit`: Items per page (default: 10, max: 50)
- `offset`: Pagination offset

**Success Response (200 OK)**:
```json
{
  "query": "AI tools",
  "results": {
    "ideas": [
      {
        "id": "idea_111",
        "title": "AI-Powered Content Generator",
        "description": "...",
        "type": "idea",
        "created_at": "2026-03-10T14:30:00Z"
      }
    ],
    "content": [
      {
        "id": "content_111",
        "title": "How to Master AI in 2026",
        "type": "content",
        "status": "published",
        "created_at": "2026-03-10T14:30:00Z"
      }
    ],
    "series": [...],
    "sponsors": [...]
  },
  "total_count": 45
}
```

---

### 2. Search by Type

**GET** `/workspaces/{workspace_id}/search/{type}`

Search within specific content type.

**Auth**: Required (Viewer+)

**Path Parameters**:
- `type`: ideas, content, series, sponsors, templates

**Query Parameters**:
- `q`: Search query
- `page`: Page number
- `limit`: Items per page

**Success Response (200 OK)**:
```json
{
  "type": "content",
  "query": "AI",
  "results": [
    {
      "id": "content_111",
      "title": "How to Master AI in 2026",
      "platform": "youtube",
      "status": "published"
    }
  ],
  "pagination": {...}
}
```

---

## Rate Limiting & Quotas

### Endpoint Rate Limits

| Endpoint Group | Free | Pro | Enterprise |
|---|---|---|---|
| Auth | 5 req/min | 10 req/min | Unlimited |
| Content CRUD | 30 req/min | 100 req/min | Unlimited |
| AI Endpoints | 10 req/hour | 100 req/hour | Unlimited |
| Analytics | 20 req/min | 100 req/min | Unlimited |
| Upload | 5 files/day | 100 files/day | Unlimited |

### AI Credit System

| Operation | Free Tier | Pro Tier |
|---|---|---|
| Chat message | 1 credit | 1 credit |
| Brainstorm (10 ideas) | 5 credits | 5 credits |
| Transform idea | 10 credits | 10 credits |
| Generate titles (5) | 3 credits | 3 credits |
| Remix job | 20 credits | 20 credits |

**Free tier**: 50 credits/month
**Pro tier**: 500 credits/month
**Enterprise**: Unlimited

---

## API Security

### CORS Headers
```
Access-Control-Allow-Origin: https://app.ordo.app
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### HTTPS & TLS
- All endpoints require HTTPS
- TLS 1.3 minimum
- Certificate pinning on mobile clients

### Request ID Tracking
- `X-Request-ID` header included in all responses
- Used for debugging and support

### API Key Rotation
- Refresh tokens rotate on each use
- Old tokens invalidated immediately

---

## Error Handling Best Practices

1. **Always include `request_id` in error logs** for debugging
2. **Implement exponential backoff** for 429 (rate limit) responses
3. **Retry idempotent requests** (GET, PUT with idempotency key) on 5xx errors
4. **Display user-friendly messages** from `error.message` field
5. **Log detailed errors** from `error.details` array for debugging

---

## Changelog

### v1.0.0 (2026-03-10)
- Initial API release
- All 19 endpoint groups documented
- WebSocket support for real-time updates
- AI credit system implemented
- Rate limiting per tier

---

*Generated for Ordo Creator OS — Your operating system for content creation.*
