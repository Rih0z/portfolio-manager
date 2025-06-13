/**
 * ファイルパス: __tests__/unit/services/fallbackDataStore.enhanced.test.js
 * 
 * fallbackDataStoreの100%カバレッジを達成するための拡張テスト
 * 既存のテストでカバーされていない箇所を完全にテストします
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-18
 */

// テスト対象モジュールのインポート
const fallbackDataStore = require('../../../src/services/fallbackDataStore');

// 依存モジュールのインポート
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cacheService = require('../../../src/services/cache');
const alertService = require('../../../src/services/alerts');
const awsConfig = require('../../../src/utils/awsConfig');
const logger = require('../../../src/utils/logger');
const { ENV } = require('../../../src/config/envConfig');
const { DATA_TYPES } = require('../../../src/config/constants');

// モジュールのモック化
jest.mock('axios');
jest.mock('fs');
jest.mock('../../../src/services/cache');
jest.mock('../../../src/services/alerts');
jest.mock('../../../src/utils/awsConfig');
jest.mock('../../../src/utils/logger');

describe('Fallback Data Store Service - 100% Coverage Enhancement', () => {
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
    process.env.NODE_ENV = 'test'; // テスト環境に設定
    
    // DynamoDBモックを設定
    awsConfig.getDynamoDb.mockReturnValue(mockDynamoDb);
    
    // Date.nowとtoISOStringをモック
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(MOCK_DATE);
    jest.spyOn(Date, 'now').mockReturnValue(new Date(MOCK_DATE).getTime());
    
    // fallbackDataStoreの内部状態をリセット
    fallbackDataStore._resetCacheForTests && fallbackDataStore._resetCacheForTests();

    // cacheService.getの返り値を設定
    cacheService.get.mockResolvedValue(null);  // デフォルトではnullを返す
    cacheService.set.mockResolvedValue(true);
    
    // GitHub関連のデフォルト設定
    axios.get.mockResolvedValue({ data: {} });
    axios.put.mockResolvedValue({ data: { content: { sha: 'new-sha' } } });
  });

  describe('getFallbackData - 完全なエラーハンドリングテスト', () => {
    test('キャッシュの有効期限チェック - 有効な場合', async () => {
      // fallbackDataStoreの内部キャッシュを直接設定
      // 有効期限内のキャッシュデータを設定
      const now = Date.now();
      const validCacheTime = now - 1800000; // 30分前（有効期限1時間の半分）
      
      // モックの時間を調整
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(validCacheTime) // キャッシュ設定時
        .mockReturnValueOnce(now); // 現在時刻
      
      // 最初にデータを設定してキャッシュを作成
      axios.get.mockImplementation((url) => {
        if (url.includes('fallback-stocks.json')) {
          return Promise.resolve({ data: { [TEST_SYMBOL]: { price: 150 } } });
        }
        return Promise.resolve({ data: {} });
      });
      
      // 強制更新でキャッシュを設定
      await fallbackDataStore.getFallbackData(true);
      
      // axiosをクリアしてキャッシュ使用を確認
      axios.get.mockClear();
      
      // 通常の取得（キャッシュから）
      const result = await fallbackDataStore.getFallbackData(false);
      
      // 検証
      expect(result).toHaveProperty('stocks');
      expect(axios.get).not.toHaveBeenCalled(); // GitHub APIは呼ばれない
      expect(logger.debug).toHaveBeenCalledWith('Using cached fallback data');
    });

    test('GitHub API - 全ての種類のファイル取得成功', async () => {
      // 全ての種類のJSONファイルに対するレスポンスを設定
      axios.get.mockImplementation((url) => {
        if (url.includes('fallback-stocks.json')) {
          return Promise.resolve({ 
            data: { 
              [TEST_SYMBOL]: { price: 150, name: 'Apple Inc.' },
              'MSFT': { price: 200, name: 'Microsoft Corp.' }
            } 
          });
        } else if (url.includes('fallback-etfs.json')) {
          return Promise.resolve({ 
            data: { 
              'VTI': { price: 220, name: 'Vanguard Total Stock Market' }
            } 
          });
        } else if (url.includes('fallback-funds.json')) {
          return Promise.resolve({ 
            data: { 
              '03121033': { price: 10000, name: '日本株ファンド' }
            } 
          });
        } else if (url.includes('fallback-rates.json')) {
          return Promise.resolve({ 
            data: { 
              'USD-JPY': { rate: 149.82, base: 'USD', target: 'JPY' }
            } 
          });
        }
        return Promise.resolve({ data: {} });
      });
      
      const result = await fallbackDataStore.getFallbackData(true);
      
      // 全ての種類のデータが取得されていることを確認
      expect(result.stocks).toHaveProperty(TEST_SYMBOL);
      expect(result.stocks).toHaveProperty('MSFT');
      expect(result.etfs).toHaveProperty('VTI');
      expect(result.mutualFunds).toHaveProperty('03121033');
      expect(result.exchangeRates).toHaveProperty('USD-JPY');
      
      expect(axios.get).toHaveBeenCalledTimes(4); // 4つのJSONファイル
      expect(logger.info).toHaveBeenCalledWith('Fallback data updated from GitHub');
    });

    test('GitHub API エラー時のキャッシュ使用', async () => {
      // 最初に有効なキャッシュを設定
      const cacheData = {
        stocks: { [TEST_SYMBOL]: { price: 150 } },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      };

      // 実際のgetFallbackDataの動作をテストするため、まずキャッシュを設定
      const now = Date.now();
      const pastTime = now - 1800000; // 30分前
      
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(pastTime) // キャッシュ設定時
        .mockReturnValueOnce(now); // 現在時刻
      
      // 最初の成功でキャッシュを設定
      axios.get.mockResolvedValueOnce({ data: cacheData.stocks });
      axios.get.mockResolvedValueOnce({ data: {} });
      axios.get.mockResolvedValueOnce({ data: {} });
      axios.get.mockResolvedValueOnce({ data: {} });
      
      await fallbackDataStore.getFallbackData(true);
      
      // 次回はAPIエラーをシミュレート
      axios.get.mockRejectedValue(new Error('GitHub API error'));
      
      const result = await fallbackDataStore.getFallbackData(true);
      
      // 検証
      expect(result).toHaveProperty('stocks');
      expect(logger.error).toHaveBeenCalledWith('Error fetching fallback data from GitHub:', expect.any(Error));
      expect(logger.warn).toHaveBeenCalledWith('Using stale fallback data from cache');
    });

    test('開発環境でのローカルファイル読み込み', async () => {
      // 環境を開発環境に設定
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // キャッシュをクリア
      fallbackDataStore._resetCacheForTests && fallbackDataStore._resetCacheForTests();
      
      // GitHub APIでエラーをシミュレート
      axios.get.mockRejectedValue(new Error('GitHub API failed'));
      
      // requireのモック（Module.prototype.requireを使用）
      const Module = require('module');
      const originalRequire = Module.prototype.require;
      
      Module.prototype.require = jest.fn((id) => {
        if (id.includes('fallback-stocks.json')) {
          return { [TEST_SYMBOL]: { price: 150, name: 'Apple Inc.' } };
        } else if (id.includes('fallback-etfs.json')) {
          return { 'VTI': { price: 220 } };
        } else if (id.includes('fallback-funds.json')) {
          return { '03121033': { price: 10000 } };
        } else if (id.includes('fallback-rates.json')) {
          return { 'USD-JPY': { rate: 149.82 } };
        }
        return originalRequire.call(this, id);
      });
      
      try {
        const result = await fallbackDataStore.getFallbackData();
        
        // 検証
        expect(result).toHaveProperty('stocks');
        expect(result.stocks).toHaveProperty(TEST_SYMBOL);
        expect(logger.error).toHaveBeenCalledWith('Error fetching fallback data from GitHub:', expect.any(Error));
        expect(logger.info).toHaveBeenCalledWith('Using local fallback data files');
      } finally {
        // 復元
        process.env.NODE_ENV = originalNodeEnv;
        Module.prototype.require = originalRequire;
      }
    });

    test('開発環境でローカルファイル読み込みも失敗した場合', async () => {
      // 環境を開発環境に設定
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      fallbackDataStore._resetCacheForTests && fallbackDataStore._resetCacheForTests();
      
      // GitHub APIでエラーをシミュレート
      axios.get.mockRejectedValue(new Error('GitHub API failed'));
      
      // requireでもエラーをシミュレート
      const Module = require('module');
      const originalRequire = Module.prototype.require;
      
      Module.prototype.require = jest.fn((id) => {
        if (id.includes('fallback-')) {
          throw new Error('Local file not found');
        }
        return originalRequire.call(this, id);
      });
      
      try {
        const result = await fallbackDataStore.getFallbackData();
        
        // 検証：空のデータ構造が返される
        expect(result).toEqual({
          stocks: {},
          etfs: {},
          mutualFunds: {},
          exchangeRates: {}
        });
        expect(logger.error).toHaveBeenCalledWith('Error loading local fallback data:', expect.any(Error));
      } finally {
        // 復元
        process.env.NODE_ENV = originalNodeEnv;
        Module.prototype.require = originalRequire;
      }
    });
  });

  describe('getFallbackForSymbol - 完全なデータタイプテスト', () => {
    test('すべてのデータタイプカテゴリのマッピング', async () => {
      const testCases = [
        { type: 'jp-stock', category: 'stocks', symbol: '7203' },
        { type: 'us-stock', category: 'stocks', symbol: 'AAPL' },
        { type: 'etf', category: 'etfs', symbol: 'VTI' },
        { type: 'mutual-fund', category: 'mutualFunds', symbol: '03121033' },
        { type: 'exchange-rate', category: 'exchangeRates', symbol: 'USD-JPY' },
        { type: 'unknown-type', category: 'stocks', symbol: 'UNKNOWN' } // デフォルト
      ];

      for (const testCase of testCases) {
        // キャッシュをクリア
        cacheService.get.mockResolvedValue(null);
        
        // 該当カテゴリにデータを設定
        const fallbackData = {
          stocks: {},
          etfs: {},
          mutualFunds: {},
          exchangeRates: {}
        };
        fallbackData[testCase.category] = {
          [testCase.symbol]: {
            price: 100,
            name: testCase.symbol
          }
        };
        
        jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue(fallbackData);
        jest.spyOn(fallbackDataStore, 'saveFallbackData').mockResolvedValue(true);
        
        const result = await fallbackDataStore.getFallbackForSymbol(testCase.symbol, testCase.type);
        
        expect(result).toBeDefined();
        expect(result.ticker).toBe(testCase.symbol);
        expect(result.source).toBe('GitHub Fallback');
      }
    });

    test('tickerプロパティが不足している場合の補完', async () => {
      cacheService.get.mockResolvedValue(null);
      
      const fallbackData = {
        stocks: {
          [TEST_SYMBOL]: {
            price: 150,
            name: 'Apple Inc.'
            // tickerプロパティが不足
          }
        },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      };
      
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue(fallbackData);
      jest.spyOn(fallbackDataStore, 'saveFallbackData').mockResolvedValue(true);
      
      const result = await fallbackDataStore.getFallbackForSymbol(TEST_SYMBOL, TEST_TYPE);
      
      expect(result.ticker).toBe(TEST_SYMBOL); // 補完されている
      expect(result.source).toBe('GitHub Fallback');
    });

    test('lastUpdatedプロパティが不足している場合の補完', async () => {
      cacheService.get.mockResolvedValue(null);
      
      const fallbackData = {
        stocks: {
          [TEST_SYMBOL]: {
            ticker: TEST_SYMBOL,
            price: 150,
            name: 'Apple Inc.'
            // lastUpdatedプロパティが不足
          }
        },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      };
      
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue(fallbackData);
      jest.spyOn(fallbackDataStore, 'saveFallbackData').mockResolvedValue(true);
      
      const result = await fallbackDataStore.getFallbackForSymbol(TEST_SYMBOL, TEST_TYPE);
      
      expect(result.lastUpdated).toBe(MOCK_DATE); // 補完されている
    });

    test('sourceプロパティが不足している場合の補完', async () => {
      cacheService.get.mockResolvedValue(null);
      
      const fallbackData = {
        stocks: {
          [TEST_SYMBOL]: {
            ticker: TEST_SYMBOL,
            price: 150,
            name: 'Apple Inc.',
            lastUpdated: MOCK_DATE
            // sourceプロパティが不足
          }
        },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      };
      
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue(fallbackData);
      jest.spyOn(fallbackDataStore, 'saveFallbackData').mockResolvedValue(true);
      
      const result = await fallbackDataStore.getFallbackForSymbol(TEST_SYMBOL, TEST_TYPE);
      
      expect(result.source).toBe('GitHub Fallback'); // 補完されている
    });
  });

  describe('exportCurrentFallbacksToGitHub - 完全機能テスト', () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = 'test-token';
    });

    test('各データタイプの完全な分類処理', async () => {
      // 過去7日間の失敗銘柄を設定
      const testSymbols = ['AAPL', 'VTI', '03121033', 'USD-JPY', '7203'];
      
      jest.spyOn(fallbackDataStore, 'getFailedSymbols')
        .mockResolvedValueOnce(testSymbols)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // 各シンボルの失敗記録を設定
      mockDynamoDb.send.mockImplementation((command) => {
        const idPrefix = command.input.ExpressionAttributeValues[':id'];
        if (idPrefix.includes('AAPL')) {
          return Promise.resolve({ Items: [{ type: 'us-stock', symbol: 'AAPL' }] });
        } else if (idPrefix.includes('VTI')) {
          return Promise.resolve({ Items: [{ type: 'etf', symbol: 'VTI' }] });
        } else if (idPrefix.includes('03121033')) {
          return Promise.resolve({ Items: [{ type: 'mutual-fund', symbol: '03121033' }] });
        } else if (idPrefix.includes('USD-JPY')) {
          return Promise.resolve({ Items: [{ type: 'exchange-rate', symbol: 'USD-JPY' }] });
        } else if (idPrefix.includes('7203')) {
          return Promise.resolve({ Items: [{ type: 'jp-stock', symbol: '7203' }] });
        }
        return Promise.resolve({ Items: [] });
      });

      // 各タイプのキャッシュデータを設定
      cacheService.get.mockImplementation((key) => {
        if (key.includes('AAPL')) {
          return Promise.resolve({ data: { ticker: 'AAPL', price: 150, currency: 'USD' } });
        } else if (key.includes('VTI')) {
          return Promise.resolve({ data: { ticker: 'VTI', price: 220, currency: 'USD' } });
        } else if (key.includes('03121033')) {
          return Promise.resolve({ data: { ticker: '03121033', price: 10000, currency: 'JPY' } });
        } else if (key.includes('USD-JPY')) {
          return Promise.resolve({ data: { ticker: 'USD-JPY', base: 'USD', target: 'JPY', rate: 149.82 } });
        } else if (key.includes('7203')) {
          return Promise.resolve({ data: { ticker: '7203', price: 2500, currency: 'JPY' } });
        }
        return Promise.resolve(null);
      });

      // GitHub データを設定
      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue({
        stocks: { 'EXISTING': { price: 100 } },
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      });

      // GitHub API設定
      axios.get.mockResolvedValue({ data: { sha: 'test-sha' } });
      axios.put.mockResolvedValue({ data: { content: { sha: 'new-sha' } } });

      const result = await fallbackDataStore.exportCurrentFallbacksToGitHub();

      expect(result).toBe(true);
      expect(axios.put).toHaveBeenCalledTimes(4); // 4つのJSONファイル
      
      // 各PUT呼び出しの内容を確認
      const putCalls = axios.put.mock.calls;
      const fileContents = putCalls.map(call => {
        const content = JSON.parse(Buffer.from(call[1].content, 'base64').toString());
        return content;
      });

      // 各データタイプが正しく分類されていることを確認
      const hasStockData = fileContents.some(content => content.AAPL || content['7203']);
      const hasEtfData = fileContents.some(content => content.VTI);
      const hasFundData = fileContents.some(content => content['03121033']);
      const hasRateData = fileContents.some(content => content['USD-JPY']);

      expect(hasStockData).toBe(true);
      expect(hasEtfData).toBe(true);
      expect(hasFundData).toBe(true);
      expect(hasRateData).toBe(true);
    });

    test('為替レートデータの特別な処理', async () => {
      jest.spyOn(fallbackDataStore, 'getFailedSymbols').mockResolvedValue(['USD-JPY']);

      mockDynamoDb.send.mockResolvedValue({
        Items: [{ type: 'exchange-rate', symbol: 'USD-JPY' }]
      });

      cacheService.get.mockResolvedValue({
        data: {
          ticker: 'USD-JPY',
          base: 'USD',
          target: 'JPY',
          rate: 149.82,
          change: 0.5,
          changePercent: 0.33,
          lastUpdated: MOCK_DATE
        }
      });

      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue({
        stocks: {},
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      });

      axios.get.mockResolvedValue({ data: { sha: 'test-sha' } });
      axios.put.mockResolvedValue({ data: { content: { sha: 'new-sha' } } });

      const result = await fallbackDataStore.exportCurrentFallbacksToGitHub();

      expect(result).toBe(true);

      // 為替レートファイルの内容を確認
      const putCalls = axios.put.mock.calls;
      const ratesFileCall = putCalls.find(call => call[0].includes('fallback-rates.json'));
      expect(ratesFileCall).toBeDefined();

      const ratesContent = JSON.parse(Buffer.from(ratesFileCall[1].content, 'base64').toString());
      expect(ratesContent['USD-JPY']).toEqual({
        ticker: 'USD-JPY',
        base: 'USD',
        target: 'JPY',
        rate: 149.82,
        change: 0.5,
        changePercent: 0.33,
        lastUpdated: MOCK_DATE
      });
    });

    test('GitHub API並列更新の完全性', async () => {
      // 各種データを設定
      jest.spyOn(fallbackDataStore, 'getFailedSymbols').mockResolvedValue(['AAPL', 'VTI', '03121033', 'USD-JPY']);

      mockDynamoDb.send.mockImplementation((command) => {
        const idPrefix = command.input.ExpressionAttributeValues[':id'];
        if (idPrefix.includes('AAPL')) {
          return Promise.resolve({ Items: [{ type: 'us-stock', symbol: 'AAPL' }] });
        } else if (idPrefix.includes('VTI')) {
          return Promise.resolve({ Items: [{ type: 'etf', symbol: 'VTI' }] });
        } else if (idPrefix.includes('03121033')) {
          return Promise.resolve({ Items: [{ type: 'mutual-fund', symbol: '03121033' }] });
        } else if (idPrefix.includes('USD-JPY')) {
          return Promise.resolve({ Items: [{ type: 'exchange-rate', symbol: 'USD-JPY' }] });
        }
        return Promise.resolve({ Items: [] });
      });

      cacheService.get.mockImplementation((key) => {
        if (key.includes('AAPL')) {
          return Promise.resolve({ data: { ticker: 'AAPL', price: 150 } });
        } else if (key.includes('VTI')) {
          return Promise.resolve({ data: { ticker: 'VTI', price: 220 } });
        } else if (key.includes('03121033')) {
          return Promise.resolve({ data: { ticker: '03121033', price: 10000 } });
        } else if (key.includes('USD-JPY')) {
          return Promise.resolve({ data: { ticker: 'USD-JPY', rate: 149.82 } });
        }
        return Promise.resolve(null);
      });

      jest.spyOn(fallbackDataStore, 'getFallbackData').mockResolvedValue({
        stocks: {},
        etfs: {},
        mutualFunds: {},
        exchangeRates: {}
      });

      axios.get.mockResolvedValue({ data: { sha: 'test-sha' } });
      axios.put.mockResolvedValue({ data: { content: { sha: 'new-sha' } } });

      const result = await fallbackDataStore.exportCurrentFallbacksToGitHub();

      // 並列実行の確認
      expect(result).toBe(true);
      expect(axios.put).toHaveBeenCalledTimes(4);

      // 各ファイルのPUT呼び出しが正しいURLで行われていることを確認
      const putUrls = axios.put.mock.calls.map(call => call[0]);
      expect(putUrls).toContain(expect.stringContaining('fallback-stocks.json'));
      expect(putUrls).toContain(expect.stringContaining('fallback-etfs.json'));
      expect(putUrls).toContain(expect.stringContaining('fallback-funds.json'));
      expect(putUrls).toContain(expect.stringContaining('fallback-rates.json'));
    });
  });

  describe('すべての非推奨メソッドの完全テスト', () => {
    test('非推奨メソッドの_shouldThrowDeprecationError動作', () => {
      // テスト環境での動作
      expect(fallbackDataStore._shouldThrowDeprecationError()).toBe(false);
      expect(fallbackDataStore._shouldThrowDeprecationError(true)).toBe(false);
      
      // 開発環境の動作をテスト
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        expect(fallbackDataStore._shouldThrowDeprecationError()).toBe(true);
        expect(fallbackDataStore._shouldThrowDeprecationError(true)).toBe(true);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
      
      // 本番環境の動作をテスト
      process.env.NODE_ENV = 'production';
      
      try {
        expect(fallbackDataStore._shouldThrowDeprecationError()).toBe(false);
        expect(fallbackDataStore._shouldThrowDeprecationError(true)).toBe(true);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});