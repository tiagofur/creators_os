import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW browser worker for development and Playwright tests.
 *
 * To use in the browser, call:
 *   const { worker } = await import('@/mocks/browser');
 *   await worker.start({ onUnhandledRequest: 'bypass' });
 */
export const worker = setupWorker(...handlers);
