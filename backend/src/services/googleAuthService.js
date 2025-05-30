/**
 * Google認証サービス - OAuth認証とセッション管理機能
 * 
 * @file src/services/googleAuthService.js
 * @author Koki Riho
 * @created 2025-05-12
 * @updated 2025-05-13
 * @updated 2025-05-20 改善: ドライブ操作関連機能を削除し認証に特化
 * @updated 2025-05-21 修正: dynamoDbServiceのインポート方法を変更
 * @updated 2025-05-22 修正: セッション削除処理の戻り値保証
 * @updated 2025-05-23 修正: エラー処理の戻り値をテストと一致するよう修正
 */
'use strict';

const uuid = require('uuid');
// 分割代入でのインポートからモジュールとしてのインポートに変更
const dynamoDbService = require('../utils/dynamoDbService');
const tokenManager = require('../utils/tokenManager');

// 定数定義
const SESSION_TABLE = process.env.SESSION_TABLE || `${process.env.DYNAMODB_TABLE_PREFIX || 'portfolio-market-data-'}-sessions`;
const SESSION_EXPIRES_DAYS = parseInt(process.env.SESSION_EXPIRES_DAYS || '7', 10); // セッション有効期限（日）

/**
 * 認証コードをトークンと交換する
 * @param {string} code - Google認証コード
 * @param {string} redirectUri - リダイレクトURI
 * @returns {Promise<Object>} - トークン情報
 */
const exchangeCodeForTokens = async (code, redirectUri) => {
  return tokenManager.exchangeCodeForTokens(code, redirectUri);
};

/**
 * IDトークンを検証してユーザー情報を取得する
 * @param {string} idToken - Google ID Token
 * @returns {Promise<Object>} - ユーザー情報
 */
const verifyIdToken = async (idToken) => {
  return tokenManager.verifyIdToken(idToken);
};

/**
 * ユーザーセッションを作成する
 * @param {Object} userData - ユーザーデータ
 * @returns {Promise<Object>} - セッション情報
 */
const createUserSession = async (userData) => {
  const sessionId = uuid.v4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  
  const sessionItem = {
    sessionId,
    googleId: userData.googleId,
    email: userData.email,
    name: userData.name,
    picture: userData.picture,
    accessToken: userData.accessToken,
    refreshToken: userData.refreshToken || null, // リフレッシュトークンがない場合もある
    tokenExpiry: userData.tokenExpiry || null,
    requiresOAuth: userData.requiresOAuth || false, // Drive API用OAuth2フローが必要かどうか
    // Google Drive関連のトークンを追加
    driveAccessToken: userData.driveAccessToken || null,
    driveRefreshToken: userData.driveRefreshToken || null,
    driveTokenExpiry: userData.driveTokenExpiry || null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    // TTL属性（DynamoDBの自動削除用）
    ttl: Math.floor(expiresAt.getTime() / 1000)
  };
  
  try {
    // 関数呼び出しをdynamoDbService.関数名の形式に変更
    await dynamoDbService.addItem(SESSION_TABLE, sessionItem);
    
    return {
      sessionId,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('セッション作成エラー:', error);
    throw new Error('ユーザーセッションの作成に失敗しました');
  }
};

/**
 * セッション情報を取得する
 * @param {string} sessionId - セッションID
 * @returns {Promise<Object|null>} - セッション情報
 */
const getSession = async (sessionId) => {
  try {
    // 関数呼び出しをdynamoDbService.関数名の形式に変更
    const session = await dynamoDbService.getItem(SESSION_TABLE, { sessionId });
    
    if (!session) {
      return null;
    }
    
    // セッションの有効期限をチェック
    const expiresAt = new Date(session.expiresAt);
    const now = new Date();
    
    if (expiresAt <= now) {
      // 期限切れの場合はセッションを削除
      await dynamoDbService.deleteItem(SESSION_TABLE, { sessionId });
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }
};

/**
 * セッションを無効化する
 * @param {string} sessionId - セッションID
 * @returns {Promise<boolean>} - 成功したかどうか
 */
const invalidateSession = async (sessionId) => {
  if (!sessionId) {
    console.warn('無効なセッションID:', sessionId);
    return true; // セッションIDがない場合は成功とみなす
  }
  
  try {
    // 関数呼び出しをdynamoDbService.関数名の形式に変更
    await dynamoDbService.deleteItem(SESSION_TABLE, { sessionId });
    return true;
  } catch (error) {
    console.error('セッション無効化エラー:', error);
    return false; // エラーが発生した場合はfalseを返す（テストと一致するよう修正）
  }
};

/**
 * セッション情報を更新する
 * @param {string} sessionId - セッションID
 * @param {Object} updates - 更新する項目
 * @returns {Promise<boolean>} - 成功したかどうか
 */
const updateSession = async (sessionId, updates) => {
  try {
    // 更新式とパラメータを構築
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    // 更新項目をチェック
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'sessionId') return; // セッションIDは更新しない
      
      const attributeName = `#${key}`;
      const attributeValue = `:${key}`;
      
      updateExpressions.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = value;
    });
    
    // 最終更新日時を追加
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // 更新式を作成
    const updateExpression = `SET ${updateExpressions.join(', ')}`;
    
    // 関数呼び出しをdynamoDbService.関数名の形式に変更
    await dynamoDbService.updateItem(
      SESSION_TABLE,
      { sessionId },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );
    
    return true;
  } catch (error) {
    console.error('セッション更新エラー:', error);
    return false;
  }
};

