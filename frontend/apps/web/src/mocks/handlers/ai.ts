import { http, HttpResponse } from 'msw';
import {
  mockAiChatResponse,
  mockAiConversations,
  mockBrainstormResponse,
  mockScriptDoctorResponse,
  mockAiCredits,
} from '../data';

const BASE = '*/api/v1/workspaces/:workspaceId/ai';

export const aiHandlers = [
  // POST /api/v1/workspaces/:workspaceId/ai/conversations
  http.post(`${BASE}/conversations`, () => {
    return HttpResponse.json(mockAiConversations[0], { status: 201 });
  }),

  // GET /api/v1/workspaces/:workspaceId/ai/conversations
  http.get(`${BASE}/conversations`, () => {
    return HttpResponse.json(mockAiConversations);
  }),

  // GET /api/v1/workspaces/:workspaceId/ai/conversations/:convId
  http.get(`${BASE}/conversations/:convId`, () => {
    return HttpResponse.json(mockAiConversations[0]);
  }),

  // DELETE /api/v1/workspaces/:workspaceId/ai/conversations/:convId
  http.delete(`${BASE}/conversations/:convId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/workspaces/:workspaceId/ai/conversations/:convId/messages
  http.post(`${BASE}/conversations/:convId/messages`, () => {
    return HttpResponse.json(mockAiChatResponse);
  }),

  // POST /api/v1/workspaces/:workspaceId/ai/brainstorm
  http.post(`${BASE}/brainstorm`, () => {
    return HttpResponse.json(mockBrainstormResponse);
  }),

  // POST /api/v1/workspaces/:workspaceId/ai/script-generate
  http.post(`${BASE}/script-generate`, () => {
    return HttpResponse.json(mockScriptDoctorResponse);
  }),

  // GET /api/v1/users/me/ai/credits
  http.get('*/api/v1/users/me/ai/credits', () => {
    return HttpResponse.json(mockAiCredits);
  }),
];
