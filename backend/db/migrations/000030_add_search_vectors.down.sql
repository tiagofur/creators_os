DROP INDEX IF EXISTS ideas_search_vector_gin_idx;
DROP INDEX IF EXISTS contents_search_vector_gin_idx;
DROP INDEX IF EXISTS sponsorships_search_vector_gin_idx;
ALTER TABLE ideas DROP COLUMN IF EXISTS search_vector;
ALTER TABLE contents DROP COLUMN IF EXISTS search_vector;
ALTER TABLE sponsorships DROP COLUMN IF EXISTS search_vector;
DROP FUNCTION IF EXISTS immutable_unaccent(text);
