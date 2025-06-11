/**
 * BudgetInput コンポーネントのテスト
 * 追加投資シミュレーション用の予算入力機能をテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetInput from '../../../../components/simulation/BudgetInput';

// i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// usePortfolioContextのモック
const mockSetAdditionalBudget = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

describe('BudgetInput Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのモック状態を設定
    usePortfolioContext.mockReturnValue({
      additionalBudget: { amount: 300000, currency: 'JPY' },
      setAdditionalBudget: mockSetAdditionalBudget,
      baseCurrency: 'JPY'
    });
  });

  it('初期状態で正しくレンダリングされる', () => {
    render(<BudgetInput />);
    
    expect(screen.getByText('追加投資シミュレーション')).toBeInTheDocument();
    expect(screen.getByLabelText('予算通貨')).toBeInTheDocument();
    expect(screen.getByLabelText('追加予算')).toBeInTheDocument();
    expect(screen.getByText('予算プリセット')).toBeInTheDocument();
  });

  it('通貨選択が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    // JPY→USD変更
    const usdRadio = screen.getByDisplayValue('USD');
    await user.click(usdRadio);
    
    expect(usdRadio).toBeChecked();
    
    // JPY→USD変更時にデフォルト値が設定される
    const input = screen.getByDisplayValue('1000');
    expect(input).toBeInTheDocument();
  });

  it('金額入力が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    const input = screen.getByLabelText('追加予算');
    await user.clear(input);
    await user.type(input, '500000');
    
    expect(input).toHaveValue(500000);
  });

  it('予算の増減ボタンが正しく動作する', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    const increaseButton = screen.getByLabelText('予算を増やす');
    const decreaseButton = screen.getByLabelText('予算を減らす');
    const input = screen.getByLabelText('追加予算');
    
    // 増加ボタンテスト
    await user.click(increaseButton);
    expect(input).toHaveValue(310000); // 300000 + 10000
    
    // 減少ボタンテスト
    await user.click(decreaseButton);
    expect(input).toHaveValue(300000); // 310000 - 10000
  });

  it('JPY用プリセットボタンが正しく表示される', () => {
    render(<BudgetInput />);
    
    expect(screen.getByText('10万JPY')).toBeInTheDocument();
    expect(screen.getByText('30万JPY')).toBeInTheDocument();
    expect(screen.getByText('50万JPY')).toBeInTheDocument();
    expect(screen.getByText('100万JPY')).toBeInTheDocument();
  });

  it('USD用プリセットボタンが正しく表示される', () => {
    usePortfolioContext.mockReturnValue({
      additionalBudget: { amount: 1000, currency: 'USD' },
      setAdditionalBudget: mockSetAdditionalBudget,
      baseCurrency: 'USD'
    });
    
    render(<BudgetInput />);
    
    expect(screen.getByText('$1,000')).toBeInTheDocument();
    expect(screen.getByText('$3,000')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
  });

  it('プリセットボタンクリックで金額が設定される', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    const presetButton = screen.getByText('50万JPY');
    await user.click(presetButton);
    
    const input = screen.getByLabelText('追加予算');
    expect(input).toHaveValue(500000);
  });

  it('適用ボタンが正しく動作する', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    const input = screen.getByLabelText('追加予算');
    await user.clear(input);
    await user.type(input, '400000');
    
    const applyButton = screen.getByText('適用');
    await user.click(applyButton);
    
    expect(mockSetAdditionalBudget).toHaveBeenCalledWith(400000, 'JPY');
  });

  it('現在の設定が正しく表示される', () => {
    render(<BudgetInput />);
    
    expect(screen.getByText('現在の設定:')).toBeInTheDocument();
    expect(screen.getByText('追加予算: ¥300,000 JPY')).toBeInTheDocument();
  });

  it('通貨変更時のデフォルト値設定が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    // JPYからUSDに変更（大きな値のケース）
    const input = screen.getByLabelText('追加予算');
    await user.clear(input);
    await user.type(input, '50000'); // 大きな値を設定
    
    const usdRadio = screen.getByDisplayValue('USD');
    await user.click(usdRadio);
    
    // USDに変更時、大きな値は小さくリセットされる
    expect(input).toHaveValue(1000);
  });

  it('負の値が入力できない', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    const decreaseButton = screen.getByLabelText('予算を減らす');
    const input = screen.getByLabelText('追加予算');
    
    // 0まで減少させる
    await user.clear(input);
    await user.type(input, '0');
    
    // さらに減少させようとしても0のまま
    await user.click(decreaseButton);
    expect(input).toHaveValue(0);
  });

  it('USD通貨での増減ステップが正しい', async () => {
    const user = userEvent.setup();
    usePortfolioContext.mockReturnValue({
      additionalBudget: { amount: 1000, currency: 'USD' },
      setAdditionalBudget: mockSetAdditionalBudget,
      baseCurrency: 'USD'
    });
    
    render(<BudgetInput />);
    
    const increaseButton = screen.getByLabelText('予算を増やす');
    const input = screen.getByLabelText('追加予算');
    
    await user.click(increaseButton);
    expect(input).toHaveValue(1100); // 1000 + 100 (USDのステップ)
  });

  it('不正な値の入力に対応する', async () => {
    const user = userEvent.setup();
    render(<BudgetInput />);
    
    const input = screen.getByLabelText('追加予算');
    
    // 無効な値を入力
    await user.clear(input);
    await user.type(input, 'invalid');
    
    // NaNの場合は0に設定される
    expect(input).toHaveValue(0);
  });
});