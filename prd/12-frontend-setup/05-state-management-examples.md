# State Management Architecture & Examples
## Ordo Creator OS — Frontend Implementation Guide

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, React Query (TanStack Query), React Hook Form, nuqs

---

## 1. State Management Architecture Overview

### Decision Tree: When to Use What

```
┌─ Is this server data or cached data?
│  ├─ YES → React Query (TanStack Query)
│  │  └─ Project list, user profile, analytics, media metadata
│  │
│  └─ NO → Zustand or Context
│     ├─ Is this global UI state shared across many unrelated components?
│     │  ├─ YES → Zustand
│     │  │  └─ Theme, sidebar collapsed, modals, toasts, notifications
│     │  │
│     │  └─ NO → Local component state (useState)
│     │     └─ Form inputs, expanded panels, local UI toggles
│
├─ Is this ephemeral filter/navigation state?
│  ├─ YES → URL state (nuqs)
│  │  └─ Search filters, pagination, sorting, active tabs
│  │
│  └─ NO → Keep above
│
├─ Does this need real-time sync?
│  ├─ YES → React Query + WebSocket listener
│  │  └─ Notifications, analytics streams, collaborative editing
│  │
│  └─ NO → Keep above
│
└─ Does this need persistence?
   ├─ YES → Zustand with persist middleware
   │  └─ Auth tokens, theme preference, editor drafts
   │
   └─ NO → Keep above
```

### Quick Reference Table

| State Type | Solution | Persistence | Multi-Tab Sync | When |
|-----------|----------|-------------|--------|------|
| **Server data** | React Query | Cache only | Auto via QueryClient | Projects, users, analytics, media metadata |
| **Global UI state** | Zustand | Optional | Via URL or listener | Theme, sidebar, modals, toasts, active panels |
| **Form state** | React Hook Form | No | No | Login, content editor, media upload |
| **Navigation/filters** | nuqs (URL) | Yes | Auto (URL) | Search, pagination, sorting, tabs, active project |
| **Real-time updates** | RQ + WebSocket | Cache + store | Yes | Notifications, live analytics, collaborative edits |
| **Local component state** | useState | No | No | Temporary UI toggles, expanded sections |

---

## 2. Zustand Store Definitions

### 2.1 Auth Store

Manages user session, tokens, authentication state, and token refresh logic.

```typescript
// lib/stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'creator' | 'admin' | 'viewer';
  createdAt: Date;
}

export interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<string>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

// MMKV storage for React Native
const mmkvStorage = new MMKV();

const mmkvStorageAdapter = {
  getItem: (name: string) => {
    const value = mmkvStorage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    mmkvStorage.setString(name, value);
  },
  removeItem: (name: string) => {
    mmkvStorage.delete(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action with token refresh
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            throw new Error('Login failed');
          }

          const data = await res.json();
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Token refresh with silent retry
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ isAuthenticated: false });
          throw new Error('No refresh token available');
        }

        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!res.ok) {
            set({ isAuthenticated: false });
            throw new Error('Token refresh failed');
          }

          const { accessToken, refreshToken: newRefreshToken } = await res.json();
          set({ accessToken, refreshToken: newRefreshToken });
          return accessToken;
        } catch (err) {
          set({ isAuthenticated: false });
          throw err;
        }
      },

      // Check auth on app load
      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${get().accessToken}`,
            },
          });

          if (res.ok) {
            const user = await res.json();
            set({ user, isAuthenticated: true, isLoading: false });
          } else if (res.status === 401) {
            // Try to refresh token
            try {
              await get().refreshAccessToken();
              const meRes = await fetch('/api/auth/me', {
                headers: {
                  Authorization: `Bearer ${get().accessToken}`,
                },
              });
              if (meRes.ok) {
                const user = await meRes.json();
                set({ user, isAuthenticated: true, isLoading: false });
              } else {
                set({ isAuthenticated: false, isLoading: false });
              }
            } catch {
              set({ isAuthenticated: false, isLoading: false });
            }
          }
        } catch (err) {
          set({ isLoading: false });
        }
      },

      // Utility
      setUser: (user: User) => set({ user }),
      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage:
        typeof window !== 'undefined' && 'mmkvStorage' in window
          ? mmkvStorageAdapter
          : localStorage,
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

### 2.2 UI Store

Global UI state: theme, sidebar, modals, toasts, active panel.

```typescript
// lib/stores/ui.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface Modal {
  id: string;
  type: 'delete' | 'settings' | 'export' | 'share' | 'custom';
  isOpen: boolean;
  data?: Record<string, any>;
}

export interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modals
  modals: Map<string, Modal>;
  openModal: (id: string, type: Modal['type'], data?: Record<string, any>) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Active panels
  activePanel: 'editor' | 'media' | 'analytics' | 'ai' | 'publish' | null;
  setActivePanel: (panel: UIState['activePanel']) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    immer((set) => ({
      // Theme
      theme: 'auto',
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }),
      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed;
        }),

      // Modals
      modals: new Map(),
      openModal: (id, type, data) =>
        set((state) => {
          state.modals.set(id, { id, type, isOpen: true, data });
        }),
      closeModal: (id) =>
        set((state) => {
          const modal = state.modals.get(id);
          if (modal) {
            modal.isOpen = false;
          }
        }),
      isModalOpen: (id) => {
        const state = useUIStore.getState();
        return state.modals.get(id)?.isOpen ?? false;
      },

      // Toasts
      toasts: [],
      addToast: (message, type = 'info', duration = 3000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        set((state) => {
          state.toasts.push({ id, message, type, duration });
        });

        if (duration) {
          setTimeout(() => {
            set((state) => {
              state.toasts = state.toasts.filter((t) => t.id !== id);
            });
          }, duration);
        }

        return id;
      },
      removeToast: (id) =>
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        }),
      clearToasts: () =>
        set((state) => {
          state.toasts = [];
        }),

      // Active panels
      activePanel: null,
      setActivePanel: (panel) =>
        set((state) => {
          state.activePanel = panel;
        }),

      // Loading
      isLoading: false,
      setIsLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),
    }))
  )
);

// Selector helpers (prevent unnecessary re-renders)
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useModals = () => useUIStore((state) => state.modals);
export const useActivePanel = () => useUIStore((state) => state.activePanel);
```

