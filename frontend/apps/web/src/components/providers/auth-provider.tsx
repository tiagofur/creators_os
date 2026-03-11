'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useWsStore } from '@ordo/stores';
import { createWsClient } from '@ordo/api-client';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { XpToast } from '@/components/gamification/xp-toast';
import { AchievementUnlockModal } from '@/components/gamification/achievement-unlock-modal';
import { LevelUpModal } from '@/components/gamification/level-up-modal';
import type { Achievement, CreatorLevel } from '@ordo/types';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface XpEarnedEvent {
  amount: number;
  reason: string;
}

interface AchievementUnlockedEvent {
  achievement: Achievement;
}

interface LevelUpEvent {
  newLevel: CreatorLevel;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/ws';

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setLoading = useAuthStore((s) => s.setLoading);
  const queryClient = useQueryClient();

  // Gamification notification state
  const [xpToast, setXpToast] = useState<XpEarnedEvent | null>(null);
  const [achievementModal, setAchievementModal] = useState<Achievement | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<CreatorLevel | null>(null);

  const handleXpEarned = useCallback((data: unknown) => {
    const event = data as XpEarnedEvent;
    setXpToast(event);
    // Invalidate gamification data so profile updates
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.gamification.profile(userId),
      });
    }
  }, [queryClient]);

  const handleAchievementUnlocked = useCallback((data: unknown) => {
    const event = data as AchievementUnlockedEvent;
    setAchievementModal(event.achievement);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.gamification.achievements(userId),
      });
    }
  }, [queryClient]);

  const handleLevelUp = useCallback((data: unknown) => {
    const event = data as LevelUpEvent;
    setLevelUpModal(event.newLevel);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.gamification.profile(userId),
      });
    }
  }, [queryClient]);

  useEffect(() => {
    async function initAuth() {
      try {
        // Attempt a silent token refresh on mount to restore session
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json() as { access_token: string };
          setAccessToken(data.access_token);

          // Fetch current user
          const user = await apiClient.get('/v1/auth/me');
          setUser(user as Parameters<typeof setUser>[0]);

          // Connect WebSocket and register gamification event handlers
          const wsClient = createWsClient({
            url: WS_URL,
            getAccessToken: () => useAuthStore.getState().accessToken,
          });

          wsClient.subscribe('xp_earned', handleXpEarned);
          wsClient.subscribe('achievement_unlocked', handleAchievementUnlocked);
          wsClient.subscribe('level_up', handleLevelUp);

          // Sync connection state to Zustand store
          const unsubscribeState = wsClient.onConnectionStateChange((state) => {
            useWsStore.getState().setConnectionState(state);
          });

          // Cleanup on unmount
          return () => {
            unsubscribeState();
            wsClient.disconnect();
          };
        }
      } catch {
        // No active session — user needs to log in
      } finally {
        setLoading(false);
      }
    }

    void initAuth();
  }, [setAccessToken, setUser, setLoading, handleXpEarned, handleAchievementUnlocked, handleLevelUp]);

  return (
    <>
      {children}

      {/* Gamification notifications */}
      {xpToast && (
        <XpToast
          amount={xpToast.amount}
          reason={xpToast.reason}
          onDone={() => setXpToast(null)}
        />
      )}
      {achievementModal && (
        <AchievementUnlockModal
          achievement={achievementModal}
          onClose={() => setAchievementModal(null)}
        />
      )}
      {levelUpModal && (
        <LevelUpModal
          newLevel={levelUpModal}
          onClose={() => setLevelUpModal(null)}
        />
      )}
    </>
  );
}
