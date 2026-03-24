import type { OrdoApiClient } from '../client';
import type {
  PlatformMetrics,
  ConsistencyScore,
  HeatmapDay,
  PipelineVelocity,
  WeeklyReport,
  MonthlyReport,
  AnalyticsGoal,
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

    getPlatformMetrics(workspaceId: string, period: string): Promise<PlatformMetrics[]> {
      return client.get<PlatformMetrics[]>(
        `/api/v1/workspaces/${workspaceId}/analytics/overview?period=${encodeURIComponent(period)}`,
      );
    },

    getConsistencyScore(workspaceId: string): Promise<ConsistencyScore> {
      return client.get<ConsistencyScore>(
        `/api/v1/workspaces/${workspaceId}/analytics/consistency`,
      );
    },

    getHeatmap(workspaceId: string, year: number): Promise<HeatmapDay[]> {
      return client.get<HeatmapDay[]>(
        `/api/v1/workspaces/${workspaceId}/analytics/heatmap?year=${year}`,
      );
    },

    getPipelineVelocity(workspaceId: string): Promise<PipelineVelocity[]> {
      return client.get<PipelineVelocity[]>(
        `/api/v1/workspaces/${workspaceId}/analytics/velocity`,
      );
    },

    getWeeklyReport(workspaceId: string): Promise<WeeklyReport> {
      return client.get<WeeklyReport>(
        `/api/v1/workspaces/${workspaceId}/analytics/reports/weekly`,
      );
    },

    getMonthlyReport(workspaceId: string): Promise<MonthlyReport> {
      return client.get<MonthlyReport>(
        `/api/v1/workspaces/${workspaceId}/analytics/reports/monthly`,
      );
    },

    listGoals(workspaceId: string): Promise<AnalyticsGoal[]> {
      return client.get<AnalyticsGoal[]>(
        `/api/v1/workspaces/${workspaceId}/analytics/goals`,
      );
    },

    createGoal(
      workspaceId: string,
      body: Omit<AnalyticsGoal, 'id' | 'workspaceId' | 'currentValue' | 'status' | 'createdAt'>,
    ): Promise<AnalyticsGoal> {
      return client.post<AnalyticsGoal>(
        `/api/v1/workspaces/${workspaceId}/analytics/goals`,
        body,
      );
    },

    updateGoal(
      workspaceId: string,
      goalId: string,
      body: Partial<Pick<AnalyticsGoal, 'title' | 'targetValue' | 'deadline' | 'status'>>,
    ): Promise<AnalyticsGoal> {
      return client.patch<AnalyticsGoal>(
        `/api/v1/workspaces/${workspaceId}/analytics/goals/${goalId}`,
        body,
      );
    },

    deleteGoal(workspaceId: string, goalId: string): Promise<void> {
      return client.delete<void>(
        `/api/v1/workspaces/${workspaceId}/analytics/goals/${goalId}`,
      );
    },

    triggerSync(workspaceId: string): Promise<void> {
      return client.post<void>(
        `/api/v1/workspaces/${workspaceId}/analytics/sync`,
      );
    },
  };
}
