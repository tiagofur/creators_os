import type { BrandContact, SponsorshipDeal, IncomeEntry } from '@ordo/types';
import { mockWorkspace } from './workspaces';

export const mockBrandContact: BrandContact = {
  id: 'brand_01HQBRAND1111111',
  workspaceId: mockWorkspace.id,
  companyName: 'DevTools Inc.',
  contactName: 'Sarah Chen',
  email: 'sarah@devtools.io',
  website: 'https://devtools.io',
  niche: 'developer-tools',
  notes: 'Met at ReactConf 2024. Interested in long-term partnership.',
  createdAt: '2024-10-15T09:00:00.000Z',
};

export const mockBrandContact2: BrandContact = {
  id: 'brand_02HQBRAND2222222',
  workspaceId: mockWorkspace.id,
  companyName: 'CloudPlatform Co.',
  contactName: 'Mike Johnson',
  email: 'mike@cloudplatform.com',
  website: 'https://cloudplatform.com',
  niche: 'cloud-hosting',
  createdAt: '2024-11-20T14:00:00.000Z',
};

export const mockBrandContacts: BrandContact[] = [mockBrandContact, mockBrandContact2];

export const mockDeal: SponsorshipDeal = {
  id: 'deal_01HQDEAL11111111',
  workspaceId: mockWorkspace.id,
  brandContactId: mockBrandContact.id,
  brandContact: mockBrandContact,
  title: 'TypeScript Course Sponsorship',
  stage: 'Contracted',
  value: 3000,
  currency: 'USD',
  platform: 'youtube',
  contentType: 'dedicated',
  deliverableDate: '2025-02-01',
  publishDate: '2025-02-15',
  notes: '60-second mid-roll integration',
  createdAt: '2025-01-05T10:00:00.000Z',
  updatedAt: '2025-01-10T11:00:00.000Z',
};

export const mockDeal2: SponsorshipDeal = {
  id: 'deal_02HQDEAL22222222',
  workspaceId: mockWorkspace.id,
  brandContactId: mockBrandContact2.id,
  brandContact: mockBrandContact2,
  title: 'Cloud Hosting Integration',
  stage: 'Outreach',
  value: 1500,
  currency: 'USD',
  platform: 'youtube',
  contentType: 'integration',
  notes: 'Initial outreach email sent',
  createdAt: '2025-01-08T16:00:00.000Z',
  updatedAt: '2025-01-08T16:00:00.000Z',
};

export const mockDeals: SponsorshipDeal[] = [mockDeal, mockDeal2];

export const mockIncomeEntry: IncomeEntry = {
  id: 'inc_01HQINC111111111',
  dealId: mockDeal.id,
  amount: 1500,
  currency: 'USD',
  receivedAt: '2025-01-15T00:00:00.000Z',
  notes: 'First 50% payment on signing',
};

export const mockIncomeEntries: IncomeEntry[] = [
  mockIncomeEntry,
  {
    id: 'inc_02HQINC222222222',
    dealId: mockDeal.id,
    amount: 1500,
    currency: 'USD',
    receivedAt: '2025-02-15T00:00:00.000Z',
    notes: 'Remaining 50% on delivery',
  },
];
