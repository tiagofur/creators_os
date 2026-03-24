import type { OrdoApiClient } from '../client';
import type {
  AiChatRequest,
  AiChatResponse,
  AiConversation,
  AiCredits,
  AtomizeResponse,
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
    createConversation(workspaceId: string, payload: AiChatRequest): Promise<AiConversation> {
      return client.post<AiConversation>(`/api/v1/workspaces/${workspaceId}/ai/conversations`, payload);
    },

    getConversations(workspaceId: string): Promise<AiConversation[]> {
      return client.get<AiConversation[]>(`/api/v1/workspaces/${workspaceId}/ai/conversations`);
    },

    getConversation(workspaceId: string, convId: string): Promise<AiConversation> {
      return client.get<AiConversation>(`/api/v1/workspaces/${workspaceId}/ai/conversations/${convId}`);
    },

    deleteConversation(workspaceId: string, convId: string): Promise<void> {
      return client.delete<void>(`/api/v1/workspaces/${workspaceId}/ai/conversations/${convId}`);
    },

    sendMessage(workspaceId: string, convId: string, payload: AiChatRequest): Promise<AiChatResponse> {
      return client.post<AiChatResponse>(`/api/v1/workspaces/${workspaceId}/ai/conversations/${convId}/messages`, payload);
    },

    brainstorm(workspaceId: string, payload: BrainstormRequest): Promise<BrainstormResponse> {
      return client.post<BrainstormResponse>(`/api/v1/workspaces/${workspaceId}/ai/brainstorm`, payload);
    },

    generateScript(workspaceId: string, payload: ScriptDoctorRequest): Promise<ScriptDoctorResponse> {
      return client.post<ScriptDoctorResponse>(`/api/v1/workspaces/${workspaceId}/ai/script-generate`, payload);
    },

    atomize(workspaceId: string, contentId: string): Promise<AtomizeResponse> {
      return client.post<AtomizeResponse>(`/api/v1/workspaces/${workspaceId}/ai/atomize`, { content_id: contentId });
    },

    getCredits(): Promise<AiCredits> {
      return client.get<AiCredits>('/api/v1/users/me/ai/credits');
    },
  };
}
