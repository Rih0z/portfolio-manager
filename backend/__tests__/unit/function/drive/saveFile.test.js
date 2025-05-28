/**
 * ファイルパス: __tests__/unit/function/drive/saveFile.test.js
 * 
 * SaveFileハンドラーのユニットテスト
 * ポートフォリオデータのGoogle Driveへの保存機能をテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-23
 */

// テスト対象モジュールのインポート
const saveFileHandler = require('../../../../src/function/drive/saveFile');

// 依存モジュールのインポート
const { getSession, refreshSessionToken } = require('../../../../src/services/googleAuthService');
const { savePortfolioToDrive } = require('../../../../src/services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { parseCookies } = require('../../../../src/utils/cookieParser');

// モックの設定
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/services/googleDriveService');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('../../../../src/utils/cookieParser');

describe('SaveFileHandler', () => {
  // モックデータ
  const mockSessionId = 'test-session-id';
  const mockAccessToken = 'test-access-token';
  const mockFileId = 'test-file-id';
  
  const mockSession = {
    sessionId: mockSessionId,
    googleId: 'google-user-123',
    email: 'user@example.com',
    name: 'Test User',
    accessToken: 'old-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1時間後
  };
  
  const mockPortfolioData = {
    name: 'Test Portfolio',
    holdings: [
      { symbol: 'AAPL', shares: 10, cost: 150.0 },
      { symbol: '7203', shares: 100, cost: 2000.0 }
    ],
    lastUpdated: '2025-05-20T00:00:00Z'
  };
  
  const mockSaveResult = {
    success: true,
    fileId: mockFileId,
    fileName: 'portfolio-data-2025-05-23T00-00-00Z.json',
    webViewLink: 'https://drive.google.com/file/d/test-file-id/view',
    createdTime: '2025-05-23T00:00:00Z',
    modifiedTime: '2025-05-23T00:00:00Z'
  };
  
  // テスト前の準備
  beforeEach(() => {
    jest.clearAllMocks();
    
    // モック関数の実装
    parseCookies.mockReturnValue({ session: mockSessionId });
    getSession.mockResolvedValue(mockSession);
    refreshSessionToken.mockResolvedValue({ accessToken: mockAccessToken, refreshed: false });
    savePortfolioToDrive.mockResolvedValue(mockSaveResult);
    
    formatResponse.mockImplementation(options => ({
      statusCode: options.statusCode || 200,
      body: JSON.stringify({
        success: true,
        data: options.data,
        message: options.message
      }),
      headers: { 'Content-Type': 'application/json' }
    }));
    
    formatErrorResponse.mockImplementation(options => ({
      statusCode: options.statusCode || 500,
      body: JSON.stringify({
        success: false,
        error: { code: options.code, message: options.message }
      }),
      headers: { 'Content-Type': 'application/json' }
    }));
    
    // 現在の日時をモック
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2025-05-23T00:00:00Z');
  });
  
  afterEach(() => {
    // テスト後のクリーンアップ
    if (Date.prototype.toISOString.mockRestore) {
      Date.prototype.toISOString.mockRestore();
    }
  });
  
  describe('ポートフォリオデータの保存', () => {
    test('正常系：新規ポートフォリオを保存して成功レスポンスを返す', async () => {
      // テスト用イベント
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData
        })
      };
      
      // ハンドラーを実行
      const result = await saveFileHandler.handler(mockEvent);
      
      // Cookie解析が呼ばれることを確認
      expect(parseCookies).toHaveBeenCalledWith(mockEvent.headers);
      
      // セッション取得が呼ばれることを確認
      expect(getSession).toHaveBeenCalledWith(mockSessionId);
      
      // トークン更新が呼ばれることを確認
      expect(refreshSessionToken).toHaveBeenCalledWith(mockSessionId);
      
      // ポートフォリオ保存が正しく呼ばれることを確認
      expect(savePortfolioToDrive).toHaveBeenCalledWith(
        mockAccessToken,
        expect.objectContaining({
          name: 'Test Portfolio',
          holdings: expect.any(Array),
          lastUpdated: expect.any(String),
          updatedBy: expect.objectContaining({
            userId: mockSession.googleId,
            email: mockSession.email,
            name: mockSession.name
          })
        }),
        null, // fileId
        true  // createBackup
      );
      
      // 正しいレスポンスが返されることを確認
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 200,
        data: {
          file: expect.objectContaining({
            id: mockFileId,
            name: 'portfolio-data-2025-05-23T00-00-00Z.json',
            url: 'https://drive.google.com/file/d/test-file-id/view',
            createdAt: '2025-05-23T00:00:00Z'
          })
        },
        message: 'ポートフォリオデータをGoogle Driveに保存しました'
      }));
      
      // レスポンスの検証
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.stringContaining('file')
      }));
    });
    
    test('正常系：既存ポートフォリオを更新して成功レスポンスを返す', async () => {
      // テスト用イベント
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData,
          fileId: mockFileId,
          createBackup: true
        })
      };
      
      // ハンドラーを実行
      const result = await saveFileHandler.handler(mockEvent);
      
      // ポートフォリオ保存が正しく呼ばれることを確認
      expect(savePortfolioToDrive).toHaveBeenCalledWith(
        mockAccessToken,
        expect.objectContaining({
          name: 'Test Portfolio'
        }),
        mockFileId, // fileId指定あり
        true       // createBackup
      );
      
      // 正しいレスポンスが返されることを確認
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 200,
        data: {
          file: expect.objectContaining({
            id: mockFileId
          })
        }
      }));
      
      // レスポンスの検証
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200
      }));
    });
    
    test('正常系：バックアップなしで既存ポートフォリオを更新', async () => {
      // テスト用イベント
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData,
          fileId: mockFileId,
          createBackup: false // バックアップなし
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // ポートフォリオ保存が正しく呼ばれることを確認
      expect(savePortfolioToDrive).toHaveBeenCalledWith(
        mockAccessToken,
        expect.any(Object),
        mockFileId,
        false  // createBackupがfalse
      );
    });
  });
  
  describe('エラー処理', () => {
    test('異常系：セッションがない場合はエラーを返す', async () => {
      // セッションなしのモック
      parseCookies.mockReturnValueOnce({});
      
      const mockEvent = {
        headers: {},
        body: JSON.stringify({
          portfolioData: mockPortfolioData
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'NO_SESSION',
        message: 'セッションが存在しません'
      }));
    });
    
    test('異常系：セッションが無効な場合はエラーを返す', async () => {
      // 無効なセッションのモック
      getSession.mockResolvedValueOnce(null);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'セッションが無効です'
      }));
    });
    
    test('異常系：リクエストボディが不正な場合はエラーを返す', async () => {
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: 'invalid json data'
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_REQUEST_BODY',
        message: 'リクエストボディのJSONが不正です'
      }));
    });
    
    test('異常系：ポートフォリオデータが不足している場合はエラーを返す', async () => {
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          // portfolioDataがない
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: 'ポートフォリオデータが不足しています'
      }));
    });
    
    test('異常系：ポートフォリオ名が不足している場合はエラーを返す', async () => {
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: {
            // nameがない
            holdings: []
          }
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_PORTFOLIO_DATA',
        message: 'ポートフォリオ名は必須です'
      }));
    });
    
    test('異常系：トークン更新に失敗した場合はエラーを返す', async () => {
      // トークン更新失敗のモック
      const tokenError = new Error('Token refresh failed');
      refreshSessionToken.mockRejectedValueOnce(tokenError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'TOKEN_REFRESH_ERROR',
        message: 'アクセストークンの更新に失敗しました'
      }));
    });
    
    test('異常系：ポートフォリオ保存に失敗した場合はエラーを返す', async () => {
      // 保存失敗のモック
      const saveError = new Error('Drive save error');
      savePortfolioToDrive.mockRejectedValueOnce(saveError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 500,
        code: 'DRIVE_SAVE_ERROR',
        message: 'Google Driveへの保存に失敗しました'
      }));
    });
    
    test('異常系：容量制限エラーの場合は専用のエラーを返す', async () => {
      // 容量制限エラーのモック
      const quotaError = new Error('quota exceeded');
      savePortfolioToDrive.mockRejectedValueOnce(quotaError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        code: 'QUOTA_EXCEEDED',
        message: 'Google Driveの容量制限を超えました'
      }));
    });
    
    test('異常系：権限エラーの場合は専用のエラーを返す', async () => {
      // 権限エラーのモック
      const permissionError = new Error('Permission denied');
      savePortfolioToDrive.mockRejectedValueOnce(permissionError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        body: JSON.stringify({
          portfolioData: mockPortfolioData
        })
      };
      
      // ハンドラーを実行
      await saveFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        code: 'PERMISSION_DENIED',
        message: 'ファイルへの書き込み権限がありません'
      }));
    });
  });
});
