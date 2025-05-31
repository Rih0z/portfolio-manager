/**
 * ファイルパス: __tests__/unit/function/auth/getSession.test.js
 * 
 * セッション取得APIハンドラーのユニットテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-15
 */

// テスト対象の関数をインポート
const { handler } = require('../../../../src/function/auth/getSession');

// 依存モジュールをモック化
const googleAuthService = require('../../../../src/services/googleAuthService');
const responseUtils = require('../../../../src/utils/responseUtils');
const cookieParser = require('../../../../src/utils/cookieParser');

// テスト用ユーティリティをインポート
const { setupLocalStackEmulator } = require('../../../testUtils/awsEmulator');

// モジュールのモック化
jest.mock('../../../../src/services/googleAuthService');
jest.mock('../../../../src/utils/responseUtils');
jest.mock('../../../../src/utils/cookieParser');

describe('Get Session Handler', () => {
  // テスト用のレスポンスオブジェクト
  const mockResponseObject = {
    statusCode: 200,
    headers: {},
    body: JSON.stringify({ success: true })
  };
  
  // テスト用セッションデータ
  const mockSessionData = {
    sessionId: 'session-123',
    googleId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/pic.jpg',
    accessToken: 'access-token-xyz',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  // LocalStackエミュレーターの参照
  let localstack;
  
  // 全テスト前のセットアップ
  beforeAll(async () => {
    // LocalStackエミュレーターのセットアップ（DynamoDB用）
    localstack = await setupLocalStackEmulator({
      services: ['dynamodb'],
      region: 'us-east-1'
    });
  });
  
  // 全テスト後のクリーンアップ
  afterAll(async () => {
    await localstack.stop();
  });
  
  // 各テスト実行前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
    
    // responseUtilsのモック実装
    responseUtils.formatResponse.mockResolvedValue(mockResponseObject);
    responseUtils.formatErrorResponse.mockResolvedValue({
      statusCode: 401,
      headers: {},
      body: JSON.stringify({ success: false, error: { message: 'Unauthorized' } })
    });
    
    // cookieParserのモック実装
    cookieParser.parseCookies.mockReturnValue({
      session: 'session-123'
    });
    
    // googleAuthServiceのモック実装
    googleAuthService.getSession.mockResolvedValue(mockSessionData);
  });

  test('セッションクッキーがある場合、セッション情報を返す', async () => {
    // テスト用のリクエストイベントを作成
    const event = {
      headers: {
        Cookie: 'session=session-123; other=value'
      }
    };
    
    // テスト対象の関数を実行
    const response = await handler(event);
    
    // cookieParser.parseCookiesが呼び出されたか検証
    expect(cookieParser.parseCookies).toHaveBeenCalledWith(
      expect.objectContaining({
        Cookie: expect.stringContaining('session=session-123')
      })
    );
    
    // googleAuthService.getSessionが正しく呼び出されたか検証
    expect(googleAuthService.getSession).toHaveBeenCalledWith('session-123');
    
    // responseUtils.formatResponseが正しく呼び出されたか検証
    expect(responseUtils.formatResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          isAuthenticated: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/pic.jpg'
          }
        }
      })
    );
    
    // レスポンスを検証
    expect(response).toBe(mockResponseObject);
  });
  
  test('セッションクッキーがない場合、認証エラーを返す', async () => {
    // セッションクッキーなしのイベント
    const event = {
      headers: {
        Cookie: 'other=value'
      }
    };
    
    // cookieParserのモック実装を変更（セッションなし）
    cookieParser.parseCookies.mockReturnValue({
      other: 'value'
    });
    
    // テスト対象の関数を実行
    await handler(event);
    
    // googleAuthService.getSessionが呼び出されていないことを検証
    expect(googleAuthService.getSession).not.toHaveBeenCalled();
    
    // responseUtils.formatErrorResponseが正しく呼び出されたか検証
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'NO_SESSION',
        message: expect.stringContaining('認証')
      })
    );
  });
  
  test('ヘッダーがない場合も認証エラーを返す', async () => {
    // ヘッダーなしのイベント
    const event = {};
    
    // テスト対象の関数を実行
    await handler(event);
    
    // responseUtils.formatErrorResponseが呼び出されたことを検証
    expect(responseUtils.formatErrorResponse).toHaveBeenCalled();
  });
  
  test('セッション取得時にエラーが発生した場合、エラーレスポンスを返す', async () => {
    // テスト用のリクエストイベントを作成
    const event = {
      headers: {
        Cookie: 'session=invalid-session-id'
      }
    };
    
    // getSessionがエラーをスローするようにモック
    googleAuthService.getSession.mockRejectedValue(
      new Error('Session not found')
    );
    
    // テスト対象の関数を実行
    await handler(event);
    
    // responseUtils.formatErrorResponseが呼び出されたことを検証
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTH_ERROR',
        message: expect.stringContaining('認証')
      })
    );
  });
  
  test('有効期限切れのセッションの場合、エラーレスポンスを返す', async () => {
    // テスト用のリクエストイベントを作成
    const event = {
      headers: {
        Cookie: 'session=expired-session-id'
      }
    };
    
    // 期限切れセッションをモック
    const expiredSession = {
      ...mockSessionData,
      expiresAt: new Date(Date.now() - 1000).toISOString() // 過去の日時
    };
    googleAuthService.getSession.mockResolvedValue(expiredSession);
    
    // テスト対象の関数を実行
    await handler(event);
    
    // responseUtils.formatErrorResponseが呼び出されたことを検証
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'SESSION_EXPIRED',
        message: expect.stringContaining('期限切れ')
      })
    );
  });
  
  test('デバッグモードで実行すると追加情報を含む', async () => {
    // 元の環境変数を保存
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDebug = process.env.DEBUG;
    
    try {
      // デバッグモード環境変数を設定
      process.env.NODE_ENV = 'development';
      process.env.DEBUG = 'true';
      
      // テスト用のリクエストイベントを作成
      const event = {
        headers: {
          Cookie: 'session=session-123'
        }
      };
      
      // テスト対象の関数を実行
      await handler(event);
      
      // responseUtils.formatResponseが呼び出されたことを検証
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isAuthenticated: true,
            user: expect.any(Object),
            debug: expect.any(Object) // デバッグ情報が追加されている
          })
        })
      );
    } finally {
      // 環境変数を元に戻す
      process.env.NODE_ENV = originalNodeEnv;
      process.env.DEBUG = originalDebug;
    }
  });
  
  test('DynamoDBからのセッション取得をテスト（LocalStackを使用）', async () => {
    // DynamoDBクライアントをモック
    if (localstack.mockDynamoDB) {
      localstack.mockDynamoDB({
        TableName: process.env.SESSION_TABLE || 'test-sessions',
        Item: {
          sessionId: { S: 'db-session-123' },
          googleId: { S: 'user-123' },
          email: { S: 'test@example.com' },
          name: { S: 'Test User' },
          expiresAt: { S: new Date(Date.now() + 86400000).toISOString() }
        }
      });
    }
    
    // cookieParserのモック実装を変更
    cookieParser.parseCookies.mockReturnValue({
      session: 'db-session-123'
    });
    
    // テスト対象の関数を実行
    const event = {
      headers: {
        Cookie: 'session=db-session-123'
      }
    };
    
    // getSessionが実際にDynamoDBに問い合わせるようにモック
    googleAuthService.getSession.mockImplementation(async (sessionId) => {
      // DynamoDBからの取得をシミュレート
      const response = await localstack.getDynamoDBItem({
        TableName: process.env.SESSION_TABLE || 'test-sessions',
        Key: {
          sessionId: { S: sessionId }
        }
      });
      
      if (!response || !response.Item) {
        throw new Error('Session not found');
      }
      
      // DynamoDB形式からJSオブジェクトに変換
      return {
        sessionId: response.Item.sessionId.S,
        googleId: response.Item.googleId.S,
        email: response.Item.email.S,
        name: response.Item.name.S,
        expiresAt: response.Item.expiresAt.S
      };
    });
    
    // テスト対象の関数を実行
    await handler(event);
    
    // responseUtils.formatResponseが呼び出されたことを検証
    expect(responseUtils.formatResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isAuthenticated: true,
          user: expect.objectContaining({
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User'
          })
        })
      })
    );
  });
});
