/**
 * OPTIONSリクエストハンドラー - CORS プリフライトリクエスト対応
 * 
 * @file src/function/common/options.js
 * @author Portfolio Manager Team
 * @created 2025-05-27
 */
'use strict';

const { getOptionsResponse } = require('../../utils/corsHelper');

/**
 * OPTIONSリクエストハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.handler = async (event) => {
  return getOptionsResponse();
};