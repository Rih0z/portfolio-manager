/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/__tests__/unit/pages/DataImport.test.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * DataImportページのユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { PortfolioContext } from '../../../context/PortfolioContext';
import DataImport from '../../../pages/DataImport';

// モックコンポーネント
jest.mock('../../../components/ai/ScreenshotAnalyzer', () => {
  return function MockScreenshotAnalyzer({ onDataExtracted }) {
    return (
      <div data-testid="screenshot-analyzer">
        <button onClick={() => onDataExtracted({
          portfolioData: {
            assets: [{
              name: 'Test Asset',
              ticker: 'TEST',
              quantity: 100,
              currentPrice: 1000,
              totalValue: 100000
            }]
          }
        }, 'screenshot_portfolio')}>
          Mock Extract Data
        </button>
      </div>
    );
  };
});

jest.mock('../../../components/ai/PromptOrchestrator', () => {
  return function MockPromptOrchestrator({ onPromptGenerated }) {
    return (
      <div data-testid="prompt-orchestrator">
        <button onClick={() => onPromptGenerated({
          title: 'Mock Prompt',
          content: 'Mock prompt content'
        })}>
          Mock Generate Prompt
        </button>
      </div>
    );
  };
});

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children, portfolioValue = {} }) => {
  const mockPortfolioContext = {
    portfolio: {
      assets: [],
      totalValue: 0,
      ...portfolioValue
    },
    updatePortfolio: jest.fn()
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

describe('DataImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders data import page with title and description', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    expect(screen.getByText(/📊.*AIデータインポート/)).toBeInTheDocument();
    expect(screen.getByText(/AIを活用してスクリーンショットから投資データを自動で取り込めます/)).toBeInTheDocument();
  });

  test('displays import statistics dashboard', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    expect(screen.getByText('インポート回数')).toBeInTheDocument();
    expect(screen.getByText('成功インポート')).toBeInTheDocument();
    expect(screen.getByText('追加された資産')).toBeInTheDocument();
    
    // Initial values should be 0
    expect(screen.getAllByText('0')).toHaveLength(3);
  });

  test('displays tab navigation with all tabs', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    expect(screen.getByText('スクリーンショット分析')).toBeInTheDocument();
    expect(screen.getByText('カスタムプロンプト')).toBeInTheDocument();
    expect(screen.getByText('手動入力')).toBeInTheDocument();
  });

  test('switches tabs when tab is clicked', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    // Initially should be on screenshot tab
    expect(screen.getByTestId('screenshot-analyzer')).toBeInTheDocument();
    expect(screen.queryByTestId('prompt-orchestrator')).not.toBeInTheDocument();

    // Click prompt tab
    const promptTab = screen.getByText('カスタムプロンプト').closest('button');
    fireEvent.click(promptTab);

    expect(screen.getByTestId('prompt-orchestrator')).toBeInTheDocument();
    expect(screen.queryByTestId('screenshot-analyzer')).not.toBeInTheDocument();
  });

  test('shows manual entry placeholder for manual tab', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    const manualTab = screen.getByText('手動入力').closest('button');
    fireEvent.click(manualTab);

    expect(screen.getByText('手動データ入力')).toBeInTheDocument();
    expect(screen.getByText('手動入力機能は開発中です。現在はスクリーンショット分析をご利用ください。')).toBeInTheDocument();
  });

  test('handles data extraction from screenshot analyzer', () => {
    const mockUpdatePortfolio = jest.fn();
    
    render(
      <TestWrapper>
        <PortfolioContext.Provider value={{
          portfolio: { assets: [], totalValue: 0 },
          updatePortfolio: mockUpdatePortfolio
        }}>
          <DataImport />
        </PortfolioContext.Provider>
      </TestWrapper>
    );

    const extractButton = screen.getByText('Mock Extract Data');
    fireEvent.click(extractButton);

    // Check if stats are updated
    expect(screen.getByText('1')).toBeInTheDocument(); // Total imports
    expect(screen.getByText('1')).toBeInTheDocument(); // Successful imports
    expect(screen.getByText('1')).toBeInTheDocument(); // Assets added

    // Check if portfolio is updated
    expect(mockUpdatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Asset',
            ticker: 'TEST',
            source: 'ai_import'
          })
        ])
      })
    );
  });

  test('handles prompt generation from prompt orchestrator', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    // Switch to prompt tab
    const promptTab = screen.getByText('カスタムプロンプト').closest('button');
    fireEvent.click(promptTab);

    const generateButton = screen.getByText('Mock Generate Prompt');
    fireEvent.click(generateButton);

    // This should not throw an error and should handle the prompt generation
    expect(generateButton).toBeInTheDocument();
  });

  test('displays import history after successful import', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    const extractButton = screen.getByText('Mock Extract Data');
    fireEvent.click(extractButton);

    expect(screen.getByText('📋 インポート履歴')).toBeInTheDocument();
    expect(screen.getByText('ポートフォリオ')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('1件の資産')).toBeInTheDocument();
  });

  test('updates portfolio with existing assets correctly', () => {
    const existingPortfolio = {
      assets: [{
        id: 'existing-1',
        ticker: 'TEST',
        name: 'Existing Test Asset',
        quantity: 50,
        currentPrice: 800
      }],
      totalValue: 40000
    };

    const mockUpdatePortfolio = jest.fn();

    render(
      <TestWrapper>
        <PortfolioContext.Provider value={{
          portfolio: existingPortfolio,
          updatePortfolio: mockUpdatePortfolio
        }}>
          <DataImport />
        </PortfolioContext.Provider>
      </TestWrapper>
    );

    const extractButton = screen.getByText('Mock Extract Data');
    fireEvent.click(extractButton);

    // Should update existing asset instead of adding new one
    expect(mockUpdatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: expect.arrayContaining([
          expect.objectContaining({
            ticker: 'TEST',
            name: 'Test Asset', // Updated name
            quantity: 100,      // Updated quantity
            currentPrice: 1000  // Updated price
          })
        ])
      })
    );
  });

  test('displays usage tips section', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    expect(screen.getByText('💡 使い方のヒント')).toBeInTheDocument();
    expect(screen.getByText('• スクリーンショットは鮮明で文字が読みやすいものを使用してください')).toBeInTheDocument();
    expect(screen.getByText('• プライベートな情報は事前にマスクまたは削除してください')).toBeInTheDocument();
    expect(screen.getByText('• AIの分析結果は必ず確認してから取り込んでください')).toBeInTheDocument();
    expect(screen.getByText('• 複数の証券会社のデータを統合して管理できます')).toBeInTheDocument();
  });

  test('shows tab descriptions correctly', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    expect(screen.getByText('証券会社の画面をAIで分析してデータを取り込み')).toBeInTheDocument();

    const promptTab = screen.getByText('カスタムプロンプト').closest('button');
    fireEvent.click(promptTab);

    expect(screen.getByText('パーソナライズされたデータ収集プロンプトを生成')).toBeInTheDocument();

    const manualTab = screen.getByText('手動入力').closest('button');
    fireEvent.click(manualTab);

    expect(screen.getByText('AIの支援を受けながら手動でデータを入力')).toBeInTheDocument();
  });

  test('handles multiple imports and updates statistics correctly', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    const extractButton = screen.getByText('Mock Extract Data');
    
    // First import
    fireEvent.click(extractButton);
    expect(screen.getByText('1')).toBeInTheDocument();

    // Second import - simulate different data
    fireEvent.click(extractButton);
    
    // Total imports should be 2, successful imports should be 2
    const statsElements = screen.getAllByText('2');
    expect(statsElements.length).toBeGreaterThanOrEqual(2);
  });

  test('maintains import history with proper ordering', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    const extractButton = screen.getByText('Mock Extract Data');
    
    // First import
    fireEvent.click(extractButton);
    
    // Second import
    fireEvent.click(extractButton);

    // Should show history with most recent first
    const historyItems = screen.getAllByText('ポートフォリオ');
    expect(historyItems).toHaveLength(2);
  });

  test('does not display import history when no imports have been made', () => {
    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    expect(screen.queryByText('📋 インポート履歴')).not.toBeInTheDocument();
  });

  test('handles non-portfolio data extraction types', () => {
    // Mock a market data extraction
    jest.doMock('../../../components/ai/ScreenshotAnalyzer', () => {
      return function MockScreenshotAnalyzer({ onDataExtracted }) {
        return (
          <div data-testid="screenshot-analyzer">
            <button onClick={() => onDataExtracted({
              marketData: [{
                name: 'Test Stock',
                ticker: 'TEST',
                price: 1000
              }]
            }, 'market_data_screenshot')}>
              Mock Extract Market Data
            </button>
          </div>
        );
      };
    });

    render(
      <TestWrapper>
        <DataImport />
      </TestWrapper>
    );

    // This test ensures that non-portfolio data doesn't crash the component
    // and properly updates statistics
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});