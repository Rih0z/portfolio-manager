/**
 * PortfolioScoreCard unit tests
 *
 * スコアカードの検証:
 * - engagementStore との連携（updateScore 呼び出し）
 * - ロック指標の blur 表示（Curiosity Gap）
 * - Free/Premium 表示切替
 *
 * @file src/__tests__/unit/components/dashboard/PortfolioScoreCard.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PortfolioScoreCard from '../../../../components/dashboard/PortfolioScoreCard';

// Mock updateScore
const mockUpdateScore = vi.fn();
vi.mock('../../../../stores/engagementStore', () => ({
  useEngagementStore: vi.fn((selector) => {
    const state = { updateScore: mockUpdateScore };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

// Mock usePortfolioContext
const mockPortfolioContext = {
  currentAssets: [] as any[],
  targetPortfolio: [] as any[],
};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

// Mock useIsPremium
let mockIsPremium = false;
vi.mock('../../../../hooks/queries', () => ({
  useIsPremium: () => mockIsPremium,
}));

// Mock portfolioScore
const mockScoreResult = {
  totalScore: 72,
  grade: 'B',
  summary: 'テストサマリー',
  metrics: [
    { id: 'div', label: '分散度', score: 80, grade: 'A', description: '分散', isPremium: false },
    { id: 'risk', label: 'リスク', score: 65, grade: 'B', description: 'リスク', isPremium: true },
  ],
};

vi.mock('../../../../utils/portfolioScore', () => ({
  calculatePortfolioScore: () => mockScoreResult,
}));

// Mock CircularProgress (UI component)
vi.mock('../../../../components/ui/progress', () => ({
  CircularProgress: ({ children, value }: any) => (
    <div data-testid="circular-progress" data-value={value}>{children}</div>
  ),
}));

describe('PortfolioScoreCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPremium = false;
    mockPortfolioContext.currentAssets = [{ ticker: 'AAPL' }];
    mockPortfolioContext.targetPortfolio = [{ ticker: 'AAPL', targetPercentage: 100 }];
  });

  it('should render score card with testid', () => {
    render(<PortfolioScoreCard />);
    expect(screen.getByTestId('portfolio-score-card')).toBeInTheDocument();
  });

  it('should display total score', () => {
    render(<PortfolioScoreCard />);
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('should display grade badge', () => {
    render(<PortfolioScoreCard />);
    expect(screen.getByText('B ランク')).toBeInTheDocument();
  });

  it('should call updateScore via engagementStore when score > 0', () => {
    render(<PortfolioScoreCard />);
    expect(mockUpdateScore).toHaveBeenCalledWith(72, 'B');
  });

  it('should show upgrade CTA for free users', () => {
    mockIsPremium = false;
    render(<PortfolioScoreCard />);
    expect(screen.getByText(/Standard で全指標のスコアを確認する/)).toBeInTheDocument();
  });

  it('should not show upgrade CTA for premium users', () => {
    mockIsPremium = true;
    render(<PortfolioScoreCard />);
    expect(screen.queryByText(/Standard で全指標のスコアを確認する/)).not.toBeInTheDocument();
  });

  it('should show free metrics without lock icon', () => {
    render(<PortfolioScoreCard />);
    expect(screen.getByText('分散度')).toBeInTheDocument();
  });

  it('should show premium metrics with blur for free users (Curiosity Gap)', () => {
    mockIsPremium = false;
    const { container } = render(<PortfolioScoreCard />);
    // blur(4px) スタイルがロック指標に適用されているか
    const blurElements = container.querySelectorAll('[style*="blur"]');
    expect(blurElements.length).toBeGreaterThan(0);
  });
});
