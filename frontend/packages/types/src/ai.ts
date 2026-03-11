// ---------------------------------------------------------------------------
// AI request / response types
// ---------------------------------------------------------------------------

export type AiPlatform =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'blog'
  | 'podcast'
  | 'email';

export type ContentStyle =
  | 'educational'
  | 'entertaining'
  | 'inspiring'
  | 'behind-the-scenes';

export type TitleTone =
  | 'curiosity'
  | 'authority'
  | 'fomo'
  | 'storytelling'
  | 'controversy';

export type HookStyle = 'question' | 'shocking-stat' | 'story' | 'contrarian';

export type ScriptSuggestionType =
  | 'hook'
  | 'clarity'
  | 'cta'
  | 'pacing'
  | 'engagement';

export type CTRPrediction = 'high' | 'medium' | 'low';

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AiChatRequest {
  content: string;
  conversation_id?: string;
}

export interface AiChatResponse {
  conversation_id: string;
  message: ChatMessage;
}

export interface AiConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Brainstormer
// ---------------------------------------------------------------------------

export interface BrainstormRequest {
  topic: string;
  platforms: AiPlatform[];
  style: ContentStyle;
  count: 5 | 10 | 20;
}

export interface BrainstormIdea {
  title: string;
  description: string;
  virality_score: number; // 1–5
  platform: AiPlatform;
}

export interface BrainstormResponse {
  ideas: BrainstormIdea[];
}

// ---------------------------------------------------------------------------
// Title Lab
// ---------------------------------------------------------------------------

export interface TitleLabRequest {
  topic: string;
  platform: AiPlatform;
  tone: TitleTone;
  count: 5 | 10 | 20;
}

export interface GeneratedTitle {
  title: string;
  ctr_prediction: CTRPrediction;
  character_count: number;
}

export interface TitleLabResponse {
  titles: GeneratedTitle[];
}

// ---------------------------------------------------------------------------
// Description generator
// ---------------------------------------------------------------------------

export interface DescriptionRequest {
  title: string;
  keywords: string[];
  platform: 'youtube' | 'blog';
}

export interface DescriptionResponse {
  description: string;
  keywords_used: string[];
  character_count: number;
}

// ---------------------------------------------------------------------------
// Script Doctor
// ---------------------------------------------------------------------------

export interface ScriptDoctorRequest {
  script_text: string;
}

export interface ScriptSuggestion {
  id: string;
  type: ScriptSuggestionType;
  affected_text: string;
  suggested_improvement: string;
}

export interface ScriptDoctorResponse {
  suggestions: ScriptSuggestion[];
}

// ---------------------------------------------------------------------------
// Remix Engine
// ---------------------------------------------------------------------------

export interface RemixRequest {
  source_content: string;
  source_platform: AiPlatform;
  target_platforms: AiPlatform[];
}

export interface RemixVariant {
  platform: AiPlatform;
  content: string;
  word_count: number;
  character_count: number;
}

export interface RemixResponse {
  variants: RemixVariant[];
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface HookRequest {
  topic: string;
  platform: AiPlatform;
  style: HookStyle;
}

export interface GeneratedHook {
  id: string;
  hook_text: string;
  style: HookStyle;
}

export interface HookResponse {
  hooks: GeneratedHook[];
}

// ---------------------------------------------------------------------------
// Hashtags
// ---------------------------------------------------------------------------

export interface HashtagRequest {
  content_description: string;
  platform: AiPlatform;
  niche: string;
}

export interface HashtagGroup {
  tier: 'top' | 'mid' | 'niche';
  hashtags: string[];
}

export interface HashtagResponse {
  groups: HashtagGroup[];
  caption?: string;
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export interface AiCredits {
  used: number;
  limit: number;
  reset_date: string;
  is_free_tier: boolean;
}
