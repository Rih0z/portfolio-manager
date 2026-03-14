/**
 * セキュリティ設定
 */
'use strict';

const { getStringEnv, getBooleanEnv, getArrayEnv } = require('../src/config/envConfig');

// 環境別セキュリティ設定
const securityConfig = {
  // 本番環境のセキュリティ設定
  production: {
    // CORS設定
    corsAllowedOrigins: [
      'https://portfolio-wise.com',
      'https://www.portfolio-wise.com',
      'https://app.portfolio-wise.com'
    ],
    
    // レート制限
    rateLimit: {
      enabled: true,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000,
      maxRequestsPerDay: 10000
    },
    
    // IP制限
    ipRestrictions: {
      // 管理者APIのIP制限（本番環境では必須）
      adminWhitelist: getArrayEnv('ADMIN_IP_WHITELIST', []),
      // ブラックリスト
      blacklist: getArrayEnv('IP_BLACKLIST', []),
      // 国別ブロック
      blockedCountries: getArrayEnv('BLOCKED_COUNTRIES', [])
    },
    
    // セキュリティヘッダー
    securityHeaders: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.portfolio-wise.com",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    
    // 認証設定
    auth: {
      sessionTimeout: 3600000, // 1時間
      maxSessionsPerUser: 5,
      requireHttps: true,
      cookieSecure: true,
      cookieSameSite: 'None'
    },
    
    // ログ設定
    logging: {
      level: 'warn',
      auditEnabled: true,
      sanitizeTokens: true,
      maskSensitiveData: true
    }
  },
  
  // 開発環境のセキュリティ設定
  development: {
    corsAllowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://portfolio-wise.com'
    ],
    
    rateLimit: {
      enabled: false,
      maxRequestsPerMinute: 300,
      maxRequestsPerHour: 10000,
      maxRequestsPerDay: 100000
    },
    
    ipRestrictions: {
      adminWhitelist: ['127.0.0.1', '::1'],
      blacklist: [],
      blockedCountries: []
    },
    
    securityHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block'
    },
    
    auth: {
      sessionTimeout: 86400000, // 24時間
      maxSessionsPerUser: 10,
      requireHttps: false,
      cookieSecure: false,
      cookieSameSite: 'Lax'
    },
    
    logging: {
      level: 'info',
      auditEnabled: false,
      sanitizeTokens: true,
      maskSensitiveData: false
    }
  }
};

// 現在の環境に応じた設定を取得
const getSecurityConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return securityConfig[env] || securityConfig.development;
};

// セキュリティチェック関数
const performSecurityChecks = () => {
  const config = getSecurityConfig();
  const errors = [];
  
  // 本番環境の必須チェック
  if (process.env.NODE_ENV === 'production') {
    // Secrets Manager の使用確認
    if (!getBooleanEnv('USE_SECRETS_MANAGER', false)) {
      errors.push('Production environment must use AWS Secrets Manager');
    }
    
    // HTTPS必須
    if (!config.auth.requireHttps) {
      errors.push('HTTPS is required in production');
    }
    
    // 管理者IPホワイトリスト必須
    if (!config.ipRestrictions.adminWhitelist || config.ipRestrictions.adminWhitelist.length === 0) {
      errors.push('Admin IP whitelist must be configured in production');
    }
    
    // レート制限必須
    if (!config.rateLimit.enabled) {
      errors.push('Rate limiting must be enabled in production');
    }
  }
  
  return errors;
};

module.exports = {
  getSecurityConfig,
  performSecurityChecks
};