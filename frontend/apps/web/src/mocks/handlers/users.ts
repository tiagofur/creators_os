import { http, HttpResponse } from 'msw';
import { mockUser, mockUserProfile } from '../data';

const BASE = '*/api/v1/users';

export const usersHandlers = [
  // GET /api/v1/users/me (alias -- primary is in auth handlers)
  http.get(`${BASE}/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // PUT /api/v1/users/me
  http.put(`${BASE}/me`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockUser,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // GET /api/v1/users/me/profile
  http.get(`${BASE}/me/profile`, () => {
    return HttpResponse.json(mockUserProfile);
  }),

  // PUT /api/v1/users/me/profile
  http.put(`${BASE}/me/profile`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockUserProfile,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),
];
