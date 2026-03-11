import type {
  PlatformMetrics,
  ConsistencyScore,
  HeatmapDay,
  PipelineVelocity,
  WeeklyReport,
  MonthlyReport,
  AnalyticsGoal,
} from '@ordo/types';
import { mockWorkspace } from './workspaces';

export const mockPlatformMetrics: PlatformMetrics[] = [
  {
    platform: 'youtube',
    views: 125000,
    likes: 8400,
    comments: 1250,
    shares: 620,
    followers: 24500,
    followerDelta: 1200,
    period: '30d',
  },
  {
    platform: 'tiktok',
    views: 340000,
    likes: 28000,
    comments: 3100,
    shares: 4500,
    followers: 18200,
    followerDelta: 3400,
    period: '30d',
  },
];

export const mockConsistencyScore: ConsistencyScore = {
  score: 78,
  streak: 12,
  longestStreak: 21,
  publishedThisMonth: 8,
  targetPerMonth: 12,
  level: 'Consistent',
};

export const mockHeatmapDays: HeatmapDay[] = [
  { date: '2025-01-01', count: 1, score: 2 },
  { date: '2025-01-02', count: 0, score: 0 },
  { date: '2025-01-03', count: 2, score: 3 },
  { date: '2025-01-04', count: 1, score: 2 },
  { date: '2025-01-05', count: 0, score: 0 },
  { date: '2025-01-06', count: 3, score: 4 },
  { date: '2025-01-07', count: 1, score: 2 },
];

export const mockPipelineVelocity: PipelineVelocity[] = [
  { stage: 'idea', avgDaysInStage: 3.2, itemCount: 5 },
  { stage: 'scripting', avgDaysInStage: 4.5, itemCount: 3 },
  { stage: 'recording', avgDaysInStage: 2.1, itemCount: 2 },
  { stage: 'editing', avgDaysInStage: 3.8, itemCount: 4 },
  { stage: 'review', avgDaysInStage: 1.5, itemCount: 1 },
  { stage: 'publishing', avgDaysInStage: 0.5, itemCount: 1 },
];

export const mockWeeklyReport: WeeklyReport = {
  weekStart: '2025-01-06',
  weekEnd: '2025-01-12',
  published: 3,
  ideasCaptured: 5,
  aiCreditsUsed: 42,
  topPlatform: 'youtube',
  consistencyScore: 78,
};

export const mockMonthlyReport: MonthlyReport = {
  monthStart: '2025-01-01',
  monthEnd: '2025-01-31',
  published: 8,
  ideasCaptured: 14,
  aiCreditsUsed: 156,
  topPlatform: 'youtube',
  consistencyScore: 78,
  totalIncome: 2400,
};

export const mockAnalyticsGoal: AnalyticsGoal = {
  id: 'goal_01HQGOAL11111111',
  workspaceId: mockWorkspace.id,
  title: 'Reach 50K YouTube Subscribers',
  metricType: 'followers',
  targetValue: 50000,
  currentValue: 24500,
  deadline: '2025-06-30',
  status: 'active',
  createdAt: '2025-01-01T00:00:00.000Z',
};

export const mockAnalyticsGoals: AnalyticsGoal[] = [
  mockAnalyticsGoal,
  {
    id: 'goal_02HQGOAL22222222',
    workspaceId: mockWorkspace.id,
    title: 'Publish 12 videos this month',
    metricType: 'published',
    targetValue: 12,
    currentValue: 8,
    deadline: '2025-01-31',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];
