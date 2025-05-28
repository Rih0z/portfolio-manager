/**
 * セキュリティミドルウェア
 * レート制限、入力検証、セキュリティヘッダーの設定
 */
'use strict';

const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX_REQUESTS = 100; // 1分間に100リクエスト

/**
 * レート制限チェック
 * @param {string} clientId - クライアント識別子（IPアドレスやAPIキー）
 * @returns {boolean} レート制限内かどうか
 */
const checkRateLimit = (clientId) => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimit.has(clientId)) {
    rateLimit.set(clientId, []);
  }
  
  const requests = rateLimit.get(clientId);
  
  // 古いリクエストを削除
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // レート制限に引っかかった
  }
  
  // 新しいリクエストを追加
  recentRequests.push(now);
  rateLimit.set(clientId, recentRequests);
  
  return true;
};

/**
 * 入力サニタイゼーション
 * @param {any} input - サニタイズする入力
 * @returns {any} サニタイズされた入力
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // SQLインジェクション、XSS攻撃対策
    return input
      .replace(/[<>]/g, '') // HTMLタグ除去
      .replace(/['";\\]/g, '') // SQL文字除去
      .trim()
      .slice(0, 1000); // 長さ制限
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput).slice(0, 50); // 配列要素数制限
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof key === 'string' && key.length < 100) {
        sanitized[sanitizeInput(key)] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  return input;
};

/**
 * セキュリティヘッダーの設定
 * @param {Object} response - レスポンスオブジェクト
 * @returns {Object} セキュリティヘッダーが設定されたレスポンス
 */
const addSecurityHeaders = (response) => {
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  
  return {
    ...response,
    headers: {
      ...response.headers,
      ...securityHeaders
    }
  };
};

/**
 * API キーの検証
 * @param {string} apiKey - 検証するAPIキー
 * @param {string} expectedPattern - 期待されるパターン
 * @returns {boolean} 有効なAPIキーかどうか
 */
const validateApiKey = (apiKey, expectedPattern = null) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // 基本的な形式チェック
  if (apiKey.length < 10 || apiKey.length > 200) {
    return false;
  }
  
  // 危険な文字の除外
  if (/[<>'";&\\]/.test(apiKey)) {
    return false;
  }
  
  // パターンチェック（オプション）
  if (expectedPattern && !new RegExp(expectedPattern).test(apiKey)) {
    return false;
  }
  
  return true;
};

/**
 * IP アドレスのホワイトリストチェック
 * @param {string} clientIp - クライアントIPアドレス
 * @param {Array<string>} whitelist - 許可するIPアドレスのリスト
 * @returns {boolean} 許可されたIPかどうか
 */
const checkIpWhitelist = (clientIp, whitelist = []) => {
  if (!whitelist || whitelist.length === 0) {
    return true; // ホワイトリストが設定されていない場合は許可
  }
  
  return whitelist.some(allowedIp => {
    if (allowedIp.includes('/')) {
      // CIDR記法のサポート（簡易版）
      return clientIp.startsWith(allowedIp.split('/')[0]);
    }
    return clientIp === allowedIp;
  });
};

/**
 * セキュリティログの記録
 * @param {string} event - セキュリティイベント
 * @param {Object} details - 詳細情報
 */
const logSecurityEvent = (event, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    severity: details.severity || 'INFO'
  };
  
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
  
  // 重要なセキュリティイベントはアラート送信
  if (details.severity === 'HIGH' || details.severity === 'CRITICAL') {
    // alertService.notifyError を使用してアラート送信
    // （実装は省略）
  }
};

module.exports = {
  checkRateLimit,
  sanitizeInput,
  addSecurityHeaders,
  validateApiKey,
  checkIpWhitelist,
  logSecurityEvent
};