/**
 * PortfolioActionsContext.js のテストファイル
 * ポートフォリオアクションコンテキストの包括的テスト
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PortfolioActionsProvider, PortfolioActionsContext } from '../../../../context/portfolio/PortfolioActionsContext';
import { PortfolioDataContext } from '../../../../context/portfolio/PortfolioDataContext';

// 依存関係のモック
jest.mock('../../../../hooks/portfolio/useNotifications', () => ({
  useNotifications: jest.fn()
}));

jest.mock('../../../../services/api', () => ({
  fetchTickerData: jest.fn(),
  fetchFundInfo: jest.fn(),
  fetchDividendData: jest.fn()
}));

jest.mock('../../../../utils/fundUtils', () => ({
  guessFundType: jest.fn(),
  FUND_TYPES: {
    STOCK: 'Stock',
    ETF_US: 'US ETF',
    ETF_JP: 'JP ETF',
    MUTUAL_FUND: 'Mutual Fund'
  },
  US_ETF_LIST: ['SPY', 'VOO', 'VTI']
}));

jest.mock('../../../../utils/assetValidation', () => ({
  validateAssetTypes: jest.fn()
}));

// テスト用のコンポーネント
const TestConsumer = () => {
  const context = React.useContext(PortfolioActionsContext);
  
  const handleAddTicker = async () => {
    const result = await context.addTicker('AAPL', 10);
    console.log('Add ticker result:', result);
  };

  return (
    <div>
      <div data-testid="context-available">
        {context ? 'Context Available' : 'Context Not Available'}
      </div>
      <button data-testid="add-ticker-btn" onClick={handleAddTicker}>
        Add Ticker
      </button>
      {context.removeTicker && (
        <button 
          data-testid="remove-ticker-btn" 
          onClick={() => context.removeTicker('AAPL')}
        >
          Remove Ticker
        </button>
      )}
    </div>
  );
};

// テスト用のラッパー
const TestWrapper = ({ children, portfolioDataContext }) => (
  <PortfolioDataContext.Provider value={portfolioDataContext}>
    <PortfolioActionsProvider>
      {children}
    </PortfolioActionsProvider>
  </PortfolioDataContext.Provider>
);

describe('PortfolioActionsContext', () => {
  let mockPortfolioDataContext;
  let mockAddNotification;
  let mockFetchTickerData;
  let mockFetchFundInfo;
  let mockFetchDividendData;
  let mockGuessFundType;

  beforeEach(() => {
    jest.clearAllMocks();

    // ポートフォリオデータコンテキストのモック
    mockPortfolioDataContext = {
      currentAssets: [],
      setCurrentAssets: jest.fn(),
      targetPortfolio: [],
      setTargetPortfolio: jest.fn(),
      setIsLoading: jest.fn(),
      saveToLocalStorage: jest.fn()
    };

    // 通知フックのモック
    mockAddNotification = jest.fn();
    const { useNotifications } = require('../../../../hooks/portfolio/useNotifications');
    useNotifications.mockReturnValue({
      addNotification: mockAddNotification
    });

    // API関数のモック
    const apiMocks = require('../../../../services/api');
    mockFetchTickerData = apiMocks.fetchTickerData;
    mockFetchFundInfo = apiMocks.fetchFundInfo;
    mockFetchDividendData = apiMocks.fetchDividendData;

    // ユーティリティ関数のモック
    const { guessFundType } = require('../../../../utils/fundUtils');
    mockGuessFundType = guessFundType;
  });

  describe('プロバイダーの基本機能', () => {
    test('コンテキストが正常に提供される', () => {
      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <TestConsumer />
        </TestWrapper>
      );

      expect(screen.getByTestId('context-available')).toHaveTextContent('Context Available');
    });

    test('プロバイダーなしではコンテキストが利用できない', () => {
      // エラーをキャッチするためのコンソールエラーをモック
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('addTicker機能', () => {
    test('有効なティッカーシンボルで銘柄を追加できる', async () => {
      mockFetchTickerData.mockResolvedValue({
        success: true,
        data: {
          name: 'Apple Inc.',
          price: 150,
          currency: 'USD',
          source: 'API'
        }
      });

      mockFetchFundInfo.mockResolvedValue({
        fundType: 'Stock',
        annualFee: 0,
        feeSource: '個別株',
        feeIsEstimated: false
      });

      mockFetchDividendData.mockResolvedValue({
        data: {
          hasDividend: true,
          dividendYield: 0.5,
          dividendFrequency: 'quarterly',
          isEstimated: false
        }
      });

      mockGuessFundType.mockReturnValue('Stock');

      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <TestConsumer />
        </TestWrapper>
      );

      await act(async () => {
        const addButton = screen.getByTestId('add-ticker-btn');
        addButton.click();
      });

      await waitFor(() => {
        expect(mockFetchTickerData).toHaveBeenCalledWith('AAPL');
        expect(mockPortfolioDataContext.setCurrentAssets).toHaveBeenCalled();
        expect(mockPortfolioDataContext.setIsLoading).toHaveBeenCalledWith(true);
      });
    });

    test('空のティッカーシンボルでエラーが発生する', async () => {
      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="add-empty-ticker"
                onClick={async () => {
                  const result = await context.addTicker('');
                  expect(result.success).toBe(false);
                  expect(result.message).toBe('ティッカーシンボルを入力してください');
                }}
              >
                Add Empty Ticker
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('add-empty-ticker');
        button.click();
      });
    });

    test('重複する銘柄の追加でエラーが発生する', async () => {
      mockPortfolioDataContext.currentAssets = [
        { ticker: 'AAPL', name: 'Apple Inc.' }
      ];

      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="add-duplicate-ticker"
                onClick={async () => {
                  const result = await context.addTicker('AAPL');
                  expect(result.success).toBe(false);
                  expect(result.message).toBe('既に追加されている銘柄です');
                }}
              >
                Add Duplicate Ticker
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('add-duplicate-ticker');
        button.click();
      });

      expect(mockAddNotification).toHaveBeenCalledWith('既に追加されている銘柄です', 'warning');
    });

    test('API呼び出し失敗でエラーハンドリングが動作する', async () => {
      mockFetchTickerData.mockResolvedValue({
        success: false,
        message: 'API Error'
      });

      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="add-failing-ticker"
                onClick={async () => {
                  const result = await context.addTicker('INVALID');
                  expect(result.success).toBe(false);
                }}
              >
                Add Failing Ticker
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('add-failing-ticker');
        button.click();
      });

      expect(mockAddNotification).toHaveBeenCalledWith(
        '銘柄「INVALID」の情報取得でエラーが発生しました', 
        'error'
      );
    });

    test('US ETFリストの銘柄が正しく識別される', async () => {
      mockFetchTickerData.mockResolvedValue({
        success: true,
        data: {
          name: 'SPDR S&P 500 ETF',
          price: 400,
          currency: 'USD'
        }
      });

      mockFetchFundInfo.mockResolvedValue({
        annualFee: 0.09,
        feeSource: 'ETF',
        feeIsEstimated: false
      });

      mockFetchDividendData.mockResolvedValue({
        data: {
          hasDividend: true,
          dividendYield: 1.5,
          isEstimated: false
        }
      });

      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="add-us-etf"
                onClick={async () => {
                  await context.addTicker('SPY', 5);
                }}
              >
                Add US ETF
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('add-us-etf');
        button.click();
      });

      await waitFor(() => {
        expect(mockPortfolioDataContext.setCurrentAssets).toHaveBeenCalled();
      });
    });
  });

  describe('ファンドタイプ判定', () => {
    test('ファンドタイプが正しく設定される', async () => {
      mockFetchTickerData.mockResolvedValue({
        success: true,
        data: {
          name: 'Test Fund',
          price: 100,
          currency: 'USD'
        }
      });

      mockFetchFundInfo.mockResolvedValue({
        fundType: 'Mutual Fund',
        annualFee: 0.5
      });

      mockFetchDividendData.mockResolvedValue({
        data: { hasDividend: false }
      });

      mockGuessFundType.mockReturnValue('Mutual Fund');

      const testContext = {
        ...mockPortfolioDataContext,
        setCurrentAssets: jest.fn((newAssets) => {
          const addedAsset = Array.isArray(newAssets) 
            ? newAssets[newAssets.length - 1] 
            : newAssets[0];
          expect(addedAsset.fundType).toBe('Mutual Fund');
          expect(addedAsset.isMutualFund).toBe(true);
        })
      };

      render(
        <TestWrapper portfolioDataContext={testContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="add-mutual-fund"
                onClick={() => context.addTicker('TESTFUND')}
              >
                Add Mutual Fund
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('add-mutual-fund');
        button.click();
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('ネットワークエラーが適切に処理される', async () => {
      mockFetchTickerData.mockRejectedValue(new Error('Network Error'));

      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="network-error-test"
                onClick={async () => {
                  try {
                    await context.addTicker('NETWORKERROR');
                  } catch (error) {
                    expect(error.message).toBe('Network Error');
                  }
                }}
              >
                Network Error Test
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('network-error-test');
        button.click();
      });
    });

    test('部分的なデータでも正常に処理される', async () => {
      mockFetchTickerData.mockResolvedValue({
        success: true,
        data: {
          name: 'Partial Data Stock',
          price: 50
          // currency や source が不足
        }
      });

      mockFetchFundInfo.mockResolvedValue({});
      mockFetchDividendData.mockResolvedValue({ data: {} });
      mockGuessFundType.mockReturnValue('Stock');

      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="partial-data-test"
                onClick={() => context.addTicker('PARTIAL')}
              >
                Partial Data Test
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('partial-data-test');
        button.click();
      });

      await waitFor(() => {
        expect(mockPortfolioDataContext.setCurrentAssets).toHaveBeenCalled();
      });
    });
  });

  describe('ローディング状態管理', () => {
    test('ローディング状態が正しく管理される', async () => {
      mockFetchTickerData.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: { name: 'Test', price: 100 }
          }), 100)
        )
      );

      mockFetchFundInfo.mockResolvedValue({});
      mockFetchDividendData.mockResolvedValue({ data: {} });

      render(
        <TestWrapper portfolioDataContext={mockPortfolioDataContext}>
          <PortfolioActionsContext.Consumer>
            {(context) => (
              <button 
                data-testid="loading-test"
                onClick={() => context.addTicker('LOADING')}
              >
                Loading Test
              </button>
            )}
          </PortfolioActionsContext.Consumer>
        </TestWrapper>
      );

      await act(async () => {
        const button = screen.getByTestId('loading-test');
        button.click();
      });

      expect(mockPortfolioDataContext.setIsLoading).toHaveBeenCalledWith(true);
      
      await waitFor(() => {
        expect(mockPortfolioDataContext.setCurrentAssets).toHaveBeenCalled();
      });
    });
  });
});