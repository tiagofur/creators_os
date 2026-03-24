import type { Workspace, WorkspaceMember, WorkspaceInvitation } from '@ordo/types';
import { mockUser } from './users';

export const mockWorkspace: Workspace = {
  id: 'ws_01HQABC123456789',
  name: 'Tech Tutorials',
  slug: 'tech-tutorials',
  logo_url: null,
  avatar_url: null,
  timezone: 'America/Los_Angeles',
  owner_id: mockUser.id,
  created_at: '2024-06-15T11:00:00.000Z',
  updated_at: '2025-01-08T09:15:00.000Z',
};

export const mockWorkspace2: Workspace = {
  id: 'ws_02HQDEF456789012',
  name: 'Vlog Channel',
  slug: 'vlog-channel',
  logo_url: 'https://example.com/vlog-logo.png',
  avatar_url: 'https://example.com/vlog-logo.png',
  timezone: 'America/New_York',
  owner_id: mockUser.id,
  created_at: '2024-09-01T08:00:00.000Z',
  updated_at: '2025-01-05T17:30:00.000Z',
};

export const mockWorkspaces: Workspace[] = [mockWorkspace, mockWorkspace2];

export const mockWorkspaceMember: WorkspaceMember = {
  id: 'wm_01HQMEM123456789',
  workspace_id: mockWorkspace.id,
  user_id: mockUser.id,
  role: 'owner',
  user_email: 'creator@example.com',
  user_name: 'Alex Rivera',
  invited_by: null,
  joined_at: '2024-06-15T11:00:00.000Z',
};

export const mockWorkspaceMember2: WorkspaceMember = {
  id: 'wm_02HQMEM987654321',
  workspace_id: mockWorkspace.id,
  user_id: 'usr_02HQCOLLABORATOR',
  role: 'editor',
  user_email: 'jordan@example.com',
  user_name: 'Jordan Lee',
  invited_by: mockUser.id,
  joined_at: '2024-08-20T14:00:00.000Z',
};

export const mockWorkspaceMembers: WorkspaceMember[] = [
  mockWorkspaceMember,
  mockWorkspaceMember2,
];

export const mockWorkspaceInvitation: WorkspaceInvitation = {
  id: 'inv_01HQINV123456789',
  workspace_id: mockWorkspace.id,
  invited_by: mockUser.id,
  email: 'collab@example.com',
  role: 'editor',
  token: 'invite-token-xyz789',
  expires_at: '2025-02-15T00:00:00.000Z',
  created_at: '2025-01-10T10:00:00.000Z',
};
