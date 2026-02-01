/**
 * useWebSocket — Core WebSocket connection hook
 *
 * Manages a single WebSocket connection with:
 * - Auto-connect on mount when URL is non-null
 * - Exponential backoff + jitter reconnection (1s → 30s max)
 * - Immediate reconnect on tab refocus
 * - Event subscription via `on(type, handler)` that returns an unsubscribe fn
 * - Auto pong response to server pings
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSMessage, WSMessageType, WSMessageDataMap } from '../lib/ws-types';

export type WSStatus = 'connecting' | 'connected' | 'disconnected';

type MessageHandler<T extends WSMessageType = WSMessageType> = (
  message: WSMessage<T>
) => void;

export interface WSConnection {
  on: <T extends WSMessageType>(
    type: T,
    handler: (message: WSMessage<T> & { data: WSMessageDataMap[T] }) => void
  ) => () => void;
  status: WSStatus;
}

const NOOP_CONNECTION: WSConnection = {
  on: () => () => {},
  status: 'disconnected',
};

export { NOOP_CONNECTION };

export function useWebSocket(url: string | null): WSConnection {
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const connect = useCallback(() => {
    const currentUrl = urlRef.current;
    if (!currentUrl) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(currentUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCountRef.current = 0;
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          // Auto-respond to pings
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }

          // Dispatch to registered listeners
          const handlers = listenersRef.current.get(message.type);
          if (handlers) {
            for (const handler of handlers) {
              try {
                handler(message);
              } catch (err) {
                console.error(`WS handler error for ${message.type}:`, err);
              }
            }
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setStatus('disconnected');
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will fire after onerror — reconnect handled there
      };
    } catch {
      setStatus('disconnected');
      scheduleReconnect();
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (retryTimerRef.current) return; // Already scheduled

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const baseDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000);
    // Add jitter: ±25%
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.max(500, baseDelay + jitter);

    retryCountRef.current++;

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (urlRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  // Subscribe to a message type — returns unsubscribe function
  const on = useCallback(<T extends WSMessageType>(
    type: T,
    handler: (message: WSMessage<T> & { data: WSMessageDataMap[T] }) => void,
  ): (() => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    const handlers = listenersRef.current.get(type)!;
    handlers.add(handler as MessageHandler);

    return () => {
      handlers.delete(handler as MessageHandler);
      if (handlers.size === 0) {
        listenersRef.current.delete(type);
      }
    };
  }, []);

  // Connect/disconnect on URL change
  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [url, connect]);

  // Reconnect on tab refocus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        urlRef.current &&
        (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      ) {
        // Clear any pending retry and reconnect immediately
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        retryCountRef.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connect]);

  return { on, status };
}
