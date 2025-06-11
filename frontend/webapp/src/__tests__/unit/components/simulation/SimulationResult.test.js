/**
 * SimulationResult コンポーネントのテスト
 * 投資シミュレーション結果表示機能をテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimulationResult from '../../../../components/simulation/SimulationResult';

// i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// formattersのモック
jest.mock('../../../../utils/formatters', () => ({
  formatCurrency: (value, currency) => `${value} ${currency}`,
  formatPercent: (value) => `${value}%`,
  formatDate: (date) => new Date(date).toLocaleDateString()
}));

// window.confirm のモック
global.confirm = jest.fn(() => true);

// usePortfolioContextのモック
const mockExecutePurchase = jest.fn();
const mockCalculateSimulation = jest.fn();

jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

describe('SimulationResult Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
  const defaultMockData = {
    baseCurrency: 'JPY',
    exchangeRate: {
      rate: 150,
      source: 'Yahoo Finance',
      lastUpdated: new Date('2023-01-01')
    },
    calculateSimulation: mockCalculateSimulation,
    executePurchase: mockExecutePurchase
  };

  const defaultSimulationResults = [
    {
      id: 'vti-1',
      ticker: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      currentValue: 150000,
      currentAllocation: 60,
      targetAllocation: 50,
      diff: -10,
      price: 100,
      currency: 'USD',
      purchaseShares: 5.5,
      purchaseAmount: 550,
      source: 'Alpaca',
      isMutualFund: false
    },
    {
      id: 'topix-1',
      ticker: '1306',
      name: 'TOPIX連動型上場投資信託',
      currentValue: 100000,
      currentAllocation: 40,
      targetAllocation: 50,
      diff: 10,
      price: 2000,
      currency: 'JPY',
      purchaseShares: 3.25,
      purchaseAmount: 6500,
      source: 'Yahoo Finance Japan',
      isMutualFund: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateSimulation.mockReturnValue(defaultSimulationResults);
    usePortfolioContext.mockReturnValue(defaultMockData);
  });

  it('初期状態で正しくレンダリングされる', () => {
    render(<SimulationResult />);
    
    expect(screen.getByText('為替レート情報')).toBeInTheDocument();
    expect(screen.getByText('1 USD = 150.00 JPY')).toBeInTheDocument();
    expect(screen.getByText('VTI')).toBeInTheDocument();
    expect(screen.getByText('1306')).toBeInTheDocument();
  });

  it('シミュレーション結果がない場合のメッセージが表示される', () => {
    mockCalculateSimulation.mockReturnValue([]);
    
    render(<SimulationResult />);
    
    expect(screen.getByText(/シミュレーション結果がありません/)).toBeInTheDocument();
    expect(screen.getByText(/「設定」タブから目標配分を設定してください/)).toBeInTheDocument();
  });

  it('為替レート情報が正しく表示される', () => {
    render(<SimulationResult />);
    
    expect(screen.getByText('為替レート情報')).toBeInTheDocument();
    expect(screen.getByText('1 USD = 150.00 JPY')).toBeInTheDocument();
    expect(screen.getByText('(データソース: Yahoo Finance, 更新: 1/1/2023)')).toBeInTheDocument();
  });

  it('データソースバッジが正しく表示される', () => {
    render(<SimulationResult />);
    
    expect(screen.getByText('Alpaca')).toBeInTheDocument();
    expect(screen.getByText('Yahoo Finance Japan')).toBeInTheDocument();
  });

  it('購入ボタンが正しく動作する', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    const purchaseButtons = screen.getAllByText('購入');
    await user.click(purchaseButtons[0]);
    
    expect(global.confirm).toHaveBeenCalledWith('Vanguard Total Stock Market ETFを5.5000株購入しますか？');
    expect(mockExecutePurchase).toHaveBeenCalledWith('vti-1', 5.5);
  });

  it('投資信託の購入で口数表示される', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    const purchaseButtons = screen.getAllByText('購入');
    await user.click(purchaseButtons[1]);
    
    expect(global.confirm).toHaveBeenCalledWith('TOPIX連動型上場投資信託を3.2500口購入しますか？');
    expect(mockExecutePurchase).toHaveBeenCalledWith('topix-1', 3.25);
  });

  it('編集ボタンで株数編集モードに入る', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[0]);
    
    // 入力フィールドが表示される
    expect(screen.getByDisplayValue('5.5')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });

  it('株数編集で金額が動的に更新される', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[0]);
    
    const input = screen.getByDisplayValue('5.5');
    await user.clear(input);
    await user.type(input, '10');
    
    // 10 * 100 = 1000の金額が表示される
    expect(screen.getByText('1000 USD')).toBeInTheDocument();
  });

  it('編集モードでの購入が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[0]);
    
    const input = screen.getByDisplayValue('5.5');
    await user.clear(input);
    await user.type(input, '8');
    
    const purchaseButton = screen.getByText('購入');
    await user.click(purchaseButton);
    
    expect(global.confirm).toHaveBeenCalledWith('Vanguard Total Stock Market ETFを8.0000株購入しますか？');
    expect(mockExecutePurchase).toHaveBeenCalledWith('vti-1', 8);
  });

  it('編集モードをキャンセルできる', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[0]);
    
    const cancelButton = screen.getByText('キャンセル');
    await user.click(cancelButton);
    
    // 編集モードが終了
    expect(screen.queryByDisplayValue('5.5')).not.toBeInTheDocument();
    expect(screen.getAllByText('編集')).toHaveLength(2);
  });

  it('0以下の株数での購入でエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[0]);
    
    const input = screen.getByDisplayValue('5.5');
    await user.clear(input);
    await user.type(input, '0');
    
    const purchaseButton = screen.getByText('購入');
    await user.click(purchaseButton);
    
    expect(screen.getByText('購入株数は0より大きい値を指定してください')).toBeInTheDocument();
    expect(mockExecutePurchase).not.toHaveBeenCalled();
  });

  it('購入成功後にメッセージが表示される', async () => {
    const user = userEvent.setup();
    jest.useFakeTimers();
    
    render(<SimulationResult />);
    
    const purchaseButtons = screen.getAllByText('購入');
    await user.click(purchaseButtons[0]);
    
    expect(screen.getByText('Vanguard Total Stock Market ETFを5.5000株購入しました')).toBeInTheDocument();
    
    // 5秒後にメッセージが消える
    jest.advanceTimersByTime(5000);
    
    expect(screen.queryByText('Vanguard Total Stock Market ETFを5.5000株購入しました')).not.toBeInTheDocument();
    
    jest.useRealTimers();
  });

  it('購入株数が0の場合は操作ボタンが表示されない', () => {
    const resultsWithZeroPurchase = [
      {
        ...defaultSimulationResults[0],
        purchaseShares: 0,
        purchaseAmount: 0
      }
    ];
    mockCalculateSimulation.mockReturnValue(resultsWithZeroPurchase);
    
    render(<SimulationResult />);
    
    // 購入・編集ボタンが表示されない
    expect(screen.queryByText('購入')).not.toBeInTheDocument();
    expect(screen.queryByText('編集')).not.toBeInTheDocument();
  });

  it('通貨記号が正しく表示される', () => {
    render(<SimulationResult />);
    
    // USD資産の$記号
    expect(screen.getByText('$100 USD')).toBeInTheDocument();
    // JPY資産の¥記号
    expect(screen.getByText('¥2000 JPY')).toBeInTheDocument();
  });

  it('投資信託のステップ値が正しく設定される', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    // 投資信託の編集ボタンをクリック
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[1]); // 1306 (投資信託)
    
    const input = screen.getByDisplayValue('3.25');
    expect(input).toHaveAttribute('step', '0.001'); // 投資信託のステップ
  });

  it('株式のステップ値が正しく設定される', async () => {
    const user = userEvent.setup();
    render(<SimulationResult />);
    
    // 株式の編集ボタンをクリック
    const editButtons = screen.getAllByText('編集');
    await user.click(editButtons[0]); // VTI (株式)
    
    const input = screen.getByDisplayValue('5.5');
    expect(input).toHaveAttribute('step', '0.01'); // 株式のステップ
  });

  it('現在配分と目標配分が正しく表示される', () => {
    render(<SimulationResult />);
    
    expect(screen.getByText('60%')).toBeInTheDocument(); // VTIの現在配分
    expect(screen.getByText('50%')).toBeInTheDocument(); // VTIの目標配分
    expect(screen.getByText('40%')).toBeInTheDocument(); // 1306の現在配分
  });

  it('配分差分が正しく表示される', () => {
    render(<SimulationResult />);
    
    expect(screen.getByText('-10%')).toBeInTheDocument(); // VTIの差分
    expect(screen.getByText('10%')).toBeInTheDocument(); // 1306の差分
  });

  it('購入株数が0の行は灰色背景になる', () => {
    const resultsWithZeroPurchase = [
      {
        ...defaultSimulationResults[0],
        purchaseShares: 0,
        purchaseAmount: 0
      }
    ];
    mockCalculateSimulation.mockReturnValue(resultsWithZeroPurchase);
    
    render(<SimulationResult />);
    
    const row = screen.getByText('VTI').closest('tr');
    expect(row).toHaveClass('bg-gray-50');
  });

  it('為替レートがない場合は為替情報が表示されない', () => {
    usePortfolioContext.mockReturnValue({
      ...defaultMockData,
      exchangeRate: null
    });
    
    render(<SimulationResult />);
    
    expect(screen.queryByText('為替レート情報')).not.toBeInTheDocument();
  });

  it('購入確認でキャンセルした場合は購入されない', async () => {
    const user = userEvent.setup();
    global.confirm.mockReturnValueOnce(false);
    
    render(<SimulationResult />);
    
    const purchaseButtons = screen.getAllByText('購入');
    await user.click(purchaseButtons[0]);
    
    expect(mockExecutePurchase).not.toHaveBeenCalled();
  });
});