### 2.3 Editor Store

Manages content editor state, active project, autosave, undo/redo.

```typescript
// lib/stores/editor.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface EditorContent {
  title: string;
  body: string;
  metadata: {
    tags: string[];
    description?: string;
    featuredImage?: string;
  };
}

export interface EditorState {
  activeProjectId: string | null;
  content: EditorContent;
  isDirty: boolean;
  lastSavedContent: EditorContent | null;
  isSaving: boolean;
  saveError: string | null;

  // Undo/Redo
  history: EditorContent[];
  historyIndex: number;

  // Actions
  setActiveProject: (projectId: string) => void;
  updateContent: (partial: Partial<EditorContent>) => void;
  markSaved: () => void;
  markSaving: () => void;
  setSaveError: (error: string | null) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Reset
  reset: () => void;
}

const defaultContent: EditorContent = {
  title: '',
  body: '',
  metadata: {
    tags: [],
  },
};

export const useEditorStore = create<EditorState>()(
  devtools(
    immer((set, get) => ({
      activeProjectId: null,
      content: defaultContent,
      isDirty: false,
      lastSavedContent: null,
      isSaving: false,
      saveError: null,
      history: [defaultContent],
      historyIndex: 0,

      setActiveProject: (projectId) =>
        set((state) => {
          state.activeProjectId = projectId;
        }),

      updateContent: (partial) =>
        set((state) => {
          const newContent = { ...state.content, ...partial };
          state.content = newContent;
          state.isDirty = true;

          // Add to history
          state.history = state.history.slice(0, state.historyIndex + 1);
          state.history.push(newContent);
          state.historyIndex += 1;
        }),

      markSaved: () =>
        set((state) => {
          state.isDirty = false;
          state.lastSavedContent = state.content;
          state.isSaving = false;
          state.saveError = null;
        }),

      markSaving: () =>
        set((state) => {
          state.isSaving = true;
        }),

      setSaveError: (error) =>
        set((state) => {
          state.saveError = error;
          state.isSaving = false;
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex -= 1;
            state.content = state.history[state.historyIndex];
            state.isDirty = true;
          }
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            state.content = state.history[state.historyIndex];
            state.isDirty = true;
          }
        }),

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      reset: () =>
        set({
          activeProjectId: null,
          content: defaultContent,
          isDirty: false,
          lastSavedContent: null,
          isSaving: false,
          saveError: null,
          history: [defaultContent],
          historyIndex: 0,
        }),
    }))
  )
);

// Selectors
export const useEditorContent = () => useEditorStore((state) => state.content);
export const useEditorIsDirty = () => useEditorStore((state) => state.isDirty);
export const useEditorCanUndo = () => useEditorStore((state) => state.canUndo());
export const useEditorCanRedo = () => useEditorStore((state) => state.canRedo());
```

### 2.4 Media Store

Upload queue, processing status, selection.

```typescript
// lib/stores/media.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface MediaItem {
  id: string;
  filename: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  url?: string;
  thumbnail?: string;
  duration?: number; // for video/audio
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  error?: string;
}

export interface MediaState {
  queue: MediaItem[];
  selected: Set<string>;
  isUploading: boolean;
  error: string | null;

  // Actions
  addToQueue: (items: File[]) => void;
  updateProgress: (id: string, progress: number) => void;
  markComplete: (id: string, url: string, thumbnail?: string) => void;
  markError: (id: string, error: string) => void;
  removeFromQueue: (id: string) => void;

  // Selection
  selectMedia: (id: string) => void;
  deselectMedia: (id: string) => void;
  toggleSelectMedia: (id: string) => void;
  clearSelection: () => void;
  getSelectedCount: () => number;

  // Batch operations
  retryFailed: () => void;
  clearCompleted: () => void;
}

export const useMediaStore = create<MediaState>()(
  devtools(
    immer((set, get) => ({
      queue: [],
      selected: new Set(),
      isUploading: false,
      error: null,

      addToQueue: (files) =>
        set((state) => {
          files.forEach((file) => {
            const id = `media-${Date.now()}-${Math.random()}`;
            const type = file.type.startsWith('image/')
              ? 'image'
              : file.type.startsWith('video/')
                ? 'video'
                : file.type.startsWith('audio/')
                  ? 'audio'
                  : 'document';

            state.queue.push({
              id,
              filename: file.name,
              type,
              size: file.size,
              status: 'pending',
              progress: 0,
            });
          });
        }),

      updateProgress: (id, progress) =>
        set((state) => {
          const item = state.queue.find((m) => m.id === id);
          if (item) {
            item.progress = Math.min(progress, 100);
            if (progress > 0) {
              item.status = 'uploading';
            }
          }
        }),

      markComplete: (id, url, thumbnail) =>
        set((state) => {
          const item = state.queue.find((m) => m.id === id);
          if (item) {
            item.status = 'complete';
            item.progress = 100;
            item.url = url;
            if (thumbnail) item.thumbnail = thumbnail;
          }
        }),

      markError: (id, error) =>
        set((state) => {
          const item = state.queue.find((m) => m.id === id);
          if (item) {
            item.status = 'error';
            item.error = error;
          }
        }),

      removeFromQueue: (id) =>
        set((state) => {
          state.queue = state.queue.filter((m) => m.id !== id);
          state.selected.delete(id);
        }),

      selectMedia: (id) =>
        set((state) => {
          state.selected.add(id);
        }),

      deselectMedia: (id) =>
        set((state) => {
          state.selected.delete(id);
        }),

      toggleSelectMedia: (id) =>
        set((state) => {
          if (state.selected.has(id)) {
            state.selected.delete(id);
          } else {
            state.selected.add(id);
          }
        }),

      clearSelection: () =>
        set((state) => {
          state.selected.clear();
        }),

      getSelectedCount: () => get().selected.size,

      retryFailed: () =>
        set((state) => {
          state.queue.forEach((item) => {
            if (item.status === 'error') {
              item.status = 'pending';
              item.progress = 0;
            }
          });
        }),

      clearCompleted: () =>
        set((state) => {
          state.queue = state.queue.filter((m) => m.status !== 'complete');
        }),
    }))
  )
);

// Selectors
export const useMediaQueue = () => useMediaStore((state) => state.queue);
export const useMediaSelected = () => useMediaStore((state) => state.selected);
export const useMediaIsUploading = () => useMediaStore((state) => state.isUploading);
```

