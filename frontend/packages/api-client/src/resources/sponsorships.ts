import type { OrdoApiClient } from '../client';
import type {
  SponsorshipDeal,
} from '@ordo/types';

export function createSponsorshipsResource(client: OrdoApiClient) {
  return {
    list(workspaceId: string): Promise<SponsorshipDeal[]> {
      return client.get<SponsorshipDeal[]>(
        `/api/v1/workspaces/${workspaceId}/sponsorships`,
      );
    },

    get(workspaceId: string, id: string): Promise<SponsorshipDeal> {
      return client.get<SponsorshipDeal>(
        `/api/v1/workspaces/${workspaceId}/sponsorships/${id}`,
      );
    },

    create(
      workspaceId: string,
      body: Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
    ): Promise<SponsorshipDeal> {
      return client.post<SponsorshipDeal>(
        `/api/v1/workspaces/${workspaceId}/sponsorships`,
        body,
      );
    },

    update(
      workspaceId: string,
      id: string,
      body: Partial<Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
    ): Promise<SponsorshipDeal> {
      return client.put<SponsorshipDeal>(
        `/api/v1/workspaces/${workspaceId}/sponsorships/${id}`,
        body,
      );
    },

    delete(workspaceId: string, id: string): Promise<void> {
      return client.delete<void>(
        `/api/v1/workspaces/${workspaceId}/sponsorships/${id}`,
      );
    },

    addMessage(workspaceId: string, id: string, body: unknown): Promise<unknown> {
      return client.post<unknown>(
        `/api/v1/workspaces/${workspaceId}/sponsorships/${id}/messages`,
        body,
      );
    },

    listMessages(workspaceId: string, id: string): Promise<unknown[]> {
      return client.get<unknown[]>(
        `/api/v1/workspaces/${workspaceId}/sponsorships/${id}/messages`,
      );
    },
  };
}
