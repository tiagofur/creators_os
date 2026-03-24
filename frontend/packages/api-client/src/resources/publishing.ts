import type { OrdoApiClient } from '../client';
import type {
  PlatformCredential,
  ScheduledPost,
  PlatformType,
} from '@ordo/types';

export interface StoreCredentialInput {
  platform: PlatformType;
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
  platform: PlatformType;
  scheduled_at: string;
}

export interface CalendarFilters {
  from?: string;
  to?: string;
}

export function createPublishingResource(client: OrdoApiClient) {
  return {
    storeCredential(
      workspaceId: string,
      body: StoreCredentialInput,
    ): Promise<PlatformCredential | StoreCredentialOAuthResponse> {
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
