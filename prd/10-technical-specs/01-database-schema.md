# Database Schema — Ordo Creator OS

**Production-Ready PostgreSQL 16+ Schema**

Last Updated: 2026-03-10
Status: Ready for Migration

---

## 1. Database Strategy

### Primary Database
- **PostgreSQL 16+** as the single source of truth
- Full ACID compliance for critical transactions
- Native JSON/JSONB support for flexible metadata
- Built-in partitioning for analytics tables
- Row-Level Security (RLS) for multi-tenant isolation

### Architecture Decisions

#### Primary Keys
- **UUID v7** for all primary keys
- Time-sortable, monotonically increasing
- Distributed system friendly (no sequence coordination)
- Better index locality than UUID v4

#### Timestamps
- **created_at**: Immutable, UTC timestamp with timezone
- **updated_at**: Auto-updated on any modification, UTC with timezone
- **deleted_at**: Soft delete marker (NULL = active, populated = archived)
- All timestamps use `TIMESTAMP WITH TIME ZONE` for clarity

#### Flexible Data
- **JSONB** for semi-structured metadata (not fully schematized but queryable)
- Used for: `metadata`, `settings`, `config`, `breakdown`, `chapters`, etc.
- Enables future extensibility without schema migrations
- GIN indexes on JSONB fields for fast queries

#### Partitioning Strategy
- **content_analytics** partitioned by RANGE on `fetched_at` (monthly partitions)
- Enables fast purges of old analytics data
- Improves query performance on large tables
- Automatic partition creation via trigger

#### Multi-Tenancy & RLS
- **workspace_id** as the primary organization boundary
- Row-Level Security (RLS) policies on all workspace-scoped tables
- Users only access data from workspaces where `workspace_members.user_id = current_user_id`
- RLS disabled for migrations (run with `rls.skip = true`)

#### Connection Pooling
- **PgBouncer** for connection pooling (min: 20, max: 100 per environment)
- Transaction mode for high-concurrency endpoints
- Session mode for long-lived connections (webhooks, background jobs)

#### Read Replicas
- Real-time replication for analytics queries
- Analytics queries route to replica (using read-only transaction)
- Transactional queries route to primary

### Backup & Recovery
- **WAL archiving** to S3 every 60 seconds
- **Full backup** daily at 02:00 UTC
- **Point-in-time recovery** available for 7 days
- **Export to Parquet** weekly for data warehouse

---

## 2. Naming Conventions

### Tables
```
snake_case, plural
✓ users, ideas, contents, workspace_members
✓ content_analytics, ai_conversations
✗ user (singular), Users (capitalized)
```

### Columns
```
snake_case, lowercase
✓ user_id, workspace_id, created_at, is_published
✗ UserId, user_ID, createdAt
```

### Primary Keys
```
Always: id (UUID)
✓ users.id, ideas.id, contents.id
```

### Foreign Keys
```
{table_singular}_id (matches the referenced table)
✓ user_id → references users(id)
✓ workspace_id → references workspaces(id)
✓ content_id → references contents(id)
✗ fk_users, user_fk
```

### Unique Constraints
```
{table}_{type}_{columns}
✓ users_uq_email
✓ workspace_members_uq_workspace_user
✗ unique_users_email, email_unique
```

### Indexes
```
idx_{table}_{columns}
✓ idx_ideas_workspace_id
✓ idx_content_analytics_content_id_platform
✗ ideas_workspace_idx, idx_content_platform_analytics
```

### Check Constraints
```
{table}_ck_{column}_{condition}
✓ users_ck_ai_credits_remaining_gte_zero
✓ contents_ck_priority_valid
```

### Default Values
- Use sensible defaults: `created_at DEFAULT NOW()`, `deleted_at DEFAULT NULL`
- Avoid complex logic in defaults (do in application)

---

## 3. Enum Types

All enums are created as SQL types (not strings) for type safety and constraint enforcement.

