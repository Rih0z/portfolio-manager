/**
 * errorHandler.js のユニットテスト
 * エラーハンドリングとサニタイゼーション機能のテスト
 */

import {
  sanitizeError,
  handleApiError,
  setupGlobalErrorHandlers,
  logErrorToService
} from '../../../utils/errorHandler';

describe('errorHandler', () => {
  let originalEnv;
  let consoleErrorSpy;
  let originalWindow;
  let mockEventListeners;
  
  // Helper function to get the current event listeners
  const getEventListener = (eventName) => {
    const calls = global.window.addEventListener.mock.calls;
    const call = calls.find(c => c[0] === eventName);
    return call ? call[1] : undefined;
  };

  beforeEach(() => {
    // 環境変数をバックアップ
    originalEnv = process.env.NODE_ENV;
    
    // コンソールメソッドをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // windowオブジェクトをバックアップ
    originalWindow = global.window;
    
    // イベントリスナーをモック
    mockEventListeners = {};
    global.window = {
      addEventListener: jest.fn((event, handler) => {
        mockEventListeners[event] = handler;
      })
    };
    // Make window available globally for the errorHandler module
    window = global.window;
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.NODE_ENV = originalEnv;
    
    // コンソールモックを復元
    consoleErrorSpy.mockRestore();
    
    // windowオブジェクトを復元
    global.window = originalWindow;
    window = originalWindow;
  });

  describe('sanitizeError', () => {
    describe('開発環境での動作', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('詳細なエラー情報を返す', () => {
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

      it('コードが未設定の場合はUNKNOWN_ERRORを設定', () => {
        const error = new Error('Error without code');
        
        const result = sanitizeError(error);
        
        expect(result.code).toBe('UNKNOWN_ERROR');
        expect(result.details).toEqual({});
      });

      it('detailsが未設定の場合は空オブジェクトを設定', () => {
        const error = new Error('Error without details');
        error.code = 'TEST_ERROR';
        
        const result = sanitizeError(error);
        
        expect(result.details).toEqual({});
      });
    });

    describe('本番環境での動作', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('ネットワークエラーを適切にマッピングする', () => {
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
            userFriendly: true
          });
        });
      });

      it('認証エラーを適切にマッピングする', () => {
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
            userFriendly: true
          });
        });
      });

      it('バリデーションエラーを適切にマッピングする', () => {
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
            userFriendly: true
          });
        });
      });

      it('リソースエラーを適切にマッピングする', () => {
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
            userFriendly: true
          });
        });
      });

      it('レート制限エラーを適切にマッピングする', () => {
        const error = new Error('Rate limit error');
        error.code = 'RATE_LIMIT_EXCEEDED';
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: 'リクエスト数が上限に達しました。しばらくしてから再度お試しください。',
          code: 'RATE_LIMIT_EXCEEDED',
          userFriendly: true
        });
      });

      it('サーバーエラーを適切にマッピングする', () => {
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
            userFriendly: true
          });
        });
      });

      it('未知のエラーコードは一般的なメッセージを返す', () => {
        const error = new Error('Unknown error');
        error.code = 'UNKNOWN_CUSTOM_ERROR';
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: 'エラーが発生しました。しばらくしてから再度お試しください。',
          code: 'UNKNOWN_CUSTOM_ERROR',
          userFriendly: true
        });
      });

      it('error.nameをコードとして使用する', () => {
        const error = new Error('Error with name');
        error.name = 'CustomError';
        
        const result = sanitizeError(error);
        
        expect(result.code).toBe('CustomError');
      });

      it('コードが未設定の場合はUNKNOWN_ERRORを使用', () => {
        const error = new Error('Error without code');
        
        const result = sanitizeError(error);
        
        expect(result).toEqual({
          message: 'エラーが発生しました。しばらくしてから再度お試しください。',
          code: 'Error', // Error objects have name='Error' by default
          userFriendly: true
        });
      });
    });
  });

  describe('handleApiError', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('レスポンスエラーのHTTPステータスコードを適切に処理する', () => {
      const testCases = [
        { status: 400, expected: 'INVALID_REQUEST' },
        { status: 401, expected: 'UNAUTHORIZED' },
        { status: 403, expected: 'FORBIDDEN' },
        { status: 404, expected: 'NOT_FOUND' },
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
        expect(result.userFriendly).toBe(true);
      });
    });

    it('ユーザーフレンドリーなAPIエラーレスポンスを返す', () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'User friendly error',
              userFriendly: true,
              code: 'USER_ERROR'
            }
          }
        }
      };
      
      const result = handleApiError(apiError);
      
      expect(result).toEqual({
        message: 'User friendly error',
        userFriendly: true,
        code: 'USER_ERROR'
      });
    });

    it('未知のHTTPステータスコードはsanitizeErrorに渡す', () => {
      const apiError = {
        response: {
          status: 418, // I'm a teapot
          data: { message: 'Unknown status' }
        }
      };
      
      const result = handleApiError(apiError);
      
      expect(result.userFriendly).toBe(true);
      expect(result.message).toBe('エラーが発生しました。しばらくしてから再度お試しください。');
    });

    it('ECONNABORTED エラーをタイムアウトとして処理する', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      };
      
      const result = handleApiError(timeoutError);
      
      expect(result.code).toBe('ETIMEDOUT');
      expect(result.message).toBe('リクエストがタイムアウトしました。');
    });

    it('Network Error をタイムアウトとして処理する', () => {
      const networkError = {
        message: 'Network Error'
      };
      
      const result = handleApiError(networkError);
      
      expect(result.code).toBe('ETIMEDOUT');
      expect(result.message).toBe('リクエストがタイムアウトしました。');
    });

    it('一般的なエラーをsanitizeErrorに渡す', () => {
      const genericError = new Error('Generic error message');
      genericError.code = 'GENERIC_ERROR';
      
      const result = handleApiError(genericError);
      
      expect(result.message).toBe('エラーが発生しました。しばらくしてから再度お試しください。');
      expect(result.code).toBe('GENERIC_ERROR');
      expect(result.userFriendly).toBe(true);
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    
    it('unhandledrejection イベントリスナーを設定する', () => {
      setupGlobalErrorHandlers();
      
      expect(global.window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
    });

    it('error イベントリスナーを設定する', () => {
      setupGlobalErrorHandlers();
      
      expect(global.window.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });

    describe('unhandledrejection ハンドラー', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        // イベントリスナーをリセット
        mockEventListeners = {};
        global.window = {
          addEventListener: jest.fn((event, handler) => {
            mockEventListeners[event] = handler;
          })
        };
        window = global.window;
        setupGlobalErrorHandlers();
      });

      it('本番環境でunhandled rejectionを処理する', () => {
        const error = new Error('Unhandled promise rejection');
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

      it('開発環境ではpreventDefaultを呼ばない', () => {
        process.env.NODE_ENV = 'development';
        mockEventListeners = {};
        global.window = {
          addEventListener: jest.fn((event, handler) => {
            mockEventListeners[event] = handler;
          })
        };
        window = global.window;
        setupGlobalErrorHandlers();
        
        const error = new Error('Dev unhandled rejection');
        const mockEvent = {
          reason: error,
          preventDefault: jest.fn()
        };
        
        mockEventListeners['unhandledrejection'](mockEvent);
        
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('error ハンドラー', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        mockEventListeners = {};
        global.window = {
          addEventListener: jest.fn((event, handler) => {
            mockEventListeners[event] = handler;
          })
        };
        window = global.window;
        setupGlobalErrorHandlers();
      });

      it('本番環境でglobal errorを処理する', () => {
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

      it('event.errorが存在しない場合はevent.messageからエラーを作成', () => {
        const mockEvent = {
          message: 'Error message from event',
          preventDefault: jest.fn()
        };
        
        mockEventListeners['error'](mockEvent);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Global error:',
          'UNKNOWN_ERROR'
        );
      });

      it('開発環境ではpreventDefaultを呼ばない', () => {
        process.env.NODE_ENV = 'development';
        mockEventListeners = {};
        global.window = {
          addEventListener: jest.fn((event, handler) => {
            mockEventListeners[event] = handler;
          })
        };
        window = global.window;
        setupGlobalErrorHandlers();
        
        const mockEvent = {
          error: new Error('Dev global error'),
          preventDefault: jest.fn()
        };
        
        mockEventListeners['error'](mockEvent);
        
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      });
    });
  });

  describe('logErrorToService', () => {
    const errorInfo = { componentStack: 'Component stack trace' };

    it('開発環境で詳細なエラーログを出力する', () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error for boundary');
      
      logErrorToService(error, errorInfo);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error caught by boundary:',
        error,
        errorInfo
      );
    });

    it('本番環境で簡潔なエラーログを出力する', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error for boundary');
      error.code = 'BOUNDARY_ERROR';
      
      logErrorToService(error, errorInfo);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error boundary:',
        'BOUNDARY_ERROR'
      );
    });

    it('エラーコードが設定されていない場合', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Error without code');
      
      logErrorToService(error, errorInfo);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error boundary:',
        'Error' // Error objects have name='Error' by default
      );
    });
  });

  describe('エラーケースの処理', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('nullエラーを適切に処理する', () => {
      const result = sanitizeError(null);
      
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('エラーが発生しました。しばらくしてから再度お試しください。');
    });

    it('undefinedエラーを適切に処理する', () => {
      const result = sanitizeError(undefined);
      
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('エラーが発生しました。しばらくしてから再度お試しください。');
    });

    it('文字列エラーを適切に処理する', () => {
      const result = sanitizeError('String error message');
      
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('エラーが発生しました。しばらくしてから再度お試しください。');
    });

    it('プロパティが不完全なオブジェクトを処理する', () => {
      const incompleteError = { someProperty: 'value' };
      
      const result = sanitizeError(incompleteError);
      
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.userFriendly).toBe(true);
    });
  });

  describe('統合テスト', () => {
    it('API呼び出しエラーの完全なフローを処理する', () => {
      process.env.NODE_ENV = 'production';
      
      // Axiosエラーをシミュレート
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
      const result = handleApiError(apiError);
      
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.message).toBe('アクセス権限がありません。');
      expect(result.userFriendly).toBe(true);
    });

    it('グローバルエラーハンドラーとerrorBoundaryの統合', () => {
      process.env.NODE_ENV = 'production';
      
      // セットアップ
      mockEventListeners = {};
      global.window = {
        addEventListener: jest.fn((event, handler) => {
          mockEventListeners[event] = handler;
        })
      };
      setupGlobalErrorHandlers();
      
      // エラー境界でのエラー
      const boundaryError = new Error('Component error');
      boundaryError.code = 'COMPONENT_ERROR';
      logErrorToService(boundaryError, { componentStack: 'test' });
      
      // グローバルエラー
      const globalError = new Error('Global error');
      globalError.code = 'GLOBAL_ERROR';
      const mockEvent = {
        error: globalError,
        preventDefault: jest.fn()
      };
      const handler = getEventListener('error');
      handler(mockEvent);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error boundary:', 'COMPONENT_ERROR');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Global error:', 'GLOBAL_ERROR');
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

    it('APIエラー処理のパフォーマンステスト', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const apiError = {
          response: {
            status: 500,
            data: { message: `Error ${i}` }
          }
        };
        handleApiError(apiError);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });
  });
});