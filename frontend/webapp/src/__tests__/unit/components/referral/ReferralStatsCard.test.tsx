/**
 * ReferralStatsCard smoke render tests
 *
 * リファラル統計カードの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/referral/ReferralStatsCard.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'ja' },
  }),
}));

const mockAuthState: Record<string, any> = {
  isAuthenticated: true,
};

vi.mock('../../../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (state: any) => any) =>
    selector(mockAuthState)
  ),
}));

vi.mock('../../../../hooks/queries', () => ({
  useReferralStats: vi.fn(() => ({ data: null, isPending: false })),
}));

import ReferralStatsCard from '../../../../components/referral/ReferralStatsCard';
import { useReferralStats } from '../../../../hooks/queries';

const defaultStats = {
  totalReferrals: 5,
  successfulConversions: 2,
  rewardMonths: 2,
  maxRewardMonths: 12,
};

const setupMocks = (overrides: {
  isAuthenticated?: boolean;
  stats?: any;
  loading?: boolean;
} = {}) => {
  const { isAuthenticated = true, stats = defaultStats, loading = false } = overrides;
  mockAuthState.isAuthenticated = isAuthenticated;

  vi.mocked(useReferralStats).mockReturnValue({
    data: stats,
    isPending: loading,
  } as any);
};

describe('ReferralStatsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.isAuthenticated = true;
    setupMocks();
  });

  it('should render nothing when not authenticated', () => {
    setupMocks({ isAuthenticated: false });
    const { container } = render(<ReferralStatsCard />);
    expect(container.firstChild).toBeNull();
  });

  it('should render stats card when authenticated', () => {
    render(<ReferralStatsCard />);
    expect(screen.getByTestId('referral-stats-card')).toBeInTheDocument();
  });

  it('should display referral statistics', () => {
    render(<ReferralStatsCard />);
    expect(screen.getByText('5')).toBeInTheDocument(); // totalReferrals
    // successfulConversions (2) and rewardMonths (2) both show "2" - use getAllByText
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('should render title', () => {
    render(<ReferralStatsCard />);
    expect(screen.getByText('リファラル実績')).toBeInTheDocument();
  });
});
