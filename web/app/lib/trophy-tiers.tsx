/**
 * Trophy Tier System
 *
 * Maps badge/achievement XP point values to trophy tiers
 * inspired by PlayStation Network's tier system.
 *
 * Tiers: Silver (1-24), Gold (25-49), Platinum (50-99), Diamond (100+)
 */

export type TrophyTier = 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TrophyTierInfo {
  tier: TrophyTier;
  label: string;
  color: string;
}

export function getTrophyTier(points: number): TrophyTierInfo | null {
  if (points <= 0) return null;
  if (points >= 100) return { tier: 'diamond', label: 'Diamond', color: '#22D3EE' };
  if (points >= 50) return { tier: 'platinum', label: 'Platinum', color: '#818CF8' };
  if (points >= 25) return { tier: 'gold', label: 'Gold', color: '#F59E0B' };
  return { tier: 'silver', label: 'Silver', color: '#94A3B8' };
}

/**
 * SVG trophy icon component. Renders a trophy colored to the appropriate tier.
 */
export function TrophyIcon({
  tier,
  size = 16,
  className = '',
}: {
  tier: TrophyTier;
  size?: number;
  className?: string;
}) {
  const colors: Record<TrophyTier, { main: string; accent: string }> = {
    silver: { main: '#94A3B8', accent: '#CBD5E1' },
    gold: { main: '#F59E0B', accent: '#FCD34D' },
    platinum: { main: '#818CF8', accent: '#A5B4FC' },
    diamond: { main: '#22D3EE', accent: '#67E8F9' },
  };

  const { main, accent } = colors[tier];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label={`${tier} trophy`}
    >
      {/* Trophy cup */}
      <path
        d="M7 4h10v2a5 5 0 01-10 0V4z"
        fill={main}
      />
      {/* Trophy handles */}
      <path
        d="M5 5a2 2 0 00-2 2v1a3 3 0 003 3h1a5 5 0 01-2-6zm14 0a2 2 0 012 2v1a3 3 0 01-3 3h-1a5 5 0 002-6z"
        fill={accent}
        opacity={0.7}
      />
      {/* Trophy stem */}
      <rect x="10.5" y="12" width="3" height="4" rx="1" fill={main} />
      {/* Trophy base */}
      <rect x="8" y="16" width="8" height="2" rx="1" fill={accent} />
      {/* Shine highlight */}
      <path
        d="M9 5.5a1 1 0 011-1h1a0.5 0.5 0 010 1h-1a1 1 0 01-1-1z"
        fill="white"
        opacity={0.4}
      />
      {tier === 'diamond' && (
        <>
          {/* Diamond sparkle effects */}
          <circle cx="6" cy="3" r="0.5" fill={accent} opacity={0.6} />
          <circle cx="18" cy="3" r="0.5" fill={accent} opacity={0.6} />
          <circle cx="4" cy="8" r="0.4" fill={accent} opacity={0.4} />
          <circle cx="20" cy="8" r="0.4" fill={accent} opacity={0.4} />
        </>
      )}
    </svg>
  );
}
