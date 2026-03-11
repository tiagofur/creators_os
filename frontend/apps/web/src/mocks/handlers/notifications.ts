import { http, HttpResponse } from 'msw';
import { mockNotifications } from '../data';

const BASE = '*/v1/notifications';

export const notificationsHandlers = [
  // GET /v1/notifications
  http.get(BASE, () => {
    return HttpResponse.json(mockNotifications);
  }),

  // GET /v1/notifications/count
  http.get(`${BASE}/count`, () => {
    const unreadCount = mockNotifications.filter((n) => !n.read).length;
    return HttpResponse.json({ count: unreadCount });
  }),

  // PATCH /v1/notifications/:id
  http.patch(`${BASE}/:id`, ({ params }) => {
    const notif = mockNotifications.find((n) => n.id === params.id);
    if (!notif) {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'Notification not found' },
        { status: 404 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /v1/notifications/mark-all-read
  http.post(`${BASE}/mark-all-read`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