```sql
-- Content Status: Full lifecycle of a piece
CREATE TYPE content_status AS ENUM (
    'idea',           -- Captured but not in pipeline
    'scripting',      -- Script being written
    'filming',        -- Production in progress
    'editing',        -- Post-production
    'review',         -- Awaiting approval
    'scheduled',      -- Ready to publish
    'published',      -- Live on platform
    'archived'        -- Retired/no longer active
);

-- Content Type: Format of the content
CREATE TYPE content_type AS ENUM (
    'video',          -- Long-form video (YouTube, long-form)
    'short',          -- Short-form video (TikTok, Reels, Shorts)
    'reel',           -- Instagram/Facebook reel
    'post',           -- Social media post (Instagram, LinkedIn, Facebook)
    'article',        -- Blog post or written article
    'tweet',          -- Twitter post (single or thread)
    'thread',         -- Twitter/X thread (multiple tweets)
    'carousel',       -- Multi-slide carousel (Instagram, LinkedIn)
    'newsletter',     -- Email newsletter
    'podcast',        -- Audio podcast episode
    'story'           -- Ephemeral story (Instagram, Facebook)
);

-- Platform: Publishing destinations
CREATE TYPE platform_type AS ENUM (
    'youtube',        -- YouTube
    'tiktok',         -- TikTok
    'instagram',      -- Instagram
    'twitter',        -- Twitter/X
    'linkedin',       -- LinkedIn
    'facebook',       -- Facebook
    'newsletter',     -- Email newsletter (own system)
    'blog',           -- Blog (own platform)
    'podcast',        -- Podcast hosting (Spotify, Apple, etc.)
    'pinterest'       -- Pinterest
);

-- Idea Status: Lifecycle of an idea
CREATE TYPE idea_status AS ENUM (
    'captured',       -- Just captured, not yet validated
    'validated',      -- Scored and evaluated
    'transformed',    -- AI analysis applied, ready to promote
    'archived',       -- Intentionally archived
    'graveyard'       -- Auto-archived after 30 days untouched
);

-- Priority Level: Content priority
CREATE TYPE priority_level AS ENUM (
    'low',            -- Can be pushed back
    'medium',         -- Standard priority
    'high',           -- Should be prioritized
    'urgent'          -- Critical, ship ASAP
);

-- Subscription Tier: Pricing tier
CREATE TYPE subscription_tier AS ENUM (
    'free',           -- Free tier (limited features)
    'pro',            -- Professional tier ($12/mo)
    'enterprise'      -- Enterprise tier ($29/mo)
);

-- AI Operation Type: Type of AI operation for credit tracking
CREATE TYPE ai_operation_type AS ENUM (
    'chat',           -- Chat conversation
    'brainstorm',     -- Brainstorm ideas
    'script_gen',     -- Script generation
    'title_gen',      -- Title generation
    'description_gen', -- Description generation
    'repurpose',      -- Content repurposing/remix
    'analyze',        -- Content analysis
    'thumbnail',      -- Thumbnail generation
    'transcribe',     -- Transcription
    'translate'       -- Translation
);

-- Notification Type: Type of notification
CREATE TYPE notification_type AS ENUM (
    'system',         -- System notifications
    'achievement',    -- Achievement unlocked
    'reminder',       -- Reminder/due date
    'collaboration',  -- Team collaboration alert
    'ai_suggestion'   -- AI suggestion or insight
);

-- Sponsorship Status: Deal pipeline status
CREATE TYPE sponsorship_status AS ENUM (
    'lead',           -- Initial contact/prospect
    'negotiation',    -- Discussing terms
    'signed',         -- Agreement signed
    'in_progress',    -- Deliverables in progress
    'delivered',      -- Content delivered
    'paid',           -- Payment received
    'cancelled'       -- Deal cancelled
);

-- Remix Output Type: Type of repurposed content
CREATE TYPE remix_output_type AS ENUM (
    'short_clip',     -- Short-form extracted clip
    'blog_post',      -- Blog post from transcript
    'twitter_thread', -- Twitter thread
    'linkedin_post',  -- LinkedIn post/article
    'instagram_carousel', -- Instagram carousel
    'newsletter_section', -- Newsletter section
    'quote_card'      -- Standalone quote graphic
);

-- Workspace Role: User role in workspace
CREATE TYPE workspace_role AS ENUM (
    'owner',          -- Full access, can delete workspace
    'admin',          -- Full access, cannot delete workspace
    'editor',         -- Can create/edit content
    'viewer'          -- Read-only access
);

-- Billing Interval: Subscription billing period
CREATE TYPE billing_interval AS ENUM (
    'monthly',        -- Monthly billing
    'yearly'          -- Yearly billing
);

-- Content Status (external publishing)
CREATE TYPE scheduled_post_status AS ENUM (
    'draft',          -- Not yet scheduled
    'scheduled',      -- Waiting to publish
    'published',      -- Successfully published
    'failed',         -- Publication failed
    'cancelled'       -- Publication cancelled
);

-- Activity Type: For audit logs
CREATE TYPE activity_type AS ENUM (
    'created',        -- Entity created
    'updated',        -- Entity updated
    'deleted',        -- Entity deleted
    'restored',       -- Entity restored from trash
    'shared',         -- Entity shared
    'published',      -- Entity published
    'archived'        -- Entity archived
);
```

---

## 4. Core Tables

### Core / Authentication

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    locale VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    subscription_tier subscription_tier DEFAULT 'free',
    ai_credits_remaining INTEGER DEFAULT 0,
    ai_credits_reset_at TIMESTAMP WITH TIME ZONE,
    streak_count INTEGER DEFAULT 0,
    streak_best INTEGER DEFAULT 0,
    xp_total INTEGER DEFAULT 0,
    xp_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT users_uq_email UNIQUE (email) WHERE deleted_at IS NULL,
    CONSTRAINT users_ck_ai_credits_gte_zero CHECK (ai_credits_remaining >= 0),
    CONSTRAINT users_ck_streak_gte_zero CHECK (streak_count >= 0),
    CONSTRAINT users_ck_xp_gte_zero CHECK (xp_total >= 0),
    CONSTRAINT users_ck_xp_level_valid CHECK (xp_level BETWEEN 1 AND 100)
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_streak_count ON users(streak_count DESC) WHERE deleted_at IS NULL;
COMMENT ON TABLE users IS 'Core user accounts with gamification and subscription data';
```

#### auth_accounts
```sql
CREATE TABLE auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    access_token_enc BYTEA,
    refresh_token_enc BYTEA,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT auth_accounts_uq_provider_account UNIQUE (provider, provider_account_id)
);

