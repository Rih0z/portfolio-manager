/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/functions/admin/resetUsage.js
 * 
 * 説明: 
 * API使用量カウンターをリセットする管理者向けAPIエンドポイント。
 * アクセスにはAPI Keyによる認証が必要です。
 * 日次・月次・全てのカウンター値を0にリセットできます。
 */
const usageService = require('../../services/usage');
const alertService = require('../../services/alerts');
const { ADMIN } = require('../../config/constants');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');

/**
 * 使用量カウンターをリセットするハンドラー
 * @param {Object} event - Lambda イベントオブジェクト
 * @param {Object} context - Lambda コンテキスト
 * @returns {Object} リセット結果
 */
exports.handler = async (event, context) => {
  // CORS ヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    
    // リクエストボディの解析
    let resetType = 'daily'; // デフォルト
    
    try {
      if (event.body) {
        const body = JSON.parse(event.body);
        if (body.resetType && ['daily', 'monthly', 'all'].includes(body.resetType)) {
          resetType = body.resetType;
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse request body:', parseError);
    }
    
    console.log(`Resetting usage counter: ${resetType}`);
    
    // 使用量カウンターをリセット
    const resetResult = await usageService.resetUsage(resetType);
    
    // リセット通知をアラートシステムに送信
    await alertService.sendAlert({
      subject: 'API Usage Counters Reset',
      message: `API usage counters have been reset: ${resetType}`,
      detail: JSON.stringify(resetResult)
    });
    
    return formatResponse({
      statusCode: 200,
      headers,
      data: resetResult
    });
  } catch (error) {
    console.error('Error resetting usage counters:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      headers,
      message: '使用量カウンターのリセットに失敗しました',
      details: error.message
    });
  }
};
