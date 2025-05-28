/**
 * ファイルパス: __tests__/unit/function/drive/listFiles.test.js
 * 
 * ListFilesハンドラーのユニットテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */

// テスト対象モジュールのインポート
const listFilesHandler = require('../../../../src/function/drive/listFiles');

// 依存モジュールのインポート
const { getSession, refreshSessionToken } = require('../../../../src/services/googleAuthService');
const { listPortfolioFiles } = require('../../../../src/services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { parseCookies } = require('../../../../src/utils/cookieParser');

// モックの設定
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/services/googleDriveService');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('../../../../src/utils/cookieParser');

describe('ListFilesHandler', () => {
  // モックデータ
  const mockSessionId = 'test-session-id';
  const mockAccessToken = 'test-access-token';
  const mockSession = {
    sessionId: mockSessionId,
    googleId: 'google-user-123',
    email: 'user@example.com',
    accessToken: 'old-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1時間後
  };
  
  const mockFiles = [
    {
      id: 'file-1',
      name: 'portfolio-1.json',
      mimeType: 'application/json',
      size: '1000',
      createdTime: '2025-05-10T00:00:00Z',
      modifiedTime: '2025-05-15T00:00:00Z',
      webViewLink: 'https://drive.google.com/file/d/file-1/view'
    },
    {
      id: 'file-2',
      name: 'portfolio-2.json',
      mimeType: 'application/json',
      size: '2000',
      createdTime: '2025-05-12T00:00:00Z',
      modifiedTime: '2025-05-16T00:00:00Z',
      webViewLink: 'https://drive.google.com/file/d/file-2/view'
    }
  ];
  
  const mockEvent = {
    headers: {
      Cookie: `session=${mockSessionId}`
    },
    queryStringParameters: {
      maxResults: '10',
      nameFilter: 'portfolio'
    }
  };

  beforeEach(() => {
    // テスト前の準備
    jest.clearAllMocks();
    
    // モック関数の実装
    parseCookies.mockReturnValue({ session: mockSessionId });
    getSession.mockResolvedValue(mockSession);
    refreshSessionToken.mockResolvedValue({ accessToken: mockAccessToken, refreshed: true });
    listPortfolioFiles.mockResolvedValue(mockFiles);
    
    formatResponse.mockImplementation(options => ({
      statusCode: options.statusCode || 200,
      body: JSON.stringify({
        success: true,
        data: options.data
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
  
  test('正常系：ファイル一覧を取得して返す', async () => {
    const result = await listFilesHandler.handler(mockEvent);
    
    // Cookie解析が呼ばれることを確認
    expect(parseCookies).toHaveBeenCalledWith(mockEvent.headers);
    
    // セッション取得が呼ばれることを確認
    expect(getSession).toHaveBeenCalledWith(mockSessionId);
    
    // トークン更新が呼ばれることを確認
    expect(refreshSessionToken).toHaveBeenCalledWith(mockSessionId);
    
    // ファイル一覧取得が呼ばれることを確認
    expect(listPortfolioFiles).toHaveBeenCalledWith(mockAccessToken, expect.objectContaining({
      maxResults: 10,
      nameFilter: 'portfolio'
    }));
    
    // 正しいレスポンスが返されることを確認
    expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 200,
      data: {
        files: expect.arrayContaining([
          expect.objectContaining({
            id: 'file-1',
            name: 'portfolio-1.json'
          }),
          expect.objectContaining({
            id: 'file-2',
            name: 'portfolio-2.json'
          })
        ]),
        count: 2
      }
    }));
    
    expect(result).toEqual(expect.objectContaining({
      statusCode: 200,
      body: expect.stringContaining('files')
    }));
  });

  test('異常系：セッションが存在しない場合はエラーを返す', async () => {
    parseCookies.mockReturnValueOnce({});
    
    await listFilesHandler.handler(mockEvent);
    
    // エラーレスポンスが返されることを確認
    expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      code: 'NO_SESSION',
      message: 'セッションが存在しません'
    }));
  });

  test('異常系：セッションが無効な場合はエラーを返す', async () => {
    getSession.mockResolvedValueOnce(null);
    
    await listFilesHandler.handler(mockEvent);
    
    // エラーレスポンスが返されることを確認
    expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      code: 'INVALID_SESSION',
      message: 'セッションが無効です'
    }));
  });

  test('異常系：トークン更新に失敗した場合はエラーを返す', async () => {
    const mockError = new Error('Token refresh error');
    refreshSessionToken.mockRejectedValueOnce(mockError);
    
    await listFilesHandler.handler(mockEvent);
    
    // エラーレスポンスが返されることを確認
    expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      code: 'TOKEN_REFRESH_ERROR',
      message: 'アクセストークンの更新に失敗しました'
    }));
  });

  test('異常系：ファイル一覧取得に失敗した場合はエラーを返す', async () => {
    const mockError = new Error('Drive error');
    listPortfolioFiles.mockRejectedValueOnce(mockError);
    
    await listFilesHandler.handler(mockEvent);
    
    // エラーレスポンスが返されることを確認
    expect(formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 500,
      code: 'DRIVE_LIST_ERROR',
      message: 'Google Driveのファイル一覧取得に失敗しました'
    }));
  });
});
