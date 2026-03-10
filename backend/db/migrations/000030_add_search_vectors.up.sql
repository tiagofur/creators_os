-- Add generated tsvector columns for full-text search
-- unaccent extension already created in migration 000001

-- unaccent() is STABLE, not IMMUTABLE, so it cannot be used directly in a
-- GENERATED ALWAYS AS expression. Create an IMMUTABLE wrapper that Postgres
-- will accept.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
    RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$
    SELECT unaccent($1);
$$;

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', immutable_unaccent(coalesce(title, '')) || ' ' || immutable_unaccent(coalesce(description, '')))
    ) STORED;

ALTER TABLE contents ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', immutable_unaccent(coalesce(title, '')) || ' ' || immutable_unaccent(coalesce(description, '')))
    ) STORED;

-- series already has search_vector column from migration 000014, skip

ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', immutable_unaccent(coalesce(brand_name, '')) || ' ' || immutable_unaccent(coalesce(notes, '')))
    ) STORED;

CREATE INDEX IF NOT EXISTS ideas_search_vector_gin_idx ON ideas USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS contents_search_vector_gin_idx ON contents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS sponsorships_search_vector_gin_idx ON sponsorships USING GIN (search_vector);
