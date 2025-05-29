/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/errorHandler.js
 * 
 * 説明: 
 * エラー処理を一元化するユーティリティ。
 * エラータイプに応じた処理を行い、ログ出力やアラート通知を統一的に実行します。
 * アプリケーション全体で一貫したエラーハンドリングを提供します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-17
 */
'use strict';

const alertService = require('../services/alerts');
const logger = require('./logger');
const { ERROR_CODES } = require('../config/constants');

/**
 * エラータイプの定義
 */
const errorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATA_SOURCE_ERROR: 'DATA_SOURCE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  CRITICAL_ERROR: 'CRITICAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  BUDGET_ERROR: 'BUDGET_ERROR'
};

/**
 * エラーコードとHTTPステータスコードのマッピング
 */
const statusCodes = {
  [errorTypes.VALIDATION_ERROR]: 400,
  [errorTypes.DATA_SOURCE_ERROR]: 502,
  [errorTypes.CACHE_ERROR]: 500,
  [errorTypes.AUTH_ERROR]: 401,
  [errorTypes.SERVER_ERROR]: 500,
  [errorTypes.CRITICAL_ERROR]: 500,
  [errorTypes.NETWORK_ERROR]: 503,
  [errorTypes.RATE_LIMIT_ERROR]: 429,
  [errorTypes.BUDGET_ERROR]: 403
};

/**
 * エラーコードとエラーメッセージのマッピング
 */
const defaultMessages = {
  [errorTypes.VALIDATION_ERROR]: 'リクエストパラメータが無効です',
  [errorTypes.DATA_SOURCE_ERROR]: 'データソースからの取得に失敗しました',
  [errorTypes.CACHE_ERROR]: 'キャッシュ操作中にエラーが発生しました',
  [errorTypes.AUTH_ERROR]: '認証に失敗しました',
  [errorTypes.SERVER_ERROR]: 'サーバー内部エラーが発生しました',
  [errorTypes.CRITICAL_ERROR]: '重大なエラーが発生しました',
  [errorTypes.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
  [errorTypes.RATE_LIMIT_ERROR]: 'APIレート制限に達しました',
  [errorTypes.BUDGET_ERROR]: 'APIバジェット制限に達しました'
};

/**
 * エラーを一元的に処理する関数
 * @param {Error} error - エラーオブジェクト
 * @param {string} type - エラータイプ（errorTypesから選択）
 * @param {Object} context - 追加コンテキスト情報
 * @returns {Promise<Object>} エラー情報オブジェクト
 */
const handleError = async (error, type, context = {}) => {
  // エラー情報を構築
  const errorInfo = {
    code: context.code || ERROR_CODES.SERVER_ERROR,
    message: error.message || defaultMessages[type] || 'Unknown error occurred',
    type,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  // エラータイプに応じたログ出力
  const isProd = process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
  const logContext = isProd ? { ...context, errorMessage: error.message } : { ...context, error };
  
  if (type === errorTypes.CRITICAL_ERROR) {
    logger.critical(`${type} Error Occurred`, logContext);
  } else {
    logger.error(`${type} Error Occurred`, logContext);
  }
  
  // 重要なエラーのみアラート送信
  if (
    type === errorTypes.CRITICAL_ERROR || 
    type === errorTypes.DATA_SOURCE_ERROR ||
    (context.alert === true)
  ) {
    try {
      await alertService.notifyError(
        `${type} Error Occurred`,
        error,
        {
          ...context,
          errorInfo
        }
      );
    } catch (alertError) {
      logger.error('Alert notification failed', alertError);
    }
  }
  
  return errorInfo;
};

/**
 * HTTP APIエラーレスポンスを生成する関数
 * @param {Error} error - エラーオブジェクト
 * @param {string} type - エラータイプ
 * @param {Object} context - 追加コンテキスト
 * @returns {Promise<Object>} APIレスポンスオブジェクト
 */
const createErrorResponse = async (error, type, context = {}) => {
  // エラー情報を取得
  const errorInfo = await handleError(error, type, context);
  const isProd = process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
  
  // HTTPステータスコードを決定
  const statusCode = context.statusCode || statusCodes[type] || 500;
  
  // エラーコードをテスト期待値に合わせる (すべて大文字のスネークケース)
  // 参照: __tests__/unit/utils/errorHandler.test.js
  // createSymbolNotFoundErrorのエラーコードを"INVALID_PARAMS"から"SYMBOL_NOT_FOUND"に修正
  let errorCode = context.code || errorInfo.code;
  if (!context.code) {
    if (type === errorTypes.VALIDATION_ERROR) {
      errorCode = 'INVALID_PARAMS';
    } else if (type === errorTypes.RATE_LIMIT_ERROR) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (type === errorTypes.BUDGET_ERROR) {
      errorCode = 'BUDGET_LIMIT_EXCEEDED';
    } else if (type === errorTypes.DATA_SOURCE_ERROR) {
      errorCode = 'DATA_SOURCE_ERROR';
    } else if (type === errorTypes.SERVER_ERROR) {
      errorCode = 'INTERNAL_SERVER_ERROR';
    }
  }
  
  // APIレスポンスを構築
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      error: {
        code: errorCode,
        message: errorInfo.message,
        ...(context.includeDetails && !isProd && { details: errorInfo.details || error.message }),
        ...(context.retryAfter && { retryAfter: context.retryAfter }),
        ...(context.usage && { usage: context.usage }),
        ...(context.requestId && { requestId: context.requestId })
      }
    }),
    headers: {
      'Content-Type': 'application/json',
      ...(context.headers || {}),
      ...(context.retryAfter && { 'Retry-After': context.retryAfter.toString() })
    }
  };
};