CREATE INDEX idx_auth_accounts_user_id ON auth_accounts(user_id);
CREATE INDEX idx_auth_accounts_provider ON auth_accounts(provider);
COMMENT ON TABLE auth_accounts IS 'OAuth accounts linked to users (Google, GitHub, Slack)';
COMMENT ON COLUMN auth_accounts.access_token_enc IS 'Encrypted access token (AES-256)';
COMMENT ON COLUMN auth_accounts.refresh_token_enc IS 'Encrypted refresh token (AES-256)';
```

#### sessions
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT sessions_uq_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
COMMENT ON TABLE sessions IS 'Active user sessions (multi-device support)';
COMMENT ON COLUMN sessions.token_hash IS 'SHA256 hash of session token (never store plaintext)';
```

#### user_preferences
```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'auto',
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    default_workspace_id UUID,
    notification_settings JSONB DEFAULT '{
        "email_digests": true,
        "push_enabled": true,
        "achievement_notifications": true,
        "collaboration_alerts": true
    }'::JSONB,
    keyboard_shortcuts JSONB DEFAULT '{
        "quick_capture": "cmd+k",
        "timer": "cmd+shift+t",
        "search": "cmd+/"
    }'::JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT user_preferences_fk_workspace FOREIGN KEY (default_workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);
COMMENT ON TABLE user_preferences IS 'User-specific UI and notification preferences';
COMMENT ON COLUMN user_preferences.notification_settings IS 'JSON object controlling notification behavior';
COMMENT ON COLUMN user_preferences.keyboard_shortcuts IS 'Custom keyboard shortcut mappings';
```

---

### Workspaces & Collaboration

#### workspaces
```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(20),
    color VARCHAR(7),
    owner_id UUID NOT NULL REFERENCES users(id),
    settings JSONB DEFAULT '{
        "auto_archive_ideas_days": 30,
        "default_content_type": "video",
        "analytics_retention_days": 90,
        "allow_public_sharing": false
    }'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT workspaces_uq_slug UNIQUE (slug) WHERE deleted_at IS NULL,
    CONSTRAINT workspaces_fk_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at DESC);
COMMENT ON TABLE workspaces IS 'Organization boundary; users can belong to multiple workspaces';
COMMENT ON COLUMN workspaces.settings IS 'Workspace-specific configuration (auto-archive, defaults, etc.)';
```

#### workspace_members
```sql
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'viewer',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);
COMMENT ON TABLE workspace_members IS 'Membership roster with RBAC roles';
COMMENT ON COLUMN workspace_members.role IS 'owner, admin, editor, or viewer';
```

#### workspace_invitations
```sql
CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role workspace_role NOT NULL DEFAULT 'editor',
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT workspace_invitations_uq_token UNIQUE (token_hash),
    CONSTRAINT workspace_invitations_ck_expires FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_expires_at ON workspace_invitations(expires_at);
COMMENT ON TABLE workspace_invitations IS 'Pending invitations (expire in 7 days)';
```

---

### Ideas (Capture & Validation)

#### ideas
```sql
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(50),
    ai_score INTEGER CHECK (ai_score BETWEEN 0 AND 100),
    ai_score_breakdown JSONB DEFAULT '{
        "novelty": 0,
        "audience_fit": 0,
        "trend_alignment": 0,
        "feasibility": 0,
        "performance_ceiling": 0
    }'::JSONB,
    status idea_status DEFAULT 'captured',
    content_type content_type,
    platforms JSONB DEFAULT '[]'::JSONB,
    tags JSONB DEFAULT '[]'::JSONB,
    series_id UUID,
    notes TEXT,
    attachments JSONB DEFAULT '[]'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT ideas_fk_series FOREIGN KEY (series_id) REFERENCES series(id),
    CONSTRAINT ideas_ck_status_valid CHECK (status IN ('captured', 'validated', 'transformed', 'archived', 'graveyard'))
);

CREATE INDEX idx_ideas_workspace_id ON ideas(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX idx_ideas_ai_score ON ideas(ai_score DESC) WHERE ai_score IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_ideas_platforms ON ideas USING GIN (platforms);
CREATE INDEX idx_ideas_tags ON ideas USING GIN (tags);
COMMENT ON TABLE ideas IS 'Raw idea captures with AI scoring';
COMMENT ON COLUMN ideas.ai_score_breakdown IS 'Breakdown of score across five dimensions (novelty, audience fit, trend, feasibility, ceiling)';
COMMENT ON COLUMN ideas.platforms JSONB IS 'Array of target platforms (youtube, tiktok, instagram, etc.)';
```

#### idea_tags
```sql
CREATE TABLE idea_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT idea_tags_uq_workspace_name UNIQUE (workspace_id, name)
);

CREATE INDEX idx_idea_tags_workspace_id ON idea_tags(workspace_id);
COMMENT ON TABLE idea_tags IS 'Custom tags for organizing ideas within workspace';
```

#### idea_tag_assignments
```sql
CREATE TABLE idea_tag_assignments (
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES idea_tags(id) ON DELETE CASCADE,

    PRIMARY KEY (idea_id, tag_id)
);

CREATE INDEX idx_idea_tag_assignments_tag_id ON idea_tag_assignments(tag_id);
COMMENT ON TABLE idea_tag_assignments IS 'Junction table for many-to-many idea-to-tag relationship';
```

---

### Content Pipeline

