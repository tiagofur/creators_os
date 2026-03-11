'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { createGamificationResource } from '@ordo/api-client';
import { useAuthStore } from '@ordo/stores';

const gamificationApi = createGamificationResource(apiClient);

export function useCreatorLevel() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const query = useQuery({
    queryKey: queryKeys.gamification.profile(userId),
    queryFn: () => gamificationApi.getProfile(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2, // 2min
  });

  return {
    ...query,
    level: query.data?.level ?? null,
  };
}

export function useGamificationProfile() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.gamification.profile(userId),
    queryFn: () => gamificationApi.getProfile(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAchievements() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.gamification.achievements(userId),
    queryFn: () => gamificationApi.getAchievements(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });
}
