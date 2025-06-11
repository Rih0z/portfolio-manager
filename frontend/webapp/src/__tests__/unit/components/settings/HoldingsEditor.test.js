/**
 * HoldingsEditor.jsx のテストファイル
 * 保有資産の数量編集機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HoldingsEditor from '../../../../components/settings/HoldingsEditor';

// usePortfolioContextフックのモック
const mockUpdateAssetQuantity = jest.fn();
const mockRemoveAsset = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// formattersのモック
jest.mock('../../../../utils/formatters', () => ({
  formatCurrency: jest.fn((value, currency) => {
    if (currency === 'JPY') return `¥${value.toLocaleString()}`;
    return `$${value.toFixed(2)}`;
  }),
  formatNumber: jest.fn((value) => value.toLocaleString())
}));

// コンポーネントのモック
jest.mock('../../../../components/common/ModernCard', () => ({
  __esModule: true,
  default: ({ children, className }) => <div className={className}>{children}</div>
}));

jest.mock('../../../../components/common/ModernButton', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, size, className, disabled }) => (
    <button 
      onClick={onClick} 
      className={`${variant} ${size} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  )
}));

jest.mock('../../../../components/common/ModernForm', () => ({
  ModernInput: ({ value, onChange, type, min, max, step, className, placeholder }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      className={className}
      placeholder={placeholder}
    />
  )
}));

describe('HoldingsEditor Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
  const defaultMockData = {
    currentAssets: [
      {
        id: '1',
        name: '米国株式ETF',
        ticker: 'VTI',
        price: 200,
        currency: 'USD',
        holdings: 100,
        annualFee: 0.03,
        dividendYield: 1.5
      },
      {
        id: '2',
        name: '日本株式インデックス',
        ticker: '2557',
        price: 30000,
        currency: 'JPY',
        holdings: 50,
        annualFee: 0.15,
        dividendYield: 2.0
      }
    ],
    baseCurrency: 'JPY',
    exchangeRate: { rate: 150 },
    updateAssetQuantity: mockUpdateAssetQuantity,
    removeAsset: mockRemoveAsset
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<HoldingsEditor />);
      
      expect(screen.getByText('保有数量編集')).toBeInTheDocument();
      expect(screen.getByText('各銘柄の保有数量を編集します')).toBeInTheDocument();
      expect(screen.getByText('一括更新')).toBeInTheDocument();
    });

    test('全ての保有資産が表示される', () => {
      render(<HoldingsEditor />);
      
      expect(screen.getByText('米国株式ETF')).toBeInTheDocument();
      expect(screen.getByText('VTI')).toBeInTheDocument();
      expect(screen.getByText('日本株式インデックス')).toBeInTheDocument();
      expect(screen.getByText('2557')).toBeInTheDocument();
    });

    test('評価額が正しく表示される', () => {
      render(<HoldingsEditor />);
      
      // VTI: $200 × 100株 = $20,000 = ¥3,000,000
      expect(screen.getByText('¥3,000,000')).toBeInTheDocument();
      // 2557: ¥30,000 × 50株 = ¥1,500,000
      expect(screen.getByText('¥1,500,000')).toBeInTheDocument();
    });

    test('年間手数料が正しく表示される', () => {
      render(<HoldingsEditor />);
      
      // VTI: ¥3,000,000 × 0.03% = ¥900
      expect(screen.getByText('¥900')).toBeInTheDocument();
      // 2557: ¥1,500,000 × 0.15% = ¥2,250
      expect(screen.getByText('¥2,250')).toBeInTheDocument();
    });

    test('年間配当金が正しく表示される', () => {
      render(<HoldingsEditor />);
      
      // VTI: ¥3,000,000 × 1.5% = ¥45,000
      expect(screen.getByText('¥45,000')).toBeInTheDocument();
      // 2557: ¥1,500,000 × 2.0% = ¥30,000
      expect(screen.getByText('¥30,000')).toBeInTheDocument();
    });
  });

  describe('数量編集機能', () => {
    test('保有数量の編集', () => {
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      expect(inputs[0]).toHaveValue(100);
      
      fireEvent.change(inputs[0], { target: { value: '150' } });
      expect(inputs[0]).toHaveValue(150);
    });

    test('数量増減ボタン', () => {
      render(<HoldingsEditor />);
      
      const plusButtons = screen.getAllByText('+');
      const minusButtons = screen.getAllByText('-');
      const inputs = screen.getAllByPlaceholderText('数量');
      
      fireEvent.click(plusButtons[0]);
      expect(inputs[0]).toHaveValue(101);
      
      fireEvent.click(minusButtons[0]);
      expect(inputs[0]).toHaveValue(100);
    });

    test('負の値の防止', () => {
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '-10' } });
      
      expect(inputs[0]).toHaveValue(0);
    });

    test('小数点入力の処理', () => {
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '100.5' } });
      
      expect(inputs[0]).toHaveValue(100.5);
    });

    test('空文字入力の処理', () => {
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '' } });
      
      expect(inputs[0]).toHaveValue(0);
    });
  });

  describe('一括更新機能', () => {
    test('変更された値のみ更新', async () => {
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '150' } });
      
      const updateButton = screen.getByText('一括更新');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(mockUpdateAssetQuantity).toHaveBeenCalledWith('1', 150);
        expect(mockUpdateAssetQuantity).toHaveBeenCalledTimes(1);
      });
    });

    test('複数資産の同時更新', async () => {
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '150' } });
      fireEvent.change(inputs[1], { target: { value: '75' } });
      
      const updateButton = screen.getByText('一括更新');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(mockUpdateAssetQuantity).toHaveBeenCalledWith('1', 150);
        expect(mockUpdateAssetQuantity).toHaveBeenCalledWith('2', 75);
        expect(mockUpdateAssetQuantity).toHaveBeenCalledTimes(2);
      });
    });

    test('更新成功メッセージの表示', async () => {
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '150' } });
      
      const updateButton = screen.getByText('一括更新');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText('保有数量を更新しました')).toBeInTheDocument();
      });
    });

    test('変更がない場合は更新しない', async () => {
      render(<HoldingsEditor />);
      
      const updateButton = screen.getByText('一括更新');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(mockUpdateAssetQuantity).not.toHaveBeenCalled();
        expect(screen.getByText('変更がありません')).toBeInTheDocument();
      });
    });
  });

  describe('削除機能', () => {
    test('資産の削除確認', () => {
      render(<HoldingsEditor />);
      
      const deleteButtons = screen.getAllByText('削除');
      fireEvent.click(deleteButtons[0]);
      
      expect(mockRemoveAsset).toHaveBeenCalledWith('1');
    });

    test('削除時のメッセージ表示', async () => {
      mockRemoveAsset.mockResolvedValue(true);
      
      render(<HoldingsEditor />);
      
      const deleteButtons = screen.getAllByText('削除');
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('銘柄を削除しました')).toBeInTheDocument();
      });
    });
  });

  describe('エッジケース', () => {
    test('資産が存在しない場合', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: []
      });
      
      render(<HoldingsEditor />);
      
      expect(screen.getByText('保有資産がありません。まず銘柄を追加してください。')).toBeInTheDocument();
      expect(screen.queryByText('一括更新')).not.toBeInTheDocument();
    });

    test('価格が0の資産', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [{
          ...defaultMockData.currentAssets[0],
          price: 0
        }]
      });
      
      render(<HoldingsEditor />);
      
      expect(screen.getByText('¥0')).toBeInTheDocument();
    });

    test('配当利回りが未定義の資産', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [{
          ...defaultMockData.currentAssets[0],
          dividendYield: undefined
        }]
      });
      
      render(<HoldingsEditor />);
      
      // 配当金が0として表示される
      expect(screen.getAllByText('¥0').length).toBeGreaterThan(0);
    });

    test('為替レートが未定義の場合', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        exchangeRate: null
      });
      
      render(<HoldingsEditor />);
      
      // デフォルトレート1が使用される
      expect(screen.getByText('米国株式ETF')).toBeInTheDocument();
    });
  });

  describe('メッセージ表示', () => {
    test('成功メッセージの自動消去', async () => {
      jest.useFakeTimers();
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '150' } });
      
      const updateButton = screen.getByText('一括更新');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText('保有数量を更新しました')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('保有数量を更新しました')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    test('エラーメッセージの表示', async () => {
      mockUpdateAssetQuantity.mockRejectedValue(new Error('更新エラー'));
      
      render(<HoldingsEditor />);
      
      const inputs = screen.getAllByPlaceholderText('数量');
      fireEvent.change(inputs[0], { target: { value: '150' } });
      
      const updateButton = screen.getByText('一括更新');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンス', () => {
    test('大量の資産でのレンダリング', () => {
      const manyAssets = Array.from({ length: 50 }, (_, i) => ({
        id: `asset-${i}`,
        name: `資産${i}`,
        ticker: `TICK${i}`,
        price: 1000 * (i + 1),
        currency: 'JPY',
        holdings: 10 * (i + 1),
        annualFee: 0.1,
        dividendYield: 1.0
      }));
      
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: manyAssets
      });
      
      render(<HoldingsEditor />);
      
      expect(screen.getAllByPlaceholderText('数量')).toHaveLength(50);
    });
  });
});