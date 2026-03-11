import { z } from 'zod';

const slugRegex = /^[a-z0-9-]+$/;

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(slugRegex, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  timezone: z.string().min(1, 'Timezone is required'),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(slugRegex).optional(),
  timezone: z.string().optional(),
  logo_url: z.string().url().nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
