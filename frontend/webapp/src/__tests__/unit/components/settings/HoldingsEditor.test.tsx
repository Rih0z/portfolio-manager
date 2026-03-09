/**
 * HoldingsEditor テスト
 *
 * 保有資産エディタの基本レンダリング + ConfirmDialog削除フローを検証する。
 * @file src/__tests__/unit/components/settings/HoldingsEditor.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

const mockRemoveTicker = vi.fn();
const mockUpdateHoldings = vi.fn();

const mockPortfolioContext: Record<string, any> = {
  currentAssets: [],
  updateHoldings: mockUpdateHoldings,
  removeTicker: mockRemoveTicker,
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

// Mock HoldingCard — expose onRemove callback for interaction testing
vi.mock('../../../../components/settings/HoldingCard', () => ({
  default: ({ asset, onRemove }: any) => (
    <div data-testid="holding-card">
      <span>{asset.symbol}</span>
      <button
        data-testid={`delete-btn-${asset.id}`}
        onClick={() => onRemove(asset.id, asset.name)}
      >
        削除
      </button>
    </div>
  ),
}));

import HoldingsEditor from '../../../../components/settings/HoldingsEditor';

const sampleAssets = [
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

describe('HoldingsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioContext.currentAssets = [];
  });

  describe('基本レンダリング', () => {
    it('should render empty state when no assets', () => {
      render(<HoldingsEditor />);
      expect(
        screen.getByText(/保有資産が設定されていません/)
      ).toBeInTheDocument();
    });

    it('should render holding cards when assets exist', () => {
      mockPortfolioContext.currentAssets = sampleAssets;

      render(<HoldingsEditor />);
      const cards = screen.getAllByTestId('holding-card');
      expect(cards).toHaveLength(2);
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('should render info section about fees', () => {
      mockPortfolioContext.currentAssets = [sampleAssets[0]];

      render(<HoldingsEditor />);
      expect(screen.getByText('手数料・配当情報について')).toBeInTheDocument();
    });
  });

  describe('ConfirmDialog 削除フロー', () => {
    beforeEach(() => {
      mockPortfolioContext.currentAssets = sampleAssets;
    });

    it('削除ボタンをクリックすると確認ダイアログが表示される', () => {
      render(<HoldingsEditor />);

      fireEvent.click(screen.getByTestId('delete-btn-a1'));

      // ConfirmDialog の内容が表示される
      expect(screen.getByText('銘柄の削除')).toBeInTheDocument();
      expect(screen.getByText('Appleを削除してもよろしいですか？')).toBeInTheDocument();
    });

    it('確認ダイアログで「削除」をクリックするとremoveTickerが呼ばれる', () => {
      render(<HoldingsEditor />);

      // ダイアログを開く
      fireEvent.click(screen.getByTestId('delete-btn-a1'));

      // ConfirmDialogの「削除」ボタンをクリック（dialog内のボタンをテキストで特定）
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByText('削除'));

      expect(mockRemoveTicker).toHaveBeenCalledWith('a1');
    });

    it('確認ダイアログで「キャンセル」をクリックするとremoveTickerは呼ばれない', () => {
      render(<HoldingsEditor />);

      // ダイアログを開く
      fireEvent.click(screen.getByTestId('delete-btn-a1'));

      // 「キャンセル」ボタンをクリック
      fireEvent.click(screen.getByText('キャンセル'));

      expect(mockRemoveTicker).not.toHaveBeenCalled();

      // ダイアログが閉じる
      expect(screen.queryByText('Appleを削除してもよろしいですか？')).not.toBeInTheDocument();
    });

    it('削除確認後に成功メッセージが表示される', () => {
      render(<HoldingsEditor />);

      // ダイアログを開く → 確認
      fireEvent.click(screen.getByTestId('delete-btn-a1'));
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByText('削除'));

      // 成功メッセージの確認
      expect(screen.getByText('Appleを削除しました')).toBeInTheDocument();
    });

    it('異なる銘柄の削除で正しい名前が表示される', () => {
      render(<HoldingsEditor />);

      fireEvent.click(screen.getByTestId('delete-btn-a2'));

      expect(screen.getByText('Microsoftを削除してもよろしいですか？')).toBeInTheDocument();
    });
  });
});
