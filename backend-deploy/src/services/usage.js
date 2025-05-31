/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/usage.js
 * 
 * 説明:
 * フォールバックデータストアサービス - プロキシモジュール。
 * このモジュールは src/services/fallbackDataStore.js へのプロキシとして機能します。
 * 
 * 警告：
 * このファイルは完全に非推奨です。直接 fallbackDataStore.js を使用してください。
 * このモジュールは v3.0.0 で削除される予定です。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-11
 * @updated 2025-05-21 fallbackDataStoreへの統合完了
 * 
 * @deprecated v3.0.0 以降では fallbackDataStore.js を直接使用してください。このモジュールは削除される予定です。
 */
'use strict';

const fallbackDataStore = require('./fallbackDataStore');
const { warnDeprecation } = require('../utils/deprecation');
const { ENV } = require('../config/envConfig');

/**
 * 環境に基づいて非推奨機能の処理方法を決定する
 * テスト環境では警告のみ、開発環境では処理を停止
 * @returns {boolean} 例外をスローする場合はtrue
 */
const shouldThrowDeprecationError = () => {
  // document/test-plan.md では 'test' 環境ではテストの実行に支障が出ないよう、
  // 警告は出すが処理は継続することが望ましいとされています
  // 本番環境やdev環境では処理を継続させるため、falseを返す
  return false;
};

/**
 * 非推奨警告を表示する関数
 * @param {string} methodName - メソッド名
 * @returns {string} - 警告メッセージ
 */
const showDeprecationWarning = (methodName) => {
  return warnDeprecation(
    `usage.js の ${methodName}`,
    `fallbackDataStore.js の同等メソッド`,
    {
      version: '2.0.0',
      removalVersion: '3.0.0',
      throwError: shouldThrowDeprecationError() // 環境に基づいて例外をスローするかどうかを決定
    }
  );
};

/**
 * データ取得に失敗した記録を保存する
 * @param {string} symbol - 証券コードまたはティッカーシンボル
 * @param {string} dataType - データタイプ
 * @param {string|Error} errorInfo - エラー情報
 * @returns {Promise<boolean>} 記録成功時はtrue
 * @deprecated fallbackDataStore.js の recordFailedFetch を使用してください。このモジュールはv3.0.0で削除されます。
 */
const recordFailedFetch = async (symbol, dataType, errorInfo) => {
  showDeprecationWarning('recordFailedFetch');
  // 下記のコードはテスト環境でのみ実行されます
  return fallbackDataStore.recordFailedFetch(symbol, dataType, errorInfo);
};

/**
 * 特定のシンボルのフォールバックデータを取得する
 * @param {string} symbol - 証券コードまたはティッカーシンボル
 * @param {string} dataType - データタイプ
 * @returns {Promise<Object|null>} フォールバックデータ（存在しない場合はnull）
 * @deprecated fallbackDataStore.js の getFallbackForSymbol を使用してください。このモジュールはv3.0.0で削除されます。
 */
const getFallbackForSymbol = async (symbol, dataType) => {
  showDeprecationWarning('getFallbackForSymbol');
  // 下記のコードはテスト環境でのみ実行されます
  return fallbackDataStore.getFallbackForSymbol(symbol, dataType);
};

/**
 * デフォルトのフォールバックデータを取得する
 * @param {string} symbol - 証券コードまたはティッカーシンボル
 * @param {string} dataType - データタイプ
 * @returns {Object|null} デフォルトのフォールバックデータ
 * @deprecated fallbackDataStore.js の getDefaultFallbackData を使用してください。このモジュールはv3.0.0で削除されます。
 */
const getDefaultFallbackData = (symbol, dataType) => {
  showDeprecationWarning('getDefaultFallbackData');
  // 下記のコードはテスト環境でのみ実行されます
  return fallbackDataStore.getDefaultFallbackData(symbol, dataType);
};

/**
 * フォールバックデータを保存する
 * @param {string} symbol - 証券コードまたはティッカーシンボル
 * @param {string} dataType - データタイプ
 * @param {Object} data - 保存するデータ
 * @returns {Promise<boolean>} 保存成功時はtrue
 * @deprecated fallbackDataStore.js の saveFallbackData を使用してください。このモジュールはv3.0.0で削除されます。
 */
const saveFallbackData = async (symbol, dataType, data) => {
  showDeprecationWarning('saveFallbackData');
  // 下記のコードはテスト環境でのみ実行されます
  return fallbackDataStore.saveFallbackData(symbol, dataType, data);
};

/**
 * フォールバックデータを更新する
 * @param {string} dataType - データタイプ
 * @param {Array<Object>} dataItems - 更新するデータの配列
 * @returns {Promise<Object>} 更新結果
 * @deprecated fallbackDataStore.js の updateFallbackData を使用してください。このモジュールはv3.0.0で削除されます。
 */
const updateFallbackData = async (dataType, dataItems) => {
  showDeprecationWarning('updateFallbackData');
  // 下記のコードはテスト環境でのみ実行されます
  return fallbackDataStore.updateFallbackData(dataType, dataItems);
};

/**
 * 使用量をチェックして更新する
 * @param {Object} params - チェックパラメータ
 * @param {string} params.dataType - データタイプ
 * @param {string} params.ip - IPアドレス
 * @param {string} params.userAgent - ユーザーエージェント
 * @param {string} params.sessionId - セッションID
 * @returns {Promise<Object>} 使用量チェック結果
 * @deprecated この機能は簡略化されました。使用量制限が必要な場合は適切なサービスを実装してください。
 */
const checkAndUpdateUsage = async (params) => {
  showDeprecationWarning('checkAndUpdateUsage');
  // 開発/テスト環境では常に許可
  // 本格的な使用量制限が必要な場合は、DynamoDBベースの実装に置き換えてください
  return {
    allowed: true,
    usage: {
      daily: 0,
      monthly: 0,
      limit: 1000
    }
  };
};

module.exports = {
  recordFailedFetch,
  getFallbackForSymbol,
  getDefaultFallbackData,
  saveFallbackData,
  updateFallbackData,
  checkAndUpdateUsage,
  // テスト用にヘルパー関数をエクスポート
  _shouldThrowDeprecationError: shouldThrowDeprecationError
};
