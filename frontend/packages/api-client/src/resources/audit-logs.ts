import type { OrdoApiClient } from '../client';
import type { UUID, Timestamp } from '@ordo/types';

export interface AuditLogEntry {
  id: UUID;
  workspace_id: UUID;
  user_id?: UUID | null;
  action: string;
  entity_type: string;
  entity_id?: UUID | null;
  metadata: Record<string, unknown>;
  created_at: Timestamp;
}

export interface AuditLogFilters {
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  limit: number;
  offset: number;
}

export function createAuditLogsResource(client: OrdoApiClient) {
  return {
    list(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLogResponse> {
      const params = new URLSearchParams();
      if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
      if (filters?.offset !== undefined) params.set('offset', String(filters.offset));
      const query = params.toString();
      return client.get<AuditLogResponse>(
        `/api/v1/workspaces/${workspaceId}/audit-logs${query ? `?${query}` : ''}`,
      );
    },
  };
}
