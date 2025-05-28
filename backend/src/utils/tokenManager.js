/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/tokenManager.js
 * 
 * 説明: 
 * OAuth トークン管理のためのユーティリティ。
 * トークンの検証、更新、暗号化/復号化を一元管理します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */
'use strict';

const { OAuth2Client } = require('google-auth-library');
const { withRetry } = require('./retry');
const logger = require('./logger');
const { getApiKeys } = require('./secretsManager');

// OAuth2クライアントの初期化（遅延初期化）
let oAuth2Client = null;

/**
 * OAuth2クライアントを取得（遅延初期化）
 * @returns {Promise<OAuth2Client>} OAuth2クライアント
 */
const getOAuth2Client = async () => {
  if (!oAuth2Client) {
    try {
      console.log('Initializing OAuth2Client...');
      const apiKeys = await getApiKeys();
      const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
      
      console.log('Google OAuth configuration:', {
        hasClientId: !!clientId,
        clientIdLength: clientId ? clientId.length : 0,
        hasClientSecret: !!clientSecret,
        clientSecretLength: clientSecret ? clientSecret.length : 0,
        clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'missing'
      });
      
      if (!clientId || !clientSecret) {
        throw new Error('Google Client ID/Secret not configured');
      }
      
      oAuth2Client = new OAuth2Client(clientId, clientSecret);
      console.log('OAuth2Client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OAuth2Client:', error.message);
      throw error;
    }
  }
  return oAuth2Client;
};

/**
 * アクセストークンの有効期限をチェックし、必要に応じて更新する
 * @param {Object} session - セッション情報
 * @returns {Promise<Object>} 更新されたトークン情報
 */
const validateAndRefreshToken = async (session) => {
  if (!session) {
    throw new Error('セッション情報が不足しています');
  }

  try {
    // アクセストークンの有効期限をチェック
    const tokenExpiry = new Date(session.tokenExpiry);
    const now = new Date();
    
    // 現在の有効なトークン情報を返す
    if (tokenExpiry > now) {
      return {
        accessToken: session.accessToken,
        refreshed: false
      };
    }
    
    // リフレッシュトークンがない場合はエラー
    if (!session.refreshToken) {
      throw new Error('リフレッシュトークンが存在しません');
    }
    
    // トークンを更新
    const newTokens = await refreshAccessToken(session.refreshToken);
    
    return {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || session.refreshToken,
      tokenExpiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      refreshed: true
    };
  } catch (error) {
    logger.error('トークン検証/更新エラー:', error);
    throw new Error(`アクセストークンの検証または更新に失敗しました: ${error.message}`);
  }
};

/**
 * リフレッシュトークンを使用してアクセストークンを更新する
 * @param {string} refreshToken - リフレッシュトークン
 * @returns {Promise<Object>} 新しいトークン情報
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // リトライロジックを適用してトークン更新
    return await withRetry(
      async () => {
        const client = await getOAuth2Client();
        client.setCredentials({
          refresh_token: refreshToken
        });
        
        const { credentials } = await client.refreshAccessToken();
        return credentials;
      },
      {
        maxRetries: 3,
        baseDelay: 300,
        shouldRetry: (error) => {
          // 一時的なエラーや接続エラーの場合のみリトライ
          return error.code === 'ETIMEDOUT' || 
                 error.code === 'ECONNRESET' ||
                 error.message?.includes('network') ||
                 error.response?.status >= 500;
        }
      }
    );
  } catch (error) {
    logger.error('トークン更新エラー:', error);
    throw new Error('アクセストークンの更新に失敗しました');
  }
};

/**
 * IDトークンを検証してユーザー情報を取得する
 * @param {string} idToken - Google ID Token
 * @returns {Promise<Object>} ユーザー情報
 */
const verifyIdToken = async (idToken) => {
  try {
    const client = await getOAuth2Client();
    const apiKeys = await getApiKeys();
    
    // リトライロジックを適用してIDトークン検証
    return await withRetry(
      async () => {
        const ticket = await client.verifyIdToken({
          idToken,
          audience: apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID
        });
        
        return ticket.getPayload();
      },
      {
        maxRetries: 2,
        baseDelay: 200
      }
    );
  } catch (error) {
    logger.error('IDトークン検証エラー:', error);
    
    // より詳細なエラーメッセージを提供
    if (error.message?.includes('expired')) {
      throw new Error('IDトークンの有効期限が切れています');
    } else if (error.message?.includes('audience')) {
      throw new Error('IDトークンの対象者(audience)が不正です');
    } else {
      throw new Error(`IDトークンの検証に失敗しました: ${error.message}`);
    }
  }
};

/**
 * 認証コードをトークンと交換する
 * @param {string} code - Google認証コード
 * @param {string} redirectUri - リダイレクトURI
 * @returns {Promise<Object>} - トークン情報
 */
const exchangeCodeForTokens = async (code, redirectUri) => {
  try {
    const client = await getOAuth2Client();
    
    // リトライロジックを適用してトークン交換
    return await withRetry(
      async () => {
        const { tokens } = await client.getToken({
          code,
          redirect_uri: redirectUri
        });
        
        return tokens;
      },
      {
        maxRetries: 2,
        baseDelay: 300
      }
    );
  } catch (error) {
    logger.error('トークン交換エラー:', error);
    
    // エラーメッセージを適切に変換
    if (error.message?.includes('invalid_grant')) {
      throw new Error('認証コードが無効または期限切れです');
    } else if (error.message?.includes('redirect_uri_mismatch')) {
      throw new Error('リダイレクトURIが一致しません');
    } else {
      throw new Error(`認証コードからトークンへの交換に失敗しました: ${error.message}`);
    }
  }
};

/**
 * Drive APIトークンをリフレッシュする
 * @param {string} refreshToken - リフレッシュトークン
 * @returns {Promise<Object>} 新しいトークン情報
 */
const refreshDriveToken = async (refreshToken) => {
  try {
    const client = await getOAuth2Client();
    
    // リフレッシュトークンをセット
    client.setCredentials({
      refresh_token: refreshToken
    });
    
    // 新しいアクセストークンを取得
    const { credentials } = await client.refreshAccessToken();
    
    return {
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
      token_type: credentials.token_type || 'Bearer'
    };
  } catch (error) {
    logger.error('Drive APIトークンリフレッシュエラー:', error);
    throw new Error(`Drive APIトークンのリフレッシュに失敗しました: ${error.message}`);
  }
};

module.exports = {
  validateAndRefreshToken,
  refreshAccessToken,
  verifyIdToken,
  exchangeCodeForTokens,
  refreshDriveToken
};
