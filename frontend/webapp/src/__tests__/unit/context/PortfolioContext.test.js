/**
 * PortfolioContext のテスト
 * ポートフォリオ管理の全機能をテスト
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { PortfolioProvider, PortfolioContext, encryptData, decryptData } from '../../../context/PortfolioContext';

// 依存関係のモック
const mockFetchTickerData = jest.fn();
const mockFetchExchangeRate = jest.fn();
const mockFetchFundInfo = jest.fn();
const mockFetchDividendData = jest.fn();
const mockSaveToGoogleDrive = jest.fn();
const mockFetchMultipleStocks = jest.fn();

jest.mock('../../../services/api', () => ({
  fetchTickerData: (...args) => mockFetchTickerData(...args),
  fetchExchangeRate: (...args) => mockFetchExchangeRate(...args),
  fetchFundInfo: (...args) => mockFetchFundInfo(...args),
  fetchDividendData: (...args) => mockFetchDividendData(...args),
  saveToGoogleDrive: (...args) => mockSaveToGoogleDrive(...args)
}));

jest.mock('../../../services/marketDataService', () => ({
  fetchMultipleStocks: (...args) => mockFetchMultipleStocks(...args)
}));

const mockGuessFundType = jest.fn();
const mockEstimateAnnualFee = jest.fn();
const mockEstimateDividendYield = jest.fn();
const mockGetJapaneseStockName = jest.fn();

jest.mock('../../../utils/fundUtils', () => ({
  FUND_TYPES: {
    STOCK: 'Stock',
    ETF_US: 'US ETF',
    ETF_JP: 'JP ETF',
    MUTUAL_FUND_JP: 'JP Mutual Fund'
  },
  guessFundType: (...args) => mockGuessFundType(...args),
  estimateAnnualFee: (...args) => mockEstimateAnnualFee(...args),
  estimateDividendYield: (...args) => mockEstimateDividendYield(...args),
  US_ETF_LIST: ['VTI', 'VOO', 'VXUS'],
  TICKER_SPECIFIC_FEES: {
    'VTI': 0.03,
    'VOO': 0.03
  },
  TICKER_SPECIFIC_DIVIDENDS: {
    'VTI': 1.5,
    'VOO': 1.4
  }
}));

jest.mock('../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: (...args) => mockGetJapaneseStockName(...args)
}));

const mockRequestManagerRequest = jest.fn();
const mockDebouncedRefreshMarketData = jest.fn();

jest.mock('../../../utils/requestThrottle', () => ({
  requestManager: {
    request: (...args) => mockRequestManagerRequest(...args)
  },
  debouncedRefreshMarketData: (fn) => mockDebouncedRefreshMarketData(fn),
  requestDeduplicator: {
    execute: jest.fn((key, fn) => fn())
  }
}));

const mockShouldUpdateExchangeRate = jest.fn();

jest.mock('../../../utils/exchangeRateDebounce', () => ({
  shouldUpdateExchangeRate: (...args) => mockShouldUpdateExchangeRate(...args),
  clearExchangeRateCache: jest.fn()
}));

// LocalStorage のモック
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// btoa/atob のモック
global.btoa = jest.fn((str) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString('binary'));

// encodeURIComponent/decodeURIComponentのモック
global.encodeURIComponent = jest.fn((str) => str);
global.decodeURIComponent = jest.fn((str) => str);

// コンソールログのモック
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// テスト用のコンシューマーコンポーネント
const TestConsumer = ({ callback }) => {
  const context = React.useContext(PortfolioContext);
  
  React.useEffect(() => {
    if (callback && context) {
      callback(context);
    }
  }, [callback, context]);

  return <div data-testid="consumer">Test Consumer</div>;
};

describe('PortfolioContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.clear.mockClear();
    
    // デフォルトのモック設定
    mockShouldUpdateExchangeRate.mockReturnValue(true);
    mockGuessFundType.mockReturnValue('Stock');
    mockEstimateAnnualFee.mockReturnValue({ fee: 0, source: '個別株', isEstimated: false });
    mockEstimateDividendYield.mockReturnValue({ 
      yield: 0, 
      hasDividend: false, 
      dividendFrequency: 'Annual', 
      isEstimated: true 
    });
    mockGetJapaneseStockName.mockImplementation((ticker) => ticker);
    mockDebouncedRefreshMarketData.mockImplementation((fn) => fn());
    mockRequestManagerRequest.mockImplementation((_, fn) => fn());
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('初期化とプロバイダー', () => {
    it('プロバイダーが正しく初期化される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      expect(screen.getByTestId('consumer')).toBeInTheDocument();
      expect(contextValue).toBeDefined();
      expect(contextValue.currentAssets).toEqual([]);
      expect(contextValue.targetPortfolio).toEqual([]);
      expect(contextValue.baseCurrency).toBe('JPY');
    });

    it('初期状態で正しいデフォルト値が設定される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      expect(contextValue.exchangeRate).toEqual({
        rate: 150.0,
        source: 'Default',
        lastUpdated: expect.any(String)
      });
      expect(contextValue.additionalBudget).toEqual({
        amount: 300000,
        currency: 'JPY'
      });
      expect(contextValue.isLoading).toBe(false);
      expect(contextValue.dataSource).toBe('local');
      expect(contextValue.lastSyncTime).toBeNull();
      expect(contextValue.currentUser).toBeNull();
      expect(contextValue.aiPromptTemplate).toBeNull();
    });
    
    it('初期化時にローカルストレージからデータを読み込む', async () => {
      const testData = {
        baseCurrency: 'USD',
        currentAssets: [{ ticker: 'AAPL', holdings: 10, fundType: 'Stock' }],
        targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 50 }],
        additionalBudget: { amount: 5000, currency: 'USD' },
        exchangeRate: { rate: 140, source: 'Test', lastUpdated: '2023-01-01' },
        aiPromptTemplate: 'test template',
        lastUpdated: '2023-01-01T00:00:00Z'
      };
      
      const encryptedData = btoa(encodeURIComponent(JSON.stringify(testData)));
      mockLocalStorage.getItem.mockReturnValue(encryptedData);

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );
      
      // 初期化処理を待つ
      await act(async () => {
        jest.runAllTimers();
      });

      expect(contextValue.baseCurrency).toBe('USD');
      expect(contextValue.currentAssets).toHaveLength(1);
      expect(contextValue.targetPortfolio).toHaveLength(1);
      expect(contextValue.additionalBudget).toEqual({ amount: 5000, currency: 'USD' });
      expect(contextValue.exchangeRate.rate).toBe(140);
      expect(contextValue.aiPromptTemplate).toBe('test template');
    });
  });

  describe('通知管理', () => {
    it('通知の追加と削除が正しく動作する', async () => {
      let contextValue = null;
      
      const { rerender } = render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 通知を追加
      let notificationId;
      act(() => {
        notificationId = contextValue.addNotification('テストメッセージ', 'info');
      });
      
      // 再レンダリングして最新の状態を取得
      rerender(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 通知の追加後の検証を待つ
      await waitFor(() => {
        const notifications = screen.getAllByText(/テストメッセージ/);
        expect(notifications).toHaveLength(1);
      });

      // 通知を削除
      act(() => {
        contextValue.removeNotification(notificationId);
      });

      // 通知が削除されたことを確認
      await waitFor(() => {
        const notifications = screen.queryAllByText(/テストメッセージ/);
        expect(notifications).toHaveLength(0);
      });
    });

    it('エラー通知は自動削除されない', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // エラー通知を追加
      act(() => {
        contextValue.addNotification('エラーメッセージ', 'error');
      });

      // 通知が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
      });

      // 6秒後にも残っていることを確認
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
    });

    it('info通知は5秒後に自動削除される', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // info通知を追加
      act(() => {
        contextValue.addNotification('情報メッセージ', 'info');
      });

      // 通知が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('情報メッセージ')).toBeInTheDocument();
      });

      // 5秒後に削除されることを確認
      act(() => {
        jest.advanceTimersByTime(5001);
      });

      await waitFor(() => {
        expect(screen.queryByText('情報メッセージ')).not.toBeInTheDocument();
      });
    });

    it('複数の通知が正しく管理される', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 複数の通知を追加
      let notificationIds = [];
      act(() => {
        notificationIds.push(contextValue.addNotification('メッセージ1', 'info'));
        notificationIds.push(contextValue.addNotification('メッセージ2', 'warning'));
        notificationIds.push(contextValue.addNotification('メッセージ3', 'error'));
      });

      // すべての通知が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('メッセージ1')).toBeInTheDocument();
        expect(screen.getByText('メッセージ2')).toBeInTheDocument();
        expect(screen.getByText('メッセージ3')).toBeInTheDocument();
      });

      // 特定の通知を削除
      act(() => {
        contextValue.removeNotification(notificationIds[1]);
      });

      // 削除された通知が表示されないことを確認
      await waitFor(() => {
        expect(screen.getByText('メッセージ1')).toBeInTheDocument();
        expect(screen.queryByText('メッセージ2')).not.toBeInTheDocument();
        expect(screen.getByText('メッセージ3')).toBeInTheDocument();
      });
    });
  });

  describe('データ永続化', () => {
    it('ローカルストレージへの保存が正しく動作する', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期化を待つ
      await act(async () => {
        jest.runAllTimers();
      });

      // データを変更
      act(() => {
        contextValue.toggleCurrency(); // JPY -> USD
      });

      // 保存処理を待つ
      await act(async () => {
        jest.runAllTimers();
      });

      // setItemが呼ばれたことを確認
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'portfolioData',
        expect.any(String)
      );

      // 保存されたデータを検証
      const savedData = mockLocalStorage.setItem.mock.calls[0][1];
      const decryptedData = JSON.parse(decodeURIComponent(atob(savedData)));
      expect(decryptedData.baseCurrency).toBe('USD');
    });

    it('ローカルストレージからの読み込みが動作する', () => {
      const testData = {
        baseCurrency: 'USD',
        currentAssets: [{ ticker: 'AAPL', holdings: 10 }],
        targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 50 }],
        additionalBudget: { amount: 5000, currency: 'USD' },
        exchangeRate: { rate: 140, source: 'Test', lastUpdated: '2023-01-01' },
        aiPromptTemplate: 'test template'
      };
      
      const encryptedData = btoa(encodeURIComponent(JSON.stringify(testData)));
      mockLocalStorage.getItem.mockReturnValue(encryptedData);

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // loadFromLocalStorageを明示的に呼び出す
      let result;
      act(() => {
        result = contextValue.loadFromLocalStorage();
      });

      expect(result).toEqual(testData);
    });

    it('暗号化データの復号化エラーが適切に処理される', () => {
      // 無効な暗号化データ
      mockLocalStorage.getItem.mockReturnValue('invalid-encrypted-data');

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // エラーが発生してもクラッシュしない
      let result;
      act(() => {
        result = contextValue.loadFromLocalStorage();
      });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('ローカルストレージのクリアが動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      act(() => {
        contextValue.clearLocalStorage();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('portfolioData');
    });
  });

  describe('銘柄管理', () => {
    it('銘柄の追加が正しく動作する', async () => {
      // モックのセットアップ
      mockFetchTickerData.mockResolvedValue({
        success: true,
        data: {
          id: 'aapl-123',
          ticker: 'AAPL',
          name: 'Apple Inc.',
          price: 150,
          currency: 'USD',
          source: 'Alpha Vantage',
          lastUpdated: new Date().toISOString()
        }
      });
      
      mockFetchFundInfo.mockResolvedValue({
        success: true,
        fundType: 'Stock',
        annualFee: 0,
        feeSource: '個別株',
        feeIsEstimated: false,
        region: 'US'
      });
      
      mockFetchDividendData.mockResolvedValue({
        success: true,
        data: {
          dividendYield: 0.5,
          hasDividend: true,
          dividendFrequency: 'Quarterly',
          dividendIsEstimated: false
        }
      });
      
      mockRequestManagerRequest.mockImplementation((_, fn) => fn());

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 銘柄を追加
      let result;
      await act(async () => {
        result = await contextValue.addTicker('AAPL');
      });

      expect(result.success).toBe(true);
      expect(contextValue.currentAssets).toHaveLength(1);
      expect(contextValue.currentAssets[0]).toMatchObject({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        price: 150,
        holdings: 0,
        fundType: 'Stock',
        isStock: true,
        annualFee: 0,
        dividendYield: 0.5,
        hasDividend: true
      });
      expect(contextValue.targetPortfolio).toHaveLength(1);
    });

    it('既存銘柄の追加を拒否する', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 既存の銘柄を設定
      act(() => {
        contextValue.currentAssets = [{ ticker: 'AAPL', holdings: 10 }];
      });

      // 同じ銘柄を追加しようとする
      let result;
      await act(async () => {
        result = await contextValue.addTicker('AAPL');
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('既に追加されている銘柄です');
    });

    it('銘柄の削除が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      const testAsset = { id: '123', ticker: 'AAPL', holdings: 10 };
      const testTarget = { id: '123', ticker: 'AAPL', targetPercentage: 50 };
      
      act(() => {
        contextValue.currentAssets = [testAsset];
        contextValue.targetPortfolio = [testTarget];
      });

      // 銘柄を削除
      act(() => {
        contextValue.removeTicker('123');
      });

      expect(contextValue.currentAssets).toHaveLength(0);
      expect(contextValue.targetPortfolio).toHaveLength(0);
    });

    it('保有数量の更新が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      act(() => {
        contextValue.currentAssets = [
          { id: '123', ticker: 'AAPL', holdings: 10 },
          { id: '456', ticker: 'GOOGL', holdings: 5 }
        ];
      });

      // 保有数量を更新
      act(() => {
        contextValue.updateHoldings('123', '15.5555');
      });

      expect(contextValue.currentAssets[0].holdings).toBe(15.5555);
      expect(contextValue.currentAssets[1].holdings).toBe(5);
    });

    it('目標配分の更新が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      act(() => {
        contextValue.targetPortfolio = [
          { id: '123', ticker: 'AAPL', targetPercentage: 30 },
          { id: '456', ticker: 'GOOGL', targetPercentage: 20 }
        ];
      });

      // 目標配分を更新
      act(() => {
        contextValue.updateTargetAllocation('123', '40');
      });

      expect(contextValue.targetPortfolio[0].targetPercentage).toBe(40);
      expect(contextValue.targetPortfolio[1].targetPercentage).toBe(20);
    });

    it('手数料率の更新が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定（ETF）
      act(() => {
        contextValue.currentAssets = [
          { id: '123', ticker: 'VTI', fundType: 'US ETF', isStock: false, annualFee: 0.03 }
        ];
      });

      // 手数料率を更新
      act(() => {
        contextValue.updateAnnualFee('123', '0.05');
      });

      expect(contextValue.currentAssets[0].annualFee).toBe(0.05);
      expect(contextValue.currentAssets[0].feeSource).toBe('ユーザー設定');
      expect(contextValue.currentAssets[0].feeIsEstimated).toBe(false);
    });

    it('個別株の手数料は0に固定される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定（個別株）
      act(() => {
        contextValue.currentAssets = [
          { id: '123', ticker: 'AAPL', fundType: 'Stock', isStock: true, annualFee: 0 }
        ];
      });

      // 手数料率を更新しようとする
      act(() => {
        contextValue.updateAnnualFee('123', '1.0');
      });

      // 個別株なので0のまま
      expect(contextValue.currentAssets[0].annualFee).toBe(0);
      expect(contextValue.currentAssets[0].feeSource).toBe('個別株');
    });

    it('配当情報の更新が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      act(() => {
        contextValue.currentAssets = [
          { id: '123', ticker: 'AAPL', dividendYield: 0, hasDividend: false }
        ];
      });

      // 配当情報を更新
      act(() => {
        contextValue.updateDividendInfo('123', '1.5', true, 'Quarterly');
      });

      expect(contextValue.currentAssets[0].dividendYield).toBe(1.5);
      expect(contextValue.currentAssets[0].hasDividend).toBe(true);
      expect(contextValue.currentAssets[0].dividendFrequency).toBe('Quarterly');
      expect(contextValue.currentAssets[0].dividendIsEstimated).toBe(false);
    });
  });

  describe('市場データ更新', () => {
    it('市場価格の一括更新が正しく動作する', async () => {
      // モックのセットアップ
      mockFetchMultipleStocks.mockResolvedValue({
        success: true,
        data: {
          'AAPL': {
            ticker: 'AAPL',
            price: 155,
            source: 'Alpha Vantage',
            lastUpdated: new Date().toISOString(),
            fundType: 'Stock',
            annualFee: 0,
            dividendYield: 0.6,
            hasDividend: true
          },
          'VTI': {
            ticker: 'VTI',
            price: 220,
            source: 'Yahoo Finance',
            lastUpdated: new Date().toISOString(),
            fundType: 'US ETF',
            annualFee: 0.03,
            dividendYield: 1.5,
            hasDividend: true
          }
        }
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      act(() => {
        contextValue.currentAssets = [
          { ticker: 'AAPL', price: 150, holdings: 10 },
          { ticker: 'VTI', price: 210, holdings: 5 }
        ];
      });

      // 市場データを更新
      let result;
      await act(async () => {
        result = await contextValue.refreshMarketPrices();
      });

      expect(result.success).toBe(true);
      expect(contextValue.currentAssets[0].price).toBe(155);
      expect(contextValue.currentAssets[1].price).toBe(220);
      expect(mockFetchMultipleStocks).toHaveBeenCalledWith(['AAPL', 'VTI']);
    });

    it('市場データ更新エラーが適切に処理される', async () => {
      // エラーをモック
      mockFetchMultipleStocks.mockRejectedValue(new Error('API Error'));

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      act(() => {
        contextValue.currentAssets = [
          { ticker: 'AAPL', price: 150, holdings: 10 }
        ];
      });

      // 市場データ更新を試行
      let result;
      await act(async () => {
        result = await contextValue.refreshMarketPrices();
      });

      expect(result.success).toBe(false);
      // 価格は変更されない
      expect(contextValue.currentAssets[0].price).toBe(150);
    });

    it('ローディング状態が正しく管理される', async () => {
      // 遅延をシミュレート
      mockFetchMultipleStocks.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 100))
      );

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      expect(contextValue.isLoading).toBe(false);

      // 更新開始
      const updatePromise = act(async () => {
        return contextValue.refreshMarketPrices();
      });

      // ローディング中
      expect(contextValue.isLoading).toBe(true);

      // 更新完了を待つ
      await updatePromise;

      // ローディング終了
      expect(contextValue.isLoading).toBe(false);
    });
  });

  describe('為替レート管理', () => {
    it('為替レートの更新が正しく動作する（JPY基準）', async () => {
      mockFetchExchangeRate.mockResolvedValue({
        success: true,
        rate: 145.5,
        source: 'Yahoo Finance',
        lastUpdated: new Date().toISOString(),
        isDefault: false
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 為替レートを更新
      await act(async () => {
        await contextValue.updateExchangeRate(true); // force update
      });

      expect(contextValue.exchangeRate.rate).toBe(145.5);
      expect(contextValue.exchangeRate.source).toBe('Yahoo Finance');
      expect(mockFetchExchangeRate).toHaveBeenCalledWith('USD', 'JPY');
    });

    it('為替レートの更新が正しく動作する（USD基準）', async () => {
      mockFetchExchangeRate.mockResolvedValue({
        success: true,
        rate: 145.5,
        source: 'Yahoo Finance',
        lastUpdated: new Date().toISOString()
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 通貨をUSDに変更
      act(() => {
        contextValue.toggleCurrency();
      });

      // 為替レートを更新
      await act(async () => {
        await contextValue.updateExchangeRate(true);
      });

      expect(contextValue.exchangeRate.rate).toBe(145.5);
      expect(mockFetchExchangeRate).toHaveBeenCalledWith('USD', 'JPY');
    });

    it('為替レートのキャッシュが機能する', async () => {
      const cachedData = {
        data: {
          rate: 150,
          source: 'Cached',
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'exchangeRate_JPY') {
          return JSON.stringify(cachedData);
        }
        return null;
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // キャッシュからの読み込み（forceUpdateなし）
      await act(async () => {
        await contextValue.updateExchangeRate(false);
      });

      expect(contextValue.exchangeRate.rate).toBe(150);
      expect(contextValue.exchangeRate.source).toBe('Cached');
      expect(mockFetchExchangeRate).not.toHaveBeenCalled();
    });

    it('為替レートのリセットが正しく動作する', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 為替レートをリセット
      act(() => {
        contextValue.resetExchangeRate();
      });

      expect(contextValue.exchangeRate.rate).toBe(150.0);
      expect(contextValue.exchangeRate.source).toBe('manual-reset');
      expect(contextValue.exchangeRate.isDefault).toBe(true);
      
      // キャッシュがクリアされる
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('exchangeRate_JPY');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('exchangeRate_USD');
    });

    it('為替レート取得エラーが適切に処理される', async () => {
      mockFetchExchangeRate.mockResolvedValue({
        success: false,
        error: true,
        message: 'API Error'
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const initialRate = contextValue.exchangeRate.rate;

      // 為替レート更新を試行
      await act(async () => {
        await contextValue.updateExchangeRate(true);
      });

      // エラー時は既存のレートを維持
      expect(contextValue.exchangeRate.rate).toBe(initialRate);
    });
  });

  describe('通貨変換', () => {
    it('通貨変換が正しく動作する（JPY→USD）', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const exchangeRate = { rate: 150 };
      const result = contextValue.convertCurrency(15000, 'JPY', 'USD', exchangeRate);
      
      expect(result).toBe(100); // 15000 / 150 = 100
    });

    it('通貨変換が正しく動作する（USD→JPY）', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const exchangeRate = { rate: 150 };
      const result = contextValue.convertCurrency(100, 'USD', 'JPY', exchangeRate);
      
      expect(result).toBe(15000); // 100 * 150 = 15000
    });

    it('同一通貨の場合は変換しない', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const exchangeRate = { rate: 150 };
      const result = contextValue.convertCurrency(1000, 'JPY', 'JPY', exchangeRate);
      
      expect(result).toBe(1000);
    });

    it('サポートされていない通貨変換でエラーを投げる', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const exchangeRate = { rate: 150 };
      
      expect(() => {
        contextValue.convertCurrency(1000, 'EUR', 'GBP', exchangeRate);
      }).toThrow('Unsupported currency conversion: EUR to GBP');
    });
  });

  describe('シミュレーション計算', () => {
    it('シミュレーション計算が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // テストデータを設定
      act(() => {
        contextValue.currentAssets = [
          { id: '1', ticker: 'AAPL', price: 150, holdings: 10, currency: 'USD' },
          { id: '2', ticker: '1306', price: 2000, holdings: 50, currency: 'JPY' }
        ];
        contextValue.targetPortfolio = [
          { ticker: 'AAPL', targetPercentage: 40 },
          { ticker: '1306', targetPercentage: 60 }
        ];
        contextValue.additionalBudget = { amount: 100000, currency: 'JPY' };
        contextValue.exchangeRate = { rate: 150 };
      });

      // シミュレーションを実行
      let result;
      act(() => {
        result = contextValue.calculateSimulation();
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // 結果の検証
      const appleResult = result.find(r => r.ticker === 'AAPL');
      expect(appleResult).toBeDefined();
      expect(appleResult.currentAllocation).toBeGreaterThan(0);
      expect(appleResult.targetAllocation).toBe(40);
      expect(appleResult.purchaseAmount).toBeGreaterThan(0);
    });

    it('購入株数の計算が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 整数の場合
      expect(contextValue.calculatePurchaseShares(1000, 100)).toBe(10);
      
      // 小数の場合（小数点以下2桁まで）
      expect(contextValue.calculatePurchaseShares(1000, 150)).toBe(6.66);
      
      // 価格が0の場合
      expect(contextValue.calculatePurchaseShares(1000, 0)).toBe(0);
      
      // 購入額が0の場合
      expect(contextValue.calculatePurchaseShares(0, 100)).toBe(0);
    });

    it('購入処理が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      act(() => {
        contextValue.currentAssets = [
          { id: '123', ticker: 'AAPL', holdings: 10 }
        ];
      });

      // 購入を実行
      act(() => {
        contextValue.executePurchase('123', 5.5);
      });

      expect(contextValue.currentAssets[0].holdings).toBe(15.5);
    });

    it('一括購入処理が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 初期データを設定
      act(() => {
        contextValue.currentAssets = [
          { id: '1', ticker: 'AAPL', holdings: 10 },
          { id: '2', ticker: 'GOOGL', holdings: 5 }
        ];
      });

      // シミュレーション結果
      const simulationResult = [
        { id: '1', purchaseShares: 2 },
        { id: '2', purchaseShares: 3 }
      ];

      // 一括購入を実行
      act(() => {
        contextValue.executeBatchPurchase(simulationResult);
      });

      expect(contextValue.currentAssets[0].holdings).toBe(12);
      expect(contextValue.currentAssets[1].holdings).toBe(8);
    });
  });

  describe('データインポート/エクスポート', () => {
    it('データのエクスポートが正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // テストデータを設定
      const testData = {
        baseCurrency: 'USD',
        exchangeRate: { rate: 145, source: 'Test' },
        currentAssets: [{ ticker: 'AAPL', holdings: 10 }],
        targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 50 }],
        additionalBudget: { amount: 5000, currency: 'USD' },
        aiPromptTemplate: 'test template'
      };

      act(() => {
        contextValue.baseCurrency = testData.baseCurrency;
        contextValue.exchangeRate = testData.exchangeRate;
        contextValue.currentAssets = testData.currentAssets;
        contextValue.targetPortfolio = testData.targetPortfolio;
        contextValue.additionalBudget = testData.additionalBudget;
        contextValue.aiPromptTemplate = testData.aiPromptTemplate;
      });

      // エクスポートを実行
      let exportedData;
      act(() => {
        exportedData = contextValue.exportData();
      });

      expect(exportedData).toMatchObject(testData);
    });

    it('データのインポートが正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const importData = {
        baseCurrency: 'USD',
        exchangeRate: { rate: 145, source: 'Import' },
        currentAssets: [{ ticker: 'AAPL', holdings: 10, fundType: 'Stock' }],
        targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 50 }],
        additionalBudget: { amount: 5000, currency: 'USD' },
        aiPromptTemplate: 'imported template'
      };

      // インポートを実行
      let result;
      act(() => {
        result = contextValue.importData(importData);
      });

      expect(result.success).toBe(true);
      expect(contextValue.baseCurrency).toBe('USD');
      expect(contextValue.currentAssets).toEqual(importData.currentAssets);
      expect(contextValue.targetPortfolio).toEqual(importData.targetPortfolio);
      expect(contextValue.additionalBudget).toEqual(importData.additionalBudget);
      expect(contextValue.aiPromptTemplate).toBe('imported template');
    });

    it('portfolioData形式のインポートが正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const importData = {
        portfolioData: {
          baseCurrency: 'USD',
          assets: [{ ticker: 'AAPL', holdings: 10 }],
          targetAllocation: [{ ticker: 'AAPL', targetPercentage: 50 }],
          additionalBudget: 5000
        }
      };

      // インポートを実行
      let result;
      act(() => {
        result = contextValue.importData(importData);
      });

      expect(result.success).toBe(true);
      expect(contextValue.baseCurrency).toBe('USD');
      expect(contextValue.currentAssets).toEqual([{ ticker: 'AAPL', holdings: 10 }]);
      expect(contextValue.targetPortfolio).toEqual([{ ticker: 'AAPL', targetPercentage: 50 }]);
      expect(contextValue.additionalBudget).toEqual({ amount: 5000, currency: 'USD' });
    });

    it('文字列形式のインポートデータが正しく処理される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const importData = {
        baseCurrency: 'USD',
        currentAssets: [],
        targetPortfolio: []
      };

      // 文字列として渡す
      const stringData = JSON.stringify(importData);

      // インポートを実行
      let result;
      act(() => {
        result = contextValue.importData(stringData);
      });

      expect(result.success).toBe(true);
      expect(contextValue.baseCurrency).toBe('USD');
    });

    it('無効なデータのインポートが拒否される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 必須フィールドが欠けているデータ
      const invalidData = {
        baseCurrency: 'USD'
        // currentAssetsとtargetPortfolioが欠けている
      };

      // インポートを実行
      let result;
      act(() => {
        result = contextValue.importData(invalidData);
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('必須フィールドがありません');
    });

    it('銘柄タイプの検証が行われる', () => {
      // モックのセットアップ
      mockGuessFundType.mockReturnValue('US ETF');
      mockEstimateAnnualFee.mockReturnValue({ fee: 0.03, source: 'Estimated', isEstimated: true });
      mockEstimateDividendYield.mockReturnValue({ 
        yield: 1.5, 
        hasDividend: true, 
        dividendFrequency: 'Quarterly', 
        isEstimated: false 
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const importData = {
        currentAssets: [
          { ticker: 'VTI', holdings: 10, fundType: 'Stock', annualFee: 1.0 } // 誤った情報
        ],
        targetPortfolio: []
      };

      // インポートを実行
      act(() => {
        contextValue.importData(importData);
      });

      // 銘柄タイプが修正される
      expect(contextValue.currentAssets[0].fundType).toBe('US ETF');
      expect(contextValue.currentAssets[0].annualFee).toBe(0.03);
    });
  });

  describe('Google Drive連携', () => {
    it('Google Driveへの保存が正しく動作する', async () => {
      mockSaveToGoogleDrive.mockResolvedValue({
        success: true,
        message: 'Saved successfully'
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // ユーザー情報を設定
      const user = { id: 'user123', name: 'Test User' };
      act(() => {
        contextValue.currentUser = user;
      });

      // 保存を実行
      let result;
      await act(async () => {
        result = await contextValue.saveToGoogleDrive();
      });

      expect(result.success).toBe(true);
      expect(mockSaveToGoogleDrive).toHaveBeenCalledWith(
        expect.objectContaining({
          baseCurrency: 'JPY',
          currentAssets: [],
          targetPortfolio: [],
          version: '1.0.0'
        }),
        user
      );
    });

    it('ログインしていない場合の保存が拒否される', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // ユーザー情報なし
      act(() => {
        contextValue.currentUser = null;
      });

      // 保存を実行
      let result;
      await act(async () => {
        result = await contextValue.saveToGoogleDrive();
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('ログインしていません');
      expect(mockSaveToGoogleDrive).not.toHaveBeenCalled();
    });

    it('Google Driveからの読み込みが正しく動作する', async () => {
      // 現在は無効化されているので、エラーレスポンスを期待
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const user = { id: 'user123', name: 'Test User' };
      act(() => {
        contextValue.currentUser = user;
      });

      // 読み込みを実行
      let result;
      await act(async () => {
        result = await contextValue.loadFromGoogleDrive();
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Google Drive読み込み機能は現在無効です');
    });

    it('認証状態の変更が正しく処理される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const user = { id: 'user123', name: 'Test User' };

      // ログイン
      act(() => {
        contextValue.handleAuthStateChange(true, user);
      });

      expect(contextValue.dataSource).toBe('cloud');
      expect(contextValue.currentUser).toEqual(user);

      // ログアウト
      act(() => {
        contextValue.handleAuthStateChange(false, null);
      });

      expect(contextValue.dataSource).toBe('local');
      expect(contextValue.currentUser).toBeNull();
    });
  });

  describe('計算ロジック', () => {
    it('総資産額が正しく計算される（マルチ通貨）', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // テストデータを設定
      act(() => {
        contextValue.currentAssets = [
          { ticker: 'AAPL', price: 150, holdings: 10, currency: 'USD' },
          { ticker: '1306', price: 2000, holdings: 50, currency: 'JPY' }
        ];
        contextValue.baseCurrency = 'JPY';
        contextValue.exchangeRate = { rate: 150 };
      });

      // 期待値: (150 * 10 * 150) + (2000 * 50) = 225000 + 100000 = 325000
      expect(contextValue.totalAssets).toBe(325000);
    });

    it('年間手数料が正しく計算される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // テストデータを設定
      act(() => {
        contextValue.currentAssets = [
          { ticker: 'AAPL', price: 150, holdings: 10, currency: 'USD', isStock: true, annualFee: 0 },
          { ticker: 'VTI', price: 200, holdings: 5, currency: 'USD', isStock: false, annualFee: 0.03 }
        ];
        contextValue.baseCurrency = 'USD';
      });

      // 期待値: 個別株は0、ETFは (200 * 5 * 0.03 / 100) = 0.3
      expect(contextValue.annualFees).toBe(0.3);
    });

    it('年間配当金が正しく計算される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // テストデータを設定
      act(() => {
        contextValue.currentAssets = [
          { ticker: 'AAPL', price: 150, holdings: 10, currency: 'USD', hasDividend: true, dividendYield: 0.5 },
          { ticker: 'AMZN', price: 100, holdings: 5, currency: 'USD', hasDividend: false, dividendYield: 0 }
        ];
        contextValue.baseCurrency = 'USD';
      });

      // 期待値: (150 * 10 * 0.5 / 100) + 0 = 7.5
      expect(contextValue.annualDividends).toBe(7.5);
    });

    it('NaN値が適切に処理される', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 無効なデータを設定
      act(() => {
        contextValue.currentAssets = [
          { ticker: 'INVALID', price: NaN, holdings: 10, currency: 'USD' },
          { ticker: 'VALID', price: 100, holdings: 5, currency: 'USD' }
        ];
      });

      // NaNは無視され、有効な値のみが計算される
      expect(contextValue.totalAssets).toBe(500);
    });
  });

  describe('暗号化/復号化ユーティリティ', () => {
    it('データの暗号化が正しく動作する', () => {
      const testData = { test: 'data', number: 123 };
      const encrypted = encryptData(testData);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(global.btoa).toHaveBeenCalled();
      expect(global.encodeURIComponent).toHaveBeenCalled();
    });

    it('データの復号化が正しく動作する', () => {
      const testData = { test: 'data', number: 123 };
      const jsonString = JSON.stringify(testData);
      const encrypted = btoa(encodeURIComponent(jsonString));
      
      const decrypted = decryptData(encrypted);
      
      expect(decrypted).toEqual(testData);
      expect(global.atob).toHaveBeenCalled();
      expect(global.decodeURIComponent).toHaveBeenCalled();
    });

    it('無効な暗号化データでnullを返す', () => {
      const result = decryptData('invalid-data');
      expect(result).toBeNull();
    });

    it('古いフォーマットのフォールバックが動作する', () => {
      const testData = { test: 'data' };
      // URIエンコードなしの古い形式
      const oldFormat = btoa(JSON.stringify(testData));
      
      // decodeURIComponentを失敗させる
      global.decodeURIComponent = jest.fn(() => {
        throw new Error('Decode error');
      });
      
      const result = decryptData(oldFormat);
      expect(result).toEqual(testData);
    });
  });

  describe('AIプロンプト機能', () => {
    it('AIプロンプトテンプレートの更新が正しく動作する', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      const template = 'テストプロンプトテンプレート';
      
      act(() => {
        contextValue.updateAiPromptTemplate(template);
      });

      expect(contextValue.aiPromptTemplate).toBe(template);
      
      // 自動保存が呼ばれることを確認
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('その他の機能', () => {
    it('通貨切替が正しく動作する', async () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      expect(contextValue.baseCurrency).toBe('JPY');

      act(() => {
        contextValue.toggleCurrency();
      });

      expect(contextValue.baseCurrency).toBe('USD');

      act(() => {
        contextValue.toggleCurrency();
      });

      expect(contextValue.baseCurrency).toBe('JPY');
    });

    it('追加予算の設定が正しく動作する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      act(() => {
        contextValue.setAdditionalBudget(500000, 'USD');
      });

      expect(contextValue.additionalBudget).toEqual({
        amount: 500000,
        currency: 'USD'
      });
    });

    it('デフォルト通貨での追加予算設定', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      act(() => {
        contextValue.setAdditionalBudget(100000); // 通貨を指定しない
      });

      expect(contextValue.additionalBudget).toEqual({
        amount: 100000,
        currency: 'JPY' // デフォルト
      });
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    it('APIエラー時のフォールバック処理', async () => {
      mockFetchTickerData.mockResolvedValue({
        success: false,
        errorType: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        data: {
          ticker: 'AAPL',
          price: 140, // フォールバック価格
          source: 'Fallback'
        }
      });
      
      mockFetchFundInfo.mockResolvedValue({ success: true, annualFee: 0 });
      mockFetchDividendData.mockResolvedValue({ success: true, data: { dividendYield: 0 } });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 銘柄を追加（APIエラーだがフォールバックデータあり）
      let result;
      await act(async () => {
        result = await contextValue.addTicker('AAPL');
      });

      expect(result.success).toBe(true);
      expect(contextValue.currentAssets[0].price).toBe(140);
      expect(contextValue.currentAssets[0].source).toBe('Fallback');
    });

    it('validateAssetTypesが誤った銘柄情報を修正する', () => {
      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // モックのセットアップ
      mockGuessFundType.mockImplementation((ticker) => {
        if (ticker === 'VXUS') return 'US ETF';
        return 'Stock';
      });
      
      mockEstimateAnnualFee.mockImplementation((ticker) => {
        if (ticker === 'VXUS') return { fee: 0.08, source: 'ETF', isEstimated: false };
        return { fee: 0, source: '個別株', isEstimated: false };
      });

      const assets = [
        { ticker: 'VXUS', fundType: 'Stock', isStock: true, annualFee: 0 }, // 誤った情報
        { ticker: 'AAPL', fundType: 'Stock', isStock: true, annualFee: 0 }
      ];

      let result;
      act(() => {
        result = contextValue.validateAssetTypes(assets);
      });

      expect(result.changes.fundType).toBe(1);
      expect(result.changes.fees).toBe(1);
      expect(result.updatedAssets[0].fundType).toBe('US ETF');
      expect(result.updatedAssets[0].isStock).toBe(false);
      expect(result.updatedAssets[0].annualFee).toBe(0.08);
    });

    it('日本の投資信託名が正しく設定される', async () => {
      mockGetJapaneseStockName.mockImplementation((ticker) => {
        if (ticker === '1306') return 'TOPIX連動型ETF';
        return ticker;
      });
      
      mockFetchTickerData.mockResolvedValue({
        success: true,
        data: {
          ticker: '1306',
          name: '1306', // 元の名前はティッカーと同じ
          price: 2000,
          currency: 'JPY'
        }
      });
      
      mockFetchFundInfo.mockResolvedValue({ success: true });
      mockFetchDividendData.mockResolvedValue({ success: true, data: {} });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      await act(async () => {
        await contextValue.addTicker('1306');
      });

      expect(contextValue.currentAssets[0].name).toBe('TOPIX連動型ETF');
    });

    it('デバウンスされた市場データ更新が機能する', async () => {
      mockDebouncedRefreshMarketData.mockImplementation((fn) => {
        // デバウンスをシミュレート
        return new Promise(resolve => setTimeout(() => resolve(fn()), 100));
      });

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 複数回呼び出し
      const promises = [];
      act(() => {
        promises.push(contextValue.refreshMarketPrices());
        promises.push(contextValue.refreshMarketPrices());
        promises.push(contextValue.refreshMarketPrices());
      });

      await act(async () => {
        await Promise.all(promises);
      });

      // デバウンス関数が呼ばれたことを確認
      expect(mockDebouncedRefreshMarketData).toHaveBeenCalled();
    });

    it('為替レート更新のデバウンスが機能する', async () => {
      mockShouldUpdateExchangeRate.mockReturnValueOnce(true)
        .mockReturnValueOnce(false) // 2回目は更新しない
        .mockReturnValueOnce(true);

      let contextValue = null;
      
      render(
        <PortfolioProvider>
          <TestConsumer callback={(context) => { contextValue = context; }} />
        </PortfolioProvider>
      );

      // 複数回更新を試行
      await act(async () => {
        await contextValue.updateExchangeRate();
        await contextValue.updateExchangeRate(); // デバウンスで阻止される
        await contextValue.updateExchangeRate();
      });

      // shouldUpdateExchangeRateが3回呼ばれる
      expect(mockShouldUpdateExchangeRate).toHaveBeenCalledTimes(3);
      // fetchExchangeRateは2回だけ呼ばれる（2回目はデバウンスで阻止）
      expect(mockFetchExchangeRate).toHaveBeenCalledTimes(2);
    });
  });
});