CREATE TABLE sponsorship_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsorship_id UUID NOT NULL REFERENCES sponsorships(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sponsorship_messages_sponsorship ON sponsorship_messages(sponsorship_id, created_at ASC);
