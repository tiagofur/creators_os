CREATE TABLE consistency_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    published_count INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(user_id, workspace_id, recorded_at)
);
CREATE INDEX idx_consistency_scores_user ON consistency_scores(user_id, recorded_at DESC);
