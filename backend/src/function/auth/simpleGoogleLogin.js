/**
 * シンプルなGoogle認証ログインハンドラー - DynamoDBを使用しない版
 * 
 * @file src/function/auth/simpleGoogleLogin.js
 * @author Portfolio Manager Team
 * @created 2025-06-23
 */
'use strict';

const crypto = require('crypto');

/**
 * シンプルなGoogle認証処理ハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.handler = async (event) => {
  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Cookie',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  try {
    console.log('シンプルGoogle認証ハンドラーが呼び出されました');
    
    // リクエストボディの解析
    let requestBody;
    try {
      requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      console.log('リクエストボディ:', requestBody);
    } catch (error) {
      console.error('リクエストボディの解析に失敗:', error);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: { code: 'INVALID_REQUEST_BODY', message: '無効なリクエストボディです' }
        })
      };
    }

    // テストリクエストの場合は成功を返す
    if (requestBody && requestBody.test === 'warmup') {
      console.log('ウォームアップリクエストを処理');
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: 'Google認証エンドポイントが正常に動作しています',
          user: null,
          token: null,
          hasDriveAccess: false
        })
      };
    }

    // 実際の認証処理の場合はCredentialまたはCodeが必要
    if (!requestBody || (!requestBody.credential && !requestBody.code)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: { code: 'MISSING_AUTH_DATA', message: '認証情報（credentialまたはcode）が必要です' }
        })
      };
    }

    // 簡単なモック認証処理
    const mockUser = {
      googleId: 'mock_google_id_' + Date.now(),
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg'
    };

    // セッションIDを生成
    const sessionId = crypto.randomUUID();
    const mockToken = Buffer.from(JSON.stringify({
      userId: mockUser.googleId,
      sessionId: sessionId,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24時間
    })).toString('base64');

    // セッションCookieを作成
    const sessionCookie = `sessionId=${sessionId}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=86400`;

    console.log('モック認証成功:', {
      user: mockUser.email,
      sessionId: sessionId
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie
      },
      body: JSON.stringify({
        success: true,
        message: 'Google認証が完了しました（モック版）',
        user: mockUser,
        token: mockToken,
        hasDriveAccess: true
      })
    };

  } catch (error) {
    console.error('Google認証エラー:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: '認証処理中にエラーが発生しました' }
      })
    };
  }
};