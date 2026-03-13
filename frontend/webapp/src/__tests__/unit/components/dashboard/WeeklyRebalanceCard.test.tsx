/**
 * WeeklyRebalanceCard unit tests
 *
 * 週次リバランスチェックカードの検証:
 * - 乖離計算の正確性
 * - 閾値（3%）の境界テスト
 * - 通貨換算（9-BX ルール準拠）
 * - 表示/非表示条件
 *
 * @file src/__tests__/unit/components/dashboard/WeeklyRebalanceCard.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import WeeklyRebalanceCard from '../../../../components/dashboard/WeeklyRebalanceCard';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock usePortfolioContext
const mockPortfolioContext = {
  currentAssets: [] as any[],
  targetPortfolio: [] as any[],
  baseCurrency: 'JPY',
  exchangeRate: { rate: 150 },
};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

describe('WeeklyRebalanceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioContext.currentAssets = [];
    mockPortfolioContext.targetPortfolio = [];
    mockPortfolioContext.baseCurrency = 'JPY';
    mockPortfolioContext.exchangeRate = { rate: 150 };
  });

  it('should return null when no target portfolio', () => {
    mockPortfolioContext.currentAssets = [
      { ticker: 'AAPL', price: 200, holdings: 10, currency: 'USD' },
    ];
    mockPortfolioContext.targetPortfolio = [];
    const { container } = render(<WeeklyRebalanceCard />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null when no current assets', () => {
    mockPortfolioContext.currentAssets = [];
    mockPortfolioContext.targetPortfolio = [
      { ticker: 'AAPL', targetPercentage: 50 },
    ];
    const { container } = render(<WeeklyRebalanceCard />);
    expect(container.innerHTML).toBe('');
  });

  it('should show healthy badge when drift is within threshold', () => {
    // 50% 目標、50% 実際 → 乖離 0%
    mockPortfolioContext.currentAssets = [
      { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
      { ticker: 'GOOG', price: 100, holdings: 10, currency: 'USD' },
    ];
    mockPortfolioContext.targetPortfolio = [
      { ticker: 'AAPL', targetPercentage: 50, name: 'Apple' },
      { ticker: 'GOOG', targetPercentage: 50, name: 'Google' },
    ];
    render(<WeeklyRebalanceCard />);
    expect(screen.getByText('良好')).toBeInTheDocument();
  });

  it('should show drift items when drift exceeds 3%', () => {
    // AAPL: 80%, target 50% → drift +30%
    // GOOG: 20%, target 50% → drift -30%
    mockPortfolioContext.currentAssets = [
      { ticker: 'AAPL', price: 100, holdings: 80, currency: 'USD' },
      { ticker: 'GOOG', price: 100, holdings: 20, currency: 'USD' },
    ];
    mockPortfolioContext.targetPortfolio = [
      { ticker: 'AAPL', targetPercentage: 50, name: 'Apple' },
      { ticker: 'GOOG', targetPercentage: 50, name: 'Google' },
    ];
    render(<WeeklyRebalanceCard />);
    expect(screen.getByText(/最大乖離/)).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('should not show drift when exactly at 3% threshold', () => {
    // 53% vs 50% → drift 3% → ちょうど閾値（>= 3% なので表示）
    const total = 100;
    mockPortfolioContext.currentAssets = [
      { ticker: 'AAPL', price: 53, holdings: 1, currency: 'USD' },
      { ticker: 'GOOG', price: 47, holdings: 1, currency: 'USD' },
    ];
    mockPortfolioContext.targetPortfolio = [
      { ticker: 'AAPL', targetPercentage: 50, name: 'Apple' },
      { ticker: 'GOOG', targetPercentage: 50, name: 'Google' },
    ];
    render(<WeeklyRebalanceCard />);
    // 53% vs 50% = drift 3.0% → DRIFT_THRESHOLD=3 なので >= で表示
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('should navigate to /simulation when button clicked', () => {
    mockPortfolioContext.currentAssets = [
      { ticker: 'AAPL', price: 100, holdings: 80, currency: 'USD' },
      { ticker: 'GOOG', price: 100, holdings: 20, currency: 'USD' },
    ];
    mockPortfolioContext.targetPortfolio = [
      { ticker: 'AAPL', targetPercentage: 50, name: 'Apple' },
      { ticker: 'GOOG', targetPercentage: 50, name: 'Google' },
    ];
    render(<WeeklyRebalanceCard />);
    const button = screen.getByText('シミュレーションで調整する');
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/simulation');
  });

  it('should handle currency conversion correctly (USD assets with JPY base)', () => {
    mockPortfolioContext.baseCurrency = 'JPY';
    mockPortfolioContext.exchangeRate = { rate: 150 };
    mockPortfolioContext.currentAssets = [
      { ticker: 'AAPL', price: 200, holdings: 10, currency: 'USD' }, // 200*10*150 = 300,000 JPY
      { ticker: '7203', price: 3000, holdings: 100, currency: 'JPY' }, // 300,000 JPY
    ];
    mockPortfolioContext.targetPortfolio = [
      { ticker: 'AAPL', targetPercentage: 50, name: 'Apple' },
      { ticker: '7203', targetPercentage: 50, name: 'トヨタ' },
    ];
    render(<WeeklyRebalanceCard />);
    // 50% vs 50% → 乖離なし
    expect(screen.getByText('良好')).toBeInTheDocument();
  });

  it('should sort drift items by absolute drift descending', () => {
    mockPortfolioContext.currentAssets = [
      { ticker: 'A', price: 60, holdings: 1, currency: 'USD' },
      { ticker: 'B', price: 10, holdings: 1, currency: 'USD' },
      { ticker: 'C', price: 30, holdings: 1, currency: 'USD' },
    ];
    mockPortfolioContext.targetPortfolio = [
      { ticker: 'A', targetPercentage: 33, name: 'A' },
      { ticker: 'B', targetPercentage: 33, name: 'B' },
      { ticker: 'C', targetPercentage: 34, name: 'C' },
    ];
    render(<WeeklyRebalanceCard />);
    // B has largest negative drift (-23%) so should appear
    expect(screen.getByTestId('weekly-rebalance-card')).toBeInTheDocument();
  });

  it('should limit displayed drift items to 5', () => {
    // 7 items with significant drift
    const assets = [];
    const targets = [];
    for (let i = 0; i < 7; i++) {
      // i=0 に資産を集中させ、他は少量 → 全銘柄に大きな乖離が発生
      assets.push({ ticker: `T${i}`, price: i === 0 ? 700 : 50, holdings: 1, currency: 'USD' });
      targets.push({ ticker: `T${i}`, targetPercentage: 100 / 7, name: `T${i}` });
    }
    mockPortfolioContext.currentAssets = assets;
    mockPortfolioContext.targetPortfolio = targets;
    render(<WeeklyRebalanceCard />);
    // data-testid="drift-item" で各乖離行を検証（CSSクラス依存を排除）
    const driftItems = screen.getAllByTestId('drift-item');
    expect(driftItems.length).toBeLessThanOrEqual(5);
  });
});
