const { getCorsHeaders, handleOptionsRequest } = require('../../utils/corsHeaders');
const logger = require('../../utils/logger');
const { getGoogleClientId } = require('../../utils/secretsManager');
const { validateApiSecret } = require('../../middleware/apiSecretValidation');

/**
 * Get client configuration
 * フロントエンドに必要な設定情報を返す
 */
exports.handler = async (event) => {
  try {
    // Handle OPTIONS request for CORS
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) {
      return optionsResponse;
    }

    // APIシークレットの検証
    const validationError = validateApiSecret(event);
    if (validationError) {
      return validationError;
    }

    logger.info('Getting client configuration');

    // Google Client IDを取得
    const googleClientId = await getGoogleClientId();

    // フロントエンドに公開可能な設定のみを返す
    const clientConfig = {
      apiVersion: '1.0.0',
      features: {
        googleAuth: true,
        marketData: true,
        portfolioManagement: true
      },
      limits: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxPortfolioItems: 1000
      },
      supportedMarkets: ['us-stock', 'jp-stock', 'mutual-fund', 'exchange-rate'],
      cacheTime: {
        marketData: 3600, // 1時間
        portfolioData: 300  // 5分
      },
      googleClientId: googleClientId || ''
    };

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        data: clientConfig
      })
    };
  } catch (error) {
    logger.error('Error getting client configuration', { error });
    
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: false,
        error: {
          type: 'CONFIG_ERROR',
          message: 'Failed to get client configuration'
        }
      })
    };
  }
};