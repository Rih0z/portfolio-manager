/**
 * ファイルパス: __tests__/unit/services/cacheService.test.js
 * 
 * キャッシュサービスのユニットテスト
 * DynamoDBを使用したキャッシュ保存・読込・有効期限のテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-13
 */

// 正しいモジュールパスに修正
const cacheService = require('../../../src/services/cache');
const { getDynamoDb } = require('../../../src/utils/awsConfig');
const { withRetry } = require('../../../src/utils/retry');

// モジュールのモック化
jest.mock('../../../src/utils/awsConfig');
jest.mock('../../../src/utils/retry');

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

describe('Cache Service', () => {
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

  describe('set', () => {
    test('データとTTLを正しく保存する', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行
      await cacheService.set(mockKey, mockItem, mockTtl);
      
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
    });
    
    test('TTL指定なしの場合、デフォルトTTLが使用される', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行（TTL指定なし）
      await cacheService.set(mockKey, mockItem);
      
      // 検証 - デフォルトTTLが使用されていること
      const putParams = mockPutCommand.mock.calls[0][0];
      const now = Math.floor(Date.now() / 1000);
      const defaultTtl = 3600; // 1時間（サービスのデフォルト値と一致させること）
      
      expect(putParams.Item.ttl).toBeGreaterThanOrEqual(now + defaultTtl - 5);
      expect(putParams.Item.ttl).toBeLessThanOrEqual(now + defaultTtl + 5);
    });
    
    test('DynamoDBエラー発生時に例外がスローされる', async () => {
      // エラー発生をシミュレート
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      // 例外がスローされることを検証
      await expect(cacheService.set(mockKey, mockItem)).rejects.toThrow('DynamoDB error');
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
    
    test('DynamoDBエラー発生時に例外がスローされる', async () => {
      // エラー発生をシミュレート
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      // 例外がスローされることを検証
      await expect(cacheService.get(mockKey)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('delete', () => {
    test('キーが正しく削除される', async () => {
      // モックの戻り値を設定
      mockSend.mockResolvedValue({});
      
      // テスト対象の関数を実行
      await cacheService.delete(mockKey);
      
      // 検証
      expect(mockDeleteCommand).toHaveBeenCalledWith(expect.objectContaining({
        TableName: expect.any(String),
        Key: { key: mockKey }
      }));
    });
    
    test('DynamoDBエラー発生時に例外がスローされる', async () => {
      // エラー発生をシミュレート
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      // 例外がスローされることを検証
      await expect(cacheService.delete(mockKey)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getWithPrefix', () => {
    test('プレフィックスに一致するすべてのキーが取得される', async () => {
      // テスト用データ
      const mockPrefix = 'us-stock:';
      const mockItems = [
        {
          key: 'us-stock:AAPL',
          data: JSON.stringify({ symbol: 'AAPL', price: 150 }),
          ttl: Math.floor(Date.now() / 1000) + 300
        },
        {
          key: 'us-stock:MSFT',
          data: JSON.stringify({ symbol: 'MSFT', price: 300 }),
          ttl: Math.floor(Date.now() / 1000) + 300
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
        KeyConditionExpression: expect.stringContaining('begins_with'),
        ExpressionAttributeValues: expect.objectContaining({
          ':prefix': mockPrefix
        })
      }));
      
      // 結果の検証
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('us-stock:AAPL');
      expect(result[0].data).toEqual({ symbol: 'AAPL', price: 150 });
      expect(result[1].key).toBe('us-stock:MSFT');
      expect(result[1].data).toEqual({ symbol: 'MSFT', price: 300 });
    });
    
    test('プレフィックスに一致するキーがない場合は空配列を返す', async () => {
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
        }
      ];
      
      // モックの戻り値を設定
      mockSend.mockResolvedValue({
        Items: mockItems
      });
      
      // テスト対象の関数を実行
      const result = await cacheService.getWithPrefix(mockPrefix);
      
      // 検証 - 期限切れのアイテムがフィルタリングされる
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('us-stock:AAPL');
    });
  });

  describe('cleanup', () => {
    test('期限切れアイテムを削除し件数を返す', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockSend
        .mockResolvedValueOnce({ Items: [ { key: 'old1', ttl: now - 10 }, { key: 'old2', ttl: now - 20 } ] })
        .mockResolvedValue({});

      const result = await cacheService.cleanup();

      // Scan + 2 deletes
      expect(mockScanCommand).toHaveBeenCalled();
      expect(mockDeleteCommand).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ count: 2 });
    });

    test('期限切れアイテムがない場合は0を返す', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await cacheService.cleanup();

      expect(mockScanCommand).toHaveBeenCalled();
      expect(mockDeleteCommand).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0 });
    });
  });
});
