import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for Node.js environments (Jest, Vitest, etc.).
 *
 * Usage in tests:
 *   import { server } from '@/mocks/server';
 *
 *   // Override a handler for error testing:
 *   server.use(
 *     http.get('*\/v1/ideas', () => {
 *       return HttpResponse.json(
 *         { status: 500, code: 'INTERNAL_ERROR', message: 'Server error' },
 *         { status: 500 },
 *       );
 *     }),
 *   );
 */
export const server = setupServer(...handlers);
