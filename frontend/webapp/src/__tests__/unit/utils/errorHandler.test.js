/**
 * errorHandler.js のユニットテスト
 * エラーハンドリングとサニタイゼーション機能のテスト
 */

import {
  sanitizeError,
  handleApiError,
  createError,
  logError,
  ErrorReporter,
  NetworkError,
  ValidationError,
  AuthenticationError,
  RateLimitError
} from '../../../utils/errorHandler';

describe('errorHandler', () => {
  let originalEnv;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // 環境変数をバックアップ
    originalEnv = process.env.NODE_ENV;
    
    // コンソールメソッドをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.NODE_ENV = originalEnv;
    
    // コンソールモックを復元
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('sanitizeError', () => {
    it('開発環境では詳細なエラー情報を返す', () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Detailed error message');
      error.code = 'TEST_ERROR';
      error.stack = 'Error stack trace';
      error.details = { context: 'test' };
      
      const result = sanitizeError(error);
      
      expect(result).toEqual({
        message: 'Detailed error message',
        code: 'TEST_ERROR',
        stack: 'Error stack trace',
        details: { context: 'test' }
      });
    });

    it('開発環境でコードが未設定の場合はUNKNOWN_ERRORを設定', () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Error without code');
      
      const result = sanitizeError(error);
      
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.details).toEqual({});
    });

    it('本番環境でネットワークエラーを適切にマッピングする', () => {
      process.env.NODE_ENV = 'production';
      
      const networkErrors = [
        { code: 'ECONNREFUSED', expected: 'サーバーに接続できません。しばらくしてから再度お試しください。' },
        { code: 'ETIMEDOUT', expected: 'リクエストがタイムアウトしました。' },
        { code: 'ENETUNREACH', expected: 'ネットワークに接続できません。' }
      ];
      
      networkErrors.forEach(({ code, expected }) => {
        const error = new Error('Network error');
        error.code = code;
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: expected,
          code: code,
          safe: true
        });
      });
    });

    it('本番環境で認証エラーを適切にマッピングする', () => {
      process.env.NODE_ENV = 'production';
      
      const authErrors = [
        { code: 'AUTH_FAILED', expected: 'ログインに失敗しました。' },
        { code: 'UNAUTHORIZED', expected: 'アクセス権限がありません。' },
        { code: 'FORBIDDEN', expected: 'このリソースへのアクセスは禁止されています。' },
        { code: 'SESSION_EXPIRED', expected: 'セッションの有効期限が切れました。再度ログインしてください。' }
      ];
      
      authErrors.forEach(({ code, expected }) => {
        const error = new Error('Auth error');
        error.code = code;
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: expected,
          code: code,
          safe: true
        });
      });
    });

    it('本番環境でバリデーションエラーを適切にマッピングする', () => {
      process.env.NODE_ENV = 'production';
      
      const validationErrors = [
        { code: 'VALIDATION_ERROR', expected: '入力内容に誤りがあります。' },
        { code: 'INVALID_REQUEST', expected: '無効なリクエストです。' }
      ];
      
      validationErrors.forEach(({ code, expected }) => {
        const error = new Error('Validation error');
        error.code = code;
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: expected,
          code: code,
          safe: true
        });
      });
    });

    it('本番環境でリソースエラーを適切にマッピングする', () => {
      process.env.NODE_ENV = 'production';
      
      const resourceErrors = [
        { code: 'NOT_FOUND', expected: 'リソースが見つかりません。' },
        { code: 'RESOURCE_CONFLICT', expected: 'リソースの競合が発生しました。' }
      ];
      
      resourceErrors.forEach(({ code, expected }) => {
        const error = new Error('Resource error');
        error.code = code;
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: expected,
          code: code,
          safe: true
        });
      });
    });

    it('本番環境でレート制限エラーを適切にマッピングする', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Rate limit error');
      error.code = 'RATE_LIMIT_EXCEEDED';
      
      const result = sanitizeError(error);
      
      expect(result).toEqual({
        message: 'リクエスト数が上限に達しました。しばらくしてから再度お試しください。',
        code: 'RATE_LIMIT_EXCEEDED',
        safe: true
      });
    });

    it('本番環境でサーバーエラーを適切にマッピングする', () => {
      process.env.NODE_ENV = 'production';
      
      const serverErrors = [
        { code: 'INTERNAL_SERVER_ERROR', expected: 'サーバーエラーが発生しました。' },
        { code: 'SERVICE_UNAVAILABLE', expected: 'サービスが一時的に利用できません。' }
      ];
      
      serverErrors.forEach(({ code, expected }) => {
        const error = new Error('Server error');
        error.code = code;
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: expected,
          code: code,
          safe: true
        });
      });
    });

    it('本番環境で未知のエラーコードは一般的なメッセージを返す', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Unknown error');
      error.code = 'UNKNOWN_CUSTOM_ERROR';
      
      const result = sanitizeError(error);
      
      expect(result).toEqual({
        message: '予期しないエラーが発生しました。',
        code: 'UNKNOWN_CUSTOM_ERROR',
        safe: true
      });
    });

    it('本番環境でコードが未設定の場合は一般的なメッセージを返す', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Error without code');
      
      const result = sanitizeError(error);
      
      expect(result).toEqual({
        message: '予期しないエラーが発生しました。',
        code: 'UNKNOWN_ERROR',
        safe: true
      });
    });
  });

  describe('handleApiError', () => {
    it('HTTPステータスコードを適切に処理する', () => {
      const testCases = [
        { status: 400, expected: 'INVALID_REQUEST' },
        { status: 401, expected: 'UNAUTHORIZED' },
        { status: 403, expected: 'FORBIDDEN' },
        { status: 404, expected: 'NOT_FOUND' },
        { status: 409, expected: 'RESOURCE_CONFLICT' },
        { status: 429, expected: 'RATE_LIMIT_EXCEEDED' },
        { status: 500, expected: 'INTERNAL_SERVER_ERROR' },
        { status: 503, expected: 'SERVICE_UNAVAILABLE' }
      ];
      
      testCases.forEach(({ status, expected }) => {
        const apiError = {
          response: {
            status: status,
            data: { message: 'API error message' }
          }
        };
        
        const result = handleApiError(apiError);
        
        expect(result.code).toBe(expected);
      });
    });

    it('ネットワークエラーを適切に処理する', () => {
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      };
      
      const result = handleApiError(networkError);
      
      expect(result.code).toBe('ECONNREFUSED');
      expect(result.isNetworkError).toBe(true);
    });

    it('タイムアウトエラーを適切に処理する', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      };
      
      const result = handleApiError(timeoutError);
      
      expect(result.code).toBe('ETIMEDOUT');
      expect(result.isTimeout).toBe(true);
    });

    it('レスポンスデータからエラー情報を抽出する', () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: { field: 'email' }
          }
        }
      };
      
      const result = handleApiError(apiError);
      
      expect(result.serverMessage).toBe('Validation failed');
      expect(result.details).toEqual({ field: 'email' });
    });

    it('一般的なエラーオブジェクトを適切に処理する', () => {
      const genericError = new Error('Generic error message');
      
      const result = handleApiError(genericError);
      
      expect(result.message).toBe('Generic error message');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('createError', () => {
    it('指定されたコードとメッセージでエラーを作成する', () => {
      const error = createError('TEST_ERROR', 'Test error message', { context: 'test' });
      
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ context: 'test' });
    });

    it('詳細情報なしでエラーを作成する', () => {
      const error = createError('SIMPLE_ERROR', 'Simple message');
      
      expect(error.message).toBe('Simple message');
      expect(error.code).toBe('SIMPLE_ERROR');
      expect(error.details).toBeUndefined();
    });
  });

  describe('logError', () => {
    it('開発環境では詳細なエラーログを出力する', () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      
      logError(error, 'test-context');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] test-context:',
        expect.objectContaining({
          message: 'Test error',
          code: 'TEST_ERROR'
        })
      );
    });

    it('本番環境では簡潔なエラーログを出力する', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      
      logError(error, 'test-context');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] test-context: TEST_ERROR'
      );
    });

    it('コンテキストなしでもエラーログを出力する', () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error without context');
      
      logError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] unknown:',
        expect.objectContaining({
          message: 'Test error without context'
        })
      );
    });
  });

  describe('ErrorReporter', () => {
    it('エラーを報告できる', () => {
      const error = new Error('Reportable error');
      
      const result = ErrorReporter.report(error, 'user-action');
      
      expect(result.reported).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.context).toBe('user-action');
    });

    it('エラー統計を追跡できる', () => {
      ErrorReporter.clearStats();
      
      const error1 = new Error('Error 1');
      error1.code = 'ERROR_TYPE_1';
      
      const error2 = new Error('Error 2');
      error2.code = 'ERROR_TYPE_2';
      
      const error3 = new Error('Error 3');
      error3.code = 'ERROR_TYPE_1';
      
      ErrorReporter.report(error1);
      ErrorReporter.report(error2);
      ErrorReporter.report(error3);
      
      const stats = ErrorReporter.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byCode['ERROR_TYPE_1']).toBe(2);
      expect(stats.byCode['ERROR_TYPE_2']).toBe(1);
    });

    it('統計をクリアできる', () => {
      ErrorReporter.report(new Error('Test error'));
      
      expect(ErrorReporter.getStats().total).toBeGreaterThan(0);
      
      ErrorReporter.clearStats();
      
      expect(ErrorReporter.getStats().total).toBe(0);
    });
  });

  describe('カスタムエラークラス', () => {
    it('NetworkErrorが正しく動作する', () => {
      const error = new NetworkError('Connection failed', 'ECONNREFUSED');
      
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('ECONNREFUSED');
      expect(error.isNetworkError).toBe(true);
    });

    it('ValidationErrorが正しく動作する', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('AuthenticationErrorが正しく動作する', () => {
      const error = new AuthenticationError('Login failed');
      
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Login failed');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.isAuthError).toBe(true);
    });

    it('RateLimitErrorが正しく動作する', () => {
      const error = new RateLimitError('Too many requests', 60);
      
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('エラーケース', () => {
    it('nullエラーを適切に処理する', () => {
      const result = sanitizeError(null);
      
      expect(result.message).toContain('予期しないエラー');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('undefinedエラーを適切に処理する', () => {
      const result = sanitizeError(undefined);
      
      expect(result.message).toContain('予期しないエラー');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('文字列エラーを適切に処理する', () => {
      const result = sanitizeError('String error message');
      
      expect(result.message).toContain('String error message');
    });

    it('オブジェクトエラーを適切に処理する', () => {
      const errorObj = {
        message: 'Object error',
        code: 'OBJECT_ERROR'
      };
      
      const result = sanitizeError(errorObj);
      
      expect(result.message).toBe('Object error');
      expect(result.code).toBe('OBJECT_ERROR');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のエラー処理を効率的に実行する', () => {
      process.env.NODE_ENV = 'production';
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const error = new Error(`Error ${i}`);
        error.code = 'PERFORMANCE_TEST';
        sanitizeError(error);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });

    it('ErrorReporterのパフォーマンステスト', () => {
      ErrorReporter.clearStats();
      
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const error = new Error(`Performance test ${i}`);
        error.code = `ERROR_${i % 10}`;
        ErrorReporter.report(error);
      }
      
      const endTime = Date.now();
      const stats = ErrorReporter.getStats();
      
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
      expect(stats.total).toBe(100);
    });
  });

  describe('統合テスト', () => {
    it('API呼び出しエラーの完全なフローを処理する', () => {
      process.env.NODE_ENV = 'production';
      
      // API呼び出しエラーをシミュレート
      const apiError = {
        response: {
          status: 401,
          data: {
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
          }
        }
      };
      
      // エラーを処理
      const processedError = handleApiError(apiError);
      const sanitizedError = sanitizeError(processedError);
      ErrorReporter.report(processedError, 'api-call');
      
      expect(processedError.code).toBe('UNAUTHORIZED');
      expect(sanitizedError.message).toBe('アクセス権限がありません。');
      expect(sanitizedError.safe).toBe(true);
      
      const stats = ErrorReporter.getStats();
      expect(stats.byCode['UNAUTHORIZED']).toBeGreaterThan(0);
    });
  });
});