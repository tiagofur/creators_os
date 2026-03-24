import { http, HttpResponse } from 'msw';
import { mockSeries, mockSeries1 } from '../data';

const BASE = '*/api/v1/workspaces/:workspaceId/series';

export const seriesHandlers = [
  // GET /api/v1/workspaces/:workspaceId/series
  http.get(BASE, () => {
    return HttpResponse.json(mockSeries);
  }),

  // GET /api/v1/workspaces/:workspaceId/series/:seriesId
  http.get(`${BASE}/:seriesId`, ({ params }) => {
    const series = mockSeries.find((s) => s.id === params.seriesId);
    if (!series) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Series not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(series);
  }),

  // POST /api/v1/workspaces/:workspaceId/series
  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newSeries = {
      ...mockSeries1,
      id: `ser_new_${Date.now()}`,
      ...body,
      content_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newSeries, { status: 201 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/series/:seriesId
  http.put(`${BASE}/:seriesId`, async ({ params, request }) => {
    const series = mockSeries.find((s) => s.id === params.seriesId);
    if (!series) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Series not found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...series,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/series/:seriesId
  http.delete(`${BASE}/:seriesId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/workspaces/:workspaceId/series/:seriesId/episodes
  http.post(`${BASE}/:seriesId/episodes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: `ep_new_${Date.now()}`,
      ...body,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/series/:seriesId/episodes/:episodeId
  http.put(`${BASE}/:seriesId/episodes/:episodeId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 'ep_01',
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/series/:seriesId/episodes/:episodeId
  http.delete(`${BASE}/:seriesId/episodes/:episodeId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // PUT /api/v1/workspaces/:workspaceId/series/:seriesId/schedule
  http.put(`${BASE}/:seriesId/schedule`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: `sched_${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),
];
