import { createApiClient } from '../client';
import type { OrdoApiClient } from '../client';
import { createAuthResource } from '../resources/auth';
import { createIdeasResource } from '../resources/ideas';
import { createContentResource } from '../resources/content';
import { createWorkspacesResource } from '../resources/workspaces';
import { createAiResource } from '../resources/ai';
import { createAnalyticsResource } from '../resources/analytics';
import { createGamificationResource } from '../resources/gamification';
import { createSponsorshipsResource } from '../resources/sponsorships';
import { createBillingResource } from '../resources/billing';
import { createNotificationsResource } from '../resources/notifications';
import { createSearchResource } from '../resources/search';

// ── Mock the client methods ────────────────────────────────────────
function mockClient(): OrdoApiClient {
  return {
    get: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({}),
    patch: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

// ═══════════════════════════════════════════════════════════════════
// AUTH RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createAuthResource', () => {
  let client: OrdoApiClient;
  let auth: ReturnType<typeof createAuthResource>;

  beforeEach(() => {
    client = mockClient();
    auth = createAuthResource(client);
  });

  it('login calls POST /v1/auth/login with body and schema', async () => {
    const body = { email: 'a@b.com', password: 'pass' };
    await auth.login(body as any);
    expect(client.post).toHaveBeenCalledWith('/v1/auth/login', body, expect.anything());
  });

  it('register calls POST /v1/auth/register with body and schema', async () => {
    const body = { email: 'a@b.com', password: 'pass', name: 'Test' };
    await auth.register(body as any);
    expect(client.post).toHaveBeenCalledWith('/v1/auth/register', body, expect.anything());
  });

  it('logout calls POST /v1/auth/logout', async () => {
    await auth.logout();
    expect(client.post).toHaveBeenCalledWith('/v1/auth/logout');
  });

  it('refresh calls POST /v1/auth/refresh', async () => {
    await auth.refresh();
    expect(client.post).toHaveBeenCalledWith('/v1/auth/refresh', undefined, expect.anything());
  });

  it('forgotPassword calls POST /v1/auth/forgot-password', async () => {
    const body = { email: 'a@b.com' };
    await auth.forgotPassword(body);
    expect(client.post).toHaveBeenCalledWith('/v1/auth/forgot-password', body);
  });

  it('resetPassword calls POST /v1/auth/reset-password', async () => {
    const body = { token: 'tok', password: 'newpass' };
    await auth.resetPassword(body as any);
    expect(client.post).toHaveBeenCalledWith('/v1/auth/reset-password', body);
  });

  it('getMe calls GET /v1/auth/me with user schema', async () => {
    await auth.getMe();
    expect(client.get).toHaveBeenCalledWith('/v1/auth/me', expect.anything());
  });

  it('oauthUrl calls GET /v1/auth/oauth/:provider', async () => {
    await auth.oauthUrl('google');
    expect(client.get).toHaveBeenCalledWith('/v1/auth/oauth/google');
  });

  it('oauthCallback calls POST /v1/auth/oauth/:provider/callback', async () => {
    await auth.oauthCallback('github', 'code123', 'state456');
    expect(client.post).toHaveBeenCalledWith(
      '/v1/auth/oauth/github/callback',
      { code: 'code123', state: 'state456' },
      expect.anything(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// IDEAS RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createIdeasResource', () => {
  let client: OrdoApiClient;
  let ideas: ReturnType<typeof createIdeasResource>;

  beforeEach(() => {
    client = mockClient();
    ideas = createIdeasResource(client);
  });

  it('list without filters calls GET /v1/ideas', async () => {
    await ideas.list();
    expect(client.get).toHaveBeenCalledWith('/v1/ideas', expect.anything());
  });

  it('list with filters appends query params', async () => {
    await ideas.list({ status: 'draft' as any, page: 2, per_page: 10 });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('status=draft');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=10');
  });

  it('list with tags array appends multiple tag params', async () => {
    await ideas.list({ tags: ['tech', 'gaming'] });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('tags=tech');
    expect(url).toContain('tags=gaming');
  });

  it('get calls GET /v1/ideas/:id', async () => {
    await ideas.get('idea-1');
    expect(client.get).toHaveBeenCalledWith('/v1/ideas/idea-1', expect.anything());
  });

  it('create calls POST /v1/ideas with body', async () => {
    const body = { title: 'New idea' };
    await ideas.create(body as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ideas', body, expect.anything());
  });

  it('update calls PATCH /v1/ideas/:id with body', async () => {
    const body = { title: 'Updated' };
    await ideas.update('idea-1', body as any);
    expect(client.patch).toHaveBeenCalledWith('/v1/ideas/idea-1', body, expect.anything());
  });

  it('delete calls DELETE /v1/ideas/:id', async () => {
    await ideas.delete('idea-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/ideas/idea-1');
  });

  it('changeStatus calls PATCH with status body', async () => {
    await ideas.changeStatus('idea-1', 'approved' as any);
    expect(client.patch).toHaveBeenCalledWith(
      '/v1/ideas/idea-1',
      { status: 'approved' },
      expect.anything(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// CONTENT RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createContentResource', () => {
  let client: OrdoApiClient;
  let content: ReturnType<typeof createContentResource>;

  beforeEach(() => {
    client = mockClient();
    content = createContentResource(client);
  });

  it('list without filters calls GET /v1/contents', async () => {
    await content.list();
    expect(client.get).toHaveBeenCalledWith('/v1/contents', expect.anything());
  });

  it('list with filters appends query params', async () => {
    await content.list({ status: 'published', page: 1 });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('status=published');
    expect(url).toContain('page=1');
  });

  it('get calls GET /v1/contents/:id', async () => {
    await content.get('c-1');
    expect(client.get).toHaveBeenCalledWith('/v1/contents/c-1', expect.anything());
  });

  it('create calls POST /v1/contents', async () => {
    const body = { title: 'Video' };
    await content.create(body as any);
    expect(client.post).toHaveBeenCalledWith('/v1/contents', body, expect.anything());
  });

  it('update calls PATCH /v1/contents/:id', async () => {
    const body = { title: 'Updated' };
    await content.update('c-1', body as any);
    expect(client.patch).toHaveBeenCalledWith('/v1/contents/c-1', body, expect.anything());
  });

  it('delete calls DELETE /v1/contents/:id', async () => {
    await content.delete('c-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/contents/c-1');
  });

  it('moveStage calls PATCH with pipeline_stage', async () => {
    await content.moveStage('c-1', 'editing' as any);
    expect(client.patch).toHaveBeenCalledWith(
      '/v1/contents/c-1',
      { pipeline_stage: 'editing' },
      expect.anything(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// WORKSPACES RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createWorkspacesResource', () => {
  let client: OrdoApiClient;
  let ws: ReturnType<typeof createWorkspacesResource>;

  beforeEach(() => {
    client = mockClient();
    ws = createWorkspacesResource(client);
  });

  it('list calls GET /v1/workspaces', async () => {
    await ws.list();
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces');
  });

  it('get calls GET /v1/workspaces/:id', async () => {
    await ws.get('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1');
  });

  it('create calls POST /v1/workspaces', async () => {
    await ws.create({ name: 'My Workspace' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/workspaces', { name: 'My Workspace' });
  });

  it('update calls PATCH /v1/workspaces/:id', async () => {
    await ws.update('ws-1', { name: 'Renamed' } as any);
    expect(client.patch).toHaveBeenCalledWith('/v1/workspaces/ws-1', { name: 'Renamed' });
  });

  it('delete calls DELETE /v1/workspaces/:id', async () => {
    await ws.delete('ws-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/workspaces/ws-1');
  });

  it('listMembers calls GET /v1/workspaces/:id/members', async () => {
    await ws.listMembers('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/members');
  });

  it('inviteMember calls POST /v1/workspaces/:id/members/invite', async () => {
    await ws.inviteMember('ws-1', { email: 'x@y.com' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/workspaces/ws-1/members/invite', { email: 'x@y.com' });
  });

  it('removeMember calls DELETE /v1/workspaces/:id/members/:userId', async () => {
    await ws.removeMember('ws-1', 'user-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/workspaces/ws-1/members/user-1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// AI RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createAiResource', () => {
  let client: OrdoApiClient;
  let ai: ReturnType<typeof createAiResource>;

  beforeEach(() => {
    client = mockClient();
    ai = createAiResource(client);
  });

  it('chat calls POST /v1/ai/chat', async () => {
    await ai.chat({ message: 'hi' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/chat', { message: 'hi' });
  });

  it('getConversations calls GET /v1/ai/conversations', async () => {
    await ai.getConversations();
    expect(client.get).toHaveBeenCalledWith('/v1/ai/conversations');
  });

  it('brainstorm calls POST /v1/ai/brainstorm', async () => {
    await ai.brainstorm({ topic: 'ideas' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/brainstorm', { topic: 'ideas' });
  });

  it('titleLab calls POST /v1/ai/title-lab', async () => {
    await ai.titleLab({ content: 'test' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/title-lab', { content: 'test' });
  });

  it('description calls POST /v1/ai/description', async () => {
    await ai.description({ content: 'test' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/description', { content: 'test' });
  });

  it('scriptDoctor calls POST /v1/ai/script-doctor', async () => {
    await ai.scriptDoctor({ script: 'hello' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/script-doctor', { script: 'hello' });
  });

  it('remix calls POST /v1/ai/remix', async () => {
    await ai.remix({ content: 'test' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/remix', { content: 'test' });
  });

  it('hooks calls POST /v1/ai/hooks', async () => {
    await ai.hooks({ topic: 'test' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/hooks', { topic: 'test' });
  });

  it('hashtags calls POST /v1/ai/hashtags', async () => {
    await ai.hashtags({ content: 'test' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/ai/hashtags', { content: 'test' });
  });

  it('getCredits calls GET /v1/ai/credits', async () => {
    await ai.getCredits();
    expect(client.get).toHaveBeenCalledWith('/v1/ai/credits');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createAnalyticsResource', () => {
  let client: OrdoApiClient;
  let analytics: ReturnType<typeof createAnalyticsResource>;

  beforeEach(() => {
    client = mockClient();
    analytics = createAnalyticsResource(client);
  });

  it('getPlatformMetrics calls correct URL', async () => {
    await analytics.getPlatformMetrics('ws-1', '30d');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/platforms?period=30d');
  });

  it('getConsistencyScore calls correct URL', async () => {
    await analytics.getConsistencyScore('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/consistency');
  });

  it('getHeatmap calls correct URL', async () => {
    await analytics.getHeatmap('ws-1', 2024);
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/heatmap?year=2024');
  });

  it('getPipelineVelocity calls correct URL', async () => {
    await analytics.getPipelineVelocity('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/velocity');
  });

  it('getWeeklyReport calls correct URL', async () => {
    await analytics.getWeeklyReport('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/report/weekly');
  });

  it('getMonthlyReport calls correct URL', async () => {
    await analytics.getMonthlyReport('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/report/monthly');
  });

  it('listGoals calls correct URL', async () => {
    await analytics.listGoals('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/goals');
  });

  it('createGoal calls POST with body', async () => {
    const body = { metric: 'views', targetValue: 1000 };
    await analytics.createGoal('ws-1', body as any);
    expect(client.post).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/goals', body);
  });

  it('updateGoal calls PATCH with body', async () => {
    await analytics.updateGoal('ws-1', 'g-1', { targetValue: 2000 } as any);
    expect(client.patch).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/goals/g-1', { targetValue: 2000 });
  });

  it('deleteGoal calls DELETE', async () => {
    await analytics.deleteGoal('ws-1', 'g-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/workspaces/ws-1/analytics/goals/g-1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// GAMIFICATION RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createGamificationResource', () => {
  let client: OrdoApiClient;
  let gam: ReturnType<typeof createGamificationResource>;

  beforeEach(() => {
    client = mockClient();
    gam = createGamificationResource(client);
  });

  it('getProfile calls GET /v1/users/:id/gamification', async () => {
    await gam.getProfile('u-1');
    expect(client.get).toHaveBeenCalledWith('/v1/users/u-1/gamification');
  });

  it('getAchievements calls GET /v1/users/:id/achievements', async () => {
    await gam.getAchievements('u-1');
    expect(client.get).toHaveBeenCalledWith('/v1/users/u-1/achievements');
  });
});

// ═══════════════════════════════════════════════════════════════════
// SPONSORSHIPS RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createSponsorshipsResource', () => {
  let client: OrdoApiClient;
  let sp: ReturnType<typeof createSponsorshipsResource>;

  beforeEach(() => {
    client = mockClient();
    sp = createSponsorshipsResource(client);
  });

  it('listBrands calls GET', async () => {
    await sp.listBrands('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/brands');
  });

  it('getBrand calls GET with brand id', async () => {
    await sp.getBrand('ws-1', 'b-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/brands/b-1');
  });

  it('createBrand calls POST', async () => {
    await sp.createBrand('ws-1', { name: 'Acme' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/brands', { name: 'Acme' });
  });

  it('updateBrand calls PATCH', async () => {
    await sp.updateBrand('ws-1', 'b-1', { name: 'Updated' } as any);
    expect(client.patch).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/brands/b-1', { name: 'Updated' });
  });

  it('deleteBrand calls DELETE', async () => {
    await sp.deleteBrand('ws-1', 'b-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/brands/b-1');
  });

  it('listDeals without filters', async () => {
    await sp.listDeals('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/deals');
  });

  it('listDeals with filters appends query params', async () => {
    await sp.listDeals('ws-1', { stage: 'negotiation' as any });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('stage=negotiation');
  });

  it('getDeal calls GET', async () => {
    await sp.getDeal('ws-1', 'd-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/deals/d-1');
  });

  it('createDeal calls POST', async () => {
    await sp.createDeal('ws-1', { title: 'Deal' } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/deals', { title: 'Deal' });
  });

  it('updateDeal calls PATCH', async () => {
    await sp.updateDeal('ws-1', 'd-1', { title: 'Updated' } as any);
    expect(client.patch).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/deals/d-1', { title: 'Updated' });
  });

  it('moveDealStage calls PATCH on stage endpoint', async () => {
    await sp.moveDealStage('ws-1', 'd-1', 'closed' as any);
    expect(client.patch).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/deals/d-1/stage', { stage: 'closed' });
  });

  it('deleteDeal calls DELETE', async () => {
    await sp.deleteDeal('ws-1', 'd-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/deals/d-1');
  });

  it('listIncome calls GET', async () => {
    await sp.listIncome('ws-1');
    expect(client.get).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/income');
  });

  it('addIncome calls POST', async () => {
    await sp.addIncome('ws-1', { amount: 1000 } as any);
    expect(client.post).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/income', { amount: 1000 });
  });

  it('deleteIncome calls DELETE', async () => {
    await sp.deleteIncome('ws-1', 'inc-1');
    expect(client.delete).toHaveBeenCalledWith('/v1/workspaces/ws-1/sponsorships/income/inc-1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// BILLING RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createBillingResource', () => {
  let client: OrdoApiClient;
  let billing: ReturnType<typeof createBillingResource>;

  beforeEach(() => {
    client = mockClient();
    billing = createBillingResource(client);
  });

  it('getSubscription calls GET /v1/billing/subscription', async () => {
    await billing.getSubscription();
    expect(client.get).toHaveBeenCalledWith('/v1/billing/subscription');
  });

  it('getInvoices calls GET /v1/billing/invoices', async () => {
    await billing.getInvoices();
    expect(client.get).toHaveBeenCalledWith('/v1/billing/invoices');
  });

  it('createCheckoutSession calls POST /v1/billing/checkout', async () => {
    await billing.createCheckoutSession('pro', 'monthly');
    expect(client.post).toHaveBeenCalledWith('/v1/billing/checkout', { tier: 'pro', billingPeriod: 'monthly' });
  });

  it('createPortalSession calls POST /v1/billing/portal', async () => {
    await billing.createPortalSession();
    expect(client.post).toHaveBeenCalledWith('/v1/billing/portal');
  });

  it('cancelSubscription calls POST /v1/billing/cancel', async () => {
    await billing.cancelSubscription();
    expect(client.post).toHaveBeenCalledWith('/v1/billing/cancel');
  });

  it('reactivateSubscription calls POST /v1/billing/reactivate', async () => {
    await billing.reactivateSubscription();
    expect(client.post).toHaveBeenCalledWith('/v1/billing/reactivate');
  });

  it('getUsage calls GET /v1/billing/usage', async () => {
    await billing.getUsage();
    expect(client.get).toHaveBeenCalledWith('/v1/billing/usage');
  });
});

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createNotificationsResource', () => {
  let client: OrdoApiClient;
  let notifs: ReturnType<typeof createNotificationsResource>;

  beforeEach(() => {
    client = mockClient();
    notifs = createNotificationsResource(client);
  });

  it('list without params calls GET /v1/notifications', async () => {
    await notifs.list();
    expect(client.get).toHaveBeenCalledWith('/v1/notifications');
  });

  it('list with unread filter', async () => {
    await notifs.list({ unread: true });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('unread=true');
  });

  it('list with page param', async () => {
    await notifs.list({ page: 3 });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('page=3');
  });

  it('getUnreadCount calls GET /v1/notifications/count', async () => {
    await notifs.getUnreadCount();
    expect(client.get).toHaveBeenCalledWith('/v1/notifications/count');
  });

  it('markAsRead calls PATCH with read:true', async () => {
    await notifs.markAsRead('n-1');
    expect(client.patch).toHaveBeenCalledWith('/v1/notifications/n-1', { read: true });
  });

  it('markAllAsRead calls POST /v1/notifications/mark-all-read', async () => {
    await notifs.markAllAsRead();
    expect(client.post).toHaveBeenCalledWith('/v1/notifications/mark-all-read');
  });
});

// ═══════════════════════════════════════════════════════════════════
// SEARCH RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createSearchResource', () => {
  let client: OrdoApiClient;
  let search: ReturnType<typeof createSearchResource>;

  beforeEach(() => {
    client = mockClient();
    search = createSearchResource(client);
  });

  it('search calls GET /v1/search with query params', async () => {
    await search.search('hello', 'ws-1');
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/v1/search');
    expect(url).toContain('q=hello');
    expect(url).toContain('workspace=ws-1');
  });
});
