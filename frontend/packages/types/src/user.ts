import type { UUID, Timestamp } from './common';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/** @deprecated Use SubscriptionTier instead */
export type UserTier = SubscriptionTier;

export interface User {
  id: UUID;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_email_verified: boolean;
  oauth_provider?: string | null;
  oauth_provider_id?: string | null;
  subscription_tier: SubscriptionTier;
  ai_credits_balance: number;
  stripe_customer_id?: string | null;
  current_streak: number;
  longest_streak: number;
  last_active_at?: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;

  // Legacy aliases kept for backward compatibility
  /** @deprecated Use full_name instead */
  name?: string;
  /** @deprecated Use subscription_tier instead */
  tier?: SubscriptionTier;
}

export interface UserSession {
  id: UUID;
  user_id: UUID;
  user_agent?: string | null;
  ip_address?: string | null;
  expires_at: Timestamp;
  revoked_at?: Timestamp | null;
  created_at: Timestamp;
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
