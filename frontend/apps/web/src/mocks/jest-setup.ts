import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './server';

// Polyfill ResizeObserver for jsdom (used by Radix UI)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Start the MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any runtime handlers after each test (restores default handlers)
afterEach(() => {
  server.resetHandlers();
});

// Stop the server after all tests
afterAll(() => {
  server.close();
});
