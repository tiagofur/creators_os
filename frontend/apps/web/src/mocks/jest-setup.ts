import { server } from './server';

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
