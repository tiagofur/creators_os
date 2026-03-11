import type { OrdoApiClient } from '../client';
import type { Subscription, Invoice, UsageSummary } from '@ordo/types';

export type BillingPeriod = 'monthly' | 'annual';

export function createBillingResource(client: OrdoApiClient) {
  return {
    getSubscription(): Promise<Subscription> {
      return client.get<Subscription>('/v1/billing/subscription');
    },

    getInvoices(): Promise<Invoice[]> {
      return client.get<Invoice[]>('/v1/billing/invoices');
    },

    createCheckoutSession(tier: string, billingPeriod: BillingPeriod): Promise<{ url: string }> {
      return client.post<{ url: string }>('/v1/billing/checkout', { tier, billingPeriod });
    },

    createPortalSession(): Promise<{ url: string }> {
      return client.post<{ url: string }>('/v1/billing/portal');
    },

    cancelSubscription(): Promise<void> {
      return client.post<void>('/v1/billing/cancel');
    },

    reactivateSubscription(): Promise<void> {
      return client.post<void>('/v1/billing/reactivate');
    },

    getUsage(): Promise<UsageSummary> {
      return client.get<UsageSummary>('/v1/billing/usage');
    },
  };
}
