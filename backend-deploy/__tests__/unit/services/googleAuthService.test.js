/**
 * ファイルパス: __tests__/unit/services/googleAuthService.test.js
 * 
 * GoogleAuthServiceのユニットテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */

// モックは必ずインポートの前に定義する必要があります
// モジュールをモック化
jest.mock('uuid');
jest.mock('../../../src/utils/dynamoDbService');
jest.mock('../../../src/utils/tokenManager');

// 依存モジュールのインポート
const uuid = require('uuid');
const dynamoDbService = require('../../../src/utils/dynamoDbService');
const tokenManager = require('../../../src/utils/tokenManager');

// テスト対象モジュールのインポート
const googleAuthService = require('../../../src/services/googleAuthService');

describe('GoogleAuthService', () => {
  // テスト用のモックデータ
  const mockSessionId = 'test-session-id';
  const mockUserData = {
    googleId: 'google-user-123',
    email: 'user@example.com',
    name: 'Test User',
    picture: 'https://example.com/profile.jpg',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString()
  };

  const mockTokens = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    id_token: 'test-id-token',
    expires_in: 3600
  };

  const mockIdTokenPayload = {
    sub: 'google-user-123',
    email: 'user@example.com',
    name: 'Test User',
    picture: 'https://example.com/profile.jpg'
  };

  beforeEach(() => {
    // すべてのモックをクリア
    jest.clearAllMocks();
    
    // uuid.v4のモック
    uuid.v4 = jest.fn().mockReturnValue(mockSessionId);
    
    // DynamoDBサービスのモック
    // ここがエラーの原因。dynamoDbServiceの関数をモック関数に書き換える
    dynamoDbService.addItem = jest.fn().mockResolvedValue({});
    dynamoDbService.getItem = jest.fn().mockResolvedValue(null);
    dynamoDbService.deleteItem = jest.fn().mockResolvedValue({});
    dynamoDbService.updateItem = jest.fn().mockResolvedValue({});
    
    // tokenManagerのモック関数を明示的に実装
    // ここがエラーの原因。tokenManagerの関数をモック関数に書き換える
    tokenManager.exchangeCodeForTokens = jest.fn().mockResolvedValue(mockTokens);
    tokenManager.verifyIdToken = jest.fn().mockResolvedValue(mockIdTokenPayload);
    tokenManager.validateAndRefreshToken = jest.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      refreshed: true
    });
    tokenManager.refreshAccessToken = jest.fn().mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600
    });
  });
  
  // エクスポートされた関数をテスト
  describe('exchangeCodeForTokens', () => {
    test('認証コードをトークンと交換する', async () => {
      const result = await googleAuthService.exchangeCodeForTokens('auth-code', 'https://example.com/callback');
      
      expect(result).toEqual(mockTokens);
      expect(tokenManager.exchangeCodeForTokens).toHaveBeenCalledWith('auth-code', 'https://example.com/callback');
    });
  });

  describe('verifyIdToken', () => {
    test('IDトークンを検証してユーザー情報を取得する', async () => {
      const result = await googleAuthService.verifyIdToken('test-id-token');
      
      expect(result).toEqual(mockIdTokenPayload);
      expect(tokenManager.verifyIdToken).toHaveBeenCalledWith('test-id-token');
    });
  });

  describe('createUserSession', () => {
    test('ユーザーセッションを作成する', async () => {
      const result = await googleAuthService.createUserSession(mockUserData);
      
      expect(result).toEqual({
        sessionId: mockSessionId,
        expiresAt: expect.any(String)
      });

      expect(uuid.v4).toHaveBeenCalled();
      expect(dynamoDbService.addItem).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        sessionId: mockSessionId,
        googleId: mockUserData.googleId,
        email: mockUserData.email,
        name: mockUserData.name,
        picture: mockUserData.picture,
        accessToken: mockUserData.accessToken,
        refreshToken: mockUserData.refreshToken,
        expiresAt: expect.any(String),
        ttl: expect.any(Number)
      }));
    });

    test('DynamoDBエラー時は適切なエラーをスローする', async () => {
      const mockError = new Error('DynamoDB error');
      dynamoDbService.addItem.mockRejectedValueOnce(mockError);

      await expect(googleAuthService.createUserSession(mockUserData))
        .rejects
        .toThrow('ユーザーセッションの作成に失敗しました');
    });
  });

  describe('getSession', () => {
    test('有効なセッションを取得する', async () => {
      // 有効なセッションをモック
      const mockValidSession = {
        sessionId: mockSessionId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1時間後
      };
      dynamoDbService.getItem.mockResolvedValueOnce(mockValidSession);

      const result = await googleAuthService.getSession(mockSessionId);
      
      expect(result).toEqual(mockValidSession);
      expect(dynamoDbService.getItem).toHaveBeenCalledWith(expect.any(String), { sessionId: mockSessionId });
    });

    test('セッションが存在しない場合はnullを返す', async () => {
      dynamoDbService.getItem.mockResolvedValueOnce(null);

      const result = await googleAuthService.getSession(mockSessionId);
      
      expect(result).toBeNull();
    });

    test('期限切れのセッションは削除してnullを返す', async () => {
      // 期限切れのセッションをモック
      const mockExpiredSession = {
        sessionId: mockSessionId,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1時間前
      };
      dynamoDbService.getItem.mockResolvedValueOnce(mockExpiredSession);

      const result = await googleAuthService.getSession(mockSessionId);
      
      expect(result).toBeNull();
      expect(dynamoDbService.deleteItem).toHaveBeenCalledWith(expect.any(String), { sessionId: mockSessionId });
    });
  });

  describe('invalidateSession', () => {
    test('セッションを無効化する', async () => {
      const result = await googleAuthService.invalidateSession(mockSessionId);
      
      expect(result).toBe(true);
      expect(dynamoDbService.deleteItem).toHaveBeenCalledWith(expect.any(String), { sessionId: mockSessionId });
    });

    test('エラー時はfalseを返す', async () => {
      const mockError = new Error('Delete error');
      dynamoDbService.deleteItem.mockRejectedValueOnce(mockError);

      const result = await googleAuthService.invalidateSession(mockSessionId);
      
      expect(result).toBe(false);
    });
  });

  describe('updateSession', () => {
    test('セッション情報を更新する', async () => {
      const updates = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      const result = await googleAuthService.updateSession(mockSessionId, updates);
      
      expect(result).toBe(true);
      expect(dynamoDbService.updateItem).toHaveBeenCalled();
    });

    test('エラー時はfalseを返す', async () => {
      const mockError = new Error('Update error');
      dynamoDbService.updateItem.mockRejectedValueOnce(mockError);

      const result = await googleAuthService.updateSession(mockSessionId, {});
      
      expect(result).toBe(false);
    });
  });

  describe('refreshSessionToken', () => {
    test('セッショントークンを更新する', async () => {
      // 有効なセッションをモック
      const mockValidSession = {
        sessionId: mockSessionId,
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        tokenExpiry: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1時間前（期限切れ）
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1時間後
      };
      dynamoDbService.getItem.mockResolvedValueOnce(mockValidSession);

      const result = await googleAuthService.refreshSessionToken(mockSessionId);
      
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshed: true
      });

      expect(tokenManager.validateAndRefreshToken).toHaveBeenCalledWith(mockValidSession);
      expect(dynamoDbService.updateItem).toHaveBeenCalled(); // セッションが更新されたことを確認
    });

    test('セッションが存在しない場合はエラーをスローする', async () => {
      dynamoDbService.getItem.mockResolvedValueOnce(null);

      await expect(googleAuthService.refreshSessionToken(mockSessionId))
        .rejects
        .toThrow('セッションが見つかりません');
    });

    test('トークンが更新されない場合はセッションを更新しない', async () => {
      // 有効なセッションをモック
      const mockValidSession = {
        sessionId: mockSessionId,
        accessToken: 'current-access-token',
        refreshToken: 'current-refresh-token',
        tokenExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1時間後（有効）
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1時間後
      };
      dynamoDbService.getItem.mockResolvedValueOnce(mockValidSession);

      // トークンが更新されないようにモック
      tokenManager.validateAndRefreshToken.mockResolvedValueOnce({
        accessToken: 'current-access-token',
        refreshed: false
      });

      const result = await googleAuthService.refreshSessionToken(mockSessionId);
      
      expect(result).toEqual({
        accessToken: 'current-access-token',
        refreshed: false
      });

      expect(tokenManager.validateAndRefreshToken).toHaveBeenCalledWith(mockValidSession);
      expect(dynamoDbService.updateItem).not.toHaveBeenCalled(); // セッションが更新されないことを確認
    });
  });
});
