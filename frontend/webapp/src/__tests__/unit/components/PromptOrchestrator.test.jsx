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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../mocks/i18n';
import PromptOrchestrator from '../../../components/ai/PromptOrchestrator';
import promptOrchestrationService from '../../../services/PromptOrchestrationService';

// プロンプトオーケストレーションサービスのモック
vi.mock('../../../services/PromptOrchestrationService', () => ({
  updateUserContext: vi.fn(),
  generatePersonalizedPrompt: vi.fn(),
  recordPrompt: vi.fn(),
  learnFromResponse: vi.fn(),
  promptHistory: []
}));

// window.open をモック
global.open = vi.fn();

// navigator.clipboard をモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe.skip('PromptOrchestrator', () => {
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
    promptOrchestrationService.generatePersonalizedPrompt.mockResolvedValue({
      title: 'Test Prompt',
      content: 'Test prompt content for portfolio analysis',
      metadata: {
        promptType: ['portfolio_analysis'],
        generatedAt: new Date().toISOString(),
        aiPreference: 'claude'
      }
    });
    promptOrchestrationService.recordPrompt.mockReturnValue('test-prompt-id');
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

    expect(screen.getByText(/🎯.*プロンプトオーケストレーター/)).toBeInTheDocument();
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(promptOrchestrationService.updateUserContext).toHaveBeenCalledWith(mockUserContext);
      expect(promptOrchestrationService.generatePersonalizedPrompt).toHaveBeenCalledWith(
        'portfolio_analysis',
        mockUserContext
      );
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
      expect(screen.getByText('Test prompt content for portfolio analysis')).toBeInTheDocument();
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('AIを選んで相談')).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Gemini')).toBeInTheDocument();
      expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const copyButton = screen.getByText('コピー');
      fireEvent.click(copyButton);
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const claudeButton = screen.getByText('Claude').closest('button');
      fireEvent.click(claudeButton);
      expect(global.open).toHaveBeenCalledWith('https://claude.ai', '_blank');
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const geminiButton = screen.getByText('Gemini').closest('button');
      fireEvent.click(geminiButton);
      expect(global.open).toHaveBeenCalledWith('https://gemini.google.com', '_blank');
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const chatgptButton = screen.getByText('ChatGPT').closest('button');
      fireEvent.click(chatgptButton);
      expect(global.open).toHaveBeenCalledWith('https://chat.openai.com', '_blank');
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('プロンプトの評価')).toBeInTheDocument();
      expect(screen.getAllByText('⭐')).toHaveLength(5);
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const starButtons = screen.getAllByText('⭐');
      fireEvent.click(starButtons[4]); // 5 star rating
    });

    await waitFor(() => {
      expect(promptOrchestrationService.learnFromResponse).toHaveBeenCalled();
      expect(screen.getByText('フィードバックありがとうございます！')).toBeInTheDocument();
    });
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

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockOnPromptGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Prompt',
          content: 'Test prompt content for portfolio analysis'
        })
      );
    });
  });

  test('shows usage instructions', () => {
    render(
      <TestWrapper>
        <PromptOrchestrator 
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    expect(screen.getByText('💡 使い方')).toBeInTheDocument();
    expect(screen.getByText('1. 上記プロンプトをコピー')).toBeInTheDocument();
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
    promptOrchestrationService.generatePersonalizedPrompt.mockRejectedValue(
      new Error('Generation failed')
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <PromptOrchestrator 
          promptType="portfolio_analysis"
          userContext={mockUserContext}
          onPromptGenerated={mockOnPromptGenerated}
        />
      </TestWrapper>
    );

    const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('プロンプト生成エラー:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('shows prompt history when available', () => {
    promptOrchestrationService.promptHistory = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        prompt: {
          title: 'Historical Prompt',
          content: 'Historical content'
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