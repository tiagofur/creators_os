import { http, HttpResponse } from 'msw';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  tier: 'free' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockTokens = {
  access_token: 'mock-access-token',
  token_type: 'Bearer' as const,
  expires_in: 3600,
};

const mockIdeas = [
  {
    id: 'idea-1',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    title: 'How to grow on YouTube',
    description: 'A comprehensive guide',
    status: 'inbox',
    stage: 'raw',
    tags: ['youtube'],
    validation_score: null,
    ai_summary: null,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'idea-2',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    title: 'Instagram Reels strategy',
    description: null,
    status: 'validated',
    stage: 'refined',
    tags: ['instagram'],
    validation_score: 85,
    ai_summary: null,
    created_at: '2026-01-11T00:00:00Z',
    updated_at: '2026-01-11T00:00:00Z',
  },
  {
    id: 'idea-3',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    title: 'TikTok trends for creators',
    description: null,
    status: 'inbox',
    stage: 'raw',
    tags: ['tiktok'],
    validation_score: null,
    ai_summary: null,
    created_at: '2026-01-12T00:00:00Z',
    updated_at: '2026-01-12T00:00:00Z',
  },
];

const mockContent = [
  {
    id: 'content-1',
    workspace_id: 'workspace-1',
    idea_id: 'idea-2',
    title: 'YouTube Growth Guide',
    body: null,
    status: 'draft',
    pipeline_stage: 'scripting',
    platform: 'youtube',
    scheduled_at: null,
    published_at: null,
    thumbnail_url: null,
    tags: [],
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'content-2',
    workspace_id: 'workspace-1',
    idea_id: null,
    title: 'Instagram Reel: Day in my life',
    body: null,
    status: 'review',
    pipeline_stage: 'editing',
    platform: 'instagram',
    scheduled_at: null,
    published_at: null,
    thumbnail_url: null,
    tags: [],
    created_at: '2026-01-11T00:00:00Z',
    updated_at: '2026-01-11T00:00:00Z',
  },
];

export const handlers = [
  // POST /v1/auth/login
  http.post(`${API_BASE}/v1/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'test@example.com' && body.password === 'Password1') {
      return HttpResponse.json(mockTokens);
    }

    return HttpResponse.json(
      { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      { status: 401 },
    );
  }),

  // POST /v1/auth/register
  http.post(`${API_BASE}/v1/auth/register`, async () => {
    return HttpResponse.json(mockTokens, { status: 201 });
  }),

  // GET /v1/auth/me
  http.get(`${API_BASE}/v1/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // POST /api/auth/refresh (Next.js proxy)
  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      access_token: 'new-mock-access-token',
      expires_in: 3600,
    });
  }),

  // POST /api/auth/logout (Next.js proxy)
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // GET /v1/ideas
  http.get(`${API_BASE}/v1/ideas`, () => {
    return HttpResponse.json({
      data: mockIdeas,
      meta: { page: 1, per_page: 20, total: mockIdeas.length, total_pages: 1 },
    });
  }),

  // POST /v1/ideas
  http.post(`${API_BASE}/v1/ideas`, async ({ request }) => {
    const body = await request.json() as { title: string };
    return HttpResponse.json(
      {
        id: `idea-${Date.now()}`,
        workspace_id: 'workspace-1',
        user_id: 'user-1',
        title: body.title,
        description: null,
        status: 'inbox',
        stage: 'raw',
        tags: [],
        validation_score: null,
        ai_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // GET /v1/ideas/:id
  http.get(`${API_BASE}/v1/ideas/:id`, ({ params }) => {
    const idea = mockIdeas.find((i) => i.id === params['id']);
    if (!idea) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(idea);
  }),

  // PATCH /v1/ideas/:id
  http.patch(`${API_BASE}/v1/ideas/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const idea = mockIdeas.find((i) => i.id === params['id']);
    if (!idea) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json({ ...idea, ...body, updated_at: new Date().toISOString() });
  }),

  // DELETE /v1/ideas/:id
  http.delete(`${API_BASE}/v1/ideas/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /v1/contents
  http.get(`${API_BASE}/v1/contents`, () => {
    return HttpResponse.json({
      data: mockContent,
      meta: { page: 1, per_page: 20, total: mockContent.length, total_pages: 1 },
    });
  }),

  // POST /v1/contents
  http.post(`${API_BASE}/v1/contents`, async ({ request }) => {
    const body = await request.json() as { title: string };
    return HttpResponse.json(
      {
        id: `content-${Date.now()}`,
        workspace_id: 'workspace-1',
        idea_id: null,
        title: body.title,
        body: null,
        status: 'draft',
        pipeline_stage: 'scripting',
        platform: null,
        scheduled_at: null,
        published_at: null,
        thumbnail_url: null,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // PATCH /v1/contents/:id
  http.patch(`${API_BASE}/v1/contents/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const item = mockContent.find((c) => c.id === params['id']);
    if (!item) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json({ ...item, ...body, updated_at: new Date().toISOString() });
  }),

  // DELETE /v1/contents/:id
  http.delete(`${API_BASE}/v1/contents/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
