import { http, HttpResponse } from 'msw';

const BASE = '*/v1/team';

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
}

const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm_01HQTM1111111111',
    userId: 'usr_01HQXYZ123456789',
    name: 'Alex Rivera',
    email: 'creator@example.com',
    role: 'owner',
    joinedAt: '2024-06-15T11:00:00.000Z',
  },
  {
    id: 'tm_02HQTM2222222222',
    userId: 'usr_02HQCOLLABORATOR',
    name: 'Jordan Lee',
    email: 'jordan@example.com',
    role: 'editor',
    joinedAt: '2024-08-20T14:00:00.000Z',
  },
];

export const teamHandlers = [
  // GET /v1/team
  http.get(BASE, () => {
    return HttpResponse.json(mockTeamMembers);
  }),

  // POST /v1/team
  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: `tm_new_${Date.now()}`,
      userId: `usr_new_${Date.now()}`,
      ...body,
      joinedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // DELETE /v1/team/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
