import { http, HttpResponse } from 'msw';
import { mockSubscription, mockInvoices, mockUsageSummary } from '../data';

const BASE = '*/v1/billing';

export const billingHandlers = [
  // GET /v1/billing/subscription
  http.get(`${BASE}/subscription`, () => {
    return HttpResponse.json(mockSubscription);
  }),

  // GET /v1/billing/invoices
  http.get(`${BASE}/invoices`, () => {
    return HttpResponse.json(mockInvoices);
  }),

  // POST /v1/billing/checkout
  http.post(`${BASE}/checkout`, () => {
    return HttpResponse.json({ url: 'https://checkout.stripe.com/mock-session-id' });
  }),

  // POST /v1/billing/portal
  http.post(`${BASE}/portal`, () => {
    return HttpResponse.json({ url: 'https://billing.stripe.com/mock-portal-id' });
  }),

  // POST /v1/billing/cancel
  http.post(`${BASE}/cancel`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /v1/billing/reactivate
  http.post(`${BASE}/reactivate`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /v1/billing/usage
  http.get(`${BASE}/usage`, () => {
    return HttpResponse.json(mockUsageSummary);
  }),
];
