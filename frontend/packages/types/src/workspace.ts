import type { UUID, Timestamp } from './common';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Workspace {
  id: UUID;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  owner_id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface WorkspaceMember {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  role: WorkspaceRole;
  invited_by: UUID | null;
  joined_at: Timestamp;
}

export interface WorkspaceInvitation {
  id: UUID;
  workspace_id: UUID;
  email: string;
  role: WorkspaceRole;
  token: string;
  expires_at: Timestamp;
  created_at: Timestamp;
}
