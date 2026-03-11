import { create } from 'zustand';

type WsConnectionState = 'connected' | 'reconnecting' | 'disconnected';

interface WsState {
  connectionState: WsConnectionState;
  setConnectionState: (state: WsConnectionState) => void;
}

export const useWsStore = create<WsState>((set) => ({
  connectionState: 'disconnected',
  setConnectionState: (connectionState) => set({ connectionState }),
}));
