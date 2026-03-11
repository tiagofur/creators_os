import { contentItemSchema, createContentSchema, updateContentSchema } from '../content';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

describe('contentItemSchema', () => {
  const validContent = {
    id: validUUID,
    workspace_id: validUUID,
    idea_id: validUUID,
    title: 'My Video',
    body: 'Video script content',
    status: 'draft' as const,
    pipeline_stage: 'idea' as const,
    platform: 'youtube',
    scheduled_at: '2024-06-01T10:00:00Z',
    published_at: null,
    thumbnail_url: null,
    tags: ['vlog', 'tech'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('accepts valid content item', () => {
    const result = contentItemSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields as null', () => {
    const result = contentItemSchema.safeParse({
      ...validContent,
      idea_id: null,
      body: null,
      scheduled_at: null,
      published_at: null,
      thumbnail_url: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status enum', () => {
    const result = contentItemSchema.safeParse({ ...validContent, status: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const statusIssue = result.error.issues.find((i) => i.path.includes('status'));
      expect(statusIssue).toBeDefined();
    }
  });

  it('accepts all valid status values', () => {
    const statuses = ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'] as const;
    for (const status of statuses) {
      const result = contentItemSchema.safeParse({ ...validContent, status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid pipeline_stage enum', () => {
    const result = contentItemSchema.safeParse({ ...validContent, pipeline_stage: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid pipeline_stage values', () => {
    const stages = ['idea', 'scripting', 'recording', 'editing', 'review', 'publishing'] as const;
    for (const pipeline_stage of stages) {
      const result = contentItemSchema.safeParse({ ...validContent, pipeline_stage });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid UUID for id', () => {
    const result = contentItemSchema.safeParse({ ...validContent, id: 'bad-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = contentItemSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('id');
      expect(paths).toContain('title');
      expect(paths).toContain('status');
      expect(paths).toContain('platform');
      expect(paths).toContain('tags');
    }
  });

  it('rejects non-array tags', () => {
    const result = contentItemSchema.safeParse({ ...validContent, tags: 'not-array' });
    expect(result.success).toBe(false);
  });
});

describe('createContentSchema', () => {
  const validCreate = {
    title: 'New Video',
    platform: 'youtube',
  };

  it('accepts valid create content with required fields only', () => {
    const result = createContentSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('accepts valid create content with all optional fields', () => {
    const result = createContentSchema.safeParse({
      ...validCreate,
      body: 'Script content here',
      idea_id: validUUID,
      tags: ['tech'],
      scheduled_at: '2024-06-01T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts scheduled_at as null', () => {
    const result = createContentSchema.safeParse({ ...validCreate, scheduled_at: null });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createContentSchema.safeParse({ ...validCreate, title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleIssue = result.error.issues.find((i) => i.path.includes('title'));
      expect(titleIssue).toBeDefined();
      expect(titleIssue!.message).toBe('Title is required');
    }
  });

  it('rejects title exceeding 500 characters', () => {
    const result = createContentSchema.safeParse({ ...validCreate, title: 'A'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects empty platform', () => {
    const result = createContentSchema.safeParse({ title: 'Valid', platform: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const platformIssue = result.error.issues.find((i) => i.path.includes('platform'));
      expect(platformIssue).toBeDefined();
      expect(platformIssue!.message).toBe('Platform is required');
    }
  });

  it('rejects missing title', () => {
    const result = createContentSchema.safeParse({ platform: 'youtube' });
    expect(result.success).toBe(false);
  });

  it('rejects missing platform', () => {
    const result = createContentSchema.safeParse({ title: 'Valid Title' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid idea_id (not UUID)', () => {
    const result = createContentSchema.safeParse({ ...validCreate, idea_id: 'not-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('updateContentSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateContentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with title', () => {
    const result = updateContentSchema.safeParse({ title: 'Updated Title' });
    expect(result.success).toBe(true);
  });

  it('rejects empty string title (min 1)', () => {
    const result = updateContentSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 500 characters', () => {
    const result = updateContentSchema.safeParse({ title: 'A'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts nullable body', () => {
    const result = updateContentSchema.safeParse({ body: null });
    expect(result.success).toBe(true);
  });

  it('accepts valid status', () => {
    const result = updateContentSchema.safeParse({ status: 'approved' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateContentSchema.safeParse({ status: 'bad_status' });
    expect(result.success).toBe(false);
  });

  it('accepts valid pipeline_stage', () => {
    const result = updateContentSchema.safeParse({ pipeline_stage: 'editing' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid pipeline_stage', () => {
    const result = updateContentSchema.safeParse({ pipeline_stage: 'bad_stage' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable scheduled_at', () => {
    const result = updateContentSchema.safeParse({ scheduled_at: null });
    expect(result.success).toBe(true);
  });

  it('accepts valid thumbnail_url', () => {
    const result = updateContentSchema.safeParse({ thumbnail_url: 'https://example.com/img.png' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable thumbnail_url', () => {
    const result = updateContentSchema.safeParse({ thumbnail_url: null });
    expect(result.success).toBe(true);
  });

  it('rejects invalid thumbnail_url', () => {
    const result = updateContentSchema.safeParse({ thumbnail_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts tags array', () => {
    const result = updateContentSchema.safeParse({ tags: ['new-tag'] });
    expect(result.success).toBe(true);
  });
});
