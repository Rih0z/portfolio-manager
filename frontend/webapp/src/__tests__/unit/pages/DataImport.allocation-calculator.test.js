/**
 * DataImport.jsx - 投資配分計算タブのテスト
 * プロジェクト: https://portfolio-wise.com/
 * 
 * テスト対象: allocation-calculator タブの機能
 * - 入金額入力
 * - 現在の比率と理想比率の表示
 * - 具体的な銘柄別投資金額計算プロンプト生成
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/index.js';
import DataImport from '../../../pages/DataImport';
import { PortfolioContext } from '../../../context/PortfolioContext';

// Mock modules
jest.mock('../../../components/ai/ScreenshotAnalyzer', () => {
  return function MockScreenshotAnalyzer() {
    return <div data-testid="screenshot-analyzer">Screenshot Analyzer Mock</div>;
  };
});

jest.mock('../../../components/data/GoogleDriveIntegration', () => {
  return function MockGoogleDriveIntegration() {
    return <div data-testid="google-drive-integration">Google Drive Integration Mock</div>;
  };
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('DataImport - 投資配分計算タブ', () => {
  const mockPortfolioContextValue = {
    portfolio: {
      baseCurrency: 'JPY',
      totalValue: 1000000,
      lastUpdated: '2025-07-08T10:00:00.000Z',
      assets: [
        {
          name: 'トヨタ自動車',
          ticker: '7203.T',
          type: 'stock',
          quantity: 100,
          averagePrice: 2500,
          currentPrice: 2600,
          currency: 'JPY',
          market: 'Japan',
          sector: '自動車',
          totalValue: 260000
        },
        {
          name: 'Apple Inc.',
          ticker: 'AAPL',
          type: 'stock',
          quantity: 50,
          averagePrice: 150,
          currentPrice: 160,
          currency: 'USD',
          market: 'US',
          sector: 'テクノロジー',
          totalValue: 1200000 // 8000 USD * 150 JPY/USD
        }
      ],
      targetAllocation: [
        { ticker: '7203.T', targetPercent: 30, currentPercent: 26 },
        { ticker: 'AAPL', targetPercent: 40, currentPercent: 65 },
        { ticker: 'VTI', targetPercent: 30, currentPercent: 0 }
      ]
    },
    updatePortfolio: jest.fn()
  };

  const renderComponent = (portfolioContext = mockPortfolioContextValue) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <PortfolioContext.Provider value={portfolioContext}>
          <DataImport />
        </PortfolioContext.Provider>
      </I18nextProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('タブ基本機能', () => {
    test('配分計算タブが表示される', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      expect(allocationCalculatorTab).toBeInTheDocument();
    });

    test('配分計算タブをクリックすると対応するコンテンツが表示される', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      expect(screen.getByText('Investment Allocation Calculator')).toBeInTheDocument();
    });
  });

  describe('入金額入力', () => {
    test('入金額入力フィールドが表示される', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const depositAmountInput = screen.getByPlaceholderText('100000');
      expect(depositAmountInput).toBeInTheDocument();
      expect(depositAmountInput).toHaveAttribute('type', 'number');
    });

    test('入金額を変更できる', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const depositAmountInput = screen.getByPlaceholderText('100000');
      fireEvent.change(depositAmountInput, { target: { value: '500000' } });
      
      expect(depositAmountInput.value).toBe('500000');
    });
  });

  describe('現在の比率と理想比率の表示', () => {
    test('現在のポートフォリオ状況が表示される', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      expect(screen.getByText('Current Portfolio Analysis')).toBeInTheDocument();
      expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    test('理想配分との乖離が表示される', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      expect(screen.getByText('Gap from Ideal Allocation')).toBeInTheDocument();
    });

    test('各銘柄の現在比率と目標比率が表示される', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      // 7203.T: 現在26%, 目標30%
      expect(screen.getByText(/26\.0%/)).toBeInTheDocument();
      expect(screen.getByText(/30%/)).toBeInTheDocument();
    });
  });

  describe('プロンプト生成機能', () => {
    test('配分計算プロンプト生成ボタンが表示される', () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const generateButton = screen.getByText('Generate Allocation Calculation Prompt');
      expect(generateButton).toBeInTheDocument();
    });

    test('プロンプト生成ボタンをクリックするとプロンプトが生成される', async () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const generateButton = screen.getByText('Generate Allocation Calculation Prompt');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Generated Prompt')).toBeInTheDocument();
      });
    });

    test('生成されたプロンプトに入金額が含まれる', async () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      // 入金額を変更
      const depositAmountInput = screen.getByPlaceholderText('100000');
      fireEvent.change(depositAmountInput, { target: { value: '500000' } });
      
      const generateButton = screen.getByText('Generate Allocation Calculation Prompt');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const promptContent = screen.getByText(/500,000/);
        expect(promptContent).toBeInTheDocument();
      });
    });

    test('生成されたプロンプトに現在の資産情報が含まれる', async () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const generateButton = screen.getByText('Generate Allocation Calculation Prompt');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/トヨタ自動車/)).toBeInTheDocument();
        expect(screen.getByText(/Apple Inc/)).toBeInTheDocument();
      });
    });
  });

  describe('プロンプトコピー機能', () => {
    test('プロンプトコピーボタンが表示される', async () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const generateButton = screen.getByText('Generate Allocation Calculation Prompt');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getByText('Copy');
        expect(copyButton).toBeInTheDocument();
      });
    });

    test('コピーボタンをクリックするとクリップボードにコピーされる', async () => {
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const generateButton = screen.getByText('Generate Allocation Calculation Prompt');
      fireEvent.click(generateButton);
      
      await waitFor(async () => {
        const copyButton = screen.getByText('Copy');
        fireEvent.click(copyButton);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('資産データがない場合の警告が表示される', () => {
      const emptyPortfolioContext = {
        ...mockPortfolioContextValue,
        portfolio: {
          ...mockPortfolioContextValue.portfolio,
          assets: []
        }
      };
      
      renderComponent(emptyPortfolioContext);
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      const generateButton = screen.getByText('Generate Allocation Calculation Prompt');
      fireEvent.click(generateButton);
      
      // アラートのモック確認は難しいので、エラーメッセージの表示確認
      expect(screen.getByText(/Please input current asset data first/)).toBeInTheDocument();
    });

    test('理想配分が設定されていない場合の対応', () => {
      const noTargetPortfolioContext = {
        ...mockPortfolioContextValue,
        portfolio: {
          ...mockPortfolioContextValue.portfolio,
          targetAllocation: []
        }
      };
      
      renderComponent(noTargetPortfolioContext);
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      expect(screen.getByText(/No target allocation set/)).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    test('モバイル表示でも適切にレンダリングされる', () => {
      // viewport設定をモバイルサイズに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderComponent();
      
      const allocationCalculatorTab = screen.getByText('Allocation Calculator');
      fireEvent.click(allocationCalculatorTab);
      
      expect(screen.getByText('Investment Allocation Calculator')).toBeInTheDocument();
    });
  });
});