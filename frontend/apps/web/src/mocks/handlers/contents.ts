import { http, HttpResponse } from 'msw';
import { mockContents, mockContent1 } from '../data';

const BASE = '*/api/v1/workspaces/:workspaceId/contents';

export const contentsHandlers = [
  // GET /api/v1/workspaces/:workspaceId/contents
  http.get(BASE, () => {
    return HttpResponse.json({
      data: mockContents,
      meta: {
        page: 1,
        per_page: 20,
        total: mockContents.length,
        total_pages: 1,
      },
    });
  }),

  // GET /api/v1/workspaces/:workspaceId/contents/:id
  http.get(`${BASE}/:id`, ({ params }) => {
    const item = mockContents.find((c) => c.id === params.id);
    if (!item) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Content not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(item);
  }),

  // POST /api/v1/workspaces/:workspaceId/contents
  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newContent = {
      ...mockContent1,
      id: `cnt_new_${Date.now()}`,
      ...body,
      status: 'draft' as const,
      pipeline_stage: 'idea' as const,
      scheduled_at: null,
      published_at: null,
      thumbnail_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newContent, { status: 201 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/contents/:id
  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const item = mockContents.find((c) => c.id === params.id);
    if (!item) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Content not found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...item,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/contents/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/contents/:id/status
  http.put(`${BASE}/:id/status`, async ({ params, request }) => {
    const item = mockContents.find((c) => c.id === params.id);
    if (!item) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Content not found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...item,
      status: body.status,
      updated_at: new Date().toISOString(),
    });
  }),

  // POST /api/v1/workspaces/:workspaceId/contents/:contentId/assignments
  http.post(`${BASE}/:contentId/assignments`, () => {
    return new HttpResponse(null, { status: 201 });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/contents/:contentId/assignments/:userId
  http.delete(`${BASE}/:contentId/assignments/:userId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
