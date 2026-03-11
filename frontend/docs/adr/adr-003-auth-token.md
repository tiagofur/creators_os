# ADR-003: JWT + Refresh Token Authentication Strategy

## Status

Accepted

## Context

Creators OS authenticates users against a backend API that issues JWTs. The frontend needs to store and manage two tokens:

1. **Access token** — short-lived JWT (minutes) sent as a `Bearer` token on every API request.
2. **Refresh token** — long-lived token (30 days) used to obtain new access tokens when they expire.

The key design question is where to store each token and how to handle token refresh transparently.

### Storage options considered

| Option | XSS risk | CSRF risk | Server-accessible |
|--------|----------|-----------|-------------------|
| `localStorage` | High — JS can read it | None | No |
| `httpOnly` cookie | None — JS cannot read it | Moderate — mitigated with `SameSite` | Yes |
| In-memory (JS variable) | Moderate — only during session | None | No |

## Decision

Use a **hybrid approach**:

- **Access token** — stored in **memory only** (Zustand `useAuthStore.accessToken`). Never written to `localStorage`, `sessionStorage`, or cookies. Lost on page refresh by design.
- **Refresh token** — stored in an **httpOnly, Secure, SameSite=Lax cookie** set by the Next.js API route. JavaScript cannot read it.

### Token refresh flow

1. On app load (or after a page refresh), the access token is `null`.
2. The auth provider calls `POST /api/auth/refresh` (a Next.js server-side API route).
3. The API route reads the `refresh_token` from the httpOnly cookie and forwards it to the backend (`POST /v1/auth/refresh`).
4. If successful, the backend returns a new access token (and optionally a rotated refresh token). The API route:
   - Returns the new `access_token` in the JSON response body.
   - Sets the rotated `refresh_token` as a new httpOnly cookie (if the backend issued one).
5. The client stores the access token in memory (`useAuthStore.setAccessToken()`).
6. If any subsequent API request receives a 401, the `@ordo/api-client` fetch wrapper automatically attempts a single refresh before calling `onUnauthorized()`.
7. Concurrent 401 responses are coalesced — only one refresh request is in-flight at a time to avoid race conditions.

### Logout

`POST /api/auth/logout` clears the httpOnly cookie server-side and the client calls `useAuthStore.logout()` to clear the in-memory token.

## Consequences

**Positive:**
- The refresh token is never accessible to JavaScript, eliminating the most common XSS token-theft vector.
- The access token is never persisted to disk, reducing exposure from browser extensions or shared machines.
- `SameSite=Lax` on the cookie provides baseline CSRF protection.
- Token refresh is transparent to the rest of the application — the API client handles it automatically.
- Refresh token rotation (when supported by the backend) limits the window of a compromised refresh token.

**Negative:**
- Every page refresh requires a refresh-token round trip before the user can make authenticated API calls. This adds a brief loading state on initial page load.
- The Next.js API route (`/api/auth/refresh`) acts as a proxy, adding one extra hop. This is a deliberate trade-off for security — the alternative (exposing the refresh token to client JS) is worse.
- If the user's browser blocks cookies (rare for first-party, same-site cookies), authentication will not work.
