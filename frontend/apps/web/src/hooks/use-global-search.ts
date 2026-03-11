'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SearchResult } from '@ordo/types';

export function useGlobalSearch(query: string, workspaceId: string) {
  return useQuery({
    queryKey: ['search', query, workspaceId],
    queryFn: () => {
      const params = new URLSearchParams({ q: query, workspace: workspaceId });
      return apiClient.get<SearchResult[]>(`/v1/search?${params.toString()}`);
    },
    enabled: query.length >= 2 && Boolean(workspaceId),
    staleTime: 0, // always fresh
  });
}
