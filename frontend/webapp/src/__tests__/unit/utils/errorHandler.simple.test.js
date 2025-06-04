/**
 * errorHandler.js の簡潔なユニットテスト
 * 実際の実装に合わせたテスト
 */

import {
  sanitizeError,
  handleApiError,
  setupGlobalErrorHandlers,
  logErrorToService
} from '../../../utils/errorHandler';

describe('errorHandler', () => {
  let consoleErrorSpy;
  let mockEventListeners;

  beforeEach(() => {
    // コンソールエラーをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // イベントリスナーをモック
    mockEventListeners = {};
    global.window = {
      addEventListener: jest.fn((event, handler) => {
        mockEventListeners[event] = handler;
      })
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('sanitizeError', () => {
    it('正常なエラーオブジェクトを処理する', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      
      const result = sanitizeError(error);
      
      expect(result.code).toBe('TEST_ERROR');
      expect(result.userFriendly).toBe(true);
      expect(result.message).toBe('エラーが発生しました。しばらくしてから再度お試しください。');
    });

    it('ネットワークエラーを適切にマッピングする', () => {
      const error = new Error('Network error');
      error.code = 'ECONNREFUSED';
      
      const result = sanitizeError(error);
      
      expect(result.code).toBe('ECONNREFUSED');
      expect(result.message).toBe('サーバーに接続できません。しばらくしてから再度お試しください。');
    });

    it('認証エラーを適切にマッピングする', () => {
      const error = new Error('Auth error');
      error.code = 'UNAUTHORIZED';
      
      const result = sanitizeError(error);
      
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.message).toBe('アクセス権限がありません。');
    });

    it('文字列エラーを処理する', () => {
      const result = sanitizeError('String error message');
      
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.userFriendly).toBe(true);
    });
  });

  describe('handleApiError', () => {
    it('HTTPステータス401を処理する', () => {
      const apiError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };
      
      const result = handleApiError(apiError);
      
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.userFriendly).toBe(true);
    });

    it('HTTPステータス500を処理する', () => {
      const apiError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      };
      
      const result = handleApiError(apiError);
      
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('ネットワークエラーを処理する', () => {
      const error = { message: 'Network Error' };
      
      const result = handleApiError(error);
      
      expect(result.code).toBe('ETIMEDOUT');
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('イベントリスナーを設定する', () => {
      setupGlobalErrorHandlers();
      
      expect(global.window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
      expect(global.window.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });

    it('unhandledrejectionハンドラーが動作する', () => {
      setupGlobalErrorHandlers();
      
      const error = new Error('Promise rejection');
      error.code = 'PROMISE_ERROR';
      
      const mockEvent = {
        reason: error,
        preventDefault: jest.fn()
      };
      
      mockEventListeners['unhandledrejection'](mockEvent);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unhandled promise rejection:',
        'PROMISE_ERROR'
      );
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('errorハンドラーが動作する', () => {
      setupGlobalErrorHandlers();
      
      const error = new Error('Global error');
      error.code = 'GLOBAL_ERROR';
      
      const mockEvent = {
        error: error,
        preventDefault: jest.fn()
      };
      
      mockEventListeners['error'](mockEvent);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Global error:',
        'GLOBAL_ERROR'
      );
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('logErrorToService', () => {
    it('エラーをログ出力する', () => {
      const error = new Error('Boundary error');
      error.code = 'BOUNDARY_ERROR';
      const errorInfo = { componentStack: 'test' };
      
      logErrorToService(error, errorInfo);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error boundary:',
        'BOUNDARY_ERROR'
      );
    });

    it('コードがないエラーを処理する', () => {
      const error = new Error('Error without code');
      const errorInfo = { componentStack: 'test' };
      
      logErrorToService(error, errorInfo);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error boundary:',
        'Error'
      );
    });
  });

  describe('統合テスト', () => {
    it('API→sanitizeErrorの完全フロー', () => {
      const apiError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };
      
      const result = handleApiError(apiError);
      
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('リソースが見つかりません。');
      expect(result.userFriendly).toBe(true);
    });
  });

  describe('エラーケース', () => {
    it('null入力を処理する', () => {
      expect(() => sanitizeError(null)).not.toThrow();
      const result = sanitizeError(null);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('undefined入力を処理する', () => {
      expect(() => sanitizeError(undefined)).not.toThrow();
      const result = sanitizeError(undefined);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('空オブジェクト入力を処理する', () => {
      const result = sanitizeError({});
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.userFriendly).toBe(true);
    });
  });
});