### 2.5 Notification Store

Real-time notifications, unread count, preferences.

```typescript
// lib/stores/notification.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'share' | 'publish' | 'mention' | 'system';
  title: string;
  message: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  data?: {
    projectId?: string;
    contentId?: string;
    url?: string;
  };
  read: boolean;
  createdAt: Date;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Preferences
  updatePreferences: (prefs: Partial<NotificationState['preferences']>) => void;

  // Bulk operations
  addBatch: (notifications: Omit<Notification, 'id' | 'read' | 'createdAt'>[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    immer((set) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      preferences: {
        enabled: true,
        sound: true,
        desktop: false,
      },

      addNotification: (notification) =>
        set((state) => {
          const id = `notif-${Date.now()}-${Math.random()}`;
          state.notifications.unshift({
            ...notification,
            id,
            read: false,
            createdAt: new Date(),
          });
          state.unreadCount += 1;

          // Keep only last 50 notifications
          if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
          }
        }),

      markAsRead: (id) =>
        set((state) => {
          const notif = state.notifications.find((n) => n.id === id);
          if (notif && !notif.read) {
            notif.read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }),

      markAllAsRead: () =>
        set((state) => {
          state.notifications.forEach((n) => {
            n.read = true;
          });
          state.unreadCount = 0;
        }),

      removeNotification: (id) =>
        set((state) => {
          const notif = state.notifications.find((n) => n.id === id);
          if (notif && !notif.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications = state.notifications.filter((n) => n.id !== id);
        }),

      clearAllNotifications: () =>
        set((state) => {
          state.notifications = [];
          state.unreadCount = 0;
        }),

      updatePreferences: (prefs) =>
        set((state) => {
          state.preferences = { ...state.preferences, ...prefs };
        }),

      addBatch: (notifications) =>
        set((state) => {
          notifications.forEach((notif) => {
            const id = `notif-${Date.now()}-${Math.random()}`;
            state.notifications.unshift({
              ...notif,
              id,
              read: false,
              createdAt: new Date(),
            });
            state.unreadCount += 1;
          });

          if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
          }
        }),
    }))
  )
);

// Selectors
export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const useNotificationPreferences = () =>
  useNotificationStore((state) => state.preferences);
```

---

## 3. Zustand Middleware Configuration

### 3.1 Persist Middleware with MMKV

```typescript
// lib/zustand/persist-storage.ts
import { StateStorage } from 'zustand/middleware';

/**
 * Browser localStorage adapter
 */
const localStorageAdapter: StateStorage = {
  getItem: (name) => localStorage.getItem(name) || null,
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

/**
 * MMKV adapter for React Native
 */
let mmkvInstance: any = null;

const getMmkvInstance = () => {
  if (!mmkvInstance) {
    try {
      const { MMKV } = require('react-native-mmkv');
      mmkvInstance = new MMKV();
    } catch {
      console.warn('MMKV not available, falling back to localStorage');
      return null;
    }
  }
  return mmkvInstance;
};

const mmkvStorageAdapter: StateStorage = {
  getItem: (name) => {
    const mmkv = getMmkvInstance();
    if (!mmkv) return null;
    return mmkv.getString(name) ?? null;
  },
  setItem: (name, value) => {
    const mmkv = getMmkvInstance();
    if (!mmkv) return;
    mmkv.setString(name, value);
  },
  removeItem: (name) => {
    const mmkv = getMmkvInstance();
    if (!mmkv) return;
    mmkv.delete(name);
  },
};

/**
 * Unified adapter that uses MMKV on mobile, localStorage on web
 */
export const getStorageAdapter = (): StateStorage => {
  const mmkv = getMmkvInstance();
  return mmkv ? mmkvStorageAdapter : localStorageAdapter;
};

// Export for use in store definitions
export const persistStorage = getStorageAdapter();
```

### 3.2 Devtools Middleware

```typescript
// lib/zustand/devtools-config.ts
import { devtools as zustandDevtools } from 'zustand/middleware';

/**
 * Devtools wrapper with custom trace limits and naming
 */
export const devtools = (name: string) =>
  zustandDevtools((fn) => (set, get, api) => fn(set, get, api), {
    name,
    enabled: process.env.NODE_ENV === 'development',
    trace: true,
    traceLimit: 25,
    anonymousActionType: 'action',
  });

// Usage in stores:
// export const useMyStore = create<MyState>()(
//   devtools((set) => ({ /* ... */ }), 'MyStore')
// )
```

### 3.3 Immer Middleware for Immutable Updates

