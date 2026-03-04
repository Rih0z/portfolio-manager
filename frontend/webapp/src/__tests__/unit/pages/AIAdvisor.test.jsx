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
import { PortfolioContext } from '../../../context/PortfolioContext';
import AIAdvisor from '../../../pages/AIAdvisor';

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children, portfolioValue = {} }) => {
  const mockPortfolioContext = {
    portfolio: {
      assets: [],
      totalValue: 0,
      ...portfolioValue
    }
  };

  return (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <PortfolioContext.Provider value={mockPortfolioContext}>
          {children}
        </PortfolioContext.Provider>
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

describe.skip('AIAdvisor', () => {
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

    const occupationSelect = screen.getByDisplayValue('');
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

    const prevButton = screen.getByText('戻る');
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

    // ステップ3に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    expect(screen.getByText('投資経験')).toBeInTheDocument();
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

    const beginnerButton = screen.getByText('初心者（1年未満）');
    fireEvent.click(beginnerButton);

    expect(beginnerButton).toHaveClass('bg-primary-500');
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

    // ステップ4に進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));

    const safetyButton = screen.getByText('安全性重視');
    fireEvent.click(safetyButton);

    expect(safetyButton).toHaveClass('bg-primary-500');
  });

  test('generates prompt when reaching final step', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    expect(screen.getByText('AIプロンプトが生成されました！')).toBeInTheDocument();
    expect(screen.getByText('Claude (Anthropic)')).toBeInTheDocument();
    expect(screen.getByText('Gemini (Google)')).toBeInTheDocument();
  });

  test('shows portfolio data in generated prompt', () => {
    const portfolioData = {
      assets: [
        {
          name: 'eMAXIS Slim 全世界株式',
          quantity: 1000,
          totalValue: 150000
        }
      ],
      totalValue: 150000
    };

    render(
      <TestWrapper portfolioValue={portfolioData}>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    expect(screen.getByText(/eMAXIS Slim 全世界株式/)).toBeInTheDocument();
    expect(screen.getByText(/150,000円/)).toBeInTheDocument();
  });

  test('handles copy to clipboard', async () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    const copyButton = screen.getByText('コピー');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  test('opens Claude when Claude button is clicked', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    const claudeButton = screen.getByText('Claude (Anthropic)').closest('button');
    fireEvent.click(claudeButton);

    expect(global.open).toHaveBeenCalledWith('https://claude.ai', '_blank');
  });

  test('opens Gemini when Gemini button is clicked', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    const geminiButton = screen.getByText('Gemini (Google)').closest('button');
    fireEvent.click(geminiButton);

    expect(global.open).toHaveBeenCalledWith('https://gemini.google.com', '_blank');
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
    fireEvent.click(screen.getByText('プロンプト生成'));

    const nextButton = screen.getByText('次へ');
    expect(nextButton).toBeDisabled();
  });

  test('shows usage instructions', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    expect(screen.getByText('💡 使い方')).toBeInTheDocument();
    expect(screen.getByText('1. 上記プロンプトをコピー')).toBeInTheDocument();
    expect(screen.getByText('2. ClaudeまたはGeminiにアクセス')).toBeInTheDocument();
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

  test('generates Japanese prompt by default', () => {
    render(
      <TestWrapper>
        <AIAdvisor />
      </TestWrapper>
    );

    // 基本情報を入力
    const ageSlider = screen.getByRole('slider');
    fireEvent.change(ageSlider, { target: { value: '30' } });

    // 最終ステップまで進む
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('次へ'));
    fireEvent.click(screen.getByText('プロンプト生成'));

    const promptText = screen.getByText(/私は30歳の/);
    expect(promptText).toBeInTheDocument();
  });
});