/**
 * BudgetInput.jsx のテストファイル
 * 追加投資シミュレーション予算入力コンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BudgetInput from '../../../../components/simulation/BudgetInput';

// usePortfolioContextのモック
const mockUsePortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockUsePortfolioContext()
}));

describe('BudgetInput', () => {
  const mockSetAdditionalBudget = jest.fn();
  
  const defaultPortfolioContext = {
    additionalBudget: { amount: 300000, currency: 'JPY' },
    setAdditionalBudget: mockSetAdditionalBudget,
    baseCurrency: 'JPY'
  };

  const usdPortfolioContext = {
    additionalBudget: { amount: 2000, currency: 'USD' },
    setAdditionalBudget: mockSetAdditionalBudget,
    baseCurrency: 'USD'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePortfolioContext.mockReturnValue(defaultPortfolioContext);
  });

  describe('基本レンダリング', () => {
    test('コンポーネントが正しく表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByText('追加投資シミュレーション')).toBeInTheDocument();
      expect(screen.getByText('予算通貨')).toBeInTheDocument();
      expect(screen.getByText('追加予算')).toBeInTheDocument();
      expect(screen.getByText('予算プリセット')).toBeInTheDocument();
    });

    test('通貨選択ラジオボタンが表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByDisplayValue('JPY')).toBeInTheDocument();
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
      expect(screen.getByText('円 (¥)')).toBeInTheDocument();
      expect(screen.getByText('ドル ($)')).toBeInTheDocument();
    });

    test('予算入力フィールドが表示される', () => {
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toBeInTheDocument();
      expect(budgetInput).toHaveAttribute('type', 'number');
      expect(budgetInput).toHaveAttribute('min', '0');
    });

    test('増減ボタンが表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByLabelText('予算を減らす')).toBeInTheDocument();
      expect(screen.getByLabelText('予算を増やす')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    test('適用ボタンが表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByText('適用')).toBeInTheDocument();
    });

    test('現在の設定が表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByText('現在の設定:')).toBeInTheDocument();
      expect(screen.getByText('追加予算: ¥300,000 JPY')).toBeInTheDocument();
    });
  });

  describe('初期状態', () => {
    test('JPY通貨でデフォルト値が設定される', () => {
      render(<BudgetInput />);
      
      const jpyRadio = screen.getByDisplayValue('JPY');
      expect(jpyRadio).toBeChecked();
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(300000);
    });

    test('USD基準通貨の場合、USD通貨が選択される', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      const usdRadio = screen.getByDisplayValue('USD');
      expect(usdRadio).toBeChecked();
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(2000);
    });

    test('additionalBudgetが0の場合のデフォルト値', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: { amount: 0, currency: 'JPY' }
      });
      
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(0);
    });
  });

  describe('通貨変更', () => {
    test('JPYからUSDに変更すると適切な初期値が設定される', () => {
      render(<BudgetInput />);
      
      const usdRadio = screen.getByDisplayValue('USD');
      fireEvent.click(usdRadio);
      
      expect(usdRadio).toBeChecked();
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(1000); // USD初期値
    });

    test('USDからJPYに変更すると適切な初期値が設定される', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: { amount: 500, currency: 'USD' }
      });
      
      render(<BudgetInput />);
      
      const jpyRadio = screen.getByDisplayValue('JPY');
      fireEvent.click(jpyRadio);
      
      expect(jpyRadio).toBeChecked();
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(100000); // JPY初期値
    });

    test('高額USD値からJPYに変更しても初期値が設定されない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: { amount: 50, currency: 'USD' }
      });
      
      render(<BudgetInput />);
      
      const jpyRadio = screen.getByDisplayValue('JPY');
      fireEvent.click(jpyRadio);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(50); // 元の値を保持
    });

    test('低額JPY値からUSDに変更すると初期値が設定されない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: { amount: 50000, currency: 'JPY' }
      });
      
      render(<BudgetInput />);
      
      const usdRadio = screen.getByDisplayValue('USD');
      fireEvent.click(usdRadio);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(1000); // USD初期値
    });
  });

  describe('通貨記号の表示', () => {
    test('JPY選択時に円記号が表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByText('¥')).toBeInTheDocument();
    });

    test('USD選択時にドル記号が表示される', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      expect(screen.getByText('$')).toBeInTheDocument();
    });
  });

  describe('予算入力', () => {
    test('予算額を直接入力できる', () => {
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      fireEvent.change(budgetInput, { target: { value: '500000' } });
      
      expect(budgetInput).toHaveValue(500000);
    });

    test('無効な値を入力すると0になる', () => {
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      fireEvent.change(budgetInput, { target: { value: 'invalid' } });
      
      expect(budgetInput).toHaveValue(0);
    });

    test('空文字を入力すると0になる', () => {
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      fireEvent.change(budgetInput, { target: { value: '' } });
      
      expect(budgetInput).toHaveValue(0);
    });
  });

  describe('増減ボタン', () => {
    test('JPY通貨で増加ボタンを押すと10,000円増加する', () => {
      render(<BudgetInput />);
      
      const increaseButton = screen.getByLabelText('予算を増やす');
      fireEvent.click(increaseButton);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(310000); // 300000 + 10000
    });

    test('JPY通貨で減少ボタンを押すと10,000円減少する', () => {
      render(<BudgetInput />);
      
      const decreaseButton = screen.getByLabelText('予算を減らす');
      fireEvent.click(decreaseButton);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(290000); // 300000 - 10000
    });

    test('USD通貨で増加ボタンを押すと100ドル増加する', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      const increaseButton = screen.getByLabelText('予算を増やす');
      fireEvent.click(increaseButton);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(2100); // 2000 + 100
    });

    test('USD通貨で減少ボタンを押すと100ドル減少する', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      const decreaseButton = screen.getByLabelText('予算を減らす');
      fireEvent.click(decreaseButton);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(1900); // 2000 - 100
    });

    test('減少ボタンで0未満にならない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: { amount: 5000, currency: 'JPY' }
      });
      
      render(<BudgetInput />);
      
      const decreaseButton = screen.getByLabelText('予算を減らす');
      fireEvent.click(decreaseButton); // 5000 - 10000 = 0 (負数にならない)
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(0);
    });
  });

  describe('プリセットボタン', () => {
    test('JPY通貨のプリセットボタンが表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByText('10万JPY')).toBeInTheDocument();
      expect(screen.getByText('30万JPY')).toBeInTheDocument();
      expect(screen.getByText('50万JPY')).toBeInTheDocument();
      expect(screen.getByText('100万JPY')).toBeInTheDocument();
    });

    test('USD通貨のプリセットボタンが表示される', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      expect(screen.getByText('$1,000')).toBeInTheDocument();
      expect(screen.getByText('$3,000')).toBeInTheDocument();
      expect(screen.getByText('$5,000')).toBeInTheDocument();
      expect(screen.getByText('$10,000')).toBeInTheDocument();
    });

    test('JPYプリセットボタンをクリックすると予算が設定される', () => {
      render(<BudgetInput />);
      
      const preset500k = screen.getByText('50万JPY');
      fireEvent.click(preset500k);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(500000);
    });

    test('USDプリセットボタンをクリックすると予算が設定される', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      const preset5k = screen.getByText('$5,000');
      fireEvent.click(preset5k);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(5000);
    });
  });

  describe('ステップ値の設定', () => {
    test('JPY通貨でstep属性が10000に設定される', () => {
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveAttribute('step', '10000');
    });

    test('USD通貨でstep属性が100に設定される', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveAttribute('step', '100');
    });
  });

  describe('適用ボタン', () => {
    test('適用ボタンをクリックするとsetAdditionalBudgetが呼ばれる', () => {
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      fireEvent.change(budgetInput, { target: { value: '500000' } });
      
      const applyButton = screen.getByText('適用');
      fireEvent.click(applyButton);
      
      expect(mockSetAdditionalBudget).toHaveBeenCalledWith(500000, 'JPY');
    });

    test('通貨を変更して適用ボタンをクリックする', () => {
      render(<BudgetInput />);
      
      const usdRadio = screen.getByDisplayValue('USD');
      fireEvent.click(usdRadio);
      
      const budgetInput = screen.getByLabelText('追加予算');
      fireEvent.change(budgetInput, { target: { value: '3000' } });
      
      const applyButton = screen.getByText('適用');
      fireEvent.click(applyButton);
      
      expect(mockSetAdditionalBudget).toHaveBeenCalledWith(3000, 'USD');
    });
  });

  describe('現在の設定表示', () => {
    test('JPY通貨で現在の設定が正しく表示される', () => {
      render(<BudgetInput />);
      
      expect(screen.getByText('追加予算: ¥300,000 JPY')).toBeInTheDocument();
    });

    test('USD通貨で現在の設定が正しく表示される', () => {
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);
      
      render(<BudgetInput />);
      
      expect(screen.getByText('追加予算: $2,000 USD')).toBeInTheDocument();
    });

    test('金額が0の場合の表示', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: { amount: 0, currency: 'JPY' }
      });
      
      render(<BudgetInput />);
      
      expect(screen.getByText('追加予算: ¥0 JPY')).toBeInTheDocument();
    });
  });

  describe('スタイリング', () => {
    test('メインコンテナに適切なクラスが適用される', () => {
      const { container } = render(<BudgetInput />);
      
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-4', 'mb-6');
    });

    test('ラジオボタンに適切なクラスが適用される', () => {
      render(<BudgetInput />);
      
      const jpyRadio = screen.getByDisplayValue('JPY');
      expect(jpyRadio).toHaveClass('form-radio', 'h-4', 'w-4', 'text-blue-600');
    });

    test('増減ボタンに適切なクラスが適用される', () => {
      render(<BudgetInput />);
      
      const increaseButton = screen.getByLabelText('予算を増やす');
      expect(increaseButton).toHaveClass('ml-2', 'px-3', 'py-2', 'bg-gray-200', 'hover:bg-gray-300', 'rounded-md');
    });

    test('適用ボタンに適切なクラスが適用される', () => {
      render(<BudgetInput />);
      
      const applyButton = screen.getByText('適用');
      expect(applyButton).toHaveClass('ml-4', 'bg-blue-600', 'text-white', 'px-4', 'py-2', 'rounded-md', 'hover:bg-blue-700');
    });

    test('プリセットボタンに適切なクラスが適用される', () => {
      render(<BudgetInput />);
      
      const presetButton = screen.getByText('10万JPY');
      expect(presetButton).toHaveClass('bg-blue-100', 'text-blue-800', 'px-3', 'py-1', 'rounded-md', 'hover:bg-blue-200');
    });
  });

  describe('アクセシビリティ', () => {
    test('予算入力にラベルが関連付けられている', () => {
      render(<BudgetInput />);
      
      const budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveAttribute('id', 'budget-input');
    });

    test('増減ボタンにaria-labelが設定されている', () => {
      render(<BudgetInput />);
      
      const decreaseButton = screen.getByLabelText('予算を減らす');
      const increaseButton = screen.getByLabelText('予算を増やす');
      
      expect(decreaseButton).toHaveAttribute('aria-label', '予算を減らす');
      expect(increaseButton).toHaveAttribute('aria-label', '予算を増やす');
    });

    test('プリセットボタングループにrole属性が設定されている', () => {
      const { container } = render(<BudgetInput />);
      
      const presetGroup = container.querySelector('[role="group"]');
      expect(presetGroup).toBeInTheDocument();
      expect(presetGroup).toHaveAttribute('aria-labelledby', 'preset-label');
    });
  });

  describe('useEffect の動作', () => {
    test('additionalBudgetが変更されると内部状態が更新される', async () => {
      const { rerender } = render(<BudgetInput />);
      
      // 初期状態の確認
      let budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(300000);
      
      // コンテキストを変更
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: { amount: 800000, currency: 'JPY' }
      });
      
      rerender(<BudgetInput />);
      
      // 更新された状態の確認
      budgetInput = screen.getByLabelText('追加予算');
      expect(budgetInput).toHaveValue(800000);
    });

    test('baseCurrencyが変更されると内部状態が更新される', async () => {
      const { rerender } = render(<BudgetInput />);
      
      // 初期状態の確認
      expect(screen.getByDisplayValue('JPY')).toBeChecked();
      
      // baseCurrencyを変更
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        baseCurrency: 'USD',
        additionalBudget: { amount: 300000, currency: 'USD' }
      });
      
      rerender(<BudgetInput />);
      
      // 更新された状態の確認
      expect(screen.getByDisplayValue('USD')).toBeChecked();
    });
  });

  describe('エラーハンドリング', () => {
    test('additionalBudgetがnullの場合でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        additionalBudget: null
      });

      expect(() => {
        render(<BudgetInput />);
      }).not.toThrow();
    });

    test('setAdditionalBudgetがundefinedの場合でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        setAdditionalBudget: undefined
      });

      expect(() => {
        render(<BudgetInput />);
      }).not.toThrow();
    });

    test('baseCurrencyがnullの場合のデフォルト処理', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        baseCurrency: null,
        additionalBudget: { amount: 100000, currency: null }
      });

      render(<BudgetInput />);
      
      // JPYがデフォルトとして選択される
      expect(screen.getByDisplayValue('JPY')).toBeChecked();
    });
  });
});