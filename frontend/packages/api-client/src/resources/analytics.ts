import type { OrdoApiClient } from '../client';
import type {
  PlatformMetrics,
  ConsistencyScore,
} from '@ordo/types';

export function createAnalyticsResource(client: OrdoApiClient) {
  return {
    getOverview(workspaceId: string): Promise<PlatformMetrics[]> {
      return client.get<PlatformMetrics[]>(
        `/api/v1/workspaces/${workspaceId}/analytics/overview`,
      );
    },

    getContentAnalytics(workspaceId: string, contentId: string): Promise<ConsistencyScore> {
      return client.get<ConsistencyScore>(
        `/api/v1/workspaces/${workspaceId}/analytics/content/${contentId}`,
      );
    },

    getPlatformAnalytics(workspaceId: string, platform: string): Promise<PlatformMetrics> {
      return client.get<PlatformMetrics>(
        `/api/v1/workspaces/${workspaceId}/analytics/platform/${platform}`,
      );
    },

    getConsistencyScore(workspaceId: string): Promise<ConsistencyScore> {
      return client.get<ConsistencyScore>(
        `/api/v1/workspaces/${workspaceId}/analytics/consistency`,
      );
    },

    triggerSync(workspaceId: string): Promise<void> {
      return client.post<void>(
        `/api/v1/workspaces/${workspaceId}/analytics/sync`,
      );
    },
  };
}
