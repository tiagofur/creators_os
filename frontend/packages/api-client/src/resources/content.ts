import type { OrdoApiClient } from '../client';
import type { ContentItem, PipelineStage, PaginatedResponse, ApprovalLink, CreateApprovalLinkInput } from '@ordo/types';
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
    list(workspaceId: string, filters?: ContentFilters): Promise<PaginatedResponse<ContentItem>> {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.set(key, String(value));
        });
      }
      const query = params.toString();
      return client.get<PaginatedResponse<ContentItem>>(
        `/api/v1/workspaces/${workspaceId}/contents${query ? `?${query}` : ''}`,
        paginatedContentSchema,
      );
    },

    get(workspaceId: string, id: string): Promise<ContentItem> {
      return client.get<ContentItem>(`/api/v1/workspaces/${workspaceId}/contents/${id}`, contentItemSchema);
    },

    create(workspaceId: string, body: CreateContentInput): Promise<ContentItem> {
      return client.post<ContentItem>(`/api/v1/workspaces/${workspaceId}/contents`, body, contentItemSchema);
    },

    update(workspaceId: string, id: string, body: UpdateContentInput): Promise<ContentItem> {
      return client.put<ContentItem>(`/api/v1/workspaces/${workspaceId}/contents/${id}`, body, contentItemSchema);
    },

    delete(workspaceId: string, id: string): Promise<void> {
      return client.delete<void>(`/api/v1/workspaces/${workspaceId}/contents/${id}`);
    },

    transitionStatus(workspaceId: string, id: string, status: string): Promise<ContentItem> {
      return client.put<ContentItem>(`/api/v1/workspaces/${workspaceId}/contents/${id}/status`, { status }, contentItemSchema);
    },

    addAssignment(workspaceId: string, contentId: string, userId: string): Promise<void> {
      return client.post<void>(`/api/v1/workspaces/${workspaceId}/contents/${contentId}/assignments`, { userId });
    },

    removeAssignment(workspaceId: string, contentId: string, userId: string): Promise<void> {
      return client.delete<void>(`/api/v1/workspaces/${workspaceId}/contents/${contentId}/assignments/${userId}`);
    },

    createApprovalLink(workspaceId: string, contentId: string, data: CreateApprovalLinkInput): Promise<ApprovalLink> {
      return client.post<ApprovalLink>(`/api/v1/workspaces/${workspaceId}/contents/${contentId}/approval-links`, data);
    },

    listApprovalLinks(workspaceId: string, contentId: string): Promise<ApprovalLink[]> {
      return client.get<ApprovalLink[]>(`/api/v1/workspaces/${workspaceId}/contents/${contentId}/approval-links`);
    },
  };
}
