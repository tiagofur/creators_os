import { createApiClient } from '@ordo/api-client';
import { useAuthStore } from '@ordo/stores';
import { API_BASE_URL } from '@ordo/core';

/**
 * Singleton API client wired to the auth store.
 * - Access token is read from Zustand (memory-only, never localStorage)
 * - On unauthorized, it redirects to the login page
 */
export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,

  getAccessToken: () => useAuthStore.getState().accessToken,

  onUnauthorized: () => {
    // Clear auth state
    useAuthStore.getState().logout();

    // Redirect to login — detect current locale from window.location
    if (typeof window !== 'undefined') {
      const localeMatch = window.location.pathname.match(/^\/([a-z]{2})\//);
      const locale = localeMatch?.[1] ?? 'en';
      window.location.href = `/${locale}/login`;
    }
  },
});
