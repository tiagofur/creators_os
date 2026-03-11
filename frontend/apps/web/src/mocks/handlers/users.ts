import { http, HttpResponse } from 'msw';
import { mockUser, mockUserProfile } from '../data';

const BASE = '*/v1/users';

export const usersHandlers = [
  // GET /v1/users/me (alias — primary is /v1/auth/me)
  http.get(`${BASE}/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // PATCH /v1/users/me
  http.patch(`${BASE}/me`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockUser,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  // GET /v1/users/me/profile
  http.get(`${BASE}/me/profile`, () => {
    return HttpResponse.json(mockUserProfile);
  }),

  // PATCH /v1/users/me/profile
  http.patch(`${BASE}/me/profile`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockUserProfile,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),
];
