import { createWorkspaceSchema, updateWorkspaceSchema, inviteMemberSchema } from '../workspace';

describe('createWorkspaceSchema', () => {
  const validWorkspace = {
    name: 'My Workspace',
    slug: 'my-workspace',
    timezone: 'America/New_York',
  };

  it('accepts valid workspace data', () => {
    const result = createWorkspaceSchema.safeParse(validWorkspace);
    expect(result.success).toBe(true);
  });

  it('rejects name too short', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes('name'));
      expect(nameIssue).toBeDefined();
      expect(nameIssue!.message).toBe('Name must be at least 2 characters');
    }
  });

  it('accepts name of exactly 2 characters', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, name: 'AB' });
    expect(result.success).toBe(true);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, name: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts name of exactly 100 characters', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, name: 'A'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('rejects slug too short', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, slug: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects slug exceeding 50 characters', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, slug: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts slug of exactly 50 characters', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, slug: 'a'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('rejects slug with uppercase letters', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, slug: 'My-Workspace' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const slugIssue = result.error.issues.find((i) => i.path.includes('slug'));
      expect(slugIssue).toBeDefined();
      expect(slugIssue!.message).toBe(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
    }
  });

  it('rejects slug with spaces', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, slug: 'my workspace' });
    expect(result.success).toBe(false);
  });

  it('rejects slug with special characters', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, slug: 'my_workspace!' });
    expect(result.success).toBe(false);
  });

  it('accepts slug with numbers and hyphens', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, slug: 'my-workspace-123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty timezone', () => {
    const result = createWorkspaceSchema.safeParse({ ...validWorkspace, timezone: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const tzIssue = result.error.issues.find((i) => i.path.includes('timezone'));
      expect(tzIssue).toBeDefined();
      expect(tzIssue!.message).toBe('Timezone is required');
    }
  });

  it('rejects missing required fields', () => {
    const result = createWorkspaceSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('name');
      expect(paths).toContain('slug');
      expect(paths).toContain('timezone');
    }
  });
});

describe('updateWorkspaceSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateWorkspaceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with name', () => {
    const result = updateWorkspaceSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('rejects name too short', () => {
    const result = updateWorkspaceSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = updateWorkspaceSchema.safeParse({ name: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts valid slug', () => {
    const result = updateWorkspaceSchema.safeParse({ slug: 'new-slug' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid slug', () => {
    const result = updateWorkspaceSchema.safeParse({ slug: 'Invalid Slug!' });
    expect(result.success).toBe(false);
  });

  it('rejects slug too short', () => {
    const result = updateWorkspaceSchema.safeParse({ slug: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects slug too long', () => {
    const result = updateWorkspaceSchema.safeParse({ slug: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts valid logo_url', () => {
    const result = updateWorkspaceSchema.safeParse({ logo_url: 'https://example.com/logo.png' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable logo_url', () => {
    const result = updateWorkspaceSchema.safeParse({ logo_url: null });
    expect(result.success).toBe(true);
  });

  it('rejects invalid logo_url', () => {
    const result = updateWorkspaceSchema.safeParse({ logo_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts timezone string', () => {
    const result = updateWorkspaceSchema.safeParse({ timezone: 'UTC' });
    expect(result.success).toBe(true);
  });
});

describe('inviteMemberSchema', () => {
  const validInvite = {
    email: 'member@example.com',
    role: 'editor' as const,
  };

  it('accepts valid invite data', () => {
    const result = inviteMemberSchema.safeParse(validInvite);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, email: 'bad-email' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = inviteMemberSchema.safeParse({ role: 'editor' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid role values', () => {
    const roles = ['admin', 'editor', 'viewer'] as const;
    for (const role of roles) {
      const result = inviteMemberSchema.safeParse({ ...validInvite, role });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid role', () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, role: 'superadmin' });
    expect(result.success).toBe(false);
  });

  it('rejects missing role', () => {
    const result = inviteMemberSchema.safeParse({ email: 'member@example.com' });
    expect(result.success).toBe(false);
  });
});
