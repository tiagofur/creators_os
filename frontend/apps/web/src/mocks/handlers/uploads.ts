import { http, HttpResponse } from 'msw';

const BASE = '*/api/v1/uploads';

export const uploadsHandlers = [
  // POST /api/v1/uploads/presign
  http.post(`${BASE}/presign`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      upload_url: `https://s3.example.com/uploads/mock-key.${body.file_extension ?? 'bin'}?signature=mock`,
      object_key: `uploads/${body.workspace_id}/mock-key.${body.file_extension ?? 'bin'}`,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    });
  }),

  // POST /api/v1/uploads/confirm
  http.post(`${BASE}/confirm`, () => {
    return HttpResponse.json({
      message: 'Upload confirmed successfully',
    });
  }),

  // GET /api/v1/uploads/:objectKey
  http.get(`${BASE}/:objectKey`, () => {
    return HttpResponse.json({
      download_url: 'https://s3.example.com/downloads/mock-key.bin?signature=mock',
    });
  }),
];
