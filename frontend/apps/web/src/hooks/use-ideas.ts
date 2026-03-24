'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { IDEAS_CACHE } from '@/lib/query-config';
import { createIdeasResource } from '@ordo/api-client';
import type { Idea, IdeaStatus, PaginatedResponse } from '@ordo/types';

const ideasApi = createIdeasResource(apiClient);

export interface IdeaFilters {
  status?: IdeaStatus;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
  tags?: string[];
}

// GET list of ideas
export function useIdeas(workspaceId: string, filters?: IdeaFilters) {
  return useQuery({
    queryKey: queryKeys.ideas.list(filters as Record<string, unknown>),
    queryFn: () => {
      const apiFilters: Record<string, unknown> = {};
      if (filters) {
        if (filters.status) apiFilters.status = filters.status;
        if (filters.stage) apiFilters.stage = filters.stage;
        if (filters.search) apiFilters.search = filters.search;
        if (filters.page) apiFilters.page = filters.page;
        if (filters.limit) apiFilters.per_page = filters.limit;
        if (filters.tags?.length) apiFilters.tags = filters.tags;
      }
      return ideasApi.list(workspaceId, apiFilters as Parameters<typeof ideasApi.list>[1]);
    },
    enabled: Boolean(workspaceId),
    ...IDEAS_CACHE,
  });
}

// GET single idea
export function useIdea(id: string) {
  return useQuery({
    queryKey: queryKeys.ideas.detail(id),
    queryFn: () => apiClient.get<Idea>(`/api/v1/ideas/${id}`),
    enabled: Boolean(id),
    ...IDEAS_CACHE,
  });
}

// POST create idea
export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { title: string; description?: string; tags?: string[]; workspace_id: string }) =>
      apiClient.post<Idea>(`/api/v1/workspaces/${body.workspace_id}/ideas`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    },
  });
}

// PATCH update idea (optimistic)
export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Idea> & { id: string }) =>
      apiClient.patch<Idea>(`/api/v1/ideas/${id}`, body),
    onMutate: async ({ id, ...body }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.ideas.detail(id) });
      const previous = queryClient.getQueryData<Idea>(queryKeys.ideas.detail(id));
      if (previous) {
        queryClient.setQueryData<Idea>(queryKeys.ideas.detail(id), {
          ...previous,
          ...body,
        });
      }
      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.ideas.detail(id), context.previous);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    },
  });
}

// DELETE idea (optimistic removal)
export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/v1/ideas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    },
  });
}

// PATCH /status — change idea status (optimistic)
export function useChangeIdeaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IdeaStatus }) =>
      apiClient.patch<Idea>(`/api/v1/ideas/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.ideas.detail(id) });
      const previous = queryClient.getQueryData<Idea>(queryKeys.ideas.detail(id));
      if (previous) {
        queryClient.setQueryData<Idea>(queryKeys.ideas.detail(id), {
          ...previous,
          status,
        });
      }
      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.ideas.detail(id), context.previous);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    },
  });
}
