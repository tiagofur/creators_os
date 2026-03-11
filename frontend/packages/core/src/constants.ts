export const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000';
export const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:8000';

export const PAGINATION_DEFAULTS = {
  page: 1,
  per_page: 20,
  max_per_page: 100,
} as const;

export const TIER_LIMITS = {
  free: {
    ideas: 50,
    workspaces: 1,
    team_members: 1,
    ai_requests_per_month: 10,
  },
  pro: {
    ideas: 500,
    workspaces: 5,
    team_members: 5,
    ai_requests_per_month: 100,
  },
  enterprise: {
    ideas: Infinity,
    workspaces: Infinity,
    team_members: Infinity,
    ai_requests_per_month: Infinity,
  },
} as const;

export const IDEA_STAGE_ORDER = [
  'raw',
  'refined',
  'scripted',
  'recorded',
  'published',
] as const;

export const PIPELINE_STAGE_ORDER = [
  'idea',
  'scripting',
  'recording',
  'editing',
  'review',
  'publishing',
] as const;

export const SUPPORTED_PLATFORMS = [
  'youtube',
  'tiktok',
  'instagram',
  'twitter',
  'linkedin',
  'blog',
  'podcast',
  'newsletter',
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];
