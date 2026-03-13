/**
 * HoldingCard unit tests
 *
 * 保有資産カードのレンダリング・インタラクション・取得単価入力を検証する。
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
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

const mockUseCanUseFeature = vi.fn().mockReturnValue(true);
vi.mock('../../../../hooks/queries/useSubscription', () => ({
  useCanUseFeature: () => mockUseCanUseFeature(),
}));

const mockAddNotification = vi.fn();
vi.mock('../../../../stores/uiStore', () => ({
  useUIStore: (selector: (s: { addNotification: typeof mockAddNotification }) => unknown) =>
    selector({ addNotification: mockAddNotification }),
}));

import HoldingCard from '../../../../components/settings/HoldingCard';

const createAsset = (overrides: Record<string, unknown> = {}) => ({
  id: 'asset-1',
  ticker: 'AAPL',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  holdings: 10,
  price: 150,
  currency: 'USD',
  fundType: 'stock',
  annualFee: 0,
  isStock: true,
  hasDividend: false,
  dividendYield: 0,
  dividendFrequency: undefined as string | undefined,
  purchasePrice: undefined as number | undefined,
  ...overrides,
});

describe('HoldingCard', () => {
  const defaultProps = {
    asset: createAsset(),
    baseCurrency: 'USD',
    exchangeRate: { rate: 150, source: 'Default', lastUpdated: new Date().toISOString() },
    onUpdateHoldings: vi.fn(),
    onUpdatePurchasePrice: vi.fn(),
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCanUseFeature.mockReturnValue(true);
  });

  // --- 基本レンダリング ---

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

  // --- 取得単価: Standard ユーザー ---

  describe('取得単価 (Standard ユーザー)', () => {
    it('should render 取得単価 section for Standard user', () => {
      render(<HoldingCard {...defaultProps} />);
      expect(screen.getByText('取得単価')).toBeInTheDocument();
    });

    it('should show 未設定 when purchasePrice is not set', () => {
      render(<HoldingCard {...defaultProps} />);
      expect(screen.getByText('未設定')).toBeInTheDocument();
    });

    it('should show formatted purchase price when set', () => {
      const props = {
        ...defaultProps,
        asset: createAsset({ purchasePrice: 1000 }),
      };
      render(<HoldingCard {...props} />);
      expect(screen.getByText('$1,000')).toBeInTheDocument();
    });

    it('should show edit button for purchase price', () => {
      render(<HoldingCard {...defaultProps} />);
      expect(screen.getByLabelText('AAPLの取得単価を編集')).toBeInTheDocument();
    });

    it('should show input field when edit button is clicked', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      expect(screen.getByLabelText('AAPLの取得単価')).toBeInTheDocument();
    });

    it('should call onUpdatePurchasePrice with valid value on save', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: '1000' } });
      fireEvent.click(screen.getByText('保存'));
      expect(defaultProps.onUpdatePurchasePrice).toHaveBeenCalledWith('asset-1', 1000);
    });

    it('should call onUpdatePurchasePrice with large value (99999)', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: '99999' } });
      fireEvent.click(screen.getByText('保存'));
      expect(defaultProps.onUpdatePurchasePrice).toHaveBeenCalledWith('asset-1', 99999);
    });

    it('should call onUpdatePurchasePrice with decimal value rounded to 2dp', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: '150.567' } });
      fireEvent.click(screen.getByText('保存'));
      expect(defaultProps.onUpdatePurchasePrice).toHaveBeenCalledWith('asset-1', 150.57);
    });

    it('should call onUpdatePurchasePrice when Enter key is pressed', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: '200' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onUpdatePurchasePrice).toHaveBeenCalledWith('asset-1', 200);
    });

    it('should cancel edit when Escape key is pressed', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(defaultProps.onUpdatePurchasePrice).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('AAPLの取得単価')).not.toBeInTheDocument();
    });

    it('should show success notification after saving', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: '1000' } });
      fireEvent.click(screen.getByText('保存'));
      expect(mockAddNotification).toHaveBeenCalledWith('取得単価を保存しました', 'success');
    });

    it('should close edit mode on cancel without calling onUpdatePurchasePrice', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      fireEvent.click(screen.getByText('キャンセル'));
      expect(defaultProps.onUpdatePurchasePrice).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('AAPLの取得単価')).not.toBeInTheDocument();
    });

    // --- バリデーション ---

    it('should show validation error for value 0', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.click(screen.getByText('保存'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(defaultProps.onUpdatePurchasePrice).not.toHaveBeenCalled();
    });

    it('should show validation error for negative value', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: '-1' } });
      fireEvent.click(screen.getByText('保存'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(defaultProps.onUpdatePurchasePrice).not.toHaveBeenCalled();
    });

    it('should show validation error for NaN input', () => {
      render(<HoldingCard {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('AAPLの取得単価を編集'));
      const input = screen.getByLabelText('AAPLの取得単価');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.click(screen.getByText('保存'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(defaultProps.onUpdatePurchasePrice).not.toHaveBeenCalled();
    });
  });

  // --- 取得単価: Free ユーザー ---

  describe('取得単価 (Free ユーザー)', () => {
    beforeEach(() => {
      mockUseCanUseFeature.mockReturnValue(false);
    });

    it('should show lock UI for Free user', () => {
      render(<HoldingCard {...defaultProps} />);
      expect(screen.getByText('Standard プランで利用可能')).toBeInTheDocument();
    });

    it('should show upgrade button for Free user', () => {
      render(<HoldingCard {...defaultProps} />);
      expect(screen.getByTestId('purchase-price-upgrade-btn')).toBeInTheDocument();
    });

    it('should not show edit button for Free user', () => {
      render(<HoldingCard {...defaultProps} />);
      expect(screen.queryByLabelText('AAPLの取得単価を編集')).not.toBeInTheDocument();
    });
  });

  // --- 通貨換算テスト（9-BX ルール準拠） ---
  describe('通貨換算', () => {
    it('should convert USD asset value to JPY when baseCurrency=JPY', () => {
      // $150 * 10 = $1,500 → ¥225,000 at rate=150
      const props = {
        ...defaultProps,
        baseCurrency: 'JPY',
        asset: createAsset({ price: 150, holdings: 10, currency: 'USD' }),
      };
      render(<HoldingCard {...props} />);
      expect(screen.getByText('¥225,000')).toBeInTheDocument();
    });

    it('should convert JPY asset value to USD when baseCurrency=USD', () => {
      // ¥3000 * 100 = ¥300,000 → $2,000 at rate=150
      const props = {
        ...defaultProps,
        baseCurrency: 'USD',
        asset: createAsset({ ticker: '7203', name: 'Toyota', price: 3000, holdings: 100, currency: 'JPY' }),
      };
      render(<HoldingCard {...props} />);
      expect(screen.getByText('$2,000')).toBeInTheDocument();
    });

    it('should not convert when asset currency matches baseCurrency', () => {
      // $150 * 10 = $1,500 (no conversion)
      const props = {
        ...defaultProps,
        baseCurrency: 'USD',
        asset: createAsset({ price: 150, holdings: 10, currency: 'USD' }),
      };
      render(<HoldingCard {...props} />);
      expect(screen.getByText('$1,500')).toBeInTheDocument();
    });

    it('should handle undefined currency as same-currency (no crash)', () => {
      const props = {
        ...defaultProps,
        baseCurrency: 'USD',
        asset: createAsset({ currency: undefined }),
      };
      expect(() => render(<HoldingCard {...props} />)).not.toThrow();
    });
  });
});
