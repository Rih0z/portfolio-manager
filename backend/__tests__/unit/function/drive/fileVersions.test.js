/**
 * ファイルパス: __tests__/unit/function/drive/fileVersions.test.js
 * 
 * FileVersionsハンドラーのユニットテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */

// テスト対象モジュールのインポート
const fileVersionsHandler = require('../../../../src/function/drive/fileVersions');

// 依存モジュールのインポート
const { getSession, refreshSessionToken } = require('../../../../src/services/googleAuthService');
const { getPortfolioVersionHistory, getFileWithMetadata } = require('../../../../src/services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { parseCookies } = require('../../../../src/utils/cookieParser');

// モックの設定
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/services/googleDriveService');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('../../../../src/utils/cookieParser');

describe('FileVersionsHandler', () => {
  // モックデータ
  const mockSessionId = 'test-session-id';
  const mockAccessToken = 'test-access-token';
  const mockFileId = 'test-file-id';
  const mockVersionId = 'test-version-id';
  
  const mockSession = {
    sessionId: mockSessionId,
    googleId: 'google-user-123',
    email: 'user@example.com',
    accessToken: 'old-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1時間後
  };
  
  const mockVersionHistory = [
    {
      id: 'version-1',
      name: 'portfolio-data-2025-05-10T00-00-00Z.json.bak',
      createdTime: '2025-05-10T00:00:00Z',
      size: '1000'
    },
    {
      id: 'version-2',
      name: 'portfolio-data-2025-05-15T00-00-00Z.json.bak',
      createdTime: '2025-05-15T00:00:00Z',
      size: '1200'
    }
  ];
  
  const mockVersionFile = {
    content: JSON.stringify({ name: 'Test Portfolio', version: '1.0', holdings: [] }),
    metadata: {
      id: mockVersionId,
      name: 'portfolio-data-2025-05-15T00-00-00Z.json.bak',
      createdTime: '2025-05-15T00:00:00Z',
      modifiedTime: '2025-05-15T00:00:00Z',
      webViewLink: 'https://drive.google.com/file/d/test-version-id/view'
    }
  };

  beforeEach(() => {
    // テスト前の準備
    jest.clearAllMocks();
    
    // モック関数の実装
    parseCookies.mockReturnValue({ session: mockSessionId });
    getSession.mockResolvedValue(mockSession);
    refreshSessionToken.mockResolvedValue({ accessToken: mockAccessToken, refreshed: false });
    getPortfolioVersionHistory.mockResolvedValue(mockVersionHistory);
    getFileWithMetadata.mockResolvedValue(mockVersionFile);
    
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
  
  describe('バージョン履歴取得', () => {
    test('正常系：ファイルのバージョン履歴を取得して返す', async () => {
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      const result = await fileVersionsHandler.handler(mockEvent);
      
      // Cookie解析が呼ばれることを確認
      expect(parseCookies).toHaveBeenCalledWith(mockEvent.headers);
      
      // セッション取得が呼ばれることを確認
      expect(getSession).toHaveBeenCalledWith(mockSessionId);
      
      // トークン更新が呼ばれることを確認
      expect(refreshSessionToken).toHaveBeenCalledWith(mockSessionId);
      
      // バージョン履歴取得が呼ばれることを確認
      expect(getPortfolioVersionHistory).toHaveBeenCalledWith(mockFileId, mockAccessToken);
      
      // 正しいレスポンスが返されることを確認
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 200,
        data: {
          fileId: mockFileId,
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
          ]),
          count: 2
        },
        message: expect.stringContaining('バージョン履歴')
      }));
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.stringContaining('versions')
      }));
    });
    
    test('異常系：fileIdが指定されていない場合はエラーを返す', async () => {
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {}
      };
      
      await fileVersionsHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: 'ファイルIDが不足しています'
      }));
    });
  });
  
  describe('特定バージョンの取得', () => {
    test('正常系：指定されたバージョンのファイルを取得して返す', async () => {
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId,
          versionId: mockVersionId
        }
      };
      
      const result = await fileVersionsHandler.handler(mockEvent);
      
      // Cookie解析が呼ばれることを確認
      expect(parseCookies).toHaveBeenCalledWith(mockEvent.headers);
      
      // セッション取得が呼ばれることを確認
      expect(getSession).toHaveBeenCalledWith(mockSessionId);
      
      // トークン更新が呼ばれることを確認
      expect(refreshSessionToken).toHaveBeenCalledWith(mockSessionId);
      
      // ファイル取得が呼ばれることを確認
      expect(getFileWithMetadata).toHaveBeenCalledWith(mockVersionId, mockAccessToken);
      
      // バージョン履歴取得は呼ばれないことを確認
      expect(getPortfolioVersionHistory).not.toHaveBeenCalled();
      
      // 正しいレスポンスが返されることを確認
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 200,
        data: {
          file: expect.objectContaining({
            id: mockVersionId,
            name: expect.any(String),
            createdAt: expect.any(String),
            isVersion: true,
            originalFileId: mockFileId
          }),
          data: expect.objectContaining({
            name: 'Test Portfolio',
            version: '1.0',
            holdings: []
          })
        },
        message: expect.stringContaining('バージョンを取得')
      }));
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.stringContaining('Test Portfolio')
      }));
    });
  });
  
  describe('エラー処理', () => {
    test('異常系：セッションがない場合はエラーを返す', async () => {
      parseCookies.mockReturnValueOnce({});
      
      const mockEvent = {
        headers: {},
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      await fileVersionsHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'NO_SESSION',
        message: 'セッションが存在しません'
      }));
    });
    
    test('異常系：セッションが無効な場合はエラーを返す', async () => {
      getSession.mockResolvedValueOnce(null);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      await fileVersionsHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'セッションが無効です'
      }));
    });
    
    test('異常系：トークン更新に失敗した場合はエラーを返す', async () => {
      const mockError = new Error('Token refresh failed');
      refreshSessionToken.mockRejectedValueOnce(mockError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      await fileVersionsHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        code: 'TOKEN_REFRESH_ERROR',
        message: 'アクセストークンの更新に失敗しました'
      }));
    });
    
    test('異常系：バージョン履歴取得に失敗した場合はエラーを返す', async () => {
      const mockError = new Error('Version history error');
      getPortfolioVersionHistory.mockRejectedValueOnce(mockError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: mockFileId
        }
      };
      
      await fileVersionsHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 500,
        code: 'VERSION_HISTORY_ERROR',
        message: 'バージョン履歴の取得に失敗しました'
      }));
    });
    
    test('異常系：ファイルが見つからない場合は404エラーを返す', async () => {
      const mockError = new Error('file not found');
      getPortfolioVersionHistory.mockRejectedValueOnce(mockError);
      
      const mockEvent = {
        headers: {
          Cookie: `session=${mockSessionId}`
        },
        queryStringParameters: {
          fileId: 'non-existent-file'
        }
      };
      
      await fileVersionsHandler.handler(mockEvent);
      
      // エラーレスポンスが返されることを確認
      expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        code: 'FILE_NOT_FOUND',
        message: '指定されたファイルが見つかりません'
      }));
    });
  });
});
