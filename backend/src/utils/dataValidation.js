/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/dataValidation.js
 * 
 * 説明: 
 * データの整合性と異常値を検出するためのユーティリティ。
 * 異常な価格変動や複数ソース間のデータ不一致を検出します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */
'use strict';

const { DATA_VALIDATION, ERROR_CODES } = require('../config/constants');
const cacheService = require('../services/cache');
const alertService = require('../services/alerts');

/**
 * データの異常値を検出する
 * @param {string} symbol - 銘柄コード
 * @param {string} dataType - データタイプ
 * @param {Object} newData - 新しいデータ
 * @param {Object} [previousData=null] - 以前のデータ（キャッシュから取得）
 * @returns {Promise<Object>} 検証結果
 */
const validateData = async (symbol, dataType, newData, previousData = null) => {
  // 検証結果
  const result = {
    isValid: true,
    issues: [],
    severity: 'NONE' // NONE, LOW, MEDIUM, HIGH
  };
  
  try {
    // previousDataが渡されていない場合はキャッシュから取得
    if (!previousData) {
      const cacheKey = `${dataType}:${symbol}`;
      const cachedItem = await cacheService.get(cacheKey);
      previousData = cachedItem ? cachedItem.data : null;
    }
    
    // 前回のデータがない場合は検証できない
    if (!previousData) {
      return result;
    }
    
    // 価格変動の検証
    if (newData.price !== undefined && previousData.price !== undefined) {
      const priceValidation = validatePriceChange(newData, previousData);
      
      if (!priceValidation.isValid) {
        result.isValid = false;
        result.issues.push(priceValidation.issue);
        result.severity = priceValidation.severity;
      }
    }
    
    // 追加の検証ロジックをここに追加
    
    return result;
  } catch (error) {
    console.error(`Error validating data for ${symbol}:`, error);
    // エラーがあっても処理を続行できるように
    return result;
  }
};

/**
 * 価格変動の異常を検出する
 * @param {Object} newData - 新しいデータ
 * @param {Object} previousData - 以前のデータ
 * @returns {Object} 検証結果
 */
const validatePriceChange = (newData, previousData) => {
  const result = {
    isValid: true,
    issue: null,
    severity: 'NONE'
  };
  
  // 価格が定義されていることを確認
  if (newData.price === undefined || previousData.price === undefined) {
    return result;
  }
  
  // 前回価格がゼロまたはnullの場合は検証できない
  if (previousData.price === 0 || previousData.price === null) {
    return result;
  }
  
  // 価格変動率を計算
  const priceChange = newData.price - previousData.price;
  const priceChangePercent = (priceChange / previousData.price) * 100;
  
  // 閾値を超える価格変動をチェック
  const absChangePercent = Math.abs(priceChangePercent);
  if (absChangePercent > DATA_VALIDATION.PRICE_CHANGE_THRESHOLD) {
    result.isValid = false;
    result.issue = {
      type: 'PRICE_CHANGE',
      message: `Abnormal price change detected: ${priceChangePercent.toFixed(2)}% (from ${previousData.price} to ${newData.price})`,
      changePercent: priceChangePercent,
      code: ERROR_CODES.DATA_VALIDATION_ERROR
    };
    
    // 変動率に応じた重大度を設定
    if (absChangePercent > 50) {
      result.severity = 'HIGH';
    } else if (absChangePercent > 30) {
      result.severity = 'MEDIUM';
    } else {
      result.severity = 'LOW';
    }
  }
  
  return result;
};

/**
 * 複数ソースからのデータの整合性を検証する
 * @param {string} symbol - 銘柄コード
 * @param {Array<Object>} dataArray - 複数ソースからのデータ配列
 * @returns {Object} 検証結果
 */
const validateMultiSourceData = (symbol, dataArray) => {
  const result = {
    isValid: true,
    issues: [],
    severity: 'NONE',
    recommended: null
  };
  
  // 十分なデータがない場合はチェックできない
  if (!dataArray || dataArray.length < 2) {
    return result;
  }
  
  // 価格の整合性を検証
  const prices = dataArray
    .filter(data => data && data.price !== undefined && data.price !== null)
    .map(data => data.price);
  
  if (prices.length >= 2) {
    // 価格の平均値を計算
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // 各価格の平均からの乖離を検証
    const deviations = prices.map(price => Math.abs((price - avgPrice) / avgPrice) * 100);
    
    // 最大乖離率
    const maxDeviation = Math.max(...deviations);
    
    // 乖離率が閾値を超える場合
    if (maxDeviation > DATA_VALIDATION.SOURCE_DIFFERENCE_THRESHOLD) {
      result.isValid = false;
      result.issues.push({
        type: 'SOURCE_DIFFERENCE',
        message: `Data inconsistency between sources: max deviation ${maxDeviation.toFixed(2)}% from average price ${avgPrice.toFixed(2)}`,
        maxDeviation,
        averagePrice: avgPrice,
        code: ERROR_CODES.DATA_VALIDATION_ERROR
      });
      
      // 乖離率に応じた重大度を設定
      if (maxDeviation > 25) {
        result.severity = 'HIGH';
      } else if (maxDeviation > 15) {
        result.severity = 'MEDIUM';
      } else {
        result.severity = 'LOW';
      }
      
      // 中央値に近いデータを推奨データとして選択
      const medianPrice = getMedian(prices);
      const closestToMedianIndex = prices
        .map((price, index) => ({ index, diff: Math.abs(price - medianPrice) }))
        .sort((a, b) => a.diff - b.diff)[0].index;
      
      result.recommended = dataArray[closestToMedianIndex];
    }
  }
  
  return result;
};

/**
 * 配列の中央値を取得する
 * @param {Array<number>} arr - 数値配列
 * @returns {number} 中央値
 */
const getMedian = (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
};

/**
 * 異常値が検出された場合のアラート通知
 * @param {string} symbol - 銘柄コード
 * @param {string} dataType - データタイプ
 * @param {Object} validationResult - 検証結果
 * @returns {Promise<void>}
 */
const notifyDataValidationIssue = async (symbol, dataType, validationResult) => {
  if (validationResult.isValid) return;
  
  // HEAVYの重大度のみアラート通知
  if (validationResult.severity !== 'HIGH') return;
  
  try {
    await alertService.throttledAlert({
      key: `data-validation:${symbol}`,
      subject: `Data Validation Issue: ${symbol}`,
      message: `Abnormal data detected for ${symbol} (${dataType})`,
      detail: {
        symbol,
        dataType,
        issues: validationResult.issues,
        severity: validationResult.severity,
        timestamp: new Date().toISOString()
      },
      intervalMinutes: 60 // 同じ銘柄のアラートは1時間に1回まで
    });
  } catch (error) {
    console.error(`Error sending data validation alert for ${symbol}:`, error);
  }
};

module.exports = {
  validateData,
  validatePriceChange,
  validateMultiSourceData,
  notifyDataValidationIssue
};
