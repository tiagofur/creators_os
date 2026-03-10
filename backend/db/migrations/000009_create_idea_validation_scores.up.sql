CREATE TABLE idea_validation_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    novelty_score INTEGER NOT NULL CHECK (novelty_score BETWEEN 0 AND 100),
    audience_fit_score INTEGER NOT NULL CHECK (audience_fit_score BETWEEN 0 AND 100),
    viability_score INTEGER NOT NULL CHECK (viability_score BETWEEN 0 AND 100),
    urgency_score INTEGER NOT NULL CHECK (urgency_score BETWEEN 0 AND 100),
    personal_fit_score INTEGER NOT NULL CHECK (personal_fit_score BETWEEN 0 AND 100),
    overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    ai_reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(idea_id)
);
