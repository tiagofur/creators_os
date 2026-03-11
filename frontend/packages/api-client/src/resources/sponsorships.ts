import type { OrdoApiClient } from '../client';
import type {
  BrandContact,
  SponsorshipDeal,
  IncomeEntry,
  DealStage,
} from '@ordo/types';

export interface DealFilters {
  stage?: DealStage;
  brandContactId?: string;
}

export function createSponsorshipsResource(client: OrdoApiClient) {
  return {
    // Brand contacts
    listBrands(workspaceId: string): Promise<BrandContact[]> {
      return client.get<BrandContact[]>(
        `/v1/workspaces/${workspaceId}/sponsorships/brands`,
      );
    },

    getBrand(workspaceId: string, brandId: string): Promise<BrandContact> {
      return client.get<BrandContact>(
        `/v1/workspaces/${workspaceId}/sponsorships/brands/${brandId}`,
      );
    },

    createBrand(
      workspaceId: string,
      body: Omit<BrandContact, 'id' | 'workspaceId' | 'createdAt'>,
    ): Promise<BrandContact> {
      return client.post<BrandContact>(
        `/v1/workspaces/${workspaceId}/sponsorships/brands`,
        body,
      );
    },

    updateBrand(
      workspaceId: string,
      brandId: string,
      body: Partial<Omit<BrandContact, 'id' | 'workspaceId' | 'createdAt'>>,
    ): Promise<BrandContact> {
      return client.patch<BrandContact>(
        `/v1/workspaces/${workspaceId}/sponsorships/brands/${brandId}`,
        body,
      );
    },

    deleteBrand(workspaceId: string, brandId: string): Promise<void> {
      return client.delete<void>(
        `/v1/workspaces/${workspaceId}/sponsorships/brands/${brandId}`,
      );
    },

    // Deals
    listDeals(workspaceId: string, filters?: DealFilters): Promise<SponsorshipDeal[]> {
      const params = new URLSearchParams();
      if (filters?.stage) params.set('stage', filters.stage);
      if (filters?.brandContactId) params.set('brand_contact_id', filters.brandContactId);
      const query = params.toString();
      return client.get<SponsorshipDeal[]>(
        `/v1/workspaces/${workspaceId}/sponsorships/deals${query ? `?${query}` : ''}`,
      );
    },

    getDeal(workspaceId: string, dealId: string): Promise<SponsorshipDeal> {
      return client.get<SponsorshipDeal>(
        `/v1/workspaces/${workspaceId}/sponsorships/deals/${dealId}`,
      );
    },

    createDeal(
      workspaceId: string,
      body: Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'brandContact' | 'createdAt' | 'updatedAt'>,
    ): Promise<SponsorshipDeal> {
      return client.post<SponsorshipDeal>(
        `/v1/workspaces/${workspaceId}/sponsorships/deals`,
        body,
      );
    },

    updateDeal(
      workspaceId: string,
      dealId: string,
      body: Partial<Omit<SponsorshipDeal, 'id' | 'workspaceId' | 'brandContact' | 'createdAt' | 'updatedAt'>>,
    ): Promise<SponsorshipDeal> {
      return client.patch<SponsorshipDeal>(
        `/v1/workspaces/${workspaceId}/sponsorships/deals/${dealId}`,
        body,
      );
    },

    moveDealStage(
      workspaceId: string,
      dealId: string,
      stage: DealStage,
    ): Promise<SponsorshipDeal> {
      return client.patch<SponsorshipDeal>(
        `/v1/workspaces/${workspaceId}/sponsorships/deals/${dealId}/stage`,
        { stage },
      );
    },

    deleteDeal(workspaceId: string, dealId: string): Promise<void> {
      return client.delete<void>(
        `/v1/workspaces/${workspaceId}/sponsorships/deals/${dealId}`,
      );
    },

    // Income
    listIncome(workspaceId: string): Promise<IncomeEntry[]> {
      return client.get<IncomeEntry[]>(
        `/v1/workspaces/${workspaceId}/sponsorships/income`,
      );
    },

    addIncome(
      workspaceId: string,
      body: Omit<IncomeEntry, 'id'>,
    ): Promise<IncomeEntry> {
      return client.post<IncomeEntry>(
        `/v1/workspaces/${workspaceId}/sponsorships/income`,
        body,
      );
    },

    deleteIncome(workspaceId: string, incomeId: string): Promise<void> {
      return client.delete<void>(
        `/v1/workspaces/${workspaceId}/sponsorships/income/${incomeId}`,
      );
    },
  };
}
