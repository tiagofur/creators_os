'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PUBLISHING_CACHE } from '@/lib/query-config';
import type { ContentItem } from '@ordo/types';

const publishingKeys = {
  all: () => ['publishing'] as const,
  scheduled: (workspaceId: string, dateRange?: { from: string; to: string }) =>
    ['publishing', 'scheduled', workspaceId, dateRange] as const,
};

// GET scheduled content items within a date range
export function useScheduledContent(
  workspaceId: string,
  dateRange?: { from: string; to: string },
) {
  return useQuery({
    queryKey: publishingKeys.scheduled(workspaceId, dateRange),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('workspace_id', workspaceId);
      if (dateRange) {
        params.set('from', dateRange.from);
        params.set('to', dateRange.to);
      }
      return apiClient.get<ContentItem[]>(
        `/api/v1/publishing/scheduled?${params.toString()}`,
      );
    },
    enabled: Boolean(workspaceId),
    ...PUBLISHING_CACHE,
  });
}

// POST schedule a content item
export function useScheduleContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      scheduledAt,
    }: {
      contentId: string;
      scheduledAt: string;
    }) =>
      apiClient.post<ContentItem>(`/api/v1/contents/${contentId}/schedule`, {
        scheduled_at: scheduledAt,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publishingKeys.all() });
    },
  });
}

// DELETE schedule (unschedule)
export function useUnscheduleContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) =>
      apiClient.delete<void>(`/api/v1/contents/${contentId}/schedule`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publishingKeys.all() });
    },
  });
}
