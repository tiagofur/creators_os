import type { OrdoApiClient } from '../client';
import type { Achievement, GamificationProfile } from '@ordo/types';

export function createGamificationResource(client: OrdoApiClient) {
  return {
    getLeaderboard(workspaceId: string): Promise<GamificationProfile[]> {
      return client.get<GamificationProfile[]>(`/api/v1/workspaces/${workspaceId}/gamification/leaderboard`);
    },

    getMyStats(workspaceId: string): Promise<GamificationProfile> {
      return client.get<GamificationProfile>(`/api/v1/workspaces/${workspaceId}/gamification/my-stats`);
    },

    getAchievements(workspaceId: string): Promise<Achievement[]> {
      return client.get<Achievement[]>(`/api/v1/workspaces/${workspaceId}/gamification/achievements`);
    },
  };
}
