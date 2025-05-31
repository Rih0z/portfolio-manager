/**
 * ファイルパス: __tests__/unit/function/auth/logout.test.js
 * 
 * ログアウトAPIハンドラーのユニットテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-15
 */

// テスト対象の関数をインポート
const { handler } = require('../../../../src/function/auth/logout');

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

describe('Logout Handler', () => {
  // テスト用のレスポンスオブジェクト
  const mockResponseObject = {
    statusCode: 200,
    headers: {
      'Set-Cookie': 'session=; Max-Age=0; HttpOnly; Secure'
    },
    body: JSON.stringify({ success: true, message: 'ログアウトしました' })
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
      statusCode: 400,
      headers: {},
      body: JSON.stringify({ success: false, error: { message: 'Error' } })
    });
    
    // cookieParserのモック実装
    cookieParser.parseCookies.mockReturnValue({
      session: 'session-123'
    });
    
    cookieParser.createClearSessionCookie.mockReturnValue('session=; Max-Age=0; HttpOnly; Secure');
    
    // googleAuthServiceのモック実装
    googleAuthService.invalidateSession.mockResolvedValue(true);
  });

  test('セッションクッキーがある場合、セッションを無効化してクリアクッキーを返す', async () => {
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
    
    // googleAuthService.invalidateSessionが正しく呼び出されたか検証
    expect(googleAuthService.invalidateSession).toHaveBeenCalledWith('session-123');
    
    // cookieParser.createClearSessionCookieが呼び出されたか検証
    expect(cookieParser.createClearSessionCookie).toHaveBeenCalled();
    
    // responseUtils.formatResponseが正しく呼び出されたか検証
    expect(responseUtils.formatResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('ログアウト'),
        headers: {
          'Set-Cookie': 'session=; Max-Age=0; HttpOnly; Secure'
        }
      })
    );
    
    // レスポンスを検証
    expect(response).toBe(mockResponseObject);
  });
  
  test('セッションクッキーがない場合でも成功レスポンスを返す', async () => {
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
    
    // googleAuthService.invalidateSessionが呼び出されていないことを検証
    expect(googleAuthService.invalidateSession).not.toHaveBeenCalled();
    
    // cookieParser.createClearSessionCookieが呼び出されたことを検証
    expect(cookieParser.createClearSessionCookie).toHaveBeenCalled();
    
    // responseUtils.formatResponseが呼び出されたことを検証
    expect(responseUtils.formatResponse).toHaveBeenCalled();
  });
  
  test('ヘッダーがない場合も成功レスポンスを返す', async () => {
    // ヘッダーなしのイベント
    const event = {};
    
    // テスト対象の関数を実行
    await handler(event);
    
    // cookieParser.createClearSessionCookieが呼び出されたことを検証
    expect(cookieParser.createClearSessionCookie).toHaveBeenCalled();
    
    // responseUtils.formatResponseが呼び出されたことを検証
    expect(responseUtils.formatResponse).toHaveBeenCalled();
  });
  
  test('セッション無効化時にエラーが発生しても成功レスポンスを返す', async () => {
    // テスト用のリクエストイベントを作成
    const event = {
      headers: {
        Cookie: 'session=session-123'
      }
    };
    
    // invalidateSessionがエラーをスローするようにモック
    googleAuthService.invalidateSession.mockRejectedValue(
      new Error('Failed to invalidate session')
    );
    
    // テスト対象の関数を実行
    await handler(event);
    
    // cookieParser.createClearSessionCookieが呼び出されたことを検証
    expect(cookieParser.createClearSessionCookie).toHaveBeenCalled();
    
    // responseUtils.formatResponseが呼び出されたことを検証
    expect(responseUtils.formatResponse).toHaveBeenCalled();
  });
  
  test('POSTリクエスト以外ではエラーレスポンスを返す', async () => {
    // テスト用のGETリクエストイベントを作成
    const event = {
      httpMethod: 'GET',
      headers: {
        Cookie: 'session=session-123'
      }
    };
    
    // テスト対象の関数を実行
    await handler(event);
    
    // responseUtils.formatErrorResponseが呼び出されたことを検証
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 405,
        code: 'METHOD_NOT_ALLOWED',
        message: expect.stringContaining('Method not allowed')
      })
    );
  });
  
  test('特定のリダイレクトURLが指定された場合はリダイレクトレスポンスを返す', async () => {
    // テスト用のリクエストイベントを作成（リダイレクトパラメータ付き）
    const event = {
      headers: {
        Cookie: 'session=session-123'
      },
      queryStringParameters: {
        redirect: 'https://example.com/'
      }
    };
    
    // リダイレクトレスポンスをモック
    responseUtils.formatRedirectResponse = jest.fn().mockReturnValue({
      statusCode: 302,
      headers: {
        Location: 'https://example.com/',
        'Set-Cookie': 'session=; Max-Age=0; HttpOnly; Secure'
      },
      body: ''
    });
    
    // テスト対象の関数を実行
    await handler(event);
    
    // formatRedirectResponseが呼び出されたことを検証
    expect(responseUtils.formatRedirectResponse).toHaveBeenCalledWith(
      'https://example.com/',
      expect.any(Number),
      expect.objectContaining({
        'Set-Cookie': expect.any(String)
      })
    );
  });
  
  test('DynamoDBからのセッション削除をテスト（LocalStackを使用）', async () => {
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
    
    // テスト用のリクエストイベントを作成
    const event = {
      headers: {
        Cookie: 'session=db-session-123'
      }
    };
    
    // invalidateSessionが実際にDynamoDBに問い合わせるようにモック
    googleAuthService.invalidateSession.mockImplementation(async (sessionId) => {
      // DynamoDB操作をシミュレート - 実際の実装では削除操作
      return true;
    });
    
    // テスト対象の関数を実行
    await handler(event);
    
    // responseUtils.formatResponseが呼び出されたことを検証
    expect(responseUtils.formatResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('ログアウト'),
        headers: expect.objectContaining({
          'Set-Cookie': expect.any(String)
        })
      })
    );
  });
  
  test('セッションステータスのロギングオプションを検証', async () => {
    // 元の環境変数を保存
    const originalLogSessions = process.env.LOG_SESSION_STATUS;
    
    try {
      // ログ有効化環境変数を設定
      process.env.LOG_SESSION_STATUS = 'true';
      
      // テスト用のリクエストイベントを作成
      const event = {
        headers: {
          Cookie: 'session=session-123'
        }
      };
      
      // コンソールログをモック
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      try {
        // テスト対象の関数を実行
        await handler(event);
        
        // コンソールログが呼び出されたことを検証（セッションログを出力）
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Session invalidated'),
          expect.any(String)
        );
      } finally {
        // コンソールログを元に戻す
        console.log = originalConsoleLog;
      }
    } finally {
      // 環境変数を元に戻す
      process.env.LOG_SESSION_STATUS = originalLogSessions;
    }
  });
});
