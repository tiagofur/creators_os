import { create } from 'zustand';
import type { User } from '@ordo/types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // State — access token is memory-only, never persisted
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Actions
  setAccessToken: (token) =>
    set({
      accessToken: token,
      isAuthenticated: token !== null,
    }),

  setUser: (user) => set({ user }),

  logout: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),
}));
