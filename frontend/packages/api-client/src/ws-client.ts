type EventHandler = (data: unknown) => void;

export interface WsClientConfig {
  url: string;
  getAccessToken: () => string | null;
  maxRetries?: number;
}

export function createWsClient(config: WsClientConfig) {
  const { url, getAccessToken, maxRetries = 5 } = config;
  const handlers = new Map<string, Set<EventHandler>>();
  let socket: WebSocket | null = null;
  let retryCount = 0;
  let closed = false;

  function getBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  function connect() {
    if (closed) return;

    const token = getAccessToken();
    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      retryCount = 0;
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
      if (closed) return;
      if (retryCount < maxRetries) {
        const delay = getBackoffDelay(retryCount);
        retryCount++;
        setTimeout(connect, delay);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
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
    handlers.clear();
    socket?.close();
    socket = null;
  }

  return { subscribe, unsubscribe, disconnect };
}

export type WsClient = ReturnType<typeof createWsClient>;