/**
 * アクセストークンを更新し、セッションも更新する
 * @param {string} sessionId - セッションID
 * @returns {Promise<Object>} 更新されたトークン情報
 */
const refreshSessionToken = async (sessionId) => {
  try {
    // セッションを取得
    const session = await getSession(sessionId);
    
    if (!session) {
      throw new Error('セッションが見つかりません');
    }
    
    // トークンを検証・更新
    const tokenInfo = await tokenManager.validateAndRefreshToken(session);
    
    // トークンが更新された場合はセッションも更新
    if (tokenInfo.refreshed) {
      await updateSession(sessionId, {
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken || session.refreshToken,
        tokenExpiry: tokenInfo.tokenExpiry
      });
    }
    
    return {
      accessToken: tokenInfo.accessToken,
      refreshed: tokenInfo.refreshed
    };
  } catch (error) {
    console.error('セッショントークン更新エラー:', error);
    throw new Error(`セッショントークンの更新に失敗しました: ${error.message}`);
  }
};

/**
 * Drive APIアクセストークンを更新する
 * @param {string} sessionId - セッションID
 * @returns {Promise<Object>} 更新されたトークン情報
 */
const refreshDriveToken = async (sessionId) => {
  try {
    // セッションを取得
    const session = await getSession(sessionId);
    
    if (!session) {
      throw new Error('セッションが見つかりません');
    }
    
    if (!session.driveRefreshToken) {
      throw new Error('Drive APIリフレッシュトークンがありません');
    }
    
    // Drive APIトークンを更新
    const tokenInfo = await tokenManager.refreshDriveToken(session.driveRefreshToken);
    
    // セッションを更新
    await updateSession(sessionId, {
      driveAccessToken: tokenInfo.access_token,
      driveTokenExpiry: tokenInfo.expiry_date ? new Date(tokenInfo.expiry_date).toISOString() : null
    });
    
    return {
      accessToken: tokenInfo.access_token,
      expiryDate: tokenInfo.expiry_date
    };
  } catch (error) {
    console.error('Drive APIトークン更新エラー:', error);
    throw new Error(`Drive APIトークンの更新に失敗しました: ${error.message}`);
  }
};

// エクスポート
module.exports = {
  exchangeCodeForTokens,
  verifyIdToken,
  createUserSession,
  getSession,
  invalidateSession,
  updateSession,
  refreshSessionToken,
  refreshDriveToken
};
