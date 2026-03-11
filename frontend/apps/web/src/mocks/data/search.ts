import type { SearchResult } from '@ordo/types';

export const mockSearchResults: SearchResult[] = [
  {
    id: 'idea_01HQIDEA11111111',
    type: 'idea',
    title: '10 TypeScript Tips for React Developers',
    subtitle: 'validated / refined',
    url: '/ideas/idea_01HQIDEA11111111',
    icon: 'lightbulb',
  },
  {
    id: 'cnt_01HQCNT111111111',
    type: 'content',
    title: '10 TypeScript Tips for React Developers',
    subtitle: 'youtube / published',
    url: '/contents/cnt_01HQCNT111111111',
    icon: 'video',
  },
  {
    id: 'ser_01HQSER111111111',
    type: 'series',
    title: 'TypeScript Mastery',
    subtitle: '1 item',
    url: '/series/ser_01HQSER111111111',
    icon: 'collection',
  },
  {
    id: 'brand_01HQBRAND1111111',
    type: 'brand',
    title: 'DevTools Inc.',
    subtitle: 'developer-tools',
    url: '/sponsorships/brands/brand_01HQBRAND1111111',
    icon: 'building',
  },
];
