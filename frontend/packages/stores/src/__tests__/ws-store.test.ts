import { useWsStore } from '../ws.store';

function getState() {
  return useWsStore.getState();
}

describe('wsStore', () => {
  beforeEach(() => {
    useWsStore.setState({ connectionState: 'disconnected' });
  });

  describe('initial state', () => {
    it('starts as disconnected', () => {
      expect(getState().connectionState).toBe('disconnected');
    });
  });

  describe('setConnectionState', () => {
    it('sets to connected', () => {
      getState().setConnectionState('connected');
      expect(getState().connectionState).toBe('connected');
    });

    it('sets to reconnecting', () => {
      getState().setConnectionState('reconnecting');
      expect(getState().connectionState).toBe('reconnecting');
    });

    it('sets to disconnected', () => {
      getState().setConnectionState('connected');
      getState().setConnectionState('disconnected');
      expect(getState().connectionState).toBe('disconnected');
    });
  });
});
