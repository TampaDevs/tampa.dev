/**
 * WebSocketProvider — Context provider managing personal + broadcast connections
 *
 * Two WebSocket connections:
 *   - Personal (/ws): requires auth, connects only when user is logged in
 *   - Broadcast (/ws/broadcast): public, connects always
 *
 * Usage:
 *   <WebSocketProvider user={user}>
 *     <App />
 *   </WebSocketProvider>
 *
 *   const { personal, broadcast } = useWS();
 *   useEffect(() => personal.on('achievement.unlocked', handler), [personal]);
 */

import { createContext, useContext, useMemo } from 'react';
import { useWebSocket, NOOP_CONNECTION, type WSConnection } from './useWebSocket';

interface WSContextValue {
  personal: WSConnection;
  broadcast: WSConnection;
}

const NOOP_CONTEXT: WSContextValue = {
  personal: NOOP_CONNECTION,
  broadcast: NOOP_CONNECTION,
};

const WSContext = createContext<WSContextValue>(NOOP_CONTEXT);

function getWSUrl(path: string): string | null {
  // Only runs in browser
  if (typeof window === 'undefined') return null;

  const apiUrl =
    (import.meta as any).env?.EVENTS_API_URL || 'https://api.tampa.dev';
  const wsUrl = apiUrl.replace(/^http/, 'ws');
  return `${wsUrl}${path}`;
}

interface WebSocketProviderProps {
  user: unknown | null | undefined;
  children: React.ReactNode;
}

export function WebSocketProvider({ user, children }: WebSocketProviderProps) {
  const personalUrl = useMemo(
    () => (user ? getWSUrl('/ws') : null),
    [!!user],
  );
  const broadcastUrl = useMemo(() => getWSUrl('/ws/broadcast'), []);

  const personal = useWebSocket(personalUrl);
  const broadcast = useWebSocket(broadcastUrl);

  const value = useMemo(
    () => ({ personal, broadcast }),
    [personal, broadcast],
  );

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
}

/**
 * Access WebSocket connections from context.
 * Returns noop implementations if used outside provider (SSR safety).
 */
export function useWS(): WSContextValue {
  return useContext(WSContext);
}
