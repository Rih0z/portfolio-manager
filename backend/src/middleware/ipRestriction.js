/**
 * IP制限ミドルウェア
 * 
 * 特定のIPアドレスやIP範囲からのアクセスを制限する
 * ブラックリストとホワイトリストの両方をサポート
 */
'use strict';

const { formatErrorResponse } = require('../utils/responseUtils');
const logger = require('../utils/logger');

// createErrorResponse関数を定義
const createErrorResponse = (statusCode, errorCode, message) => {
  return formatErrorResponse({
    statusCode,
    message,
    error: {
      code: errorCode,
      message: message
    }
  });
};

// 管理者専用IP（例: オフィスIP、VPN IP）
const ADMIN_WHITELIST = [
  '127.0.0.1',
  '::1',
  // 実際の環境では適切なIPアドレスを設定
  ...(process.env.ADMIN_IP_WHITELIST ? process.env.ADMIN_IP_WHITELIST.split(',') : [])
];

// ブラックリストIP（攻撃元など）
const IP_BLACKLIST = [
  // 実際の環境では動的にロードする
  ...(process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(',') : [])
];

// 地域制限（必要に応じて）
const BLOCKED_COUNTRIES = [
  // 例: 'CN', 'RU' など
  ...(process.env.BLOCKED_COUNTRIES ? process.env.BLOCKED_COUNTRIES.split(',') : [])
];

/**
 * クライアントIPアドレスを取得
 */
const getClientIP = (event) => {
  // CloudFrontやAPI Gatewayを経由する場合のIP取得
  const forwarded = event.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return event.requestContext?.identity?.sourceIp ||
         event.headers?.['x-real-ip'] ||
         'unknown';
};

/**
 * IPアドレスが範囲内にあるかチェック
 */
const isIPInRange = (ip, range) => {
  try {
    // IPv6 localhost チェック
    if ((ip === '::1' || ip === '0:0:0:0:0:0:0:1') && (range === '::1' || range === 'localhost')) {
      return true;
    }
    
    // IPv4マッピングされたIPv6アドレスの処理
    const normalizedIP = normalizeIP(ip);
    const normalizedRange = normalizeIP(range);
    
    if (normalizedRange.includes('/')) {
      // CIDR記法の場合
      const [network, prefixLength] = normalizedRange.split('/');
      // IPv4アドレスのみCIDR記法をサポート
      if (isIPv4(normalizedIP) && isIPv4(network)) {
        const networkInt = ipToInt(network);
        const ipInt = ipToInt(normalizedIP);
        const mask = ~(0xFFFFFFFF >>> parseInt(prefixLength));
        
        return (networkInt & mask) === (ipInt & mask);
      }
      return false;
    } else {
      // 単一IPアドレスの場合
      return normalizedIP === normalizedRange;
    }
  } catch (error) {
    logger.error('IP range check error:', error);
    return false;
  }
};

/**
 * IPv4アドレスかどうかをチェック
 */
