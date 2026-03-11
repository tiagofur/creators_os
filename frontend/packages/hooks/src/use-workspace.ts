'use client';

import { useWorkspaceStore } from '@ordo/stores';

export function useWorkspace() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);

  return {
    workspaces,
    activeWorkspace,
    isLoading,
    setWorkspaces,
    setActiveWorkspace,
    addWorkspace,
    removeWorkspace,
  };
}
