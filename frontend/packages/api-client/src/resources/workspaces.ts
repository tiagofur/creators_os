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
      return client.get<PaginatedResponse<Workspace>>('/api/v1/workspaces');
    },

    get(id: string): Promise<Workspace> {
      return client.get<Workspace>(`/api/v1/workspaces/${id}`);
    },

    create(body: CreateWorkspaceInput): Promise<Workspace> {
      return client.post<Workspace>('/api/v1/workspaces', body);
    },

    update(id: string, body: UpdateWorkspaceInput): Promise<Workspace> {
      return client.put<Workspace>(`/api/v1/workspaces/${id}`, body);
    },

    delete(id: string): Promise<void> {
      return client.delete<void>(`/api/v1/workspaces/${id}`);
    },

    listMembers(id: string): Promise<PaginatedResponse<WorkspaceMember>> {
      return client.get<PaginatedResponse<WorkspaceMember>>(`/api/v1/workspaces/${id}/members`);
    },

    updateMemberRole(workspaceId: string, userId: string, role: string): Promise<void> {
      return client.put<void>(`/api/v1/workspaces/${workspaceId}/members/${userId}/role`, { role });
    },

    removeMember(workspaceId: string, userId: string): Promise<void> {
      return client.delete<void>(`/api/v1/workspaces/${workspaceId}/members/${userId}`);
    },

    inviteMember(id: string, body: InviteMemberInput): Promise<WorkspaceInvitation> {
      return client.post<WorkspaceInvitation>(`/api/v1/workspaces/${id}/invitations`, body);
    },

    listInvitations(id: string): Promise<WorkspaceInvitation[]> {
      return client.get<WorkspaceInvitation[]>(`/api/v1/workspaces/${id}/invitations`);
    },

    deleteInvitation(workspaceId: string, invitationId: string): Promise<void> {
      return client.delete<void>(`/api/v1/workspaces/${workspaceId}/invitations/${invitationId}`);
    },

    acceptInvitation(token: string): Promise<void> {
      return client.post<void>(`/api/v1/invitations/${token}/accept`);
    },
  };
}
