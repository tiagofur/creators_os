import type { Subscription, Invoice, UsageSummary } from '@ordo/types';

export const mockSubscription: Subscription = {
  id: 'sub_01HQSUB111111111',
  tier: 'pro',
  status: 'active',
  currentPeriodStart: '2025-01-01T00:00:00.000Z',
  currentPeriodEnd: '2025-02-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
};

export const mockInvoices: Invoice[] = [
  {
    id: 'inv_01HQINV111111111',
    amount: 12,
    currency: 'USD',
    status: 'paid',
    createdAt: '2025-01-01T00:00:00.000Z',
    pdfUrl: 'https://example.com/invoices/inv_01.pdf',
  },
  {
    id: 'inv_02HQINV222222222',
    amount: 12,
    currency: 'USD',
    status: 'paid',
    createdAt: '2024-12-01T00:00:00.000Z',
    pdfUrl: 'https://example.com/invoices/inv_02.pdf',
  },
];

export const mockUsageSummary: UsageSummary = {
  ideasThisMonth: 14,
  workspacesCount: 2,
  aiCreditsUsed: 156,
  teamMembersCount: 2,
};
