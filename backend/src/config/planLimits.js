/**
 * プラン制限定義
 *
 * Free / Standard プランごとの機能制限値を定義する。
 * 各サービスやミドルウェアから参照される中央定数ファイル。
 *
 * @file src/config/planLimits.js
 */
'use strict';

const PLAN_TYPES = {
  FREE: 'free',
  STANDARD: 'standard',
};

const USAGE_TYPES = {
  MARKET_DATA: 'marketData',
  SIMULATION: 'simulation',
  AI_PROMPT: 'aiPrompt',
  EXPORT: 'export',
};

/**
 * プラン別制限定義
 *
 * holdings: 保有銘柄数上限
 * marketData: 市場データリクエスト/日
 * simulation: シミュレーション回数/月
 * aiPrompt: AIプロンプト生成回数/月
 * pfScoreIndicators: PFスコア指標数
 * exportFormats: エクスポート形式
 * driveAutoBackup: 自動バックアップ有無
 * adFree: 広告非表示
 */
const PLAN_LIMITS = {
  [PLAN_TYPES.FREE]: {
    holdings: 5,
    marketData: { daily: 3 },
    simulation: { monthly: 3 },
    aiPrompt: { monthly: 1 },
    pfScoreIndicators: 3,
    exportFormats: ['csv'],
    driveAutoBackup: false,
    adFree: false,
    rateLimit: { hourly: 30, daily: 100 },
  },
  [PLAN_TYPES.STANDARD]: {
    holdings: Infinity,
    marketData: { daily: Infinity },
    simulation: { monthly: Infinity },
    aiPrompt: { monthly: Infinity },
    pfScoreIndicators: 8,
    exportFormats: ['csv', 'json', 'pdf'],
    driveAutoBackup: true,
    adFree: true,
    rateLimit: { hourly: 300, daily: 3000 },
  },
};

/**
 * プラン料金（JPY）
 */
const PLAN_PRICING = {
  [PLAN_TYPES.STANDARD]: {
    monthly: 700,
    annual: 7000,
    currency: 'jpy',
  },
};

/**
 * プランタイプが有効か確認
 * @param {string} planType
 * @returns {boolean}
 */
const isValidPlanType = (planType) => {
  return Object.values(PLAN_TYPES).includes(planType);
};

/**
 * プラン制限値を取得
 * @param {string} planType
 * @returns {Object}
 */
const getPlanLimits = (planType) => {
  return PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.FREE];
};

/**
 * 特定の使用量タイプの制限値を取得
 * @param {string} planType
 * @param {string} usageType - USAGE_TYPES のいずれか
 * @returns {Object|number}
 */
const getUsageLimit = (planType, usageType) => {
  const limits = getPlanLimits(planType);
  return limits[usageType];
};

module.exports = {
  PLAN_TYPES,
  PLAN_LIMITS,
  PLAN_PRICING,
  USAGE_TYPES,
  isValidPlanType,
  getPlanLimits,
  getUsageLimit,
};
