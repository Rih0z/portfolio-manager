/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/function/admin/getBudgetStatus.js
 * 
 * 説明: 
 * AWS予算情報を取得する管理者向けAPIエンドポイント。
 * 現在の予算使用状況と警告レベルを返します。
 * アクセスにはAPI Keyによる認証が必要です。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-16
 */
'use strict';

const { getBudgetStatus } = require('../../utils/budgetCheck');
const { ADMIN } = require('../../config/constants');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');

/**
 * 予算情報を取得するハンドラー
 * @param {Object} event - Lambda イベントオブジェクト
 * @param {Object} context - Lambda コンテキスト
 * @returns {Object} 予算情報
 */
exports.handler = async (event, context) => {
  // CORS ヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      console.warn('Invalid API key provided');
      return formatErrorResponse({
        statusCode: 401,
        headers,
        message: '無効なAPIキーです'
      });
    }
    
    // クエリパラメータの解析
    const queryParams = event.queryStringParameters || {};
    const forceRefresh = queryParams.refresh === 'true';
    
    // 予算情報を取得
    const budgetInfo = await getBudgetStatus(forceRefresh);
    
    // レスポンスを整形
    return formatResponse({
      statusCode: 200,
      headers,
      data: {
        budget: budgetInfo,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting budget status:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: '予算情報の取得に失敗しました',
      details: error.message
    });
  }
};