```typescript
// lib/zustand/immer-example.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface DraftState {
  nested: {
    count: number;
    tags: string[];
  };
}

/**
 * With immer, you can write "mutative" code that's actually immutable
 */
export const useDraftStore = create<DraftState>()(
  immer((set) => ({
    nested: { count: 0, tags: [] },

    // Immer converts these mutations into immutable updates
    incrementCount: () =>
      set((state) => {
        state.nested.count += 1;
      }),

    addTag: (tag: string) =>
      set((state) => {
        state.nested.tags.push(tag);
      }),

    removeTag: (tag: string) =>
      set((state) => {
        state.nested.tags = state.nested.tags.filter((t) => t !== tag);
      }),

    updateNested: (updates: Partial<DraftState['nested']>) =>
      set((state) => {
        Object.assign(state.nested, updates);
      }),
  }))
);
```

---

## 4. React Query Configuration

### 4.1 QueryClient Setup

```typescript
// lib/react-query/query-client.ts
import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    // Retry logic: retry failed requests with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry on 401, 403, 404
      if (
        error?.response?.status === 401 ||
        error?.response?.status === 403 ||
        error?.response?.status === 404
      ) {
        return false;
      }
      // Retry up to 3 times with exponential backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Stale times per resource type
    staleTime: 1000 * 60 * 5, // 5 minutes default
    gcTime: 1000 * 60 * 10, // 10 minutes cache duration
    refetchOnWindowFocus: 'stale',
    refetchOnReconnect: 'stale',

    // Error handling
    throwOnError: false,
  },
  mutations: {
    retry: 1,
    throwOnError: true,
  },
};

export const queryClient = new QueryClient({ defaultOptions: queryConfig });

/**
 * Override stale times for specific resource types
 */
export const staleTimeConfig = {
  projects: 1000 * 60 * 5, // 5 minutes
  media: 1000 * 60 * 2, // 2 minutes (changes frequently)
  analytics: 1000 * 30, // 30 seconds (real-time)
  user: 1000 * 60 * 30, // 30 minutes
  notifications: 0, // Always fresh
} as const;
```

### 4.2 Custom Axios Instance with Auth

```typescript
// lib/react-query/axios.ts
import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
});

// Add token to all requests
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and refresh token
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await useAuthStore.getState().refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

---

## 5. React Query Hook Factories

### 5.1 Projects CRUD

```typescript
// lib/react-query/hooks/useProjects.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../axios';
import { staleTimeConfig } from '../query-client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

/**
 * Fetch all projects with pagination & filters
 */
export const useProjects = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: projectKeys.list(filters || {}),
    queryFn: async () => {
      const { data } = await axiosInstance.get<Project[]>('/projects', {
        params: filters,
      });
      return data;
    },
    staleTime: staleTimeConfig.projects,
  });
};

/**
 * Fetch single project
 */
