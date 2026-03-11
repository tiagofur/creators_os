import { useWorkspaceStore } from '../workspace.store';
import type { Workspace } from '@ordo/types';

const makeWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'ws-1',
  name: 'Test Workspace',
  slug: 'test-workspace',
  logo_url: null,
  timezone: 'UTC',
  owner_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

function getState() {
  return useWorkspaceStore.getState();
}

describe('workspaceStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspace: null,
      isLoading: false,
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = getState();
      expect(state.workspaces).toEqual([]);
      expect(state.activeWorkspace).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setWorkspaces', () => {
    it('sets the workspaces array', () => {
      const workspaces = [makeWorkspace(), makeWorkspace({ id: 'ws-2', name: 'Second' })];
      getState().setWorkspaces(workspaces);
      expect(getState().workspaces).toEqual(workspaces);
    });

    it('replaces existing workspaces', () => {
      getState().setWorkspaces([makeWorkspace()]);
      const newList = [makeWorkspace({ id: 'ws-new' })];
      getState().setWorkspaces(newList);
      expect(getState().workspaces).toHaveLength(1);
      expect(getState().workspaces[0].id).toBe('ws-new');
    });
  });

  describe('setActiveWorkspace (switchWorkspace)', () => {
    it('updates activeWorkspace', () => {
      const ws = makeWorkspace();
      getState().setActiveWorkspace(ws);
      expect(getState().activeWorkspace).toEqual(ws);
    });

    it('switches to a different workspace', () => {
      const ws1 = makeWorkspace({ id: 'ws-1', name: 'First' });
      const ws2 = makeWorkspace({ id: 'ws-2', name: 'Second' });

      getState().setActiveWorkspace(ws1);
      expect(getState().activeWorkspace?.id).toBe('ws-1');

      getState().setActiveWorkspace(ws2);
      expect(getState().activeWorkspace?.id).toBe('ws-2');
      expect(getState().activeWorkspace?.name).toBe('Second');
    });

    it('clears activeWorkspace when set to null', () => {
      getState().setActiveWorkspace(makeWorkspace());
      getState().setActiveWorkspace(null);
      expect(getState().activeWorkspace).toBeNull();
    });

    it('does not affect other state', () => {
      const workspaces = [makeWorkspace(), makeWorkspace({ id: 'ws-2' })];
      getState().setWorkspaces(workspaces);
      getState().setLoading(true);

      getState().setActiveWorkspace(workspaces[0]);

      expect(getState().workspaces).toEqual(workspaces);
      expect(getState().isLoading).toBe(true);
    });
  });

  describe('addWorkspace', () => {
    it('appends a workspace to the list', () => {
      const ws1 = makeWorkspace({ id: 'ws-1' });
      const ws2 = makeWorkspace({ id: 'ws-2' });

      getState().addWorkspace(ws1);
      expect(getState().workspaces).toHaveLength(1);

      getState().addWorkspace(ws2);
      expect(getState().workspaces).toHaveLength(2);
      expect(getState().workspaces[1].id).toBe('ws-2');
    });
  });

  describe('removeWorkspace', () => {
    it('removes a workspace by id', () => {
      const ws1 = makeWorkspace({ id: 'ws-1' });
      const ws2 = makeWorkspace({ id: 'ws-2' });
      getState().setWorkspaces([ws1, ws2]);

      getState().removeWorkspace('ws-1');

      expect(getState().workspaces).toHaveLength(1);
      expect(getState().workspaces[0].id).toBe('ws-2');
    });

    it('clears activeWorkspace if it is the removed one', () => {
      const ws = makeWorkspace({ id: 'ws-1' });
      getState().setWorkspaces([ws]);
      getState().setActiveWorkspace(ws);

      getState().removeWorkspace('ws-1');

      expect(getState().activeWorkspace).toBeNull();
    });

    it('keeps activeWorkspace if a different workspace is removed', () => {
      const ws1 = makeWorkspace({ id: 'ws-1' });
      const ws2 = makeWorkspace({ id: 'ws-2' });
      getState().setWorkspaces([ws1, ws2]);
      getState().setActiveWorkspace(ws1);

      getState().removeWorkspace('ws-2');

      expect(getState().activeWorkspace?.id).toBe('ws-1');
    });

    it('is a no-op if id does not exist', () => {
      const ws = makeWorkspace({ id: 'ws-1' });
      getState().setWorkspaces([ws]);

      getState().removeWorkspace('nonexistent');

      expect(getState().workspaces).toHaveLength(1);
    });
  });

  describe('setLoading', () => {
    it('sets isLoading', () => {
      getState().setLoading(true);
      expect(getState().isLoading).toBe(true);

      getState().setLoading(false);
      expect(getState().isLoading).toBe(false);
    });
  });

  describe('persistence', () => {
    it('only partializes activeWorkspace id', () => {
      const ws = makeWorkspace({ id: 'ws-1', name: 'Test' });
      getState().setActiveWorkspace(ws);

      // Trigger persist by reading localStorage
      const stored = localStorage.getItem('ordo-workspace');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      // partialize only keeps { id } from activeWorkspace
      expect(parsed.state.activeWorkspace).toEqual({ id: 'ws-1' });
      // Full workspace list should NOT be persisted
      expect(parsed.state.workspaces).toBeUndefined();
    });
  });
});
