/**
 * プラン制限ミドルウェア
 *
 * JWT / セッションからユーザーの planType を特定し、
 * 使用量制限をチェックするミドルウェア関数を提供する。
 *
 * @file src/middleware/planLimitation.js
 */
'use strict';

const { verifyAccessToken } = require('../utils/jwtUtils');
const { getUserPlanType } = require('../services/userService');
const { checkUsageLimit, recordUsage } = require('../services/usageTrackingService');
const { PLAN_TYPES } = require('../config/planLimits');
const { formatErrorResponse } = require('../utils/responseUtils');
const logger = require('../utils/logger');

/**
 * JWT トークンからユーザーIDとプランタイプを取得
 * @param {Object} event - Lambda event
 * @returns {Promise<{userId: string, planType: string}|null>}
 */
const extractUserInfo = async (event) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyAccessToken(token);
    const userId = decoded.sub;

    // JWT に planType が含まれている場合はそれを使用
    if (decoded.planType) {
      return { userId, planType: decoded.planType };
    }

    // DB から取得
    const planType = await getUserPlanType(userId);
    return { userId, planType };
  } catch (error) {
    logger.warn('Plan limitation: token verification failed', { error: error.message });
    return null;
  }
};

/**
 * プラン制限チェックミドルウェアを作成
 *
 * @param {string} usageType - USAGE_TYPES のいずれか ('marketData', 'simulation', 'aiPrompt', 'export')
 * @returns {Function} ミドルウェア関数 (event) => errorResponse | null
 */
const checkPlanLimit = (usageType) => {
  return async (event) => {
    const userInfo = await extractUserInfo(event);

    // 未認証ユーザーは Free として扱う（レート制限は別途IPベースで適用）
    if (!userInfo) {
      return null; // 認証不要のエンドポイントでは通過させる
    }

    const { userId, planType } = userInfo;

    try {
      const result = await checkUsageLimit(userId, planType, usageType);

      if (!result.allowed) {
        logger.info('Plan limit reached', { userId, usageType, planType, current: result.current, limit: result.limit });

        return formatErrorResponse({
          statusCode: 429,
          code: 'PLAN_LIMIT_EXCEEDED',
          message: planType === PLAN_TYPES.FREE
            ? `無料プランの${getUsageTypeLabel(usageType)}上限に達しました。Standardプランにアップグレードしてください。`
            : `${getUsageTypeLabel(usageType)}の上限に達しました。`,
          details: {
            usageType,
            current: result.current,
            limit: result.limit,
            planType,
            upgradeUrl: '/pricing',
          },
          event,
        });
      }

      // 使用量を記録（レスポンス後でも良いが、確実に記録するためここで実行）
      await recordUsage(userId, usageType);
      return null; // 通過
    } catch (error) {
      logger.error('Plan limitation check error', { userId, usageType, error: error.message });
      // エラー時は通過させる（サービス低下を防ぐ）
      return null;
    }
  };
};

/**
 * 使用量タイプの日本語ラベル
 */
const getUsageTypeLabel = (usageType) => {
  const labels = {
    marketData: '市場データリクエスト',
    simulation: 'シミュレーション',
    aiPrompt: 'AIプロンプト生成',
    export: 'エクスポート',
  };
  return labels[usageType] || usageType;
};

module.exports = {
  checkPlanLimit,
  extractUserInfo,
};
