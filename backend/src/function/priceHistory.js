'use strict';

const priceHistoryService = require('../services/priceHistoryService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../utils/responseUtils');
const { ERROR_CODES } = require('../config/constants');
const { authenticateJwt } = require('../middleware/jwtAuth');
const logger = require('../utils/logger');

// 期間からstartDate/endDateを計算する
const periodToDateRange = (period) => {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate;

  switch (period) {
    case '1w':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case '1y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  return { startDate: startDate.toISOString().split('T')[0], endDate };
};

/**
 * 前日比と年初来の変化を計算する
 * @param {Array} prices - 価格データ配列（日付昇順）
 * @returns {{dayOverDay: {amount: number, percent: number}|null, yearToDate: {amount: number, percent: number}|null}}
 */
const calculateChanges = (prices) => {
  if (!prices || prices.length < 2) {
    return { dayOverDay: null, yearToDate: null };
  }

  const latest = prices[prices.length - 1];
  const previous = prices[prices.length - 2];

  const dayOverDay = {
    amount: latest.close - previous.close,
    percent: previous.close !== 0 ? ((latest.close - previous.close) / previous.close) * 100 : 0
  };

  // 年初来
  const yearStart = new Date().getFullYear().toString();
  const ytdPrice = prices.find(p => p.date >= `${yearStart}-01-01`);
  const yearToDate = ytdPrice ? {
    amount: latest.close - ytdPrice.close,
    percent: ytdPrice.close !== 0 ? ((latest.close - ytdPrice.close) / ytdPrice.close) * 100 : 0
  } : null;

  return { dayOverDay, yearToDate };
};

const handler = async (event) => {
  // OPTIONS リクエスト対応
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  // JWT認証
  const authError = await authenticateJwt(event);
  if (authError) return authError;

  try {
    const params = event.queryStringParameters || {};
    const { ticker, period = '1m' } = params;

    // パラメータバリデーション
    if (!ticker) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'ticker parameter is required',
        event
      });
    }

    // ticker format validation（英数字、ドット、ハイフンのみ許可、最大20文字）
    if (!/^[A-Za-z0-9.\-]{1,20}$/.test(ticker)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'ticker must be 1-20 alphanumeric characters (dots and hyphens allowed)',
        event
      });
    }

    const validPeriods = ['1w', '1m', '3m', '6m', '1y', 'ytd'];
    if (!validPeriods.includes(period)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: `period must be one of: ${validPeriods.join(', ')}`,
        event
      });
    }

    const { startDate, endDate } = periodToDateRange(period);
    const prices = await priceHistoryService.getPriceRange(ticker, startDate, endDate);
    const change = calculateChanges(prices);

    // 通貨はデータから推定
    const currency = prices.length > 0 ? prices[0].currency : null;

    return await formatResponse({
      statusCode: 200,
      data: {
        ticker,
        currency,
        period,
        prices: prices.map(p => ({ date: p.date, close: p.close, source: p.source })),
        change
      },
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('Price history API error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch price history',
      event
    });
  }
};

module.exports = { handler, periodToDateRange, calculateChanges };
