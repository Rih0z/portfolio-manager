// loggerのインポートを一時的に削除（getLogger関数が存在しないため）
// const { getLogger } = require('./logger');
// const logger = getLogger('corsHeaders');

/**
 * Get CORS headers for Lambda responses
 * @param {Object} event - Lambda event object
 * @returns {Object} CORS headers
 */
const getCorsHeaders = (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  
  // Get allowed origins from environment variable or use defaults
  const isProd = process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
  const defaultOrigins = isProd 
    ? 'https://portfolio-wise.com,https://www.portfolio-wise.com,https://app.portfolio-wise.com'
    : 'http://localhost:3001,http://localhost:3000,https://portfolio-wise.com,https://www.portfolio-wise.com,https://app.portfolio-wise.com';
  
  const allowedOriginsStr = process.env.CORS_ALLOWED_ORIGINS || defaultOrigins;
  const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim());
  
  // Check if the request origin is in the allowed list
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  // logger.debug('CORS origin check', { 
  //   requestOrigin: origin, 
  //   allowedOrigins, 
  //   selectedOrigin: corsOrigin 
  // });
  console.log('CORS origin check:', { 
    requestOrigin: origin, 
    allowedOrigins, 
    selectedOrigin: corsOrigin 
  });
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
};

/**
 * Get CORS headers for preflight OPTIONS requests
 * @param {Object} event - Lambda event object
 * @returns {Object} CORS headers for OPTIONS
 */
const getCorsOptionsHeaders = (event) => {
  const baseHeaders = getCorsHeaders(event);
  
  return {
    ...baseHeaders,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Cookie',
    'Access-Control-Max-Age': '86400'
  };
};

/**
 * Handle OPTIONS preflight request
 * @param {Object} event - Lambda event object
 * @returns {Object} Lambda response for OPTIONS request
 */
const handleOptionsRequest = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsOptionsHeaders(event),
      body: ''
    };
  }
  return null;
};

module.exports = {
  getCorsHeaders,
  getCorsOptionsHeaders,
  handleOptionsRequest
};