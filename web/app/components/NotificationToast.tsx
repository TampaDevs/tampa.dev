/**
 * NotificationToast — Real-time score change notifications
 *
 * Listens for score.changed events via WebSocket and displays simple slide-up toasts.
 * Achievement and badge unlock notifications are handled by CelebrationToast.
 *
 * Positioned bottom-left (opposite the onboarding checklist in bottom-right).
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWS } from '../hooks/WebSocketProvider';
import { Emoji } from '~/components/Emoji';

interface Toast {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  dismissAt: number;
}

/**
 * Check if a notification is intended for the current user.
 * Returns true if the notification should be displayed (matches user or unknown).
 * Returns false if the notification is definitely for a different user (stale connection).
 */
function isNotificationForCurrentUser(
  msgUserId: string | undefined,
  currentUserId: string | null | undefined,
): boolean {
  // If either ID is missing, allow the notification (be permissive)
  if (!msgUserId || !currentUserId) return true;
  // Only show if IDs match
  return msgUserId === currentUserId;
}

interface NotificationToastProps {
  currentUserId?: string | null;
}

export function NotificationToast({ currentUserId }: NotificationToastProps) {
  const { personal } = useWS();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setExiting((prev) => new Set(prev).add(id));
    // Remove after exit animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev.slice(-4), toast]); // Keep max 5

    const timer = setTimeout(() => {
      timersRef.current.delete(toast.id);
      dismiss(toast.id);
    }, 5000);

    timersRef.current.set(toast.id, timer);
  }, [dismiss]);

  // Listen for score changes
  useEffect(() => {
    return personal.on('score.changed', (msg) => {
      // Guard: drop notifications for other users (stale connection defense)
      if (!isNotificationForCurrentUser(msg.data.userId, currentUserId)) {
        console.warn('[NotificationToast] Dropped score notification for wrong user');
        return;
      }
      addToast({
        id: `score-${Date.now()}`,
        title: 'XP Updated',
        subtitle: `Total: ${msg.data.totalScore} XP`,
        icon: '⚡',
        dismissAt: Date.now() + 5000,
      });
    });
  }, [personal, addToast, currentUserId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes toast-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-slide-down {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(16px) scale(0.9); }
        }
        .toast-enter { animation: toast-slide-up 0.3s ease-out forwards; }
        .toast-exit { animation: toast-slide-down 0.3s ease-in forwards; }
      `}</style>

      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map((toast) => {
          const isExiting = exiting.has(toast.id);

          return (
            <div
              key={toast.id}
              className={`
                relative overflow-visible rounded-xl px-4 py-3 shadow-lg
                bg-white dark:bg-gray-900 border
                border-gray-200 dark:border-gray-700 ${isExiting ? 'toast-exit' : 'toast-enter'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <Emoji emoji={toast.icon} size={28} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {toast.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {toast.subtitle}
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => dismiss(toast.id)}
                  className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
