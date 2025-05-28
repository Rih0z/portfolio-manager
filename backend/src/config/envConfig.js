/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/config/envConfig.js
 * 
 * 説明: 
 * 環境変数の取得と管理を一元化するモジュール。
 * デフォルト値の設定と型変換を行い、アプリケーション全体で
 * 一貫した環境設定を提供します。
 * 
 * @author Portfolio Manager Team
 * @updated 2025-05-17
 */
'use strict';

/**
 * 環境変数から数値を取得（デフォルト値付き）
 * @param {string} name - 環境変数名
 * @param {number} defaultValue - デフォルト値
 * @returns {number} 環境変数値（数値）
 */
const getNumberEnv = (name, defaultValue) => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return parseInt(value, 10);
};

/**
 * 環境変数から文字列を取得（デフォルト値付き）
 * @param {string} name - 環境変数名
 * @param {string} defaultValue - デフォルト値
 * @returns {string} 環境変数値（文字列）
 */
const getStringEnv = (name, defaultValue) => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
};

/**
 * 環境変数からブール値を取得（デフォルト値付き）
 * @param {string} name - 環境変数名
 * @param {boolean} defaultValue - デフォルト値
 * @returns {boolean} 環境変数値（ブール）
 */
const getBooleanEnv = (name, defaultValue) => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  // 'true', '1', 'yes', 'y'はtrueとして扱う
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
};

/**
 * 環境変数から配列を取得（デフォルト値付き）
 * @param {string} name - 環境変数名
 * @param {Array} defaultValue - デフォルト値
 * @param {string} separator - 区切り文字（デフォルトはカンマ）
 * @returns {Array} 環境変数値（配列）
 */
const getArrayEnv = (name, defaultValue = [], separator = ',') => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.split(separator).map(item => item.trim()).filter(Boolean);
};

/**
 * 環境変数からJSONを取得（デフォルト値付き）
 * @param {string} name - 環境変数名
 * @param {Object} defaultValue - デフォルト値
 * @returns {Object} 環境変数値（オブジェクト）
 */
const getJsonEnv = (name, defaultValue = {}) => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`Invalid JSON in environment variable ${name}`);
    return defaultValue;
  }
};

