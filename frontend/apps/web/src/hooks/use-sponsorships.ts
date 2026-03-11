'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { SPONSORSHIPS_CACHE } from '@/lib/query-config';
import { createSponsorshipsResource } from '@ordo/api-client';
import type { BrandContact, SponsorshipDeal, DealStage } from '@ordo/types';
import type { DealFilters } from '@ordo/api-client';

const sponsorshipsApi = createSponsorshipsResource(apiClient);

// --- Brand contacts ---

export function useBrandContacts(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.sponsorships.brands(workspaceId),
    queryFn: () => sponsorshipsApi.listBrands(workspaceId),
    enabled: Boolean(workspaceId),
    ...SPONSORSHIPS_CACHE,
  });
}

export function useBrandContact(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.sponsorships.brand(id),
    queryFn: () => sponsorshipsApi.getBrand(workspaceId, id),
    enabled: Boolean(workspaceId) && Boolean(id),
    ...SPONSORSHIPS_CACHE,
  });
}

export function useCreateBrandContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: Omit<BrandContact, 'id' | 'workspaceId' | 'createdAt'>;
    }) => sponsorshipsApi.createBrand(workspaceId, body),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.brands(workspaceId),
      });
    },
  });
}

export function useUpdateBrandContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      brandId,
      body,
    }: {
      workspaceId: string;
      brandId: string;
      body: Partial<Omit<BrandContact, 'id' | 'workspaceId' | 'createdAt'>>;
    }) => sponsorshipsApi.updateBrand(workspaceId, brandId, body),
    onSuccess: (_data, { workspaceId, brandId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.brands(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.brand(brandId),
      });
    },
  });
}

export function useDeleteBrandContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, brandId }: { workspaceId: string; brandId: string }) =>
      sponsorshipsApi.deleteBrand(workspaceId, brandId),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.brands(workspaceId),
      });
    },
  });
}

// --- Deals ---

export function useSponsorshipDeals(workspaceId: string, filters?: DealFilters) {
  return useQuery({
    queryKey: queryKeys.sponsorships.deals(workspaceId, filters as Record<string, unknown>),
    queryFn: () => sponsorshipsApi.listDeals(workspaceId, filters),
    enabled: Boolean(workspaceId),
    ...SPONSORSHIPS_CACHE,
  });
}

export function useSponsorshipDeal(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.sponsorships.deal(id),
    queryFn: () => sponsorshipsApi.getDeal(workspaceId, id),
    enabled: Boolean(workspaceId) && Boolean(id),
    ...SPONSORSHIPS_CACHE,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'brandContact' | 'createdAt' | 'updatedAt'>;
    }) => sponsorshipsApi.createDeal(workspaceId, body),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      dealId,
      body,
    }: {
      workspaceId: string;
      dealId: string;
      body: Partial<Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'brandContact' | 'createdAt' | 'updatedAt'>>;
    }) => sponsorshipsApi.updateDeal(workspaceId, dealId, body),
    onSuccess: (_data, { workspaceId, dealId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deal(dealId),
      });
    },
  });
}

export function useMoveDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      dealId,
      stage,
    }: {
      workspaceId: string;
      dealId: string;
      stage: DealStage;
    }) => sponsorshipsApi.moveDealStage(workspaceId, dealId, stage),
    onMutate: async ({ workspaceId, dealId, stage }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
      const previousDeals = queryClient.getQueryData<SponsorshipDeal[]>(
        queryKeys.sponsorships.deals(workspaceId),
      );
      if (previousDeals) {
        queryClient.setQueryData<SponsorshipDeal[]>(
          queryKeys.sponsorships.deals(workspaceId),
          previousDeals.map((d) => (d.id === dealId ? { ...d, stage } : d)),
        );
      }
      return { previousDeals };
    },
    onError: (_err, { workspaceId }, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(
          queryKeys.sponsorships.deals(workspaceId),
          context.previousDeals,
        );
      }
    },
    onSettled: (_data, _err, { workspaceId, dealId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deal(dealId),
      });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, dealId }: { workspaceId: string; dealId: string }) =>
      sponsorshipsApi.deleteDeal(workspaceId, dealId),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
    },
  });
}

// --- Income ---

export function useIncomeEntries(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.sponsorships.income(workspaceId),
    queryFn: () => sponsorshipsApi.listIncome(workspaceId),
    enabled: Boolean(workspaceId),
    ...SPONSORSHIPS_CACHE,
  });
}

export function useAddIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: Omit<import('@ordo/types').IncomeEntry, 'id'>;
    }) => sponsorshipsApi.addIncome(workspaceId, body),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.income(workspaceId),
      });
    },
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, incomeId }: { workspaceId: string; incomeId: string }) =>
      sponsorshipsApi.deleteIncome(workspaceId, incomeId),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.income(workspaceId),
      });
    },
  });
}
