import type { User, UserProfile, AuthTokens } from '@ordo/types';

export const mockAuthTokens: AuthTokens = {
  access_token: 'mock-jwt-access-token-abc123',
  token_type: 'Bearer',
  expires_in: 3600,
};

export const mockUser: User = {
  id: 'usr_01HQXYZ123456789',
  email: 'creator@example.com',
  name: 'Alex Rivera',
  avatar_url: 'https://i.pravatar.cc/150?u=alex',
  tier: 'pro',
  created_at: '2024-06-15T10:30:00.000Z',
  updated_at: '2025-01-10T14:22:00.000Z',
};

export const mockUserProfile: UserProfile = {
  id: 'prof_01HQXYZ123456789',
  user_id: mockUser.id,
  bio: 'Tech content creator and educator',
  location: 'San Francisco, CA',
  website: 'https://alexrivera.dev',
  social_links: {
    youtube: 'https://youtube.com/@alexrivera',
    twitter: 'https://twitter.com/alexrivera',
    github: 'https://github.com/alexrivera',
  },
  timezone: 'America/Los_Angeles',
  language: 'en',
  onboarding_completed: true,
  created_at: '2024-06-15T10:30:00.000Z',
  updated_at: '2025-01-10T14:22:00.000Z',
};
