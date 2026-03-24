import { http, HttpResponse } from 'msw';
import {
  mockDeals,
  mockDeal,
} from '../data';

const BASE = '*/api/v1/workspaces/:workspaceId/sponsorships';

export const sponsorshipsHandlers = [
  // GET /api/v1/workspaces/:workspaceId/sponsorships
  http.get(BASE, () => {
    return HttpResponse.json(mockDeals);
  }),

  // GET /api/v1/workspaces/:workspaceId/sponsorships/:id
  http.get(`${BASE}/:id`, ({ params }) => {
    const deal = mockDeals.find((d) => d.id === params.id);
    if (!deal) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Sponsorship not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(deal);
  }),

  // POST /api/v1/workspaces/:workspaceId/sponsorships
  http.post(BASE, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockDeal,
      id: `deal_new_${Date.now()}`,
      workspaceId: params.workspaceId,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/sponsorships/:id
  http.put(`${BASE}/:id`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockDeal,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/sponsorships/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/workspaces/:workspaceId/sponsorships/:id/messages
  http.post(`${BASE}/:id/messages`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: `msg_new_${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // GET /api/v1/workspaces/:workspaceId/sponsorships/:id/messages
  http.get(`${BASE}/:id/messages`, () => {
    return HttpResponse.json([]);
  }),
];