#### contents
```sql
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    idea_id UUID REFERENCES ideas(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type content_type NOT NULL,
    status content_status DEFAULT 'scripting',
    priority priority_level DEFAULT 'medium',
    series_id UUID REFERENCES series(id),
    series_order INTEGER,
    script TEXT,
    script_version INTEGER DEFAULT 0,
    due_date DATE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id),
    checklist JSONB DEFAULT '[]'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT contents_ck_status_valid CHECK (status IN ('idea', 'scripting', 'filming', 'editing', 'review', 'scheduled', 'published', 'archived')),
    CONSTRAINT contents_ck_priority_valid CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX idx_contents_workspace_id ON contents(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_user_id ON contents(user_id);
CREATE INDEX idx_contents_status ON contents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_series_id ON contents(series_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_assigned_to ON contents(assigned_to);
CREATE INDEX idx_contents_created_at ON contents(created_at DESC);
CREATE INDEX idx_contents_due_date ON contents(due_date);
CREATE INDEX idx_contents_scheduled_at ON contents(scheduled_at);
COMMENT ON TABLE contents IS 'Content pieces progressing through the pipeline (Kanban stages)';
COMMENT ON COLUMN contents.checklist IS 'Array of checklist items with {text, completed, created_by} objects';
```

#### content_versions
```sql
CREATE TABLE content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255),
    script TEXT,
    changes_summary TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT content_versions_uq_content_version UNIQUE (content_id, version_number)
);

CREATE INDEX idx_content_versions_content_id ON content_versions(content_id);
COMMENT ON TABLE content_versions IS 'Script version history for content pieces';
```

#### content_attachments
```sql
CREATE TABLE content_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT content_attachments_ck_file_size CHECK (file_size > 0)
);

CREATE INDEX idx_content_attachments_content_id ON content_attachments(content_id);
COMMENT ON TABLE content_attachments IS 'File attachments per content piece (videos, images, audio)';
```

#### content_comments
```sql
CREATE TABLE content_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_content_comments_content_id ON content_comments(content_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_comments_user_id ON content_comments(user_id);
CREATE INDEX idx_content_comments_parent_id ON content_comments(parent_id);
CREATE INDEX idx_content_comments_resolved ON content_comments(resolved) WHERE deleted_at IS NULL;
COMMENT ON TABLE content_comments IS 'Threaded comments/notes on content pieces for team collaboration';
```

---

### Series Management

#### series
```sql
CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    content_type content_type,
    schedule_rule JSONB DEFAULT '{
        "type": "weekly",
        "day_of_week": 1,
        "time": "10:00"
    }'::JSONB,
    color VARCHAR(7),
    status VARCHAR(50) DEFAULT 'active',
    episode_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT series_uq_workspace_title UNIQUE (workspace_id, title) WHERE deleted_at IS NULL
);

CREATE INDEX idx_series_workspace_id ON series(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_series_user_id ON series(user_id);
CREATE INDEX idx_series_created_at ON series(created_at DESC);
COMMENT ON TABLE series IS 'Series for episodic content (e.g., YouTube series, podcast seasons)';
COMMENT ON COLUMN series.schedule_rule IS 'Publishing schedule rule: {type: "daily|weekly|biweekly|monthly", day_of_week: 0-6, time: "HH:MM"}';
```

---

### Publishing & Calendar

#### publishing_accounts
```sql
CREATE TABLE publishing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    platform platform_type NOT NULL,
    account_name VARCHAR(255),
    account_id VARCHAR(255),
    access_token_enc BYTEA,
    refresh_token_enc BYTEA,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT publishing_accounts_uq_platform_account UNIQUE (workspace_id, platform, account_id)
);

CREATE INDEX idx_publishing_accounts_workspace_id ON publishing_accounts(workspace_id);
CREATE INDEX idx_publishing_accounts_platform ON publishing_accounts(platform);
COMMENT ON TABLE publishing_accounts IS 'Connected social/publishing accounts (YouTube, TikTok, Instagram, Twitter, LinkedIn, etc.)';
COMMENT ON COLUMN publishing_accounts.metadata IS 'Platform-specific metadata (follower count, analytics access, etc.)';
```

#### scheduled_posts
```sql
CREATE TABLE scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    publishing_account_id UUID NOT NULL REFERENCES publishing_accounts(id),
    platform platform_type NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    post_url TEXT,
    post_id VARCHAR(255),
    status scheduled_post_status DEFAULT 'scheduled',
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_content_id ON scheduled_posts(content_id);
CREATE INDEX idx_scheduled_posts_publishing_account_id ON scheduled_posts(publishing_account_id);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
COMMENT ON TABLE scheduled_posts IS 'Posts scheduled for publishing across platforms';
COMMENT ON COLUMN scheduled_posts.metadata IS 'Platform-specific post metadata (hashtags, captions, thumbnail, etc.)';
```

#### calendar_events
```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(50),
    content_id UUID REFERENCES contents(id),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT FALSE,
    recurrence JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_workspace_id ON calendar_events(workspace_id);
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_starts_at ON calendar_events(starts_at DESC);
CREATE INDEX idx_calendar_events_content_id ON calendar_events(content_id);
COMMENT ON TABLE calendar_events IS 'Calendar of publishing, recording, and team events';
COMMENT ON COLUMN calendar_events.recurrence IS 'Recurrence rule: {rule: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE"}';
```

---

### Analytics

