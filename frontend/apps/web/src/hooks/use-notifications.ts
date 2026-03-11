'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AppNotification } from '@ordo/types';

const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
  count: () => ['notifications', 'count'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(),
    queryFn: () => apiClient.get<AppNotification[]>('/v1/notifications?unread=false&page=1'),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.count(),
    queryFn: () => apiClient.get<{ count: number }>('/v1/notifications/count'),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // poll every minute
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.patch<void>(`/v1/notifications/${id}`, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.count() });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<void>('/v1/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export { NOTIFICATION_KEYS };
