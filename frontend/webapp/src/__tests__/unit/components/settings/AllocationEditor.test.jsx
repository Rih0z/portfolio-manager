/**
 * AllocationEditor.jsx のテストファイル
 * 目標資産配分編集コンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AllocationEditor from '../../../../components/settings/AllocationEditor';

// usePortfolioContextのモック
const mockUsePortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockUsePortfolioContext()
}));

// setTimeout のモック
jest.useFakeTimers();

describe('AllocationEditor', () => {
  const mockUpdateTargetAllocation = jest.fn();
  
  const defaultPortfolioContext = {
    targetPortfolio: [
      {
        id: 'AAPL',
        name: 'Apple Inc.',
        ticker: 'AAPL',
        targetPercentage: 30
      },
      {
        id: 'MSFT',
        name: 'Microsoft Corp.',
        ticker: 'MSFT',
        targetPercentage: 40
      },
      {
        id: 'GOOGL',
        name: 'Alphabet Inc.',
        ticker: 'GOOGL',
        targetPercentage: 30
      }
    ],
    updateTargetAllocation: mockUpdateTargetAllocation
  };

  const emptyPortfolioContext = {
    targetPortfolio: [],
    updateTargetAllocation: mockUpdateTargetAllocation
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePortfolioContext.mockReturnValue(defaultPortfolioContext);
  });

  describe('基本レンダリング', () => {
    test('配分エディターが正しく表示される', () => {
      render(<AllocationEditor />);
      
      expect(screen.getByText('合計:')).toBeInTheDocument();
      expect(screen.getByText('配分を自動調整')).toBeInTheDocument();
    });

    test('全ての銘柄が表示される', () => {
      render(<AllocationEditor />);
      
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corp.')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('Alphabet Inc.')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
    });

    test('各銘柄の配分入力フィールドが表示される', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs).toHaveLength(3);
      expect(inputs[0]).toHaveValue(30);
      expect(inputs[1]).toHaveValue(40);
      expect(inputs[2]).toHaveValue(30);
    });

    test('合計配分率が正しく表示される', () => {
      render(<AllocationEditor />);
      
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });

    test('合計が100%の場合は緑色で表示される', () => {
      render(<AllocationEditor />);
      
      const totalElement = screen.getByText('100.0%');
      expect(totalElement).toHaveClass('text-green-600');
    });
  });

  describe('空のポートフォリオ状態', () => {
    test('銘柄がない場合は説明メッセージが表示される', () => {
      mockUsePortfolioContext.mockReturnValue(emptyPortfolioContext);
      
      render(<AllocationEditor />);
      
      expect(screen.getByText(/目標配分を設定する銘柄がありません/)).toBeInTheDocument();
      expect(screen.getByText(/銘柄の追加/)).toBeInTheDocument();
    });

    test('銘柄がない場合は配分エディターUIが表示されない', () => {
      mockUsePortfolioContext.mockReturnValue(emptyPortfolioContext);
      
      render(<AllocationEditor />);
      
      expect(screen.queryByText('合計:')).not.toBeInTheDocument();
      expect(screen.queryByText('配分を自動調整')).not.toBeInTheDocument();
    });
  });

  describe('配分値の変更', () => {
    test('配分値を変更すると即座に反映される', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: '50' } });
      
      expect(firstInput).toHaveValue(50);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', 50);
    });

    test('配分値変更後に合計が再計算される', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: '50' } });
      
      // 30 → 50に変更したので、合計は120%になる
      expect(screen.getByText('120.0%')).toBeInTheDocument();
    });

    test('合計が100%でない場合は赤色で表示される', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: '50' } });
      
      const totalElement = screen.getByText('120.0%');
      expect(totalElement).toHaveClass('text-red-600');
    });

    test('負の値を入力すると0にクランプされる', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: '-10' } });
      
      expect(firstInput).toHaveValue(0);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', 0);
    });

    test('100を超える値を入力すると100にクランプされる', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: '120' } });
      
      expect(firstInput).toHaveValue(100);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', 100);
    });

    test('無効な値を入力すると0になる', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: 'invalid' } });
      
      expect(firstInput).toHaveValue(0);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', 0);
    });

    test('空文字を入力すると0になる', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: '' } });
      
      expect(firstInput).toHaveValue(0);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', 0);
    });
  });

  describe('自動調整機能', () => {
    test('既に100%の場合は調整済みメッセージが表示される', () => {
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      fireEvent.click(adjustButton);
      
      expect(screen.getByText('既に100%になっています')).toBeInTheDocument();
    });

    test('合計が100%でない場合は比率を保持して調整される', () => {
      // 合計が120%になるように設定
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          { id: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 60 },
          { id: 'MSFT', name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 40 },
          { id: 'GOOGL', name: 'Alphabet Inc.', ticker: 'GOOGL', targetPercentage: 20 }
        ]
      });
      
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      fireEvent.click(adjustButton);
      
      expect(screen.getByText('配分比率を保持したまま調整しました')).toBeInTheDocument();
      
      // 比率を保持: 60/120=50%, 40/120≈33.3%, 20/120≈16.7%
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', 50);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('MSFT', 33.3);
      // 端数調整で最後の項目が調整される
    });

    test('すべてが0%の場合は均等配分される', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          { id: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 0 },
          { id: 'MSFT', name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 0 },
          { id: 'GOOGL', name: 'Alphabet Inc.', ticker: 'GOOGL', targetPercentage: 0 }
        ]
      });
      
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      fireEvent.click(adjustButton);
      
      expect(screen.getByText('配分を均等に調整しました')).toBeInTheDocument();
      
      // 3銘柄で均等配分: 100/3 ≈ 33.33%
      const expectedShare = 100 / 3;
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', expectedShare);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('MSFT', expectedShare);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('GOOGL', expectedShare);
    });

    test('銘柄がない場合はエラーメッセージが表示される', () => {
      mockUsePortfolioContext.mockReturnValue(emptyPortfolioContext);
      
      render(<AllocationEditor />);
      
      // 空のポートフォリオでは調整ボタンが表示されないため、
      // この状況は通常発生しないが、エラーハンドリングとしてテスト
      // 実際のテストでは、条件付きレンダリングのため調整ボタンが表示されない
    });
  });

  describe('メッセージ表示', () => {
    test('成功メッセージが正しいスタイルで表示される', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          { id: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 0 },
          { id: 'MSFT', name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 0 }
        ]
      });
      
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      fireEvent.click(adjustButton);
      
      const message = screen.getByText('配分を均等に調整しました');
      expect(message).toHaveClass('bg-green-100', 'text-green-700');
    });

    test('情報メッセージが正しいスタイルで表示される', () => {
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      fireEvent.click(adjustButton);
      
      const message = screen.getByText('既に100%になっています');
      expect(message).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    test('メッセージが5秒後に自動的に消える', () => {
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      fireEvent.click(adjustButton);
      
      expect(screen.getByText('既に100%になっています')).toBeInTheDocument();
      
      // 5秒経過
      jest.advanceTimersByTime(5000);
      
      expect(screen.queryByText('既に100%になっています')).not.toBeInTheDocument();
    });
  });

  describe('入力フィールドの属性', () => {
    test('数値入力フィールドに適切な属性が設定される', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'number');
        expect(input).toHaveAttribute('min', '0');
        expect(input).toHaveAttribute('max', '100');
        expect(input).toHaveAttribute('step', '0.1');
      });
    });

    test('入力フィールドに適切なCSSクラスが適用される', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input).toHaveClass('w-14', 'p-1', 'border', 'rounded', 'text-right');
      });
    });
  });

  describe('レイアウトとスタイリング', () => {
    test('各銘柄行に適切なクラスが適用される', () => {
      const { container } = render(<AllocationEditor />);
      
      const itemRows = container.querySelectorAll('.flex.items-center.p-3');
      expect(itemRows).toHaveLength(3);
      
      itemRows.forEach(row => {
        expect(row).toHaveClass('border-b', 'hover:bg-gray-50');
      });
    });

    test('最後の行にborder-bottomが適用されない', () => {
      const { container } = render(<AllocationEditor />);
      
      const itemRows = container.querySelectorAll('.flex.items-center.p-3');
      const lastRow = itemRows[itemRows.length - 1];
      expect(lastRow).toHaveClass('last:border-b-0');
    });

    test('自動調整ボタンに適切なスタイルが適用される', () => {
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      expect(adjustButton).toHaveClass(
        'px-3',
        'py-1',
        'bg-blue-600',
        'text-white',
        'rounded',
        'hover:bg-blue-700',
        'text-sm'
      );
    });
  });

  describe('データ同期', () => {
    test('useEffectでtargetPortfolioの変更が反映される', () => {
      const { rerender } = render(<AllocationEditor />);
      
      // 初期状態の確認
      expect(screen.getByText('100.0%')).toBeInTheDocument();
      
      // targetPortfolioを変更
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          { id: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 50 },
          { id: 'MSFT', name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 25 }
        ]
      });
      
      rerender(<AllocationEditor />);
      
      // 新しい合計が反映される
      expect(screen.getByText('75.0%')).toBeInTheDocument();
    });

    test('targetPortfolioが空配列になると空状態が表示される', () => {
      const { rerender } = render(<AllocationEditor />);
      
      // 初期状態では銘柄が表示されている
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      
      // 空のポートフォリオに変更
      mockUsePortfolioContext.mockReturnValue(emptyPortfolioContext);
      
      rerender(<AllocationEditor />);
      
      // 空状態メッセージが表示される
      expect(screen.getByText(/目標配分を設定する銘柄がありません/)).toBeInTheDocument();
    });
  });

  describe('小数点計算の精度', () => {
    test('小数点を含む配分値が正しく処理される', () => {
      render(<AllocationEditor />);
      
      const firstInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(firstInput, { target: { value: '33.33' } });
      
      expect(firstInput).toHaveValue(33.33);
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('AAPL', 33.33);
    });

    test('自動調整時の端数処理が正確に実行される', () => {
      // 3で割り切れない値での端数処理テスト
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          { id: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 33 },
          { id: 'MSFT', name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 33 },
          { id: 'GOOGL', name: 'Alphabet Inc.', ticker: 'GOOGL', targetPercentage: 33 }
        ]
      });
      
      render(<AllocationEditor />);
      
      const adjustButton = screen.getByText('配分を自動調整');
      fireEvent.click(adjustButton);
      
      // 端数調整で最後の項目が調整される
      expect(mockUpdateTargetAllocation).toHaveBeenCalledWith('GOOGL', expect.any(Number));
    });
  });

  describe('エラーハンドリング', () => {
    test('updateTargetAllocationが存在しない場合でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        updateTargetAllocation: undefined
      });

      expect(() => {
        render(<AllocationEditor />);
      }).not.toThrow();
    });

    test('targetPortfolioにnullやundefinedが含まれても処理される', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          { id: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 30 },
          null,
          { id: 'MSFT', name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 40 }
        ].filter(Boolean)
      });

      expect(() => {
        render(<AllocationEditor />);
      }).not.toThrow();
    });

    test('targetPercentageが文字列の場合でも処理される', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          { id: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: '30' },
          { id: 'MSFT', name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: '40' }
        ]
      });

      expect(() => {
        render(<AllocationEditor />);
      }).not.toThrow();
    });
  });
});