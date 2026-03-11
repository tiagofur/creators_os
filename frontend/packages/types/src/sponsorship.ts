export type DealStage =
  | 'Prospect'
  | 'Outreach'
  | 'Negotiation'
  | 'Contracted'
  | 'Delivered'
  | 'Paid'
  | 'Rejected';

export interface BrandContact {
  id: string;
  workspaceId: string;
  companyName: string;
  contactName: string;
  email: string;
  website?: string;
  niche: string;
  notes?: string;
  createdAt: string;
}

export interface SponsorshipDeal {
  id: string;
  workspaceId: string;
  brandContactId: string;
  brandContact?: BrandContact;
  title: string;
  stage: DealStage;
  value: number;
  currency: string;
  platform: string;
  contentType: string;
  deliverableDate?: string;
  publishDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeEntry {
  id: string;
  dealId: string;
  amount: number;
  currency: string;
  receivedAt: string;
  notes?: string;
}