export const useProject = (id: string | null) => {
  return useQuery({
    queryKey: projectKeys.detail(id || ''),
    queryFn: async () => {
      const { data } = await axiosInstance.get<Project>(`/projects/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: staleTimeConfig.projects,
  });
};

/**
 * Create new project
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data } = await axiosInstance.post<Project>('/projects', projectData);
      return data;
    },
    onSuccess: (newProject) => {
      // Update projects list
      queryClient.setQueryData(projectKeys.lists(), (old: Project[] = []) => [
        newProject,
        ...old,
      ]);
      // Set new project detail
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject);
    },
  });
};

/**
 * Update project
 */
export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Project>) => {
      const { data } = await axiosInstance.put<Project>(`/projects/${id}`, updates);
      return data;
    },
    onSuccess: (updated) => {
      // Update detail
      queryClient.setQueryData(projectKeys.detail(id), updated);
      // Invalidate list to refetch with new data
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

/**
 * Delete project
 */
export const useDeleteProject = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};
```

### 5.2 Media Uploads with Progress

```typescript
// lib/react-query/hooks/useMediaUpload.ts
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '../axios';
import { useMediaStore } from '@/stores/mediaStore';

export interface UploadResponse {
  id: string;
  url: string;
  thumbnail?: string;
  duration?: number;
}

/**
 * Upload media with progress tracking
 */
export const useMediaUpload = () => {
  const updateProgress = useMediaStore((state) => state.updateProgress);
  const markComplete = useMediaStore((state) => state.markComplete);
  const markError = useMediaStore((state) => state.markError);

  return useMutation({
    mutationFn: async ({
      file,
      mediaId,
    }: {
      file: File;
      mediaId: string;
    }): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await axiosInstance.post<UploadResponse>('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / (progressEvent.total || 1)) * 100;
          updateProgress(mediaId, progress);
        },
      });

      return data;
    },
    onSuccess: (response, { mediaId }) => {
      markComplete(mediaId, response.url, response.thumbnail);
    },
    onError: (error: any, { mediaId }) => {
      const message = error?.response?.data?.message || 'Upload failed';
      markError(mediaId, message);
    },
  });
};

/**
 * Batch upload multiple files
 */
export const useMediaBatchUpload = () => {
  const uploadMutation = useMediaUpload();

  return useMutation({
    mutationFn: async (
      files: {
        file: File;
        mediaId: string;
      }[]
    ) => {
      return Promise.allSettled(
        files.map((f) =>
          uploadMutation.mutateAsync(f).catch((err) => {
            throw err;
          })
        )
      );
    },
  });
};
```

### 5.3 Analytics Data with Polling

```typescript
// lib/react-query/hooks/useAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../axios';
import { staleTimeConfig } from '../query-client';

export interface Analytics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  avgEngagementTime: number;
  traffic: {
    date: string;
    count: number;
  }[];
}

const analyticsKeys = {
  all: ['analytics'] as const,
  project: (id: string) => [...analyticsKeys.all, 'project', id] as const,
  range: (id: string, range: string) => [...analyticsKeys.project(id), 'range', range] as const,
};

/**
 * Fetch analytics with real-time polling
 */
export const useProjectAnalytics = (
  projectId: string,
  range: 'day' | 'week' | 'month' = 'day'
) => {
  return useQuery({
    queryKey: analyticsKeys.range(projectId, range),
    queryFn: async () => {
      const { data } = await axiosInstance.get<Analytics>(
        `/projects/${projectId}/analytics`,
        {
          params: { range },
        }
      );
      return data;
    },
    staleTime: staleTimeConfig.analytics,
    refetchInterval: 10000, // Poll every 10 seconds for real-time updates
  });
};
```

### 5.4 AI Operations with Streaming

```typescript
// lib/react-query/hooks/useAIOperation.ts
import { useMutation } from '@tanstack/react-query';
import axiosInstance from '../axios';

export interface AIRequest {
  type: 'generate' | 'improve' | 'summarize' | 'translate';
  content: string;
  options?: Record<string, any>;
}

/**
 * Stream-based AI operation (e.g., content generation)
 */
export const useAIOperation = () => {
  return useMutation({
    mutationFn: async (request: AIRequest): Promise<string> => {
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(
          `/api/ai/stream?${new URLSearchParams({
            type: request.type,
            content: request.content,
          }).toString()}`
        );

        let result = '';

        eventSource.addEventListener('data', (event) => {
          result += event.data;
        });

        eventSource.addEventListener('error', (error) => {
          eventSource.close();
          reject(error);
        });

        eventSource.addEventListener('done', () => {
          eventSource.close();
          resolve(result);
        });
      });
    },
  });
};

/**
 * Alternative: Polling-based AI operation for slower endpoints
 */
export const useAIOperationPolling = () => {
  return useMutation({
    mutationFn: async (request: AIRequest): Promise<string> => {
      const { data: job } = await axiosInstance.post('/ai/operations', request);

      // Poll for completion
      let maxAttempts = 60; // 5 minutes with 5-second intervals
      while (maxAttempts > 0) {
        const { data: status } = await axiosInstance.get(
          `/ai/operations/${job.id}`
        );

        if (status.completed) {
          return status.result;
        }

        if (status.error) {
          throw new Error(status.error);
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
        maxAttempts -= 1;
      }

      throw new Error('AI operation timed out');
    },
  });
};
```

### 5.5 Content Publishing

```typescript
// lib/react-query/hooks/usePublish.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../axios';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';

export interface PublishPayload {
  projectId: string;
  platforms: ('web' | 'social' | 'email')[];
  schedule?: Date;
  customMessage?: string;
}

export interface PublishResult {
  id: string;
  status: 'scheduled' | 'publishing' | 'published';
  urls?: Record<string, string>;
}

/**
 * Publish content to multiple platforms
 */
export const usePublishContent = () => {
  const queryClient = useQueryClient();
  const markSaving = useEditorStore((state) => state.markSaving);
  const markSaved = useEditorStore((state) => state.markSaved);
  const setSaveError = useEditorStore((state) => state.setSaveError);
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (payload: PublishPayload): Promise<PublishResult> => {
      markSaving();
      const { data } = await axiosInstance.post<PublishResult>(
        `/projects/${payload.projectId}/publish`,
        payload
      );
      return data;
    },
    onSuccess: (result, payload) => {
      markSaved();
      addToast('Content published successfully!', 'success');
      // Invalidate projects list to reflect new status
      queryClient.invalidateQueries({
        queryKey: ['projects', 'list'],
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Publish failed';
      setSaveError(message);
      addToast(message, 'error');
    },
  });
};
```

---

## 6. Optimistic Updates

### 6.1 Likes & Bookmarks

```typescript
// lib/react-query/optimistic-updates.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from './axios';

interface Content {
  id: string;
  likes: number;
  isLiked: boolean;
  bookmarks: number;
  isBookmarked: boolean;
}

/**
 * Toggle like with optimistic update
 */
export const useLikeContent = (contentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(`/content/${contentId}/like`);
      return data;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['content', contentId] });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<Content>(['content', contentId]);

      // Optimistically update to the new value
      if (previous) {
        queryClient.setQueryData<Content>(['content', contentId], {
          ...previous,
          isLiked: !previous.isLiked,
          likes: previous.isLiked ? previous.likes - 1 : previous.likes + 1,
        });
      }

      return { previous };
    },
    onError: (err, variables, context: any) => {
      // Revert on error
      if (context?.previous) {
        queryClient.setQueryData(['content', contentId], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['content', contentId],
      });
    },
  });
};

/**
 * Toggle bookmark with optimistic update
 */
export const useBookmarkContent = (contentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(`/content/${contentId}/bookmark`);
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['content', contentId] });

      const previous = queryClient.getQueryData<Content>(['content', contentId]);

      if (previous) {
        queryClient.setQueryData<Content>(['content', contentId], {
          ...previous,
          isBookmarked: !previous.isBookmarked,
          bookmarks: previous.isBookmarked
            ? previous.bookmarks - 1
            : previous.bookmarks + 1,
        });
      }

      return { previous };
    },
    onError: (err, variables, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['content', contentId], context.previous);
      }
    },
  });
};
```

### 6.2 Reordering Items

```typescript
// lib/react-query/reordering.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from './axios';

interface Item {
  id: string;
  order: number;
}

/**
 * Reorder items in list (e.g., project layout, media gallery)
 */
export const useReorderItems = (listKey: string[]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; order: number }[]) => {
      const { data } = await axiosInstance.post('/items/reorder', { items });
      return data;
    },
    onMutate: async (newItems) => {
      await queryClient.cancelQueries({ queryKey: listKey });

      const previous = queryClient.getQueryData<Item[]>(listKey);

      // Optimistically update with new order
      queryClient.setQueryData<Item[]>(listKey, (old = []) => {
        return old.map((item) => {
          const newOrder = newItems.find((ni) => ni.id === item.id);
          return newOrder ? { ...item, order: newOrder.order } : item;
        });
      });

      return { previous };
    },
    onError: (err, variables, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
};
```

### 6.3 Status Changes

```typescript
// lib/react-query/status-updates.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from './axios';

interface Project {
  id: string;
  status: 'draft' | 'published' | 'archived';
}

/**
 * Change project status with optimistic update
 */
export const useChangeProjectStatus = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStatus: Project['status']) => {
      const { data } = await axiosInstance.patch(`/projects/${projectId}`, {
        status: newStatus,
      });
      return data;
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({
        queryKey: ['projects', 'detail', projectId],
      });

      const previous = queryClient.getQueryData<Project>([
        'projects',
        'detail',
        projectId,
      ]);

      if (previous) {
        queryClient.setQueryData<Project>(
          ['projects', 'detail', projectId],
          { ...previous, status: newStatus }
        );
      }

      return { previous };
    },
    onError: (err, variables, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['projects', 'detail', projectId],
          context.previous
        );
      }
    },
  });
};
```

---

## 7. React Query + Zustand Integration

### 7.1 Syncing Server State to Client State

```typescript
// lib/react-query/sync-with-zustand.ts
import { useEffect } from 'react';
import { useProject } from './hooks/useProjects';
import { useEditorStore } from '@/stores/editorStore';
import { Project } from './hooks/useProjects';

/**
 * Hook that syncs React Query data to Zustand store
 * Use in root layout or provider
 */
export const useSyncProjectToEditor = (projectId: string | null) => {
  const { data: project, isLoading, error } = useProject(projectId);
  const setActiveProject = useEditorStore((state) => state.setActiveProject);
  const updateContent = useEditorStore((state) => state.updateContent);

  useEffect(() => {
    if (project) {
      setActiveProject(project.id);
      // Load project data into editor
      updateContent({
        title: project.name,
        body: '', // Load from server or draft
      });
    }
  }, [project, setActiveProject, updateContent]);

  return { isLoading, error };
};

/**
 * Hook that syncs analytics data to notifications
 */
export const useSyncAnalyticsToNotifications = (projectId: string) => {
  const { data: analytics } = useProjectAnalytics(projectId);
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (analytics && analytics.comments > 0) {
      addNotification({
        type: 'comment',
        title: 'New Comments',
        message: `You have ${analytics.comments} new comments`,
        data: { projectId },
      });
    }
  }, [analytics?.comments, projectId, addNotification]);
};
```

### 7.2 Using Zustand Store in Query Functions

```typescript
// lib/react-query/context-aware-queries.ts
import { useQuery } from '@tanstack/react-query';
import axiosInstance from './axios';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

/**
 * Query that uses auth context automatically
 */
export const usePersonalizedProjects = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const setIsLoading = useUIStore((state) => state.setIsLoading);

  return useQuery({
    queryKey: ['projects', 'personal', userId],
    queryFn: async () => {
      setIsLoading(true);
      try {
        const { data } = await axiosInstance.get('/projects/me');
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!userId,
  });
};
```

---

## 8. URL State Management with nuqs

### 8.1 Setup and Configuration

```typescript
// lib/url-state/search-params.ts
import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsBoolean,
} from 'nuqs';

/**
 * Define all URL searchParams for the app
 */
export const searchParamsCache = createSearchParamsCache({
  // Projects list filters
  projectSearch: parseAsString.withDefault(''),
  projectStatus: parseAsString.withDefault(''),
  projectPage: parseAsInteger.withDefault(1),
  projectSort: parseAsString.withDefault('updated'),

  // Media library filters
  mediaType: parseAsString.withDefault(''),
  mediaTags: parseAsArrayOf(parseAsString).withDefault([]),
  mediaPage: parseAsInteger.withDefault(1),

  // Analytics filters
  analyticsRange: parseAsString.withDefault('week'),
  analyticsTab: parseAsString.withDefault('overview'),

  // Editor state
  editorTab: parseAsString.withDefault('content'),
  editorMode: parseAsString.withDefault('edit'),

  // Navigation
  activePanel: parseAsString.withDefault('editor'),
  sidebarOpen: parseAsBoolean.withDefault(true),
});
```

### 8.2 Search/Filter Hook

```typescript
// lib/url-state/useFilters.ts
import { useQueryState } from 'nuqs';
import { parseAsString, parseAsInteger, parseAsArrayOf } from 'nuqs';

/**
 * Hook for managing search filters in URL
 */
export const useProjectFilters = () => {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''));
  const [status, setStatus] = useQueryState(
    'status',
    parseAsString.withDefault('all')
  );
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('updated'));

  return {
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    sort,
    setSort,
    // Helper to clear all filters
    reset: () => {
      setSearch('');
      setStatus('all');
      setPage(1);
      setSort('updated');
    },
  };
};

/**
 * Hook for pagination
 */
export const usePagination = (queryKey: string = 'page') => {
  const [page, setPage] = useQueryState(queryKey, parseAsInteger.withDefault(1));

  return {
    page,
    setPage,
    goToPage: (newPage: number) => setPage(newPage),
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(1, p - 1)),
  };
};

/**
 * Hook for tabs
 */
export const useActiveTab = (queryKey: string = 'tab', defaultValue: string = 'overview') => {
  const [tab, setTab] = useQueryState(queryKey, parseAsString.withDefault(defaultValue));

  return { tab, setTab };
};
```

### 8.3 URL State in Components

```typescript
// components/ProjectsFilter.tsx
'use client';

import { useProjectFilters } from '@/lib/url-state/useFilters';
import { useProjects } from '@/lib/react-query/hooks/useProjects';

export function ProjectsFilter() {
  const { search, setSearch, status, setStatus, page, sort } = useProjectFilters();

  // Use URL state in query
  const { data: projects, isLoading } = useProjects({
    page,
    status: status !== 'all' ? status : undefined,
    search: search || undefined,
  });

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects..."
      />

      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">All Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>

      <select value={sort} onChange={(e) => useProjectFilters().setSort(e.target.value)}>
        <option value="updated">Recently Updated</option>
        <option value="created">Recently Created</option>
        <option value="name">Name</option>
      </select>

      {/* Projects list */}
    </div>
  );
}
```

---

## 9. Cross-Platform State Sharing

### 9.1 Shared State Types

```typescript
// packages/shared/types/state.ts
/**
 * Types shared between web and mobile
 */

export interface SharedAuthState {
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  isAuthenticated: boolean;
}

export interface SharedEditorState {
  activeProjectId: string | null;
  content: {
    title: string;
    body: string;
  };
  isDirty: boolean;
}

export interface SharedUIState {
  theme: 'light' | 'dark';
  activePanel: string | null;
}

// Re-export for both platforms
export * from './state';
```

### 9.2 Platform-Specific Storage

```typescript
// lib/stores/config.ts
import { StateCreator } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';

/**
 * Platform-detection for correct storage backend
 */
const isReactNative = () => {
  try {
    return typeof navigator !== 'undefined' && !!navigator.product === 'ReactNative';
  } catch {
    return false;
  }
};

/**
 * Get appropriate persistence options per platform
 */
export const getPersistConfig = (
  name: string
): PersistOptions<any> => {
  if (isReactNative()) {
    const { MMKV } = require('react-native-mmkv');
    const mmkv = new MMKV();

    return {
      name,
      storage: {
        getItem: (key) => mmkv.getString(key) ?? null,
        setItem: (key, value) => mmkv.setString(key, value),
        removeItem: (key) => mmkv.delete(key),
      },
    };
  }

  // Web
  return {
    name,
    storage: localStorage,
  };
};
```

### 9.3 Shared Store Hook

```typescript
// packages/shared/hooks/useSharedState.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPersistConfig } from './config';

/**
 * Create a shared store for both web and mobile
 */
export const createSharedStore = <T extends Record<string, any>>(
  name: string,
  initialState: T,
  actions: (set: any, get: any) => Record<string, any>
) => {
  return create<T & typeof actions>()(
    persist(
      (set, get) => ({
        ...initialState,
        ...actions(set, get),
      }),
      getPersistConfig(name)
    )
  );
};

// Usage in both web and mobile:
export const useSharedAuthState = createSharedStore(
  'shared-auth',
  { user: null, isAuthenticated: false },
  (set, get) => ({
    setUser: (user) => set({ user }),
    logout: () => set({ user: null, isAuthenticated: false }),
  })
);
```

---

## 10. State Hydration & SSR

### 10.1 Server Component Boundaries

```typescript
// app/layout.tsx
import { ReactNode } from 'react';
import { HydrationProvider } from '@/lib/hydration/HydrationProvider';
import { ClientRoot } from '@/components/ClientRoot';

/**
 * Server component - no state, no hydration issues
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        {/* Wrap client components with hydration provider */}
        <HydrationProvider>
          <ClientRoot>{children}</ClientRoot>
        </HydrationProvider>
      </body>
    </html>
  );
}
```

### 10.2 Hydration Provider

```typescript
// lib/hydration/HydrationProvider.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query/query-client';
import { useAuthStore } from '@/stores/authStore';

interface HydrationProviderProps {
  children: ReactNode;
}

/**
 * Client-side hydration boundary
 * Prevents hydration mismatches by ensuring state is initialized before render
 */
export function HydrationProvider({ children }: HydrationProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    // Initialize auth state from persisted storage
    checkAuth().finally(() => {
      setIsHydrated(true);
    });
  }, [checkAuth]);

  // Prevent hydration mismatch by not rendering until hydrated
  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 10.3 Server-to-Client Data Passing

```typescript
// app/dashboard/page.tsx
import { queryClient } from '@/lib/react-query/query-client';
import { Dashboard } from '@/components/Dashboard';

/**
 * Server component that pre-fetches data
 */
export default async function DashboardPage() {
  try {
    // Pre-fetch on server
    const projects = await queryClient.fetchQuery({
      queryKey: ['projects'],
      queryFn: async () => {
        const res = await fetch(`${process.env.API_URL}/projects`);
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      },
    });

    // Hydrate the client cache with server data
    const initialData = queryClient.getQueryData(['projects']);

    return <Dashboard initialProjects={initialData} />;
  } catch (error) {
    return <div>Error loading dashboard</div>;
  }
}

// components/Dashboard.tsx
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProjects } from '@/lib/react-query/hooks/useProjects';

interface DashboardProps {
  initialProjects?: any[];
}

export function Dashboard({ initialProjects }: DashboardProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set initial data from server
    if (initialProjects) {
      queryClient.setQueryData(['projects'], initialProjects);
    }
  }, [initialProjects, queryClient]);

  const { data: projects } = useProjects();

  return (
    <div>
      {projects?.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

---

## 11. Real-time State Updates with WebSocket

### 11.1 WebSocket Service

```typescript
// lib/websocket/WebSocketService.ts
import { queryClient } from '@/lib/react-query/query-client';
import { useNotificationStore } from '@/stores/notificationStore';

export type WebSocketMessage =
  | { type: 'notification'; data: any }
  | { type: 'analytics-update'; projectId: string; data: any }
  | { type: 'media-complete'; mediaId: string; data: any }
  | { type: 'project-updated'; projectId: string; data: any };

/**
 * Singleton WebSocket service
 */
class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.url = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws`;
  }

  /**
   * Connect to WebSocket with auth token
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.addEventListener('open', () => {
          // Send auth
          this.send({ type: 'auth', token });
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.addEventListener('message', (event) => {
          this.handleMessage(JSON.parse(event.data));
        });

        this.ws.addEventListener('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });

        this.ws.addEventListener('close', () => {
          this.attemptReconnect(token);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages and update state
   */
  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'notification':
        useNotificationStore.getState().addNotification(message.data);
        break;

      case 'analytics-update':
        queryClient.setQueryData(
          ['analytics', 'project', message.projectId],
          message.data
        );
        break;

      case 'media-complete':
        queryClient.setQueryData(['media', message.mediaId], message.data);
        break;

      case 'project-updated':
        queryClient.invalidateQueries({
          queryKey: ['projects', 'detail', message.projectId],
        });
        break;
    }
  }

  /**
   * Send message to server
   */
  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Reconnect logic
   */
  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts += 1;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => {
        this.connect(token);
      }, delay);
    }
  }

  disconnect() {
    this.ws?.close();
  }
}

