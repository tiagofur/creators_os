import { createApiClient, ApiError } from '../client';
import type { ApiClientConfig } from '../client';

// ── Global fetch mock ──────────────────────────────────────────────
const mockFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
(globalThis as any).fetch = mockFetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as Response;
}

function makeConfig(overrides: Partial<ApiClientConfig> = {}): ApiClientConfig {
  return {
    baseUrl: 'https://api.test.com',
    getAccessToken: () => 'test-token',
    onUnauthorized: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Successful requests ────────────────────────────────────────────
describe('createApiClient – fetch wrapper', () => {
  it('sends a GET request with auth header', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: '1' }));

    const client = createApiClient(makeConfig());
    const result = await client.get('/v1/items');

    expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/v1/items', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: undefined,
      credentials: 'include',
    });
    expect(result).toEqual({ id: '1' });
  });

  it('sends a POST request with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: '2' }));

    const client = createApiClient(makeConfig());
    const result = await client.post('/v1/items', { name: 'Test' });

    expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/v1/items', {
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Test' }),
      credentials: 'include',
    });
    expect(result).toEqual({ id: '2' });
  });

  it('sends a PATCH request', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: '3', name: 'Updated' }));

    const client = createApiClient(makeConfig());
    const result = await client.patch('/v1/items/3', { name: 'Updated' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/items/3',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(result).toEqual({ id: '3', name: 'Updated' });
  });

  it('sends a PUT request', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const client = createApiClient(makeConfig());
    await client.put('/v1/items/1', { name: 'Replaced' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/items/1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Replaced' }) }),
    );
  });

  it('sends a DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: () => Promise.resolve(undefined),
      headers: new Headers(),
    } as Response);

    const client = createApiClient(makeConfig());
    const result = await client.delete('/v1/items/1');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/items/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(result).toBeUndefined();
  });

  it('omits Authorization header when no token is available', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ public: true }));

    const client = createApiClient(makeConfig({ getAccessToken: () => null }));
    await client.get('/v1/public');

    const callHeaders = (mockFetch.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(callHeaders['Authorization']).toBeUndefined();
  });

  // ── Error normalisation ────────────────────────────────────────
  it('throws ApiError with server error body on 4xx', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { status: 422, code: 'VALIDATION_ERROR', message: 'Invalid input', details: { name: ['required'] } },
        422,
      ),
    );

    const client = createApiClient(makeConfig());
    try {
      await client.post('/v1/items', {});
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.details).toEqual({ name: ['required'] });
    }
  });

  it('throws ApiError with fallback when response body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
      headers: new Headers(),
    } as unknown as Response);

    const client = createApiClient(makeConfig());
    try {
      await client.get('/v1/broken');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(500);
      expect(apiErr.code).toBe('UNKNOWN_ERROR');
      expect(apiErr.message).toBe('Internal Server Error');
    }
  });

  it('throws ApiError with generic message when statusText is also empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: '',
      json: () => Promise.reject(new Error('no json')),
      headers: new Headers(),
    } as unknown as Response);

    const client = createApiClient(makeConfig());
    try {
      await client.get('/v1/down');
      fail('should have thrown');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('An unknown error occurred');
    }
  });

  // ── Schema validation ──────────────────────────────────────────
  it('validates response with a zod schema when provided', async () => {
    const { z } = await import('zod');
    const schema = z.object({ id: z.string(), name: z.string() });

    mockFetch.mockResolvedValueOnce(jsonResponse({ id: '1', name: 'Valid' }));

    const client = createApiClient(makeConfig());
    const result = await client.get('/v1/items/1', schema);
    expect(result).toEqual({ id: '1', name: 'Valid' });
  });

  it('returns data even when schema validation fails (logs warning)', async () => {
    const { z } = await import('zod');
    const schema = z.object({ id: z.number() }); // expects number, will receive string

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'not-a-number' }));

    const client = createApiClient(makeConfig());
    const result = await client.get('/v1/items/1', schema);

    // Should return raw data despite validation failure
    expect(result).toEqual({ id: 'not-a-number' });
    expect(consoleSpy).toHaveBeenCalledWith(
      'API response validation failed:',
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });
});
