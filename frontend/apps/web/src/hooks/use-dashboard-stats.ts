'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { IDEAS_CACHE, CONTENT_CACHE, WORKSPACE_CACHE, ANALYTICS_CACHE } from '@/lib/query-config';
import {
  createIdeasResource,
  createContentResource,
  createAnalyticsResource,
} from '@ordo/api-client';
import type { PaginatedResponse, Idea, ContentItem, WorkspaceMember, ConsistencyScore } from '@ordo/types';

const ideasApi = createIdeasResource(apiClient);
const contentApi = createContentResource(apiClient);
const analyticsApi = createAnalyticsResource(apiClient);

export function useDashboardStats(workspaceId: string) {
  const ideas = useQuery({
    queryKey: queryKeys.ideas.list({ _dashboard: true, per_page: 1 }),
    queryFn: () => ideasApi.list(workspaceId, { per_page: 1 }),
    enabled: Boolean(workspaceId),
    ...IDEAS_CACHE,
  });

  const allContent = useQuery({
    queryKey: queryKeys.content.list({ _dashboard: true, per_page: 1 }),
    queryFn: () => contentApi.list(workspaceId, { per_page: 1 }),
    enabled: Boolean(workspaceId),
    ...CONTENT_CACHE,
  });

  const publishedContent = useQuery({
    queryKey: queryKeys.content.list({ _dashboard: true, status: 'published', per_page: 1 }),
    queryFn: () => contentApi.list(workspaceId, { status: 'published', per_page: 1 }),
    enabled: Boolean(workspaceId),
    ...CONTENT_CACHE,
  });

  const teamMembers = useQuery({
    queryKey: queryKeys.workspaces.members(workspaceId),
    queryFn: () =>
      apiClient.get<WorkspaceMember[]>(
        `/api/v1/workspaces/${workspaceId}/members`,
      ),
    enabled: Boolean(workspaceId),
    ...WORKSPACE_CACHE,
  });

  const consistency = useQuery({
    queryKey: queryKeys.analytics.consistency(workspaceId),
    queryFn: () => analyticsApi.getConsistencyScore(workspaceId),
    enabled: Boolean(workspaceId),
    ...ANALYTICS_CACHE,
  });

  const isLoading =
    ideas.isLoading ||
    allContent.isLoading ||
    publishedContent.isLoading ||
    teamMembers.isLoading;

  const totalIdeas = ideas.data?.meta?.total ?? 0;
  const totalContent = allContent.data?.meta?.total ?? 0;
  const publishedCount = publishedContent.data?.meta?.total ?? 0;
  const inPipeline = totalContent - publishedCount;
  const memberCount = teamMembers.data?.length ?? 0;
  const streak = consistency.data?.streak ?? 0;

  return {
    isLoading,
    totalIdeas,
    inPipeline: inPipeline >= 0 ? inPipeline : 0,
    publishedCount,
    memberCount,
    streak,
    consistencyLoading: consistency.isLoading,
  };
}
