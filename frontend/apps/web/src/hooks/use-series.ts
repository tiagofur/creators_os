'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { SERIES_CACHE } from '@/lib/query-config';
import type { Series } from '@ordo/types';

// GET all series for workspace
export function useSeries(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.series.list(),
    queryFn: () =>
      apiClient.get<Series[]>(`/v1/series?workspace_id=${workspaceId}`),
    enabled: Boolean(workspaceId),
    ...SERIES_CACHE,
  });
}

// GET single series with episodes
export function useSerie(id: string) {
  return useQuery({
    queryKey: queryKeys.series.detail(id),
    queryFn: () => apiClient.get<Series>(`/v1/series/${id}`),
    enabled: Boolean(id),
    ...SERIES_CACHE,
  });
}

// POST create series
export function useCreateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      workspace_id: string;
      description?: string;
      cover_url?: string;
    }) => apiClient.post<Series>('/v1/series', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.all() });
    },
  });
}

// PATCH update series
export function useUpdateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Series> & { id: string }) =>
      apiClient.patch<Series>(`/v1/series/${id}`, body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.series.all() });
    },
  });
}

// DELETE series
export function useDeleteSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/v1/series/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.all() });
    },
  });
}
