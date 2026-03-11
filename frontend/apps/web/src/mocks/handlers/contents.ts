import { http, HttpResponse } from 'msw';
import { mockContents, mockContent1, mockSeries, mockSeries1 } from '../data';

const BASE = '*/v1/contents';
const SERIES_BASE = '*/v1/series';

export const contentsHandlers = [
  // GET /v1/contents
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

  // GET /v1/contents/:id
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

  // POST /v1/contents
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

  // PATCH /v1/contents/:id
  http.patch(`${BASE}/:id`, async ({ params, request }) => {
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

  // DELETE /v1/contents/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const seriesHandlers = [
  // GET /v1/series
  http.get(SERIES_BASE, () => {
    return HttpResponse.json({
      data: mockSeries,
      meta: {
        page: 1,
        per_page: 20,
        total: mockSeries.length,
        total_pages: 1,
      },
    });
  }),

  // GET /v1/series/:id
  http.get(`${SERIES_BASE}/:id`, ({ params }) => {
    const series = mockSeries.find((s) => s.id === params.id);
    if (!series) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Series not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(series);
  }),

  // POST /v1/series
  http.post(SERIES_BASE, async ({ request }) => {
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

  // PATCH /v1/series/:id
  http.patch(`${SERIES_BASE}/:id`, async ({ params, request }) => {
    const series = mockSeries.find((s) => s.id === params.id);
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

  // DELETE /v1/series/:id
  http.delete(`${SERIES_BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
