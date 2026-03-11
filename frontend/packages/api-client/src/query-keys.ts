export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  workspaces: {
    all: () => ['workspaces'] as const,
    list: () => ['workspaces', 'list'] as const,
    detail: (id: string) => ['workspaces', id] as const,
    members: (id: string) => ['workspaces', id, 'members'] as const,
  },
  ideas: {
    all: () => ['ideas'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? ['ideas', 'list', filters] as const : ['ideas', 'list'] as const,
    detail: (id: string) => ['ideas', id] as const,
  },
  content: {
    all: () => ['content'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? ['content', 'list', filters] as const : ['content', 'list'] as const,
    detail: (id: string) => ['content', id] as const,
  },
  series: {
    all: () => ['series'] as const,
    list: () => ['series', 'list'] as const,
    detail: (id: string) => ['series', id] as const,
  },
  analytics: {
    overview: (workspaceId: string) => ['analytics', 'overview', workspaceId] as const,
    content: (contentId: string) => ['analytics', 'content', contentId] as const,
    platforms: (workspaceId: string, period: string) =>
      ['analytics', 'platforms', workspaceId, period] as const,
    consistency: (workspaceId: string) =>
      ['analytics', 'consistency', workspaceId] as const,
    heatmap: (workspaceId: string, year: number) =>
      ['analytics', 'heatmap', workspaceId, year] as const,
    velocity: (workspaceId: string) =>
      ['analytics', 'velocity', workspaceId] as const,
    weeklyReport: (workspaceId: string) =>
      ['analytics', 'report', 'weekly', workspaceId] as const,
    monthlyReport: (workspaceId: string) =>
      ['analytics', 'report', 'monthly', workspaceId] as const,
    goals: (workspaceId: string) =>
      ['analytics', 'goals', workspaceId] as const,
  },
  gamification: {
    profile: (userId: string) => ['gamification', 'profile', userId] as const,
    achievements: (userId: string) => ['gamification', 'achievements', userId] as const,
  },
  sponsorships: {
    all: (workspaceId: string) => ['sponsorships', workspaceId] as const,
    brands: (workspaceId: string) => ['sponsorships', 'brands', workspaceId] as const,
    brand: (id: string) => ['sponsorships', 'brand', id] as const,
    deals: (workspaceId: string, filters?: Record<string, unknown>) =>
      filters
        ? ['sponsorships', 'deals', workspaceId, filters] as const
        : ['sponsorships', 'deals', workspaceId] as const,
    deal: (id: string) => ['sponsorships', 'deal', id] as const,
    income: (workspaceId: string) => ['sponsorships', 'income', workspaceId] as const,
  },
  notifications: {
    list: () => ['notifications', 'list'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  ai: {
    credits: () => ['ai', 'credits'] as const,
    conversations: () => ['ai', 'conversations'] as const,
  },
} as const;
