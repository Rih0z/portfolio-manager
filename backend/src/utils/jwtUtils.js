/**
 * JWT トークン生成・検証ユーティリティ
 *
 * Access Token (24時間有効) と Refresh Token (7日有効) の生成・検証を担当。
 * 署名鍵は AWS Secrets Manager から遅延読込+キャッシュ。
 *
 * @file src/utils/jwtUtils.js
 * @author Koki Riho
 * @created 2026-03-04
 */
'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getSecret } = require('./secretsManager');
const logger = require('./logger');

const JWT_SECRET_NAME = 'pfwise-api/credentials';
const JWT_SECRET_KEY = 'JWT_SECRET';

const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'pfwise-api';
const JWT_AUDIENCE = 'pfwise-web';

// 秘密鍵キャッシュ
let cachedSecret = null;
let secretCacheTimestamp = 0;
const SECRET_CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

/**
 * JWT署名用秘密鍵を取得（遅延読込+キャッシュ）
 * @returns {Promise<string>} JWT秘密鍵
 */
const getJwtSecret = async () => {
  if (cachedSecret && (Date.now() - secretCacheTimestamp) < SECRET_CACHE_TTL) {
    return cachedSecret;
  }

  try {
    const secret = await getSecret(JWT_SECRET_NAME, JWT_SECRET_KEY);
    if (!secret) {
      throw new Error('JWT_SECRET not found in Secrets Manager');
    }
    cachedSecret = secret;
    secretCacheTimestamp = Date.now();
    return secret;
  } catch (error) {
    logger.error('Failed to retrieve JWT secret:', error.message);

    // 環境変数フォールバック
    const envSecret = process.env.JWT_SECRET;
    if (envSecret) {
      logger.warn('Using JWT_SECRET from environment variable');
      cachedSecret = envSecret;
      secretCacheTimestamp = Date.now();
      return envSecret;
    }

    throw new Error('JWT_SECRET is not available from Secrets Manager or environment');
  }
};

/**
 * Access Token を生成する
 * claims: sub, email, name, picture, sessionId, hasDriveAccess
 *
 * @param {Object} payload - トークンペイロード
 * @param {string} payload.sub - ユーザーID (Google ID)
 * @param {string} payload.email - メールアドレス
 * @param {string} payload.name - ユーザー名
 * @param {string} payload.picture - プロフィール画像URL
 * @param {string} payload.sessionId - DynamoDB セッションID
 * @param {boolean} payload.hasDriveAccess - Google Drive アクセス権有無
 * @returns {Promise<string>} 署名済み JWT Access Token
 */
const generateAccessToken = async (payload) => {
  const secret = await getJwtSecret();

  const claims = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    sessionId: payload.sessionId,
    hasDriveAccess: payload.hasDriveAccess || false,
    planType: payload.planType || 'free',
    type: 'access'
  };

  return jwt.sign(claims, secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Refresh Token を生成する
 * claims: sub, sessionId, tokenId(uuid)
 *
 * @param {Object} payload - トークンペイロード
 * @param {string} payload.sub - ユーザーID (Google ID)
 * @param {string} payload.sessionId - DynamoDB セッションID
 * @returns {Promise<string>} 署名済み JWT Refresh Token
 */
const generateRefreshToken = async (payload) => {
  const secret = await getJwtSecret();

  const claims = {
    sub: payload.sub,
    sessionId: payload.sessionId,
    tokenId: uuidv4(),
    type: 'refresh'
  };

  return jwt.sign(claims, secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Access Token を検証してデコードする
 *
 * @param {string} token - JWT Access Token
 * @returns {Promise<Object>} デコードされたペイロード
 * @throws {Error} トークンが無効、期限切れ、またはtype不一致の場合
 */
const verifyAccessToken = async (token) => {
  const secret = await getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type: expected access token');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error(`Invalid access token: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Refresh Token を検証してデコードする
 *
 * @param {string} token - JWT Refresh Token
 * @returns {Promise<Object>} デコードされたペイロード
 * @throws {Error} トークンが無効、期限切れ、またはtype不一致の場合
 */
const verifyRefreshToken = async (token) => {
  const secret = await getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type: expected refresh token');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
    throw error;
  }
};

/**
 * テスト用: シークレットキャッシュをリセット
 */
const _resetSecretCache = () => {
  cachedSecret = null;
  secretCacheTimestamp = 0;
};

module.exports = {
  getJwtSecret,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  _resetSecretCache,
  // 定数エクスポート（テスト用）
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  JWT_ALGORITHM,
  JWT_ISSUER,
  JWT_AUDIENCE
};
