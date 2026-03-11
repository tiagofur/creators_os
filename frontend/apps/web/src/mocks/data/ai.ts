import type {
  AiChatResponse,
  AiConversation,
  BrainstormResponse,
  TitleLabResponse,
  DescriptionResponse,
  ScriptDoctorResponse,
  RemixResponse,
  HookResponse,
  HashtagResponse,
  AiCredits,
} from '@ordo/types';

export const mockAiChatResponse: AiChatResponse = {
  conversation_id: 'conv_01HQCONV11111111',
  message: {
    id: 'msg_01HQMSG111111111',
    role: 'assistant',
    content: 'Great idea! Here are some angles you could explore for your TypeScript video...',
    created_at: '2025-01-10T15:30:00.000Z',
  },
};

export const mockAiConversations: AiConversation[] = [
  {
    id: 'conv_01HQCONV11111111',
    title: 'TypeScript Tips Brainstorm',
    created_at: '2025-01-10T15:00:00.000Z',
    updated_at: '2025-01-10T15:30:00.000Z',
  },
  {
    id: 'conv_02HQCONV22222222',
    title: 'Content Strategy for Q1',
    created_at: '2025-01-08T09:00:00.000Z',
    updated_at: '2025-01-08T10:15:00.000Z',
  },
];

export const mockBrainstormResponse: BrainstormResponse = {
  ideas: [
    {
      title: 'Why TypeScript Generics Are Simpler Than You Think',
      description: 'Break down generics with real-world React component examples.',
      virality_score: 4,
      platform: 'youtube',
    },
    {
      title: '5 TypeScript Mistakes Even Seniors Make',
      description: 'Common anti-patterns in TypeScript codebases.',
      virality_score: 5,
      platform: 'youtube',
    },
    {
      title: 'TypeScript vs Flow in 60 Seconds',
      description: 'Quick comparison for short-form content.',
      virality_score: 3,
      platform: 'tiktok',
    },
  ],
};

export const mockTitleLabResponse: TitleLabResponse = {
  titles: [
    { title: 'You Are Using TypeScript Wrong (Here Is Why)', ctr_prediction: 'high', character_count: 47 },
    { title: 'TypeScript Tips That Will Save You 10 Hours a Week', ctr_prediction: 'high', character_count: 51 },
    { title: 'The TypeScript Feature Nobody Talks About', ctr_prediction: 'medium', character_count: 43 },
  ],
};

export const mockDescriptionResponse: DescriptionResponse = {
  description: 'In this video, I break down 10 TypeScript tips that every React developer needs to know. From advanced generics to utility types, these patterns will level up your code.\n\nTimestamps:\n0:00 Introduction\n1:30 Tip 1: Discriminated Unions\n...',
  keywords_used: ['typescript', 'react', 'tips', 'tutorial'],
  character_count: 285,
};

export const mockScriptDoctorResponse: ScriptDoctorResponse = {
  suggestions: [
    {
      id: 'sug_01',
      type: 'hook',
      affected_text: 'Today we are going to talk about TypeScript.',
      suggested_improvement: 'What if I told you that 90% of React developers are writing TypeScript wrong?',
    },
    {
      id: 'sug_02',
      type: 'pacing',
      affected_text: 'Now let me explain what generics are. Generics are a feature...',
      suggested_improvement: 'Let me show you generics in action. Watch this -- [screen share of code]',
    },
  ],
};

export const mockRemixResponse: RemixResponse = {
  variants: [
    {
      platform: 'twitter',
      content: 'Thread: 10 TypeScript tips for React developers that will change how you write code. 1/ Discriminated unions for component props...',
      word_count: 85,
      character_count: 420,
    },
    {
      platform: 'linkedin',
      content: 'After 5 years of writing TypeScript with React, here are the 10 patterns I wish I knew from day one...',
      word_count: 200,
      character_count: 1100,
    },
  ],
};

export const mockHookResponse: HookResponse = {
  hooks: [
    {
      id: 'hook_01',
      hook_text: 'What if everything you know about TypeScript is wrong?',
      style: 'contrarian',
    },
    {
      id: 'hook_02',
      hook_text: 'I analyzed 500 React codebases, and found one pattern that separates juniors from seniors...',
      style: 'shocking-stat',
    },
  ],
};

export const mockHashtagResponse: HashtagResponse = {
  groups: [
    { tier: 'top', hashtags: ['#typescript', '#reactjs', '#webdev', '#programming'] },
    { tier: 'mid', hashtags: ['#typescripttips', '#reactdeveloper', '#frontend'] },
    { tier: 'niche', hashtags: ['#typescriptgenerics', '#reactpatterns', '#devtutorial'] },
  ],
  caption: 'Level up your React code with these TypeScript tips!',
};

export const mockAiCredits: AiCredits = {
  used: 156,
  limit: 500,
  reset_date: '2025-02-01',
  is_free_tier: false,
};
