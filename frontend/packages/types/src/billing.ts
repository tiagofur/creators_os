export type SubscriptionTier = 'free' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'

export interface Subscription {
  id: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'void'
  createdAt: string
  pdfUrl?: string
}

export interface TierLimits {
  ideas: number | null          // null = unlimited
  workspaces: number | null
  aiCredits: number | null
  teamMembers: number | null
}

export interface UsageSummary {
  ideasThisMonth: number
  workspacesCount: number
  aiCreditsUsed: number
  teamMembersCount: number
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free:       { ideas: 50,  workspaces: 1, aiCredits: 0,   teamMembers: 1  },
  pro:        { ideas: null, workspaces: 3, aiCredits: 500, teamMembers: 5  },
  enterprise: { ideas: null, workspaces: null, aiCredits: null, teamMembers: null },
}

export const TIER_PRICES: Record<SubscriptionTier, { monthly: number; annual: number }> = {
  free:       { monthly: 0,  annual: 0   },
  pro:        { monthly: 12, annual: 96  },
  enterprise: { monthly: 29, annual: 228 },
}
