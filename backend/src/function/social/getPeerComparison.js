'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const socialDbService = require('../../services/socialDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * GET /api/social/compare — 同年代のポートフォリオ比較データを取得
 * 認証は任意: 認証済みの場合はユーザーの順位パーセンタイルも返す
 */
const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  // 任意認証: 認証失敗してもリクエストは処理する
  let authenticatedUser = null;
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const authResult = await authenticateJwt(event);
    if (!authResult) {
      // 認証成功
      authenticatedUser = event.user;
    }
  }

  try {
    const ageGroup = event.queryStringParameters?.ageGroup;

    if (!ageGroup) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'ageGroup query parameter is required',
        event
      });
    }

    const validAgeGroups = ['20s', '30s', '40s', '50s', '60s+'];
    if (!validAgeGroups.includes(ageGroup)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: `ageGroup must be one of: ${validAgeGroups.join(', ')}`,
        event
      });
    }

    const peers = await socialDbService.getPeerComparison(ageGroup);

    if (peers.length === 0) {
      return await formatResponse({
        statusCode: 200,
        data: {
          ageGroup,
          averageAllocation: [],
          totalParticipants: 0,
          userRankPercentile: null
        },
        event,
        skipBudgetWarning: true
      });
    }

    // 平均アロケーションを計算
    const allocationMap = new Map();
    for (const peer of peers) {
      if (Array.isArray(peer.allocationSnapshot)) {
        for (const item of peer.allocationSnapshot) {
          const existing = allocationMap.get(item.category) || { total: 0, count: 0 };
          existing.total += item.percentage;
          existing.count += 1;
          allocationMap.set(item.category, existing);
        }
      }
    }

    const averageAllocation = Array.from(allocationMap.entries()).map(([category, data]) => ({
      category,
      percentage: Math.round((data.total / peers.length) * 10) / 10
    })).sort((a, b) => b.percentage - a.percentage);

    // ユーザーの順位パーセンタイルを計算（認証済みの場合）
    let userRankPercentile = null;
    if (authenticatedUser) {
      const userShare = peers.find(p => p.userId === authenticatedUser.userId);
      if (userShare) {
        const sortedByScore = [...peers].sort((a, b) => b.portfolioScore - a.portfolioScore);
        const userIndex = sortedByScore.findIndex(p => p.shareId === userShare.shareId);
        if (userIndex >= 0) {
          userRankPercentile = Math.round(((userIndex + 1) / sortedByScore.length) * 100);
        }
      }
    }

    // userId を除外して返す
    return await formatResponse({
      statusCode: 200,
      data: {
        ageGroup,
        averageAllocation,
        totalParticipants: peers.length,
        userRankPercentile
      },
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('getPeerComparison error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch peer comparison data',
      event
    });
  }
};

module.exports = { handler };
