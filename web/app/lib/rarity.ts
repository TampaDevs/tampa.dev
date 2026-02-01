export type RarityTier = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

export interface RarityInfo {
  tier: RarityTier;
  label: string;
  color: string;
}

export function getRarityTier(percentage: number): RarityInfo {
  if (percentage < 1) return { tier: 'legendary', label: 'Legendary', color: '#FF6B35' };
  if (percentage < 5) return { tier: 'epic', label: 'Epic', color: '#A855F7' };
  if (percentage < 15) return { tier: 'rare', label: 'Rare', color: '#3B82F6' };
  if (percentage < 50) return { tier: 'uncommon', label: 'Uncommon', color: '#22C55E' };
  return { tier: 'common', label: 'Common', color: '#94A3B8' };
}
