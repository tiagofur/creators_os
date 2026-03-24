import type { UUID, Timestamp } from './common';
import type { PlatformType } from './content';

export type IdeaStatus = 'draft' | 'validating' | 'validated' | 'promoted' | 'archived';

/** @deprecated Use IdeaStatus instead */
export type IdeaStage = 'raw' | 'refined' | 'scripted' | 'recorded' | 'published';

export interface IdeaValidationScore {
  novelty_score: number;
  audience_fit_score: number;
  viability_score: number;
  urgency_score: number;
  personal_fit_score: number;
  overall_score: number;
  ai_reasoning?: string | null;
}

export interface Idea {
  id: UUID;
  workspace_id: UUID;
  created_by: UUID;
  title: string;
  description?: string | null;
  status: IdeaStatus;
  platform_target?: PlatformType | null;
  promoted_to_content_id?: UUID | null;
  metadata?: Record<string, unknown> | null;
  tags: string[];
  validation_score?: IdeaValidationScore | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;

  // Legacy aliases kept for backward compatibility
  /** @deprecated Use created_by instead */
  user_id?: UUID;
  /** @deprecated Use IdeaStatus values instead */
  stage?: IdeaStage;
  /** @deprecated Use validation_score.overall_score instead */
  ai_summary?: string | null;
}
