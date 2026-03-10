CREATE TABLE content_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL DEFAULT 'assignee',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(content_id, user_id)
);
CREATE INDEX idx_content_assignments_content ON content_assignments(content_id);
CREATE INDEX idx_content_assignments_user ON content_assignments(user_id);
