/**
 * ModernHoldingCard.jsx のテストファイル
 * 個別保有資産表示カードコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModernHoldingCard from '../../../../components/settings/ModernHoldingCard';

// formattersのモック
jest.mock('../../../../utils/formatters', () => ({
  formatCurrency: jest.fn((value, currency) => {
    if (currency === 'JPY') return `¥${value.toLocaleString()}`;
    return `$${value.toFixed(2)}`;
  }),
  formatNumber: jest.fn((value) => value.toLocaleString()),
  formatPercent: jest.fn((value) => `${(value * 100).toFixed(2)}%`)
}));

// japaneseStockNamesのモック
jest.mock('../../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: jest.fn((ticker) => {
    const names = {
      '2557': 'S&P500 ETF',
      '7203': 'トヨタ自動車',
      '9984': 'ソフトバンクグループ'
    };
    return names[ticker] || null;
  })
}));

// コンポーネントのモック
jest.mock('../../../../components/common/ModernCard', () => ({
  __esModule: true,
  default: ({ children, className, hover, animate }) => (
    <div className={`card ${className} ${hover} ${animate}`}>{children}</div>
  )
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

jest.mock('../../../../components/common/ModernInput', () => ({
  __esModule: true,
  default: ({ value, onChange, type, min, step, className, placeholder, autoFocus, onKeyPress }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      min={min}
      step={step}
      className={className}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyPress={onKeyPress}
    />
  )
}));

describe('ModernHoldingCard Component', () => {
  const defaultProps = {
    asset: {
      id: '1',
      name: '米国株式ETF',
      ticker: 'VTI',
      price: 200,
      currency: 'USD',
      holdings: 100,
      annualFee: 0.03,
      dividendYield: 1.5
    },
    baseCurrency: 'JPY',
    exchangeRate: 150,
    onQuantityChange: jest.fn(),
    onRemove: jest.fn()
  };

  const japaneseAssetProps = {
    ...defaultProps,
    asset: {
      id: '2',
      name: 'S&P500連動ETF',
      ticker: '2557',
      price: 30000,
      currency: 'JPY',
      holdings: 50,
      annualFee: 0.15,
      dividendYield: 2.0
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('レンダリング', () => {
    test('基本情報が正しく表示される', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      expect(screen.getByText('米国株式ETF')).toBeInTheDocument();
      expect(screen.getByText('VTI')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('日本株名が表示される', () => {
      render(<ModernHoldingCard {...japaneseAssetProps} />);
      
      expect(screen.getByText('S&P500 ETF')).toBeInTheDocument();
      expect(screen.getByText('2557')).toBeInTheDocument();
    });

    test('評価額が正しく計算・表示される', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      // $200 × 100株 × 150円/$ = ¥3,000,000
      expect(screen.getByText('評価額: ¥3,000,000')).toBeInTheDocument();
    });

    test('年間手数料が正しく計算・表示される', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      // ¥3,000,000 × 0.03% = ¥900
      expect(screen.getByText('手数料: ¥900/年')).toBeInTheDocument();
    });

    test('配当金が正しく計算・表示される', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      // ¥3,000,000 × 1.5% = ¥45,000
      expect(screen.getByText('配当: ¥45,000/年')).toBeInTheDocument();
    });
  });

  describe('編集機能', () => {
    test('編集モードへの切り替え', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      expect(screen.getByPlaceholderText('数量')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    test('数量の編集と保存', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      const input = screen.getByPlaceholderText('数量');
      fireEvent.change(input, { target: { value: '150' } });
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      expect(defaultProps.onQuantityChange).toHaveBeenCalledWith('1', 150);
    });

    test('編集のキャンセル', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      const input = screen.getByPlaceholderText('数量');
      fireEvent.change(input, { target: { value: '150' } });
      
      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);
      
      expect(defaultProps.onQuantityChange).not.toHaveBeenCalled();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('Enterキーでの保存', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      const input = screen.getByPlaceholderText('数量');
      fireEvent.change(input, { target: { value: '150' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });
      
      expect(defaultProps.onQuantityChange).toHaveBeenCalledWith('1', 150);
    });

    test('Escキーでのキャンセル', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      const input = screen.getByPlaceholderText('数量');
      fireEvent.change(input, { target: { value: '150' } });
      fireEvent.keyPress(input, { key: 'Escape', code: 27, charCode: 27 });
      
      expect(defaultProps.onQuantityChange).not.toHaveBeenCalled();
    });

    test('数量増減ボタン', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const plusButton = screen.getByText('+');
      const minusButton = screen.getByText('-');
      
      fireEvent.click(plusButton);
      expect(defaultProps.onQuantityChange).toHaveBeenCalledWith('1', 101);
      
      fireEvent.click(minusButton);
      expect(defaultProps.onQuantityChange).toHaveBeenCalledWith('1', 99);
    });

    test('数量が0の時のマイナスボタン無効化', () => {
      const zeroHoldingsProps = {
        ...defaultProps,
        asset: { ...defaultProps.asset, holdings: 0 }
      };
      
      render(<ModernHoldingCard {...zeroHoldingsProps} />);
      
      const minusButton = screen.getByText('-');
      expect(minusButton).toBeDisabled();
    });
  });

  describe('削除機能', () => {
    test('削除ボタンのクリック', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);
      
      expect(defaultProps.onRemove).toHaveBeenCalledWith('1');
    });
  });

  describe('通貨と為替レート', () => {
    test('JPY資産（為替レート不要）', () => {
      render(<ModernHoldingCard {...japaneseAssetProps} />);
      
      // ¥30,000 × 50株 = ¥1,500,000
      expect(screen.getByText('評価額: ¥1,500,000')).toBeInTheDocument();
    });

    test('USD資産（為替レート適用）', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      // $200 × 100株 × 150円/$ = ¥3,000,000
      expect(screen.getByText('評価額: ¥3,000,000')).toBeInTheDocument();
    });

    test('為替レートが1の場合', () => {
      const props = { ...defaultProps, exchangeRate: 1 };
      render(<ModernHoldingCard {...props} />);
      
      // $200 × 100株 × 1円/$ = ¥20,000
      expect(screen.getByText('評価額: ¥20,000')).toBeInTheDocument();
    });

    test('baseCurrencyがUSDの場合', () => {
      const props = { ...defaultProps, baseCurrency: 'USD' };
      render(<ModernHoldingCard {...props} />);
      
      // $200 × 100株 = $20,000.00
      expect(screen.getByText('評価額: $20,000.00')).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    test('価格が0の場合', () => {
      const props = {
        ...defaultProps,
        asset: { ...defaultProps.asset, price: 0 }
      };
      render(<ModernHoldingCard {...props} />);
      
      expect(screen.getByText('評価額: ¥0')).toBeInTheDocument();
    });

    test('手数料が未定義の場合', () => {
      const props = {
        ...defaultProps,
        asset: { ...defaultProps.asset, annualFee: undefined }
      };
      render(<ModernHoldingCard {...props} />);
      
      expect(screen.getByText('手数料: ¥0/年')).toBeInTheDocument();
    });

    test('配当利回りが未定義の場合', () => {
      const props = {
        ...defaultProps,
        asset: { ...defaultProps.asset, dividendYield: undefined }
      };
      render(<ModernHoldingCard {...props} />);
      
      expect(screen.getByText('配当: ¥0/年')).toBeInTheDocument();
    });

    test('小数点を含む保有数量', () => {
      const props = {
        ...defaultProps,
        asset: { ...defaultProps.asset, holdings: 100.5 }
      };
      render(<ModernHoldingCard {...props} />);
      
      expect(screen.getByText('100.5')).toBeInTheDocument();
    });

    test('非常に大きな数値', () => {
      const props = {
        ...defaultProps,
        asset: { 
          ...defaultProps.asset, 
          price: 1000000,
          holdings: 10000
        }
      };
      render(<ModernHoldingCard {...props} />);
      
      // $1,000,000 × 10,000株 × 150円/$ = ¥1,500,000,000,000
      expect(screen.getByText(/評価額:/)).toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    test('負の数量入力の防止', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      const input = screen.getByPlaceholderText('数量');
      fireEvent.change(input, { target: { value: '-10' } });
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      expect(defaultProps.onQuantityChange).toHaveBeenCalledWith('1', 0);
    });

    test('文字列入力の処理', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      const input = screen.getByPlaceholderText('数量');
      fireEvent.change(input, { target: { value: 'abc' } });
      
      expect(input.value).toBe('0');
    });

    test('空文字入力の処理', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);
      
      const input = screen.getByPlaceholderText('数量');
      fireEvent.change(input, { target: { value: '' } });
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      expect(defaultProps.onQuantityChange).toHaveBeenCalledWith('1', 0);
    });
  });

  describe('アニメーション', () => {
    test('ホバー効果の適用', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const card = screen.getByText('米国株式ETF').closest('.card');
      expect(card).toHaveClass('true'); // hover prop
    });

    test('アニメーション効果の適用', () => {
      render(<ModernHoldingCard {...defaultProps} />);
      
      const card = screen.getByText('米国株式ETF').closest('.card');
      expect(card).toHaveClass('fadeIn'); // animate prop
    });
  });
});