#### content_analytics (PARTITIONED)
```sql
-- Create main table with monthly partitions
CREATE TABLE content_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    post_id VARCHAR(255),
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    watch_time_seconds INTEGER DEFAULT 0,
    avg_watch_percent NUMERIC(5, 2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    click_through_rate NUMERIC(5, 2) DEFAULT 0,
    engagement_rate NUMERIC(5, 2) DEFAULT 0,
    revenue_cents INTEGER DEFAULT 0,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT content_analytics_ck_rates CHECK (
        click_through_rate BETWEEN 0 AND 100
        AND engagement_rate BETWEEN 0 AND 100
    )
) PARTITION BY RANGE (fetched_at);

-- Create partitions for current month and future months
CREATE TABLE content_analytics_2026_03 PARTITION OF content_analytics
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE content_analytics_2026_04 PARTITION OF content_analytics
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Function to auto-create monthly partitions
CREATE OR REPLACE FUNCTION create_content_analytics_partition() RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := DATE_TRUNC('month', NOW())::DATE;
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'content_analytics_' || TO_CHAR(start_date, 'YYYY_MM');

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE tablename = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF content_analytics FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create partitions before insert
CREATE TRIGGER ensure_content_analytics_partition
BEFORE INSERT ON content_analytics
FOR EACH ROW
EXECUTE FUNCTION create_content_analytics_partition();

CREATE INDEX idx_content_analytics_content_id ON content_analytics(content_id);
CREATE INDEX idx_content_analytics_platform ON content_analytics(platform);
CREATE INDEX idx_content_analytics_fetched_at ON content_analytics(fetched_at DESC);
COMMENT ON TABLE content_analytics IS 'Platform-specific metrics per content, partitioned by month for performance';
COMMENT ON COLUMN content_analytics.metadata IS 'Platform-specific data (audience demographics, top comments, etc.)';
```

#### daily_creator_stats
```sql
CREATE TABLE daily_creator_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    contents_created INTEGER DEFAULT 0,
    contents_published INTEGER DEFAULT 0,
    ideas_captured INTEGER DEFAULT 0,
    ai_credits_used INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    consistency_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT daily_creator_stats_uq_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_creator_stats_user_id ON daily_creator_stats(user_id);
CREATE INDEX idx_daily_creator_stats_workspace_id ON daily_creator_stats(workspace_id);
CREATE INDEX idx_daily_creator_stats_date ON daily_creator_stats(date DESC);
COMMENT ON TABLE daily_creator_stats IS 'Daily snapshot of creator activity for analytics dashboard';
```

#### consistency_scores
```sql
CREATE TABLE consistency_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    score INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    multiplier NUMERIC(3, 2) DEFAULT 1.0,
    components JSONB DEFAULT '{
        "publishing_frequency": 0,
        "upload_schedule_adherence": 0,
        "content_quality": 0
    }'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT consistency_scores_uq_user_date UNIQUE (user_id, date),
    CONSTRAINT consistency_scores_ck_score CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT consistency_scores_ck_multiplier CHECK (multiplier >= 1.0)
);

CREATE INDEX idx_consistency_scores_user_id ON consistency_scores(user_id);
CREATE INDEX idx_consistency_scores_date ON consistency_scores(date DESC);
COMMENT ON TABLE consistency_scores IS 'Daily consistency score for gamification (GitHub-style heatmap)';
```

---

### AI & Creators Studio

#### ai_conversations
```sql
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255),
    context_type VARCHAR(50),
    context_id UUID,
    model VARCHAR(100) DEFAULT 'claude-opus-4-6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_workspace_id ON ai_conversations(workspace_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
COMMENT ON TABLE ai_conversations IS 'Chat conversations with AI (for context/memory tracking)';
```

#### ai_messages
```sql
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model VARCHAR(100),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT ai_messages_ck_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
COMMENT ON TABLE ai_messages IS 'Individual messages within AI conversations';
```

#### ai_credit_transactions
```sql
CREATE TABLE ai_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type ai_operation_type NOT NULL,
    credits_used INTEGER NOT NULL,
    credits_before INTEGER NOT NULL,
    credits_after INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT ai_credit_transactions_ck_credits CHECK (credits_used > 0)
);

CREATE INDEX idx_ai_credit_transactions_user_id ON ai_credit_transactions(user_id);
CREATE INDEX idx_ai_credit_transactions_operation_type ON ai_credit_transactions(operation_type);
CREATE INDEX idx_ai_credit_transactions_created_at ON ai_credit_transactions(created_at DESC);
COMMENT ON TABLE ai_credit_transactions IS 'Audit log of AI credit usage';
```

#### ai_generated_content
```sql
CREATE TABLE ai_generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    content_id UUID REFERENCES contents(id),
    generation_type ai_operation_type NOT NULL,
    input_params JSONB NOT NULL,
    output TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    model VARCHAR(100),
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_generated_content_user_id ON ai_generated_content(user_id);
CREATE INDEX idx_ai_generated_content_content_id ON ai_generated_content(content_id);
CREATE INDEX idx_ai_generated_content_generation_type ON ai_generated_content(generation_type);
COMMENT ON TABLE ai_generated_content IS 'History of AI-generated content for feedback and improvement';
```

---

### Remix / Content Repurposing

