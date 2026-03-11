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
    list(filters?: IdeaFilters): Promise<PaginatedResponse<Idea>> {
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
        `/v1/ideas${query ? `?${query}` : ''}`,
        paginatedIdeasSchema,
      );
    },

    get(id: string): Promise<Idea> {
      return client.get<Idea>(`/v1/ideas/${id}`, ideaSchema);
    },

    create(body: CreateIdeaInput): Promise<Idea> {
      return client.post<Idea>('/v1/ideas', body, ideaSchema);
    },

    update(id: string, body: UpdateIdeaInput): Promise<Idea> {
      return client.patch<Idea>(`/v1/ideas/${id}`, body, ideaSchema);
    },

    delete(id: string): Promise<void> {
      return client.delete<void>(`/v1/ideas/${id}`);
    },

    changeStatus(id: string, status: IdeaStatus): Promise<Idea> {
      return client.patch<Idea>(`/v1/ideas/${id}`, { status }, ideaSchema);
    },
  };
}
