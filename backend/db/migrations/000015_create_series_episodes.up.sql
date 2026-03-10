CREATE TABLE series_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    content_id UUID REFERENCES contents(id),
    episode_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    status content_status NOT NULL DEFAULT 'idea',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(series_id, episode_number)
);
CREATE INDEX idx_series_episodes_series ON series_episodes(series_id);
