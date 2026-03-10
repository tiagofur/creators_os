CREATE TYPE sponsorship_status AS ENUM ('lead', 'negotiating', 'active', 'completed', 'rejected');

CREATE TABLE sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    status sponsorship_status NOT NULL DEFAULT 'lead',
    deal_value NUMERIC(12,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_sponsorships_workspace ON sponsorships(workspace_id, status) WHERE deleted_at IS NULL;
