export interface PlatformMetrics {
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
  followerDelta: number;
  period: string;
}

export interface ConsistencyScore {
  score: number; // 0-100
  streak: number; // current streak in days
  longestStreak: number;
  publishedThisMonth: number;
  targetPerMonth: number;
  level: 'Beginner' | 'Consistent' | 'Pro' | 'Elite';
}

export interface HeatmapDay {
  date: string; // ISO date
  count: number; // pieces published
  score: number; // 0-4 intensity
}

export interface PipelineVelocity {
  stage: string;
  avgDaysInStage: number;
  itemCount: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  published: number;
  ideasCaptured: number;
  aiCreditsUsed: number;
  topPlatform: string;
  consistencyScore: number;
}

export interface MonthlyReport {
  monthStart: string;
  monthEnd: string;
  published: number;
  ideasCaptured: number;
  aiCreditsUsed: number;
  topPlatform: string;
  consistencyScore: number;
  totalIncome: number;
}

export interface PostingTimeSlot {
  day_of_week: number;
  hour: number;
  avg_engagement: number;
  post_count: number;
  confidence: string;
}

export interface BestTimesResponse {
  platform: string;
  slots: PostingTimeSlot[];
  message?: string;
}

export interface AnalyticsGoal {
  id: string;
  workspaceId: string;
  title: string;
  metricType: 'views' | 'followers' | 'published' | 'consistency';
  targetValue: number;
  currentValue: number;
  deadline?: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
}
