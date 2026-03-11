import { ideaSchema, createIdeaSchema, updateIdeaSchema } from '../idea';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

describe('ideaSchema', () => {
  const validIdea = {
    id: validUUID,
    workspace_id: validUUID,
    user_id: validUUID,
    title: 'Test Idea',
    description: 'A test idea description',
    status: 'inbox' as const,
    stage: 'raw' as const,
    tags: ['tag1', 'tag2'],
    validation_score: 85,
    ai_summary: 'AI generated summary',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('accepts valid idea', () => {
    const result = ideaSchema.safeParse(validIdea);
    expect(result.success).toBe(true);
  });

  it('accepts nullable description', () => {
    const result = ideaSchema.safeParse({ ...validIdea, description: null });
    expect(result.success).toBe(true);
  });

  it('accepts nullable validation_score', () => {
    const result = ideaSchema.safeParse({ ...validIdea, validation_score: null });
    expect(result.success).toBe(true);
  });

  it('accepts nullable ai_summary', () => {
    const result = ideaSchema.safeParse({ ...validIdea, ai_summary: null });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status enum', () => {
    const result = ideaSchema.safeParse({ ...validIdea, status: 'pending' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const statusIssue = result.error.issues.find((i) => i.path.includes('status'));
      expect(statusIssue).toBeDefined();
    }
  });

  it('accepts all valid status values', () => {
    const statuses = ['inbox', 'validated', 'in_progress', 'done', 'archived'] as const;
    for (const status of statuses) {
      const result = ideaSchema.safeParse({ ...validIdea, status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid stage enum', () => {
    const result = ideaSchema.safeParse({ ...validIdea, stage: 'unknown' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const stageIssue = result.error.issues.find((i) => i.path.includes('stage'));
      expect(stageIssue).toBeDefined();
    }
  });

  it('accepts all valid stage values', () => {
    const stages = ['raw', 'refined', 'scripted', 'recorded', 'published'] as const;
    for (const stage of stages) {
      const result = ideaSchema.safeParse({ ...validIdea, stage });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid UUID for id', () => {
    const result = ideaSchema.safeParse({ ...validIdea, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for workspace_id', () => {
    const result = ideaSchema.safeParse({ ...validIdea, workspace_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = ideaSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('id');
      expect(paths).toContain('title');
      expect(paths).toContain('status');
      expect(paths).toContain('stage');
      expect(paths).toContain('tags');
    }
  });

  it('rejects empty tags (wrong type)', () => {
    const result = ideaSchema.safeParse({ ...validIdea, tags: 'not-array' });
    expect(result.success).toBe(false);
  });
});

describe('createIdeaSchema', () => {
  it('accepts valid create idea with only required fields', () => {
    const result = createIdeaSchema.safeParse({ title: 'My Idea' });
    expect(result.success).toBe(true);
  });

  it('accepts valid create idea with all fields', () => {
    const result = createIdeaSchema.safeParse({
      title: 'My Idea',
      description: 'A description',
      tags: ['tag1'],
      status: 'inbox',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createIdeaSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleIssue = result.error.issues.find((i) => i.path.includes('title'));
      expect(titleIssue).toBeDefined();
      expect(titleIssue!.message).toBe('Title is required');
    }
  });

  it('rejects title exceeding 500 characters', () => {
    const result = createIdeaSchema.safeParse({ title: 'A'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts title of exactly 500 characters', () => {
    const result = createIdeaSchema.safeParse({ title: 'A'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects description exceeding 5000 characters', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Valid Title',
      description: 'A'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts description of exactly 5000 characters', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Valid Title',
      description: 'A'.repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const result = createIdeaSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const result = createIdeaSchema.safeParse({ title: 'Valid', status: 'invalid_status' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid optional status values', () => {
    const statuses = ['inbox', 'validated', 'in_progress', 'done', 'archived'] as const;
    for (const status of statuses) {
      const result = createIdeaSchema.safeParse({ title: 'Valid', status });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateIdeaSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateIdeaSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with title', () => {
    const result = updateIdeaSchema.safeParse({ title: 'Updated Title' });
    expect(result.success).toBe(true);
  });

  it('rejects empty string title (min 1)', () => {
    const result = updateIdeaSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 500 characters', () => {
    const result = updateIdeaSchema.safeParse({ title: 'A'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts nullable description', () => {
    const result = updateIdeaSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('rejects description exceeding 5000 characters', () => {
    const result = updateIdeaSchema.safeParse({ description: 'A'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('accepts valid status', () => {
    const result = updateIdeaSchema.safeParse({ status: 'validated' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateIdeaSchema.safeParse({ status: 'bad_status' });
    expect(result.success).toBe(false);
  });

  it('accepts valid stage', () => {
    const result = updateIdeaSchema.safeParse({ stage: 'refined' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid stage', () => {
    const result = updateIdeaSchema.safeParse({ stage: 'bad_stage' });
    expect(result.success).toBe(false);
  });

  it('accepts tags array', () => {
    const result = updateIdeaSchema.safeParse({ tags: ['new-tag'] });
    expect(result.success).toBe(true);
  });
});
