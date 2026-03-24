import type { OrdoApiClient } from '../client';

export interface PlatformCredential {
  id: string;
  workspace_id: string;
  platform: string;
  channel_id?: string | null;
  channel_name?: string | null;
  scopes: string[];
  token_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPost {
  id: string;
  workspace_id: string;
  content_id: string;
  credential_id?: string | null;
  platform: string;
  status: string;
  scheduled_at: string;
  published_at?: string | null;
  error_message?: string | null;
  platform_post_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreCredentialInput {
  platform: string;
  access_token?: string | null;
  refresh_token?: string | null;
  scopes?: string[];
  expires_at?: string | null;
}

export interface StoreCredentialOAuthResponse {
  oauth_url: string;
}

export interface SchedulePostInput {
  content_id: string;
  platform: string;
  scheduled_at: string;
}

export interface CalendarFilters {
  from?: string;
  to?: string;
}

export function createPublishingResource(client: OrdoApiClient) {
  return {
    storeCredential(workspaceId: string, body: StoreCredentialInput): Promise<PlatformCredential | StoreCredentialOAuthResponse> {
      return client.post<PlatformCredential | StoreCredentialOAuthResponse>(
        `/api/v1/workspaces/${workspaceId}/publishing/credentials`,
        body,
      );
    },

    listCredentials(workspaceId: string): Promise<PlatformCredential[]> {
      return client.get<PlatformCredential[]>(
        `/api/v1/workspaces/${workspaceId}/publishing/credentials`,
      );
    },

    deleteCredential(workspaceId: string, credentialId: string): Promise<void> {
      return client.delete<void>(
        `/api/v1/workspaces/${workspaceId}/publishing/credentials/${credentialId}`,
      );
    },

    schedulePost(workspaceId: string, body: SchedulePostInput): Promise<ScheduledPost> {
      return client.post<ScheduledPost>(
        `/api/v1/workspaces/${workspaceId}/publishing/schedule`,
        body,
      );
    },

    getCalendar(workspaceId: string, filters?: CalendarFilters): Promise<ScheduledPost[]> {
      const params = new URLSearchParams();
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      const query = params.toString();
      return client.get<ScheduledPost[]>(
        `/api/v1/workspaces/${workspaceId}/publishing/calendar${query ? `?${query}` : ''}`,
      );
    },

    cancelScheduledPost(workspaceId: string, postId: string): Promise<void> {
      return client.delete<void>(
        `/api/v1/workspaces/${workspaceId}/publishing/schedule/${postId}`,
      );
    },
  };
}
