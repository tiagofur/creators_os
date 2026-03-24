import { http, HttpResponse } from 'msw';
import {
  mockWorkspaces,
  mockWorkspace,
  mockWorkspaceMembers,
  mockWorkspaceInvitation,
} from '../data';

const BASE = '*/api/v1/workspaces';

export const workspacesHandlers = [
  // GET /api/v1/workspaces
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

  // GET /api/v1/workspaces/:id
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

  // POST /api/v1/workspaces
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

  // PUT /api/v1/workspaces/:id
  http.put(`${BASE}/:id`, async ({ params, request }) => {
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

  // DELETE /api/v1/workspaces/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/v1/workspaces/:id/members
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

  // PUT /api/v1/workspaces/:workspaceId/members/:userId/role
  http.put(`${BASE}/:workspaceId/members/:userId/role`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ role: body.role });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/members/:userId
  http.delete(`${BASE}/:workspaceId/members/:userId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/workspaces/:id/invitations
  http.post(`${BASE}/:id/invitations`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockWorkspaceInvitation,
      id: `inv_new_${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // GET /api/v1/workspaces/:id/invitations
  http.get(`${BASE}/:id/invitations`, () => {
    return HttpResponse.json([mockWorkspaceInvitation]);
  }),

  // DELETE /api/v1/workspaces/:workspaceId/invitations/:invitationId
  http.delete(`${BASE}/:workspaceId/invitations/:invitationId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/invitations/:token/accept
  http.post('*/api/v1/invitations/:token/accept', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
