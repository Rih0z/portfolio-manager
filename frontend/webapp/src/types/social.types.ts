/**
 * Social Portfolio 型定義
 *
 * ポートフォリオ共有・ピア比較機能で使用される型を定義。
 *
 * @file src/types/social.types.ts
 */

export interface SharedPortfolio {
  shareId: string;
  displayName: string;
  ageGroup?: string;
  allocationSnapshot: { category: string; percentage: number }[];
  portfolioScore: number;
  assetCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface PeerComparison {
  ageGroup: string;
  averageAllocation: { category: string; percentage: number }[];
  totalParticipants: number;
  userRankPercentile?: number | null;
}

export interface UserSharesResponse {
  shares: SharedPortfolio[];
  limits: {
    maxShares: number;
    currentCount: number;
  };
}

export const AGE_GROUPS = [
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50s', label: '50代' },
  { value: '60s+', label: '60代以上' },
] as const;

export const SOCIAL_LIMITS = {
  FREE: { maxShares: 1, ttlDays: 7 },
  STANDARD: { maxShares: 5, ttlDays: 30 },
} as const;
