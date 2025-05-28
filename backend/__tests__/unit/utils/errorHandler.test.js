/**
 * ファイルパス: __tests__/unit/utils/errorHandler.test.js
 * 
 * エラーハンドリングユーティリティのユニットテスト
 * アプリケーション全体で使用されるエラー処理メカニズムのテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-18
 */

// テスト対象モジュールのインポート
const errorHandler = require('../../../src/utils/errorHandler');

// 依存モジュールのインポート
const logger = require('../../../src/utils/logger');
const alertService = require('../../../src/services/alerts');
const { ERROR_CODES } = require('../../../src/config/constants');

// モジュールのモック化
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/alerts');

describe('Error Handler Utility', () => {
  // テスト前の準備
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // alertService.notifyError のモック実装
    alertService.notifyError.mockResolvedValue({ success: true });
  });

  describe('handleError', () => {
    test('一般的なエラーを正しく処理する', async () => {
      // テスト用データ
      const error = new Error('テストエラー');
      const type = errorHandler.errorTypes.SERVER_ERROR;
      const context = { requestId: 'test-request-id', path: '/api/test' };
      
      // 関数の実行
      const result = await errorHandler.handleError(error, type, context);
      
      // ロガーが呼ばれたことを検証
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`${type} Error Occurred`),
        expect.any(Error),
        expect.objectContaining({
          requestId: 'test-request-id'
        })
      );
      
      // アラートが呼ばれないことを検証（一般的なエラーの場合）
      expect(alertService.notifyError).not.toHaveBeenCalled();
      
      // 戻り値の検証
      expect(result).toEqual(expect.objectContaining({
        code: ERROR_CODES.SERVER_ERROR,
        message: 'テストエラー',
        type: errorHandler.errorTypes.SERVER_ERROR,
        requestId: 'test-request-id'
      }));
    });

    test('重大なエラーを処理しアラートを送信する', async () => {
      // テスト用データ
      const error = new Error('重大なエラー');
      const type = errorHandler.errorTypes.CRITICAL_ERROR;
      const context = { requestId: 'critical-request-id', path: '/api/critical' };
      
      // 関数の実行
      const result = await errorHandler.handleError(error, type, context);
      
      // ロガーが呼ばれたことを検証
      expect(logger.critical).toHaveBeenCalledWith(
        expect.stringContaining(`${type} Error Occurred`),
        expect.any(Error),
        expect.objectContaining({
          requestId: 'critical-request-id'
        })
      );
      
      // アラートが呼ばれたことを検証
      expect(alertService.notifyError).toHaveBeenCalledWith(
        expect.stringContaining(`${type} Error Occurred`),
        error,
        expect.objectContaining({
          requestId: 'critical-request-id',
          errorInfo: expect.any(Object)
        })
      );
      
      // 戻り値の検証
      expect(result).toEqual(expect.objectContaining({
        message: '重大なエラー',
        type: errorHandler.errorTypes.CRITICAL_ERROR,
        requestId: 'critical-request-id'
      }));
    });

    test('データソースエラーでアラートを送信する', async () => {
      // テスト用データ
      const error = new Error('データソースエラー');
      const type = errorHandler.errorTypes.DATA_SOURCE_ERROR;
      const context = { source: 'yahoo-finance', symbol: 'AAPL' };
      
      // 関数の実行
      await errorHandler.handleError(error, type, context);
      
      // アラートが呼ばれたことを検証
      expect(alertService.notifyError).toHaveBeenCalledWith(
        expect.stringContaining(`${type} Error Occurred`),
        error,
        expect.objectContaining({
          source: 'yahoo-finance',
          symbol: 'AAPL'
        })
      );
    });

    test('alert=true フラグが指定された場合にアラートを送信する', async () => {
      // テスト用データ
      const error = new Error('通知が必要なエラー');
      const type = errorHandler.errorTypes.CACHE_ERROR;
      const context = { alert: true, key: 'test-cache-key' };
      
      // 関数の実行
      await errorHandler.handleError(error, type, context);
      
      // アラートが呼ばれたことを検証
      expect(alertService.notifyError).toHaveBeenCalledWith(
        expect.stringContaining(`${type} Error Occurred`),
        error,
        expect.objectContaining({
          alert: true,
          key: 'test-cache-key'
        })
      );
    });

    test('アラート送信でエラーが発生した場合に処理を継続する', async () => {
      // テスト用データ
      const error = new Error('重大なエラー');
      const type = errorHandler.errorTypes.CRITICAL_ERROR;
      
      // アラート送信でエラーが発生するようモック
      alertService.notifyError.mockRejectedValueOnce(new Error('アラート送信失敗'));
      
      // 関数の実行
      const result = await errorHandler.handleError(error, type);
      
      // エラーが発生してもハンドラー関数が完了することを検証
      expect(result).toBeDefined();
      expect(result.type).toBe(errorHandler.errorTypes.CRITICAL_ERROR);
      
      // ロガーが呼ばれたことを検証（アラートエラーのログ）
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Alert notification failed'),
        expect.any(Error)
      );
    });
  });

  describe('createErrorResponse', () => {
    test('適切なステータスコードとエラー情報でレスポンスを生成する', async () => {
      // テスト用データ
      const error = new Error('テストエラー');
      const type = errorHandler.errorTypes.VALIDATION_ERROR;
      
      // 関数の実行
      const response = await errorHandler.createErrorResponse(error, type);
      
      // レスポンスの検証
      expect(response).toEqual({
        statusCode: errorHandler.statusCodes[type],
        body: expect.stringContaining('"success":false'),
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      });
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'テストエラー'
        }
      });
    });

    test('カスタムステータスコードを適用する', async () => {
      // テスト用データ
      const error = new Error('カスタムエラー');
      const type = errorHandler.errorTypes.DATA_SOURCE_ERROR;
      const context = { statusCode: 418 }; // I'm a teapot
      
      // 関数の実行
      const response = await errorHandler.createErrorResponse(error, type, context);
      
      // カスタムステータスコードが適用されていることを検証
      expect(response.statusCode).toBe(418);
    });

    test('追加のコンテキスト情報をレスポンスに含める', async () => {
      // テスト用データ
      const error = new Error('レート制限エラー');
      const type = errorHandler.errorTypes.RATE_LIMIT_ERROR;
      const context = {
        retryAfter: 60,
        usage: { current: 100, limit: 100 },
        requestId: 'rate-limit-request',
        includeDetails: true,
        details: 'API呼び出し制限に達しました'
      };
      
      // 関数の実行
      const response = await errorHandler.createErrorResponse(error, type, context);
      
      // ヘッダーにRetry-Afterが含まれていることを検証
      expect(response.headers['Retry-After']).toBe('60');
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body.error).toEqual(expect.objectContaining({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'レート制限エラー',
        details: 'API呼び出し制限に達しました',
        retryAfter: 60,
        usage: { current: 100, limit: 100 },
        requestId: 'rate-limit-request'
      }));
    });
  });

  describe('特定のエラー作成関数', () => {
    test('createSymbolNotFoundError - シンボルが見つからないエラーを生成する', async () => {
      // 関数の実行
      const response = await errorHandler.createSymbolNotFoundError('AAPL');
      
      // レスポンスの検証
      expect(response.statusCode).toBe(404);
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('SYMBOL_NOT_FOUND');
      expect(body.error.message).toContain('AAPL');
    });

    test('createValidationError - バリデーションエラーを生成する', async () => {
      // テスト用データ
      const errors = ['パラメータが不足しています', '無効な値です'];
      
      // 関数の実行
      const response = await errorHandler.createValidationError(errors);
      
      // レスポンスの検証
      expect(response.statusCode).toBe(400);
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PARAMS');
      expect(body.error.message).toContain('パラメータが不足しています');
      expect(body.error.message).toContain('無効な値です');
    });

    test('createAuthError - 認証エラーを生成する', async () => {
      // 関数の実行
      const response = await errorHandler.createAuthError('無効なセッション');
      
      // レスポンスの検証
      expect(response.statusCode).toBe(401);
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('無効なセッション');
    });

    test('createRateLimitError - レート制限エラーを生成する', async () => {
      // テスト用データ
      const usage = { current: 100, limit: 100, reset: Date.now() + 60000 };
      
      // 関数の実行
      const response = await errorHandler.createRateLimitError(usage, 30);
      
      // レスポンスの検証
      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBe('30');
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.retryAfter).toBe(30);
      expect(body.error.usage).toEqual(usage);
    });

    test('createBudgetLimitError - バジェット制限エラーを生成する', async () => {
      // テスト用データ
      const usage = { budget: { used: 1000, limit: 1000 } };
      
      // 関数の実行
      const response = await errorHandler.createBudgetLimitError(usage);
      
      // レスポンスの検証
      expect(response.statusCode).toBe(403);
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BUDGET_LIMIT_EXCEEDED');
      expect(body.error.usage).toEqual(usage);
    });

    test('createServerError - サーバーエラーを生成する', async () => {
      // 関数の実行
      const response = await errorHandler.createServerError('内部エラーが発生しました', 'test-req-id');
      
      // レスポンスの検証
      expect(response.statusCode).toBe(500);
      
      // JSON応答の検証
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('内部エラーが発生しました');
      expect(body.error.requestId).toBe('test-req-id');
    });
  });
});
