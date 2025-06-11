/**
 * AiAnalysisPrompt.jsx のユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../mocks/i18n';
import AiAnalysisPrompt from '../../../../components/simulation/AiAnalysisPrompt';

const renderWithProviders = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

const mockSimulationData = {
  currentPortfolio: [
    { ticker: 'AAPL', shares: 10, value: 1500, allocation: 60 },
    { ticker: '7203.T', shares: 100, value: 200000, allocation: 40 }
  ],
  targetPortfolio: [
    { ticker: 'AAPL', targetAllocation: 50 },
    { ticker: '7203.T', targetAllocation: 50 }
  ],
  budget: 100000,
  recommendations: [
    { ticker: 'AAPL', action: 'buy', shares: 5, amount: 750 },
    { ticker: '7203.T', action: 'sell', shares: 20, amount: 40000 }
  ],
  totalValue: 201500,
  baseCurrency: 'JPY'
};

describe('AiAnalysisPrompt Component', () => {
  const mockOnPromptGenerated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/AI分析プロンプト|AI Analysis Prompt/i)).toBeInTheDocument();
  });

  it('displays simulation summary', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    // シミュレーション結果の要約が表示されることを確認
    expect(screen.getByText(/資産総額|Total Value/i)).toBeInTheDocument();
    expect(screen.getByText(/予算|Budget/i)).toBeInTheDocument();
  });

  it('shows current portfolio composition', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('7203.T')).toBeInTheDocument();
  });

  it('displays recommendations', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/推奨|Recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/buy|購入/i)).toBeInTheDocument();
    expect(screen.getByText(/sell|売却/i)).toBeInTheDocument();
  });

  it('generates prompt when button is clicked', async () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /プロンプト生成|Generate Prompt/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnPromptGenerated).toHaveBeenCalledWith(
        expect.stringContaining('AAPL')
      );
    });
  });

  it('handles empty simulation data gracefully', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={{}}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/AI分析プロンプト|AI Analysis Prompt/i)).toBeInTheDocument();
  });

  it('handles null simulation data', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={null}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/AI分析プロンプト|AI Analysis Prompt/i)).toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    // 通貨フォーマットが適用されていることを確認
    expect(screen.getByText(/¥|JPY/)).toBeInTheDocument();
  });

  it('shows different currencies appropriately', () => {
    const usdSimulationData = {
      ...mockSimulationData,
      baseCurrency: 'USD'
    };
    
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={usdSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/\$|USD/)).toBeInTheDocument();
  });

  it('handles missing recommendations array', () => {
    const dataWithoutRecommendations = {
      ...mockSimulationData,
      recommendations: undefined
    };
    
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={dataWithoutRecommendations}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/AI分析プロンプト|AI Analysis Prompt/i)).toBeInTheDocument();
  });

  it('handles empty recommendations array', () => {
    const dataWithEmptyRecommendations = {
      ...mockSimulationData,
      recommendations: []
    };
    
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={dataWithEmptyRecommendations}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/推奨事項なし|No recommendations/i)).toBeInTheDocument();
  });

  it('displays prompt template options', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    const templateSelector = screen.getByRole('combobox') || 
                           screen.getByDisplayValue(/テンプレート|Template/i);
    
    if (templateSelector) {
      expect(templateSelector).toBeInTheDocument();
    }
  });

  it('updates prompt when template changes', async () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    const templateSelector = screen.getByRole('combobox');
    if (templateSelector) {
      fireEvent.change(templateSelector, { target: { value: 'risk-analysis' } });
      
      const generateButton = screen.getByRole('button', { name: /プロンプト生成|Generate Prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockOnPromptGenerated).toHaveBeenCalled();
      });
    }
  });

  it('shows copy to clipboard functionality', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve())
      }
    });
    
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /プロンプト生成|Generate Prompt/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /コピー|Copy/i });
      if (copyButton) {
        fireEvent.click(copyButton);
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      }
    });
  });

  it('provides accessibility features', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    // ARIA属性が適切に設定されていることを確認
    const section = screen.getByRole('region') || screen.getByRole('main');
    expect(section).toBeInTheDocument();
    
    // ボタンにアクセシブルな名前があることを確認
    const generateButton = screen.getByRole('button', { name: /プロンプト生成|Generate Prompt/i });
    expect(generateButton).toHaveAttribute('type', 'button');
  });

  it('handles missing onPromptGenerated callback', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /プロンプト生成|Generate Prompt/i });
    
    // コールバックなしでもエラーが発生しないことを確認
    expect(() => fireEvent.click(generateButton)).not.toThrow();
  });

  it('displays allocation percentages correctly', () => {
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={mockSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });

  it('handles large portfolio data efficiently', () => {
    const largeSimulationData = {
      ...mockSimulationData,
      currentPortfolio: Array.from({ length: 100 }, (_, i) => ({
        ticker: `STOCK${i}`,
        shares: 10,
        value: 1000,
        allocation: 1
      }))
    };
    
    renderWithProviders(
      <AiAnalysisPrompt 
        simulationData={largeSimulationData}
        onPromptGenerated={mockOnPromptGenerated}
      />
    );
    
    expect(screen.getByText(/AI分析プロンプト|AI Analysis Prompt/i)).toBeInTheDocument();
  });
});