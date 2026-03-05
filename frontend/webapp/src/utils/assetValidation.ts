/**
 * アセット検証ユーティリティ
 *
 * portfolioStoreから分離した検証ロジック
 */

import { Asset, ValidationChanges } from '../types/portfolio.types';
import { guessFundType, FUND_TYPES, FUND_TYPE_FEES, TICKER_SPECIFIC_FEES } from './fundUtils';

interface AssetValidationResult {
  updatedAssets: Asset[];
  changes: ValidationChanges;
}

/**
 * アセットのファンドタイプと手数料情報を検証・修正
 * @param {Array} assets - 検証する資産の配列
 * @returns {Object} 更新された資産と変更情報
 */
// ポートフォリオデータ全体の検証
interface PortfolioValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validatePortfolioData = (data: any): PortfolioValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['データが無効です'], warnings: [] };
  }

  if (!Array.isArray(data.currentAssets)) {
    errors.push('currentAssetsが無効です');
  }

  if (!Array.isArray(data.targetPortfolio)) {
    errors.push('targetPortfolioが無効です');
  }

  if (!data.baseCurrency) {
    errors.push('baseCurrencyが無効です');
  }

  if (!data.exchangeRate) {
    errors.push('exchangeRateが無効です');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// アセットデータのサニタイズ
interface SanitizedAsset {
  ticker: string;
  name?: string;
  holdings: number;
  annualFee: number;
  [key: string]: any;
}

const ALLOWED_ASSET_FIELDS = [
  'ticker', 'name', 'holdings', 'annualFee', 'fundType', 'isStock',
  'isMutualFund', 'feeSource', 'feeIsEstimated', 'hasDividend',
  'dividendYield', 'id', 'paysDividend', 'currency', 'price',
  'targetPercentage', 'currentPercentage'
];

export const sanitizeAssetData = (asset: any): SanitizedAsset => {
  const sanitized: any = {};

  for (const key of ALLOWED_ASSET_FIELDS) {
    if (asset[key] !== undefined) {
      sanitized[key] = asset[key];
    }
  }

  // 文字列フィールドをトリム
  if (typeof sanitized.ticker === 'string') {
    sanitized.ticker = sanitized.ticker.trim();
  }
  if (typeof sanitized.name === 'string') {
    sanitized.name = sanitized.name.trim();
  }

  // 数値フィールドをパース
  const holdingsVal = parseFloat(sanitized.holdings);
  sanitized.holdings = isNaN(holdingsVal) ? 0 : holdingsVal;

  const feeVal = parseFloat(sanitized.annualFee);
  sanitized.annualFee = isNaN(feeVal) ? 0 : feeVal;

  return sanitized;
};

// アセット入力の検証
interface InputValidation {
  isValid: boolean;
  errors: string[];
}

export const validateAssetInput = (input: any): InputValidation => {
  const errors: string[] = [];

  if (!input.ticker || typeof input.ticker !== 'string' || input.ticker.trim() === '') {
    errors.push('ティッカーが必要です');
  }

  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    errors.push('名前が必要です');
  }

  if (typeof input.holdings === 'number' && input.holdings < 0) {
    errors.push('保有数は0以上である必要があります');
  }

  if (typeof input.annualFee === 'number' && (input.annualFee < 0 || input.annualFee > 100)) {
    errors.push('年間手数料は0-100の範囲である必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ティッカー形式の検証
export const validateTickerFormat = (ticker: string): boolean => {
  if (!ticker || typeof ticker !== 'string' || ticker.trim() === '') {
    return false;
  }
  // 英字で始まるか数字4桁（.Tなど付き可）のパターン
  // 有効: AAPL, VTI, 7203.T, BRK.B, MSFT
  // 無効: 123, tick er, TICKER_WITH_UNDERSCORE
  const tickerPattern = /^[A-Za-z][A-Za-z0-9.]*$|^\d{4}(\.[A-Z])?$/;
  return tickerPattern.test(ticker.trim());
};

// アセット名の検証
export const validateAssetName = (name: string): boolean => {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return false;
  }
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
};

// 数値の範囲検証
export const validateNumericValue = (value: any, min: number, max: number): boolean => {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  return value >= min && value <= max;
};

export const validateAssetTypes = (assets: Asset[]): AssetValidationResult => {
  if (!Array.isArray(assets)) {
    return { updatedAssets: [], changes: { fundType: 0, fees: 0, dividends: 0 } };
  }

  let fundTypeChanges = 0;
  let feeChanges = 0;
  let dividendChanges = 0;

  const updatedAssets = assets.map((asset: Asset) => {
    const updatedAsset: Asset = { ...asset };

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
