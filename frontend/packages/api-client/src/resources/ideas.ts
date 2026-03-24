import type { OrdoApiClient } from '../client';
import type { Idea, IdeaStatus, PaginatedResponse } from '@ordo/types';
import type { CreateIdeaInput, UpdateIdeaInput } from '@ordo/validations';
import { ideaSchema } from '@ordo/validations';
import { z } from 'zod';

const paginatedIdeasSchema = z.object({
  data: z.array(ideaSchema),
  meta: z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export interface IdeaFilters {
  status?: IdeaStatus;
  stage?: string;
  tags?: string[];
  page?: number;
  per_page?: number;
  search?: string;
}

export function createIdeasResource(client: OrdoApiClient) {
  return {
    list(workspaceId: string, filters?: IdeaFilters): Promise<PaginatedResponse<Idea>> {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            if (Array.isArray(value)) {
              value.forEach((v) => params.append(key, v));
            } else {
              params.set(key, String(value));
            }
          }
        });
      }
      const query = params.toString();
      return client.get<PaginatedResponse<Idea>>(
        `/api/v1/workspaces/${workspaceId}/ideas${query ? `?${query}` : ''}`,
        paginatedIdeasSchema,
      );
    },

    get(workspaceId: string, id: string): Promise<Idea> {
      return client.get<Idea>(`/api/v1/workspaces/${workspaceId}/ideas/${id}`, ideaSchema);
    },

    create(workspaceId: string, body: CreateIdeaInput): Promise<Idea> {
      return client.post<Idea>(`/api/v1/workspaces/${workspaceId}/ideas`, body, ideaSchema);
    },

    update(workspaceId: string, id: string, body: UpdateIdeaInput): Promise<Idea> {
      return client.put<Idea>(`/api/v1/workspaces/${workspaceId}/ideas/${id}`, body, ideaSchema);
    },

    delete(workspaceId: string, id: string): Promise<void> {
      return client.delete<void>(`/api/v1/workspaces/${workspaceId}/ideas/${id}`);
    },

    requestValidation(workspaceId: string, id: string): Promise<void> {
      return client.post<void>(`/api/v1/workspaces/${workspaceId}/ideas/${id}/validate`);
    },

    setTags(workspaceId: string, id: string, tags: string[]): Promise<Idea> {
      return client.put<Idea>(`/api/v1/workspaces/${workspaceId}/ideas/${id}/tags`, { tags }, ideaSchema);
    },

    promote(workspaceId: string, id: string): Promise<Idea> {
      return client.post<Idea>(`/api/v1/workspaces/${workspaceId}/ideas/${id}/promote`, undefined, ideaSchema);
    },
  };
}
