import type { OrdoApiClient } from '../client';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  PaginatedResponse,
} from '@ordo/types';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, InviteMemberInput } from '@ordo/validations';

export function createWorkspacesResource(client: OrdoApiClient) {
  return {
    list(): Promise<PaginatedResponse<Workspace>> {
      return client.get<PaginatedResponse<Workspace>>('/v1/workspaces');
    },

    get(id: string): Promise<Workspace> {
      return client.get<Workspace>(`/v1/workspaces/${id}`);
    },

    create(body: CreateWorkspaceInput): Promise<Workspace> {
      return client.post<Workspace>('/v1/workspaces', body);
    },

    update(id: string, body: UpdateWorkspaceInput): Promise<Workspace> {
      return client.patch<Workspace>(`/v1/workspaces/${id}`, body);
    },

    delete(id: string): Promise<void> {
      return client.delete<void>(`/v1/workspaces/${id}`);
    },

    listMembers(id: string): Promise<PaginatedResponse<WorkspaceMember>> {
      return client.get<PaginatedResponse<WorkspaceMember>>(`/v1/workspaces/${id}/members`);
    },

    inviteMember(id: string, body: InviteMemberInput): Promise<WorkspaceInvitation> {
      return client.post<WorkspaceInvitation>(`/v1/workspaces/${id}/members/invite`, body);
    },

    removeMember(workspaceId: string, userId: string): Promise<void> {
      return client.delete<void>(`/v1/workspaces/${workspaceId}/members/${userId}`);
    },
  };
}