const isIPv4 = (ip) => {
  const parts = ip.split('.');
  return parts.length === 4 && parts.every(part => {
    const num = parseInt(part);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
};

/**
 * IPアドレスを整数に変換
 */
const ipToInt = (ip) => {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    throw new Error('Invalid IPv4 address');
  }
  return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};

/**
 * IPv6対応のIP正規化
 */
const normalizeIP = (ip) => {
  // IPv6のIPv4マッピングを処理
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

/**
 * ブラックリストチェック
 */
const isBlacklisted = (ip) => {
  const normalizedIP = normalizeIP(ip);
  
  return IP_BLACKLIST.some(blacklistedRange => 
    isIPInRange(normalizedIP, blacklistedRange)
  );
};

/**
 * 管理者ホワイトリストチェック
 */
const isAdminWhitelisted = (ip) => {
  const normalizedIP = normalizeIP(ip);
  
  return ADMIN_WHITELIST.some(whitelistedRange => 
    isIPInRange(normalizedIP, whitelistedRange)
  );
};

/**
 * 地域制限チェック（簡易実装）
 */
const isCountryBlocked = async (ip) => {
  if (BLOCKED_COUNTRIES.length === 0) {
    return false;
  }
  
  try {
    // 実際の実装では GeoIP データベースや外部APIを使用
    // ここでは簡易的な実装
    
    // 開発環境やローカルIPは制限しない
    if (ip === '127.0.0.1' || ip === 'unknown' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return false;
    }
    
    // 実際の実装では IP地域判定サービスを使用
    // 例: MaxMind GeoIP2, ip-api.com など
    return false;
    
  } catch (error) {
    logger.error('Country check error:', error);
    return false; // エラー時は制限しない
  }
};

/**
 * 疑わしいアクセスパターンの検出
 */
const detectSuspiciousActivity = async (ip, path, userAgent) => {
  // 簡易的な疑わしいアクセスパターンの検出
  const suspiciousPatterns = [
    // ボットやスクレイパーのUser-Agent
    /bot|crawler|spider|scraper/i,
    // 自動化ツール
    /curl|wget|python|java|perl/i,
    // 攻撃ツール
    /sqlmap|nmap|nikto|burp/i
  ];
  
  if (userAgent) {
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    if (isSuspicious) {
      logger.warn(`Suspicious user agent detected: ${userAgent} from ${ip} accessing ${path}`);
      return true;
    }
  }
  
  return false;
};

/**
 * IP制限チェック
 */
const checkIPRestrictions = async (event, options = {}) => {
  const ip = getClientIP(event);
  const path = event.path || event.rawPath;
  const userAgent = event.headers?.['user-agent'] || '';
  const method = event.httpMethod || event.requestContext?.http?.method;
  
  logger.info(`IP restriction check: ${ip} accessing ${method} ${path}`);
  
  try {
    // 1. ブラックリストチェック
    if (isBlacklisted(ip)) {
      logger.warn(`Blocked IP attempting access: ${ip} to ${path}`);
      return createErrorResponse(403, 'IP_BLOCKED', 'このIPアドレスからのアクセスは制限されています');
    }
    
    // 2. 管理者エンドポイントのホワイトリストチェック
    if (path.includes('/admin/') && !isAdminWhitelisted(ip)) {
      logger.warn(`Non-whitelisted IP attempting admin access: ${ip} to ${path}`);
      return createErrorResponse(403, 'ADMIN_IP_RESTRICTED', '管理者機能は許可されたIPアドレスからのみアクセス可能です');
    }
    
    // 3. 地域制限チェック
    const isCountryRestricted = await isCountryBlocked(ip);
    if (isCountryRestricted) {
      logger.warn(`Country-blocked IP attempting access: ${ip} to ${path}`);
      return createErrorResponse(403, 'COUNTRY_RESTRICTED', 'この地域からのアクセスは制限されています');
    }
    
    // 4. 疑わしいアクセスパターンの検出
    if (options.checkSuspiciousActivity !== false) {
      const isSuspicious = await detectSuspiciousActivity(ip, path, userAgent);
      if (isSuspicious) {
        logger.warn(`Suspicious activity detected: ${ip} to ${path} with UA: ${userAgent}`);
        return createErrorResponse(403, 'SUSPICIOUS_ACTIVITY', '疑わしいアクセスパターンが検出されました');
      }
    }
    
    // 5. 開発環境での追加チェック
    if (process.env.NODE_ENV === 'development' && options.devModeRestrictions) {
      // 開発環境でのみ適用される制限
      if (path.includes('/admin/') && ip !== '127.0.0.1') {
        return createErrorResponse(403, 'DEV_MODE_RESTRICTION', '開発環境では localhost からのみアクセス可能です');
      }
    }
    
    logger.info(`IP restriction check passed for ${ip}`);
    return null; // 制限なし
    
  } catch (error) {
    logger.error(`IP restriction check error for ${ip}:`, error);
    // エラー時は安全側に倒してアクセスを制限
    return createErrorResponse(500, 'IP_CHECK_ERROR', 'IP制限チェック中にエラーが発生しました');
  }
};

/**
 * IP制限統計の取得（管理者用）
 */
const getIPStats = async () => {
  return {
    blacklistSize: IP_BLACKLIST.length,
    adminWhitelistSize: ADMIN_WHITELIST.length,
    blockedCountries: BLOCKED_COUNTRIES,
    // 実際の実装では DynamoDB から統計を取得
    recentBlocks: [],
    topBlockedIPs: []
  };
};

/**
 * 動的ブラックリスト管理
 */
const addToBlacklist = async (ip, reason, duration = null) => {
  logger.warn(`Adding IP to blacklist: ${ip}, reason: ${reason}`);
  
  // 実際の実装では DynamoDB に保存
  IP_BLACKLIST.push(ip);
  
  // 一時的な制限の場合はタイマーで自動削除
  if (duration) {
    setTimeout(() => {
      const index = IP_BLACKLIST.indexOf(ip);
      if (index > -1) {
        IP_BLACKLIST.splice(index, 1);
        logger.info(`Removed IP from temporary blacklist: ${ip}`);
      }
    }, duration);
  }
};

module.exports = {
  checkIPRestrictions,
  getClientIP,
  isBlacklisted,
  isAdminWhitelisted,
  getIPStats,
  addToBlacklist,
  detectSuspiciousActivity
};