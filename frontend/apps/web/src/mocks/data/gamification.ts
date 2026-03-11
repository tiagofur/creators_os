import type { Achievement, GamificationProfile } from '@ordo/types';
import { mockUser } from './users';

export const mockAchievements: Achievement[] = [
  {
    id: 'ach_01HQACH111111111',
    title: 'First Publish',
    description: 'Published your first piece of content.',
    icon: 'trophy',
    unlockedAt: '2024-07-01T10:00:00.000Z',
    category: 'publishing',
    rarity: 'common',
  },
  {
    id: 'ach_02HQACH222222222',
    title: 'Consistent Creator',
    description: 'Maintained a 7-day publishing streak.',
    icon: 'flame',
    unlockedAt: '2025-01-10T08:00:00.000Z',
    category: 'consistency',
    rarity: 'rare',
  },
  {
    id: 'ach_03HQACH333333333',
    title: 'Idea Machine',
    description: 'Captured 100 ideas.',
    icon: 'lightbulb',
    unlockedAt: null,
    category: 'ideas',
    rarity: 'epic',
  },
];

export const mockGamificationProfile: GamificationProfile = {
  userId: mockUser.id,
  level: {
    level: 8,
    title: 'Consistent Creator',
    xp: 2450,
    xpForNextLevel: 3000,
    xpProgress: 82,
  },
  totalXp: 2450,
  achievements: mockAchievements,
};
