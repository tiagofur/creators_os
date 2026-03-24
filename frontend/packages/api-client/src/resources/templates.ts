import type { OrdoApiClient } from '../client';
import type {
  ContentTemplate,
  ContentItem,
  CreateTemplateInput,
  UpdateTemplateInput,
  InstantiateTemplateInput,
} from '@ordo/types';

export function createTemplatesResource(client: OrdoApiClient) {
  return {
    list(workspaceId: string): Promise<ContentTemplate[]> {
      return client.get<ContentTemplate[]>(
        `/api/v1/workspaces/${workspaceId}/templates`,
      );
    },

    get(workspaceId: string, templateId: string): Promise<ContentTemplate> {
      return client.get<ContentTemplate>(
        `/api/v1/workspaces/${workspaceId}/templates/${templateId}`,
      );
    },

    create(workspaceId: string, body: CreateTemplateInput): Promise<ContentTemplate> {
      return client.post<ContentTemplate>(
        `/api/v1/workspaces/${workspaceId}/templates`,
        body,
      );
    },

    update(workspaceId: string, templateId: string, body: UpdateTemplateInput): Promise<ContentTemplate> {
      return client.put<ContentTemplate>(
        `/api/v1/workspaces/${workspaceId}/templates/${templateId}`,
        body,
      );
    },

    delete(workspaceId: string, templateId: string): Promise<void> {
      return client.delete<void>(
        `/api/v1/workspaces/${workspaceId}/templates/${templateId}`,
      );
    },

    instantiate(workspaceId: string, templateId: string, body: InstantiateTemplateInput): Promise<ContentItem> {
      return client.post<ContentItem>(
        `/api/v1/workspaces/${workspaceId}/templates/${templateId}/instantiate`,
        body,
      );
    },
  };
}
