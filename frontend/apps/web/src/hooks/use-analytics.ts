'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { ANALYTICS_CACHE } from '@/lib/query-config';
import { createAnalyticsResource } from '@ordo/api-client';
import type { AnalyticsGoal } from '@ordo/types';

const analyticsApi = createAnalyticsResource(apiClient);

export function usePlatformMetrics(workspaceId: string, period: string) {
  return useQuery({
    queryKey: queryKeys.analytics.platforms(workspaceId, period),
    queryFn: () => analyticsApi.getPlatformMetrics(workspaceId, period),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function useConsistencyScore(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.consistency(workspaceId),
    queryFn: () => analyticsApi.getConsistencyScore(workspaceId),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function useHeatmap(workspaceId: string, year: number) {
  return useQuery({
    queryKey: queryKeys.analytics.heatmap(workspaceId, year),
    queryFn: () => analyticsApi.getHeatmap(workspaceId, year),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function usePipelineVelocity(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.velocity(workspaceId),
    queryFn: () => analyticsApi.getPipelineVelocity(workspaceId),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function useWeeklyReport(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.weeklyReport(workspaceId),
    queryFn: () => analyticsApi.getWeeklyReport(workspaceId),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function useMonthlyReport(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.monthlyReport(workspaceId),
    queryFn: () => analyticsApi.getMonthlyReport(workspaceId),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function useAnalyticsGoals(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.goals(workspaceId),
    queryFn: () => analyticsApi.listGoals(workspaceId),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: Omit<AnalyticsGoal, 'id' | 'workspaceId' | 'currentValue' | 'status' | 'createdAt'>;
    }) => analyticsApi.createGoal(workspaceId, body),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.goals(workspaceId),
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      goalId,
      body,
    }: {
      workspaceId: string;
      goalId: string;
      body: Partial<AnalyticsGoal>;
    }) => analyticsApi.updateGoal(workspaceId, goalId, body),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.goals(workspaceId),
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, goalId }: { workspaceId: string; goalId: string }) =>
      analyticsApi.deleteGoal(workspaceId, goalId),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.goals(workspaceId),
      });
    },
  });
}