#### remix_jobs
```sql
CREATE TABLE remix_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    source_content_id UUID REFERENCES contents(id),
    source_media_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    progress_percent INTEGER DEFAULT 0,
    config JSONB DEFAULT '{
        "target_platforms": [],
        "output_types": []
    }'::JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT remix_jobs_ck_progress CHECK (progress_percent BETWEEN 0 AND 100),
    CONSTRAINT remix_jobs_ck_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_remix_jobs_workspace_id ON remix_jobs(workspace_id);
CREATE INDEX idx_remix_jobs_user_id ON remix_jobs(user_id);
CREATE INDEX idx_remix_jobs_status ON remix_jobs(status);
CREATE INDEX idx_remix_jobs_created_at ON remix_jobs(created_at DESC);
COMMENT ON TABLE remix_jobs IS 'Content repurposing jobs (atomizing one piece into multiple variants)';
```

#### remix_outputs
```sql
CREATE TABLE remix_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remix_job_id UUID NOT NULL REFERENCES remix_jobs(id) ON DELETE CASCADE,
    output_type remix_output_type NOT NULL,
    title VARCHAR(255),
    body TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    platform platform_type,
    metadata JSONB DEFAULT '{}'::JSONB,
    status scheduled_post_status DEFAULT 'draft',
    content_id UUID REFERENCES contents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_remix_outputs_remix_job_id ON remix_outputs(remix_job_id);
CREATE INDEX idx_remix_outputs_output_type ON remix_outputs(output_type);
COMMENT ON TABLE remix_outputs IS 'Generated repurposed content variants from remix jobs';
```

#### media_transcripts
```sql
CREATE TABLE media_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    transcript JSONB,
    chapters JSONB DEFAULT '[]'::JSONB,
    highlights JSONB DEFAULT '[]'::JSONB,
    word_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    model VARCHAR(100) DEFAULT 'whisper',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_media_transcripts_content_id ON media_transcripts(content_id);
COMMENT ON TABLE media_transcripts IS 'Transcripts of video/podcast content with chapters and highlights';
COMMENT ON COLUMN media_transcripts.transcript IS 'Full transcript with timestamps: [{text, start_time, end_time}]';
COMMENT ON COLUMN media_transcripts.chapters IS 'Chapter breakdowns: [{title, start_time, duration}]';
```

---

### Gamification

#### achievements
```sql
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(20),
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE achievements IS 'Achievement definitions for gamification';
COMMENT ON COLUMN achievements.criteria IS 'JSON object defining unlock criteria (e.g., {type: "content_published_count", value: 10})';
```

#### user_achievements
```sql
CREATE TABLE user_achievements (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB,

    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
COMMENT ON TABLE user_achievements IS 'User achievement progress (when unlocked)';
```

#### xp_transactions
```sql
CREATE TABLE xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT xp_transactions_ck_amount CHECK (amount != 0)
);

CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_source ON xp_transactions(source);
COMMENT ON TABLE xp_transactions IS 'Audit log of XP changes (positive and negative)';
```

#### leaderboard_snapshots
```sql
CREATE TABLE leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    rankings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT leaderboard_snapshots_uq_workspace_period UNIQUE (workspace_id, period_type, period_start)
);

CREATE INDEX idx_leaderboard_snapshots_workspace_id ON leaderboard_snapshots(workspace_id);
COMMENT ON TABLE leaderboard_snapshots IS 'Leaderboard snapshots per period (weekly, monthly)';
COMMENT ON COLUMN leaderboard_snapshots.rankings IS 'Array of {user_id, rank, score} objects';
```

---

### Sponsorships CRM

#### sponsors
```sql
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    website TEXT,
    logo_url TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sponsors_workspace_id ON sponsors(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sponsors_company ON sponsors(company) WHERE deleted_at IS NULL;
COMMENT ON TABLE sponsors IS 'Brand/sponsor contact database';
```

#### sponsorship_deals
```sql
CREATE TABLE sponsorship_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status sponsorship_status DEFAULT 'lead',
    value_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    deliverables JSONB DEFAULT '[]'::JSONB,
    deadline DATE,
    signed_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT sponsorship_deals_ck_value CHECK (value_cents >= 0)
);

CREATE INDEX idx_sponsorship_deals_workspace_id ON sponsorship_deals(workspace_id);
CREATE INDEX idx_sponsorship_deals_sponsor_id ON sponsorship_deals(sponsor_id);
CREATE INDEX idx_sponsorship_deals_status ON sponsorship_deals(status);
COMMENT ON TABLE sponsorship_deals IS 'Sponsorship deal pipeline (lead → negotiation → signed → delivered → paid)';
```

#### sponsorship_activities
```sql
CREATE TABLE sponsorship_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES sponsorship_deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sponsorship_activities_deal_id ON sponsorship_activities(deal_id);
COMMENT ON TABLE sponsorship_activities IS 'Sponsorship deal activity log (emails, calls, status changes)';
```

---

### Notifications & Activity

