import type { OrdoApiClient } from '../client';
import type { User, AuthTokens, LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest } from '@ordo/types';
import { authResponseSchema } from '@ordo/validations';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  tier: z.enum(['free', 'pro', 'enterprise']),
  created_at: z.string(),
  updated_at: z.string(),
});

export function createAuthResource(client: OrdoApiClient) {
  return {
    login(body: LoginRequest): Promise<AuthTokens> {
      return client.post<AuthTokens>('/v1/auth/login', body, authResponseSchema);
    },

    register(body: RegisterRequest): Promise<AuthTokens> {
      return client.post<AuthTokens>('/v1/auth/register', body, authResponseSchema);
    },

    logout(): Promise<void> {
      return client.post<void>('/v1/auth/logout');
    },

    refresh(): Promise<AuthTokens> {
      return client.post<AuthTokens>('/v1/auth/refresh', undefined, authResponseSchema);
    },

    forgotPassword(body: ForgotPasswordRequest): Promise<void> {
      return client.post<void>('/v1/auth/forgot-password', body);
    },

    resetPassword(body: ResetPasswordRequest): Promise<void> {
      return client.post<void>('/v1/auth/reset-password', body);
    },

    getMe(): Promise<User> {
      return client.get<User>('/v1/auth/me', userSchema);
    },

    oauthUrl(provider: 'google' | 'github'): Promise<{ url: string }> {
      return client.get<{ url: string }>(`/v1/auth/oauth/${provider}`);
    },

    oauthCallback(provider: 'google' | 'github', code: string, state: string): Promise<AuthTokens> {
      return client.post<AuthTokens>(`/v1/auth/oauth/${provider}/callback`, { code, state }, authResponseSchema);
    },
  };
}
