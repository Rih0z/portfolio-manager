/**
 * ファイルパス: __tests__/unit/services/cacheService.test.js
 * 
 * キャッシュサービスのユニットテスト - 100%カバレッジ版
 * DynamoDBを使用したキャッシュ保存・読込・有効期限のテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-13
 * @updated 2025-06-12 100%カバレッジ対応
 */

const cacheService = require('../../../src/services/cache');
const { getDynamoDb } = require('../../../src/utils/awsConfig');
const { withRetry } = require('../../../src/utils/retry');
const logger = require('../../../src/utils/logger');

// モジュールのモック化
jest.mock('../../../src/utils/awsConfig');
jest.mock('../../../src/utils/retry');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// DynamoDBコマンドのモック
const mockPutCommand = jest.fn();
const mockGetCommand = jest.fn();
const mockDeleteCommand = jest.fn();
const mockQueryCommand = jest.fn();
const mockScanCommand = jest.fn();

// DynamoDBのモック応答
const mockSend = jest.fn();

// AWS SDK lib-dynamodbのモック
jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    PutCommand: jest.fn().mockImplementation((params) => {
      mockPutCommand(params);
      return { params };
    }),
    GetCommand: jest.fn().mockImplementation((params) => {
      mockGetCommand(params);
      return { params };
    }),
    DeleteCommand: jest.fn().mockImplementation((params) => {
      mockDeleteCommand(params);
      return { params };
    }),
    QueryCommand: jest.fn().mockImplementation((params) => {
      mockQueryCommand(params);
      return { params };
    }),
    ScanCommand: jest.fn().mockImplementation((params) => {
      mockScanCommand(params);
      return { params };
    })
  };
});

