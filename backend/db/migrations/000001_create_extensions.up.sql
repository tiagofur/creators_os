CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for LIKE/ILIKE index acceleration
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- for FTS normalization (Phase 6)
