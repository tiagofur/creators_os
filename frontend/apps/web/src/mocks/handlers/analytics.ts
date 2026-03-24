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

const BASE = '*/api/v1/workspaces/:workspaceId/analytics';

export const analyticsHandlers = [
  // GET /api/v1/workspaces/:workspaceId/analytics/overview
  http.get(`${BASE}/overview`, () => {
    return HttpResponse.json(mockPlatformMetrics);
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/content/:contentId
  http.get(`${BASE}/content/:contentId`, () => {
    return HttpResponse.json(mockConsistencyScore);
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/platform/:platform
  http.get(`${BASE}/platform/:platform`, () => {
    return HttpResponse.json(mockPlatformMetrics[0] ?? {});
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/consistency
  http.get(`${BASE}/consistency`, () => {
    return HttpResponse.json(mockConsistencyScore);
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/heatmap
  http.get(`${BASE}/heatmap`, () => {
    return HttpResponse.json(mockHeatmapDays);
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/velocity
  http.get(`${BASE}/velocity`, () => {
    return HttpResponse.json(mockPipelineVelocity);
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/reports/weekly
  http.get(`${BASE}/reports/weekly`, () => {
    return HttpResponse.json(mockWeeklyReport);
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/reports/monthly
  http.get(`${BASE}/reports/monthly`, () => {
    return HttpResponse.json(mockMonthlyReport);
  }),

  // GET /api/v1/workspaces/:workspaceId/analytics/goals
  http.get(`${BASE}/goals`, () => {
    return HttpResponse.json(mockAnalyticsGoals);
  }),

  // POST /api/v1/workspaces/:workspaceId/analytics/goals
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

  // PATCH /api/v1/workspaces/:workspaceId/analytics/goals/:goalId
  http.patch(`${BASE}/goals/:goalId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockAnalyticsGoal,
      ...body,
    });
  }),

  // DELETE /api/v1/workspaces/:workspaceId/analytics/goals/:goalId
  http.delete(`${BASE}/goals/:goalId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/workspaces/:workspaceId/analytics/sync
  http.post(`${BASE}/sync`, () => {
    return new HttpResponse(null, { status: 202 });
  }),
];
