import { http, HttpResponse } from 'msw';
import { mockAuthTokens, mockUser } from '../data';

const BASE = '*/v1/auth';

export const authHandlers = [
  // POST /v1/auth/login
  http.post(`${BASE}/login`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),

  // POST /v1/auth/register
  http.post(`${BASE}/register`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),

  // POST /v1/auth/logout
  http.post(`${BASE}/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /v1/auth/refresh
  http.post(`${BASE}/refresh`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),

  // POST /v1/auth/forgot-password
  http.post(`${BASE}/forgot-password`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /v1/auth/reset-password
  http.post(`${BASE}/reset-password`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /v1/auth/me
  http.get(`${BASE}/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // GET /v1/auth/oauth/:provider
  http.get(`${BASE}/oauth/:provider`, () => {
    return HttpResponse.json({ url: 'https://accounts.google.com/o/oauth2/auth?mock=true' });
  }),

  // POST /v1/auth/oauth/:provider/callback
  http.post(`${BASE}/oauth/:provider/callback`, () => {
    return HttpResponse.json(mockAuthTokens);
  }),
];
