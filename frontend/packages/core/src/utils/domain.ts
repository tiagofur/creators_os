import type { IdeaStage } from '@ordo/types';
import { IDEA_STAGE_ORDER, PIPELINE_STAGE_ORDER } from '../constants';

/**
 * Computes an idea validation score based on completeness (0–100).
 */
export function computeIdeaValidationScore(idea: {
  title: string;
  description: string | null;
  tags: string[];
  stage: IdeaStage;
}): number {
  let score = 0;
  if (idea.title.length > 10) score += 25;
  if (idea.description && idea.description.length > 50) score += 30;
  if (idea.tags.length > 0) score += 15;

  const stageIndex = IDEA_STAGE_ORDER.indexOf(idea.stage);
  score += Math.round((stageIndex / (IDEA_STAGE_ORDER.length - 1)) * 30);

  return Math.min(100, score);
}

/**
 * Returns a human-readable label for a pipeline stage.
 */
export function buildContentStageLabel(stage: (typeof PIPELINE_STAGE_ORDER)[number]): string {
  const labels: Record<(typeof PIPELINE_STAGE_ORDER)[number], string> = {
    idea: 'Idea',
    scripting: 'Scripting',
    recording: 'Recording',
    editing: 'Editing',
    review: 'Review',
    publishing: 'Publishing',
  };
  return labels[stage];
}
