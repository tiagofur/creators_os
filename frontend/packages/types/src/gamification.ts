export interface CreatorLevel {
  level: number;
  title: string; // "Idea Machine", "Consistent Creator", etc.
  xp: number;
  xpForNextLevel: number;
  xpProgress: number; // 0-100 percentage
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji or icon name
  unlockedAt: string | null;
  category: 'consistency' | 'ideas' | 'publishing' | 'ai' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface GamificationProfile {
  userId: string;
  level: CreatorLevel;
  totalXp: number;
  achievements: Achievement[];
}