export const wsManager = new WebSocketManager();
```

### 11.2 WebSocket Hook

```typescript
// lib/websocket/useWebSocket.ts
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { wsManager } from './WebSocketService';

/**
 * Hook that initializes WebSocket connection on app mount
 */
export const useWebSocket = () => {
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!token) return;

    wsManager.connect(token).catch(console.error);

    return () => {
      wsManager.disconnect();
    };
  }, [token]);
};

/**
 * Hook to send WebSocket messages
 */
export const useSendWebSocketMessage = () => {
  return (message: any) => {
    wsManager.send(message);
  };
};
```

---

## 12. Performance Patterns

### 12.1 Selective Subscriptions

```typescript
// lib/stores/performance.ts
import { useShallow } from 'zustand/react';

/**
 * Bad: Re-renders on any state change
 */
function BadComponent() {
  const uiStore = useUIStore();
  return <div>{uiStore.theme}</div>;
}

/**
 * Good: Re-renders only when theme changes
 */
function GoodComponent() {
  const theme = useUIStore((state) => state.theme);
  return <div>{theme}</div>;
}

/**
 * Good: Subscribe to multiple fields without re-render on other changes
 */
function MultiFieldComponent() {
  const { theme, sidebarCollapsed } = useUIStore(
    useShallow((state) => ({
      theme: state.theme,
      sidebarCollapsed: state.sidebarCollapsed,
    }))
  );
  return (
    <div>
      {theme} - {sidebarCollapsed}
    </div>
  );
}
```

### 12.2 Computed Selectors

```typescript
// lib/stores/selectors.ts
import { useEditorStore } from './editor';
import { useMediaStore } from './media';

