import { http, HttpResponse } from 'msw';
import { mockSearchResults } from '../data';

const BASE = '*/api/v1/workspaces/:workspaceId/search';

export const searchHandlers = [
  // GET /api/v1/workspaces/:workspaceId/search
  http.get(BASE, () => {
    return HttpResponse.json(mockSearchResults);
  }),
];
