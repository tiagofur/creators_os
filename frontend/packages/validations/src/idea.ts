import { z } from 'zod';

export const ideaSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['inbox', 'validated', 'in_progress', 'done', 'archived']),
  stage: z.enum(['raw', 'refined', 'scripted', 'recorded', 'published']),
  tags: z.array(z.string()),
  validation_score: z.number().nullable(),
  ai_summary: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['inbox', 'validated', 'in_progress', 'done', 'archived']).optional(),
});

export const updateIdeaSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['inbox', 'validated', 'in_progress', 'done', 'archived']).optional(),
  stage: z.enum(['raw', 'refined', 'scripted', 'recorded', 'published']).optional(),
});

export type IdeaData = z.infer<typeof ideaSchema>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;
