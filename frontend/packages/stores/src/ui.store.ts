import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type ViewMode = 'grid' | 'list';

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  ideasViewMode: ViewMode;
  pipelineViewMode: 'board' | 'list';
}

interface UiActions {
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setIdeasViewMode: (mode: ViewMode) => void;
  setPipelineViewMode: (mode: 'board' | 'list') => void;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      ideasViewMode: 'grid',
      pipelineViewMode: 'board',

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      openCommandPalette: () => set({ commandPaletteOpen: true }),

      closeCommandPalette: () => set({ commandPaletteOpen: false }),

      setIdeasViewMode: (ideasViewMode) => set({ ideasViewMode }),

      setPipelineViewMode: (pipelineViewMode) => set({ pipelineViewMode }),
    }),
    {
      name: 'ordo-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        ideasViewMode: state.ideasViewMode,
        pipelineViewMode: state.pipelineViewMode,
      }),
    },
  ),
);
