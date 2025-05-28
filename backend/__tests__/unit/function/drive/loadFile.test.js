/**
 * ファイルパス: __tests__/unit/function/drive/loadFile.test.js
 * 
 * LoadFileハンドラーのユニットテスト
 * ポートフォリオデータのGoogle Driveからの読み込み機能をテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-23
 */

// テスト対象モジュールのインポート
const loadFileHandler = require('../../../../src/function/drive/loadFile');

// 依存モジュールのインポート
const { getSession, refreshSessionToken } = require('../../../../src/services/googleAuthService');
const { loadPortfolioFromDrive, getPortfolioVersionHistory } = require('../../../../src/services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { parseCookies } = require('../../../../src/utils/cookieParser');

// モックの設定
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/services/googleDriveService');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('../../../../src/utils/cookieParser');

describe('LoadFileHandler', () => {
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
  
  const mockLoadResult = {
    success: true,
    data: mockPortfolioData,
    fileName: 'portfolio-data-2025-05-20T00-00-00Z.json',
    fileId: mockFileId,
    createdTime: '2025-05-20T00:00:00Z',
    modifiedTime: '2025-05-20T00:00:00Z',
    webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
  };
  
  const mockVersionHistory = [
    {
      id: 'version-1',
      name: 'portfolio-data-2025-05-10T00-00-00Z.json.bak',
      createdTime: '2025-05-10T00:00:00Z'
    },
    {
      id: 'version-2',
      name: 'portfolio-data-2025-05-15T00-00-00Z.json.bak',
      createdTime: '2025-05-15T00:00:00Z'
    }
  ];
  
  // テスト前の準備
  beforeEach(() => {
    jest.clearAllMocks();
    
    // モック関数の実装
    parseCookies.mockReturnValue({ session: mockSessionId });
    getSession.mockResolvedValue(mockSession);
    refreshSessionToken.mockResolvedValue({ accessToken: mockAccessToken, refreshed: false });
    loadPortfolioFromDrive.mockResolvedValue(mockLoadResult);
    getPortfolioVersionHistory.mockResolvedValue(mockVersionHistory);
    
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
  });
  
  afterEach(() => {
    // テスト後のクリーンアップ
  });
  
  describe('ポートフォリオデータの読み込み', () => {
    test('正常系：ファイルを読み込んで成功レスポンスを返す', async () => {
      // テスト用イベント
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      // ハンドラーを実行
      const result = await loadFileHandler.handler(mockEvent);
      
      // Cookie解析が呼ばれることを確認
      expect(parseCookies).toHaveBeenCalledWith(mockEvent.headers);
      
      // セッション取得が呼ばれることを確認
      expect(getSession).toHaveBeenCalledWith(mockSessionId);
      
      // トークン更新が呼ばれることを確認
      expect(refreshSessionToken).toHaveBeenCalledWith(mockSessionId);
      
      // ポートフォリオ読み込みが呼ばれることを確認
      expect(loadPortfolioFromDrive).toHaveBeenCalledWith(mockAccessToken, mockFileId);
      
      // バージョン履歴取得は呼ばれないことを確認
      expect(getPortfolioVersionHistory).not.toHaveBeenCalled();
      
      // 正しいレスポンスが返されることを確認
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 200,
        data: {
          file: expect.objectContaining({
            id: mockFileId,
            name: 'portfolio-data-2025-05-20T00-00-00Z.json',
            createdAt: '2025-05-20T00:00:00Z',
            modifiedAt: '2025-05-20T00:00:00Z',
            webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
          }),
          data: mockPortfolioData
        },
        message: 'ポートフォリオデータをGoogle Driveから読み込みました'
      }));
      
      // レスポンスの検証
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.stringContaining('file')
      }));
    });
    
    test('正常系：バージョン履歴を含めて読み込む', async () => {
      // テスト用イベント（バージョン履歴を含める）
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId,
          includeHistory: 'true'
        }
      };
      
      // ハンドラーを実行
      const result = await loadFileHandler.handler(mockEvent);
      
      // ポートフォリオ読み込みが呼ばれることを確認
      expect(loadPortfolioFromDrive).toHaveBeenCalledWith(mockAccessToken, mockFileId);
      
      // バージョン履歴取得が呼ばれることを確認
      expect(getPortfolioVersionHistory).toHaveBeenCalledWith(mockFileId, mockAccessToken);
      
      // 正しいレスポンスが返されることを確認
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          file: expect.any(Object),
          data: mockPortfolioData,
          versions: expect.arrayContaining([
            expect.objectContaining({
              id: 'version-1',
              name: expect.any(String),
              createdAt: expect.any(String)
            }),
            expect.objectContaining({
              id: 'version-2',
              name: expect.any(String),
              createdAt: expect.any(String)
            })
          ])
        })
      }));
      
      // バージョン履歴が含まれることを確認
      expect(result.body).toContain('versions');
    });
    
    test('正常系：バージョン履歴取得に失敗しても本体データは返す', async () => {
      // バージョン履歴取得失敗のモック
      const historyError = new Error('History error');
      getPortfolioVersionHistory.mockRejectedValueOnce(historyError);
      
      // テスト用イベント（バージョン履歴を含める）
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId,
          includeHistory: 'true'
        }
      };
      
      // ハンドラーを実行（エラーがスローされないこと）
      const result = await loadFileHandler.handler(mockEvent);
      
      // ポートフォリオ読み込みは成功することを確認
      expect(loadPortfolioFromDrive).toHaveBeenCalledWith(mockAccessToken, mockFileId);
      
      // バージョン履歴取得が呼ばれることを確認
      expect(getPortfolioVersionHistory).toHaveBeenCalledWith(mockFileId, mockAccessToken);
      
      // 正しいレスポンスが返されることを確認（バージョン履歴なし）
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          file: expect.any(Object),
          data: mockPortfolioData
          // versions は含まれない
        })
      }));
      
      // 成功レスポンスが返されることを確認
      expect(result.statusCode).toBe(200);
    });
  });
  
  describe('エラー処理', () => {
    test('異常系：セッションがない場合はエラーを返す', async () => {
      // セッションなしのモック
      parseCookies.mockReturnValueOnce({});
      
      const mockEvent = {
        headers: {},
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
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
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'セッションが無効です'
      }));
    });
    
    test('異常系：ファイルIDが指定されていない場合はエラーを返す', async () => {
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          // fileIdがない
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: 'ファイルIDが不足しています'
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
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'TOKEN_REFRESH_ERROR',
        message: 'アクセストークンの更新に失敗しました'
      }));
    });
    
    test('異常系：ファイル読み込みに失敗した場合はエラーを返す', async () => {
      // 読み込み失敗のモック
      const loadError = new Error('Drive load error');
      loadPortfolioFromDrive.mockRejectedValueOnce(loadError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 500,
        code: 'DRIVE_LOAD_ERROR',
        message: 'Google Driveからの読み込みに失敗しました'
      }));
    });
    
    test('異常系：ファイルが見つからない場合は404エラーを返す', async () => {
      // ファイル不在エラーのモック
      const notFoundError = new Error('file not found');
      loadPortfolioFromDrive.mockRejectedValueOnce(notFoundError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: 'non-existent-file'
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        code: 'FILE_NOT_FOUND',
        message: '指定されたファイルが見つかりません'
      }));
    });
    
    test('異常系：データ形式が無効な場合は400エラーを返す', async () => {
      // データ形式エラーのモック
      const invalidDataError = new Error('Invalid portfolio data');
      loadPortfolioFromDrive.mockRejectedValueOnce(invalidDataError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_DATA_FORMAT',
        message: 'ポートフォリオデータの形式が無効です'
      }));
    });
    
    test('異常系：アクセス権限がない場合は403エラーを返す', async () => {
      // 権限エラーのモック
      const permissionError = new Error('Permission denied');
      loadPortfolioFromDrive.mockRejectedValueOnce(permissionError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      // ハンドラーを実行
      await loadFileHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        code: 'PERMISSION_DENIED',
        message: 'ファイルへのアクセス権限がありません'
      }));
    });
  });
});
