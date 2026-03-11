import { http, HttpResponse } from 'msw';
import { mockIdeas, mockIdea1 } from '../data';

const BASE = '*/v1/ideas';

export const ideasHandlers = [
  // GET /v1/ideas
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

  // GET /v1/ideas/:id
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

  // POST /v1/ideas
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

  // PATCH /v1/ideas/:id
  http.patch(`${BASE}/:id`, async ({ params, request }) => {
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

  // DELETE /v1/ideas/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
