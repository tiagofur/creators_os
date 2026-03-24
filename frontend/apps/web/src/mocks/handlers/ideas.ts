import { http, HttpResponse } from 'msw';
import { mockIdeas, mockIdea1 } from '../data';

const BASE = '*/api/v1/workspaces/:workspaceId/ideas';

export const ideasHandlers = [
  // GET /api/v1/workspaces/:workspaceId/ideas
  http.get(BASE, () => {
    return HttpResponse.json({
      data: mockIdeas,
      meta: {
        page: 1,
        per_page: 20,
        total: mockIdeas.length,
        total_pages: 1,
      },
    });
  }),

  // GET /api/v1/workspaces/:workspaceId/ideas/:id
  http.get(`${BASE}/:id`, ({ params }) => {
    const idea = mockIdeas.find((i) => i.id === params.id);
    if (!idea) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Idea not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(idea);
  }),

  // POST /api/v1/workspaces/:workspaceId/ideas
  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newIdea = {
      ...mockIdea1,
      id: `idea_new_${Date.now()}`,
      ...body,
      status: 'inbox' as const,
      stage: 'raw' as const,
      validation_score: null,
      ai_summary: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newIdea, { status: 201 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/ideas/:id
  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idea = mockIdeas.find((i) => i.id === params.id);
    if (!idea) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Idea not found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...idea,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/ideas/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/workspaces/:workspaceId/ideas/:id/validate
  http.post(`${BASE}/:id/validate`, () => {
    return new HttpResponse(null, { status: 202 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/ideas/:id/tags
  http.put(`${BASE}/:id/tags`, async ({ params, request }) => {
    const idea = mockIdeas.find((i) => i.id === params.id);
    if (!idea) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Idea not found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...idea,
      tags: body.tags,
      updated_at: new Date().toISOString(),
    });
  }),

  // POST /api/v1/workspaces/:workspaceId/ideas/:id/promote
  http.post(`${BASE}/:id/promote`, ({ params }) => {
    const idea = mockIdeas.find((i) => i.id === params.id);
    if (!idea) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Idea not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      ...idea,
      status: 'promoted',
      updated_at: new Date().toISOString(),
    });
  }),
];
