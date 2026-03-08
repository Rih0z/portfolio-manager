/**
 * HoldingsEditor smoke render tests
 *
 * 保有資産エディタの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/settings/HoldingsEditor.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

const mockPortfolioContext: Record<string, any> = {
  currentAssets: [],
  updateHoldings: vi.fn(),
  removeTicker: vi.fn(),
  baseCurrency: 'JPY',
  exchangeRate: { rate: 150 },
};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

vi.mock('../../../../utils/formatters', () => ({
  formatCurrency: (val: number, currency: string) => `${currency} ${val}`,
  formatPercent: (val: number) => `${val}%`,
}));

vi.mock('../../../../utils/fundUtils', () => ({
  FUND_TYPES: { STOCK: 'stock', ETF: 'etf', MUTUAL_FUND: 'mutual_fund' },
}));

// Mock HoldingCard to isolate HoldingsEditor
vi.mock('../../../../components/settings/HoldingCard', () => ({
  default: ({ asset }: any) => (
    <div data-testid="holding-card">{asset.symbol}</div>
  ),
}));

import HoldingsEditor from '../../../../components/settings/HoldingsEditor';

describe('HoldingsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioContext.currentAssets = [];
  });

  it('should render empty state when no assets', () => {
    render(<HoldingsEditor />);
    expect(
      screen.getByText(/保有資産が設定されていません/)
    ).toBeInTheDocument();
  });

  it('should render holding cards when assets exist', () => {
    mockPortfolioContext.currentAssets = [
      {
        id: 'a1',
        symbol: 'AAPL',
        name: 'Apple',
        holdings: 10,
        price: 150,
        currency: 'USD',
      },
      {
        id: 'a2',
        symbol: 'MSFT',
        name: 'Microsoft',
        holdings: 5,
        price: 300,
        currency: 'USD',
      },
    ];

    render(<HoldingsEditor />);
    const cards = screen.getAllByTestId('holding-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
  });

  it('should render info section about fees', () => {
    mockPortfolioContext.currentAssets = [
      {
        id: 'a1',
        symbol: 'VOO',
        name: 'Vanguard S&P 500',
        holdings: 10,
        price: 400,
        currency: 'USD',
      },
    ];

    render(<HoldingsEditor />);
    expect(screen.getByText('手数料・配当情報について')).toBeInTheDocument();
  });
});
