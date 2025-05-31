/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/functions/admin/getStatus.js
 * 
 * 説明: 
 * API使用状況とキャッシュ情報を取得する管理者向けAPIエンドポイント。
 * アクセスにはAPI Keyによる認証が必要です。
 * 日次・月次の使用量、キャッシュ内容、設定情報などを取得できます。
 */
const cacheService = require('../../services/cache');
const usageService = require('../../services/usage');
const { ADMIN, CACHE_TIMES } = require('../../config/constants');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');

// セキュリティミドルウェア
const { authenticate } = require('../../middleware/apiKeyAuth');
const { checkIPRestrictions } = require('../../middleware/ipRestriction');

/**
 * API使用状況とキャッシュ情報を取得するハンドラー
 * @param {Object} event - Lambda イベントオブジェクト
 * @param {Object} context - Lambda コンテキスト
 * @returns {Object} ステータス情報
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
    // セキュリティチェック（テスト環境では無効化）
    if (process.env.NODE_ENV !== 'test') {
      // IP制限チェック（管理者IPホワイトリスト）
      const ipRestrictionResult = await checkIPRestrictions(event);
      if (ipRestrictionResult) {
        return ipRestrictionResult;
      }
      
      // 管理者APIキー認証
      const authResult = await authenticate(event);
      if (authResult) {
        return authResult;
      }
    }
    
    // 使用量統計を取得
    const usageStats = await usageService.getUsageStats();
    
    // キャッシュ統計を取得
    const cacheStats = await cacheService.getStats();
    
    // 設定情報
    const config = {
      disableOnLimit: process.env.DISABLE_ON_LIMIT === 'true',
      cacheTimes: CACHE_TIMES,
      adminEmail: ADMIN.EMAIL ? ADMIN.EMAIL.substring(0, 3) + '...@' + ADMIN.EMAIL.split('@')[1] : 'Not configured'
    };
    
    // 情報をまとめる
    return formatResponse({
      statusCode: 200,
      headers,
      data: {
        timestamp: new Date().toISOString(),
        usage: usageStats.current,
        history: usageStats.history,
        cache: cacheStats,
        config
      }
    });
  } catch (error) {
    console.error('Error getting status information:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: 'ステータス情報の取得に失敗しました',
      details: error.message
    });
  }
};
