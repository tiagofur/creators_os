'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { CONTENT_CACHE } from '@/lib/query-config';
import { createContentResource } from '@ordo/api-client';
import type { ContentItem, PaginatedResponse } from '@ordo/types';

const contentApi = createContentResource(apiClient);

export interface ContentFilters {
  status?: string;
  pipeline_stage?: string;
  platform?: string;
  search?: string;
  assignee_id?: string;
  page?: number;
  limit?: number;
}

// GET list of content items
export function useContentItems(workspaceId: string, filters?: ContentFilters) {
  return useQuery({
    queryKey: queryKeys.content.list(filters as Record<string, unknown>),
    queryFn: () => {
      // Map legacy filter names to what the API resource expects
      const apiFilters: Record<string, string | number | undefined> = {};
      if (filters) {
        // Prefer status over deprecated pipeline_stage
        if (filters.status) apiFilters.status = filters.status;
        else if (filters.pipeline_stage) apiFilters.status = filters.pipeline_stage;
        if (filters.platform) apiFilters.platform = filters.platform;
        if (filters.search) apiFilters.search = filters.search;
        if (filters.page) apiFilters.page = filters.page;
        if (filters.limit) apiFilters.per_page = filters.limit;
      }
      return contentApi.list(workspaceId, apiFilters as Parameters<typeof contentApi.list>[1]);
    },
    enabled: Boolean(workspaceId),
    ...CONTENT_CACHE,
  });
}

// GET single content item
export function useContentItem(id: string) {
  return useQuery({
    queryKey: queryKeys.content.detail(id),
    queryFn: () => apiClient.get<ContentItem>(`/api/v1/contents/${id}`),
    enabled: Boolean(id),
    ...CONTENT_CACHE,
  });
}

// POST create content
export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      title: string;
      workspace_id: string;
      pipeline_stage?: string;
      platform?: string;
      idea_id?: string;
      body?: string;
      tags?: string[];
      scheduled_at?: string;
    }) => apiClient.post<ContentItem>(`/api/v1/workspaces/${body.workspace_id}/contents`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all() });
    },
  });
}

// PATCH update content (optimistic)
export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ContentItem> & { id: string }) =>
      apiClient.patch<ContentItem>(`/api/v1/contents/${id}`, body),
    onMutate: async ({ id, ...body }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.content.detail(id) });
      const previous = queryClient.getQueryData<ContentItem>(queryKeys.content.detail(id));
      if (previous) {
        queryClient.setQueryData<ContentItem>(queryKeys.content.detail(id), {
          ...previous,
          ...body,
        });
      }
      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.content.detail(id), context.previous);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all() });
    },
  });
}

// PATCH /stage — move content to a new pipeline stage (optimistic + rollback)
export function useMoveStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      apiClient.patch<ContentItem>(`/api/v1/contents/${id}`, { pipeline_stage: stage }),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.content.detail(id) });
      const previous = queryClient.getQueryData<ContentItem>(queryKeys.content.detail(id));
      const previousList = queryClient.getQueryData<PaginatedResponse<ContentItem>>(
        queryKeys.content.list(),
      );
      if (previous) {
        queryClient.setQueryData<ContentItem>(queryKeys.content.detail(id), {
          ...previous,
          pipeline_stage: stage as ContentItem['pipeline_stage'],
        });
      }
      return { previous, previousList };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.content.detail(id), context.previous);
      }
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.content.list(), context.previousList);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all() });
    },
  });
}

// DELETE content
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/v1/contents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all() });
    },
  });
}
