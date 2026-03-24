import { http, HttpResponse } from 'msw';
import { mockGamificationProfile, mockAchievements } from '../data';

const BASE = '*/api/v1/workspaces/:workspaceId/gamification';

export const gamificationHandlers = [
  // GET /api/v1/workspaces/:workspaceId/gamification/leaderboard
  http.get(`${BASE}/leaderboard`, () => {
    return HttpResponse.json([mockGamificationProfile]);
  }),

  // GET /api/v1/workspaces/:workspaceId/gamification/my-stats
  http.get(`${BASE}/my-stats`, () => {
    return HttpResponse.json(mockGamificationProfile);
  }),

  // GET /api/v1/workspaces/:workspaceId/gamification/achievements
  http.get(`${BASE}/achievements`, () => {
    return HttpResponse.json(mockAchievements);
  }),
];
