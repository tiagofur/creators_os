import type { UUID } from './common';

export interface ActivityLogEntry {
  workspace_id: UUID;
  user_id?: UUID | null;
  action: string; // e.g. "content.created"
  entity_type: string; // e.g. "content"
  entity_id?: UUID | null;
  metadata?: Record<string, unknown> | null;
}
