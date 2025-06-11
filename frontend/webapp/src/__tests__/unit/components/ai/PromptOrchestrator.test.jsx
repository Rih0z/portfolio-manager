/**
 * PromptOrchestrator.jsx のユニットテスト
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../mocks/i18n';
import PromptOrchestrator from '../../../../components/ai/PromptOrchestrator';

// Mock modules
jest.mock('../../../../services/portfolio/PortfolioPromptService', () => ({
  PortfolioPromptService: {
    generatePrompt: jest.fn(() => Promise.resolve({
      success: true,
      prompt: 'テスト用プロンプト',
      context: {
        portfolioSummary: '資産総額: ¥1,000,000',
        recommendations: ['推奨アクション1', '推奨アクション2']
      }
    })),
    getAvailablePromptTypes: jest.fn(() => ['portfolio-analysis', 'risk-assessment'])
  }
}));

const renderWithProviders = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

const mockUserContext = {
  portfolioData: {
    currentAssets: [
      { ticker: 'AAPL', shares: 10, currentPrice: 150, value: 1500 },
      { ticker: '7203.T', shares: 100, currentPrice: 2000, value: 200000 }
    ],
    targetPortfolio: [
      { ticker: 'AAPL', allocation: 30 },
      { ticker: '7203.T', allocation: 70 }
    ]
  },
  settings: {
    baseCurrency: 'JPY',
    exchangeRate: 150
  }
};

describe('PromptOrchestrator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    expect(screen.getByText(/AI プロンプト|AI Prompt/i)).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    // ローディング状態を確認
    expect(screen.getByText(/読み込み中|Loading/i)).toBeInTheDocument();
  });

  it('displays generated prompt after loading', async () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    // プロンプトが生成されるまで待機
    await waitFor(() => {
      expect(screen.getByText('テスト用プロンプト')).toBeInTheDocument();
    });
  });

  it('handles different prompt types', async () => {
    const { rerender } = renderWithProviders(
      <PromptOrchestrator 
        promptType="risk-assessment"
        userContext={mockUserContext}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('テスト用プロンプト')).toBeInTheDocument();
    });

    // プロンプトタイプを変更
    rerender(
      <I18nextProvider i18n={i18n}>
        <PromptOrchestrator 
          promptType="portfolio-analysis"
          userContext={mockUserContext}
        />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('テスト用プロンプト')).toBeInTheDocument();
    });
  });

  it('handles empty user context gracefully', async () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={null}
      />
    );
    
    // エラーが発生せずレンダリングされることを確認
    expect(screen.getByText(/AI プロンプト|AI Prompt/i)).toBeInTheDocument();
  });

  it('displays error state when prompt generation fails', async () => {
    const { PortfolioPromptService } = require('../../../../services/portfolio/PortfolioPromptService');
    PortfolioPromptService.generatePrompt.mockRejectedValueOnce(new Error('プロンプト生成エラー'));

    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/エラー|Error/i)).toBeInTheDocument();
    });
  });

  it('updates when userContext changes', async () => {
    const { rerender } = renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('テスト用プロンプト')).toBeInTheDocument();
    });

    // userContextを変更
    const updatedContext = {
      ...mockUserContext,
      portfolioData: {
        ...mockUserContext.portfolioData,
        currentAssets: [
          { ticker: 'GOOGL', shares: 5, currentPrice: 2500, value: 12500 }
        ]
      }
    };

    rerender(
      <I18nextProvider i18n={i18n}>
        <PromptOrchestrator 
          promptType="portfolio-analysis"
          userContext={updatedContext}
        />
      </I18nextProvider>
    );

    // プロンプトが再生成されることを確認
    await waitFor(() => {
      expect(screen.getByText('テスト用プロンプト')).toBeInTheDocument();
    });
  });

  it('provides accessibility features', async () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    await waitFor(() => {
      // ARIA属性が適切に設定されていることを確認
      const promptContainer = screen.getByRole('region');
      expect(promptContainer).toBeInTheDocument();
    });
  });

  it('handles undefined promptType gracefully', () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType={undefined}
        userContext={mockUserContext}
      />
    );
    
    expect(screen.getByText(/AI プロンプト|AI Prompt/i)).toBeInTheDocument();
  });

  it('displays context information when available', async () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    await waitFor(() => {
      // コンテキスト情報が表示されることを確認
      expect(screen.getByText(/資産総額/)).toBeInTheDocument();
    });
  });

  it('renders recommendations when available', async () => {
    renderWithProviders(
      <PromptOrchestrator 
        promptType="portfolio-analysis"
        userContext={mockUserContext}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('推奨アクション1')).toBeInTheDocument();
      expect(screen.getByText('推奨アクション2')).toBeInTheDocument();
    });
  });
});