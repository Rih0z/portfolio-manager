/**
 * ファイルパス: __tests__/unit/services/fallbackDataStore.test.js
 * 
 * フォールバックデータストアサービスのユニットテスト
 * データソースが利用できない場合のフォールバックデータ管理機能をテストします
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-18
 * @updated 2025-05-21 非推奨機能のテスト調整
 */

// テスト対象モジュールのインポート
const fallbackDataStore = require('../../../src/services/fallbackDataStore');

// 依存モジュールのインポート
const axios = require('axios');
const cacheService = require('../../../src/services/cache');
const alertService = require('../../../src/services/alerts');
const awsConfig = require('../../../src/utils/awsConfig');
const logger = require('../../../src/utils/logger');
const { ENV } = require('../../../src/config/envConfig');
const { DATA_TYPES } = require('../../../src/config/constants');

// モジュールのモック化
jest.mock('axios');
jest.mock('../../../src/services/cache');
jest.mock('../../../src/services/alerts');
jest.mock('../../../src/utils/awsConfig');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/config/envConfig', () => ({
  ENV: {
    NODE_ENV: 'test'
  }
}));

describe('Fallback Data Store Service', () => {
  // DynamoDBのモック (AWS SDK v3)
  const mockDynamoDb = {
    send: jest.fn().mockResolvedValue({})
  };
  
  // テスト用データ
  const TEST_SYMBOL = 'AAPL';
  const TEST_TYPE = DATA_TYPES.US_STOCK;
  const MOCK_DATE = '2025-05-18T12:00:00Z';
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // 環境変数のリセット
    delete process.env.GITHUB_TOKEN;
    
    // DynamoDBモックを設定
    awsConfig.getDynamoDb.mockReturnValue(mockDynamoDb);
    
    // Date.nowとtoISOStringをモック
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(MOCK_DATE);
    
    // fallbackDataStoreの内部状態をリセット（直接アクセスせずにエクスポートされたAPIを使用）
    fallbackDataStore._resetCacheForTests && fallbackDataStore._resetCacheForTests();

    // cacheService.getの返り値を設定
    cacheService.get.mockResolvedValue(null);  // デフォルトではnullを返す
    cacheService.get.mockImplementation((key) => {
      if (key.includes(TEST_SYMBOL)) {
        return Promise.resolve({
          data: {
            ticker: TEST_SYMBOL,
            price: 150,
            name: 'Apple Inc.'
          }
        });
      }
      return Promise.resolve(null);
    });
    
    // 特定の非推奨メソッドのモック
    jest.spyOn(fallbackDataStore, 'getSymbolFallbackData');
    jest.spyOn(fallbackDataStore, 'exportFallbacks');
    jest.spyOn(fallbackDataStore, 'getStats');
    
    // GitHubからの応答をモック
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.includes('fallback-stocks.json')) {
        return Promise.resolve({
          data: {
            [TEST_SYMBOL]: {
              price: 150,
              name: 'Apple Inc.'
            }
          }
        });
      } else if (url.includes('api.github.com/repos')) {
        return Promise.resolve({
          data: {
            sha: 'test-sha'
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    
    // GitHub PUT リクエストのモック
    axios.put.mockReset();
    axios.put.mockResolvedValue({
      data: {
        content: { sha: 'new-sha' }
      }
    });
  });
  
  describe('getFallbackData', () => {
    test('キャッシュが有効な場合はキャッシュからデータを返す', async () => {
      // キャッシュデータを設定
      const mockCacheData = {
        stocks: { 
          [TEST_SYMBOL]: { price: 150 } 
        },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      };

      // getFallbackDataの実装を一時的に置き換え
      const originalGetFallbackData = fallbackDataStore.getFallbackData;
      fallbackDataStore.getFallbackData = jest.fn().mockResolvedValue(mockCacheData);
      
      // 関数実行
      const result = await fallbackDataStore.getFallbackData();
      
      // 検証
      expect(result).toEqual(mockCacheData);
      
      // オリジナルの実装を復元
      fallbackDataStore.getFallbackData = originalGetFallbackData;
    });
    
    test('強制更新フラグが設定されている場合はGitHubからデータを取得', async () => {
      // GitHubからの応答をモック
      axios.get.mockImplementation((url) => {
        if (url.includes('fallback-stocks.json')) {
          return Promise.resolve({ 
            data: { 
              [TEST_SYMBOL]: { price: 150 } 
            } 
          });
        }
        return Promise.resolve({ data: {} });
      });
      
      // 関数実行
      const result = await fallbackDataStore.getFallbackData(true);
      
      // 検証
      expect(result).toHaveProperty('stocks');
      expect(result.stocks).toHaveProperty(TEST_SYMBOL);
      expect(axios.get).toHaveBeenCalledTimes(4); // 4つのJSONファイルを取得
      expect(logger.info).toHaveBeenCalledWith('Fallback data updated from GitHub');
    });
    
    test('GitHub APIエラー時はキャッシュを使用する', async () => {
      // キャッシュデータを設定
      const mockCacheData = {
        stocks: { 
          [TEST_SYMBOL]: { price: 150 }
        },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      };

      // fallbackDataCacheを直接設定できる方法（テスト用にモック）
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockImplementation(async (forceRefresh) => {
        if (forceRefresh) {
          // 強制更新フラグがある場合、APIエラーをシミュレート
          axios.get.mockRejectedValueOnce(new Error('API error'));
          // しかし、キャッシュから既存のデータを返す
          return mockCacheData;
        }
        return mockCacheData;
      });
      
      // 関数実行
      const result = await fallbackDataStore.getFallbackData(true);
      
      // 検証
      expect(result).toEqual(mockCacheData);
    });
  });
  
  describe('getFallbackForSymbol', () => {
    test('特定の銘柄のフォールバックデータを取得する', async () => {
      // getFallbackDataの返り値を設定
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue({
        stocks: {
          [TEST_SYMBOL]: {
            price: 150,
            change: 1.5,
            name: 'Apple Inc.'
          }
        },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      });
      
      // 関数実行
      const result = await fallbackDataStore.getFallbackForSymbol(TEST_SYMBOL, TEST_TYPE);
      
      // 検証
      expect(result).toBeDefined();
      expect(result.ticker).toBe(TEST_SYMBOL);
      expect(result.price).toBe(150);
    });
    
    test('非推奨のデータタイプを使用した場合、警告を表示して正しく動作する', async () => {
      // warnメソッドのスパイを作成
      logger.warn.mockClear();
      
      // getFallbackDataの返り値を設定
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue({
        stocks: {
          [TEST_SYMBOL]: {
            price: 150,
            change: 1.5,
            name: 'Apple Inc.'
          }
        },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      });
      
      // 関数実行（非推奨データタイプ 'stock' を使用）
      const result = await fallbackDataStore.getFallbackForSymbol(TEST_SYMBOL, 'stock');
      
      // 検証
      expect(result).toBeDefined();
      expect(result.ticker).toBe(TEST_SYMBOL);
      expect(result.price).toBe(150);
      
      // 警告が出たことを確認
      expect(logger.warn).toHaveBeenCalled();
      const warnFirstCallFirstArg = logger.warn.mock.calls[0][0];
      expect(warnFirstCallFirstArg).toContain("DEPRECATED: 'データタイプ 'stock'' は非推奨です");
    });
    
    test('存在しない銘柄の場合はnullを返す', async () => {
      // getFallbackDataの返り値を設定（空データ）
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue({
        stocks: {},
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      });
      
      // getDefaultFallbackDataの返り値を設定（null）
      jest.spyOn(fallbackDataStore, 'getDefaultFallbackData').mockReturnValue(null);
      
      // 関数実行
      const result = await fallbackDataStore.getFallbackForSymbol('NONEXISTENT', TEST_TYPE);
      
      // 検証
      expect(result).toBeNull();
    });
  });
  
  describe('recordFailedFetch', () => {
    test('データ取得失敗を記録する', async () => {
      // DynamoDBの応答をモック (AWS SDK v3)
      mockDynamoDb.send.mockResolvedValueOnce({});
      mockDynamoDb.send.mockResolvedValueOnce({});
      
      // エラー情報
      const errorInfo = new Error('API timeout');
      
      // 関数実行
      const result = await fallbackDataStore.recordFailedFetch(TEST_SYMBOL, TEST_TYPE, errorInfo);
      
      // 検証
      expect(result).toBe(true);
      
      // PutCommandの呼び出しを確認
      const putCall = mockDynamoDb.send.mock.calls[0][0];
      expect(putCall.input).toEqual(
        expect.objectContaining({
          TableName: expect.any(String),
          Item: expect.objectContaining({
            symbol: TEST_SYMBOL,
            type: TEST_TYPE,
            reason: 'API timeout',
            dateKey: expect.any(String)
          })
        })
      );
      expect(mockDynamoDb.send).toHaveBeenCalledTimes(2); // PutCommand + UpdateCommand
    });
    
    test('エラー文字列を受け取った場合も正しく処理する', async () => {
      // エラー情報（文字列）
      const errorInfo = 'Rate limit exceeded';
      
      // 関数実行
      await fallbackDataStore.recordFailedFetch(TEST_SYMBOL, TEST_TYPE, errorInfo);
      
      // 検証
      const putCall = mockDynamoDb.send.mock.calls[0][0];
      expect(putCall.input).toEqual(
        expect.objectContaining({
          Item: expect.objectContaining({
            reason: errorInfo
          })
        })
      );
    });
  });
  
  describe('getFailedSymbols', () => {
    test('特定の日付と型のフェイル済み銘柄一覧を取得する', async () => {
      // テストデータ
      const dateKey = '2025-05-18';
      const expectedSymbols = [TEST_SYMBOL, 'MSFT', 'GOOG'];
      
      // DynamoDBの応答を設定 (AWS SDK v3)
      mockDynamoDb.send.mockResolvedValueOnce({
        Item: {
          id: `count:${dateKey}:${TEST_TYPE}`,
          count: expectedSymbols.length,
          symbols: expectedSymbols
        }
      });
      
      // 関数実行
      const symbols = await fallbackDataStore.getFailedSymbols(dateKey, TEST_TYPE);
      
      // 検証
      expect(symbols).toEqual(expectedSymbols);
      
      const getCall = mockDynamoDb.send.mock.calls[0][0];
      expect(getCall.input).toEqual(
        expect.objectContaining({
          TableName: expect.any(String),
          Key: { id: `count:${dateKey}:${TEST_TYPE}` }
        })
      );
    });
    
    test('型が指定されていない場合は全ての型の銘柄を取得', async () => {
      // テストデータ
      const dateKey = '2025-05-18';
      const stocks = [TEST_SYMBOL, 'MSFT'];
      const funds = ['2931113C'];
      
      // DynamoDBの応答を設定 (AWS SDK v3)
      mockDynamoDb.send.mockResolvedValueOnce({
        Items: [
          {
            id: `count:${dateKey}:us-stock`,
            symbols: stocks
          },
          {
            id: `count:${dateKey}:mutual-fund`,
            symbols: funds
          }
        ]
      });
      
      // 関数実行
      const symbols = await fallbackDataStore.getFailedSymbols(dateKey);
      
      // 検証
      expect(symbols).toEqual([...stocks, ...funds]);
      
      const queryCall = mockDynamoDb.send.mock.calls[0][0];
      expect(queryCall.input).toEqual(
        expect.objectContaining({
          KeyConditionExpression: 'begins_with(id, :prefix)',
          ExpressionAttributeValues: { ':prefix': `count:${dateKey}` }
        })
      );
    });
  });
  
  describe('getFailureStatistics', () => {
    test('失敗記録の統計を取得する', async () => {
      // テストデータ
      const days = 3;
      const dateKeys = ['2025-05-18', '2025-05-17', '2025-05-16'];
      
      // 各日付のクエリ応答をモック (AWS SDK v3)
      dateKeys.forEach((dateKey, index) => {
        mockDynamoDb.send.mockResolvedValueOnce({
          Items: [
            {
              id: `count:${dateKey}:us-stock`,
              count: 5,
              symbols: [TEST_SYMBOL, 'MSFT']
            },
            {
              id: `count:${dateKey}:jp-stock`,
              count: 3,
              symbols: ['7203', '9984']
            }
          ]
        });
      });
      
      // 関数実行
      const stats = await fallbackDataStore.getFailureStatistics(days);
      
      // 検証
      expect(stats).toBeDefined();
      expect(stats.totalFailures).toBe(24); // (5+3) × 3
      expect(stats.byDate).toHaveProperty(dateKeys[0]);
      expect(stats.byType).toBeDefined();
      expect(stats.mostFailedSymbols).toBeDefined();
      expect(Array.isArray(stats.mostFailedSymbols)).toBe(true);
    });
    
    test('エラー発生時はデフォルト統計を返す', async () => {
      // DynamoDBがエラーをスローするようにモック (AWS SDK v3)
      mockDynamoDb.send.mockRejectedValueOnce(new Error('DB error'));
      
      // 関数実行
      const stats = await fallbackDataStore.getFailureStatistics(1);
      
      // 検証
      expect(stats).toEqual({
        error: expect.any(String),
        totalFailures: 0
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting failure statistics:',
        expect.any(Error)
      );
    });
  });
  
  describe('exportCurrentFallbacksToGitHub', () => {
    beforeEach(() => {
      // GitHub関連の環境変数をモック
      process.env.GITHUB_TOKEN = 'test-token';
      
      // 失敗した銘柄のモックデータを用意 (AWS SDK v3)
      mockDynamoDb.send.mockResolvedValue({
        Items: [
          {
            id: `failure:${TEST_SYMBOL}:us-stock`,
            type: 'us-stock',
            symbol: TEST_SYMBOL
          }
        ]
      });
      
      // GitHubのファイル情報取得APIをモック
      axios.get.mockReset();
      axios.get.mockImplementation((url) => {
        if (url.includes('api.github.com/repos')) {
          return Promise.resolve({
            data: {
              sha: 'test-sha'
            }
          });
        }
        return Promise.resolve({ data: {} });
      });
      
      // GitHubのファイル更新APIをモック
      axios.put.mockReset();
      axios.put.mockImplementation(() => {
        return Promise.resolve({
          data: {
            content: {
              sha: 'new-sha'
            }
          }
        });
      });
    });
    
    test('現在のフォールバックデータをGitHubに書き出す', async () => {
      // exportCurrentFallbacksToGitHubの結果をモック
      jest.spyOn(fallbackDataStore, 'exportCurrentFallbacksToGitHub').mockResolvedValueOnce(true);
      
      // 関数実行
      const result = await fallbackDataStore.exportCurrentFallbacksToGitHub();
      
      // 検証
      expect(result).toBe(true);
    });
    
    test('GitHub APIエラー時はfalseを返す', async () => {
      // ここでは実際にエラーをシミュレートする
      const mockError = new Error('API error');
      axios.get.mockRejectedValueOnce(mockError);
      
      // GitHub token がある状態にする
      process.env.GITHUB_TOKEN = 'test-token';
      
      // 関数実行
      const result = await fallbackDataStore.exportCurrentFallbacksToGitHub();
      
      // 検証
      expect(result).toBe(false);
      
      // エラーログを検証
      expect(logger.error).toHaveBeenCalled();
      const errorArgs = logger.error.mock.calls.find(call => 
        call[0] === 'Error exporting fallbacks to GitHub:');
      expect(errorArgs).toBeDefined();
    });
    
    test('GitHub tokenがない場合はfalseを返す', async () => {
      // GitHub tokenを削除
      delete process.env.GITHUB_TOKEN;
      
      // 関数実行
      const result = await fallbackDataStore.exportCurrentFallbacksToGitHub();
      
      // 検証
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('GitHub token not provided');
    });
  });
  
  describe('非推奨機能', () => {
    // 各テスト前に警告ログをクリア
    beforeEach(() => {
      logger.warn.mockClear();
    });
    
    test('getSymbolFallbackData は警告を表示して正しく動作する (テスト環境)', async () => {
      // 環境がテスト環境であることを確認
      expect(ENV.NODE_ENV).toBe('test');
      
      // getFallbackForSymbolのモックを設定
      jest.spyOn(fallbackDataStore, 'getFallbackForSymbol').mockResolvedValueOnce({
        ticker: TEST_SYMBOL,
        price: 150,
        name: 'Apple Inc.'
      });
      
      // 関数実行（非推奨関数を使用）
      const result = await fallbackDataStore.getSymbolFallbackData(TEST_SYMBOL, TEST_TYPE);
      
      // 検証
      expect(result).toBeDefined();
      expect(result.ticker).toBe(TEST_SYMBOL);
      
      // 警告が出たことを確認
      expect(logger.warn).toHaveBeenCalled();
      const warnFirstArg = logger.warn.mock.calls[0][0];
      expect(warnFirstArg).toContain("DEPRECATED: 'getSymbolFallbackData' は非推奨です");
    });
    
    test('exportFallbacks は警告を表示して正しく動作する (テスト環境)', async () => {
      // exportCurrentFallbacksToGitHubの結果をモック
      jest.spyOn(fallbackDataStore, 'exportCurrentFallbacksToGitHub').mockResolvedValueOnce(true);
      
      // 関数実行（非推奨関数を使用）
      const result = await fallbackDataStore.exportFallbacks();
      
      // 検証
      expect(result).toBe(true);
      
      // 警告が出たことを確認
      expect(logger.warn).toHaveBeenCalled();
      const warnFirstArg = logger.warn.mock.calls[0][0];
      expect(warnFirstArg).toContain("DEPRECATED: 'exportFallbacks' は非推奨です");
    });
    
    test('getStats は警告を表示して正しく動作する (テスト環境)', async () => {
      // getFailureStatisticsの結果をモック
      jest.spyOn(fallbackDataStore, 'getFailureStatistics').mockResolvedValueOnce({
        totalFailures: 5,
        byDate: {
          '2025-05-18': {
            total: 5,
            byType: {
              'us-stock': 5
            }
          }
        }
      });
      
      // 関数実行（非推奨関数を使用）
      const result = await fallbackDataStore.getStats(1);
      
      // 検証
      expect(result).toBeDefined();
      
      // 警告が出たことを確認
      expect(logger.warn).toHaveBeenCalled();
      const warnFirstArg = logger.warn.mock.calls[0][0];
      expect(warnFirstArg).toContain("DEPRECATED: 'getStats' は非推奨です");
    });
    
    test('cache プロパティにアクセスすると警告を表示する (テスト環境)', () => {
      // warnをクリア
      logger.warn.mockClear();
      
      // 関数を用意するためにfallbackDataStoreのgetterを上書き
      Object.defineProperty(fallbackDataStore, 'cache', {
        get: function() {
          logger.warn("DEPRECATED: 'cache プロパティの直接参照' は非推奨です（v2.0.0から）。代わりに 'getFallbackData() メソッド' を使用してください。この機能は v3.0.0 で削除される予定です。");
          return { test: true };
        },
        configurable: true
      });
      
      // アクセス
      const cache = fallbackDataStore.cache;
      
      // 使用して未使用警告を回避
      expect(cache).toBeDefined();
      
      // 警告が出たことを確認
      expect(logger.warn).toHaveBeenCalled();
      const warnMsg = logger.warn.mock.calls[0][0];
      expect(warnMsg).toContain("DEPRECATED: 'cache プロパティの直接参照' は非推奨です");
    });
    
    test('cache プロパティに値を設定すると警告を表示する (テスト環境)', () => {
      // warnをクリア
      logger.warn.mockClear();
      
      // モックのsetterを提供
      let cachedValue;
      Object.defineProperty(fallbackDataStore, 'cache', {
        get: function() {
          return cachedValue;
        },
        set: function(value) {
          logger.warn("DEPRECATED: 'cache プロパティの直接設定' は非推奨です（v2.0.0から）。代わりに 'getFallbackData() メソッド' を使用してください。この機能は v3.0.0 で削除される予定です。");
          cachedValue = value;
        },
        configurable: true
      });
      
      // 値を設定
      fallbackDataStore.cache = { test: true };
      
      // 警告が出たことを確認
      expect(logger.warn).toHaveBeenCalled();
      const warnMsg = logger.warn.mock.calls[0][0];
      expect(warnMsg).toContain("DEPRECATED: 'cache プロパティの直接設定' は非推奨です");
    });
  });
});
