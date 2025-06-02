/**
 * アセット検証ユーティリティ
 * 
 * PortfolioContextから分離した検証ロジック
 */

import { guessFundType, FUND_TYPES, FUND_TYPE_FEES, TICKER_SPECIFIC_FEES } from './fundUtils';

/**
 * アセットのファンドタイプと手数料情報を検証・修正
 * @param {Array} assets - 検証する資産の配列
 * @returns {Object} 更新された資産と変更情報
 */
export const validateAssetTypes = (assets) => {
  if (!Array.isArray(assets)) {
    return { updatedAssets: [], changes: { fundType: 0, fees: 0, dividends: 0 } };
  }

  let fundTypeChanges = 0;
  let feeChanges = 0;
  let dividendChanges = 0;

  const updatedAssets = assets.map(asset => {
    const updatedAsset = { ...asset };
    
    // ティッカーと名前を確実に取得
    const ticker = asset.ticker || asset.id || '';
    const name = asset.name || ticker;
    
    // 1. ファンドタイプの検証と修正
    const correctFundType = guessFundType(ticker, name);
    
    if (!asset.fundType || asset.fundType === 'unknown' || asset.fundType === '不明') {
      updatedAsset.fundType = correctFundType;
      fundTypeChanges++;
    } else if (asset.fundType !== correctFundType) {
      // 既存のファンドタイプが推測と異なる場合も修正
      console.log(`ファンドタイプを修正: ${ticker} - ${asset.fundType} → ${correctFundType}`);
      updatedAsset.fundType = correctFundType;
      fundTypeChanges++;
    }
    
    // 2. isStockフラグの設定
    updatedAsset.isStock = updatedAsset.fundType === FUND_TYPES.STOCK;
    updatedAsset.isMutualFund = updatedAsset.fundType === FUND_TYPES.MUTUAL_FUND;
    
    // 3. 手数料情報の検証と修正
    if (updatedAsset.isStock) {
      // 個別株の手数料は0
      if (asset.annualFee !== 0) {
        updatedAsset.annualFee = 0;
        updatedAsset.feeSource = '個別株';
        updatedAsset.feeIsEstimated = false;
        feeChanges++;
      }
    } else {
      // ファンドの手数料を検証
      const tickerUpperCase = ticker.toUpperCase();
      
      // 特定銘柄の手数料情報がある場合
      if (TICKER_SPECIFIC_FEES[tickerUpperCase] !== undefined) {
        const specificFee = TICKER_SPECIFIC_FEES[tickerUpperCase];
        if (asset.annualFee !== specificFee) {
          updatedAsset.annualFee = specificFee;
          updatedAsset.feeSource = 'データベース';
          updatedAsset.feeIsEstimated = false;
          feeChanges++;
        }
      } 
      // ファンドタイプに基づく推定手数料
      else if (!asset.annualFee || asset.annualFee === 0) {
        const estimatedFee = FUND_TYPE_FEES[updatedAsset.fundType] || 0.5;
        updatedAsset.annualFee = estimatedFee;
        updatedAsset.feeSource = '推定';
        updatedAsset.feeIsEstimated = true;
        feeChanges++;
      }
    }
    
    // 4. 配当情報の検証
    if (asset.hasDividend && (!asset.dividendYield || asset.dividendYield === 0)) {
      // 配当ありなのに利回りが0の場合は配当なしに修正
      updatedAsset.hasDividend = false;
      dividendChanges++;
    }
    
    return updatedAsset;
  });

  return {
    updatedAssets,
    changes: {
      fundType: fundTypeChanges,
      fees: feeChanges,
      dividends: dividendChanges
    }
  };
};