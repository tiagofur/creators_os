'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { ANALYTICS_CACHE } from '@/lib/query-config';
import { createAnalyticsResource } from '@ordo/api-client';

const analyticsApi = createAnalyticsResource(apiClient);

export function useAnalyticsOverview(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.platforms(workspaceId, 'overview'),
    queryFn: () => analyticsApi.getOverview(workspaceId),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });
}

export function useContentAnalytics(workspaceId: string, contentId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.consistency(workspaceId),
    queryFn: () => analyticsApi.getContentAnalytics(workspaceId, contentId),
    enabled: Boolean(workspaceId) && Boolean(contentId),
    ...ANALYTICS_CACHE,
  });
}

export function usePlatformAnalytics(workspaceId: string, platform: string) {
  return useQuery({
    queryKey: queryKeys.analytics.platforms(workspaceId, platform),
    queryFn: () => analyticsApi.getPlatformAnalytics(workspaceId, platform),
    enabled: Boolean(workspaceId) && Boolean(platform),
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

export function useTriggerAnalyticsSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId }: { workspaceId: string }) =>
      analyticsApi.triggerSync(workspaceId),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.platforms(workspaceId, 'overview'),
      });
    },
  });
}
