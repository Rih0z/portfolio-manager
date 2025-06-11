/**
 * AllocationEditor.jsx のテストファイル
 * 目標資産配分の編集機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AllocationEditor from '../../../../components/settings/AllocationEditor';

// usePortfolioContextフックのモック
const mockUpdateTargetAllocation = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

describe('AllocationEditor Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
  const defaultMockData = {
    targetPortfolio: [
      { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 40 },
      { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 30 },
      { id: '3', name: '新興国株式', ticker: 'VWO', targetPercentage: 30 }
    ],
    updateTargetAllocation: mockUpdateTargetAllocation
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<AllocationEditor />);
      
      expect(screen.getByText('目標配分')).toBeInTheDocument();
      expect(screen.getByText('各銘柄の目標配分を設定します（合計100%になるように調整されます）')).toBeInTheDocument();
      expect(screen.getByText('配分を保存')).toBeInTheDocument();
      expect(screen.getByText('リセット')).toBeInTheDocument();
    });

    test('全ての銘柄が表示される', () => {
      render(<AllocationEditor />);
      
      expect(screen.getByText('米国株式ETF (VTI)')).toBeInTheDocument();
      expect(screen.getByText('日本株式インデックス (2557)')).toBeInTheDocument();
      expect(screen.getByText('新興国株式 (VWO)')).toBeInTheDocument();
    });

    test('初期配分が正しく表示される', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(40);
      expect(inputs[1]).toHaveValue(30);
      expect(inputs[2]).toHaveValue(30);
    });

    test('合計配分が表示される', () => {
      render(<AllocationEditor />);
      
      expect(screen.getByText('合計: 100.0%')).toBeInTheDocument();
    });
  });

  describe('配分編集機能', () => {
    test('配分値の変更', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '50' } });
      
      expect(inputs[0]).toHaveValue(50);
      expect(screen.getByText('合計: 110.0%')).toBeInTheDocument();
    });

    test('配分の自動調整（100%に正規化）', async () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '60' } });
      fireEvent.change(inputs[1], { target: { value: '30' } });
      fireEvent.change(inputs[2], { target: { value: '30' } });
      
      const saveButton = screen.getByText('配分を保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateTargetAllocation).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: '1', targetPercentage: 50 }), // 60/120 = 50%
            expect.objectContaining({ id: '2', targetPercentage: 25 }), // 30/120 = 25%
            expect.objectContaining({ id: '3', targetPercentage: 25 })  // 30/120 = 25%
          ])
        );
      });
    });

    test('負の値の処理', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '-10' } });
      
      expect(inputs[0]).toHaveValue(0);
    });

    test('最大値制限（100以上）', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '150' } });
      
      expect(inputs[0]).toHaveValue(100);
    });

    test('小数点入力の処理', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '33.33' } });
      
      expect(inputs[0]).toHaveValue(33.33);
    });

    test('空文字入力の処理', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '' } });
      
      expect(inputs[0]).toHaveValue(0);
    });
  });

  describe('保存機能', () => {
    test('配分保存の成功', async () => {
      render(<AllocationEditor />);
      
      const saveButton = screen.getByText('配分を保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateTargetAllocation).toHaveBeenCalled();
        expect(screen.getByText('配分を保存しました')).toBeInTheDocument();
      });
    });

    test('配分が0%の場合の警告', async () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '0' } });
      fireEvent.change(inputs[1], { target: { value: '0' } });
      fireEvent.change(inputs[2], { target: { value: '0' } });
      
      const saveButton = screen.getByText('配分を保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateTargetAllocation).not.toHaveBeenCalled();
        expect(screen.getByText('少なくとも1つの銘柄に配分を設定してください')).toBeInTheDocument();
      });
    });

    test('保存成功メッセージの自動消去', async () => {
      jest.useFakeTimers();
      render(<AllocationEditor />);
      
      const saveButton = screen.getByText('配分を保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('配分を保存しました')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('配分を保存しました')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });

  describe('リセット機能', () => {
    test('配分のリセット', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '50' } });
      fireEvent.change(inputs[1], { target: { value: '25' } });
      
      const resetButton = screen.getByText('リセット');
      fireEvent.click(resetButton);
      
      expect(inputs[0]).toHaveValue(40);
      expect(inputs[1]).toHaveValue(30);
      expect(inputs[2]).toHaveValue(30);
    });
  });

  describe('合計表示', () => {
    test('100%の場合の表示', () => {
      render(<AllocationEditor />);
      
      expect(screen.getByText('合計: 100.0%')).toHaveClass('text-green-600');
    });

    test('100%未満の場合の表示', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '30' } });
      
      expect(screen.getByText('合計: 90.0%')).toHaveClass('text-yellow-600');
    });

    test('100%超過の場合の表示', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '50' } });
      
      expect(screen.getByText('合計: 110.0%')).toHaveClass('text-red-600');
    });
  });

  describe('エッジケース', () => {
    test('銘柄が存在しない場合', () => {
      usePortfolioContext.mockReturnValue({
        targetPortfolio: [],
        updateTargetAllocation: mockUpdateTargetAllocation
      });
      
      render(<AllocationEditor />);
      
      expect(screen.getByText('設定する銘柄がありません。まず銘柄を追加してください。')).toBeInTheDocument();
      expect(screen.queryByText('配分を保存')).not.toBeInTheDocument();
    });

    test('1銘柄のみの場合', () => {
      usePortfolioContext.mockReturnValue({
        targetPortfolio: [
          { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 100 }
        ],
        updateTargetAllocation: mockUpdateTargetAllocation
      });
      
      render(<AllocationEditor />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue(100);
      
      // 1銘柄の場合でも編集可能
      fireEvent.change(input, { target: { value: '50' } });
      expect(input).toHaveValue(50);
    });

    test('非常に小さい配分値', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '0.01' } });
      
      expect(inputs[0]).toHaveValue(0.01);
    });

    test('文字列入力の処理', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: 'abc' } });
      
      expect(inputs[0]).toHaveValue(0);
    });
  });

  describe('アクセシビリティ', () => {
    test('入力フィールドのラベル', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveAttribute('aria-label', '米国株式ETF (VTI)の配分');
      expect(inputs[1]).toHaveAttribute('aria-label', '日本株式インデックス (2557)の配分');
      expect(inputs[2]).toHaveAttribute('aria-label', '新興国株式 (VWO)の配分');
    });

    test('入力フィールドの属性', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'number');
        expect(input).toHaveAttribute('min', '0');
        expect(input).toHaveAttribute('max', '100');
        expect(input).toHaveAttribute('step', '0.01');
      });
    });

    test('キーボード操作', () => {
      render(<AllocationEditor />);
      
      const inputs = screen.getAllByRole('spinbutton');
      const saveButton = screen.getByText('配分を保存');
      
      // Tab キーでフォーカス移動できることを確認
      inputs[0].focus();
      expect(document.activeElement).toBe(inputs[0]);
      
      // Enter キーで保存できることを確認
      fireEvent.keyPress(inputs[0], { key: 'Enter', code: 13, charCode: 13 });
      // 注: 実際の実装によっては、Enter キーでの保存がサポートされていない可能性があります
    });
  });
});