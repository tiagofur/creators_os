import type { AppNotification } from '@ordo/types';

export const mockNotifications: AppNotification[] = [
  {
    id: 'notif_01HQNOT111111111',
    type: 'content_published',
    title: 'Content Published',
    body: 'Your video "10 TypeScript Tips" was published successfully.',
    read: false,
    actionUrl: '/contents/cnt_01HQCNT111111111',
    createdAt: '2025-01-12T15:00:00.000Z',
  },
  {
    id: 'notif_02HQNOT222222222',
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked!',
    body: 'You earned "Consistent Creator" for a 7-day publishing streak.',
    read: false,
    actionUrl: '/achievements',
    createdAt: '2025-01-10T08:00:00.000Z',
  },
  {
    id: 'notif_03HQNOT333333333',
    type: 'deal_update',
    title: 'Deal Stage Updated',
    body: 'DevTools Inc. sponsorship moved to "Contracted" stage.',
    read: true,
    actionUrl: '/sponsorships/deals/deal_01HQDEAL11111111',
    createdAt: '2025-01-08T11:00:00.000Z',
  },
];
