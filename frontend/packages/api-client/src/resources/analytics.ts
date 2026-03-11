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
    getPlatformMetrics(workspaceId: string, period: string): Promise<PlatformMetrics[]> {
      return client.get<PlatformMetrics[]>(
        `/v1/workspaces/${workspaceId}/analytics/platforms?period=${period}`,
      );
    },

    getConsistencyScore(workspaceId: string): Promise<ConsistencyScore> {
      return client.get<ConsistencyScore>(
        `/v1/workspaces/${workspaceId}/analytics/consistency`,
      );
    },

    getHeatmap(workspaceId: string, year: number): Promise<HeatmapDay[]> {
      return client.get<HeatmapDay[]>(
        `/v1/workspaces/${workspaceId}/analytics/heatmap?year=${year}`,
      );
    },

    getPipelineVelocity(workspaceId: string): Promise<PipelineVelocity[]> {
      return client.get<PipelineVelocity[]>(
        `/v1/workspaces/${workspaceId}/analytics/velocity`,
      );
    },

    getWeeklyReport(workspaceId: string): Promise<WeeklyReport> {
      return client.get<WeeklyReport>(
        `/v1/workspaces/${workspaceId}/analytics/report/weekly`,
      );
    },

    getMonthlyReport(workspaceId: string): Promise<MonthlyReport> {
      return client.get<MonthlyReport>(
        `/v1/workspaces/${workspaceId}/analytics/report/monthly`,
      );
    },

    listGoals(workspaceId: string): Promise<AnalyticsGoal[]> {
      return client.get<AnalyticsGoal[]>(
        `/v1/workspaces/${workspaceId}/analytics/goals`,
      );
    },

    createGoal(workspaceId: string, body: Omit<AnalyticsGoal, 'id' | 'workspaceId' | 'currentValue' | 'status' | 'createdAt'>): Promise<AnalyticsGoal> {
      return client.post<AnalyticsGoal>(
        `/v1/workspaces/${workspaceId}/analytics/goals`,
        body,
      );
    },

    updateGoal(workspaceId: string, goalId: string, body: Partial<AnalyticsGoal>): Promise<AnalyticsGoal> {
      return client.patch<AnalyticsGoal>(
        `/v1/workspaces/${workspaceId}/analytics/goals/${goalId}`,
        body,
      );
    },

    deleteGoal(workspaceId: string, goalId: string): Promise<void> {
      return client.delete<void>(
        `/v1/workspaces/${workspaceId}/analytics/goals/${goalId}`,
      );
    },
  };
}
