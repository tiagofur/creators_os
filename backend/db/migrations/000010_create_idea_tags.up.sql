CREATE TABLE idea_tags (
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (idea_id, tag)
);
CREATE INDEX idx_idea_tags_idea ON idea_tags(idea_id);
