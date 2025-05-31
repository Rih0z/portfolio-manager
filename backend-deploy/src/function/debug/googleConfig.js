/**
 * Google OAuth設定デバッグエンドポイント
 * 開発時のトラブルシューティング用
 */
'use strict';

const { getApiKeys } = require('../../utils/secretsManager');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');

module.exports.handler = async (event) => {
  try {
    // ログでリクエスト確認
    console.log('Debug endpoint accessed:', {
      path: event.path,
      method: event.httpMethod,
      environment: process.env.NODE_ENV
    });

    console.log('Debug: Checking Google OAuth configuration...');
    
    const apiKeys = await getApiKeys();
    const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
    
    const config = {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdSource: apiKeys.googleClientId ? 'secrets-manager' : 'environment',
      clientSecretSource: apiKeys.googleClientSecret ? 'secrets-manager' : 'environment',
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'missing',
      environment: process.env.NODE_ENV,
      awsRegion: process.env.AWS_REGION
    };

    console.log('Google OAuth Debug Info:', config);

    // 提供されたクライアントIDが正しい形式かチェック
    if (clientId) {
      // クライアントIDの形式チェックのみ（ハードコーディングを避ける）
      config.clientIdFormat = {
        hasCorrectSuffix: clientId.endsWith('.apps.googleusercontent.com'),
        length: clientId.length,
        pattern: /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId)
      };
    }

    return formatResponse({
      statusCode: 200,
      body: {
        success: true,
        config,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Google config debug error:', error);
    
    return formatErrorResponse({
      statusCode: 500,
      message: 'Debug endpoint error',
      details: error.message
    });
  }
};