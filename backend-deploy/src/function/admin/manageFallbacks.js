/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/function/admin/manageFallbacks.js
 * 
 * 説明: 
 * 管理者向けフォールバックデータ管理APIエンドポイント。
 * フォールバックデータの取得、エクスポート、統計情報の取得などを行います。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */
'use strict';

const fallbackDataStore = require('../../services/fallbackDataStore');
const { ADMIN } = require('../../config/constants');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const logger = require('../../utils/logger');

/**
 * フォールバックデータ管理ハンドラー
 * @param {Object} event - Lambda イベントオブジェクト
 * @param {Object} context - Lambda コンテキスト
 * @returns {Object} APIレスポンス
 */
exports.handler = async (event, context) => {
  // CORS ヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // OPTIONSリクエストをハンドル
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  try {
    // API Key認証
    const apiKey = event.headers['x-api-key'];
    
    if (!apiKey || apiKey !== ADMIN.API_KEY) {
      logger.warn('Invalid API key provided');
      return formatErrorResponse({
        statusCode: 401,
        headers,
        message: '無効なAPIキーです'
      });
    }
    
    // パラメータの解析
    const queryParams = event.queryStringParameters || {};
    const { action, symbol, type, days } = queryParams;
    
    // アクションに応じた処理
    switch (action) {
      case 'getFallbacks':
        // フォールバックデータの取得
        return await handleGetFallbacks(headers, queryParams);
      
      case 'exportToGitHub':
        // GitHubへエクスポート
        return await handleExportToGitHub(headers);
      
      case 'getStatistics':
        // 統計情報の取得
        return await handleGetStatistics(headers, days);
      
      case 'getFailedSymbols':
        // 失敗シンボルの取得
        return await handleGetFailedSymbols(headers, queryParams);
      
      default:
        // 無効なアクション
        return formatErrorResponse({
          statusCode: 400,
          headers,
          message: '無効なアクションです。有効なアクション: getFallbacks, exportToGitHub, getStatistics, getFailedSymbols'
        });
    }
  } catch (error) {
    logger.error('フォールバックデータ管理APIエラー:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: 'サーバーエラーが発生しました',
      details: error.message
    });
  }
};

/**
 * フォールバックデータ取得のハンドラー
 * @param {Object} headers - レスポンスヘッダー
 * @param {Object} queryParams - クエリパラメータ
 * @returns {Promise<Object>} APIレスポンス
 */
const handleGetFallbacks = async (headers, queryParams) => {
  const { symbol, type, refresh } = queryParams;
  const forceRefresh = refresh === 'true';
  
  try {
    if (symbol && type) {
      // 特定シンボルのフォールバックデータを取得
      const symbolData = await fallbackDataStore.getFallbackForSymbol(symbol, type);
      
      if (!symbolData) {
        return formatErrorResponse({
          statusCode: 404,
          headers,
          message: `シンボル ${symbol} のフォールバックデータが見つかりません`
        });
      }
      
      return formatResponse({
        statusCode: 200,
        headers,
        data: symbolData
      });
    } else {
      // 全フォールバックデータを取得
      const fallbackData = await fallbackDataStore.getFallbackData(forceRefresh);
      
      // データの件数を計算
      const counts = {
        stocks: Object.keys(fallbackData.stocks).length,
        etfs: Object.keys(fallbackData.etfs).length,
        mutualFunds: Object.keys(fallbackData.mutualFunds).length,
        exchangeRates: Object.keys(fallbackData.exchangeRates).length,
        total: 0
      };
      
      counts.total = counts.stocks + counts.etfs + counts.mutualFunds + counts.exchangeRates;
      
      return formatResponse({
        statusCode: 200,
        headers,
        data: {
          summary: counts,
          lastFetched: new Date().toISOString(),
          data: fallbackData
        }
      });
    }
  } catch (error) {
    logger.error('フォールバックデータ取得エラー:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: 'フォールバックデータの取得に失敗しました',
      details: error.message
    });
  }
};

/**
 * GitHubエクスポートのハンドラー
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Promise<Object>} APIレスポンス
 */
const handleExportToGitHub = async (headers) => {
  try {
    const result = await fallbackDataStore.exportCurrentFallbacksToGitHub();
    
    if (result) {
      return formatResponse({
        statusCode: 200,
        headers,
        data: {
          success: true,
          message: 'フォールバックデータを正常にGitHubにエクスポートしました',
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return formatErrorResponse({
        statusCode: 500,
        headers,
        message: 'GitHubへのエクスポートに失敗しました'
      });
    }
  } catch (error) {
    logger.error('GitHubエクスポートエラー:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: 'GitHubへのエクスポートに失敗しました',
      details: error.message
    });
  }
};

/**
 * 統計情報取得のハンドラー
 * @param {Object} headers - レスポンスヘッダー
 * @param {string} [days='7'] - 取得する日数
 * @returns {Promise<Object>} APIレスポンス
 */
const handleGetStatistics = async (headers, days = '7') => {
  try {
    const daysNumber = parseInt(days, 10) || 7;
    const statistics = await fallbackDataStore.getFailureStatistics(daysNumber);
    
    return formatResponse({
      statusCode: 200,
      headers,
      data: {
        statistics,
        days: daysNumber,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('統計情報取得エラー:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: '統計情報の取得に失敗しました',
      details: error.message
    });
  }
};

/**
 * 失敗シンボル取得のハンドラー
 * @param {Object} headers - レスポンスヘッダー
 * @param {Object} queryParams - クエリパラメータ
 * @returns {Promise<Object>} APIレスポンス
 */
const handleGetFailedSymbols = async (headers, queryParams) => {
  const { date, type } = queryParams;
  
  try {
    const failedSymbols = await fallbackDataStore.getFailedSymbols(date, type);
    
    return formatResponse({
      statusCode: 200,
      headers,
      data: {
        date: date || new Date().toISOString().split('T')[0],
        type: type || 'all',
        count: failedSymbols.length,
        symbols: failedSymbols
      }
    });
  } catch (error) {
    logger.error('失敗シンボル取得エラー:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: '失敗シンボルの取得に失敗しました',
      details: error.message
    });
  }
};
