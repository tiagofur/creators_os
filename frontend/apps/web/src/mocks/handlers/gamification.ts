import { http, HttpResponse } from 'msw';
import { mockGamificationProfile, mockAchievements } from '../data';

const BASE = '*/v1/users';

export const gamificationHandlers = [
  // GET /v1/users/:userId/gamification
  http.get(`${BASE}/:userId/gamification`, () => {
    return HttpResponse.json(mockGamificationProfile);
  }),

  // GET /v1/users/:userId/achievements
  http.get(`${BASE}/:userId/achievements`, () => {
    return HttpResponse.json(mockAchievements);
  }),
];
