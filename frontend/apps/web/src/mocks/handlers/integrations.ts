import { http, HttpResponse } from 'msw';

const BASE = '*/api/v1/integrations';

interface Integration {
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt: string;
  scopes: string[];
}

const mockIntegrations: Integration[] = [
  {
    id: 'intg_01HQINT111111111',
    provider: 'youtube',
    status: 'connected',
    connectedAt: '2024-08-10T09:00:00.000Z',
    scopes: ['readonly', 'upload'],
  },
  {
    id: 'intg_02HQINT222222222',
    provider: 'github',
    status: 'connected',
    connectedAt: '2024-09-15T14:00:00.000Z',
    scopes: ['repo'],
  },
];

export const integrationsHandlers = [
  // GET /api/v1/integrations
  http.get(BASE, () => {
    return HttpResponse.json(mockIntegrations);
  }),

  // POST /api/v1/integrations
  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: `intg_new_${Date.now()}`,
      provider: body.provider,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      scopes: body.scopes ?? [],
    }, { status: 201 });
  }),

  // DELETE /api/v1/integrations/:id
  http.delete(`${BASE}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
