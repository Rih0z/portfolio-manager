import { vi } from "vitest";
/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/__tests__/unit/components/PromptOrchestrator.test.jsx
 *
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 *
 * 説明:
 * PromptOrchestratorコンポーネントのユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../mocks/i18n';

// vi.hoisted でvi.mockファクトリ内から参照できるモックを作成
const { mockService } = vi.hoisted(() => ({
  mockService: {
    updateUserContext: vi.fn(),
    generatePersonalizedPrompt: vi.fn(),
    recordPrompt: vi.fn(),
    learnFromResponse: vi.fn(),
    promptHistory: []
  }
}));

vi.mock('../../../services/PromptOrchestrationService', () => ({
  default: mockService
}));

// loggerモジュールのモック
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));
vi.mock('../../../utils/logger', () => ({ default: mockLogger }));

// window.open をモック
global.open = vi.fn();

// navigator.clipboard をモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

import PromptOrchestrator from '../../../components/ai/PromptOrchestrator';

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

// Promiseをフラッシュするヘルパー
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// プロンプト生成ボタンをクリックして結果が出るまで待つヘルパー
const clickGenerateAndWait = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('パーソナライズドプロンプトを生成'));
    await flushPromises();
  });
};

describe('PromptOrchestrator', () => {
  const mockOnPromptGenerated = vi.fn();
  const mockUserContext = {
    age: 35,
    occupation: 'Engineer',
    primaryGoal: 'Early retirement',
    targetMarkets: ['US', 'JAPAN'],
    monthlyBudget: 50000
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // generatePersonalizedPrompt はsync呼び出しなのでmockReturnValue
    mockService.generatePersonalizedPrompt.mockReturnValue({
      title: 'Test Prompt',
      content: 'Test prompt content for portfolio analysis',
      metadata: {
        promptType: ['portfolio_analysis'],
        generatedAt: new Date().toISOString(),
        aiPreference: 'claude'
      }
    });
    mockService.recordPrompt.mockReturnValue('test-prompt-id');
    // promptHistoryをリセット（filterが呼ばれるため配列にする）
    mockService.promptHistory = [];
  });

  test('renders prompt orchestrator with title', () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/プロンプトオーケストレーター/)).toBeInTheDocument();
    expect(screen.getByText('ポートフォリオ分析')).toBeInTheDocument();
  });

  test('displays generate prompt button', () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    expect(screen.getByText('パーソナライズドプロンプトを生成')).toBeInTheDocument();
  });

  test('generates prompt when button is clicked', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    expect(mockService.generatePersonalizedPrompt).toHaveBeenCalledWith(
      'portfolio_analysis',
      mockUserContext
    );
  });

  test('displays generated prompt after generation', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
    expect(screen.getByText('Test prompt content for portfolio analysis')).toBeInTheDocument();
  });

  test('shows AI selection buttons after prompt generation', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    expect(screen.getByText('AIを選んで相談')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('Gemini')).toBeInTheDocument();
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
  });

  test('copies prompt to clipboard when copy button is clicked', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    fireEvent.click(screen.getByText('コピー'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test prompt content for portfolio analysis');
    });
  });

  test('opens Claude when Claude button is clicked', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    fireEvent.click(screen.getByText('Claude').closest('button'));
    expect(global.open).toHaveBeenCalledWith('https://claude.ai', '_blank');
  });

  test('opens Gemini when Gemini button is clicked', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    fireEvent.click(screen.getByText('Gemini').closest('button'));
    expect(global.open).toHaveBeenCalledWith('https://gemini.google.com', '_blank');
  });

  test('opens ChatGPT when ChatGPT button is clicked', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    fireEvent.click(screen.getByText('ChatGPT').closest('button'));
    expect(global.open).toHaveBeenCalledWith('https://chat.openai.com', '_blank');
  });

  test('shows feedback section after prompt generation', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    expect(screen.getByText('プロンプトの評価')).toBeInTheDocument();
    expect(screen.getAllByText('⭐')).toHaveLength(5);
  });

  test('submits feedback when star is clicked', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    await act(async () => {
      const starButtons = screen.getAllByText('⭐');
      fireEvent.click(starButtons[4]); // 5 star rating
      await flushPromises();
    });

    expect(mockService.learnFromResponse).toHaveBeenCalled();
    expect(screen.getByText('フィードバックありがとうございます！')).toBeInTheDocument();
  });

  test('calls onPromptGenerated callback when prompt is generated', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    expect(mockOnPromptGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Prompt',
        content: 'Test prompt content for portfolio analysis'
      })
    );
  });

  test('shows usage instructions after prompt generation', async () => {
    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    expect(screen.getByText(/使い方/)).toBeInTheDocument();
    expect(screen.getByText(/上記プロンプトをコピー/)).toBeInTheDocument();
  });

  test('handles different prompt types correctly', () => {
    const { rerender } = render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="market_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    expect(screen.getByText('市場分析')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <PromptOrchestrator
          promptType="goal_setting"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    expect(screen.getByText('目標設定')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
          className="custom-class"
        />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('handles prompt generation error gracefully', async () => {
    mockService.generatePersonalizedPrompt.mockImplementation(() => {
      throw new Error('Generation failed');
    });

    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    await clickGenerateAndWait();

    expect(mockLogger.error).toHaveBeenCalledWith('プロンプト生成エラー:', expect.objectContaining({}));
  });

  test('shows prompt history when available', () => {
    mockService.promptHistory = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        prompt: {
          title: 'Historical Prompt',
          content: 'Historical content',
          metadata: {
            promptType: ['portfolio_analysis'],
            generatedAt: new Date().toISOString()
          }
        }
      }
    ];

    render(
      <TestWrapper>
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    expect(screen.getByText('最近のプロンプト')).toBeInTheDocument();
    expect(screen.getByText('Historical Prompt')).toBeInTheDocument();
  });
});
