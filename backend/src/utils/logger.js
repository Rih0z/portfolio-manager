/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/logger.js
 * 
 * 説明:
 * ログ出力ユーティリティ。
 * 環境に応じたログレベルとフォーマットを適用し、統一的なログ出力を提供します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-08
 */
'use strict';

// 環境設定
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * ログレベル
 */
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * 現在のログレベル（環境変数または環境に応じたデフォルト値）
 * CloudWatchコスト削減のため、本番環境ではWARNレベルに設定
 */
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || 
  (isProduction ? LOG_LEVELS.WARN : 
   isDevelopment ? LOG_LEVELS.INFO : 
   isTest ? LOG_LEVELS.ERROR : LOG_LEVELS.WARN);

/**
 * ログレベルの重要度マップ
 */
const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.DEBUG]: 0,
  [LOG_LEVELS.INFO]: 1,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.ERROR]: 3,
  [LOG_LEVELS.CRITICAL]: 4
};

/**
 * ログレベルをチェックする
 * @param {string} level - ログレベル
 * @returns {boolean} 出力すべきか
 */
const shouldLog = (level) => {
  const currentPriority = LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL] || 0;
  const messagePriority = LOG_LEVEL_PRIORITY[level] || 0;
  return messagePriority >= currentPriority;
};

/**
 * ログメッセージをフォーマットする
 * @param {string} level - ログレベル
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加のログ引数
 * @returns {string} フォーマット済みログメッセージ
 */
const formatLog = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message} ${args.map(arg => stringify(arg)).join(' ')}`;
};

/**
 * オブジェクトを文字列化する
 * @param {any} obj - 文字列化するオブジェクト
 * @returns {string} 文字列化されたオブジェクト
 */
const stringify = (obj) => {
  if (obj instanceof Error) {
    return obj.stack || obj.message;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return '[Object]';
    }
  }
  
  return String(obj);
};

/**
 * デバッグレベルのログを出力
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加のログ引数
 */
const debug = (message, ...args) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(formatLog(LOG_LEVELS.DEBUG, message, ...args));
  }
};

/**
 * 情報レベルのログを出力
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加のログ引数
 */
const info = (message, ...args) => {
  if (shouldLog(LOG_LEVELS.INFO)) {
    console.log(formatLog(LOG_LEVELS.INFO, message, ...args));
  }
};

/**
 * 警告レベルのログを出力
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加のログ引数
 */
const warn = (message, ...args) => {
  if (shouldLog(LOG_LEVELS.WARN)) {
    console.warn(formatLog(LOG_LEVELS.WARN, message, ...args));
  }
};

/**
 * エラーレベルのログを出力
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加のログ引数
 */
const error = (message, ...args) => {
  if (shouldLog(LOG_LEVELS.ERROR)) {
    console.error(formatLog(LOG_LEVELS.ERROR, message, ...args));
  }
};

/**
 * 致命的なエラーレベルのログを出力
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加のログ引数
 */
const critical = (message, ...args) => {
  if (shouldLog(LOG_LEVELS.CRITICAL)) {
    console.error(formatLog(LOG_LEVELS.CRITICAL, message, ...args));
  }
};

/**
 * ログ設定を取得する
 * @returns {Object} 現在のログ設定
 */
const getLogConfig = () => {
  return {
    level: CURRENT_LOG_LEVEL,
    environment: process.env.NODE_ENV || 'unknown',
    isProduction,
    isDevelopment,
    isTest
  };
};

// 標準形式でログ記録
const log = info;

module.exports = {
  debug,
  info,
  warn,
  error,
  critical,
  log,
  getLogConfig,
  LOG_LEVELS
};
