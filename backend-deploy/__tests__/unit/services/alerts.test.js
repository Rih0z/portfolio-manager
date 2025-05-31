/**
 * ファイルパス: __tests__/unit/services/alerts.test.js
 * 
 * アラートサービスのユニットテスト
 * エラーや重要なイベントの通知機能をテストします
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-18
 */

// テスト対象モジュールのインポート
const alertService = require('../../../src/services/alerts');

// 依存モジュールのインポート
const logger = require('../../../src/utils/logger');

// モジュールのモック化
jest.mock('../../../src/utils/logger');

describe('Alert Service', () => {
  // モックタイムスタンプ用の定数
  const MOCK_TIMESTAMP = '2025-05-18T12:00:00.000Z';
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // Date.nowとtoISOStringをモック
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(MOCK_TIMESTAMP);
  });
  
  afterEach(() => {
    // モックをリストア
    jest.restoreAllMocks();
  });
  
  describe('notifyError', () => {
    test('正常系: エラー通知を送信して成功レスポンスを返す', async () => {
      // テストデータ
      const title = 'テストエラー';
      const error = new Error('エラーメッセージ');
      const context = { userId: '123', operation: 'データ取得' };
      
      // 関数実行
      const result = await alertService.notifyError(title, error, context);
      
      // 検証
      expect(result).toEqual({
        success: true,
        title: title,
        timestamp: MOCK_TIMESTAMP
      });
      
      // loggerが正しく呼ばれたことを検証
      expect(logger.error).toHaveBeenCalledWith(
        'ERROR ALERT:',
        expect.objectContaining({
          title: title,
          error: error.message,
          userId: context.userId,
          operation: context.operation
        })
      );
    });
    
    test('異常系: 通知処理中にエラーが発生した場合はエラーレスポンスを返す', async () => {
      // loggerがエラーをスローするようにモック
      // ただし最初の呼び出しでのみ例外をスローするよう修正
      const mockError = new Error('通知処理エラー');
      let errorCallCount = 0;
      logger.error.mockImplementation(() => {
        errorCallCount++;
        if (errorCallCount === 1) {
          throw mockError;
        }
      });
      
      // テストデータ
      const title = 'テストエラー';
      const error = new Error('エラーメッセージ');
      
      // 関数実行
      const result = await alertService.notifyError(title, error);
      
      // 検証
      expect(result).toEqual({
        success: false,
        error: mockError.message
      });
      
      // 失敗ログは2回目のlogger.errorで記録
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        'Failed to send error alert:',
        mockError
      );
    });
  });
  
  describe('notifyUsage', () => {
    test('正常系: 使用量アラートを送信して成功レスポンスを返す', async () => {
      // テストデータ
      const level = 'WARNING';
      const usageData = {
        count: 950,
        limit: 1000,
        percentage: 95
      };
      
      // 関数実行
      const result = await alertService.notifyUsage(level, usageData);
      
      // 検証
      expect(result).toEqual({
        success: true,
        level: level,
        timestamp: MOCK_TIMESTAMP
      });
      
      // loggerが正しく呼ばれたことを検証
      expect(logger.warn).toHaveBeenCalledWith(
        'USAGE ALERT:',
        expect.objectContaining({
          level: level,
          count: usageData.count,
          limit: usageData.limit,
          percentage: usageData.percentage
        })
      );
    });
    
    test('異常系: 通知処理中にエラーが発生した場合はエラーレスポンスを返す', async () => {
      // loggerがエラーをスローするようにモック
      // ただし最初の呼び出しでのみ例外をスローするよう修正
      const mockError = new Error('通知処理エラー');
      logger.warn.mockImplementationOnce(() => {
        throw mockError;
      });
      
      // テストデータ
      const level = 'WARNING';
      const usageData = { count: 950 };
      
      // 関数実行
      const result = await alertService.notifyUsage(level, usageData);
      
      // 検証
      expect(result).toEqual({
        success: false,
        error: mockError.message
      });
      
      // エラーログが記録されていることを検証
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send usage alert:',
        mockError
      );
    });
  });
  
  describe('notifyBudget', () => {
    test('正常系: 予算アラートを送信して成功レスポンスを返す', async () => {
      // テストデータ
      const level = 'CRITICAL';
      const budgetData = {
        budgetName: 'AWS Lambda',
        currentAmount: 85.5,
        budgetLimit: 100,
        percentageUsed: 85.5
      };
      
      // 関数実行
      const result = await alertService.notifyBudget(level, budgetData);
      
      // 検証
      expect(result).toEqual({
        success: true,
        level: level,
        timestamp: MOCK_TIMESTAMP
      });
      
      // loggerが正しく呼ばれたことを検証
      expect(logger.warn).toHaveBeenCalledWith(
        'BUDGET ALERT:',
        expect.objectContaining({
          level: level,
          budgetName: budgetData.budgetName,
          currentAmount: budgetData.currentAmount,
          budgetLimit: budgetData.budgetLimit,
          percentageUsed: budgetData.percentageUsed
        })
      );
    });
    
    test('異常系: 通知処理中にエラーが発生した場合はエラーレスポンスを返す', async () => {
      // loggerがエラーをスローするようにモック
      // ただし最初の呼び出しでのみ例外をスローするよう修正
      const mockError = new Error('通知処理エラー');
      logger.warn.mockImplementationOnce(() => {
        throw mockError;
      });
      
      // テストデータ
      const level = 'CRITICAL';
      const budgetData = { budgetName: 'AWS Lambda' };
      
      // 関数実行
      const result = await alertService.notifyBudget(level, budgetData);
      
      // 検証
      expect(result).toEqual({
        success: false,
        error: mockError.message
      });
      
      // エラーログが記録されていることを検証
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send budget alert:',
        mockError
      );
    });
  });
  
  describe('notifySystemEvent', () => {
    test('正常系: システムイベント通知を送信して成功レスポンスを返す', async () => {
      // テストデータ
      const eventType = 'CACHE_CLEARED';
      const eventData = {
        cacheType: 'market-data',
        itemsCleared: 150,
        triggeredBy: 'system'
      };
      
      // 関数実行
      const result = await alertService.notifySystemEvent(eventType, eventData);
      
      // 検証
      expect(result).toEqual({
        success: true,
        eventType: eventType,
        timestamp: MOCK_TIMESTAMP
      });
      
      // loggerが正しく呼ばれたことを検証
      expect(logger.info).toHaveBeenCalledWith(
        'SYSTEM EVENT:',
        expect.objectContaining({
          eventType: eventType,
          cacheType: eventData.cacheType,
          itemsCleared: eventData.itemsCleared,
          triggeredBy: eventData.triggeredBy
        })
      );
    });
    
    test('異常系: 通知処理中にエラーが発生した場合はエラーレスポンスを返す', async () => {
      // loggerがエラーをスローするようにモック
      // ただし最初の呼び出しでのみ例外をスローするよう修正
      const mockError = new Error('通知処理エラー');
      logger.info.mockImplementationOnce(() => {
        throw mockError;
      });
      
      // テストデータ
      const eventType = 'CACHE_CLEARED';
      const eventData = { cacheType: 'market-data' };
      
      // 関数実行
      const result = await alertService.notifySystemEvent(eventType, eventData);
      
      // 検証
      expect(result).toEqual({
        success: false,
        error: mockError.message
      });
      
      // エラーログが記録されていることを検証
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send system event notification:',
        mockError
      );
    });
  });

  describe('sendAlert', () => {
    test('正常系: 一般アラートを送信して成功レスポンスを返す', async () => {
      const result = await alertService.sendAlert({
        subject: 'Test',
        message: 'Hello',
        severity: 'INFO',
        detail: { foo: 'bar' }
      });

      expect(result).toEqual({
        success: true,
        timestamp: MOCK_TIMESTAMP
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'ALERT:',
        expect.objectContaining({
          subject: 'Test',
          message: 'Hello',
          severity: 'INFO',
          foo: 'bar'
        })
      );
    });

    test('異常系: 通知処理中にエラーが発生した場合はエラーレスポンスを返す', async () => {
      const error = new Error('send error');
      logger.warn.mockImplementationOnce(() => {
        throw error;
      });

      const result = await alertService.sendAlert({ message: 'Hello' });

      expect(result).toEqual({
        success: false,
        error: error.message
      });

      expect(logger.error).toHaveBeenCalledWith('Failed to send alert:', error);
    });
  });

  describe('throttledAlert', () => {
    test('同一キーの連続アラートはスロットリングされる', async () => {
      const key = 'dup';
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const first = await alertService.throttledAlert({
        key,
        subject: 's',
        message: 'm',
        detail: {},
        intervalMinutes: 10
      });

      const second = await alertService.throttledAlert({
        key,
        subject: 's',
        message: 'm',
        detail: {},
        intervalMinutes: 10
      });

      expect(first).toEqual({ success: true, timestamp: new Date(now).toISOString() });
      expect(second).toEqual({ throttled: true });
      Date.now.mockRestore();
    });

    test('エラー時は失敗レスポンスを返す', async () => {
      jest.spyOn(Date, 'now').mockImplementation(() => { throw new Error('bad'); });
      const res = await alertService.throttledAlert({ key: 'x', subject: 's', message: 'm', detail: {}, intervalMinutes: 1 });
      expect(res.success).toBe(false);
      expect(logger.error).toHaveBeenCalled();
      Date.now.mockRestore();
    });
  });
});
