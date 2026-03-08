/**
 * ポートフォリオ計算サービス
 *
 * Single Responsibility: ポートフォリオに関する計算ロジックのみを担当
 */

import type { Asset, TargetAllocation, ExchangeRate } from '../../types/portfolio.types';
import logger from '../../utils/logger';

interface AssetWithAllocation extends Asset {
  currentValue: number;
  currentPercentage: number;
}

interface RebalanceDifference {
  ticker: string;
  name: string;
  currentPercentage: number;
  targetPercentage: number;
  difference: number;
}

export class PortfolioCalculationService {
  /**
   * 総資産額を計算
   */
  static calculateTotalAssets(assets: Asset[], baseCurrency: string, exchangeRate: ExchangeRate): number {
    if (!assets || assets.length === 0) return 0;

    return assets.reduce((total: number, asset: Asset) => {
      let assetValue: number = asset.price * asset.holdings;

      // 通貨換算
      if (asset.currency !== baseCurrency) {
        assetValue = this.convertCurrency(
          assetValue,
          asset.currency,
          baseCurrency,
          exchangeRate.rate
        );
      }

      return total + assetValue;
    }, 0);
  }

  /**
   * 年間手数料総額を計算
   */
  static calculateAnnualFees(assets: Asset[], baseCurrency: string, exchangeRate: ExchangeRate): number {
    if (!assets || assets.length === 0) return 0;

    return assets.reduce((total: number, asset: Asset) => {
      let assetValue: number = asset.price * asset.holdings;

      // 通貨換算
      if (asset.currency !== baseCurrency) {
        assetValue = this.convertCurrency(
          assetValue,
          asset.currency,
          baseCurrency,
          exchangeRate.rate
        );
      }

      // 年間手数料を計算（パーセンテージから金額へ）
      const annualFee: number = assetValue * (asset.annualFee || 0) / 100;

      return total + annualFee;
    }, 0);
  }

  /**
   * 年間配当金総額を計算
   */
  static calculateAnnualDividends(assets: Asset[], baseCurrency: string, exchangeRate: ExchangeRate): number {
    if (!assets || assets.length === 0) return 0;

    return assets.reduce((total: number, asset: Asset) => {
      if (!asset.hasDividend || !asset.dividendYield) return total;

      let assetValue: number = asset.price * asset.holdings;

      // 通貨換算
      if (asset.currency !== baseCurrency) {
        assetValue = this.convertCurrency(
          assetValue,
          asset.currency,
          baseCurrency,
          exchangeRate.rate
        );
      }

      // 年間配当金を計算
      const annualDividend: number = assetValue * (asset.dividendYield / 100);

      return total + annualDividend;
    }, 0);
  }

  /**
   * 通貨換算
   */
  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rate: number): number {
    if (fromCurrency === toCurrency) return amount;

    if (fromCurrency === 'USD' && toCurrency === 'JPY') {
      return amount * rate;
    } else if (fromCurrency === 'JPY' && toCurrency === 'USD') {
      return amount / rate;
    }

    // サポートされていない通貨ペア
    logger.warn(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
    return amount;
  }

  /**
   * 各資産の現在の配分率を計算
   */
  static calculateCurrentAllocations(assets: Asset[], totalAssets: number, baseCurrency: string, exchangeRate: ExchangeRate): AssetWithAllocation[] {
    if (!assets || assets.length === 0 || totalAssets === 0) return [];

    return assets.map((asset: Asset) => {
      let assetValue: number = asset.price * asset.holdings;

      // 通貨換算
      if (asset.currency !== baseCurrency) {
        assetValue = this.convertCurrency(
          assetValue,
          asset.currency,
          baseCurrency,
          exchangeRate.rate
        );
      }

      const percentage: number = (assetValue / totalAssets) * 100;

      return {
        ...asset,
        currentValue: assetValue,
        currentPercentage: percentage
      };
    });
  }

  /**
   * リバランスの差分を計算
   */
  static calculateRebalanceDifferences(currentAllocations: AssetWithAllocation[], targetAllocations: TargetAllocation[]): RebalanceDifference[] {
    return currentAllocations.map((current: AssetWithAllocation) => {
      const target = targetAllocations.find(t => t.ticker === current.ticker);
      const targetPercentage: number = target ? target.targetPercentage : 0;

      return {
        ticker: current.ticker,
        name: current.name,
        currentPercentage: current.currentPercentage,
        targetPercentage: targetPercentage,
        difference: targetPercentage - current.currentPercentage
      };
    });
  }
}
