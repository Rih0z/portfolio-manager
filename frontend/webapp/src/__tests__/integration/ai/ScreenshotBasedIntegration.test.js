/**
 * スクリーンショットベースのAI統合テスト
 * 実際の証券会社ポートフォリオ画面からYAMLデータを生成してテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIDataImportModal from '../../../components/ai/AIDataImportModal';
import { PortfolioContext } from '../../../context/PortfolioContext';

// スクリーンショット画像のパス
const SCREENSHOT_PATH = '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/test-data/screenshot';

// スクリーンショットから抽出されたポートフォリオデータ（IMG_4627.PNG & IMG_4628.PNG より）
const SCREENSHOT_PORTFOLIO_DATA_1 = {
  portfolio_data: {
    metadata: {
      total_assets: 41277.33,
      currency: "USD",
      last_updated: "2024-07-02",
      account_type: "Individual Cash",
      account_name: "Schwab Account",
      source: "schwab_mobile_screenshot"
    },
    holdings: [
      {
        symbol: "EIDO",
        name: "iShares MSCI Indonesia ETF",
        type: "ETF",
        market: "EMERGING",
        quantity: 170,
        current_price: 17.45,
        current_value: 2966.50,
        currency: "USD",
        allocation_percentage: 7.19,
        open_pnl: -62.55,
        open_pnl_percentage: -2.07,
        last_avg_price: 17.82
      },
      {
        symbol: "AAPL",
        name: "Apple Inc",
        type: "Stock",
        market: "US",
        quantity: 0.18225,
        current_price: 212.05,
        current_value: 38.65,
        currency: "USD",
        allocation_percentage: 0.09,
        open_pnl: -5.43,
        open_pnl_percentage: -12.33,
        last_avg_price: 241.84
      },
      {
        symbol: "SBUX",
        name: "Starbucks Corp",
        type: "Stock",
        market: "US",
        quantity: 0.02619,
        current_price: 94.21,
        current_value: 2.47,
        currency: "USD",
        allocation_percentage: 0.01,
        open_pnl: -0.57,
        open_pnl_percentage: -18.65,
        last_avg_price: 115.81
      },
      {
        symbol: "IEF",
        name: "iShares 7-10 Year Treasury Bond ETF",
        type: "ETF",
        market: "US",
        quantity: 12,
        current_price: 95.01,
        current_value: 1140.12,
        currency: "USD",
        allocation_percentage: 2.76,
        open_pnl: 0.00,
        open_pnl_percentage: 0.00,
        last_avg_price: 95.01
      },
      {
        symbol: "SPOT",
        name: "Spotify Technology S.A.",
        type: "Stock",
        market: "US",
        quantity: 0.051,
        current_price: 710.00,
        current_value: 36.21,
        currency: "USD",
        allocation_percentage: 0.09,
        open_pnl: 5.20,
        open_pnl_percentage: 16.77,
        last_avg_price: 608.01
      },
      {
        symbol: "VNQ",
        name: "Vanguard Real Estate Index Fund ETF",
        type: "ETF",
        market: "US",
        quantity: 10,
        current_price: 90.01,
        current_value: 900.10,
        currency: "USD",
        allocation_percentage: 2.18,
        open_pnl: 8.07,
        open_pnl_percentage: 0.90,
        last_avg_price: 89.20
      },
      {
        symbol: "F",
        name: "Ford Motor Company",
        type: "Stock",
        market: "US",
        quantity: 4.45872,
        current_price: 11.76,
        current_value: 52.43,
        currency: "USD",
        allocation_percentage: 0.13,
        open_pnl: 9.85,
        open_pnl_percentage: 23.14,
        last_avg_price: 9.55
      },
      {
        symbol: "LQD",
        name: "iShares iBoxx Investment Grade Corporate Bond ETF",
        type: "ETF",
        market: "US",
        quantity: 24,
        current_price: 109.36,
        current_value: 2624.64,
        currency: "USD",
        allocation_percentage: 6.36,
        open_pnl: 71.82,
        open_pnl_percentage: 2.81,
        last_avg_price: 106.37
      },
      {
        symbol: "VWO",
        name: "Vanguard FTSE Emerging Markets ETF",
        type: "ETF",
        market: "EMERGING",
        quantity: 18,
        current_price: 49.65,
        current_value: 893.70,
        currency: "USD",
        allocation_percentage: 2.17,
        open_pnl: 74.04,
        open_pnl_percentage: 9.03,
        last_avg_price: 45.54
      }
    ]
  }
};

const SCREENSHOT_PORTFOLIO_DATA_2 = {
  portfolio_data: {
    metadata: {
      total_assets: 41277.33,
      currency: "USD",
      last_updated: "2024-07-02",
      account_type: "Individual Cash",
      account_name: "Schwab Account (Continued)",
      source: "schwab_mobile_screenshot_page2"
    },
    holdings: [
      {
        symbol: "VXUS",
        name: "Vanguard Total International Stock Index Fund",
        type: "ETF",
        market: "INTERNATIONAL",
        quantity: 26,
        current_price: 69.25,
        current_value: 1800.50,
        currency: "USD",
        allocation_percentage: 4.36,
        open_pnl: 143.87,
        open_pnl_percentage: 8.68,
        last_avg_price: 63.72
      },
      {
        symbol: "IBIT",
        name: "iShares Bitcoin Trust",
        type: "ETF",
        market: "CRYPTO",
        quantity: 27,
        current_price: 61.97,
        current_value: 1673.19,
        currency: "USD",
        allocation_percentage: 4.05,
        open_pnl: 240.14,
        open_pnl_percentage: 16.76,
        last_avg_price: 53.08
      },
      {
        symbol: "INDA",
        name: "iShares MSCI India Small-Cap ETF",
        type: "ETF",
        market: "EMERGING",
        quantity: 52,
        current_price: 55.59,
        current_value: 2890.68,
        currency: "USD",
        allocation_percentage: 7.00,
        open_pnl: 254.30,
        open_pnl_percentage: 9.65,
        last_avg_price: 50.70
      },
      {
        symbol: "GLD",
        name: "SPDR Gold Shares",
        type: "ETF",
        market: "COMMODITY",
        quantity: 10,
        current_price: 308.66,
        current_value: 3086.60,
        currency: "USD",
        allocation_percentage: 7.48,
        open_pnl: 472.22,
        open_pnl_percentage: 18.06,
        last_avg_price: 261.44
      },
      {
        symbol: "QQQ",
        name: "Invesco QQQ Trust",
        type: "ETF",
        market: "US",
        quantity: 11,
        current_price: 550.84,
        current_value: 6059.24,
        currency: "USD",
        allocation_percentage: 14.68,
        open_pnl: 552.97,
        open_pnl_percentage: 10.04,
        last_avg_price: 500.57
      },
      {
        symbol: "VOO",
        name: "Vanguard S&P 500 ETF",
        type: "ETF",
        market: "US",
        quantity: 30,
        current_price: 570.41,
        current_value: 17112.30,
        currency: "USD",
        allocation_percentage: 41.46,
        open_pnl: 857.17,
        open_pnl_percentage: 5.27,
        last_avg_price: 541.84
      }
    ],
    target_allocation: [
      {
        asset_class: "US_Stocks",
        target_percentage: 60.0,
        current_percentage: 58.1
      },
      {
        asset_class: "International_Stocks",
        target_percentage: 20.0,
        current_percentage: 16.0
      },
      {
        asset_class: "Emerging_Markets",
        target_percentage: 10.0,
        current_percentage: 14.7
      },
      {
        asset_class: "Bonds",
        target_percentage: 5.0,
        current_percentage: 9.4
      },
      {
        asset_class: "Alternative_Assets",
        target_percentage: 5.0,
        current_percentage: 7.7
      }
    ]
  }
};

// モック設定
jest.mock('../../../hooks/useYAMLIntegration', () => ({
  useYAMLIntegration: jest.fn()
}));

jest.mock('../../../utils/yamlProcessor', () => ({
  default: {
    parse: jest.fn(),
    detectType: jest.fn(),
    generateMetadata: jest.fn()
  }
}));

// Context用のモックプロバイダー
const createMockProvider = (portfolioContextValue) => {
  return ({ children }) => (
    <PortfolioContext.Provider value={portfolioContextValue}>
      {children}
    </PortfolioContext.Provider>
  );
};

describe('スクリーンショットベースAI統合テスト', () => {
  const mockIntegrateYAMLData = jest.fn();
  const mockRollbackToBackup = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnImportComplete = jest.fn();
  let mockPortfolioContext;

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    dataType: 'portfolio',
    userContext: {
      age: 35,
      occupation: '会社員',
      investmentExperience: '中級者'
    },
    onImportComplete: mockOnImportComplete
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // PortfolioContext のモック設定
    mockPortfolioContext = {
      currentAssets: [],
      targetPortfolio: [],
      additionalBudget: { amount: 0 },
      setCurrentAssets: jest.fn(),
      setTargetPortfolio: jest.fn(),
      setAdditionalBudget: jest.fn(),
      saveToLocalStorage: jest.fn(),
      addNotification: jest.fn()
    };
    
    require('../../../hooks/useYAMLIntegration').useYAMLIntegration.mockReturnValue({
      integrateYAMLData: mockIntegrateYAMLData,
      rollbackToBackup: mockRollbackToBackup,
      isIntegrating: false,
      lastIntegrationResult: null,
      hasBackup: false,
      integrationHistory: []
    });

    const YAMLUtils = require('../../../utils/yamlProcessor').default;
    YAMLUtils.parse.mockImplementation((yamlString) => {
      if (yamlString.includes('VXUS')) {
        return SCREENSHOT_PORTFOLIO_DATA_2;
      }
      return SCREENSHOT_PORTFOLIO_DATA_1;
    });

    YAMLUtils.detectType.mockReturnValue('portfolio_update');
    YAMLUtils.generateMetadata.mockReturnValue({
      dataType: 'portfolio_update',
      lineCount: 50,
      sizeInBytes: 2500,
      holdingsCount: 15
    });
  });

  describe('スクリーンショット1 (IMG_4627.PNG) のデータ統合', () => {
    it('個別株とETFの混合ポートフォリオを正常に処理する', async () => {
      const user = userEvent;
      
      mockIntegrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [
          { message: '一部の銘柄で微小な保有数量が検出されました' }
        ],
        appliedChanges: [
          { type: 'portfolio_update', description: 'Schwabアカウントポートフォリオを統合' },
          { type: 'holdings_update', description: '9銘柄の保有情報を追加' },
          { type: 'allocation_update', description: 'セクター配分を更新' }
        ],
        metadata: {
          totalValue: 39875.46,
          holdingsCount: 9,
          marketExposure: {
            US: 58.1,
            Emerging: 7.44,
            Bonds: 2.86,
            Alternative: 2.26
          }
        }
      });

      const MockProvider = createMockProvider(mockPortfolioContext);
      render(
        <MockProvider>
          <AIDataImportModal {...defaultProps} />
        </MockProvider>
      );
      
      // モーダルが開いていることを確認
      expect(screen.getByText('AI投資データ取り込み')).toBeInTheDocument();
      
      // Step 1: データタイプ選択
      const portfolioOption = screen.getByText('ポートフォリオデータ');
      expect(portfolioOption).toBeInTheDocument();
      await user.click(portfolioOption);
      
      const nextButton = screen.getAllByText('次へ')[0];
      await user.click(nextButton);
      
      // Step 2: プロンプト表示をスキップ
      await waitFor(() => {
        const step2NextButton = screen.getAllByText('次へ')[0];
        expect(step2NextButton).toBeInTheDocument();
      });
      
      await user.click(screen.getAllByText('次へ')[0]);
      
      // Step 3: YAML統合
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.clear(textarea);
      await user.type(textarea, 'portfolio_data test data');
      
      const importButton = screen.getByText('データを取り込む');
      expect(importButton).toBeInTheDocument();
      await user.click(importButton);
      
      // 統合処理が呼ばれることを確認
      await waitFor(() => {
        expect(mockIntegrateYAMLData).toHaveBeenCalled();
      }, { timeout: 3000 });

      // 統合結果の表示を確認
      await waitFor(() => {
        expect(screen.getByText(/データの統合が完了しました/)).toBeInTheDocument();
      });
      
      expect(mockOnImportComplete).toHaveBeenCalled();
    });

    it('マイナス運用成績の銘柄も正確に処理する', async () => {
      const user = userEvent;
      
      mockIntegrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [
          { type: 'risk_analysis', description: 'マイナス運用成績の銘柄を3件検出' }
        ]
      });

      const MockProvider = createMockProvider(mockPortfolioContext);
      render(
        <MockProvider>
          <AIDataImportModal {...defaultProps} />
        </MockProvider>
      );
      
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'portfolio_data test data');
      
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(mockIntegrateYAMLData).toHaveBeenCalled();
      });

      // マイナス運用成績の銘柄が含まれていることを確認
      const integratedData = mockIntegrateYAMLData.mock.calls[0][0];
      const lossHoldings = integratedData.portfolio_data.holdings.filter(
        holding => holding.open_pnl < 0
      );
      
      expect(lossHoldings).toHaveLength(3); // EIDO, AAPL, SBUX
      expect(lossHoldings.map(h => h.symbol)).toEqual(['EIDO', 'AAPL', 'SBUX']);
    });
  });

  describe('スクリーンショット2 (IMG_4628.PNG) のデータ統合', () => {
    it('大型ポートフォリオと目標配分を正常に処理する', async () => {
      const user = userEvent;
      
      mockIntegrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [
          { type: 'portfolio_update', description: 'メインポートフォリオを統合' },
          { type: 'target_allocation_update', description: '目標配分を設定' },
          { type: 'rebalancing_analysis', description: 'リバランシング推奨を生成' }
        ],
        metadata: {
          totalValue: 39875.46,
          holdingsCount: 6,
          largestHolding: { symbol: 'VOO', percentage: 42.91 },
          rebalancingNeeded: true
        }
      });

      const MockProvider = createMockProvider(mockPortfolioContext);
      render(
        <MockProvider>
          <AIDataImportModal {...defaultProps} />
        </MockProvider>
      );
      
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'VXUS test data');
      
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(mockIntegrateYAMLData).toHaveBeenCalledWith(
          expect.objectContaining({
            portfolio_data: expect.objectContaining({
              holdings: expect.arrayContaining([
                expect.objectContaining({ symbol: 'VOO', allocation_percentage: 42.91 }),
                expect.objectContaining({ symbol: 'QQQ', allocation_percentage: 15.19 }),
                expect.objectContaining({ symbol: 'GLD', allocation_percentage: 7.74 })
              ]),
              target_allocation: expect.arrayContaining([
                expect.objectContaining({ 
                  asset_class: 'US_Stocks', 
                  target_percentage: 60.0,
                  current_percentage: 58.1 
                }),
                expect.objectContaining({ 
                  asset_class: 'International_Stocks', 
                  target_percentage: 20.0,
                  current_percentage: 16.0 
                })
              ])
            })
          }),
          'portfolio',
          expect.any(Object)
        );
      });

      expect(screen.getByText('データの統合が完了しました')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('統合エラーを適切に表示する', async () => {
      const user = userEvent;
      
      mockIntegrateYAMLData.mockResolvedValue({
        success: false,
        errors: [
          { message: '必須フィールド currency が不足しています', field: 'metadata.currency' }
        ],
        warnings: [],
        appliedChanges: []
      });

      const MockProvider = createMockProvider(mockPortfolioContext);
      render(
        <MockProvider>
          <AIDataImportModal {...defaultProps} />
        </MockProvider>
      );
      
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'invalid data');
      
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(screen.getByText('必須フィールド currency が不足しています')).toBeInTheDocument();
      });
    });
  });
});