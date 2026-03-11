import { http, HttpResponse } from 'msw';
import {
  mockAiChatResponse,
  mockAiConversations,
  mockBrainstormResponse,
  mockTitleLabResponse,
  mockDescriptionResponse,
  mockScriptDoctorResponse,
  mockRemixResponse,
  mockHookResponse,
  mockHashtagResponse,
  mockAiCredits,
} from '../data';

const BASE = '*/v1/ai';

export const aiHandlers = [
  // POST /v1/ai/chat
  http.post(`${BASE}/chat`, () => {
    return HttpResponse.json(mockAiChatResponse);
  }),

  // GET /v1/ai/conversations
  http.get(`${BASE}/conversations`, () => {
    return HttpResponse.json(mockAiConversations);
  }),

  // POST /v1/ai/brainstorm
  http.post(`${BASE}/brainstorm`, () => {
    return HttpResponse.json(mockBrainstormResponse);
  }),

  // POST /v1/ai/title-lab
  http.post(`${BASE}/title-lab`, () => {
    return HttpResponse.json(mockTitleLabResponse);
  }),

  // POST /v1/ai/description
  http.post(`${BASE}/description`, () => {
    return HttpResponse.json(mockDescriptionResponse);
  }),

  // POST /v1/ai/script-doctor
  http.post(`${BASE}/script-doctor`, () => {
    return HttpResponse.json(mockScriptDoctorResponse);
  }),

  // POST /v1/ai/remix
  http.post(`${BASE}/remix`, () => {
    return HttpResponse.json(mockRemixResponse);
  }),

  // POST /v1/ai/hooks
  http.post(`${BASE}/hooks`, () => {
    return HttpResponse.json(mockHookResponse);
  }),

  // POST /v1/ai/hashtags
  http.post(`${BASE}/hashtags`, () => {
    return HttpResponse.json(mockHashtagResponse);
  }),

  // GET /v1/ai/credits
  http.get(`${BASE}/credits`, () => {
    return HttpResponse.json(mockAiCredits);
  }),
];
