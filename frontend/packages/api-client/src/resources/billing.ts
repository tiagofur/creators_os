import type { OrdoApiClient } from '../client';

export type BillingPeriod = 'monthly' | 'annual';

export function createBillingResource(client: OrdoApiClient) {
  return {
    createCheckoutSession(tier: string, billingPeriod: BillingPeriod): Promise<{ url: string }> {
      return client.post<{ url: string }>('/api/v1/billing/checkout', { tier, billingPeriod });
    },

    createPortalSession(): Promise<{ url: string }> {
      return client.post<{ url: string }>('/api/v1/billing/portal');
    },
  };
}
