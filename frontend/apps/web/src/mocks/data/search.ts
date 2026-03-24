import type { SearchResult } from '@ordo/types';

export const mockSearchResults: SearchResult[] = [
  {
    id: 'idea_01HQIDEA11111111',
    type: 'idea',
    title: '10 TypeScript Tips for React Developers',
    description: 'validated / refined',
    rank: 1,
    subtitle: 'validated / refined',
    url: '/ideas/idea_01HQIDEA11111111',
    icon: 'lightbulb',
  },
  {
    id: 'cnt_01HQCNT111111111',
    type: 'content',
    title: '10 TypeScript Tips for React Developers',
    description: 'youtube / published',
    rank: 2,
    subtitle: 'youtube / published',
    url: '/contents/cnt_01HQCNT111111111',
    icon: 'video',
  },
  {
    id: 'ser_01HQSER111111111',
    type: 'series',
    title: 'TypeScript Mastery',
    description: '1 item',
    rank: 3,
    subtitle: '1 item',
    url: '/series/ser_01HQSER111111111',
    icon: 'collection',
  },
  {
    id: 'deal_01HQDEAL11111111',
    type: 'sponsorship',
    title: 'TypeScript Course Sponsorship',
    description: 'DevTools Inc.',
    rank: 4,
    subtitle: 'developer-tools',
    url: '/sponsorships/deal_01HQDEAL11111111',
    icon: 'building',
  },
];