/**
 * Computed selector: derive state without creating new object every render
 */
export const useEditorStats = () => {
  return useEditorStore((state) => ({
    wordCount: state.content.body.split(/\s+/).length,
    hasChanges: state.isDirty,
    canSave: state.isDirty && !state.isSaving,
  }));
};

/**
 * Cross-store selector
 */
export const useAppStatus = () => {
  const editorIsSaving = useEditorStore((state) => state.isSaving);
  const mediaIsUploading = useMediaStore((state) => state.isUploading);

  return {
    isWorking: editorIsSaving || mediaIsUploading,
  };
};
```

### 12.3 Shallow Comparison for Collections

```typescript
// lib/react-query/shallow-compare.ts
import { useMemo } from 'react';
import { useShallow } from 'zustand/react';

/**
 * Use with React Query lists to prevent unnecessary re-renders
 */
export const useProjectsList = (filters: Record<string, any>) => {
  const { data: projects = [], isLoading } = useProjects(filters);

  // Memoize the list reference so it only changes when actual data changes
  const memoizedProjects = useMemo(() => projects, [projects]);

  return { projects: memoizedProjects, isLoading };
};

/**
 * Zustand shallow comparison for list items
 */
function ProjectCard({ projectId }: { projectId: string }) {
  const project = useProjectDetail(projectId);
  const { name, status } = project
    ? useShallow((p) => ({ name: p.name, status: p.status }))
    : {};

  return <div>{name}</div>;
}
```

### 12.4 Query Key Factory Pattern

```typescript
// lib/react-query/query-keys.ts
/**
 * Centralized query key factory to prevent typos and enable bulk invalidation
 */