#### notifications
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    action_url TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
COMMENT ON TABLE notifications IS 'User notifications (system alerts, achievements, reminders, etc.)';
```

#### activity_log
```sql
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action activity_type NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    changes JSONB DEFAULT '{}'::JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_workspace_id ON activity_log(workspace_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
COMMENT ON TABLE activity_log IS 'Audit log of all user actions (creates, updates, deletes)';
```

---

### Billing & Subscriptions

#### subscriptions
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    billing_interval billing_interval NOT NULL,
    current_period_start DATE,
    current_period_end DATE,
    cancel_at DATE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT subscriptions_uq_stripe_subscription UNIQUE (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
COMMENT ON TABLE subscriptions IS 'Active/cancelled subscriptions linked to Stripe';
```

#### invoices
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT invoices_uq_stripe_invoice UNIQUE (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
COMMENT ON TABLE invoices IS 'Invoices from Stripe (for receipt/accounting)';
```

---

### Templates & Checklists

#### content_templates
```sql
CREATE TABLE content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content_type content_type NOT NULL,
    template_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT content_templates_uq_workspace_name UNIQUE (workspace_id, name)
);

CREATE INDEX idx_content_templates_workspace_id ON content_templates(workspace_id);
CREATE INDEX idx_content_templates_content_type ON content_templates(content_type);
COMMENT ON TABLE content_templates IS 'Reusable content templates per workspace';
```

#### checklist_templates
```sql
CREATE TABLE checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content_type content_type NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT checklist_templates_uq_workspace_name UNIQUE (workspace_id, name)
);

CREATE INDEX idx_checklist_templates_workspace_id ON checklist_templates(workspace_id);
COMMENT ON TABLE checklist_templates IS 'Production checklist templates for content pipeline stages';
COMMENT ON COLUMN checklist_templates.items IS 'Array of {text, depends_on, required} checklist items';
```

---

## 5. Indexes Strategy

### B-tree Indexes (Exact/Range Lookups)
- Primary keys: UUID (by default)
- Foreign keys: `user_id`, `workspace_id`, `content_id`, etc.
- Status fields: `status`, `tier`, `role`
- Time-range fields: `created_at DESC` (for most-recent-first)
- Soft deletes: All include `WHERE deleted_at IS NULL`

### GIN Indexes (JSONB/Array Queries)
```sql
CREATE INDEX idx_ideas_platforms ON ideas USING GIN (platforms);
CREATE INDEX idx_ideas_tags ON ideas USING GIN (tags);
CREATE INDEX idx_content_comments_resolved_gin ON content_comments USING GIN (metadata);
```

### Composite Indexes (Multiple Columns)
```sql
-- For common filter patterns
CREATE INDEX idx_contents_workspace_status ON contents(workspace_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_scheduled_posts_account_scheduled ON scheduled_posts(publishing_account_id, scheduled_at);

CREATE INDEX idx_daily_creator_stats_user_date ON daily_creator_stats(user_id, date DESC);
```

### Expression Indexes (Derived Values)
```sql
-- For case-insensitive email search
CREATE INDEX idx_users_email_lower ON users(LOWER(email)) WHERE deleted_at IS NULL;
```

### Partial Indexes (Active Records Only)
- All soft-deletable tables include partial indexes on `WHERE deleted_at IS NULL`
- Saves index space, improves performance

---

## 6. Row-Level Security (RLS)

### Strategy
- **RLS enabled** on all workspace-scoped tables
- **Workspace membership check** via `workspace_members` table
- **User can only see data** in workspaces where they are a member
- **Admin/owner checks** for sensitive operations (delete workspace, manage invites)

### Example Policies

#### ideas table
```sql
-- Enable RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Users can select ideas from their workspaces
CREATE POLICY ideas_select_workspace_access ON ideas
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert ideas into their workspaces
CREATE POLICY ideas_insert_workspace_access ON ideas
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Users can update their own ideas or if they're admin
CREATE POLICY ideas_update_workspace_access ON ideas
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Only author or admin can delete
CREATE POLICY ideas_delete_own_or_admin ON ideas
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );
```

#### contents table
```sql
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY contents_select_workspace_access ON contents
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY contents_insert_workspace_access ON contents
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
        )
    );
```

### RLS Bypass for Migrations
During schema migrations, use:
```bash
psql -d ordo_creator_os -c "ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;" \
    < migration_000X_up.sql
```

---

## 7. Migration Strategy

### Tool: golang-migrate or goose

#### File Naming Convention
```
000001_initial_schema_up.sql
000001_initial_schema_down.sql
000002_add_ai_conversations_up.sql
000002_add_ai_conversations_down.sql
```

#### Migration Phases

**Phase 1: Core Schema** (000001-000010)
- Users, auth, sessions
- Workspaces, members
- Ideas, content pipeline
- Publishing & analytics

**Phase 2: AI & Gamification** (000011-000020)
- AI conversations, credits
- Achievements, XP
- Remix jobs

**Phase 3: Extensions** (000021-000030)
- Sponsorships
- Notifications
- Activity logs
- Billing

#### Example Migration
```sql
-- 000001_initial_schema_up.sql

BEGIN;

-- Enums
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE content_status AS ENUM (
    'idea', 'scripting', 'filming', 'editing', 'review', 'scheduled', 'published', 'archived'
);

-- Create tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    subscription_tier subscription_tier DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Add RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

COMMIT;
```

```sql
-- 000001_initial_schema_down.sql

BEGIN;

DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS subscription_tier;
DROP TYPE IF EXISTS content_status;

COMMIT;
```

### Seeding Strategy

#### Seed Enums & Defaults
```sql
-- seed_enums.sql
-- Run after migrations

INSERT INTO achievements (key, name, description, icon, xp_reward, criteria) VALUES
    ('first_idea', 'Your First Spark', 'Capture your first idea', '💡', 5, '{"type": "ideas_created", "value": 1}'),
    ('first_publish', 'First Light', 'Publish your first piece of content', '🎬', 25, '{"type": "contents_published", "value": 1}'),
    ('consistent_week', 'Week Warrior', 'Maintain a 7-day publishing streak', '🔥', 50, '{"type": "streak_days", "value": 7}')
