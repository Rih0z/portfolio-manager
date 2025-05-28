/**
 * セキュア認証システム
 * JWT、ハッシュ化、セッション管理のセキュリティ強化
 */
'use strict';

const crypto = require('crypto');
const logger = require('./logger');

// セキュリティ定数
const HASH_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const TOKEN_LENGTH = 64;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24時間

/**
 * セキュアなパスワードハッシュを生成
 * @param {string} password - パスワード
 * @param {string} salt - ソルト（オプション）
 * @returns {Object} ハッシュとソルト
 */
const hashPassword = (password, salt = null) => {
  try {
    if (!salt) {
      salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      HASH_ITERATIONS,
      64,
      'sha512'
    ).toString('hex');
    
    return { hash, salt };
  } catch (error) {
    logger.error('Password hashing failed:', error);
    throw new Error('Password hashing failed');
  }
};

/**
 * パスワードの検証
 * @param {string} password - 検証するパスワード
 * @param {string} hash - 保存されたハッシュ
 * @param {string} salt - 保存されたソルト
 * @returns {boolean} パスワードが正しいかどうか
 */
const verifyPassword = (password, hash, salt) => {
  try {
    const computedHash = crypto.pbkdf2Sync(
      password,
      salt,
      HASH_ITERATIONS,
      64,
      'sha512'
    ).toString('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch (error) {
    logger.error('Password verification failed:', error);
    return false;
  }
};

/**
 * セキュアなランダムトークンを生成
 * @param {number} length - トークンの長さ
 * @returns {string} ランダムトークン
 */
const generateSecureToken = (length = TOKEN_LENGTH) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * セッショントークンの生成
 * @param {string} userId - ユーザーID
 * @param {Object} metadata - セッションメタデータ
 * @returns {Object} セッション情報
 */
const createSession = (userId, metadata = {}) => {
  const sessionId = generateSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
  
  return {
    sessionId,
    userId,
    createdAt: new Date(),
    expiresAt,
    metadata: {
      ...metadata,
      userAgent: metadata.userAgent ? metadata.userAgent.slice(0, 500) : '',
      ipAddress: metadata.ipAddress || ''
    }
  };
};

/**
 * セッションの検証
 * @param {Object} session - セッション情報
 * @param {Object} requestMetadata - リクエストメタデータ
 * @returns {boolean} セッションが有効かどうか
 */
const validateSession = (session, requestMetadata = {}) => {
  if (!session || !session.sessionId || !session.expiresAt) {
    return false;
  }
  
  // 有効期限チェック
  if (new Date() > new Date(session.expiresAt)) {
    logger.warn('Session expired', { sessionId: session.sessionId });
    return false;
  }
  
  // IPアドレスチェック（オプション）
  if (session.metadata?.ipAddress && requestMetadata.ipAddress) {
    if (session.metadata.ipAddress !== requestMetadata.ipAddress) {
      logger.warn('Session IP mismatch', {
        sessionId: session.sessionId,
        expected: session.metadata.ipAddress,
        actual: requestMetadata.ipAddress
      });
      // 厳密なIPチェックはオプション（動的IPを考慮）
    }
  }
  
  return true;
};

/**
 * APIキーの生成
 * @param {string} prefix - プレフィックス
 * @returns {string} APIキー
 */
const generateApiKey = (prefix = 'pfwise') => {
  const randomPart = generateSecureToken(32);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${randomPart}`;
};

/**
 * APIキーの検証
 * @param {string} apiKey - 検証するAPIキー
 * @param {string} expectedPrefix - 期待されるプレフィックス
 * @returns {boolean} 有効なAPIキーかどうか
 */
const validateApiKeyFormat = (apiKey, expectedPrefix = 'pfwise') => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  const parts = apiKey.split('_');
  if (parts.length !== 3) {
    return false;
  }
  
  const [prefix, timestamp, randomPart] = parts;
  
  // プレフィックスチェック
  if (prefix !== expectedPrefix) {
    return false;
  }
  
  // タイムスタンプチェック（基本的な形式のみ）
  if (!/^[0-9a-z]+$/.test(timestamp)) {
    return false;
  }
  
  // ランダム部分チェック
  if (!/^[0-9a-f]{64}$/.test(randomPart)) {
    return false;
  }
  
  return true;
};

/**
 * 暗号化
 * @param {string} text - 暗号化するテキスト
 * @param {string} key - 暗号化キー
 * @returns {Object} 暗号化されたデータ
 */
const encrypt = (text, key) => {
  try {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * 復号化
 * @param {Object} encryptedData - 暗号化されたデータ
 * @param {string} key - 復号化キー
 * @returns {string} 復号化されたテキスト
 */
const decrypt = (encryptedData, key) => {
  try {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Decryption failed');
  }
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  createSession,
  validateSession,
  generateApiKey,
  validateApiKeyFormat,
  encrypt,
  decrypt
};