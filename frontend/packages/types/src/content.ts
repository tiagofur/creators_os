import type { UUID, Timestamp } from './common';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived';
export type PipelineStage = 'idea' | 'scripting' | 'recording' | 'editing' | 'review' | 'publishing';

export interface ContentItem {
  id: UUID;
  workspace_id: UUID;
  idea_id: UUID | null;
  title: string;
  body: string | null;
  status: ContentStatus;
  pipeline_stage: PipelineStage;
  platform: string;
  scheduled_at: Timestamp | null;
  published_at: Timestamp | null;
  thumbnail_url: string | null;
  tags: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Series {
  id: UUID;
  workspace_id: UUID;
  name: string;
  description: string | null;
  cover_url: string | null;
  content_ids: UUID[];
  created_at: Timestamp;
  updated_at: Timestamp;
}
