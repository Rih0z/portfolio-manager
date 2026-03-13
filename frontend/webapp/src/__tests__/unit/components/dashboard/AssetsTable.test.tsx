/**
 * AssetsTable unit tests
 *
 * 通貨換算ロジック検証（9-BX ルール準拠）:
 * - 各行の評価額が baseCurrency で正しく換算される
 * - 評価額降順ソートが換算後の値で行われる
 * - 配当・手数料も換算後の値で計算される
 *
 * @file src/__tests__/unit/components/dashboard/AssetsTable.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('../../../../utils/formatters', () => ({
  formatCurrency: (val: number, currency: string) =>
    currency === 'JPY'
      ? `¥${Math.round(val).toLocaleString()}`
      : `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
  formatPercent: (val: number, decimals?: number) => `${val.toFixed(decimals ?? 1)}%`,
}));

vi.mock('../../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: (code: string) => code,
}));

vi.mock('../../../../components/common/DataSourceBadge', () => ({
  default: function DataSourceBadge({ source }: { source: string }) {
    return <span data-testid="data-source-badge">{source}</span>;
  },
}));

const mockPortfolioContext: Record<string, any> = {};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

import AssetsTable from '../../../../components/dashboard/AssetsTable';

// --- Helper ---
function setContext(overrides: Record<string, any> = {}) {
  Object.assign(mockPortfolioContext, {
    baseCurrency: 'JPY',
    totalAssets: 0,
    currentAssets: [],
    targetPortfolio: [],
    exchangeRate: { rate: 150 },
    ...overrides,
  });
}

describe('AssetsTable', () => {
  beforeEach(() => {
    setContext();
  });

  // === 基本レンダリング ===
  it('renders empty state when no assets', () => {
    render(<AssetsTable />);
    expect(screen.getByText('保有資産が設定されていません。')).toBeInTheDocument();
  });

  it('renders table with header columns', () => {
    setContext({
      totalAssets: 150000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0.1, fundType: 'ETF',
          hasDividend: false, isStock: false, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    expect(screen.getByText('保有資産詳細')).toBeInTheDocument();
    expect(screen.getByText('銘柄')).toBeInTheDocument();
    expect(screen.getByText('評価額')).toBeInTheDocument();
  });

  // === 通貨換算テスト ===
  it('converts USD asset value to JPY correctly', () => {
    // AAPL: $100 * 10 = $1,000 → ¥150,000 at rate=150
    setContext({
      totalAssets: 150000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0.5, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    // 評価額列に ¥150,000 が表示される
    expect(screen.getByText('¥150,000')).toBeInTheDocument();
  });

  it('converts JPY asset value to USD correctly', () => {
    // 7203: ¥3000 * 100 = ¥300,000 → $2,000 at rate=150
    setContext({
      baseCurrency: 'USD',
      totalAssets: 2000,
      currentAssets: [
        {
          id: '1', ticker: '7203', name: 'Toyota', price: 3000, holdings: 100,
          currency: 'JPY', annualFee: 0, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    expect(screen.getByText('$2,000')).toBeInTheDocument();
  });

  it('displays same-currency assets without conversion', () => {
    // JPY asset with JPY base → no conversion
    setContext({
      totalAssets: 300000,
      currentAssets: [
        {
          id: '1', ticker: '7203', name: 'Toyota', price: 3000, holdings: 100,
          currency: 'JPY', annualFee: 0, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    expect(screen.getByText('¥300,000')).toBeInTheDocument();
  });

  // === ソート検証 ===
  it('sorts assets by converted value in descending order', () => {
    // baseCurrency=JPY, rate=150
    // AAPL: $100 * 10 = $1,000 → ¥150,000
    // 7203: ¥2000 * 100 = ¥200,000
    // 7203 (¥200,000) > AAPL (¥150,000) → 7203 が先
    setContext({
      totalAssets: 350000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
        {
          id: '2', ticker: '7203', name: 'Toyota', price: 2000, holdings: 100,
          currency: 'JPY', annualFee: 0, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    const rows = screen.getAllByRole('row');
    // row[0] = header, row[1] = 7203 (higher), row[2] = AAPL
    const firstDataRow = rows[1];
    const secondDataRow = rows[2];
    expect(within(firstDataRow).getByText('7203')).toBeInTheDocument();
    expect(within(secondDataRow).getByText('AAPL')).toBeInTheDocument();
  });

  // === 配当テスト ===
  it('calculates annual dividend using converted asset value', () => {
    // AAPL: $100 * 10 = $1,000 → ¥150,000 at rate=150
    // dividendYield: 2% → ¥150,000 * 0.02 = ¥3,000
    setContext({
      totalAssets: 150000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0.1, fundType: 'ETF',
          hasDividend: true, dividendYield: 2.0, dividendFrequency: 'quarterly',
          isStock: false, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    // 配当列に ¥3,000 が表示される
    expect(screen.getByText('¥3,000')).toBeInTheDocument();
  });

  it('shows "なし" for assets without dividends', () => {
    setContext({
      totalAssets: 150000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0.1, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    expect(screen.getByText('なし')).toBeInTheDocument();
  });

  // === 手数料テスト ===
  it('calculates fee using converted asset value', () => {
    // AAPL: $100 * 10 = $1,000 → ¥150,000
    // fee: 0.5% → ¥150,000 * 0.005 = ¥750
    setContext({
      totalAssets: 150000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0.5, fundType: 'ETF',
          hasDividend: false, isStock: false, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    expect(screen.getByText('¥750')).toBeInTheDocument();
  });

  // === 割合テスト ===
  it('calculates current percentage with converted values', () => {
    // baseCurrency=JPY, totalAssets=350,000
    // AAPL: ¥150,000 → 42.9%
    // 7203: ¥200,000 → 57.1%
    setContext({
      totalAssets: 350000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
        {
          id: '2', ticker: '7203', name: 'Toyota', price: 2000, holdings: 100,
          currency: 'JPY', annualFee: 0, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    // 150000/350000*100 = 42.9%
    expect(screen.getByText('42.9%')).toBeInTheDocument();
    // 200000/350000*100 = 57.1%
    expect(screen.getByText('57.1%')).toBeInTheDocument();
  });

  // === 価格表示 ===
  it('displays price in original currency, not baseCurrency', () => {
    setContext({
      totalAssets: 150000,
      currentAssets: [
        {
          id: '1', ticker: 'AAPL', name: 'Apple', price: 185.5, holdings: 10,
          currency: 'USD', annualFee: 0, fundType: 'Stock',
          hasDividend: false, isStock: true, isMutualFund: false,
        },
      ],
    });
    render(<AssetsTable />);
    // 価格列は元の通貨（USD）で表示
    expect(screen.getByText('$185.5')).toBeInTheDocument();
  });
});
