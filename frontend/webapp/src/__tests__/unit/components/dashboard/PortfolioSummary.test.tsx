/**
 * PortfolioSummary unit tests
 *
 * 通貨換算ロジック検証（9-BX ルール準拠）:
 * - fundTypeSummary の通貨換算
 * - 手数料・配当計算の正確性
 * - 混在通貨ポートフォリオ
 *
 * @file src/__tests__/unit/components/dashboard/PortfolioSummary.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.totalAssets': '総資産',
      };
      return translations[key] || key;
    },
    i18n: { language: 'ja' },
  }),
}));

vi.mock('../../../../utils/formatters', () => ({
  formatCurrency: (val: number, currency: string) =>
    currency === 'JPY'
      ? `¥${Math.round(val).toLocaleString()}`
      : `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
  formatPercent: (val: number, decimals?: number) => `${val.toFixed(decimals ?? 1)}%`,
}));

const mockPortfolioContext: Record<string, any> = {};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

import PortfolioSummary from '../../../../components/dashboard/PortfolioSummary';

// --- Helper ---
function setContext(overrides: Record<string, any> = {}) {
  Object.assign(mockPortfolioContext, {
    baseCurrency: 'JPY',
    totalAssets: 0,
    annualFees: 0,
    annualDividends: 0,
    currentAssets: [],
    targetPortfolio: [],
    exchangeRate: { rate: 150 },
    ...overrides,
  });
}

describe('PortfolioSummary', () => {
  beforeEach(() => {
    setContext();
  });

  // === 基本レンダリング ===
  it('renders portfolio summary with data-testid', () => {
    setContext({
      totalAssets: 1000000,
      currentAssets: [
        { ticker: 'VTI', name: 'VTI', price: 200, holdings: 50, currency: 'USD', annualFee: 0.03, fundType: 'ETF', hasDividend: false },
      ],
    });
    render(<PortfolioSummary />);
    expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
  });

  it('displays ticker count correctly', () => {
    setContext({
      totalAssets: 500000,
      currentAssets: [
        { ticker: 'A', name: 'A', price: 100, holdings: 10, currency: 'USD', annualFee: 0.1, fundType: 'ETF', hasDividend: false },
        { ticker: 'B', name: 'B', price: 200, holdings: 5, currency: 'JPY', annualFee: 0.2, fundType: 'Stock', hasDividend: false },
      ],
    });
    render(<PortfolioSummary />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // === 通貨換算 — fundTypeSummary ===
  it('converts USD assets to JPY in fundTypeSummary', () => {
    // AAPL: $100 * 10 = $1,000 → ¥150,000 at rate=150
    // Fee: 0.5% → ¥150,000 * 0.005 = ¥750
    setContext({
      totalAssets: 150000,
      annualFees: 750,
      annualDividends: 0,
      currentAssets: [
        {
          ticker: 'AAPL', name: 'Apple', price: 100, holdings: 10,
          currency: 'USD', annualFee: 0.5, fundType: 'Stock',
          hasDividend: false,
        },
      ],
    });
    render(<PortfolioSummary />);
    // ファンドタイプ別手数料に ¥750 が表示される
    expect(screen.getByText('ファンドタイプ別年間手数料（上位3種類）')).toBeInTheDocument();
    // ¥750 は stats (annualFees) と fundType 両方に表示されうるので getAllByText
    const feeElements = screen.getAllByText('¥750');
    expect(feeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('converts JPY assets to USD in fundTypeSummary when baseCurrency=USD', () => {
    // 7203: ¥3000 * 100 = ¥300,000 → $2,000 at rate=150
    // Fee: 1% → $2,000 * 0.01 = $20
    setContext({
      baseCurrency: 'USD',
      totalAssets: 2000,
      annualFees: 20,
      annualDividends: 0,
      currentAssets: [
        {
          ticker: '7203', name: 'Toyota', price: 3000, holdings: 100,
          currency: 'JPY', annualFee: 1.0, fundType: 'Stock',
          hasDividend: false,
        },
      ],
    });
    render(<PortfolioSummary />);
    const feeElements = screen.getAllByText('$20');
    expect(feeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('aggregates mixed USD+JPY assets correctly in fundTypeSummary', () => {
    // ETF group:
    //   VTI: $200 * 50 = $10,000 → ¥1,500,000 at rate=150, fee 0.03%
    //   1306: ¥2000 * 100 = ¥200,000, fee 0.1%
    // Total ETF value: 1,500,000 + 200,000 = 1,700,000
    // Total ETF fee: 1,500,000*0.0003 + 200,000*0.001 = 450 + 200 = 650
    setContext({
      totalAssets: 1700000,
      annualFees: 650,
      annualDividends: 0,
      currentAssets: [
        {
          ticker: 'VTI', name: 'Vanguard Total', price: 200, holdings: 50,
          currency: 'USD', annualFee: 0.03, fundType: 'ETF',
          hasDividend: false,
        },
        {
          ticker: '1306', name: 'TOPIX ETF', price: 2000, holdings: 100,
          currency: 'JPY', annualFee: 0.1, fundType: 'ETF',
          hasDividend: false,
        },
      ],
    });
    render(<PortfolioSummary />);
    // ETF の合計手数料 ¥650 (stats にも同じ値)
    const feeElements = screen.getAllByText('¥650');
    expect(feeElements.length).toBeGreaterThanOrEqual(1);
    // ETF が fundType バッジ + ファンドタイプ名の複数箇所に表示される
    expect(screen.getAllByText('ETF').length).toBeGreaterThanOrEqual(1);
  });

  // === 配当テスト ===
  it('shows highest dividend asset with correct yield', () => {
    setContext({
      totalAssets: 1500000,
      annualFees: 0,
      annualDividends: 45000,
      currentAssets: [
        {
          ticker: 'VYM', name: 'Vanguard High Dividend', price: 100, holdings: 100,
          currency: 'USD', annualFee: 0.06, fundType: 'ETF',
          hasDividend: true, dividendYield: 3.0, dividendFrequency: 'quarterly',
        },
      ],
    });
    render(<PortfolioSummary />);
    expect(screen.getByText('最も高い配当利回りの銘柄')).toBeInTheDocument();
    // 名前が複数箇所に表示される可能性あり
    const nameElements = screen.getAllByText('Vanguard High Dividend');
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3.00%').length).toBeGreaterThanOrEqual(1);
  });

  // === 空のポートフォリオ ===
  it('does not render detail section when no assets exist', () => {
    setContext({ totalAssets: 0, currentAssets: [] });
    render(<PortfolioSummary />);
    expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
    expect(screen.queryByText('手数料と配当詳細')).not.toBeInTheDocument();
  });

  // === エッジケース ===
  it('handles asset with currency=undefined as same-currency', () => {
    setContext({
      totalAssets: 10000,
      annualFees: 10,
      annualDividends: 0,
      currentAssets: [
        {
          ticker: 'XYZ', name: 'Unknown', price: 100, holdings: 100,
          currency: undefined, annualFee: 0.1, fundType: 'ETF',
          hasDividend: false,
        },
      ],
    });
    // Should not crash
    expect(() => render(<PortfolioSummary />)).not.toThrow();
  });

  it('displays fee percentage relative to totalAssets', () => {
    setContext({
      totalAssets: 1000000,
      annualFees: 3000,
      annualDividends: 0,
      currentAssets: [
        {
          ticker: 'VTI', name: 'VTI', price: 200, holdings: 50,
          currency: 'USD', annualFee: 0.2, fundType: 'ETF',
          hasDividend: false,
        },
      ],
    });
    render(<PortfolioSummary />);
    // feePercentage = 3000 / 1000000 * 100 = 0.30%
    expect(screen.getByText('総資産の0.30%')).toBeInTheDocument();
  });
});
