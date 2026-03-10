CREATE TABLE series_publishing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE UNIQUE,
    frequency VARCHAR(50) NOT NULL, -- 'daily','weekly','biweekly','monthly'
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    time_of_day TIME NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
