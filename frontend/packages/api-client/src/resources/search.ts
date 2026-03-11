import type { OrdoApiClient } from '../client';
import type { SearchResult } from '@ordo/types';

export function createSearchResource(client: OrdoApiClient) {
  return {
    search(query: string, workspaceId: string): Promise<SearchResult[]> {
      const params = new URLSearchParams({ q: query, workspace: workspaceId });
      return client.get<SearchResult[]>(`/v1/search?${params.toString()}`);
    },
  };
}