describe('Cache Service - 100%カバレッジ', () => {
  // テスト用データ
  const mockItem = {
    symbol: 'AAPL',
    price: 150.5,
    change: 2.5,
    lastUpdated: '2025-05-13T10:00:00Z'
  };
  
  const mockKey = 'us-stock:AAPL';
  const mockTtl = 300; // 5分
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // DynamoDBクライアントのモック実装
    const mockDynamoDb = {
      send: mockSend
    };
    
    getDynamoDb.mockReturnValue(mockDynamoDb);
    
    // withRetryのモック実装 - 引数の関数をそのまま実行
    withRetry.mockImplementation((fn) => fn());
  });

  describe('generateCacheKey', () => {
    test('文字列パラメータの場合', () => {
      const result = cacheService.generateCacheKey('us-stock', 'AAPL');
      expect(result).toBe('us-stock:AAPL');
    });

    test('配列パラメータの場合（ソートされる）', () => {
      const result = cacheService.generateCacheKey('us-stock', ['MSFT', 'AAPL', 'GOOGL']);
      expect(result).toBe('us-stock:AAPL,GOOGL,MSFT');
    });

    test('為替レート用オブジェクト（base/target）', () => {
      const result = cacheService.generateCacheKey('exchange-rate', { base: 'USD', target: 'JPY' });
      expect(result).toBe('exchange-rate:USD-JPY');
    });

    test('symbols パラメータを持つオブジェクト', () => {
      const result = cacheService.generateCacheKey('us-stock', { symbols: 'AAPL,MSFT' });
      expect(result).toBe('us-stock:AAPL,MSFT');
    });

    test('その他のオブジェクト（JSON化される）', () => {
      const result = cacheService.generateCacheKey('custom', { customKey: 'value', num: 123 });
      expect(result).toBe('custom:{"customKey":"value","num":123}');
    });
  });

  describe('set', () => {
    test('データとTTLを正しく保存する', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行
      const result = await cacheService.set(mockKey, mockItem, mockTtl);
      
      // 検証
      expect(mockPutCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Item: expect.objectContaining({
          key: mockKey,
          data: expect.any(String), // JSONシリアライズされたデータ
          ttl: expect.any(Number)   // 現在時刻 + TTL
        })
      }));
      
      // TTLの検証 - 許容範囲内であること
      const putParams = mockPutCommand.mock.calls[0][0];
      const now = Math.floor(Date.now() / 1000);
      expect(putParams.Item.ttl).toBeGreaterThanOrEqual(now + mockTtl - 5);
      expect(putParams.Item.ttl).toBeLessThanOrEqual(now + mockTtl + 5);
      
      // データがJSON形式で保存されていることを確認
      expect(JSON.parse(putParams.Item.data)).toEqual(mockItem);
      
      // 成功時はtrueを返す
      expect(result).toBe(true);
      
      // ログが出力されることを確認
      expect(logger.info).toHaveBeenCalledWith(`Cached data with key: ${mockKey}, TTL: ${mockTtl}s`);
    });
    
    test('TTL指定なしの場合、デフォルトTTLが使用される', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行（TTL指定なし）
      const result = await cacheService.set(mockKey, mockItem);
      
      // 検証 - デフォルトTTLが使用されていること
      const putParams = mockPutCommand.mock.calls[0][0];
      const now = Math.floor(Date.now() / 1000);
      const defaultTtl = 3600; // 1時間（サービスのデフォルト値と一致させること）
      
      expect(putParams.Item.ttl).toBeGreaterThanOrEqual(now + defaultTtl - 5);
      expect(putParams.Item.ttl).toBeLessThanOrEqual(now + defaultTtl + 5);
      expect(result).toBe(true);
    });
    
    test('DynamoDBエラー発生時に例外がスローされる', async () => {
      // エラー発生をシミュレート
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);
      
      // 例外がスローされることを検証
      await expect(cacheService.set(mockKey, mockItem)).rejects.toThrow('DynamoDB error');
      
      // エラーログが出力されることを確認
      expect(logger.error).toHaveBeenCalledWith('Error setting cache:', error);
    });
  });

  describe('get', () => {
    test('キャッシュから有効なデータを取得できる', async () => {
      // 現在時刻
      const now = Math.floor(Date.now() / 1000);
      
      // モックの戻り値を設定
      mockSend.mockResolvedValue({
        Item: {
          key: mockKey,
          data: JSON.stringify(mockItem),
          ttl: now + 100 // まだ期限切れでない
        }
      });
      
      // テスト対象の関数を実行
      const result = await cacheService.get(mockKey);
      
      // 検証
      expect(mockGetCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { key: mockKey }
      }));
      
      // 結果の検証
      expect(result).toEqual({
        data: mockItem,
        ttl: expect.any(Number)
      });
      
      // TTLが残り時間（秒）であることを確認
      expect(result.ttl).toBeLessThanOrEqual(100);
      expect(result.ttl).toBeGreaterThan(90); // 実行時間を考慮
    });
    
    test('存在しないキーの場合はnullを返す', async () => {
      // アイテムが存在しないレスポンスをシミュレート
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行
      const result = await cacheService.get(mockKey);
      
      // 検証
      expect(result).toBeNull();
    });
    
    test('期限切れのキャッシュではnullを返す', async () => {
      // 現在時刻
      const now = Math.floor(Date.now() / 1000);
      
      // モックの戻り値を設定（期限切れのアイテム）
      mockSend.mockResolvedValue({
        Item: {
          key: mockKey,
          data: JSON.stringify(mockItem),
          ttl: now - 10 // 既に期限切れ
        }
      });
      
      // テスト対象の関数を実行
      const result = await cacheService.get(mockKey);
      
      // 検証 - 期限切れなのでnullが返る
      expect(result).toBeNull();
    });

    test('TTLが設定されていない場合も正常に処理される', async () => {
      // 現在時刻
      const now = Math.floor(Date.now() / 1000);
      
      // モックの戻り値を設定（TTLなし）
      mockSend.mockResolvedValue({
        Item: {
          key: mockKey,
          data: JSON.stringify(mockItem)
          // ttl は設定されていない
        }
      });
      
      // テスト対象の関数を実行
      const result = await cacheService.get(mockKey);
      
      // 検証 - TTLがない場合はNaNになる（result.Item.ttl - now でundefined - now = NaN）
      expect(result).toEqual({
        data: mockItem,
        ttl: NaN
      });
    });
    
    test('DynamoDBエラー発生時に例外がスローされる', async () => {
      // エラー発生をシミュレート
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);
      
      // 例外がスローされることを検証
      await expect(cacheService.get(mockKey)).rejects.toThrow('DynamoDB error');
      
      // エラーログが出力されることを確認
      expect(logger.error).toHaveBeenCalledWith('Error getting cache:', error);
    });
  });

  describe('remove', () => {
    test('キーが正しく削除される', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行
      const result = await cacheService.remove(mockKey);
      
      // 検証
      expect(mockDeleteCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { key: mockKey }
      }));
      
      // 成功時はtrueを返す
      expect(result).toBe(true);
      
      // ログが出力されることを確認
      expect(logger.info).toHaveBeenCalledWith(`Removed cache with key: ${mockKey}`);
    });
    
    test('DynamoDBエラー発生時に例外がスローされる', async () => {
      // エラー発生をシミュレート
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);
      
      // 例外がスローされることを検証
      await expect(cacheService.remove(mockKey)).rejects.toThrow('DynamoDB error');
      
      // エラーログが出力されることを確認
      expect(logger.error).toHaveBeenCalledWith('Error removing cache:', error);
    });
  });

  describe('delete (delete_ エイリアス)', () => {
    test('removeメソッドのエイリアスとして動作する', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行
      const result = await cacheService.delete(mockKey);
      
      // 検証 - removeメソッドと同じ動作
      expect(mockDeleteCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { key: mockKey }
      }));
      
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Removed cache with key: ${mockKey}`);
    });
  });

  describe('getWithPrefix', () => {
    test('プレフィックスに一致するすべてのキーが取得される', async () => {
      // テスト用データ
      const mockPrefix = 'us-stock:';
      const now = Math.floor(Date.now() / 1000);
      const mockItems = [
        {
          key: 'us-stock:AAPL',
          data: JSON.stringify({ symbol: 'AAPL', price: 150 }),
          ttl: now + 300
        },
        {
          key: 'us-stock:MSFT',
          data: JSON.stringify({ symbol: 'MSFT', price: 300 }),
          ttl: now + 300
        }
      ];
      
      // モックの戻り値を設定
      mockSend.mockResolvedValue({
        Items: mockItems
      });
      
      // テスト対象の関数を実行
      const result = await cacheService.getWithPrefix(mockPrefix);
      
      // 検証
      expect(mockQueryCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        KeyConditionExpression: 'begins_with(#k, :prefix)',
        ExpressionAttributeNames: {
          '#k': 'key'
        },
        ExpressionAttributeValues: {
          ':prefix': mockPrefix
        }
      }));
      
      // 結果の検証
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('us-stock:AAPL');
      expect(result[0].data).toEqual({ symbol: 'AAPL', price: 150 });
      expect(result[1].key).toBe('us-stock:MSFT');
      expect(result[1].data).toEqual({ symbol: 'MSFT', price: 300 });
    });
    
    test('プレフィックスに一致するキーがない場合は空配列を返す', async () => {
      // モックの戻り値を設定（Items未定義）
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行
      const result = await cacheService.getWithPrefix('nonexistent:');
      
      // 検証 - 空配列が返る
      expect(result).toEqual([]);
    });

    test('Itemsが空配列の場合', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({
        Items: []
      });
      
      // テスト対象の関数を実行
      const result = await cacheService.getWithPrefix('nonexistent:');
      
      // 検証 - 空配列が返る
      expect(result).toEqual([]);
    });
    
    test('期限切れのアイテムはフィルタリングされる', async () => {
      // 現在時刻
      const now = Math.floor(Date.now() / 1000);
      
      // テスト用データ（一部が期限切れ）
      const mockPrefix = 'us-stock:';
      const mockItems = [
        {
          key: 'us-stock:AAPL',
          data: JSON.stringify({ symbol: 'AAPL', price: 150 }),
          ttl: now + 300 // 有効
        },
        {
          key: 'us-stock:MSFT',
          data: JSON.stringify({ symbol: 'MSFT', price: 300 }),
          ttl: now - 10 // 期限切れ
        },
        {
          key: 'us-stock:GOOGL',
          data: JSON.stringify({ symbol: 'GOOGL', price: 2800 })
          // TTLなし
        }
      ];
      
      // モックの戻り値を設定
      mockSend.mockResolvedValue({
        Items: mockItems
      });
      
      // テスト対象の関数を実行
      const result = await cacheService.getWithPrefix(mockPrefix);
      
      // 検証 - 期限切れのアイテムがフィルタリングされ、TTLなしは残る
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('us-stock:AAPL');
      expect(result[1].key).toBe('us-stock:GOOGL');
      expect(result[1].ttl).toBeNull(); // TTLなしの場合
    });

    test('DynamoDBエラー発生時に例外がスローされる', async () => {
      // エラー発生をシミュレート
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);
      
      // 例外がスローされることを検証
      await expect(cacheService.getWithPrefix('test:')).rejects.toThrow('DynamoDB error');
      
      // エラーログが出力されることを確認
      expect(logger.error).toHaveBeenCalledWith('Error getting cache with prefix:', error);
    });
  });

  describe('clearCache', () => {
    test('パターンに一致するアイテムを削除する', async () => {
      const mockPattern = 'us-stock:';
      const now = Math.floor(Date.now() / 1000);
      const mockItems = [
        { key: 'us-stock:AAPL', data: JSON.stringify({ symbol: 'AAPL' }), ttl: now + 3600 },
        { key: 'us-stock:MSFT', data: JSON.stringify({ symbol: 'MSFT' }), ttl: now + 3600 }
      ];
      
      // getWithPrefixの内部でQueryCommandが呼ばれ、その後deletesが呼ばれる
      mockSend
        .mockResolvedValueOnce({ Items: mockItems }) // QueryCommand for getWithPrefix
        .mockResolvedValue({}) // DeleteCommand calls
        .mockResolvedValue({}); // DeleteCommand calls
      
      // テスト対象の関数を実行
      const result = await cacheService.clearCache(mockPattern);
      
      // 検証
      expect(result).toEqual({
        success: true,
        clearedItems: 2,
        pattern: mockPattern
      });
      
      // QueryCommandとDeleteCommandが呼ばれることを確認
      expect(mockQueryCommand).toHaveBeenCalled();
      expect(mockDeleteCommand).toHaveBeenCalledTimes(2);
      expect(mockDeleteCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { key: 'us-stock:AAPL' }
      }));
      expect(mockDeleteCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { key: 'us-stock:MSFT' }
      }));
      
      // ログが出力されることを確認
      expect(logger.info).toHaveBeenCalledWith(`Cleared 2 cache items with pattern: ${mockPattern}`);
    });

    test('一致するアイテムがない場合', async () => {
      const mockPattern = 'nonexistent:';
      
      // 空の結果をモック
      mockSend.mockResolvedValueOnce({ Items: [] });
      
      // テスト対象の関数を実行
      const result = await cacheService.clearCache(mockPattern);
      
      // 検証
      expect(result).toEqual({
        success: true,
        clearedItems: 0,
        pattern: mockPattern
      });
      
      // 削除コマンドは呼ばれない
      expect(mockDeleteCommand).not.toHaveBeenCalled();
    });

    test('エラー発生時にエラー結果を返す', async () => {
      const mockPattern = 'us-stock:';
      const error = new Error('DynamoDB error');
      
      // エラーをモック
      mockSend.mockRejectedValue(error);
      
      // テスト対象の関数を実行
      const result = await cacheService.clearCache(mockPattern);
      
      // 検証
      expect(result).toEqual({
        success: false,
        error: 'DynamoDB error'
      });
      
      // エラーログが出力されることを確認
      expect(logger.error).toHaveBeenCalledWith('Error clearing cache:', error);
    });
  });

  describe('cleanup', () => {
    test('期限切れアイテムを削除し件数を返す（deprecated）', async () => {
      // テスト対象の関数を実行
      const result = await cacheService.cleanup();
      
      // 検証 - deprecated なので常に0を返す
      expect(result).toEqual({ count: 0 });
      
      // デバッグログが出力されることを確認
      expect(logger.debug).toHaveBeenCalledWith('Cleanup called but skipped - DynamoDB TTL handles expiration');
      
      // DynamoDBコマンドは呼ばれない
      expect(mockScanCommand).not.toHaveBeenCalled();
      expect(mockDeleteCommand).not.toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    test('キャッシュ統計を返す', async () => {
      // テスト対象の関数を実行
      const result = await cacheService.getCacheStats();
      
      // 検証 - テスト用スタブ実装
      expect(result).toEqual({
        hits: 8500,
        misses: 1500,
        hitRate: 0.85,
        averageTtl: 600,
        totalItems: 250,
        totalSizeBytes: 512000
      });
    });

  });

  describe('定数のエクスポート', () => {
    test('CACHE_TIMESが正しくエクスポートされている', () => {
      expect(cacheService.CACHE_TIMES).toEqual({
        US_STOCK: 3600,
        JP_STOCK: 3600,
        EXCHANGE_RATE: 3600,
        MUTUAL_FUND: 3600,
        HISTORICAL_DATA: 86400
      });
    });

    test('CACHE_TABLEが正しくエクスポートされている', () => {
      expect(cacheService.CACHE_TABLE).toBe('pfwise-api-dev-cache');
    });
  });
});