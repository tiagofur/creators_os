CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    criteria JSONB NOT NULL DEFAULT '{}',
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seed initial achievements
INSERT INTO achievements (slug, name, description, criteria, points) VALUES
    ('first_publish', 'First Publish', 'Published your first piece of content', '{"published_count": 1}', 10),
    ('streak_7', '7-Day Streak', 'Published content 7 days in a row', '{"streak_days": 7}', 25),
    ('streak_30', '30-Day Streak', 'Published content 30 days in a row', '{"streak_days": 30}', 100),
    ('prolific_10', 'Prolific Creator', 'Published 10 pieces of content', '{"published_count": 10}', 50),
    ('prolific_100', 'Content Machine', 'Published 100 pieces of content', '{"published_count": 100}', 200);
