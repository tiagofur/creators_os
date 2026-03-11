import type { z } from 'zod';
import type { ApiError as ApiErrorType } from '@ordo/types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(error: ApiErrorType) {
    super(error.message);
    this.name = 'ApiError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
}

interface RequestOptions<T> {
  method: string;
  path: string;
  body?: unknown;
  schema?: z.ZodSchema<T>;
  skipAuth?: boolean;
}

export function createApiClient(config: ApiClientConfig) {
  let refreshPromise: Promise<boolean> | null = null;

  async function refreshToken(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          config.onUnauthorized();
          return false;
        }
        return true;
      } catch {
        config.onUnauthorized();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  async function request<T>(options: RequestOptions<T>, isRetry = false): Promise<T> {
    const { method, path, body, schema, skipAuth } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      const token = config.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.status === 401 && !isRetry && !skipAuth) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return request<T>(options, true);
      }
      throw new ApiError({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!response.ok) {
      let errorData: ApiErrorType;
      try {
        errorData = (await response.json()) as ApiErrorType;
      } catch {
        errorData = {
          status: response.status,
          code: 'UNKNOWN_ERROR',
          message: response.statusText || 'An unknown error occurred',
        };
      }
      throw new ApiError(errorData);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data: unknown = await response.json();

    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        console.error('API response validation failed:', result.error);
        // Return data anyway — don't block the UI on schema drift
        return data as T;
      }
      return result.data;
    }

    return data as T;
  }

  return {
    get<T>(path: string, schema?: z.ZodSchema<T>): Promise<T> {
      return request<T>({ method: 'GET', path, schema });
    },

    post<T>(path: string, body?: unknown, schema?: z.ZodSchema<T>): Promise<T> {
      return request<T>({ method: 'POST', path, body, schema });
    },

    put<T>(path: string, body?: unknown, schema?: z.ZodSchema<T>): Promise<T> {
      return request<T>({ method: 'PUT', path, body, schema });
    },

    patch<T>(path: string, body?: unknown, schema?: z.ZodSchema<T>): Promise<T> {
      return request<T>({ method: 'PATCH', path, body, schema });
    },

    delete<T>(path: string): Promise<T> {
      return request<T>({ method: 'DELETE', path });
    },
  };
}

export type OrdoApiClient = ReturnType<typeof createApiClient>;
