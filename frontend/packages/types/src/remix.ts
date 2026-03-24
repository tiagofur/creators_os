import type { UUID, Timestamp } from './common';

export type RemixJobStatus =
  | 'pending'
  | 'ingesting'
  | 'transcribing'
  | 'scoring'
  | 'generating'
  | 'complete'
  | 'failed';

export interface RemixJob {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  status: RemixJobStatus;
  input_url: string;
  results?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
