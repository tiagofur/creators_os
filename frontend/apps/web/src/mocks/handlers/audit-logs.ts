import { http, HttpResponse } from 'msw';

const BASE = '*/api/v1/workspaces/:workspaceId/audit-logs';

const mockAuditLogs = [
  {
    id: 'alog_01HQAL1111111111',
    workspace_id: 'ws_01HQXYZ123456789',
    user_id: 'usr_01HQXYZ123456789',
    action: 'content.created',
    entity_type: 'content',
    entity_id: 'cnt_01HQCNT111111111',
    metadata: { title: '10 TypeScript Tips' },
    created_at: '2025-01-08T10:00:00.000Z',
  },
  {
    id: 'alog_02HQAL2222222222',
    workspace_id: 'ws_01HQXYZ123456789',
    user_id: 'usr_01HQXYZ123456789',
    action: 'idea.promoted',
    entity_type: 'idea',
    entity_id: 'idea_01HQIDEA11111111',
    metadata: {},
    created_at: '2025-01-07T14:30:00.000Z',
  },
];

export const auditLogsHandlers = [
  // GET /api/v1/workspaces/:workspaceId/audit-logs
  http.get(BASE, () => {
    return HttpResponse.json({
      logs: mockAuditLogs,
      limit: 50,
      offset: 0,
    });
  }),
];
