import type { UUID, Timestamp } from './common';

export type ContentStatus =
  | 'idea'
  | 'scripting'
  | 'recording'
  | 'editing'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'archived';

export type ContentType = 'video' | 'short' | 'reel' | 'post' | 'thread';

export type PlatformType = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin';

/** @deprecated Use ContentStatus instead. Kept for backward compatibility. */
export type PipelineStage = 'idea' | 'scripting' | 'recording' | 'editing' | 'review' | 'publishing';

export interface ContentItem {
  id: UUID;
  workspace_id: UUID;
  created_by: UUID;
  title: string;
  description?: string | null;
  status: ContentStatus;
  content_type: ContentType;
  platform_target?: PlatformType | null;
  scheduled_at?: Timestamp | null;
  published_at?: Timestamp | null;
  due_date?: Timestamp | null;
  metadata?: Record<string, unknown> | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;

  // Legacy fields kept for backward compatibility
  /** @deprecated Use description instead */
  body?: string | null;
  /** @deprecated Use content_type and platform_target instead */
  platform?: string;
  /** @deprecated Use ContentStatus instead */
  pipeline_stage?: PipelineStage;
  idea_id?: UUID | null;
  thumbnail_url?: string | null;
  tags?: string[];
}

export interface ContentAssignment {
  id: UUID;
  content_id: UUID;
  user_id: UUID;
  role: string;
  assigned_at: Timestamp;
}

export interface KanbanBoard {
  columns: Record<string, ContentItem[]>;
}

export interface ContentTemplate {
  id: UUID;
  workspace_id: UUID;
  name: string;
  description?: string | null;
  content_type: ContentType;
  platform_target?: PlatformType | null;
  default_checklist?: Record<string, unknown> | null;
  prompt_template?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  content_type: ContentType;
  platform_target?: PlatformType;
  default_checklist?: Record<string, unknown>;
  prompt_template?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  content_type?: ContentType;
  platform_target?: PlatformType;
  default_checklist?: Record<string, unknown>;
  prompt_template?: string;
  metadata?: Record<string, unknown>;
}

export interface InstantiateTemplateInput {
  topic: string;
  use_ai: boolean;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalLink {
  id: UUID;
  content_id: UUID;
  workspace_id?: UUID;
  token: string;
  reviewer_name?: string;
  reviewer_email?: string;
  status: ApprovalStatus;
  comment?: string;
  expires_at: Timestamp;
  decided_at?: Timestamp;
  created_at: Timestamp;
}

export interface CreateApprovalLinkInput {
  reviewer_name?: string;
  reviewer_email?: string;
  expires_in_hours?: number;
}

export interface Series {
  id: UUID;
  workspace_id: UUID;
  created_by: UUID;
  title: string;
  description?: string | null;
  platform?: PlatformType | null;
  template?: Record<string, unknown> | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;
}

export interface SeriesEpisode {
  id: UUID;
  series_id: UUID;
  content_id?: UUID | null;
  episode_number: number;
  title: string;
  status: ContentStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SeriesPublishingSchedule {
  id: UUID;
  series_id: UUID;
  frequency: string; // daily, weekly, biweekly, monthly
  day_of_week?: number | null; // 0=Sunday, 6=Saturday
  time_of_day: string; // HH:MM
  timezone: string;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
