/**
 * Per-resource React Query caching configurations.
 *
 * staleTime — how long data is considered fresh (no background refetch).
 * gcTime   — how long inactive data stays in the garbage-collection cache.
 */

// ---------------------------------------------------------------------------
// High-frequency data (short staleTime)
// ---------------------------------------------------------------------------

/** Notifications — always refetch, keep in cache briefly. */
export const NOTIFICATIONS_CACHE = {
  staleTime: 0,
  gcTime: 30 * 1000, // 30 s
} as const;

/** XP / gamification — near-real-time but can tolerate a few seconds. */
export const GAMIFICATION_CACHE = {
  staleTime: 10 * 1000, // 10 s
  gcTime: 60 * 1000, // 60 s
} as const;

// ---------------------------------------------------------------------------
// Medium-frequency data
// ---------------------------------------------------------------------------

/** Ideas list & detail. */
export const IDEAS_CACHE = {
  staleTime: 30 * 1000, // 30 s
  gcTime: 5 * 60 * 1000, // 5 min
} as const;

/** Content items & pipeline. */
export const CONTENT_CACHE = {
  staleTime: 30 * 1000, // 30 s
  gcTime: 5 * 60 * 1000, // 5 min
} as const;

/** Analytics dashboards & reports. */
export const ANALYTICS_CACHE = {
  staleTime: 60 * 1000, // 60 s
  gcTime: 10 * 60 * 1000, // 10 min
} as const;

/** Series / content series. */
export const SERIES_CACHE = {
  staleTime: 30 * 1000, // 30 s
  gcTime: 5 * 60 * 1000, // 5 min
} as const;

/** Publishing / scheduled content. */
export const PUBLISHING_CACHE = {
  staleTime: 30 * 1000, // 30 s
  gcTime: 5 * 60 * 1000, // 5 min
} as const;

/** Sponsorship deals & brands. */
export const SPONSORSHIPS_CACHE = {
  staleTime: 60 * 1000, // 60 s
  gcTime: 10 * 60 * 1000, // 10 min
} as const;

/** AI credits. */
export const AI_CREDITS_CACHE = {
  staleTime: 60 * 1000, // 60 s
  gcTime: 5 * 60 * 1000, // 5 min
} as const;

// ---------------------------------------------------------------------------
// Slow-changing data (long staleTime)
// ---------------------------------------------------------------------------

/** User profile & auth-related data. */
export const USER_PROFILE_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 min
  gcTime: 30 * 60 * 1000, // 30 min
} as const;

/** Workspace settings & team. */
export const WORKSPACE_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 min
  gcTime: 30 * 60 * 1000, // 30 min
} as const;

/** Billing / subscription. */
export const BILLING_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 min
  gcTime: 30 * 60 * 1000, // 30 min
} as const;

/** Notification preferences (user settings — rarely change). */
export const NOTIFICATION_PREFS_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 min
  gcTime: 30 * 60 * 1000, // 30 min
} as const;

/** Platform credentials (workspace settings — rarely change). */
export const PLATFORM_CREDENTIALS_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 min
  gcTime: 30 * 60 * 1000, // 30 min
} as const;
