/**
 * driveTokenHelper.jsのテスト
 * Drive APIトークン管理ヘルパーのテスト
 */
'use strict';

const { getDriveAccessToken } = require('../../../src/utils/driveTokenHelper');
const { refreshDriveToken } = require('../../../src/services/googleAuthService');
const { formatErrorResponse } = require('../../../src/utils/responseUtils');

// モックの設定
jest.mock('../../../src/services/googleAuthService');
jest.mock('../../../src/utils/responseUtils');

describe('driveTokenHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.logをモック
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // formatErrorResponseのデフォルトモック
    formatErrorResponse.mockImplementation((options) => ({
      statusCode: options.statusCode || 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: options.code || 'ERROR',
          message: options.message || 'Error'
        }
      })
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDriveAccessToken', () => {
    test('有効なDriveアクセストークンがある場合はそのまま返す', async () => {
      const session = {
        driveAccessToken: 'valid-access-token',
        driveTokenExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1時間後
      };
      const sessionId = 'session-123';

      const result = await getDriveAccessToken(session, sessionId);

      expect(result).toEqual({
        success: true,
        accessToken: 'valid-access-token'
      });
      expect(console.log).toHaveBeenCalledWith('Using valid Drive API access token from session');
    });

    test('期限切れのトークンの場合はリフレッシュする', async () => {
      const session = {
        driveAccessToken: 'expired-access-token',
        driveTokenExpiry: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1時間前
      };
      const sessionId = 'session-123';

      refreshDriveToken.mockResolvedValue({
        accessToken: 'new-access-token'
      });

      const result = await getDriveAccessToken(session, sessionId);

      expect(refreshDriveToken).toHaveBeenCalledWith('session-123');
      expect(result).toEqual({
        success: true,
        accessToken: 'new-access-token'
      });
      expect(console.log).toHaveBeenCalledWith('Drive API token is expired or expiring soon, refreshing...');
      expect(console.log).toHaveBeenCalledWith('Drive API token refreshed successfully');
    });

    test('期限切れ間近のトークンの場合はリフレッシュする', async () => {
      const session = {
        driveAccessToken: 'expiring-access-token',
        driveTokenExpiry: new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2分後（5分のバッファー内）
      };
      const sessionId = 'session-123';

      refreshDriveToken.mockResolvedValue({
        accessToken: 'refreshed-access-token'
      });

      const result = await getDriveAccessToken(session, sessionId);

      expect(refreshDriveToken).toHaveBeenCalledWith('session-123');
      expect(result).toEqual({
        success: true,
        accessToken: 'refreshed-access-token'
      });
    });

    test('トークンリフレッシュが失敗した場合はエラーを返す', async () => {
      const session = {
        driveAccessToken: 'expired-access-token',
        driveTokenExpiry: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      };
      const sessionId = 'session-123';

      const refreshError = new Error('Refresh failed');
      refreshDriveToken.mockRejectedValue(refreshError);

      const mockErrorResponse = {
        statusCode: 403,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'DRIVE_TOKEN_REFRESH_FAILED',
            message: 'Drive APIトークンの更新に失敗しました'
          }
        })
      };

      formatErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await getDriveAccessToken(session, sessionId);

      expect(console.error).toHaveBeenCalledWith('Drive API token refresh failed:', refreshError);
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 403,
        code: 'DRIVE_TOKEN_REFRESH_FAILED',
        message: 'Drive APIトークンの更新に失敗しました',
        details: '再度Drive API認証を行ってください',
        authUrl: '/api/auth/google/drive/initiate'
      });
      expect(result).toEqual({
        success: false,
        error: mockErrorResponse
      });
    });

    test('有効期限情報がない場合はそのまま使用する', async () => {
      const session = {
        driveAccessToken: 'access-token-without-expiry'
        // driveTokenExpiryがない
      };
      const sessionId = 'session-123';

      const result = await getDriveAccessToken(session, sessionId);

      expect(result).toEqual({
        success: true,
        accessToken: 'access-token-without-expiry'
      });
      expect(console.log).toHaveBeenCalledWith('Using Drive API access token without expiry check');
    });

    test('requiresOAuthがtrueの場合はOAuth認証が必要なエラーを返す', async () => {
      const session = {
        requiresOAuth: true
        // driveAccessTokenがない
      };
      const sessionId = 'session-123';

      const mockErrorResponse = {
        statusCode: 403,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'DRIVE_OAUTH_REQUIRED',
            message: 'Google Drive APIへのアクセス権限が必要です'
          }
        })
      };

      formatErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await getDriveAccessToken(session, sessionId);

      expect(console.log).toHaveBeenCalledWith('Drive API OAuth required for this session');
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 403,
        code: 'DRIVE_OAUTH_REQUIRED',
        message: 'Google Drive APIへのアクセス権限が必要です',
        details: 'Drive API用のOAuth認証を完了してください',
        authUrl: '/api/auth/google/drive/initiate'
      });
      expect(result).toEqual({
        success: false,
        error: mockErrorResponse
      });
    });

    test('通常のOAuth2フローでトークンがない場合は標準認証が必要', async () => {
      const session = {
        // driveAccessTokenがない
        // requiresOAuthがfalse（またはundefined）
      };
      const sessionId = 'session-123';

      const result = await getDriveAccessToken(session, sessionId);

      expect(result).toEqual({
        success: false,
        needsStandardAuth: true
      });
    });

    test('空のセッションオブジェクトでも標準認証が必要と判定する', async () => {
      const session = {};
      const sessionId = 'session-123';

      const result = await getDriveAccessToken(session, sessionId);

      expect(result).toEqual({
        success: false,
        needsStandardAuth: true
      });
    });

    test('nullのdriveAccessTokenでも標準認証が必要と判定する', async () => {
      const session = {
        driveAccessToken: null,
        requiresOAuth: false
      };
      const sessionId = 'session-123';

      const result = await getDriveAccessToken(session, sessionId);

      expect(result).toEqual({
        success: false,
        needsStandardAuth: true
      });
    });

    test('空文字のdriveAccessTokenでも標準認証が必要と判定する', async () => {
      const session = {
        driveAccessToken: '',
        requiresOAuth: false
      };
      const sessionId = 'session-123';

      const result = await getDriveAccessToken(session, sessionId);

      expect(result).toEqual({
        success: false,
        needsStandardAuth: true
      });
    });
  });
});