/**
 * OPTIONSリクエストハンドラー - CORS プリフライトリクエスト対応
 * 
 * @file src/function/common/options.js
 * @author Portfolio Manager Team
 * @created 2025-05-27
 */
'use strict';

const { handleOptionsRequest, getCorsOptionsHeaders } = require('../../utils/corsHeaders');

/**
 * OPTIONSリクエストハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.handler = async (event) => {
  return handleOptionsRequest(event) || {
    statusCode: 200,
    headers: getCorsOptionsHeaders(event),
    body: '',
  };
};