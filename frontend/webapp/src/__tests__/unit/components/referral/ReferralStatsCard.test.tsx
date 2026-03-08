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

const mockReferralState: Record<string, any> = {
  stats: {
    totalReferrals: 5,
    successfulConversions: 2,
    rewardMonths: 2,
    maxRewardMonths: 12,
  },
  loading: false,
  fetchStats: vi.fn(),
};

vi.mock('../../../../stores/referralStore', () => ({
  useReferralStore: vi.fn((selector?: (state: any) => any) => {
    if (typeof selector === 'function') return selector(mockReferralState);
    return mockReferralState;
  }),
}));

import ReferralStatsCard from '../../../../components/referral/ReferralStatsCard';

describe('ReferralStatsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.isAuthenticated = true;
  });

  it('should render nothing when not authenticated', () => {
    mockAuthState.isAuthenticated = false;
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
