/**
 * ReferralSection component tests
 *
 * リファラルカードの表示、コピー機能、統計表示、
 * 未認証時の非表示を検証する。
 * @file src/__tests__/unit/components/referral/ReferralSection.test.tsx
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies BEFORE imports ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('../../../../stores/referralStore', () => ({
  useReferralStore: vi.fn(),
}));

vi.mock('../../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  AnalyticsEvents: {
    REFERRAL_CODE_COPY: 'referral_code_copy',
  },
}));

// shadcn/ui mocks
vi.mock('../../../../components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid={props['data-testid']} {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('../../../../components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

// --- Import after mocks ---
import ReferralSection from '../../../../components/referral/ReferralSection';
import { useReferralStore } from '../../../../stores/referralStore';
import { useAuthStore } from '../../../../stores/authStore';
import { trackEvent } from '../../../../utils/analytics';

// --- Test setup ---
const mockFetchCode = vi.fn();
const mockFetchStats = vi.fn();

const setupMocks = (overrides: {
  isAuthenticated?: boolean;
  referralCode?: any;
  stats?: any;
  loading?: boolean;
} = {}) => {
  const {
    isAuthenticated = true,
    referralCode = { referralCode: 'PW3X9K2M', userId: 'user-123', createdAt: '2026-03-01' },
    stats = { totalReferrals: 5, successfulConversions: 2, rewardMonths: 2, maxRewardMonths: 6 },
    loading = false,
  } = overrides;

  vi.mocked(useAuthStore).mockImplementation((selector: any) =>
    selector({ isAuthenticated })
  );

  const storeState = {
    referralCode,
    stats,
    loading,
    fetchCode: mockFetchCode,
    fetchStats: mockFetchStats,
  };

  vi.mocked(useReferralStore).mockImplementation((selector?: any) =>
    selector ? selector(storeState) : storeState
  );
};

describe('ReferralSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://portfolio-wise.com' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render referral section when authenticated', () => {
    setupMocks();
    render(<ReferralSection />);

    expect(screen.getByTestId('referral-section')).toBeInTheDocument();
    expect(screen.getByText('PW3X9K2M')).toBeInTheDocument();
  });

  it('should not render when not authenticated', () => {
    setupMocks({ isAuthenticated: false });
    const { container } = render(<ReferralSection />);

    expect(container.innerHTML).toBe('');
  });

  it('should fetch code and stats on mount when authenticated', () => {
    setupMocks();
    render(<ReferralSection />);

    expect(mockFetchCode).toHaveBeenCalled();
    expect(mockFetchStats).toHaveBeenCalled();
  });

  it('should show loading skeleton when loading without code', () => {
    setupMocks({ loading: true, referralCode: null });
    render(<ReferralSection />);

    // Should show pulse animation elements
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('should display referral URL', () => {
    setupMocks();
    render(<ReferralSection />);

    expect(screen.getByText('https://portfolio-wise.com/?ref=PW3X9K2M')).toBeInTheDocument();
  });

  it('should display stats when available', () => {
    setupMocks();
    render(<ReferralSection />);

    expect(screen.getByText('5')).toBeInTheDocument(); // totalReferrals
    expect(screen.getByText('2')).toBeInTheDocument(); // successfulConversions
    expect(screen.getByText(/2 \/ 6/)).toBeInTheDocument(); // rewardMonths
  });

  it('should copy referral URL to clipboard on button click', async () => {
    setupMocks();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ReferralSection />);

    const copyButton = screen.getByText('コピー');
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith('https://portfolio-wise.com/?ref=PW3X9K2M');
    expect(trackEvent).toHaveBeenCalledWith('referral_code_copy', {
      code: 'PW3X9K2M',
    });
  });

  it('should show check icon after copying', async () => {
    setupMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<ReferralSection />);

    await act(async () => {
      fireEvent.click(screen.getByText('コピー'));
    });

    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
  });

  it('should show placeholder when no referral code', () => {
    setupMocks({ referralCode: null });
    render(<ReferralSection />);

    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('should disable copy button when no referral code', () => {
    setupMocks({ referralCode: null });
    render(<ReferralSection />);

    const copyButton = screen.getByText('コピー').closest('button');
    expect(copyButton).toBeDisabled();
  });

  it('should not show stats section when stats is null', () => {
    setupMocks({ stats: null });
    render(<ReferralSection />);

    expect(screen.queryByText('紹介数')).not.toBeInTheDocument();
  });
});
