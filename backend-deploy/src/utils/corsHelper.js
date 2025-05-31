/**
 * CORS設定ヘルパー
 * 
 * @file src/utils/corsHelper.js
 * @author Portfolio Manager Team
 * @created 2025-05-27
 */
'use strict';

/**
 * CORS用のヘッダーを取得する
 * @param {Object} additionalHeaders - 追加のヘッダー
 * @param {Object} event - API Gatewayイベント（オプション）
 * @returns {Object} CORSヘッダー
 */
const getCorsHeaders = (additionalHeaders = {}, event = null) => {
  // テスト環境では*を使用、それ以外は環境変数から取得
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
  
  let allowedOrigin = '*';
  
  // エラー時のフォールバック用に、よく使われるオリジンを定義
  const fallbackOrigin = 'http://localhost:3000';
  
  // 開発環境では特定のオリジンを許可
  if (!isTestEnv) {
    // 許可されたオリジンのリスト
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3001').split(',');
    
    // イベントからOriginヘッダーを取得
    if (event && event.headers) {
      const requestOrigin = event.headers.origin || event.headers.Origin;
      
      // デバッグ用ログ
      console.log('CORS Debug:', {
        requestOrigin,
        allowedOrigins,
        env: process.env.CORS_ALLOWED_ORIGINS
      });
      
      // リクエストのOriginが許可リストに含まれている場合はそれを使用
      if (requestOrigin && allowedOrigins.some(allowed => {
        // ワイルドカード対応
        if (allowed.includes('*')) {
          const regex = new RegExp('^' + allowed.replace('*', '.*') + '$');
          return regex.test(requestOrigin);
        }
        return allowed.trim() === requestOrigin;
      })) {
        allowedOrigin = requestOrigin;
      } else {
        // 許可リストにない場合はフォールバックオリジンを使用
        allowedOrigin = fallbackOrigin;
        console.log('CORS: Request origin not in allowed list, using fallback:', fallbackOrigin);
      }
    } else {
      // イベントがない場合はフォールバックオリジンを使用
      allowedOrigin = fallbackOrigin;
      console.log('CORS: No event provided, using fallback origin:', fallbackOrigin);
    }
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Cookie',
    'Access-Control-Max-Age': '86400', // 24時間
    ...additionalHeaders
  };
};

/**
 * プリフライトリクエスト（OPTIONS）用のレスポンスを生成
 * @returns {Object} OPTIONSレスポンス
 */
const getOptionsResponse = () => {
  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: ''
  };
};

module.exports = {
  getCorsHeaders,
  getOptionsResponse
};