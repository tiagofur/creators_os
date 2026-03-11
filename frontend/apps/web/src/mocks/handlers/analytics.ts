import { http, HttpResponse } from 'msw';
import {
  mockPlatformMetrics,
  mockConsistencyScore,
  mockHeatmapDays,
  mockPipelineVelocity,
  mockWeeklyReport,
  mockMonthlyReport,
  mockAnalyticsGoals,
  mockAnalyticsGoal,
} from '../data';

const BASE = '*/v1/workspaces/:workspaceId/analytics';

export const analyticsHandlers = [
  // GET /v1/workspaces/:workspaceId/analytics/platforms
  http.get(`${BASE}/platforms`, () => {
    return HttpResponse.json(mockPlatformMetrics);
  }),

  // GET /v1/workspaces/:workspaceId/analytics/consistency
  http.get(`${BASE}/consistency`, () => {
    return HttpResponse.json(mockConsistencyScore);
  }),

  // GET /v1/workspaces/:workspaceId/analytics/heatmap
  http.get(`${BASE}/heatmap`, () => {
    return HttpResponse.json(mockHeatmapDays);
  }),

  // GET /v1/workspaces/:workspaceId/analytics/velocity
  http.get(`${BASE}/velocity`, () => {
    return HttpResponse.json(mockPipelineVelocity);
  }),

  // GET /v1/workspaces/:workspaceId/analytics/report/weekly
  http.get(`${BASE}/report/weekly`, () => {
    return HttpResponse.json(mockWeeklyReport);
  }),

  // GET /v1/workspaces/:workspaceId/analytics/report/monthly
  http.get(`${BASE}/report/monthly`, () => {
    return HttpResponse.json(mockMonthlyReport);
  }),

  // GET /v1/workspaces/:workspaceId/analytics/goals
  http.get(`${BASE}/goals`, () => {
    return HttpResponse.json(mockAnalyticsGoals);
  }),

  // POST /v1/workspaces/:workspaceId/analytics/goals
  http.post(`${BASE}/goals`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockAnalyticsGoal,
      id: `goal_new_${Date.now()}`,
      workspaceId: params.workspaceId,
      ...body,
      currentValue: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // PATCH /v1/workspaces/:workspaceId/analytics/goals/:goalId
  http.patch(`${BASE}/goals/:goalId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockAnalyticsGoal,
      ...body,
    });
  }),

  // DELETE /v1/workspaces/:workspaceId/analytics/goals/:goalId
  http.delete(`${BASE}/goals/:goalId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
