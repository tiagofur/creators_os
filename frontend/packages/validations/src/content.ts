import { z } from 'zod';

export const contentItemSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  idea_id: z.string().uuid().nullable(),
  title: z.string(),
  body: z.string().nullable(),
  status: z.enum(['draft', 'review', 'approved', 'scheduled', 'published', 'archived']),
  pipeline_stage: z.enum(['idea', 'scripting', 'recording', 'editing', 'review', 'publishing']),
  platform: z.string(),
  scheduled_at: z.string().nullable(),
  published_at: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  body: z.string().optional(),
  platform: z.string().min(1, 'Platform is required'),
  idea_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  scheduled_at: z.string().nullable().optional(),
});

export const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().nullable().optional(),
  platform: z.string().optional(),
  status: z.enum(['draft', 'review', 'approved', 'scheduled', 'published', 'archived']).optional(),
  pipeline_stage: z.enum(['idea', 'scripting', 'recording', 'editing', 'review', 'publishing']).optional(),
  scheduled_at: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type ContentItemData = z.infer<typeof contentItemSchema>;
export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
