import { http, HttpResponse } from 'msw';
import { mockAuthTokens, mockUser } from '../data';

const BASE = '*/api/v1/auth';

export const authHandlers = [
  // POST /api/v1/auth/login
  http.post(`${BASE}/login`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),

  // POST /api/v1/auth/register
  http.post(`${BASE}/register`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),

  // POST /api/v1/auth/logout
  http.post(`${BASE}/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/auth/logout-all
  http.post(`${BASE}/logout-all`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/auth/refresh
  http.post(`${BASE}/refresh`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),

  // POST /api/v1/auth/forgot-password
  http.post(`${BASE}/forgot-password`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/auth/reset-password
  http.post(`${BASE}/reset-password`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/v1/auth/verify-email
  http.get(`${BASE}/verify-email`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/v1/users/me
  http.get('*/api/v1/users/me', () => {
    return HttpResponse.json(mockUser);
  }),

  // PUT /api/v1/users/me
  http.put('*/api/v1/users/me', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockUser,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // GET /api/v1/auth/oauth/:provider
  http.get(`${BASE}/oauth/:provider`, () => {
    return HttpResponse.json({ url: 'https://accounts.google.com/o/oauth2/auth?mock=true' });
  }),

  // GET /api/v1/auth/oauth/:provider/callback
  http.get(`${BASE}/oauth/:provider/callback`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),
];
