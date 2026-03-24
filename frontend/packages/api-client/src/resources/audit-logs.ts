import type { OrdoApiClient } from '../client';

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
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
