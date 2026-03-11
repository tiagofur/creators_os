import type { Achievement } from '@ordo/types';

export const RARITY_RING: Record<Achievement['rarity'], string> = {
  common: 'ring-2 ring-slate-400',
  rare: 'ring-2 ring-blue-500',
  epic: 'ring-2 ring-purple-500',
  legendary: 'ring-2 ring-yellow-500',
};
