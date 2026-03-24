import type { OrdoApiClient } from '../client';
import type { AppNotification } from '@ordo/types';

export function createNotificationsResource(client: OrdoApiClient) {
  return {
    list(params?: { unread?: boolean; page?: number }): Promise<AppNotification[]> {
      const search = new URLSearchParams();
      if (params?.unread !== undefined) search.set('unread', String(params.unread));
      if (params?.page !== undefined) search.set('page', String(params.page));
      const query = search.toString();
      return client.get<AppNotification[]>(`/api/v1/notifications${query ? `?${query}` : ''}`);
    },

    getUnreadCount(): Promise<{ count: number }> {
      return client.get<{ count: number }>('/api/v1/notifications/count');
    },

    markAsRead(id: string): Promise<void> {
      return client.patch<void>(`/api/v1/notifications/${id}`, { read: true });
    },

    markAllAsRead(): Promise<void> {
      return client.post<void>('/api/v1/notifications/mark-all-read');
    },
  };
}
