'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { IDEAS_CACHE } from '@/lib/query-config';
import { createIdeasResource } from '@ordo/api-client';
import type { Idea, IdeaStatus } from '@ordo/types';

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
export function useIdea(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.ideas.detail(id),
    queryFn: () => ideasApi.get(workspaceId, id),
    enabled: Boolean(workspaceId) && Boolean(id),
    ...IDEAS_CACHE,
  });
}

// POST create idea
export function useCreateIdea(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { title: string; description?: string; tags?: string[] }) =>
      ideasApi.create(workspaceId, body as Parameters<typeof ideasApi.create>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success('Idea created.');
    },
    onError: () => {
      toast.error('Failed to create idea. Please try again.');
    },
  });
}

// PUT update idea (optimistic)
export function useUpdateIdea(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Idea> & { id: string }) =>
      ideasApi.update(workspaceId, id, body as Parameters<typeof ideasApi.update>[2]),
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
      toast.error('Failed to update idea. Please try again.');
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    },
  });
}

// DELETE idea
export function useDeleteIdea(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ideasApi.delete(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success('Idea deleted.');
    },
    onError: () => {
      toast.error('Failed to delete idea. Please try again.');
    },
  });
}

// PUT /status — change idea status (optimistic)
export function useChangeIdeaStatus(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IdeaStatus }) =>
      ideasApi.update(workspaceId, id, { status } as Parameters<typeof ideasApi.update>[2]),
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
      toast.error('Failed to update status. Please try again.');
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    },
  });
}

// POST /validate — request AI validation for an idea
export function useRequestValidation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ideaId: string) => ideasApi.requestValidation(workspaceId, ideaId),
    onSuccess: (_data, ideaId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(ideaId) });
      toast.success('Validation requested. Results will appear shortly.');
    },
    onError: () => {
      toast.error('Failed to request validation. Please try again.');
    },
  });
}

// PUT /tags — set tags on an idea
export function useSetIdeaTags(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ideaId, tags }: { ideaId: string; tags: string[] }) =>
      ideasApi.setTags(workspaceId, ideaId, tags),
    onSuccess: (updatedIdea) => {
      queryClient.setQueryData<Idea>(queryKeys.ideas.detail(updatedIdea.id), updatedIdea);
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success('Tags updated.');
    },
    onError: () => {
      toast.error('Failed to update tags. Please try again.');
    },
  });
}

// POST /promote — promote idea to content
export function usePromoteIdea(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ideaId: string) => ideasApi.promote(workspaceId, ideaId),
    onSuccess: (_data, ideaId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(ideaId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
      toast.success('Idea promoted to content successfully.');
    },
    onError: () => {
      toast.error('Failed to promote idea. Please try again.');
    },
  });
}
