import { http, HttpResponse } from 'msw';
import {
  mockWorkspaces,
  mockWorkspace,
  mockWorkspaceMembers,
  mockWorkspaceInvitation,
} from '../data';

const BASE = '*/v1/workspaces';

export const workspacesHandlers = [
  // GET /v1/workspaces
  http.get(BASE, () => {
    return HttpResponse.json({
      data: mockWorkspaces,
      meta: {
        page: 1,
        per_page: 20,
        total: mockWorkspaces.length,
        total_pages: 1,
      },
    });
  }),

  // GET /v1/workspaces/:id
  http.get(`${BASE}/:id`, ({ params }) => {
    const ws = mockWorkspaces.find((w) => w.id === params.id);
    if (!ws) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Workspace not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(ws);
  }),

  // POST /v1/workspaces
  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newWs = {
      ...mockWorkspace,
      id: `ws_new_${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newWs, { status: 201 });
  }),

  // PATCH /v1/workspaces/:id
  http.patch(`${BASE}/:id`, async ({ params, request }) => {
    const ws = mockWorkspaces.find((w) => w.id === params.id);
    if (!ws) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Workspace not found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...ws,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // DELETE /v1/workspaces/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /v1/workspaces/:id/members
  http.get(`${BASE}/:id/members`, () => {
    return HttpResponse.json({
      data: mockWorkspaceMembers,
      meta: {
        page: 1,
        per_page: 20,
        total: mockWorkspaceMembers.length,
        total_pages: 1,
      },
    });
  }),

  // POST /v1/workspaces/:id/members/invite
  http.post(`${BASE}/:id/members/invite`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockWorkspaceInvitation,
      id: `inv_new_${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // DELETE /v1/workspaces/:workspaceId/members/:userId
  http.delete(`${BASE}/:workspaceId/members/:userId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
