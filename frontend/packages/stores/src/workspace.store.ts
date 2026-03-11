import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@ordo/types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
}

interface WorkspaceActions {
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      workspaces: [],
      activeWorkspace: null,
      isLoading: false,

      setWorkspaces: (workspaces) => set({ workspaces }),

      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

      addWorkspace: (workspace) =>
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        })),

      removeWorkspace: (id) =>
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          activeWorkspace:
            state.activeWorkspace?.id === id ? null : state.activeWorkspace,
        })),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'ordo-workspace',
      // Only persist the active workspace ID, not the full list
      partialize: (state) => ({
        activeWorkspace: state.activeWorkspace
          ? { id: state.activeWorkspace.id }
          : null,
      }),
    },
  ),
);
