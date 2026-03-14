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

  it('should display weighted yield percentage with correct value', () => {
    // VYM only: all portfolio value has 3% yield → weighted yield = 3.00%
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    const yieldText = screen.getByText(/加重平均配当利回り/);
    expect(yieldText.textContent).toContain('3.00%');
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

    // quarterly = 3月(2), 6月(5), 9月(8), 12月(11) → 4ヶ月分のカードが表示
    expect(screen.getByTestId('month-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('month-card-5')).toBeInTheDocument();
    expect(screen.getByTestId('month-card-8')).toBeInTheDocument();
    expect(screen.getByTestId('month-card-11')).toBeInTheDocument();

    // 3月カードに VYM と SCHD が含まれる
    const marchCard = screen.getByTestId('month-card-2');
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

    // annual = 12月(11)のみ
    expect(screen.getByTestId('month-card-11')).toBeInTheDocument();
    expect(screen.getByTestId('month-card-11').textContent).toContain('12月');
    // 他の月カードは存在しない
    expect(screen.queryByTestId('month-card-2')).not.toBeInTheDocument();
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

    // 順序: SCHD (4%) > VYM (3%) > 7203 (2%)
    const item0 = screen.getByTestId('ranking-item-0');
    const item1 = screen.getByTestId('ranking-item-1');
    const item2 = screen.getByTestId('ranking-item-2');
    expect(item0.textContent).toContain('SCHD');
    expect(item0.textContent).toContain('4.00%');
    expect(item1.textContent).toContain('VYM');
    expect(item1.textContent).toContain('3.00%');
    expect(item2.textContent).toContain('7203');
    expect(item2.textContent).toContain('2.00%');
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

    // ランキングは全6件表示（サマリーの上位5件とは異なる）
    expect(screen.getByTestId('ranking-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('ranking-item-5')).toBeInTheDocument();
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

  // ──────────────────────────────────────
  // エッジケーステスト
  // ──────────────────────────────────────

  it('should handle null exchangeRate gracefully', () => {
    mockPortfolioContext.exchangeRate = null as any;
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    // フォールバックレート150が使われ、正常にレンダリングされる
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
    // 100*10=1000 USD → 150,000 JPY → 3% = ¥4,500
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('4,500');
  });

  it('should handle undefined exchangeRate gracefully', () => {
    mockPortfolioContext.exchangeRate = undefined as any;
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
  });

  it('should handle assets with zero price', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'ZERO', name: 'Zero Price', price: 0, dividendYield: 5.0 }),
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    // price=0 → assetValue=0 → annualAmount=0 → dividendYield>0 なので配当資産に含まれるが金額0
    // VYMのみ実質的に表示される
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
  });

  it('should handle assets with zero holdings', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'EMPTY', name: 'No Holdings', holdings: 0, dividendYield: 4.0 }),
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    // holdings=0 → assetValue=0 → annualAmount=0
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
  });

  it('should skip assets with negative dividendYield', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'NEG', name: 'Negative Yield', dividendYield: -2.0 }),
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);
    // yield <= 0 はスキップ
    expect(screen.queryByText('NEG')).not.toBeInTheDocument();
    expect(screen.getByText('VYM')).toBeInTheDocument();
  });

  // ──────────────────────────────────────
  // キーボードナビゲーションテスト
  // ──────────────────────────────────────

  it('should switch tabs with ArrowRight key', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    const summaryTab = screen.getByRole('tab', { name: 'サマリー' });
    summaryTab.focus();
    await user.keyboard('{ArrowRight}');

    // 月別詳細タブに移動
    expect(screen.getByTestId('monthly-detail')).toBeInTheDocument();
    expect(screen.queryByText('月別配当スケジュール')).not.toBeInTheDocument();
  });

  it('should switch tabs with ArrowLeft key (wrap around)', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    const summaryTab = screen.getByRole('tab', { name: 'サマリー' });
    summaryTab.focus();
    await user.keyboard('{ArrowLeft}');

    // ラップアラウンドで利回りランキングタブに移動
    expect(screen.getByTestId('yield-ranking')).toBeInTheDocument();
  });

  // ──────────────────────────────────────
  // アクセシビリティテスト
  // ──────────────────────────────────────

  it('should have aria-label on abbreviated tickers', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'LONGTICKERX', name: 'Long Ticker Asset' }),
    ];
    render(<DividendForecast />);

    // サマリータブのティッカーにaria-label
    const tickerSpans = document.querySelectorAll('[aria-label="Long Ticker Asset"]');
    expect(tickerSpans.length).toBeGreaterThanOrEqual(1);

    // 利回りランキングタブでも確認
    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));
    const rankingTickerSpans = document.querySelectorAll('[aria-label="Long Ticker Asset"]');
    expect(rankingTickerSpans.length).toBeGreaterThanOrEqual(1);
  });

  it('should set tabIndex=-1 on inactive tabs for roving tabindex', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    const summaryTab = screen.getByRole('tab', { name: 'サマリー' });
    const detailTab = screen.getByRole('tab', { name: '月別詳細' });
    const rankingTab = screen.getByRole('tab', { name: '利回りランキング' });

    // アクティブタブは tabIndex=0、非アクティブは tabIndex=-1
    expect(summaryTab).toHaveAttribute('tabindex', '0');
    expect(detailTab).toHaveAttribute('tabindex', '-1');
    expect(rankingTab).toHaveAttribute('tabindex', '-1');
  });

  it('should have native table elements in monthly detail for screen readers', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
      makeAsset({ ticker: 'SCHD', name: 'SCHD', price: 80, holdings: 20, dividendYield: 4.0 }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    // 月別カードにnative table要素が存在
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBe(4); // quarterly = 4ヶ月

    // テーブルにaria-labelが付与されている
    expect(tables[0]).toHaveAttribute('aria-label', '3月の配当銘柄一覧');

    // sr-onlyのヘッダー行 + データ行が存在
    const rows = within(tables[0]).getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(3); // 1 header + 2 assets (VYM, SCHD)

    // セルが存在（各行3セル: ticker, frequency, amount）
    const cells = within(tables[0]).getAllByRole('cell');
    expect(cells.length).toBe(6); // 2 assets × 3 cells
  });

  it('should have tab button ids matching aria-labelledby on panels', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    // tab buttonにidが付与されている
    const summaryTab = screen.getByRole('tab', { name: 'サマリー' });
    expect(summaryTab).toHaveAttribute('id', 'tab-summary');

    // tabpanelのaria-labelledbyがtab idを参照している
    const panel = document.getElementById('tabpanel-summary');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-summary');
  });

  it('should make tabpanel focusable', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    const panel = document.getElementById('tabpanel-summary');
    expect(panel).toHaveAttribute('tabindex', '0');
  });

  // ──────────────────────────────────────
  // フォールバックパステスト
  // ──────────────────────────────────────

  it('should handle unknown currency pair (pass through without conversion)', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'EURO', name: 'Euro Asset', currency: 'EUR', dividendYield: 4.0 }),
    ];
    render(<DividendForecast />);
    // EUR → JPY 変換ルールがないため、value がそのまま返される
    // 100 * 10 = 1000 EUR → 1000 (unconverted) → 4% = 40
    expect(screen.getByTestId('dividend-forecast')).toBeInTheDocument();
  });

  it('should handle unknown dividendFrequency by defaulting to quarterly', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'UNK', name: 'Unknown Freq', dividendFrequency: 'biweekly' }),
    ];
    render(<DividendForecast />);

    await user.click(screen.getByRole('tab', { name: '月別詳細' }));

    // unknown frequency → quarterly fallback → 4ヶ月分のカード
    expect(screen.getByTestId('month-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('month-card-5')).toBeInTheDocument();
    expect(screen.getByTestId('month-card-8')).toBeInTheDocument();
    expect(screen.getByTestId('month-card-11')).toBeInTheDocument();
    // 頻度ラベルは「四半期」にフォールバック
    expect(screen.getByTestId('month-card-2').textContent).toContain('四半期');
  });

  it('should use ticker as name when name is undefined', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'NONAME', name: undefined, dividendYield: 3.0 }),
    ];
    render(<DividendForecast />);
    // aria-label should fallback to ticker
    const tickerSpan = document.querySelector('[aria-label="NONAME"]');
    expect(tickerSpan).toBeInTheDocument();
  });

  it('should default currency to USD when undefined', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'NOCURR', name: 'No Currency', currency: undefined, dividendYield: 3.0 }),
    ];
    render(<DividendForecast />);
    // currency=undefined → 'USD' fallback → 100*10=1000 USD → 150,000 JPY → 3% = 4,500
    const badge = screen.getByText(/年間/).closest('[class]')!;
    expect(badge.textContent).toContain('4,500');
  });

  it('should limit summary top assets to 5 even with more dividend assets', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'A1', name: 'A1', dividendYield: 6.0 }),
      makeAsset({ ticker: 'A2', name: 'A2', dividendYield: 5.0 }),
      makeAsset({ ticker: 'A3', name: 'A3', dividendYield: 4.0 }),
      makeAsset({ ticker: 'A4', name: 'A4', dividendYield: 3.0 }),
      makeAsset({ ticker: 'A5', name: 'A5', dividendYield: 2.0 }),
      makeAsset({ ticker: 'A6', name: 'A6', dividendYield: 1.0 }),
      makeAsset({ ticker: 'A7', name: 'A7', dividendYield: 0.5 }),
    ];
    render(<DividendForecast />);
    // サマリータブの配当上位銘柄は5件に制限
    const summarySection = screen.getByText('配当上位銘柄').parentElement!;
    // A1〜A5は表示、A6,A7は非表示（サマリータブ内）
    expect(summarySection.textContent).toContain('A1');
    expect(summarySection.textContent).toContain('A5');
    expect(summarySection.textContent).not.toContain('A6');
  });

  it('should display ticker truncation with ellipsis for long tickers', () => {
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'LONGTICKERXYZ', name: 'Long Ticker Asset' }),
    ];
    render(<DividendForecast />);
    // 6文字 + '...' に切り詰め
    expect(screen.getByText('LONGTI...')).toBeInTheDocument();
  });

  it('should navigate to first tab with Home key', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    // まず利回りランキングに移動
    await user.click(screen.getByRole('tab', { name: '利回りランキング' }));
    expect(screen.getByTestId('yield-ranking')).toBeInTheDocument();

    // Homeキーでサマリーに戻る
    screen.getByRole('tab', { name: '利回りランキング' }).focus();
    await user.keyboard('{Home}');
    expect(screen.getByText('月別配当スケジュール')).toBeInTheDocument();
  });

  it('should navigate to last tab with End key', async () => {
    const user = userEvent.setup();
    mockPortfolioContext.currentAssets = [
      makeAsset({ ticker: 'VYM', name: 'VYM' }),
    ];
    render(<DividendForecast />);

    // Endキーで利回りランキングに移動
    screen.getByRole('tab', { name: 'サマリー' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByTestId('yield-ranking')).toBeInTheDocument();
  });
});
