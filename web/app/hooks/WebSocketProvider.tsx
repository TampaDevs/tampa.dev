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

/**
 * Inner provider that manages WebSocket connections.
 * Separated so we can use React key to force remount on user identity change.
 */
function InnerWSProvider({ children }: { children: React.ReactNode }) {
  const personalUrl = useMemo(() => getWSUrl('/ws'), []);
  const broadcastUrl = useMemo(() => getWSUrl('/ws/broadcast'), []);

  const personal = useWebSocket(personalUrl);
  const broadcast = useWebSocket(broadcastUrl);

  const value = useMemo(
    () => ({ personal, broadcast }),
    [personal, broadcast],
  );

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
}

export function WebSocketProvider({ user, children }: WebSocketProviderProps) {
  // Extract a stable user identifier for keying
  // When userId changes, React will unmount/remount InnerWSProvider,
  // which closes the old WebSocket and opens a new one
  const userId = user && typeof user === 'object' && 'id' in user
    ? (user as { id: string }).id
    : null;

  // For logged-out users, render a noop provider (no personal WS connection)
  if (!userId) {
    return <WSContext.Provider value={NOOP_CONTEXT}>{children}</WSContext.Provider>;
  }

  // Key forces remount when user identity changes → fresh WebSocket connection
  return (
    <InnerWSProvider key={userId}>
      {children}
    </InnerWSProvider>
  );
}

/**
 * Access WebSocket connections from context.
 * Returns noop implementations if used outside provider (SSR safety).
 */
export function useWS(): WSContextValue {
  return useContext(WSContext);
}
