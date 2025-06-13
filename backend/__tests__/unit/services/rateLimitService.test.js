/**
 * レート制限サービスのテスト
 */
'use strict';

const {
  checkRateLimit,
  recordUsage,
  recordApiKeyUsage,
  getRateLimitHeaders,
  getRateLimitStats,
  RATE_LIMITS
} = require('../../../src/services/rateLimitService');
const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const logger = require('../../../src/utils/logger');
const crypto = require('crypto');

// モック
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('../../../src/utils/logger');

describe('rateLimitService', () => {
  let mockDynamoDBClient;
  let mockSend;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-12T10:00:00Z'));
    
    // DynamoDBClientのモック
    mockSend = jest.fn();
    mockDynamoDBClient = {
      send: mockSend
    };
    DynamoDBClient.mockReturnValue(mockDynamoDBClient);
    
    // marshall/unmarshallのモック
    marshall.mockImplementation((obj) => obj);
    unmarshall.mockImplementation((obj) => obj);
    
    // デフォルトのモック応答
    mockSend.mockResolvedValue({ Item: null });
  });
  
  afterEach(() => {
    jest.useRealTimers();
    delete process.env.NODE_ENV;
    delete process.env.RATE_LIMIT_TABLE;
    delete process.env.AWS_REGION;
  });
  
  describe('getRateLimits', () => {
    it('本番環境では厳しい制限を返す', async () => {
      process.env.NODE_ENV = 'production';
      
      // モジュールをリロードして環境変数を反映
      jest.resetModules();
      const { RATE_LIMITS: prodLimits } = require('../../../src/services/rateLimitService');
      
      expect(prodLimits).toEqual({
        public: { hourly: 20, daily: 100 },
        user: { hourly: 60, daily: 500 },
        admin: { hourly: 300, daily: 3000 }
      });
    });
    
    it('開発環境では緩い制限を返す', async () => {
      delete process.env.NODE_ENV;
      
      // モジュールをリロード
      jest.resetModules();
      const { RATE_LIMITS: devLimits } = require('../../../src/services/rateLimitService');
      
      expect(devLimits).toEqual({
        public: { hourly: 100, daily: 1000 },
        user: { hourly: 500, daily: 5000 },
        admin: { hourly: 1000, daily: 10000 }
      });
    });
  });
  
  describe('checkRateLimit', () => {
    it('使用量が制限内の場合はallowed=trueを返す', async () => {
      mockSend.mockResolvedValue({
        Item: {
          count: 5,
          lastUpdated: '2025-06-12T10:00:00Z'
        }
      });
      
      const result = await checkRateLimit('test-identifier', 'public', 'hour');
      
      expect(result).toEqual({
        allowed: true,
        remaining: 95, // 100 - 5
        resetTime: new Date('2025-06-12T11:00:00Z'),
        limit: 100,
        current: 5
      });
      
      expect(GetItemCommand).toHaveBeenCalledWith({
        TableName: 'pfwise-api-dev-rate-limits',
        Key: { id: 'test-identifier:hour:2025-5-12-10' }
      });
    });
    
    it('使用量が制限を超えた場合はallowed=falseを返す', async () => {
      mockSend.mockResolvedValue({
        Item: {
          count: 105,
          lastUpdated: '2025-06-12T10:00:00Z'
        }
      });
      
      const result = await checkRateLimit('test-identifier', 'public', 'hour');
      
      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        resetTime: new Date('2025-06-12T11:00:00Z'),
        limit: 100,
        current: 105
      });
    });
    
    it('日次制限をチェックできる', async () => {
      mockSend.mockResolvedValue({
        Item: {
          count: 500,
          lastUpdated: '2025-06-12T10:00:00Z'
        }
      });
      
      const result = await checkRateLimit('test-identifier', 'public', 'day');
      
      expect(result).toEqual({
        allowed: true,
        remaining: 500, // 1000 - 500
        resetTime: new Date('2025-06-13T00:00:00Z'),
        limit: 1000,
        current: 500
      });
      
      expect(GetItemCommand).toHaveBeenCalledWith({
        TableName: 'pfwise-api-dev-rate-limits',
        Key: { id: 'test-identifier:day:2025-5-12' }
      });
    });
    
    it('使用履歴がない場合はcount=0として処理', async () => {
      mockSend.mockResolvedValue({ Item: null });
      
      const result = await checkRateLimit('test-identifier', 'user', 'hour');
      
      expect(result).toEqual({
        allowed: true,
        remaining: 500,
        resetTime: new Date('2025-06-12T11:00:00Z'),
        limit: 500,
        current: 0
      });
    });
    
    it('管理者の制限を適用できる', async () => {
      mockSend.mockResolvedValue({ Item: { count: 50 } });
      
      const result = await checkRateLimit('admin-key', 'admin', 'hour');
      
      expect(result).toEqual({
        allowed: true,
        remaining: 950, // 1000 - 50
        resetTime: new Date('2025-06-12T11:00:00Z'),
        limit: 1000,
        current: 50
      });
    });
    
    it('不明なタイプの場合はpublicの制限を使用', async () => {
      mockSend.mockResolvedValue({ Item: { count: 10 } });
      
      const result = await checkRateLimit('test-identifier', 'unknown', 'hour');
      
      expect(result).toEqual({
        allowed: true,
        remaining: 90, // public hourly: 100 - 10
        resetTime: new Date('2025-06-12T11:00:00Z'),
        limit: 100,
        current: 10
      });
    });
    
    it('エラー発生時はallowed=falseを返す', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      const result = await checkRateLimit('test-identifier', 'public', 'hour');
      
      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        resetTime: new Date('2025-06-12T10:00:00Z'),
        limit: 0,
        current: 0
      });
      
      expect(logger.error).toHaveBeenCalledWith('Rate limit check error:', expect.any(Error));
    });
    
    it('カスタムテーブル名を使用できる', async () => {
      process.env.RATE_LIMIT_TABLE = 'custom-rate-limit-table';
      
      await checkRateLimit('test-identifier', 'public', 'hour');
      
      expect(GetItemCommand).toHaveBeenCalledWith({
        TableName: 'custom-rate-limit-table',
        Key: expect.any(Object)
      });
    });
  });
  
  describe('recordUsage', () => {
    it('使用量を記録する', async () => {
      await recordUsage('test-identifier', 'public', 'hour', { endpoint: '/api/test' });
      
      expect(UpdateItemCommand).toHaveBeenCalledWith({
        TableName: 'pfwise-api-dev-rate-limits',
        Key: { id: 'test-identifier:hour:2025-5-12-10' },
        UpdateExpression: 'ADD #count :inc SET #lastUpdated = :timestamp, #ttl = :ttl, #metadata = :metadata',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#lastUpdated': 'lastUpdated',
          '#ttl': 'ttl',
          '#metadata': 'metadata'
        },
        ExpressionAttributeValues: {
          ':inc': 1,
          ':timestamp': '2025-06-12T10:00:00.000Z',
          ':ttl': expect.any(Number), // 7日後のUNIXタイムスタンプ
          ':metadata': {
            identifier: 'test-identifier',
            type: 'public',
            window: 'hour',
            timestamp: '2025-06-12T10:00:00.000Z',
            endpoint: '/api/test'
          }
        }
      });
    });
    
    it('日次使用量を記録する', async () => {
      await recordUsage('test-identifier', 'user', 'day');
      
      expect(UpdateItemCommand).toHaveBeenCalledWith({
        TableName: 'pfwise-api-dev-rate-limits',
        Key: { id: 'test-identifier:day:2025-5-12' },
        UpdateExpression: expect.any(String),
        ExpressionAttributeNames: expect.any(Object),
        ExpressionAttributeValues: expect.objectContaining({
          ':metadata': expect.objectContaining({
            type: 'user',
            window: 'day'
          })
        })
      });
    });
    
    it('エラーが発生しても処理を継続する', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      // エラーをスローしないことを確認
      await expect(recordUsage('test-identifier', 'public', 'hour')).resolves.not.toThrow();
      
      expect(logger.error).toHaveBeenCalledWith('Usage recording error:', expect.any(Error));
    });
    
    it('TTLが正しく設定される', async () => {
      await recordUsage('test-identifier', 'public', 'hour');
      
      const expectedTtl = Math.floor((new Date('2025-06-19T10:00:00Z').getTime()) / 1000);
      
      expect(UpdateItemCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':ttl': expectedTtl
          })
        })
      );
    });
  });
  
  describe('recordApiKeyUsage', () => {
    it('APIキーの使用量を時間別と日別の両方で記録する', async () => {
      const apiKey = 'test-api-key-12345';
      const metadata = { endpoint: '/api/data', keyType: 'user' };
      
      await recordApiKeyUsage(apiKey, metadata);
      
      // ハッシュ化されたキーを計算
      const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
      
      expect(UpdateItemCommand).toHaveBeenCalledTimes(2);
      
      // 時間別記録
      expect(UpdateItemCommand).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Key: { id: `${hashedKey}:hour:2025-5-12-10` },
        ExpressionAttributeValues: expect.objectContaining({
          ':metadata': expect.objectContaining({
            type: 'user',
            window: 'hour',
            endpoint: '/api/data',
            keyType: 'user'
          })
        })
      }));
      
      // 日別記録
      expect(UpdateItemCommand).toHaveBeenNthCalledWith(2, expect.objectContaining({
        Key: { id: `${hashedKey}:day:2025-5-12` },
        ExpressionAttributeValues: expect.objectContaining({
          ':metadata': expect.objectContaining({
            type: 'user',
            window: 'day',
            endpoint: '/api/data',
            keyType: 'user'
          })
        })
      }));
    });
    
    it('keyTypeが指定されない場合はデフォルトでuserを使用', async () => {
      await recordApiKeyUsage('test-key', { endpoint: '/api/test' });
      
      expect(UpdateItemCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':metadata': expect.objectContaining({
              type: 'user'
            })
          })
        })
      );
    });
  });
  
  describe('getRateLimitHeaders', () => {
    it('レート制限情報をヘッダー形式で返す', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: { count: 25 } }) // hour
        .mockResolvedValueOnce({ Item: { count: 150 } }); // day
      
      const headers = await getRateLimitHeaders('test-identifier', 'public');
      
      expect(headers).toEqual({
        'X-RateLimit-Limit-Hour': '100',
        'X-RateLimit-Remaining-Hour': '75',
        'X-RateLimit-Reset-Hour': Math.floor(new Date('2025-06-12T11:00:00Z').getTime() / 1000).toString(),
        'X-RateLimit-Limit-Day': '1000',
        'X-RateLimit-Remaining-Day': '850',
        'X-RateLimit-Reset-Day': Math.floor(new Date('2025-06-13T00:00:00Z').getTime() / 1000).toString()
      });
    });
    
    it('管理者タイプのヘッダーを返す', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: { count: 100 } }) // hour
        .mockResolvedValueOnce({ Item: { count: 1000 } }); // day
      
      const headers = await getRateLimitHeaders('admin-key', 'admin');
      
      expect(headers).toEqual({
        'X-RateLimit-Limit-Hour': '1000',
        'X-RateLimit-Remaining-Hour': '900',
        'X-RateLimit-Reset-Hour': expect.any(String),
        'X-RateLimit-Limit-Day': '10000',
        'X-RateLimit-Remaining-Day': '9000',
        'X-RateLimit-Reset-Day': expect.any(String)
      });
    });
  });
  
  describe('getRateLimitStats', () => {
    it('過去24時間の統計を取得する', async () => {
      // 各時間の使用量をモック
      const mockResponses = [];
      for (let i = 0; i < 24; i++) {
        mockResponses.push({ Item: { count: i * 10 } });
      }
      mockSend.mockImplementation(() => Promise.resolve(mockResponses.shift()));
      
      const stats = await getRateLimitStats('test-identifier', 'public');
      
      // 24時間分のデータがあることを確認
      const keys = Object.keys(stats);
      expect(keys).toHaveLength(24);
      
      // 最新の時間のデータを確認
      expect(stats['2025-5-12-10']).toBe(0);
      
      // 24回のGetItemコマンドが呼ばれたことを確認
      expect(GetItemCommand).toHaveBeenCalledTimes(24);
    });
    
    it('データがない時間はcount=0として処理', async () => {
      mockSend.mockResolvedValue({ Item: null });
      
      const stats = await getRateLimitStats('test-identifier', 'public');
      
      // すべての時間がcount=0であることを確認
      Object.values(stats).forEach(count => {
        expect(count).toBe(0);
      });
    });
  });
  
  describe('Edge cases', () => {
    it('不正なwindowパラメータでエラーをスロー', async () => {
      await expect(checkRateLimit('test', 'public', 'invalid')).rejects.toThrow('Unknown window: invalid');
    });
    
    it('AWS_REGIONが設定されていない場合はデフォルト値を使用', async () => {
      delete process.env.AWS_REGION;
      
      // モジュールをリロード
      jest.resetModules();
      require('../../../src/services/rateLimitService');
      
      expect(DynamoDBClient).toHaveBeenCalledWith({
        region: 'ap-northeast-1'
      });
    });
    
    it('カスタムAWS_REGIONを使用', async () => {
      process.env.AWS_REGION = 'us-west-2';
      
      // モジュールをリロード
      jest.resetModules();
      require('../../../src/services/rateLimitService');
      
      expect(DynamoDBClient).toHaveBeenCalledWith({
        region: 'us-west-2'
      });
    });
    
    it('月の境界を超える日次リセット時刻を正しく計算', async () => {
      // 月末に設定
      jest.setSystemTime(new Date('2025-01-31T23:00:00Z'));
      
      const result = await checkRateLimit('test', 'public', 'day');
      
      expect(result.resetTime).toEqual(new Date('2025-02-01T00:00:00Z'));
    });
    
    it('年の境界を超える日次リセット時刻を正しく計算', async () => {
      // 年末に設定
      jest.setSystemTime(new Date('2025-12-31T23:00:00Z'));
      
      const result = await checkRateLimit('test', 'public', 'day');
      
      expect(result.resetTime).toEqual(new Date('2026-01-01T00:00:00Z'));
    });
    
    it('incrementUsageのエラーを再スロー', async () => {
      const error = new Error('DynamoDB update error');
      mockSend.mockRejectedValue(error);
      
      // recordUsageはエラーをキャッチするが、内部のincrementUsageはエラーをスローする
      await recordUsage('test', 'public', 'hour');
      
      expect(logger.error).toHaveBeenCalledWith('Increment usage error:', error);
      expect(logger.error).toHaveBeenCalledWith('Usage recording error:', error);
    });
  });
});