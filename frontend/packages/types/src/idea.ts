import type { UUID, Timestamp } from './common';

export type IdeaStatus = 'inbox' | 'validated' | 'in_progress' | 'done' | 'archived';
export type IdeaStage = 'raw' | 'refined' | 'scripted' | 'recorded' | 'published';

export interface Idea {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  title: string;
  description: string | null;
  status: IdeaStatus;
  stage: IdeaStage;
  tags: string[];
  validation_score: number | null;
  ai_summary: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
