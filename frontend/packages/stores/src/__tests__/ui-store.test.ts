import { useUiStore } from '../ui.store';

function getState() {
  return useUiStore.getState();
}

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({
      theme: 'system',
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      ideasViewMode: 'grid',
      pipelineViewMode: 'board',
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = getState();
      expect(state.theme).toBe('system');
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.commandPaletteOpen).toBe(false);
      expect(state.ideasViewMode).toBe('grid');
      expect(state.pipelineViewMode).toBe('board');
    });
  });

  describe('setTheme', () => {
    it('sets theme to light', () => {
      getState().setTheme('light');
      expect(getState().theme).toBe('light');
    });

    it('sets theme to dark', () => {
      getState().setTheme('dark');
      expect(getState().theme).toBe('dark');
    });

    it('sets theme to system', () => {
      getState().setTheme('dark');
      getState().setTheme('system');
      expect(getState().theme).toBe('system');
    });
  });

  describe('sidebar', () => {
    it('toggleSidebar flips sidebarCollapsed', () => {
      expect(getState().sidebarCollapsed).toBe(false);

      getState().toggleSidebar();
      expect(getState().sidebarCollapsed).toBe(true);

      getState().toggleSidebar();
      expect(getState().sidebarCollapsed).toBe(false);
    });

    it('setSidebarCollapsed sets the value directly', () => {
      getState().setSidebarCollapsed(true);
      expect(getState().sidebarCollapsed).toBe(true);

      getState().setSidebarCollapsed(false);
      expect(getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('command palette', () => {
    it('openCommandPalette sets commandPaletteOpen to true', () => {
      getState().openCommandPalette();
      expect(getState().commandPaletteOpen).toBe(true);
    });

    it('closeCommandPalette sets commandPaletteOpen to false', () => {
      getState().openCommandPalette();
      getState().closeCommandPalette();
      expect(getState().commandPaletteOpen).toBe(false);
    });

    it('opening when already open is idempotent', () => {
      getState().openCommandPalette();
      getState().openCommandPalette();
      expect(getState().commandPaletteOpen).toBe(true);
    });
  });

  describe('view modes', () => {
    it('setIdeasViewMode switches to list', () => {
      getState().setIdeasViewMode('list');
      expect(getState().ideasViewMode).toBe('list');
    });

    it('setIdeasViewMode switches to grid', () => {
      getState().setIdeasViewMode('list');
      getState().setIdeasViewMode('grid');
      expect(getState().ideasViewMode).toBe('grid');
    });

    it('setPipelineViewMode switches to list', () => {
      getState().setPipelineViewMode('list');
      expect(getState().pipelineViewMode).toBe('list');
    });

    it('setPipelineViewMode switches to board', () => {
      getState().setPipelineViewMode('list');
      getState().setPipelineViewMode('board');
      expect(getState().pipelineViewMode).toBe('board');
    });
  });

  describe('persistence', () => {
    it('persists theme, sidebarCollapsed, ideasViewMode, pipelineViewMode', () => {
      getState().setTheme('dark');
      getState().setSidebarCollapsed(true);
      getState().setIdeasViewMode('list');
      getState().setPipelineViewMode('list');

      const stored = localStorage.getItem('ordo-ui');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.theme).toBe('dark');
      expect(parsed.state.sidebarCollapsed).toBe(true);
      expect(parsed.state.ideasViewMode).toBe('list');
      expect(parsed.state.pipelineViewMode).toBe('list');
    });

    it('does not persist commandPaletteOpen', () => {
      getState().openCommandPalette();

      const stored = localStorage.getItem('ordo-ui');
      const parsed = JSON.parse(stored!);
      expect(parsed.state.commandPaletteOpen).toBeUndefined();
    });
  });
});
