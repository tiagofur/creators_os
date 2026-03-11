type EventHandler = (data: unknown) => void;

export type WsConnectionState = 'connected' | 'reconnecting' | 'disconnected';

type ConnectionStateListener = (state: WsConnectionState) => void;

export interface WsClientConfig {
  url: string;
  getAccessToken: () => string | null;
  maxRetries?: number;
}

export function createWsClient(config: WsClientConfig) {
  const { url, getAccessToken, maxRetries = 5 } = config;
  const handlers = new Map<string, Set<EventHandler>>();
  const stateListeners = new Set<ConnectionStateListener>();
  let socket: WebSocket | null = null;
  let retryCount = 0;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connectionState: WsConnectionState = 'disconnected';

  function setConnectionState(state: WsConnectionState) {
    if (state === connectionState) return;
    connectionState = state;
    stateListeners.forEach((listener) => listener(state));
  }

  function getBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  function connect() {
    if (closed) return;

    // Clear any pending reconnect timer
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // If already connected or connecting, skip
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (retryCount > 0) {
      setConnectionState('reconnecting');
    }

    const token = getAccessToken();
    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      retryCount = 0;
      setConnectionState('connected');
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as { type: string; data: unknown };
        const eventHandlers = handlers.get(parsed.type);
        if (eventHandlers) {
          eventHandlers.forEach((handler) => handler(parsed.data));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => {
      socket = null;
      if (closed) return;
      if (retryCount < maxRetries) {
        setConnectionState('reconnecting');
        const delay = getBackoffDelay(retryCount);
        retryCount++;
        reconnectTimer = setTimeout(connect, delay);
      } else {
        setConnectionState('disconnected');
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  }

  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    if (closed) return;

    // If disconnected or reconnecting, attempt immediate reconnect
    if (connectionState !== 'connected') {
      retryCount = 0;
      connect();
    }
  }

  // Register visibility listener when running in the browser
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  function subscribe(event: string, handler: EventHandler) {
    if (!handlers.has(event)) {
      handlers.set(event, new Set());
    }
    handlers.get(event)!.add(handler);

    if (!socket) {
      connect();
    }
  }

  function unsubscribe(event?: string, handler?: EventHandler) {
    if (!event) {
      handlers.clear();
    } else if (!handler) {
      handlers.delete(event);
    } else {
      handlers.get(event)?.delete(handler);
    }
  }

  function disconnect() {
    closed = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    handlers.clear();
    stateListeners.clear();
    socket?.close();
    socket = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }

  function onConnectionStateChange(listener: ConnectionStateListener): () => void {
    stateListeners.add(listener);
    // Immediately notify of current state
    listener(connectionState);
    return () => {
      stateListeners.delete(listener);
    };
  }

  function getConnectionState(): WsConnectionState {
    return connectionState;
  }

  return { subscribe, unsubscribe, disconnect, onConnectionStateChange, getConnectionState };
}

export type WsClient = ReturnType<typeof createWsClient>;