// アプリケーション環境設定
const ENV = {
  // 基本設定
  NODE_ENV: getStringEnv('NODE_ENV', 'development'),
  REGION: getStringEnv('AWS_REGION', 'ap-northeast-1'),
  SERVICE_NAME: getStringEnv('SERVICE_NAME', 'portfolio-market-data-api'),
  DYNAMODB_TABLE_PREFIX: getStringEnv('DYNAMODB_TABLE_PREFIX', 'portfolio-market-data-'),
  
  // API制限設定
  DAILY_REQUEST_LIMIT: getNumberEnv('DAILY_REQUEST_LIMIT', 5000),
  MONTHLY_REQUEST_LIMIT: getNumberEnv('MONTHLY_REQUEST_LIMIT', 100000),
  DISABLE_ON_LIMIT: getBooleanEnv('DISABLE_ON_LIMIT', true),
  
  // キャッシュ設定
  CACHE_TABLE: getStringEnv('CACHE_TABLE', undefined),
  CACHE_TIME_US_STOCK: getNumberEnv('CACHE_TIME_US_STOCK', 3600),       // 1時間
  CACHE_TIME_JP_STOCK: getNumberEnv('CACHE_TIME_JP_STOCK', 3600),       // 1時間
  CACHE_TIME_MUTUAL_FUND: getNumberEnv('CACHE_TIME_MUTUAL_FUND', 10800), // 3時間
  CACHE_TIME_EXCHANGE_RATE: getNumberEnv('CACHE_TIME_EXCHANGE_RATE', 21600), // 6時間
  DEFAULT_CACHE_TTL: getNumberEnv('DEFAULT_CACHE_TTL', 3600), // 1時間
  
  // タイムアウト設定
  JP_STOCK_SCRAPING_TIMEOUT: getNumberEnv('JP_STOCK_SCRAPING_TIMEOUT', 30000),
  US_STOCK_SCRAPING_TIMEOUT: getNumberEnv('US_STOCK_SCRAPING_TIMEOUT', 20000),
  MUTUAL_FUND_TIMEOUT: getNumberEnv('MUTUAL_FUND_TIMEOUT', 30000),
  YAHOO_FINANCE_API_TIMEOUT: getNumberEnv('YAHOO_FINANCE_API_TIMEOUT', 5000),
  
  // レート制限対策
  DATA_RATE_LIMIT_DELAY: getNumberEnv('DATA_RATE_LIMIT_DELAY', 500),
  SCRAPING_RATE_LIMIT_DELAY: getNumberEnv('SCRAPING_RATE_LIMIT_DELAY', 500),
  
  // スクレイピングブラックリスト設定
  SCRAPING_MAX_FAILURES: getNumberEnv('SCRAPING_MAX_FAILURES', 3),
  SCRAPING_COOLDOWN_DAYS: getNumberEnv('SCRAPING_COOLDOWN_DAYS', 7),
  SCRAPING_BLACKLIST_TABLE: getStringEnv('SCRAPING_BLACKLIST_TABLE', undefined),
  
  // API設定
  YAHOO_FINANCE_API_KEY: getStringEnv('YAHOO_FINANCE_API_KEY', ''),
  YAHOO_FINANCE_API_HOST: getStringEnv('YAHOO_FINANCE_API_HOST', 'yh-finance.p.rapidapi.com'),
  EXCHANGE_RATE_API_KEY: getStringEnv('EXCHANGE_RATE_API_KEY', ''),
  
  // 管理者設定
  ADMIN_EMAIL: getStringEnv('ADMIN_EMAIL', ''),
  ADMIN_API_KEY: getStringEnv('ADMIN_API_KEY', ''),
  CRON_SECRET: getStringEnv('CRON_SECRET', ''),
  
  // CORS設定
  CORS_ALLOW_ORIGIN: getStringEnv('CORS_ALLOW_ORIGIN', '*'),
  
  // Google認証設定
  GOOGLE_CLIENT_ID: getStringEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getStringEnv('GOOGLE_CLIENT_SECRET', ''),
  SESSION_EXPIRES_DAYS: getNumberEnv('SESSION_EXPIRES_DAYS', 7),
  SESSION_TABLE: getStringEnv('SESSION_TABLE', undefined),
  
  // Google Drive設定
  DRIVE_FOLDER_NAME: getStringEnv('DRIVE_FOLDER_NAME', 'PortfolioManagerData'),
  
  // 開発環境用エンドポイント設定
  DYNAMODB_ENDPOINT: getStringEnv('DYNAMODB_ENDPOINT', ''),
  AWS_ENDPOINT: getStringEnv('AWS_ENDPOINT', ''),
  SNS_ENDPOINT: getStringEnv('SNS_ENDPOINT', ''),
  STS_ENDPOINT: getStringEnv('STS_ENDPOINT', ''),
  
  // 予算設定
  BUDGET_CHECK_ENABLED: getBooleanEnv('BUDGET_CHECK_ENABLED', false),
  FREE_TIER_LIMIT: getNumberEnv('FREE_TIER_LIMIT', 25),
  
  // アラート設定
  SNS_TOPIC_ARN: getStringEnv('SNS_TOPIC_ARN', ''),
  
  // ログ設定
  LOG_LEVEL: getStringEnv('LOG_LEVEL', 'info'),
  
  // 定数
  DEFAULT_EXCHANGE_RATE: 148.5,
  
  // テスト設定
  IS_TEST: getBooleanEnv('IS_TEST', false)
};

// 環境変数のテーブル名を解決（未設定の場合は命名規則に従って生成）
if (!ENV.CACHE_TABLE) {
  ENV.CACHE_TABLE = `${ENV.DYNAMODB_TABLE_PREFIX || 'portfolio-market-data-'}-cache`;
}
if (!ENV.SESSION_TABLE) {
  ENV.SESSION_TABLE = `${ENV.DYNAMODB_TABLE_PREFIX || 'portfolio-market-data-'}-sessions`;
}
if (!ENV.SCRAPING_BLACKLIST_TABLE) {
  ENV.SCRAPING_BLACKLIST_TABLE = `${ENV.DYNAMODB_TABLE_PREFIX || 'portfolio-market-data-'}-scraping-blacklist`;
}

// 開発環境かどうかを判定
const isDevelopment = ENV.NODE_ENV === 'development' || ENV.NODE_ENV === 'test';

module.exports = {
  ENV,
  isDevelopment,
  getNumberEnv,
  getStringEnv,
  getBooleanEnv,
  getArrayEnv,
  getJsonEnv
};
