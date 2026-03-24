import { http, HttpResponse } from 'msw';

const BASE = '*/api/v1/workspaces/:workspaceId/remix';

export const remixHandlers = [
  // POST /api/v1/workspaces/:workspaceId/remix/analyze
  http.post(`${BASE}/analyze`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      job_id: `remix_job_${Date.now()}`,
      status_url: `/api/v1/workspaces/ws_mock/remix/remix_job_${Date.now()}/status`,
      status: 'queued',
      input_url: body.input_url,
    }, { status: 202 });
  }),

  // GET /api/v1/workspaces/:workspaceId/remix/:jobId/status
  http.get(`${BASE}/:jobId/status`, ({ params }) => {
    return HttpResponse.json({
      id: params.jobId,
      status: 'completed',
      progress: 100,
      created_at: '2025-01-10T10:00:00.000Z',
      updated_at: new Date().toISOString(),
    });
  }),

  // GET /api/v1/workspaces/:workspaceId/remix/:jobId/results
  http.get(`${BASE}/:jobId/results`, () => {
    return HttpResponse.json({
      clips: [
        {
          id: 'clip_01',
          title: 'Key highlight clip',
          start_time: 30,
          end_time: 90,
          score: 0.92,
        },
        {
          id: 'clip_02',
          title: 'Interesting moment',
          start_time: 180,
          end_time: 240,
          score: 0.85,
        },
      ],
    });
  }),

  // POST /api/v1/workspaces/:workspaceId/remix/:jobId/apply
  http.post(`${BASE}/:jobId/apply`, () => {
    return HttpResponse.json([
      {
        id: `cnt_remix_${Date.now()}`,
        title: 'Remixed clip',
        status: 'draft',
        pipeline_stage: 'idea',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ], { status: 201 });
  }),
];
