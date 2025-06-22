const { getCorsHeaders, handleOptionsRequest } = require('../../utils/corsHeaders');
const logger = require('../../utils/logger');

/**
 * Get public configuration
 * 認証なしでアクセス可能な公開設定を返す
 */
exports.handler = async (event) => {
  try {
    // Handle OPTIONS request for CORS
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) {
      return optionsResponse;
    }

    logger.info('Getting public configuration');

    // 正しいGoogle Client IDを直接指定（AWS SDK v3の依存関係問題を回避）
    const googleClientId = '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com';

    // フロントエンドに公開可能な設定のみを返す
    const publicConfig = {
      marketDataApiUrl: process.env.API_GATEWAY_URL || '',
      apiStage: process.env.STAGE || 'dev',
      googleClientId: googleClientId,
      features: {
        useProxy: false,
        useMockApi: false,
        useDirectApi: true
      }
    };

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        data: publicConfig
      })
    };
  } catch (error) {
    logger.error('Error getting public configuration', { error });
    
    // エラーが発生してもフォールバック設定を返す
    const fallbackConfig = {
      marketDataApiUrl: process.env.API_GATEWAY_URL || '',
      apiStage: process.env.STAGE || 'dev',
      googleClientId: '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com', // エラー時もフォールバック値を使用
      features: {
        useProxy: false,
        useMockApi: false,
        useDirectApi: true
      }
    };

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        data: fallbackConfig,
        warning: 'Some configuration could not be loaded'
      })
    };
  }
};