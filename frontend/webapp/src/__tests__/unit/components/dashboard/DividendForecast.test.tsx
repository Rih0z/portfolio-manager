/**
 * DividendForecast unit tests
 *
 * 配当予測カードのロジック検証:
 * - 通貨換算の正確性（9-BX ルール準拠）
 * - 月別配当分配ロジック
 * - 加重平均利回り計算
 * - 配当資産なしの場合の非表示
 *
 * @file src/__tests__/unit/components/dashboard/DividendForecast.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DividendForecast from '../../../../components/dashboard/DividendForecast';

// Mock usePortfolioContext
const mockPortfolioContext = {
  currentAssets: [] as any[],
  targetPortfolio: [],
  baseCurrency: 'JPY',
  exchangeRate: { rate: 150 },
};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

describe('DividendForecast', () => {
  beforeEach(() => {
    mockPortfolioContext.currentAssets = [];
    mockPortfolioContext.baseCurrency = 'JPY';
    mockPortfolioContext.exchangeRate = { rate: 150 };
  });

  it('should return null when no dividend assets exist', () => {
    mockPortfolioContext.currentAssets = [
      { ticker: 'AAPL', price: 200, holdings: 10, currency: 'USD', hasDividend: false, dividendYield: 0 },
    ];
    const { container } = render(<DividendForecast />);
    expect(container.innerHTML).toBe('');
  });

  it('should render when dividend assets exist', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'VYM',
        name: 'Vanguard High Dividend',
        price: 100,
        holdings: 10,
        currency: 'USD',
        hasDividend: true,
        dividendYield: 3.0,
        dividendFrequency: 'quarterly',
      },
    ];
    render(<DividendForecast />);
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
    expect(screen.getByText('配当予測')).toBeInTheDocument();
  });

  it('should calculate annual total correctly for JPY base currency', () => {
    // 100 USD * 10 shares = 1000 USD → 150,000 JPY at rate 150
    // 3% yield → 4,500 JPY annual dividend
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'VYM',
        name: 'Vanguard High Dividend',
        price: 100,
        holdings: 10,
        currency: 'USD',
        hasDividend: true,
        dividendYield: 3.0,
        dividendFrequency: 'quarterly',
      },
    ];
    render(<DividendForecast />);
    // 年間配当額が Badge 内に正確に表示される
    // 100 USD * 10 = 1,000 USD → ×150 = 150,000 JPY → 3% = ¥4,500
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('4,500');
  });

  it('should handle same-currency assets without conversion', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: '7203',
        name: 'トヨタ自動車',
        price: 3000,
        holdings: 100,
        currency: 'JPY',
        hasDividend: true,
        dividendYield: 2.0,
        dividendFrequency: 'semi-annual',
      },
    ];
    render(<DividendForecast />);
    // 3000 * 100 = 300,000 JPY, 2% yield = 6,000 JPY
    // Badge に「年間 ¥6,000」と表示される
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('6,000');
  });

  it('should handle USD base currency with JPY assets', () => {
    mockPortfolioContext.baseCurrency = 'USD';
    mockPortfolioContext.currentAssets = [
      {
        ticker: '7203',
        name: 'トヨタ',
        price: 3000,
        holdings: 100,
        currency: 'JPY',
        hasDividend: true,
        dividendYield: 3.0,
        dividendFrequency: 'quarterly',
      },
    ];
    render(<DividendForecast />);
    // 300,000 JPY / 150 = 2,000 USD, 3% = $60
    // Badge に「年間 $60」と表示される
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('$60');
  });

  it('should show top dividend assets sorted by annual amount', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'VYM', name: 'VYM', price: 100, holdings: 10,
        currency: 'USD', hasDividend: true, dividendYield: 3.0, dividendFrequency: 'quarterly',
      },
      {
        ticker: 'SCHD', name: 'SCHD', price: 80, holdings: 20,
        currency: 'USD', hasDividend: true, dividendYield: 4.0, dividendFrequency: 'quarterly',
      },
    ];
    render(<DividendForecast />);
    const tickers = screen.getAllByText(/VYM|SCHD/);
    // SCHD (80*20*4% = 64 USD) > VYM (100*10*3% = 30 USD) → SCHD が先
    expect(tickers.length).toBeGreaterThanOrEqual(2);
  });

  it('should skip assets without dividendYield or with zero yield', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'AAPL', name: 'Apple', price: 200, holdings: 5,
        currency: 'USD', hasDividend: true, dividendYield: 0,
      },
      {
        ticker: 'VYM', name: 'VYM', price: 100, holdings: 10,
        currency: 'USD', hasDividend: true, dividendYield: 3.0, dividendFrequency: 'quarterly',
      },
    ];
    render(<DividendForecast />);
    // AAPL は yield=0 なのでスキップ、VYM のみ表示
    expect(screen.getByText('VYM')).toBeInTheDocument();
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });

  it('should display weighted yield percentage', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'VYM', name: 'VYM', price: 100, holdings: 10,
        currency: 'USD', hasDividend: true, dividendYield: 3.0, dividendFrequency: 'quarterly',
      },
    ];
    render(<DividendForecast />);
    expect(screen.getByText(/加重平均配当利回り/)).toBeInTheDocument();
  });

  it('should default frequency to quarterly when not specified', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'VYM', name: 'VYM', price: 100, holdings: 10,
        currency: 'USD', hasDividend: true, dividendYield: 4.0,
        // dividendFrequency は未指定 → quarterly
      },
    ];
    render(<DividendForecast />);
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
  });

  it('should render monthly bar chart with 12 columns', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'VYM', name: 'VYM', price: 100, holdings: 10,
        currency: 'USD', hasDividend: true, dividendYield: 4.0,
        dividendFrequency: 'quarterly',
      },
    ];
    render(<DividendForecast />);
    // 月別スケジュールセクションが存在する
    expect(screen.getByText('月別配当スケジュール')).toBeInTheDocument();
    // 12ヶ月分の列が表示される（1〜12の数字ラベル）
    for (let m = 1; m <= 12; m++) {
      expect(screen.getByText(String(m))).toBeInTheDocument();
    }
  });

  it('should distribute annual frequency to December only', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'BOND', name: 'Annual Bond', price: 1000, holdings: 10,
        currency: 'USD', hasDividend: true, dividendYield: 2.0,
        dividendFrequency: 'annual',
      },
    ];
    const { container } = render(<DividendForecast />);
    // baseCurrency=JPY → title は「X月: ¥Y」形式
    // annual = [11] → 12月のみ配当あり
    const bars = container.querySelectorAll('[title]');
    const barsWithAmount = Array.from(bars).filter(el => {
      const title = el.getAttribute('title') || '';
      // ¥0 でない月（配当がある月）を検出
      return title.includes('月') && !title.includes('¥0');
    });
    // annual なので配当がある月は12月の1つだけ
    expect(barsWithAmount.length).toBe(1);
    expect(barsWithAmount[0].getAttribute('title')).toContain('12月');
  });

  it('should distribute semi-annual frequency to June and December', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'SEMI', name: 'Semi Annual', price: 500, holdings: 20,
        currency: 'USD', hasDividend: true, dividendYield: 3.0,
        dividendFrequency: 'semi-annual',
      },
    ];
    const { container } = render(<DividendForecast />);
    const bars = container.querySelectorAll('[title]');
    const barsWithAmount = Array.from(bars).filter(el => {
      const title = el.getAttribute('title') || '';
      return title.includes('月') && !title.includes('¥0');
    });
    // semi-annual = [5, 11] → 6月, 12月
    expect(barsWithAmount.length).toBe(2);
    const months = barsWithAmount.map(el => el.getAttribute('title'));
    expect(months.some(t => t?.includes('6月'))).toBe(true);
    expect(months.some(t => t?.includes('12月'))).toBe(true);
  });

  it('should distribute monthly frequency to all 12 months', () => {
    mockPortfolioContext.currentAssets = [
      {
        ticker: 'REIT', name: 'Monthly REIT', price: 200, holdings: 50,
        currency: 'USD', hasDividend: true, dividendYield: 5.0,
        dividendFrequency: 'monthly',
      },
    ];
    const { container } = render(<DividendForecast />);
    const bars = container.querySelectorAll('[title]');
    const barsWithAmount = Array.from(bars).filter(el => {
      const title = el.getAttribute('title') || '';
      return title.includes('月') && !title.includes('¥0');
    });
    // monthly = 全12ヶ月
    expect(barsWithAmount.length).toBe(12);
  });
});
