'use strict';

/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/configManager.js
 *
 * 説明:
 * 環境変数からアプリケーション設定を読み込み、
 * デフォルト値や環境固有の設定を適用するユーティリティ。
 * 機密情報をマスクする機能も提供します。
 */

const defaultConfig = {
  APP_NAME: 'PortfolioMarketDataAPI',
  REGION: 'ap-northeast-1',
  LOG_LEVEL: 'info'
};

const envDefaults = {
  development: { LOG_LEVEL: 'debug' },
  test: { LOG_LEVEL: 'debug' },
  production: { LOG_LEVEL: 'warn' }
};

const sensitiveKeys = ['SECRET_KEY', 'ADMIN_API_KEY'];

let config = null;

const loadConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  config = {
    APP_NAME: process.env.APP_NAME || defaultConfig.APP_NAME,
    REGION: process.env.AWS_REGION || defaultConfig.REGION,
    LOG_LEVEL:
      process.env.LOG_LEVEL || envDefaults[env]?.LOG_LEVEL || defaultConfig.LOG_LEVEL,
    NODE_ENV: env,
    SECRET_KEY: process.env.SECRET_KEY || '',
    ADMIN_API_KEY: process.env.ADMIN_API_KEY || ''
  };
  return config;
};

const getConfig = (key) => {
  if (!config) loadConfig();
  if (key) return config[key];
  return sanitizeConfig({ ...config });
};

const sanitizeConfig = (cfg) => {
  const sanitized = { ...cfg };
  sensitiveKeys.forEach((k) => {
    if (sanitized[k]) sanitized[k] = '***';
  });
  return sanitized;
};

module.exports = {
  loadConfig,
  getConfig,
  sanitizeConfig
};