ON CONFLICT DO NOTHING;

INSERT INTO content_templates (workspace_id, name, content_type, template_data, is_default) VALUES
    (NULL, 'YouTube Video Standard', 'video', '{"title": "", "description": "", "tags": []}', true),
    (NULL, 'Twitter Thread', 'thread', '{"tweets": []}', true)
ON CONFLICT DO NOTHING;
```

---

## 8. Performance Considerations

### Partitioning
- **content_analytics** partitioned monthly by `fetched_at`
- Enables fast deletes of old data: `DROP TABLE content_analytics_2025_01;`
- Improves query performance on large datasets

### Materialized Views
For dashboard aggregations:
```sql
CREATE MATERIALIZED VIEW creator_stats_daily AS
SELECT
    user_id,
    workspace_id,
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE entity_type = 'content') as contents_created,
    COUNT(*) FILTER (WHERE entity_type = 'content' AND action = 'published') as contents_published,
    COUNT(*) FILTER (WHERE entity_type = 'idea') as ideas_captured
FROM activity_log
GROUP BY user_id, workspace_id, DATE(created_at);

CREATE INDEX idx_creator_stats_daily_user_date ON creator_stats_daily(user_id, date DESC);

-- Refresh daily (scheduled job)
REFRESH MATERIALIZED VIEW CONCURRENTLY creator_stats_daily;
```

### Connection Pooling (PgBouncer)
```ini
; /etc/pgbouncer/pgbouncer.ini

[databases]
ordo_creator_os = host=localhost port=5432 dbname=ordo_creator_os

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
max_db_connections = 100
```

### Vacuum & Analyze Schedule
```sql
-- Automatic (PostgreSQL 16 defaults)
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_naptime = '10s';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;

-- Manual weekly job for large tables
VACUUM ANALYZE ideas;
VACUUM ANALYZE contents;
VACUUM ANALYZE content_analytics;

SELECT pg_reload_conf();
```

### Query Optimization Guidelines
1. **Use indexes** for WHERE, JOIN, ORDER BY clauses
2. **Partition pruning** for `content_analytics` queries (always filter by `fetched_at`)
3. **EXPLAIN ANALYZE** all new queries (target < 100ms)
4. **Batch operations** for bulk inserts/updates
5. **Connection pooling** for high concurrency

### Monitoring
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check table size
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 9. Data Integrity & Constraints

### Check Constraints
- **Email format**: Enforced in application (not DB)
- **URL format**: Enforced in application (not DB)
- **Numeric ranges**: AI credits ≥ 0, scores 0-100, etc.
- **Enum values**: Enforced via TYPE definition

### Unique Constraints
- `users.email`: Unique (with soft-delete carve-out)
- `workspace_members`: `(workspace_id, user_id)` composite
- `workspace_invitations.token`: Unique
- `idea_tags`: `(workspace_id, name)` composite per workspace
- `content_templates`: `(workspace_id, name)` composite per workspace

### Foreign Key Cascade Rules
```
ON DELETE CASCADE: ideas_tag_assignments → idea_tags
ON DELETE CASCADE: content_comments → contents (delete comments when content deleted)
ON DELETE CASCADE: scheduled_posts → publishing_accounts
ON DELETE SET NULL: contents.assigned_to (if user is deleted, unassign)
```

### No Orphaned Records
- All foreign keys must reference valid rows
- Use migration scripts to clean up orphans before applying constraints

---

## 10. Migration Checklist

- [ ] PostgreSQL 16+ installed and configured
- [ ] Create database: `CREATE DATABASE ordo_creator_os;`
- [ ] Install extensions: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- [ ] Run all migrations in order
- [ ] Enable RLS on all workspace-scoped tables
- [ ] Create indexes
- [ ] Seed default data (achievements, templates)
- [ ] Run `ANALYZE` on all tables
- [ ] Set up PgBouncer connection pooling
- [ ] Set up automated backups (WAL archiving + daily snapshots)
- [ ] Test recovery procedure
- [ ] Document backup/recovery process
- [ ] Set up monitoring alerts (disk space, slow queries, connection pool)

---

## 11. Appendix: SQL Commands Reference

### Create Database & Extensions
```sql
CREATE DATABASE ordo_creator_os ENCODING 'UTF8';

\c ordo_creator_os

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- For full-text search (future)
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### Enable RLS (Post-Migration)
```bash
# Run this to enable RLS on all workspace-scoped tables
psql -d ordo_creator_os -f enable_rls.sql
```

### Backup & Restore
```bash
# Full backup to file
pg_dump -h localhost -U postgres -d ordo_creator_os -Fc -f backup.dump

# Restore from backup
pg_restore -h localhost -U postgres -d ordo_creator_os backup.dump

# Continuous archiving (for PITR)
archive_command = 'test ! -f /mnt/backups/wal_archive/%f && cp %p /mnt/backups/wal_archive/%f'
```

### Performance Tuning
```sql
-- Check table sizes
\dt+

-- Check index usage
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;

-- Reindex if fragmented
REINDEX TABLE ideas;

-- Update statistics
ANALYZE ideas;
```

---

**Document Status**: Ready for implementation
**Last Updated**: 2026-03-10
**Maintained By**: Engineering Team
