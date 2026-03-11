'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export interface NotificationPreferences {
  inApp: {
    xpEarned: boolean;
    achievementUnlocked: boolean;
    levelUp: boolean;
    teamMemberJoined: boolean;
    dealStageChanged: boolean;
    publishingReminder: boolean;
  };
  email: {
    weeklyDigest: boolean;
    monthlyReport: boolean;
    teamInvitations: boolean;
    billingAlerts: boolean;
  };
}

const PREFS_KEY = ['notification-preferences'] as const;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => apiClient.get<NotificationPreferences>('/v1/notifications/preferences'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) =>
      apiClient.patch<NotificationPreferences>('/v1/notifications/preferences', prefs),
    onSuccess: (data) => {
      queryClient.setQueryData(PREFS_KEY, data);
    },
    onError: () => {
      toast.error('Failed to save preferences. Please try again.');
    },
  });
}