export const queryKeys = {
  all: ['app'] as const,

  projects: {
    all: [...queryKeys.all, 'projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  media: {
    all: [...queryKeys.all, 'media'] as const,
    lists: () => [...queryKeys.media.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.media.lists(), filters] as const,
    queue: () => [...queryKeys.media.all, 'queue'] as const,
  },

  analytics: {
    all: [...queryKeys.all, 'analytics'] as const,
    projects: () => [...queryKeys.analytics.all, 'project'] as const,
    project: (id: string) => [...queryKeys.analytics.projects(), id] as const,
    range: (id: string, range: string) =>
      [...queryKeys.analytics.project(id), range] as const,
  },
};

/**
 * Bulk invalidation by scope
 */
export const invalidateByScope = (scope: 'projects' | 'media' | 'analytics') => {
  queryClient.invalidateQueries({ queryKey: queryKeys[scope].all });
};
```

---

## Best Practices Summary

1. **Use URL state** for filters, pagination, and navigation — survives page refresh
2. **Use React Query** for server state and caching — handles fetching, caching, synchronization
3. **Use Zustand** for global UI state — lightweight, fast, excellent DX
4. **Use React Hook Form** for form state — minimal re-renders, excellent validation
5. **Zustand + React Query together**: React Query handles data fetching, Zustand handles UI state
6. **Avoid prop drilling** by using stores/queries directly in components
7. **Optimize selectors** with useShallow and computed properties
8. **Invalidate strategically** — don't invalidate too much, causes unnecessary refetches
9. **Use optimistic updates** for responsive UI — always have a rollback plan
10. **Keep stores minimal** — only global state that multiple unrelated components need

---

## Related Files

- `/lib/stores/` — All Zustand store definitions
- `/lib/react-query/` — Query client, hooks, and configuration
- `/lib/url-state/` — nuqs configuration and hooks
- `/lib/websocket/` — WebSocket service and hooks
- `/lib/hydration/` — SSR and hydration configuration
- `components/` — Consumer components using all patterns above

