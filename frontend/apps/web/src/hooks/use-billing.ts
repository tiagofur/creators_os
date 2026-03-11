'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { BILLING_CACHE } from '@/lib/query-config';
import type { Subscription, Invoice, UsageSummary, SubscriptionTier } from '@ordo/types';
import type { BillingPeriod } from '@ordo/api-client';

const BILLING_KEYS = {
  all: ['billing'] as const,
  subscription: () => ['billing', 'subscription'] as const,
  invoices: () => ['billing', 'invoices'] as const,
  usage: () => ['billing', 'usage'] as const,
};

export function useSubscription() {
  return useQuery({
    queryKey: BILLING_KEYS.subscription(),
    queryFn: () => apiClient.get<Subscription>('/v1/billing/subscription'),
    ...BILLING_CACHE,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: BILLING_KEYS.invoices(),
    queryFn: () => apiClient.get<Invoice[]>('/v1/billing/invoices'),
    ...BILLING_CACHE,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: BILLING_KEYS.usage(),
    queryFn: () => apiClient.get<UsageSummary>('/v1/billing/usage'),
    ...BILLING_CACHE,
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: ({ tier, billingPeriod }: { tier: SubscriptionTier; billingPeriod: BillingPeriod }) =>
      apiClient.post<{ url: string }>('/v1/billing/checkout', { tier, billingPeriod }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error('Failed to start checkout. Please try again.');
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: () => apiClient.post<{ url: string }>('/v1/billing/portal'),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error('Failed to open billing portal. Please try again.');
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<void>('/v1/billing/cancel'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription() });
      toast.success('Your subscription will cancel at the end of the billing period.');
    },
    onError: () => {
      toast.error('Failed to cancel subscription. Please try again.');
    },
  });
}

export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<void>('/v1/billing/reactivate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription() });
      toast.success('Your subscription has been reactivated.');
    },
    onError: () => {
      toast.error('Failed to reactivate subscription. Please try again.');
    },
  });
}

export { BILLING_KEYS };
