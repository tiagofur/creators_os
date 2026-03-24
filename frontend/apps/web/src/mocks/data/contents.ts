import type { ContentItem, Series } from '@ordo/types';
import { mockWorkspace } from './workspaces';
import { mockIdea1 } from './ideas';
import { mockUser } from './users';

export const mockContent1: ContentItem = {
  id: 'cnt_01HQCNT111111111',
  workspace_id: mockWorkspace.id,
  created_by: mockUser.id,
  idea_id: mockIdea1.id,
  title: '10 TypeScript Tips for React Developers',
  body: '## Introduction\n\nTypeScript has become the de-facto standard for React development...',
  description: 'A guide covering 10 essential TypeScript tips for React developers.',
  status: 'published',
  content_type: 'video',
  pipeline_stage: 'publishing',
  platform: 'youtube',
  platform_target: 'youtube',
  scheduled_at: '2025-01-12T15:00:00.000Z',
  published_at: '2025-01-12T15:00:00.000Z',
  thumbnail_url: 'https://example.com/thumbnails/ts-tips.jpg',
  tags: ['typescript', 'react', 'tutorial'],
  created_at: '2025-01-08T10:00:00.000Z',
  updated_at: '2025-01-12T15:00:00.000Z',
};

export const mockContent2: ContentItem = {
  id: 'cnt_02HQCNT222222222',
  workspace_id: mockWorkspace.id,
  created_by: mockUser.id,
  idea_id: null,
  title: 'Quick Tip: CSS Grid in 60 Seconds',
  body: 'Short-form content about CSS Grid layouts.',
  description: 'Short-form content about CSS Grid layouts.',
  status: 'scripting',
  content_type: 'short',
  pipeline_stage: 'scripting',
  platform: 'tiktok',
  platform_target: 'tiktok',
  scheduled_at: null,
  published_at: null,
  thumbnail_url: null,
  tags: ['css', 'short-form'],
  created_at: '2025-01-10T16:00:00.000Z',
  updated_at: '2025-01-10T16:00:00.000Z',
};

export const mockContent3: ContentItem = {
  id: 'cnt_03HQCNT333333333',
  workspace_id: mockWorkspace.id,
  created_by: mockUser.id,
  idea_id: null,
  title: 'State Management in 2025: What to Use?',
  body: null,
  description: null,
  status: 'review',
  content_type: 'video',
  pipeline_stage: 'review',
  platform: 'youtube',
  platform_target: 'youtube',
  scheduled_at: '2025-01-20T14:00:00.000Z',
  published_at: null,
  thumbnail_url: 'https://example.com/thumbnails/state-mgmt.jpg',
  tags: ['react', 'state-management'],
  created_at: '2025-01-06T12:00:00.000Z',
  updated_at: '2025-01-11T09:30:00.000Z',
};

export const mockContents: ContentItem[] = [mockContent1, mockContent2, mockContent3];

export const mockSeries1: Series = {
  id: 'ser_01HQSER111111111',
  workspace_id: mockWorkspace.id,
  created_by: mockUser.id,
  title: 'TypeScript Mastery',
  description: 'A series covering advanced TypeScript patterns for web developers.',
  platform: 'youtube',
  created_at: '2025-01-01T08:00:00.000Z',
  updated_at: '2025-01-08T10:00:00.000Z',
};

export const mockSeries: Series[] = [mockSeries1];
