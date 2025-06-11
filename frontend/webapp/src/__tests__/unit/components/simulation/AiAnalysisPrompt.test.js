/**
 * AiAnalysisPrompt コンポーネントのテスト
 * AI分析用プロンプト生成機能をテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiAnalysisPrompt from '../../../../components/simulation/AiAnalysisPrompt';

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

// Clipboard APIのモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

// usePortfolioContextのモック
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

describe('AiAnalysisPrompt Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
  const defaultMockData = {
    currentAssets: [
      {
        ticker: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        price: 100,
        holdings: 10,
        currency: 'USD'
      },
      {
        ticker: '1306',
        name: 'TOPIX連動型上場投資信託',
        price: 2000,
        holdings: 5,
        currency: 'JPY'
      }
    ],
    targetPortfolio: [
      { ticker: 'VTI', targetPercentage: 60 },
      { ticker: '1306', targetPercentage: 40 }
    ],
    additionalBudget: { amount: 300000, currency: 'JPY' },
    baseCurrency: 'JPY',
    exchangeRate: { rate: 150, source: 'Yahoo Finance', lastUpdated: new Date() },
    totalAssets: 300000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
  });

  it('初期状態で正しくレンダリングされる', () => {
    render(<AiAnalysisPrompt />);
    
    expect(screen.getByText('AI分析プロンプト')).toBeInTheDocument();
    expect(screen.getByText(/あなたのポートフォリオデータを使って/)).toBeInTheDocument();
    expect(screen.getByText('プロンプトをコピー')).toBeInTheDocument();
    expect(screen.getByText('プロンプト全文を表示')).toBeInTheDocument();
  });

  it('プロンプトプレビューが表示される', () => {
    render(<AiAnalysisPrompt />);
    
    // プレビューの最初の行が表示される
    expect(screen.getByText(/あなたは投資分析に特化した AI アシスタント/)).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument(); // プレビューの省略部分
  });

  it('プロンプト全文表示ボタンが動作する', async () => {
    const user = userEvent.setup();
    render(<AiAnalysisPrompt />);
    
    const toggleButton = screen.getByText('プロンプト全文を表示');
    await user.click(toggleButton);
    
    expect(screen.getByText('プロンプトを折りたたむ')).toBeInTheDocument();
    // 全文が表示される（省略記号がない）
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  it('クリップボードコピー機能が動作する', async () => {
    const user = userEvent.setup();
    render(<AiAnalysisPrompt />);
    
    const copyButton = screen.getByText('プロンプトをコピー');
    await user.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    
    // コピー完了メッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('コピー完了')).toBeInTheDocument();
    });
  });

  it('コピー完了メッセージが3秒後に消える', async () => {
    const user = userEvent.setup();
    jest.useFakeTimers();
    
    render(<AiAnalysisPrompt />);
    
    const copyButton = screen.getByText('プロンプトをコピー');
    await user.click(copyButton);
    
    expect(screen.getByText('コピー完了')).toBeInTheDocument();
    
    // 3秒後
    jest.advanceTimersByTime(3000);
    
    expect(screen.getByText('プロンプトをコピー')).toBeInTheDocument();
    
    jest.useRealTimers();
  });

  it('現在のポートフォリオ構成が正しく計算される', () => {
    render(<AiAnalysisPrompt />);
    
    // プロンプト全文を表示
    const toggleButton = screen.getByText('プロンプト全文を表示');
    fireEvent.click(toggleButton);
    
    // VTIとTOPIXが含まれている
    expect(screen.getByText(/VTI.*Vanguard Total Stock Market ETF/)).toBeInTheDocument();
    expect(screen.getByText(/1306.*TOPIX連動型上場投資信託/)).toBeInTheDocument();
  });

  it('目標ポートフォリオ配分が正しく表示される', () => {
    render(<AiAnalysisPrompt />);
    
    const toggleButton = screen.getByText('プロンプト全文を表示');
    fireEvent.click(toggleButton);
    
    // 目標配分が表示される
    expect(screen.getByText(/VTI: 60%/)).toBeInTheDocument();
    expect(screen.getByText(/1306: 40%/)).toBeInTheDocument();
  });

  it('保有資産がない場合の処理', () => {
    usePortfolioContext.mockReturnValue({
      ...defaultMockData,
      currentAssets: [],
      targetPortfolio: []
    });
    
    render(<AiAnalysisPrompt />);
    
    const toggleButton = screen.getByText('プロンプト全文を表示');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('現在、保有資産はありません。')).toBeInTheDocument();
    expect(screen.getByText('目標配分が設定されていません。')).toBeInTheDocument();
  });

  it('追加予算情報が正しく表示される', () => {
    render(<AiAnalysisPrompt />);
    
    const toggleButton = screen.getByText('プロンプト全文を表示');
    fireEvent.click(toggleButton);
    
    // 追加予算が表示される
    expect(screen.getByText(/毎月の新規投資予定額.*300,000 円/)).toBeInTheDocument();
  });

  it('USD通貨での追加予算表示', () => {
    usePortfolioContext.mockReturnValue({
      ...defaultMockData,
      additionalBudget: { amount: 2000, currency: 'USD' }
    });
    
    render(<AiAnalysisPrompt />);
    
    const toggleButton = screen.getByText('プロンプト全文を表示');
    fireEvent.click(toggleButton);
    
    // USD建ての追加予算が表示される
    expect(screen.getByText(/毎月の新規投資予定額.*\$2,000\.00/)).toBeInTheDocument();
  });

  it('使い方セクションが表示される', () => {
    render(<AiAnalysisPrompt />);
    
    expect(screen.getByText('使い方')).toBeInTheDocument();
    expect(screen.getByText(/「プロンプトをコピー」ボタンをクリック/)).toBeInTheDocument();
    expect(screen.getByText(/Claude、ChatGPT、Gemini/)).toBeInTheDocument();
  });

  it('プロンプトに必要な情報が全て含まれる', () => {
    render(<AiAnalysisPrompt />);
    
    const toggleButton = screen.getByText('プロンプト全文を表示');
    fireEvent.click(toggleButton);
    
    // 必要なセクションが含まれている
    expect(screen.getByText(/初期情報収集/)).toBeInTheDocument();
    expect(screen.getByText(/現状の投資ポートフォリオ構成/)).toBeInTheDocument();
    expect(screen.getByText(/理想的と考えるポートフォリオ構成/)).toBeInTheDocument();
    expect(screen.getByText(/分析ガイドライン/)).toBeInTheDocument();
    expect(screen.getByText(/出力フォーマット/)).toBeInTheDocument();
  });

  it('総資産額が正しく表示される', () => {
    render(<AiAnalysisPrompt />);
    
    const toggleButton = screen.getByText('プロンプト全文を表示');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/現在の総資産額.*300000 JPY/)).toBeInTheDocument();
  });

  it('価格・保有量がない資産の処理', () => {
    usePortfolioContext.mockReturnValue({
      ...defaultMockData,
      currentAssets: [
        {
          ticker: 'UNKNOWN',
          name: 'Unknown Asset',
          price: null,
          holdings: null,
          currency: 'USD'
        }
      ]
    });
    
    render(<AiAnalysisPrompt />);
    
    // エラーが発生しない
    expect(screen.getByText('プロンプトをコピー')).toBeInTheDocument();
  });

  it('クリップボードAPIエラーの処理', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // クリップボードAPIでエラーを発生させる
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));
    
    render(<AiAnalysisPrompt />);
    
    const copyButton = screen.getByText('プロンプトをコピー');
    await user.click(copyButton);
    
    expect(consoleSpy).toHaveBeenCalledWith('クリップボードへのコピーに失敗しました:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('undefinedな値の適切な処理', () => {
    usePortfolioContext.mockReturnValue({
      ...defaultMockData,
      additionalBudget: null,
      baseCurrency: null,
      totalAssets: null
    });
    
    render(<AiAnalysisPrompt />);
    
    // エラーが発生せずにレンダリングされる
    expect(screen.getByText('プロンプトをコピー')).toBeInTheDocument();
  });
});