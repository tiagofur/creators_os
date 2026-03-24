import type { Idea } from '@ordo/types';
import { mockWorkspace } from './workspaces';
import { mockUser } from './users';

export const mockIdea1: Idea = {
  id: 'idea_01HQIDEA11111111',
  workspace_id: mockWorkspace.id,
  created_by: mockUser.id,
  user_id: mockUser.id,
  title: '10 TypeScript Tips for React Developers',
  description: 'A comprehensive guide to TypeScript patterns that make React development smoother.',
  status: 'validated',
  stage: 'refined',
  tags: ['typescript', 'react', 'tutorial'],
  validation_score: {
    novelty_score: 7,
    audience_fit_score: 9,
    viability_score: 8,
    urgency_score: 7,
    personal_fit_score: 9,
    overall_score: 85,
    ai_reasoning: 'High-value educational content targeting intermediate React developers.',
  },
  ai_summary: 'High-value educational content targeting intermediate React developers.',
  created_at: '2025-01-05T09:00:00.000Z',
  updated_at: '2025-01-08T16:30:00.000Z',
};

export const mockIdea2: Idea = {
  id: 'idea_02HQIDEA22222222',
  workspace_id: mockWorkspace.id,
  created_by: mockUser.id,
  user_id: mockUser.id,
  title: 'Building a Real-Time Chat with WebSockets',
  description: 'Step-by-step tutorial on building a chat app with Socket.io and Next.js.',
  status: 'draft',
  stage: 'raw',
  tags: ['websockets', 'nextjs', 'realtime'],
  validation_score: null,
  ai_summary: null,
  created_at: '2025-01-10T14:00:00.000Z',
  updated_at: '2025-01-10T14:00:00.000Z',
};

export const mockIdea3: Idea = {
  id: 'idea_03HQIDEA33333333',
  workspace_id: mockWorkspace.id,
  created_by: mockUser.id,
  user_id: mockUser.id,
  title: 'Why I Switched from Vim to Neovim',
  description: 'Personal story about the Neovim migration and productivity gains.',
  status: 'validating',
  stage: 'scripted',
  tags: ['neovim', 'productivity', 'devtools'],
  validation_score: {
    novelty_score: 6,
    audience_fit_score: 7,
    viability_score: 8,
    urgency_score: 5,
    personal_fit_score: 8,
    overall_score: 72,
    ai_reasoning: 'Relatable dev-tools content with strong opinion angle.',
  },
  ai_summary: 'Relatable dev-tools content with strong opinion angle.',
  created_at: '2024-12-20T11:00:00.000Z',
  updated_at: '2025-01-09T08:45:00.000Z',
};

export const mockIdeas: Idea[] = [mockIdea1, mockIdea2, mockIdea3];
