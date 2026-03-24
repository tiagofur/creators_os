import type { UUID, Timestamp } from './common';
import type { PlatformType } from './content';

export type ScheduledPostStatus = 'pending' | 'publishing' | 'published' | 'failed';

export interface PlatformCredential {
  id: UUID;
  workspace_id: UUID;
  platform: PlatformType;
  channel_id?: string | null;
  channel_name?: string | null;
  scopes: string[];
  token_expires_at?: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Note: encrypted tokens are not exposed to the frontend
}

export interface ScheduledPost {
  id: UUID;
  workspace_id: UUID;
  content_id: UUID;
  credential_id?: UUID | null;
  platform: PlatformType;
  status: ScheduledPostStatus;
  scheduled_at: Timestamp;
  published_at?: Timestamp | null;
  error_message?: string | null;
  platform_post_id?: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
