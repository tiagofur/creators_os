import type { OrdoApiClient } from '../client';
import type {
  AiChatRequest,
  AiChatResponse,
  AiConversation,
  AiCredits,
  BrainstormRequest,
  BrainstormResponse,
  DescriptionRequest,
  DescriptionResponse,
  HashtagRequest,
  HashtagResponse,
  HookRequest,
  HookResponse,
  RemixRequest,
  RemixResponse,
  ScriptDoctorRequest,
  ScriptDoctorResponse,
  TitleLabRequest,
  TitleLabResponse,
} from '@ordo/types';

export function createAiResource(client: OrdoApiClient) {
  return {
    chat(payload: AiChatRequest): Promise<AiChatResponse> {
      return client.post<AiChatResponse>('/v1/ai/chat', payload);
    },

    getConversations(): Promise<AiConversation[]> {
      return client.get<AiConversation[]>('/v1/ai/conversations');
    },

    brainstorm(payload: BrainstormRequest): Promise<BrainstormResponse> {
      return client.post<BrainstormResponse>('/v1/ai/brainstorm', payload);
    },

    titleLab(payload: TitleLabRequest): Promise<TitleLabResponse> {
      return client.post<TitleLabResponse>('/v1/ai/title-lab', payload);
    },

    description(payload: DescriptionRequest): Promise<DescriptionResponse> {
      return client.post<DescriptionResponse>('/v1/ai/description', payload);
    },

    scriptDoctor(payload: ScriptDoctorRequest): Promise<ScriptDoctorResponse> {
      return client.post<ScriptDoctorResponse>('/v1/ai/script-doctor', payload);
    },

    remix(payload: RemixRequest): Promise<RemixResponse> {
      return client.post<RemixResponse>('/v1/ai/remix', payload);
    },

    hooks(payload: HookRequest): Promise<HookResponse> {
      return client.post<HookResponse>('/v1/ai/hooks', payload);
    },

    hashtags(payload: HashtagRequest): Promise<HashtagResponse> {
      return client.post<HashtagResponse>('/v1/ai/hashtags', payload);
    },

    getCredits(): Promise<AiCredits> {
      return client.get<AiCredits>('/v1/ai/credits');
    },
  };
}