/**
 * シンボルが見つからないエラーを作成
 * @param {string} symbol - 見つからなかったシンボル
 * @returns {Promise<Object>} エラーレスポンス
 */
const createSymbolNotFoundError = async (symbol) => {
  return createErrorResponse(
    new Error(`Symbol "${symbol}" could not be found`),
    errorTypes.VALIDATION_ERROR,
    {
      statusCode: 404,
      code: 'SYMBOL_NOT_FOUND',
      symbol
    }
  );
};

/**
 * リクエスト検証エラーを作成
 * @param {Array<string>} errors - エラーメッセージの配列
 * @returns {Promise<Object>} エラーレスポンス
 */
const createValidationError = async (errors) => {
  return createErrorResponse(
    new Error(Array.isArray(errors) ? errors.join(', ') : errors),
    errorTypes.VALIDATION_ERROR,
    {
      statusCode: 400,
      code: 'INVALID_PARAMS',
      details: errors
    }
  );
};

/**
 * 認証エラーを作成
 * @param {string} message - エラーメッセージ
 * @returns {Promise<Object>} エラーレスポンス
 */
const createAuthError = async (message) => {
  return createErrorResponse(
    new Error(message),
    errorTypes.AUTH_ERROR,
    {
      statusCode: 401,
      code: 'UNAUTHORIZED'
    }
  );
};

/**
 * レート制限エラーを作成
 * @param {Object} usage - 使用量情報
 * @param {number} retryAfter - 再試行するまでの秒数
 * @returns {Promise<Object>} エラーレスポンス
 */
const createRateLimitError = async (usage, retryAfter = 60) => {
  return createErrorResponse(
    new Error('API rate limit exceeded'),
    errorTypes.RATE_LIMIT_ERROR,
    {
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      usage,
      retryAfter,
      headers: {
        'Retry-After': retryAfter.toString()
      }
    }
  );
};

/**
 * バジェット制限エラーを作成
 * @param {Object} usage - 使用量情報
 * @returns {Promise<Object>} エラーレスポンス
 */
const createBudgetLimitError = async (usage) => {
  return createErrorResponse(
    new Error('API budget limit exceeded'),
    errorTypes.BUDGET_ERROR,
    {
      statusCode: 403,
      code: 'BUDGET_LIMIT_EXCEEDED',
      usage
    }
  );
};

/**
 * サーバーエラーを作成
 * @param {string} message - エラーメッセージ
 * @param {string} requestId - リクエストID
 * @returns {Promise<Object>} エラーレスポンス
 */
const createServerError = async (message, requestId = `req-${Date.now()}`) => {
  return createErrorResponse(
    new Error(message),
    errorTypes.SERVER_ERROR,
    {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      requestId
    }
  );
};

module.exports = { 
  handleError,
  createErrorResponse,
  createSymbolNotFoundError,
  createValidationError,
  createAuthError,
  createRateLimitError,
  createBudgetLimitError,
  createServerError,
  errorTypes,
  statusCodes
};
