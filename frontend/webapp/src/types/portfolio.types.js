/**
 * ポートフォリオ関連の型定義
 * 
 * JavaScriptプロジェクトですが、JSDocを使用して型情報を提供します
 */

/**
 * @typedef {Object} BaseAsset
 * @property {string} id - 一意識別子
 * @property {string} ticker - ティッカーシンボル
 * @property {string} name - 資産名
 * @property {number} price - 価格
 * @property {number} holdings - 保有数量
 * @property {string} currency - 通貨
 * @property {string} lastUpdated - 最終更新日時
 * @property {string} source - データソース
 */

/**
 * @typedef {BaseAsset & {
 *   fundType: string,
 *   annualFee: number,
 *   feeSource?: string,
 *   feeIsEstimated?: boolean,
 *   isStock?: boolean,
 *   isMutualFund?: boolean,
 *   hasDividend?: boolean,
 *   dividendYield?: number,
 *   dividendFrequency?: string,
 *   dividendIsEstimated?: boolean
 * }} Asset
 */

/**
 * @typedef {Object} TargetAllocation
 * @property {string} id - ティッカーシンボル（互換性のため）
 * @property {string} ticker - ティッカーシンボル
 * @property {number} targetPercentage - 目標配分率（%）
 */

/**
 * @typedef {Object} ExchangeRate
 * @property {number} rate - 為替レート
 * @property {string} source - データソース
 * @property {string} lastUpdated - 最終更新日時
 * @property {boolean} [isDefault] - デフォルト値かどうか
 * @property {boolean} [isStale] - 古いデータかどうか
 */

/**
 * @typedef {Object} AdditionalBudget
 * @property {number} amount - 追加投資額
 * @property {string} currency - 通貨
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - 通知ID
 * @property {string} message - メッセージ
 * @property {'info' | 'success' | 'warning' | 'error'} type - 通知タイプ
 */

/**
 * @typedef {Object} SimulationResult
 * @property {Array<{ticker: string, shares: number, amount: number, percentage: number}>} purchases - 購入計画
 * @property {number} totalPurchaseAmount - 合計購入額
 * @property {number} remainingBudget - 残余予算
 * @property {Array<{ticker: string, newPercentage: number, targetPercentage: number, difference: number}>} newAllocations - 新しい配分
 * @property {number} projectedTotalAssets - 予想総資産額
 */

/**
 * @typedef {Object} ImportResult
 * @property {boolean} success - 成功フラグ
 * @property {string} message - メッセージ
 * @property {any} [data] - 追加データ
 */

/**
 * @typedef {Object} ValidationChanges
 * @property {number} fundType - ファンドタイプ変更数
 * @property {number} fees - 手数料変更数
 * @property {number} dividends - 配当変更数
 */

export default {};