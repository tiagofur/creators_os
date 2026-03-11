import type { UUID, Timestamp } from './common';

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface User {
  id: UUID;
  email: string;
  name: string;
  avatar_url: string | null;
  tier: UserTier;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserProfile {
  id: UUID;
  user_id: UUID;
  bio: string | null;
  location: string | null;
  website: string | null;
  social_links: Record<string, string>;
  timezone: string;
  language: string;
  onboarding_completed: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
