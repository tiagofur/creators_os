import type { OrdoApiClient } from '../client';
import type { ContentItem, PipelineStage, PaginatedResponse } from '@ordo/types';
import type { CreateContentInput, UpdateContentInput } from '@ordo/validations';
import { contentItemSchema } from '@ordo/validations';
import { z } from 'zod';

const paginatedContentSchema = z.object({
  data: z.array(contentItemSchema),
  meta: z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export interface ContentFilters {
  status?: string;
  pipeline_stage?: PipelineStage;
  platform?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export function createContentResource(client: OrdoApiClient) {
  return {
    list(filters?: ContentFilters): Promise<PaginatedResponse<ContentItem>> {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.set(key, String(value));
        });
      }
      const query = params.toString();
      return client.get<PaginatedResponse<ContentItem>>(
        `/v1/contents${query ? `?${query}` : ''}`,
        paginatedContentSchema,
      );
    },

    get(id: string): Promise<ContentItem> {
      return client.get<ContentItem>(`/v1/contents/${id}`, contentItemSchema);
    },

    create(body: CreateContentInput): Promise<ContentItem> {
      return client.post<ContentItem>('/v1/contents', body, contentItemSchema);
    },

    update(id: string, body: UpdateContentInput): Promise<ContentItem> {
      return client.patch<ContentItem>(`/v1/contents/${id}`, body, contentItemSchema);
    },

    delete(id: string): Promise<void> {
      return client.delete<void>(`/v1/contents/${id}`);
    },

    moveStage(id: string, pipeline_stage: PipelineStage): Promise<ContentItem> {
      return client.patch<ContentItem>(`/v1/contents/${id}`, { pipeline_stage }, contentItemSchema);
    },
  };
}
