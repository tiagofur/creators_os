import type { OrdoApiClient } from '../client';
import type { Achievement, GamificationProfile } from '@ordo/types';

export function createGamificationResource(client: OrdoApiClient) {
  return {
    getProfile(userId: string): Promise<GamificationProfile> {
      return client.get<GamificationProfile>(`/v1/users/${userId}/gamification`);
    },

    getAchievements(userId: string): Promise<Achievement[]> {
      return client.get<Achievement[]>(`/v1/users/${userId}/achievements`);
    },
  };
}
