import type { OrdoApiClient } from '../client';
import type { SearchResult } from '@ordo/types';

export function createSearchResource(client: OrdoApiClient) {
  return {
    search(workspaceId: string, query: string): Promise<SearchResult[]> {
      const params = new URLSearchParams({ q: query });
      return client.get<SearchResult[]>(`/api/v1/workspaces/${workspaceId}/search?${params.toString()}`);
    },
  };
}
