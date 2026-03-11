import { http, HttpResponse } from 'msw';
import { mockSearchResults } from '../data';

const BASE = '*/v1/search';

export const searchHandlers = [
  // GET /v1/search
  http.get(BASE, () => {
    return HttpResponse.json(mockSearchResults);
  }),
];
