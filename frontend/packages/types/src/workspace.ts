import type { UUID, Timestamp } from './common';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Workspace {
  id: UUID;
  owner_id: UUID;
  name: string;
  slug: string;
  description?: string | null;
  avatar_url?: string | null;
  settings?: Record<string, unknown> | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;

  // Legacy fields kept for backward compatibility
  /** @deprecated Use avatar_url instead */
  logo_url?: string | null;
  timezone?: string;
}

export interface WorkspaceMember {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  role: WorkspaceRole;
  joined_at: Timestamp;
  user_email: string;
  user_name: string;
  /** @deprecated */
  invited_by?: UUID | null;
}

export interface WorkspaceInvitation {
  id: UUID;
  workspace_id: UUID;
  invited_by: UUID;
  email: string;
  role: WorkspaceRole;
  token: string;
  accepted_at?: Timestamp | null;
  expires_at: Timestamp;
  created_at: Timestamp;
}
