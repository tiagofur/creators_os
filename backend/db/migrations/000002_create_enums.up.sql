CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE content_status AS ENUM ('idea', 'scripting', 'recording', 'editing', 'review', 'scheduled', 'published', 'archived');
CREATE TYPE platform_type AS ENUM ('youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'facebook', 'newsletter', 'blog', 'podcast', 'pinterest');
CREATE TYPE idea_status AS ENUM ('draft', 'validating', 'validated', 'promoted', 'archived');
CREATE TYPE sponsorship_status AS ENUM ('lead', 'negotiating', 'active', 'completed', 'rejected');
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE ai_operation_type AS ENUM ('chat', 'brainstorm', 'script_gen', 'title_gen', 'description_gen', 'repurpose', 'analyze', 'thumbnail', 'transcribe', 'translate');
