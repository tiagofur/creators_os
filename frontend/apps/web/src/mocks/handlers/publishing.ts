import { http, HttpResponse } from 'msw';

const BASE = '*/api/v1/workspaces/:workspaceId/publishing';

interface MockCredential {
  id: string;
  platform: string;
  status: string;
  scopes: string[];
  created_at: string;
  expires_at: string | null;
}

interface MockScheduledPost {
  id: string;
  content_id: string;
  platform: string;
  scheduled_at: string;
  status: string;
  created_at: string;
}

const mockCredentials: MockCredential[] = [
  {
    id: 'cred_01HQCRED11111111',
    platform: 'youtube',
    status: 'active',
    scopes: ['upload', 'readonly'],
    created_at: '2024-08-10T09:00:00.000Z',
    expires_at: '2025-08-10T09:00:00.000Z',
  },
];

const mockScheduledPosts: MockScheduledPost[] = [
  {
    id: 'spost_01HQSP1111111111',
    content_id: 'cnt_01HQCNT111111111',
    platform: 'youtube',
    scheduled_at: '2025-02-15T15:00:00.000Z',
    status: 'pending',
    created_at: '2025-02-10T10:00:00.000Z',
  },
];

export const publishingHandlers = [
  // GET /api/v1/workspaces/:workspaceId/publishing/credentials
  http.get(`${BASE}/credentials`, () => {
    return HttpResponse.json(mockCredentials);
  }),

  // POST /api/v1/workspaces/:workspaceId/publishing/credentials
  http.post(`${BASE}/credentials`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: `cred_new_${Date.now()}`,
      platform: body.platform,
      status: 'active',
      scopes: body.scopes ?? [],
      created_at: new Date().toISOString(),
      expires_at: body.expires_at ?? null,
    }, { status: 201 });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/publishing/credentials/:credentialId
  http.delete(`${BASE}/credentials/:credentialId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/workspaces/:workspaceId/publishing/schedule
  http.post(`${BASE}/schedule`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: `spost_new_${Date.now()}`,
      ...body,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // GET /api/v1/workspaces/:workspaceId/publishing/calendar
  http.get(`${BASE}/calendar`, () => {
    return HttpResponse.json(mockScheduledPosts);
  }),

  // DELETE /api/v1/workspaces/:workspaceId/publishing/schedule/:postId
  http.delete(`${BASE}/schedule/:postId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
