/**
 * HoldingCard smoke render tests
 *
 * 保有資産カードの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/settings/HoldingCard.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

vi.mock('../../../../utils/formatters', () => ({
  formatCurrency: (val: number, currency: string) =>
    `${currency === 'JPY' ? '¥' : '$'}${val.toLocaleString()}`,
  formatPercent: (val: number, decimals: number) => `${val.toFixed(decimals)}%`,
}));

vi.mock('../../../../utils/fundUtils', () => ({
  FUND_TYPES: { STOCK: 'stock', ETF: 'etf', MUTUAL_FUND: 'mutual_fund' },
}));

vi.mock('../../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: (code: string) => code,
}));

import HoldingCard from '../../../../components/settings/HoldingCard';

const createAsset = (overrides: Record<string, any> = {}) => ({
  id: 'asset-1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  holdings: 10,
  price: 150,
  currency: 'USD',
  fundType: 'stock',
  isStock: true,
  annualFee: 0,
  hasDividend: false,
  dividendYield: 0,
  dividendFrequency: null,
  ...overrides,
});

describe('HoldingCard', () => {
  const defaultProps = {
    asset: createAsset(),
    baseCurrency: 'USD',
    exchangeRate: { rate: 150 },
    onUpdateHoldings: vi.fn(),
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render asset symbol and name', () => {
    render(<HoldingCard {...defaultProps} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  it('should render currency badge', () => {
    render(<HoldingCard {...defaultProps} />);
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('should render holdings quantity', () => {
    render(<HoldingCard {...defaultProps} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should render increment/decrement buttons', () => {
    render(<HoldingCard {...defaultProps} />);
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('should call onUpdateHoldings when +1 is clicked', () => {
    render(<HoldingCard {...defaultProps} />);
    fireEvent.click(screen.getByText('+1'));
    expect(defaultProps.onUpdateHoldings).toHaveBeenCalledWith('asset-1', 11);
  });

  it('should render delete button with aria-label', () => {
    render(<HoldingCard {...defaultProps} />);
    expect(screen.getByLabelText('AAPLを削除')).toBeInTheDocument();
  });

  it('should show dividend frequency when available', () => {
    const props = {
      ...defaultProps,
      asset: createAsset({
        hasDividend: true,
        dividendYield: 2.5,
        dividendFrequency: 'quarterly',
      }),
    };
    render(<HoldingCard {...props} />);
    expect(screen.getByText('四半期')).toBeInTheDocument();
  });
});
