/**
 * CelebrationToast — Xbox/PlayStation-style achievement & badge unlock notifications
 *
 * Listens for achievement.unlocked and badge.issued events via WebSocket and
 * displays dramatic horizontal banners with glowing icons, trophy tier indicators,
 * and a sound effect.
 *
 * Positioned bottom-left, z-50 (same region as NotificationToast but stacked above).
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWS } from '../hooks/WebSocketProvider';
import { getTrophyTier, TrophyIcon } from '../lib/trophy-tiers';
import { Emoji } from '~/components/Emoji';

interface CelebrationItem {
  id: string;
  kind: 'achievement' | 'badge';
  name: string;
  icon: string;
  color: string;
  points: number;
  dismissAt: number;
}

/* ------------------------------------------------------------------ */
/*  Sound                                                              */
/* ------------------------------------------------------------------ */

let lastSoundTime = 0;

export function playAchievementSound() {
  const now = Date.now();
  if (now - lastSoundTime < 2000) return; // Skip if played recently
  lastSoundTime = now;
  try {
    new Audio('/sounds/achievement.mp3').play();
  } catch {
    /* ignore – user may not have interacted yet */
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CelebrationToast() {
  const { personal } = useWS();
  const [toasts, setToasts] = useState<CelebrationItem[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /* --- dismiss helpers -------------------------------------------- */

  const dismiss = useCallback((id: string) => {
    setExiting((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400); // matches exit animation duration
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (item: CelebrationItem) => {
      playAchievementSound();
      setToasts((prev) => [...prev.slice(-2), item]); // Keep max 3

      const timer = setTimeout(() => {
        timersRef.current.delete(item.id);
        dismiss(item.id);
      }, 8000);

      timersRef.current.set(item.id, timer);
    },
    [dismiss],
  );

  /* --- WebSocket listeners ---------------------------------------- */

  useEffect(() => {
    return personal.on('achievement.unlocked', (msg) => {
      addToast({
        id: `celeb-ach-${Date.now()}`,
        kind: 'achievement',
        name: msg.data.achievementName,
        icon: msg.data.icon ?? '🏆',
        color: msg.data.color ?? '#F97066',
        points: msg.data.points ?? 0,
        dismissAt: Date.now() + 8000,
      });
    });
  }, [personal, addToast]);

  useEffect(() => {
    return personal.on('badge.issued', (msg) => {
      addToast({
        id: `celeb-badge-${Date.now()}`,
        kind: 'badge',
        name: msg.data.badgeName,
        icon: msg.data.icon ?? '🎖️',
        color: msg.data.color ?? '#818CF8',
        points: msg.data.points ?? 0,
        dismissAt: Date.now() + 8000,
      });
    });
  }, [personal, addToast]);

  /* --- Cleanup timers on unmount ---------------------------------- */

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  /* --- Render ----------------------------------------------------- */

  if (toasts.length === 0) return null;

  return (
    <>
      {/* CSS keyframes */}
      <style>{`
        @keyframes celeb-slide-up {
          0%   { opacity: 0; transform: translateY(40px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes celeb-slide-down {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(40px) scale(0.88); }
        }
        @keyframes celeb-glow-pulse {
          0%, 100% { box-shadow: 0 0 10px var(--glow-color), 0 0 20px var(--glow-color); }
          50%      { box-shadow: 0 0 18px var(--glow-color), 0 0 36px var(--glow-color); }
        }
        .celeb-enter {
          animation: celeb-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .celeb-exit {
          animation: celeb-slide-down 0.4s ease-in forwards;
        }
        .celeb-icon-glow {
          animation: celeb-glow-pulse 2.5s ease-in-out infinite;
        }
      `}</style>

      <div className="fixed bottom-20 left-4 z-50 flex flex-col gap-3" style={{ maxWidth: 400 }}>
        {toasts.map((toast) => {
          const isExiting = exiting.has(toast.id);
          const trophyTier = getTrophyTier(toast.points);
          const glowColor = toast.color + '66'; // 40% alpha hex

          return (
            <div
              key={toast.id}
              className={`
                relative overflow-hidden rounded-xl shadow-2xl
                bg-gray-950/95 backdrop-blur-md
                ${isExiting ? 'celeb-exit' : 'celeb-enter'}
              `}
              style={{ borderLeft: `3px solid ${toast.color}` }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Glowing icon circle */}
                <div
                  className="celeb-icon-glow flex-shrink-0 flex items-center justify-center rounded-full"
                  style={{
                    '--glow-color': glowColor,
                    width: 48,
                    height: 48,
                    background: `radial-gradient(circle, ${toast.color}33 0%, transparent 70%)`,
                  } as React.CSSProperties}
                >
                  <Emoji emoji={toast.icon} size={28} />
                </div>

                {/* Center text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {toast.kind === 'achievement' ? 'Achievement Unlocked' : 'Badge Earned'}
                  </p>
                  <p className="text-sm font-bold text-white truncate">{toast.name}</p>
                  {toast.points > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {trophyTier && (
                        <TrophyIcon tier={trophyTier.tier} size={14} />
                      )}
                      <span className="text-xs font-medium" style={{ color: trophyTier?.color ?? '#94A3B8' }}>
                        {toast.points} XP
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: trophy tier icon (larger) */}
                {trophyTier && (
                  <div className="flex-shrink-0 opacity-60">
                    <TrophyIcon tier={trophyTier.tier} size={28} />
                  </div>
                )}

                {/* Dismiss button */}
                <button
                  onClick={() => dismiss(toast.id)}
                  className="flex-shrink-0 p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
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
