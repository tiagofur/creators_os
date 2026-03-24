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
import { createSeriesResource } from '../resources/series';
import { createPublishingResource } from '../resources/publishing';
import { createRemixResource } from '../resources/remix';
import { createUploadsResource } from '../resources/uploads';
import { createAuditLogsResource } from '../resources/audit-logs';

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

  it('login calls POST /api/v1/auth/login with body and schema', async () => {
    const body = { email: 'a@b.com', password: 'pass' };
    await auth.login(body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/login', body, expect.anything());
  });

  it('register calls POST /api/v1/auth/register with body and schema', async () => {
    const body = { email: 'a@b.com', password: 'pass', name: 'Test' };
    await auth.register(body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/register', body, expect.anything());
  });

  it('logout calls POST /api/v1/auth/logout', async () => {
    await auth.logout();
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/logout');
  });

  it('logoutAll calls POST /api/v1/auth/logout-all', async () => {
    await auth.logoutAll();
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/logout-all');
  });

  it('refresh calls POST /api/v1/auth/refresh', async () => {
    await auth.refresh();
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/refresh', undefined, expect.anything());
  });

  it('forgotPassword calls POST /api/v1/auth/forgot-password', async () => {
    const body = { email: 'a@b.com' };
    await auth.forgotPassword(body);
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', body);
  });

  it('resetPassword calls POST /api/v1/auth/reset-password', async () => {
    const body = { token: 'tok', password: 'newpass', password_confirmation: 'newpass' };
    await auth.resetPassword(body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', body);
  });

  it('getMe calls GET /api/v1/users/me with user schema', async () => {
    await auth.getMe();
    expect(client.get).toHaveBeenCalledWith('/api/v1/users/me', expect.anything());
  });

  it('updateMe calls PUT /api/v1/users/me', async () => {
    const body = { full_name: 'Updated' };
    await auth.updateMe(body as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/users/me', body, expect.anything());
  });

  it('oauthUrl calls GET /api/v1/auth/oauth/:provider', async () => {
    await auth.oauthUrl('google');
    expect(client.get).toHaveBeenCalledWith('/api/v1/auth/oauth/google');
  });

  it('oauthCallback calls GET /api/v1/auth/oauth/:provider/callback with query params', async () => {
    await auth.oauthCallback('github', 'code123', 'state456');
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/auth/oauth/github/callback');
    expect(url).toContain('code=code123');
    expect(url).toContain('state=state456');
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

  it('list without filters calls GET /api/v1/workspaces/:wsId/ideas', async () => {
    await ideas.list('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas', expect.anything());
  });

  it('list with filters appends query params', async () => {
    await ideas.list('ws-1', { status: 'draft' as any, page: 2, per_page: 10 });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('status=draft');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=10');
  });

  it('list with tags array appends multiple tag params', async () => {
    await ideas.list('ws-1', { tags: ['tech', 'gaming'] });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('tags=tech');
    expect(url).toContain('tags=gaming');
  });

  it('get calls GET /api/v1/workspaces/:wsId/ideas/:id', async () => {
    await ideas.get('ws-1', 'idea-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas/idea-1', expect.anything());
  });

  it('create calls POST /api/v1/workspaces/:wsId/ideas with body', async () => {
    const body = { title: 'New idea' };
    await ideas.create('ws-1', body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas', body, expect.anything());
  });

  it('update calls PUT /api/v1/workspaces/:wsId/ideas/:id with body', async () => {
    const body = { title: 'Updated' };
    await ideas.update('ws-1', 'idea-1', body as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas/idea-1', body, expect.anything());
  });

  it('delete calls DELETE /api/v1/workspaces/:wsId/ideas/:id', async () => {
    await ideas.delete('ws-1', 'idea-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas/idea-1');
  });

  it('requestValidation calls POST /api/v1/workspaces/:wsId/ideas/:id/validate', async () => {
    await ideas.requestValidation('ws-1', 'idea-1');
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas/idea-1/validate');
  });

  it('setTags calls PUT /api/v1/workspaces/:wsId/ideas/:id/tags', async () => {
    await ideas.setTags('ws-1', 'idea-1', ['tag1', 'tag2']);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas/idea-1/tags', { tags: ['tag1', 'tag2'] }, expect.anything());
  });

  it('promote calls POST /api/v1/workspaces/:wsId/ideas/:id/promote', async () => {
    await ideas.promote('ws-1', 'idea-1');
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ideas/idea-1/promote', undefined, expect.anything());
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

  it('list without filters calls GET /api/v1/workspaces/:wsId/contents', async () => {
    await content.list('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/contents', expect.anything());
  });

  it('list with filters appends query params', async () => {
    await content.list('ws-1', { status: 'published', page: 1 });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('status=published');
    expect(url).toContain('page=1');
  });

  it('get calls GET /api/v1/workspaces/:wsId/contents/:id', async () => {
    await content.get('ws-1', 'c-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/contents/c-1', expect.anything());
  });

  it('create calls POST /api/v1/workspaces/:wsId/contents', async () => {
    const body = { title: 'Video' };
    await content.create('ws-1', body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/contents', body, expect.anything());
  });

  it('update calls PUT /api/v1/workspaces/:wsId/contents/:id', async () => {
    const body = { title: 'Updated' };
    await content.update('ws-1', 'c-1', body as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/contents/c-1', body, expect.anything());
  });

  it('delete calls DELETE /api/v1/workspaces/:wsId/contents/:id', async () => {
    await content.delete('ws-1', 'c-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/contents/c-1');
  });

  it('transitionStatus calls PUT /api/v1/workspaces/:wsId/contents/:id/status', async () => {
    await content.transitionStatus('ws-1', 'c-1', 'editing');
    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/workspaces/ws-1/contents/c-1/status',
      { status: 'editing' },
      expect.anything(),
    );
  });

  it('addAssignment calls POST', async () => {
    await content.addAssignment('ws-1', 'c-1', 'user-1');
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/workspaces/ws-1/contents/c-1/assignments',
      { userId: 'user-1' },
    );
  });

  it('removeAssignment calls DELETE', async () => {
    await content.removeAssignment('ws-1', 'c-1', 'user-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/contents/c-1/assignments/user-1');
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

  it('list calls GET /api/v1/workspaces', async () => {
    await ws.list();
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces');
  });

  it('get calls GET /api/v1/workspaces/:id', async () => {
    await ws.get('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1');
  });

  it('create calls POST /api/v1/workspaces', async () => {
    await ws.create({ name: 'My Workspace' } as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces', { name: 'My Workspace' });
  });

  it('update calls PUT /api/v1/workspaces/:id', async () => {
    await ws.update('ws-1', { name: 'Renamed' } as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1', { name: 'Renamed' });
  });

  it('delete calls DELETE /api/v1/workspaces/:id', async () => {
    await ws.delete('ws-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1');
  });

  it('listMembers calls GET /api/v1/workspaces/:id/members', async () => {
    await ws.listMembers('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/members');
  });

  it('updateMemberRole calls PUT /api/v1/workspaces/:id/members/:userId/role', async () => {
    await ws.updateMemberRole('ws-1', 'user-1', 'admin');
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/members/user-1/role', { role: 'admin' });
  });

  it('removeMember calls DELETE /api/v1/workspaces/:id/members/:userId', async () => {
    await ws.removeMember('ws-1', 'user-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/members/user-1');
  });

  it('inviteMember calls POST /api/v1/workspaces/:id/invitations', async () => {
    await ws.inviteMember('ws-1', { email: 'x@y.com' } as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/invitations', { email: 'x@y.com' });
  });

  it('listInvitations calls GET /api/v1/workspaces/:id/invitations', async () => {
    await ws.listInvitations('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/invitations');
  });

  it('deleteInvitation calls DELETE', async () => {
    await ws.deleteInvitation('ws-1', 'inv-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/invitations/inv-1');
  });

  it('acceptInvitation calls POST /api/v1/invitations/:token/accept', async () => {
    await ws.acceptInvitation('tok-1');
    expect(client.post).toHaveBeenCalledWith('/api/v1/invitations/tok-1/accept');
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

  it('createConversation calls POST /api/v1/workspaces/:wsId/ai/conversations', async () => {
    await ai.createConversation('ws-1', { message: 'hi' } as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ai/conversations', { message: 'hi' });
  });

  it('getConversations calls GET /api/v1/workspaces/:wsId/ai/conversations', async () => {
    await ai.getConversations('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ai/conversations');
  });

  it('getConversation calls GET /api/v1/workspaces/:wsId/ai/conversations/:convId', async () => {
    await ai.getConversation('ws-1', 'conv-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ai/conversations/conv-1');
  });

  it('deleteConversation calls DELETE', async () => {
    await ai.deleteConversation('ws-1', 'conv-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ai/conversations/conv-1');
  });

  it('sendMessage calls POST /api/v1/workspaces/:wsId/ai/conversations/:convId/messages', async () => {
    await ai.sendMessage('ws-1', 'conv-1', { message: 'test' } as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ai/conversations/conv-1/messages', { message: 'test' });
  });

  it('brainstorm calls POST /api/v1/workspaces/:wsId/ai/brainstorm', async () => {
    await ai.brainstorm('ws-1', { topic: 'ideas' } as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ai/brainstorm', { topic: 'ideas' });
  });

  it('generateScript calls POST /api/v1/workspaces/:wsId/ai/script-generate', async () => {
    await ai.generateScript('ws-1', { script: 'hello' } as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/ai/script-generate', { script: 'hello' });
  });

  it('getCredits calls GET /api/v1/users/me/ai/credits', async () => {
    await ai.getCredits();
    expect(client.get).toHaveBeenCalledWith('/api/v1/users/me/ai/credits');
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

  it('getOverview calls correct URL', async () => {
    await analytics.getOverview('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/overview');
  });

  it('getPlatformMetrics calls correct URL', async () => {
    await analytics.getPlatformMetrics('ws-1', '30d');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/overview?period=30d');
  });

  it('getConsistencyScore calls correct URL', async () => {
    await analytics.getConsistencyScore('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/consistency');
  });

  it('getHeatmap calls correct URL', async () => {
    await analytics.getHeatmap('ws-1', 2024);
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/heatmap?year=2024');
  });

  it('getPipelineVelocity calls correct URL', async () => {
    await analytics.getPipelineVelocity('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/velocity');
  });

  it('getWeeklyReport calls correct URL', async () => {
    await analytics.getWeeklyReport('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/reports/weekly');
  });

  it('getMonthlyReport calls correct URL', async () => {
    await analytics.getMonthlyReport('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/reports/monthly');
  });

  it('listGoals calls correct URL', async () => {
    await analytics.listGoals('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/goals');
  });

  it('createGoal calls POST with body', async () => {
    const body = { metric: 'views', targetValue: 1000 };
    await analytics.createGoal('ws-1', body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/goals', body);
  });

  it('updateGoal calls PATCH with body', async () => {
    await analytics.updateGoal('ws-1', 'g-1', { targetValue: 2000 } as any);
    expect(client.patch).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/goals/g-1', { targetValue: 2000 });
  });

  it('deleteGoal calls DELETE', async () => {
    await analytics.deleteGoal('ws-1', 'g-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/goals/g-1');
  });

  it('triggerSync calls POST', async () => {
    await analytics.triggerSync('ws-1');
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/analytics/sync');
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

  it('getLeaderboard calls GET /api/v1/workspaces/:wsId/gamification/leaderboard', async () => {
    await gam.getLeaderboard('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/gamification/leaderboard');
  });

  it('getMyStats calls GET /api/v1/workspaces/:wsId/gamification/my-stats', async () => {
    await gam.getMyStats('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/gamification/my-stats');
  });

  it('getAchievements calls GET /api/v1/workspaces/:wsId/gamification/achievements', async () => {
    await gam.getAchievements('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/gamification/achievements');
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

  it('list calls GET /api/v1/workspaces/:wsId/sponsorships', async () => {
    await sp.list('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sponsorships');
  });

  it('get calls GET /api/v1/workspaces/:wsId/sponsorships/:id', async () => {
    await sp.get('ws-1', 's-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sponsorships/s-1');
  });

  it('create calls POST', async () => {
    const body = { brandName: 'Acme' };
    await sp.create('ws-1', body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sponsorships', body);
  });

  it('update calls PUT', async () => {
    await sp.update('ws-1', 's-1', { brandName: 'Updated' } as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sponsorships/s-1', { brandName: 'Updated' });
  });

  it('delete calls DELETE', async () => {
    await sp.delete('ws-1', 's-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sponsorships/s-1');
  });

  it('addMessage calls POST with body', async () => {
    await sp.addMessage('ws-1', 's-1', { text: 'hello' });
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sponsorships/s-1/messages', { text: 'hello' });
  });

  it('listMessages calls GET', async () => {
    await sp.listMessages('ws-1', 's-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sponsorships/s-1/messages');
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

  it('createCheckoutSession calls POST /api/v1/billing/checkout', async () => {
    await billing.createCheckoutSession('pro', 'monthly');
    expect(client.post).toHaveBeenCalledWith('/api/v1/billing/checkout', { tier: 'pro', billingPeriod: 'monthly' });
  });

  it('createPortalSession calls POST /api/v1/billing/portal', async () => {
    await billing.createPortalSession();
    expect(client.post).toHaveBeenCalledWith('/api/v1/billing/portal');
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

  it('list without params calls GET /api/v1/notifications', async () => {
    await notifs.list();
    expect(client.get).toHaveBeenCalledWith('/api/v1/notifications');
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

  it('getUnreadCount calls GET /api/v1/notifications/count', async () => {
    await notifs.getUnreadCount();
    expect(client.get).toHaveBeenCalledWith('/api/v1/notifications/count');
  });

  it('markAsRead calls PATCH with read:true', async () => {
    await notifs.markAsRead('n-1');
    expect(client.patch).toHaveBeenCalledWith('/api/v1/notifications/n-1', { read: true });
  });

  it('markAllAsRead calls POST /api/v1/notifications/mark-all-read', async () => {
    await notifs.markAllAsRead();
    expect(client.post).toHaveBeenCalledWith('/api/v1/notifications/mark-all-read');
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

  it('search calls GET /api/v1/workspaces/:wsId/search with query params', async () => {
    await search.search('ws-1', 'hello');
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/workspaces/ws-1/search');
    expect(url).toContain('q=hello');
  });
});

// ═══════════════════════════════════════════════════════════════════
// SERIES RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createSeriesResource', () => {
  let client: OrdoApiClient;
  let series: ReturnType<typeof createSeriesResource>;

  beforeEach(() => {
    client = mockClient();
    series = createSeriesResource(client);
  });

  it('list calls GET /api/v1/workspaces/:wsId/series', async () => {
    await series.list('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series');
  });

  it('get calls GET with series id', async () => {
    await series.get('ws-1', 'ser-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series/ser-1');
  });

  it('create calls POST', async () => {
    const body = { title: 'New Series' };
    await series.create('ws-1', body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series', body);
  });

  it('update calls PUT', async () => {
    await series.update('ws-1', 'ser-1', { title: 'Updated' } as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series/ser-1', { title: 'Updated' });
  });

  it('delete calls DELETE', async () => {
    await series.delete('ws-1', 'ser-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series/ser-1');
  });

  it('addEpisode calls POST', async () => {
    const body = { episode_number: 1, title: 'Ep 1' };
    await series.addEpisode('ws-1', 'ser-1', body as any);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series/ser-1/episodes', body);
  });

  it('updateEpisode calls PUT', async () => {
    await series.updateEpisode('ws-1', 'ser-1', 'ep-1', { title: 'Updated Ep' } as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series/ser-1/episodes/ep-1', { title: 'Updated Ep' });
  });

  it('deleteEpisode calls DELETE', async () => {
    await series.deleteEpisode('ws-1', 'ser-1', 'ep-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series/ser-1/episodes/ep-1');
  });

  it('upsertSchedule calls PUT', async () => {
    const body = { frequency: 'weekly', time_of_day: '10:00' };
    await series.upsertSchedule('ws-1', 'ser-1', body as any);
    expect(client.put).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/series/ser-1/schedule', body);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PUBLISHING RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createPublishingResource', () => {
  let client: OrdoApiClient;
  let pub: ReturnType<typeof createPublishingResource>;

  beforeEach(() => {
    client = mockClient();
    pub = createPublishingResource(client);
  });

  it('listCredentials calls GET', async () => {
    await pub.listCredentials('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/publishing/credentials');
  });

  it('storeCredential calls POST', async () => {
    const body = { platform: 'youtube' as const };
    await pub.storeCredential('ws-1', body);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/publishing/credentials', body);
  });

  it('deleteCredential calls DELETE', async () => {
    await pub.deleteCredential('ws-1', 'cred-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/publishing/credentials/cred-1');
  });

  it('schedulePost calls POST', async () => {
    const body = { content_id: 'c-1', platform: 'youtube' as const, scheduled_at: '2025-02-01T00:00:00Z' };
    await pub.schedulePost('ws-1', body);
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/publishing/schedule', body);
  });

  it('getCalendar calls GET', async () => {
    await pub.getCalendar('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/publishing/calendar');
  });

  it('cancelScheduledPost calls DELETE', async () => {
    await pub.cancelScheduledPost('ws-1', 'sp-1');
    expect(client.delete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/publishing/schedule/sp-1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// REMIX RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createRemixResource', () => {
  let client: OrdoApiClient;
  let remix: ReturnType<typeof createRemixResource>;

  beforeEach(() => {
    client = mockClient();
    remix = createRemixResource(client);
  });

  it('submitAnalysis calls POST /api/v1/workspaces/:wsId/remix/analyze', async () => {
    await remix.submitAnalysis('ws-1', { input_url: 'https://youtube.com/v/123' });
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/remix/analyze', { input_url: 'https://youtube.com/v/123' });
  });

  it('getJobStatus calls GET', async () => {
    await remix.getJobStatus('ws-1', 'job-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/remix/job-1/status');
  });

  it('getJobResults calls GET', async () => {
    await remix.getJobResults('ws-1', 'job-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/remix/job-1/results');
  });

  it('applyResults calls POST', async () => {
    await remix.applyResults('ws-1', 'job-1', { clip_ids: ['c1', 'c2'] });
    expect(client.post).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/remix/job-1/apply', { clip_ids: ['c1', 'c2'] });
  });
});

// ═══════════════════════════════════════════════════════════════════
// UPLOADS RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createUploadsResource', () => {
  let client: OrdoApiClient;
  let uploads: ReturnType<typeof createUploadsResource>;

  beforeEach(() => {
    client = mockClient();
    uploads = createUploadsResource(client);
  });

  it('getPresignedUrl calls POST /api/v1/uploads/presign', async () => {
    const body = { content_type: 'video/mp4', file_extension: 'mp4', workspace_id: 'ws-1' };
    await uploads.getPresignedUrl(body);
    expect(client.post).toHaveBeenCalledWith('/api/v1/uploads/presign', body);
  });

  it('confirmUpload calls POST /api/v1/uploads/confirm', async () => {
    await uploads.confirmUpload({ object_key: 'key-1' });
    expect(client.post).toHaveBeenCalledWith('/api/v1/uploads/confirm', { object_key: 'key-1' });
  });

  it('getDownloadUrl calls GET', async () => {
    await uploads.getDownloadUrl('key-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/uploads/key-1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGS RESOURCE
// ═══════════════════════════════════════════════════════════════════
describe('createAuditLogsResource', () => {
  let client: OrdoApiClient;
  let auditLogs: ReturnType<typeof createAuditLogsResource>;

  beforeEach(() => {
    client = mockClient();
    auditLogs = createAuditLogsResource(client);
  });

  it('list calls GET /api/v1/workspaces/:wsId/audit-logs', async () => {
    await auditLogs.list('ws-1');
    expect(client.get).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/audit-logs');
  });

  it('list with filters appends query params', async () => {
    await auditLogs.list('ws-1', { limit: 25, offset: 10 });
    const url = (client.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=10');
  });
});
