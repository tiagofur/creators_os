'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { SPONSORSHIPS_CACHE } from '@/lib/query-config';
import { createSponsorshipsResource } from '@ordo/api-client';
import type { SponsorshipDeal } from '@ordo/types';

const sponsorshipsApi = createSponsorshipsResource(apiClient);

// --- Sponsorships CRUD ---

export function useSponsorships(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.sponsorships.deals(workspaceId),
    queryFn: () => sponsorshipsApi.list(workspaceId),
    enabled: Boolean(workspaceId),
    ...SPONSORSHIPS_CACHE,
  });
}

export function useSponsorship(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.sponsorships.deal(id),
    queryFn: () => sponsorshipsApi.get(workspaceId, id),
    enabled: Boolean(workspaceId) && Boolean(id),
    ...SPONSORSHIPS_CACHE,
  });
}

export function useCreateSponsorship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;
    }) => sponsorshipsApi.create(workspaceId, body),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
    },
  });
}

export function useUpdateSponsorship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      body,
    }: {
      workspaceId: string;
      id: string;
      body: Partial<Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>;
    }) => sponsorshipsApi.update(workspaceId, id, body),
    onSuccess: (_data, { workspaceId, id }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deal(id),
      });
    },
  });
}

export function useDeleteSponsorship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id }: { workspaceId: string; id: string }) =>
      sponsorshipsApi.delete(workspaceId, id),
    onSuccess: (_data, { workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sponsorships.deals(workspaceId),
      });
    },
  });
}

// --- Messages ---

export function useSponsorshipMessages(workspaceId: string, sponsorshipId: string) {
  return useQuery({
    queryKey: [...queryKeys.sponsorships.deal(sponsorshipId), 'messages'],
    queryFn: () => sponsorshipsApi.listMessages(workspaceId, sponsorshipId),
    enabled: Boolean(workspaceId) && Boolean(sponsorshipId),
  });
}

export function useAddSponsorshipMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      sponsorshipId,
      body,
    }: {
      workspaceId: string;
      sponsorshipId: string;
      body: unknown;
    }) => sponsorshipsApi.addMessage(workspaceId, sponsorshipId, body),
    onSuccess: (_data, { sponsorshipId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.sponsorships.deal(sponsorshipId), 'messages'],
      });
    },
  });
}
