import { useAuthStore } from '../auth.store';
import type { User } from '@ordo/types';

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  tier: 'free',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function getState() {
  return useAuthStore.getState();
}

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setAccessToken (login)', () => {
    it('sets isAuthenticated to true and stores accessToken', () => {
      getState().setAccessToken('my-token-123');

      const state = getState();
      expect(state.accessToken).toBe('my-token-123');
      expect(state.isAuthenticated).toBe(true);
    });

    it('sets isAuthenticated to false when token is null', () => {
      // First set a token
      getState().setAccessToken('my-token-123');
      expect(getState().isAuthenticated).toBe(true);

      // Then clear it
      getState().setAccessToken(null);

      const state = getState();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('does not affect user or isLoading state', () => {
      getState().setUser(mockUser);
      getState().setLoading(false);

      getState().setAccessToken('new-token');

      const state = getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('sets the user', () => {
      getState().setUser(mockUser);
      expect(getState().user).toEqual(mockUser);
    });

    it('clears the user when set to null', () => {
      getState().setUser(mockUser);
      getState().setUser(null);
      expect(getState().user).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears all auth state', () => {
      // Set up authenticated state
      getState().setAccessToken('my-token');
      getState().setUser(mockUser);
      getState().setLoading(false);

      // Verify pre-condition
      expect(getState().isAuthenticated).toBe(true);

      // Logout
      getState().logout();

      const state = getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('accessToken is not findable after logout', () => {
      getState().setAccessToken('secret-token-xyz');
      expect(getState().accessToken).toBe('secret-token-xyz');

      getState().logout();

      expect(getState().accessToken).toBeNull();
      // Verify the token is truly gone from the entire state object
      const state = getState();
      const stateValues = Object.values(state).filter(
        (v) => typeof v !== 'function',
      );
      expect(stateValues).not.toContain('secret-token-xyz');
    });
  });

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      getState().setLoading(false);
      getState().setLoading(true);
      expect(getState().isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      getState().setLoading(false);
      expect(getState().isLoading).toBe(false);
    });
  });

  describe('token refresh', () => {
    it('updates accessToken without changing other state', () => {
      // Set initial authenticated state
      getState().setAccessToken('old-token');
      getState().setUser(mockUser);
      getState().setLoading(false);

      // Refresh token
      getState().setAccessToken('refreshed-token');

      const state = getState();
      expect(state.accessToken).toBe('refreshed-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('selectors', () => {
    it('isAuthenticated reflects token presence', () => {
      expect(getState().isAuthenticated).toBe(false);

      getState().setAccessToken('token');
      expect(getState().isAuthenticated).toBe(true);

      getState().setAccessToken(null);
      expect(getState().isAuthenticated).toBe(false);
    });
  });
});
