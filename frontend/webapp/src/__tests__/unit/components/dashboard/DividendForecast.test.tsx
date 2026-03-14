/**
 * DividendForecast unit tests
 *
 * 配当予測カードのロジック検証:
 * - 通貨換算の正確性（9-BX ルール準拠）
 * - 月別配当分配ロジック
 * - 加重平均利回り計算
 * - 配当資産なしの場合の非表示
 * - タブ切り替え（サマリー / 月別詳細 / 利回りランキング）
 * - 月別詳細テーブルの金額精度
 * - 利回りランキングの正確な順序
 *
 * @file src/__tests__/unit/components/dashboard/DividendForecast.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// 共通テストデータ
const makeAsset = (overrides: Record<string, any>) => ({
  price: 100,
  holdings: 10,
  currency: 'USD',
  hasDividend: true,
  dividendYield: 3.0,
  dividendFrequency: 'quarterly',
  ...overrides,
});

describe('DividendForecast', () => {
  beforeEach(() => {
    mockPortfolioContext.currentAssets = [];
    mockPortfolioContext.baseCurrency = 'JPY';
    mockPortfolioContext.exchangeRate = { rate: 150 };
  });

  // ──────────────────────────────────────
  // 基本表示テスト
  // ──────────────────────────────────────

  it('should return null when no dividend assets exist', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'AAPL', name: 'Apple', hasDividend: false, dividendYield: 0 }),
    ];
    const { container } = render(<DividendForecast />);
    expect(container.innerHTML).toBe('');
  });

  it('should render when dividend assets exist', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'Vanguard High Dividend' }),
    ];
    render(<DividendForecast />);
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
    expect(screen.getByText('配当予測')).toBeInTheDocument();
  });

  // ──────────────────────────────────────
  // 通貨換算テスト（9-BX 準拠）
  // ──────────────────────────────────────

  it('should calculate annual total correctly for JPY base currency', () => {
    // 100 USD * 10 shares = 1000 USD → 150,000 JPY at rate 150
    // 3% yield → 4,500 JPY annual dividend
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'Vanguard High Dividend' }),
    ];
    render(<DividendForecast />);
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('4,500');
  });

  it('should handle same-currency assets without conversion', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({
        ticker: '7203', name: 'トヨタ自動車',
        price: 3000, holdings: 100, currency: 'JPY',
        dividendYield: 2.0, dividendFrequency: 'semi-annual',
      }),
    ];
    render(<DividendForecast />);
    // 3000 * 100 = 300,000 JPY, 2% yield = 6,000 JPY
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('6,000');
  });

  it('should handle USD base currency with JPY assets', () => {
    mockPortfolioContext.baseCurrency = 'USD';
    mockPortfolioContext.currentAssets = [
      makeAsset({
        ticker: '7203', name: 'トヨタ',
        price: 3000, holdings: 100, currency: 'JPY',
        dividendYield: 3.0, dividendFrequency: 'quarterly',
      }),
    ];
    render(<DividendForecast />);
    // 300,000 JPY / 150 = 2,000 USD, 3% = $60
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('$60');
  });

  // ──────────────────────────────────────
  // サマリータブ（既存機能）
  // ──────────────────────────────────────

  it('should show top dividend assets sorted by annual amount', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
      makeAsset({ ticker: 'SCHD', name: 'SCHD', price: 80, holdings: 20, dividendYield: 4.0 }),
    ];
    render(<DividendForecast />);
    const tickers = screen.getAllByText(/VYM|SCHD/);
    expect(tickers.length).toBeGreaterThanOrEqual(2);
  });

  it('should skip assets without dividendYield or with zero yield', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'AAPL', name: 'Apple', dividendYield: 0 }),
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    expect(screen.getByText('VYM')).toBeInTheDocument();
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });

  it('should display weighted yield percentage', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    expect(screen.getByText(/加重平均配当利回り/)).toBeInTheDocument();
  });

  it('should default frequency to quarterly when not specified', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendYield: 4.0, dividendFrequency: undefined }),
    ];
    render(<DividendForecast />);
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
  });

  it('should render monthly bar chart with 12 columns', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendYield: 4.0 }),
    ];
    render(<DividendForecast />);
    expect(screen.getByText('月別配当スケジュール')).toBeInTheDocument();
    for (let m = 1; m <= 12; m++) {
      expect(screen.getByText(String(m))).toBeInTheDocument();
    }
  });

  // ──────────────────────────────────────
  // 配当頻度による月別分配
  // ──────────────────────────────────────

  it('should distribute annual frequency to December only', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({
        ticker: 'BOND', name: 'Annual Bond', price: 1000, holdings: 10,
        dividendYield: 2.0, dividendFrequency: 'annual',
      }),
    ];
    const { container } = render(<DividendForecast />);
    const bars = container.querySelectorAll('[title]');
    const barsWithAmount = Array.from(bars).filter(el => {
      const title = el.getAttribute('title') || '';
      return title.includes('月') && !title.includes('¥0');
    });
    expect(barsWithAmount.length).toBe(1);
    expect(barsWithAmount[0].getAttribute('title')).toContain('12月');
  });

  it('should distribute semi-annual frequency to June and December', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({
        ticker: 'SEMI', name: 'Semi Annual', price: 500, holdings: 20,
        dividendYield: 3.0, dividendFrequency: 'semi-annual',
      }),
    ];
    const { container } = render(<DividendForecast />);
    const bars = container.querySelectorAll('[title]');
    const barsWithAmount = Array.from(bars).filter(el => {
      const title = el.getAttribute('title') || '';
      return title.includes('月') && !title.includes('¥0');
    });
    expect(barsWithAmount.length).toBe(2);
    const months = barsWithAmount.map(el => el.getAttribute('title'));
    expect(months.some(t => t?.includes('6月'))).toBe(true);
    expect(months.some(t => t?.includes('12月'))).toBe(true);
  });

  it('should distribute monthly frequency to all 12 months', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({
        ticker: 'REIT', name: 'Monthly REIT', price: 200, holdings: 50,
        dividendYield: 5.0, dividendFrequency: 'monthly',
      }),
    ];
    const { container } = render(<DividendForecast />);
    const bars = container.querySelectorAll('[title]');
    const barsWithAmount = Array.from(bars).filter(el => {
      const title = el.getAttribute('title') || '';
      return title.includes('月') && !title.includes('¥0');
    });
    expect(barsWithAmount.length).toBe(12);
  });

  // ──────────────────────────────────────
  // タブ切り替えテスト
  // ──────────────────────────────────────

  it('should show summary tab by default', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    // サマリータブのコンテンツが見える
    expect(screen.getByText('月別配当スケジュール')).toBeInTheDocument();
    expect(screen.getByText('配当上位銘柄')).toBeInTheDocument();
    // 月別詳細・ランキングは非表示
    expect(screen.queryByTestId('monthly-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('yield-ranking')).not.toBeInTheDocument();
  });

  it('should switch to monthly detail tab on click', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    expect(screen.getByTestId('monthly-detail')).toBeInTheDocument();
    // サマリータブのコンテンツは非表示
    expect(screen.queryByText('月別配当スケジュール')).not.toBeInTheDocument();
  });

  it('should switch to yield ranking tab on click', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));

    expect(screen.getByTestId('yield-ranking')).toBeInTheDocument();
    expect(screen.queryByText('月別配当スケジュール')).not.toBeInTheDocument();
  });

  it('should switch back to summary tab', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));
    expect(screen.getByTestId('monthly-detail')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'サマリー' }));
    expect(screen.getByText('月別配当スケジュール')).toBeInTheDocument();
    expect(screen.queryByTestId('monthly-detail')).not.toBeInTheDocument();
  });

  // ──────────────────────────────────────
  // 月別詳細タブ — データ精度テスト
  // ──────────────────────────────────────

  it('should display monthly detail with correct asset breakdown', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'Vanguard High Dividend' }),
      makeAsset({ ticker: 'SCHD', name: 'Schwab Dividend', price: 80, holdings: 20, dividendYield: 4.0 }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    const detail = screen.getByTestId('monthly-detail');
    // quarterly = 3月, 6月, 9月, 12月 → 4ヶ月分のカードが表示
    const monthCards = detail.querySelectorAll('.border.border-border');
    expect(monthCards.length).toBe(4);

    // 3月カードに VYM と SCHD が含まれる
    const marchCard = monthCards[0];
    expect(marchCard.textContent).toContain('3月');
    expect(marchCard.textContent).toContain('VYM');
    expect(marchCard.textContent).toContain('SCHD');
  });

  it('should show correct monthly total in detail tab (JPY conversion)', async () => {
    const user = userEvent.setup();
    // VYM: 100 USD * 10 shares = 1000 USD → 150,000 JPY → 3% = 4,500 JPY/year → 1,125 JPY/quarter
    // SCHD: 80 USD * 20 shares = 1600 USD → 240,000 JPY → 4% = 9,600 JPY/year → 2,400 JPY/quarter
    // 月合計 = 3,525 JPY
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
      makeAsset({ ticker: 'SCHD', name: 'SCHD', price: 80, holdings: 20, dividendYield: 4.0 }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    const detail = screen.getByTestId('monthly-detail');
    // 各四半期月の合計 = ¥3,525
    expect(detail.textContent).toContain('3,525');
  });

  it('should display frequency label in Japanese', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendFrequency: 'quarterly' }),
      makeAsset({
        ticker: '7203', name: 'トヨタ',
        price: 3000, holdings: 100, currency: 'JPY',
        dividendYield: 2.0, dividendFrequency: 'semi-annual',
      }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    const detail = screen.getByTestId('monthly-detail');
    expect(detail.textContent).toContain('四半期');
    expect(detail.textContent).toContain('半年');
  });

  it('should only show months with dividends in detail tab', async () => {
    const user = userEvent.setup();
    // annual → 12月のみ
    mockPortfolioContext.currentAssets = [
      makeAsset({
        ticker: 'BOND', name: 'Annual Bond', price: 1000, holdings: 10,
        dividendYield: 2.0, dividendFrequency: 'annual',
      }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    const detail = screen.getByTestId('monthly-detail');
    const monthCards = detail.querySelectorAll('.border.border-border');
    expect(monthCards.length).toBe(1);
    expect(monthCards[0].textContent).toContain('12月');
  });

  it('should show correct per-payment amount for each asset', async () => {
    const user = userEvent.setup();
    // VYM: annual = 4,500 JPY, quarterly (4 payments) → 1,125 JPY per payment
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    const detail = screen.getByTestId('monthly-detail');
    expect(detail.textContent).toContain('1,125');
  });

  // ──────────────────────────────────────
  // 月別詳細タブ — 通貨換算 JPY/USD 混在テスト
  // ──────────────────────────────────────

  it('should convert mixed currency assets in monthly detail (JPY base)', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendFrequency: 'semi-annual' }),
      makeAsset({
        ticker: '7203', name: 'トヨタ',
        price: 3000, holdings: 100, currency: 'JPY',
        dividendYield: 2.0, dividendFrequency: 'semi-annual',
      }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    const detail = screen.getByTestId('monthly-detail');
    // VYM: 1000 USD → 150,000 JPY, 3% = 4,500/year, semi-annual = 2,250/payment
    // トヨタ: 300,000 JPY, 2% = 6,000/year, semi-annual = 3,000/payment
    // 月合計 = 5,250 JPY
    expect(detail.textContent).toContain('2,250');
    expect(detail.textContent).toContain('3,000');
    expect(detail.textContent).toContain('5,250');
  });

  it('should convert mixed currency assets in monthly detail (USD base)', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.baseCurrency = 'USD';
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendFrequency: 'semi-annual' }),
      makeAsset({
        ticker: '7203', name: 'トヨタ',
        price: 3000, holdings: 100, currency: 'JPY',
        dividendYield: 3.0, dividendFrequency: 'semi-annual',
      }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    const detail = screen.getByTestId('monthly-detail');
    // VYM: 1000 USD, 3% = 30/year, semi-annual = $15/payment
    // トヨタ: 300,000 JPY / 150 = 2,000 USD, 3% = 60/year, semi-annual = $30/payment
    expect(detail.textContent).toContain('$15');
    expect(detail.textContent).toContain('$30');
    expect(detail.textContent).toContain('$45');
  });

  // ──────────────────────────────────────
  // 利回りランキングタブ
  // ──────────────────────────────────────

  it('should display yield ranking in descending order', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendYield: 3.0 }),
      makeAsset({ ticker: 'SCHD', name: 'SCHD', price: 80, holdings: 20, dividendYield: 4.0 }),
      makeAsset({
        ticker: '7203', name: 'トヨタ',
        price: 3000, holdings: 100, currency: 'JPY',
        dividendYield: 2.0, dividendFrequency: 'semi-annual',
      }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));

    const ranking = screen.getByTestId('yield-ranking');
    const items = ranking.querySelectorAll('.flex.items-center.justify-between');
    expect(items.length).toBe(3);

    // 順序: SCHD (4%) > VYM (3%) > 7203 (2%)
    expect(items[0].textContent).toContain('SCHD');
    expect(items[0].textContent).toContain('4.00%');
    expect(items[1].textContent).toContain('VYM');
    expect(items[1].textContent).toContain('3.00%');
    expect(items[2].textContent).toContain('7203');
    expect(items[2].textContent).toContain('2.00%');
  });

  it('should show ranking numbers (1., 2., 3.)', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendYield: 3.0 }),
      makeAsset({ ticker: 'SCHD', name: 'SCHD', dividendYield: 4.0 }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));

    const ranking = screen.getByTestId('yield-ranking');
    expect(ranking.textContent).toContain('1.');
    expect(ranking.textContent).toContain('2.');
  });

  it('should show annual amount for each ranked asset', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendYield: 3.0 }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));

    const ranking = screen.getByTestId('yield-ranking');
    // VYM: 100*10=1000 USD → 150,000 JPY → 3% = ¥4,500
    expect(ranking.textContent).toContain('4,500');
  });

  it('should show all dividend assets in ranking (not limited to top 5)', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'A1', name: 'A1', dividendYield: 6.0 }),
      makeAsset({ ticker: 'A2', name: 'A2', dividendYield: 5.0 }),
      makeAsset({ ticker: 'A3', name: 'A3', dividendYield: 4.0 }),
      makeAsset({ ticker: 'A4', name: 'A4', dividendYield: 3.0 }),
      makeAsset({ ticker: 'A5', name: 'A5', dividendYield: 2.0 }),
      makeAsset({ ticker: 'A6', name: 'A6', dividendYield: 1.0 }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));

    const ranking = screen.getByTestId('yield-ranking');
    const items = ranking.querySelectorAll('.flex.items-center.justify-between');
    // ランキングは全6件表示（サマリーの上位5件とは異なる）
    expect(items.length).toBe(6);
  });

  // ──────────────────────────────────────
  // 利回りランキング — 通貨換算テスト
  // ──────────────────────────────────────

  it('should show correct converted amounts in yield ranking (USD base)', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.baseCurrency = 'USD';
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM', dividendYield: 3.0 }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));

    const ranking = screen.getByTestId('yield-ranking');
    // VYM: 100*10 = 1000 USD (same currency), 3% = $30
    expect(ranking.textContent).toContain('$30');
  });

  // ──────────────────────────────────────
  // 3つのタブが存在すること
  // ──────────────────────────────────────

  it('should render all three tab buttons', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    expect(screen.getByRole('tab', { name: 'サマリー' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '月別詳細' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '利回りランキング' })).toBeInTheDocument();
  });
});
