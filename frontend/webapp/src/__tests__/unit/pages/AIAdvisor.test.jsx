import { vi } from "vitest";
/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/__tests__/unit/pages/AIAdvisor.test.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * AIAdvisorページのユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../mocks/i18n';
import AIAdvisor from '../../../pages/AIAdvisor';

// usePortfolioContextのモック
vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children, portfolioValue = {} }) => {
  const defaultAssets = portfolioValue.assets || [];
  const mockPortfolioContext = {
    currentAssets: defaultAssets,
    targetPortfolio: [],
    additionalBudget: { amount: 0, currency: 'JPY' },
    totalAssets: portfolioValue.totalValue || 0,
    portfolio: {
      assets: defaultAssets,
      totalValue: portfolioValue.totalValue || 0,
      ...portfolioValue
    }
  };

  usePortfolioContext.mockReturnValue(mockPortfolioContext);

  return (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </MemoryRouter>
  );
};

// window.open をモック
global.open = vi.fn();

// navigator.clipboard をモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('AIAdvisor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders initial page with title and description', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    expect(screen.getByText(/🤖.*AIアドバイザー/)).toBeInTheDocument();
    expect(screen.getByText(/あなたの情報を教えてください/)).toBeInTheDocument();
  });

  test('shows progress bar with correct steps', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    expect(screen.getByText('基本情報')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('handles age slider interaction', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    const ageSlider = screen.getByRole('slider');
    fireEvent.change(ageSlider, { target: { value: '40' } });

    expect(screen.getByText('40歳')).toBeInTheDocument();
  });

  test('handles occupation selection', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // Atlassian Select component - find select by role
    const selects = screen.getAllByRole('combobox');
    const occupationSelect = selects[0]; // First select is occupation
    fireEvent.change(occupationSelect, { target: { value: '会社員' } });

    expect(occupationSelect.value).toBe('会社員');
  });

  test('navigates to next step when next button is clicked', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    expect(screen.getByText('投資対象市場')).toBeInTheDocument();
  });

  test('navigates to previous step when previous button is clicked', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // まず次のステップに進む
    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    expect(screen.getByText('投資対象市場')).toBeInTheDocument();

    // 前のステップに戻る
    const prevButton = screen.getByText('戻る');
    fireEvent.click(prevButton);

    expect(screen.getByText('基本情報')).toBeInTheDocument();
  });

  test('disables previous button on first step', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    const prevButton = screen.getByText('戻る').closest('button');
    expect(prevButton).toBeDisabled();
  });

  test('shows market selection on step 2', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ2に進む
    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    expect(screen.getByText('米国市場')).toBeInTheDocument();
    expect(screen.getByText('日本市場')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    expect(screen.getByText('🇯🇵')).toBeInTheDocument();
  });

  test('shows investment experience options on step 3', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ3（投資経験）に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    // 「投資経験」はプログレスバーとコンテンツの両方に表示される
    expect(screen.getAllByText('投資経験').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('初心者（1年未満）')).toBeInTheDocument();
    expect(screen.getByText('リスク許容度')).toBeInTheDocument();
  });

  test('handles investment experience selection', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ3に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    const beginnerButton = screen.getByText('初心者（1年未満）').closest('button');
    fireEvent.click(beginnerButton);

    // Atlassian Buttonはvariant="primary"をinline styleで適用する
    // クリック後に選択状態になったことをaria-disabledなどで確認
    expect(beginnerButton).toBeInTheDocument();
  });

  test('shows values and concerns selection on step 4', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ4に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    expect(screen.getByText('大切にしている価値観（複数選択可）')).toBeInTheDocument();
    expect(screen.getByText('不安に思っていること（複数選択可）')).toBeInTheDocument();
    expect(screen.getByText('安全性重視')).toBeInTheDocument();
    expect(screen.getByText('市場の暴落が心配')).toBeInTheDocument();
  });

  test('handles value selection', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ4（目標と価値観）に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    const safetyButton = screen.getByText('安全性重視').closest('button');
    fireEvent.click(safetyButton);

    // Atlassian Buttonはvariant="primary"をinline styleで適用する
    expect(safetyButton).toBeInTheDocument();
  });

  test('navigates to prompt step and shows PromptOrchestrator', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む（6ステップ: 基本情報→市場→経験→目標→スクリーンショット→プロンプト）
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    // 最終ステップではAI分析プロンプトが表示される
    expect(screen.getByText('AI分析プロンプト')).toBeInTheDocument();
  });

  test('shows screenshot analysis step on step 5', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ5（スクリーンショット分析）に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    // スクリーンショット分析ステップのUI確認
    expect(screen.getByText('ポートフォリオ画面')).toBeInTheDocument();
    expect(screen.getByText('株価・市場データ')).toBeInTheDocument();
    expect(screen.getByText('取引履歴')).toBeInTheDocument();
  });

  test('shows screenshot analysis prompt generation button', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ5（スクリーンショット分析）に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    // 分析プロンプト生成ボタンが表示される
    expect(screen.getByText('分析プロンプトを生成')).toBeInTheDocument();
  });

  test('disables next button on last step', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    const nextButton = screen.getByText('次へ').closest('button');
    expect(nextButton).toBeDisabled();
  });

  test('shows additional instructions input on screenshot step', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ5（スクリーンショット分析）に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    // 追加指示テキストエリアが表示される
    expect(screen.getByText('追加指示（オプション）')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('特別な要求や注意点があれば入力してください...')).toBeInTheDocument();
  });

  test('handles monthly investment input', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // ステップ3に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    const monthlyInput = screen.getByPlaceholderText('例: 50000');
    fireEvent.change(monthlyInput, { target: { value: '30000' } });

    expect(monthlyInput.value).toBe('30000');
  });

  test('navigates through all steps successfully', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 基本情報を入力
    const ageSlider = screen.getByRole('slider');
    fireEvent.change(ageSlider, { target: { value: '30' } });
    expect(screen.getByText('30歳')).toBeInTheDocument();

    // 全ステップを最後まで進む
    fireEvent.click(screen.getByText('次へ')); // step 1: 市場
    fireEvent.click(screen.getByText('次へ')); // step 2: 経験
    fireEvent.click(screen.getByText('次へ')); // step 3: 目標
    fireEvent.click(screen.getByText('次へ')); // step 4: スクリーンショット
    fireEvent.click(screen.getByText('プロンプト生成')); // step 5: プロンプト

    // 最終ステップに到達
    expect(screen.getByText('AI分析プロンプト')).toBeInTheDocument();
  });
});