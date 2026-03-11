import { http, HttpResponse } from 'msw';
import {
  mockBrandContacts,
  mockBrandContact,
  mockDeals,
  mockDeal,
  mockIncomeEntries,
  mockIncomeEntry,
} from '../data';

const BASE = '*/v1/workspaces/:workspaceId/sponsorships';

export const sponsorshipsHandlers = [
  // ── Brand Contacts ──────────────────────────────────────

  // GET /v1/workspaces/:workspaceId/sponsorships/brands
  http.get(`${BASE}/brands`, () => {
    return HttpResponse.json(mockBrandContacts);
  }),

  // GET /v1/workspaces/:workspaceId/sponsorships/brands/:brandId
  http.get(`${BASE}/brands/:brandId`, ({ params }) => {
    const brand = mockBrandContacts.find((b) => b.id === params.brandId);
    if (!brand) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Brand not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(brand);
  }),

  // POST /v1/workspaces/:workspaceId/sponsorships/brands
  http.post(`${BASE}/brands`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockBrandContact,
      id: `brand_new_${Date.now()}`,
      workspaceId: params.workspaceId,
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // PATCH /v1/workspaces/:workspaceId/sponsorships/brands/:brandId
  http.patch(`${BASE}/brands/:brandId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockBrandContact,
      ...body,
    });
  }),

  // DELETE /v1/workspaces/:workspaceId/sponsorships/brands/:brandId
  http.delete(`${BASE}/brands/:brandId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Deals ───────────────────────────────────────────────

  // GET /v1/workspaces/:workspaceId/sponsorships/deals
  http.get(`${BASE}/deals`, () => {
    return HttpResponse.json(mockDeals);
  }),

  // GET /v1/workspaces/:workspaceId/sponsorships/deals/:dealId
  http.get(`${BASE}/deals/:dealId`, ({ params }) => {
    const deal = mockDeals.find((d) => d.id === params.dealId);
    if (!deal) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Deal not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(deal);
  }),

  // POST /v1/workspaces/:workspaceId/sponsorships/deals
  http.post(`${BASE}/deals`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockDeal,
      id: `deal_new_${Date.now()}`,
      workspaceId: params.workspaceId,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // PATCH /v1/workspaces/:workspaceId/sponsorships/deals/:dealId
  http.patch(`${BASE}/deals/:dealId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockDeal,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // PATCH /v1/workspaces/:workspaceId/sponsorships/deals/:dealId/stage
  http.patch(`${BASE}/deals/:dealId/stage`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockDeal,
      stage: body.stage,
      updatedAt: new Date().toISOString(),
    });
  }),

  // DELETE /v1/workspaces/:workspaceId/sponsorships/deals/:dealId
  http.delete(`${BASE}/deals/:dealId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Income ──────────────────────────────────────────────

  // GET /v1/workspaces/:workspaceId/sponsorships/income
  http.get(`${BASE}/income`, () => {
    return HttpResponse.json(mockIncomeEntries);
  }),

  // POST /v1/workspaces/:workspaceId/sponsorships/income
  http.post(`${BASE}/income`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockIncomeEntry,
      id: `inc_new_${Date.now()}`,
      ...body,
    }, { status: 201 });
  }),

  // DELETE /v1/workspaces/:workspaceId/sponsorships/income/:incomeId
  http.delete(`${BASE}/income/:incomeId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
