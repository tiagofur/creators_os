import { queryKeys } from '../query-keys';

describe('queryKeys', () => {
  it('auth.me returns correct key', () => {
    expect(queryKeys.auth.me()).toEqual(['auth', 'me']);
  });

  it('workspaces keys', () => {
    expect(queryKeys.workspaces.all()).toEqual(['workspaces']);
    expect(queryKeys.workspaces.list()).toEqual(['workspaces', 'list']);
    expect(queryKeys.workspaces.detail('ws-1')).toEqual(['workspaces', 'ws-1']);
    expect(queryKeys.workspaces.members('ws-1')).toEqual(['workspaces', 'ws-1', 'members']);
  });

  it('ideas keys', () => {
    expect(queryKeys.ideas.all()).toEqual(['ideas']);
    expect(queryKeys.ideas.list()).toEqual(['ideas', 'list']);
    expect(queryKeys.ideas.list({ status: 'draft' })).toEqual(['ideas', 'list', { status: 'draft' }]);
    expect(queryKeys.ideas.detail('i-1')).toEqual(['ideas', 'i-1']);
  });

  it('content keys', () => {
    expect(queryKeys.content.all()).toEqual(['content']);
    expect(queryKeys.content.list()).toEqual(['content', 'list']);
    expect(queryKeys.content.list({ page: 1 })).toEqual(['content', 'list', { page: 1 }]);
    expect(queryKeys.content.detail('c-1')).toEqual(['content', 'c-1']);
  });

  it('series keys', () => {
    expect(queryKeys.series.all()).toEqual(['series']);
    expect(queryKeys.series.list()).toEqual(['series', 'list']);
    expect(queryKeys.series.detail('s-1')).toEqual(['series', 's-1']);
  });

  it('analytics keys', () => {
    expect(queryKeys.analytics.overview('ws-1')).toEqual(['analytics', 'overview', 'ws-1']);
    expect(queryKeys.analytics.content('c-1')).toEqual(['analytics', 'content', 'c-1']);
    expect(queryKeys.analytics.platforms('ws-1', '30d')).toEqual(['analytics', 'platforms', 'ws-1', '30d']);
    expect(queryKeys.analytics.consistency('ws-1')).toEqual(['analytics', 'consistency', 'ws-1']);
    expect(queryKeys.analytics.heatmap('ws-1', 2024)).toEqual(['analytics', 'heatmap', 'ws-1', 2024]);
    expect(queryKeys.analytics.velocity('ws-1')).toEqual(['analytics', 'velocity', 'ws-1']);
    expect(queryKeys.analytics.weeklyReport('ws-1')).toEqual(['analytics', 'report', 'weekly', 'ws-1']);
    expect(queryKeys.analytics.monthlyReport('ws-1')).toEqual(['analytics', 'report', 'monthly', 'ws-1']);
    expect(queryKeys.analytics.goals('ws-1')).toEqual(['analytics', 'goals', 'ws-1']);
  });

  it('gamification keys', () => {
    expect(queryKeys.gamification.profile('u-1')).toEqual(['gamification', 'profile', 'u-1']);
    expect(queryKeys.gamification.achievements('u-1')).toEqual(['gamification', 'achievements', 'u-1']);
  });

  it('sponsorships keys', () => {
    expect(queryKeys.sponsorships.all('ws-1')).toEqual(['sponsorships', 'ws-1']);
    expect(queryKeys.sponsorships.brands('ws-1')).toEqual(['sponsorships', 'brands', 'ws-1']);
    expect(queryKeys.sponsorships.brand('b-1')).toEqual(['sponsorships', 'brand', 'b-1']);
    expect(queryKeys.sponsorships.deals('ws-1')).toEqual(['sponsorships', 'deals', 'ws-1']);
    expect(queryKeys.sponsorships.deals('ws-1', { stage: 'active' })).toEqual(['sponsorships', 'deals', 'ws-1', { stage: 'active' }]);
    expect(queryKeys.sponsorships.deal('d-1')).toEqual(['sponsorships', 'deal', 'd-1']);
    expect(queryKeys.sponsorships.income('ws-1')).toEqual(['sponsorships', 'income', 'ws-1']);
  });

  it('notifications keys', () => {
    expect(queryKeys.notifications.list()).toEqual(['notifications', 'list']);
    expect(queryKeys.notifications.unreadCount()).toEqual(['notifications', 'unread-count']);
  });

  it('ai keys', () => {
    expect(queryKeys.ai.credits()).toEqual(['ai', 'credits']);
    expect(queryKeys.ai.conversations()).toEqual(['ai', 'conversations']);
  });
});
