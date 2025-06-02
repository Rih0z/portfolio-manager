/**
 * 投資シミュレーションサービス
 * 
 * Single Responsibility: 投資シミュレーションの計算ロジックのみを担当
 */

import { PortfolioCalculationService } from './CalculationService';

export class SimulationService {
  /**
   * 追加投資シミュレーションを実行
   * @param {Object} params - シミュレーションパラメータ
   * @returns {Object} シミュレーション結果
   */
  static runSimulation({
    currentAssets,
    targetPortfolio,
    additionalBudget,
    baseCurrency,
    exchangeRate,
    includeCurrentHoldings = false
  }) {
    // 追加投資額を基準通貨に変換
    let budgetInBaseCurrency = additionalBudget.amount;
    if (additionalBudget.currency !== baseCurrency) {
      budgetInBaseCurrency = PortfolioCalculationService.convertCurrency(
        additionalBudget.amount,
        additionalBudget.currency,
        baseCurrency,
        exchangeRate.rate
      );
    }

    // 現在の総資産額を計算
    const currentTotalAssets = PortfolioCalculationService.calculateTotalAssets(
      currentAssets,
      baseCurrency,
      exchangeRate
    );

    // シミュレーション後の総資産額
    const projectedTotalAssets = currentTotalAssets + budgetInBaseCurrency;

    // 各銘柄の購入計画を計算
    const purchases = this.calculatePurchases({
      currentAssets,
      targetPortfolio,
      budgetInBaseCurrency,
      projectedTotalAssets,
      baseCurrency,
      exchangeRate,
      includeCurrentHoldings
    });

    // 購入後の新しい配分を計算
    const newAllocations = this.calculateNewAllocations({
      currentAssets,
      purchases,
      projectedTotalAssets,
      targetPortfolio,
      baseCurrency,
      exchangeRate
    });

    // 結果をまとめる
    return {
      purchases: purchases.filter(p => p.shares > 0),
      totalPurchaseAmount: purchases.reduce((sum, p) => sum + p.amount, 0),
      remainingBudget: budgetInBaseCurrency - purchases.reduce((sum, p) => sum + p.amount, 0),
      newAllocations,
      projectedTotalAssets,
      summary: this.generateSummary(purchases, budgetInBaseCurrency, baseCurrency)
    };
  }

  /**
   * 各銘柄の購入計画を計算
   * @private
   */
  static calculatePurchases({
    currentAssets,
    targetPortfolio,
    budgetInBaseCurrency,
    projectedTotalAssets,
    baseCurrency,
    exchangeRate,
    includeCurrentHoldings
  }) {
    const purchases = [];
    let remainingBudget = budgetInBaseCurrency;

    // 目標配分に基づいて購入額を計算
    targetPortfolio.forEach(target => {
      const asset = currentAssets.find(a => a.ticker === target.ticker);
      if (!asset) return;

      // 現在の資産価値（基準通貨）
      let currentValue = asset.price * asset.holdings;
      if (asset.currency !== baseCurrency) {
        currentValue = PortfolioCalculationService.convertCurrency(
          currentValue,
          asset.currency,
          baseCurrency,
          exchangeRate.rate
        );
      }

      // 目標金額
      const targetValue = projectedTotalAssets * (target.targetPercentage / 100);
      
      // 購入が必要な金額
      let purchaseAmount = targetValue - currentValue;
      
      // 現在の保有を考慮しない場合は、追加投資額の配分のみ
      if (!includeCurrentHoldings) {
        purchaseAmount = budgetInBaseCurrency * (target.targetPercentage / 100);
      }

      // 購入金額が正の場合のみ
      if (purchaseAmount > 0 && remainingBudget > 0) {
        // 予算制限を考慮
        const actualPurchaseAmount = Math.min(purchaseAmount, remainingBudget);
        
        // 購入株数を計算（資産の通貨で）
        let priceInBaseCurrency = asset.price;
        if (asset.currency !== baseCurrency) {
          priceInBaseCurrency = PortfolioCalculationService.convertCurrency(
            asset.price,
            asset.currency,
            baseCurrency,
            exchangeRate.rate
          );
        }
        
        const shares = Math.floor(actualPurchaseAmount / priceInBaseCurrency);
        const actualAmount = shares * priceInBaseCurrency;
        
        purchases.push({
          ticker: asset.ticker,
          name: asset.name,
          shares,
          amount: actualAmount,
          pricePerShare: priceInBaseCurrency,
          percentage: (actualAmount / budgetInBaseCurrency) * 100
        });
        
        remainingBudget -= actualAmount;
      }
    });

    return purchases;
  }

  /**
   * 購入後の新しい配分を計算
   * @private
   */
  static calculateNewAllocations({
    currentAssets,
    purchases,
    projectedTotalAssets,
    targetPortfolio,
    baseCurrency,
    exchangeRate
  }) {
    return currentAssets.map(asset => {
      const purchase = purchases.find(p => p.ticker === asset.ticker);
      const target = targetPortfolio.find(t => t.ticker === asset.ticker);
      
      // 新しい保有数
      const newHoldings = asset.holdings + (purchase ? purchase.shares : 0);
      
      // 新しい資産価値
      let newValue = asset.price * newHoldings;
      if (asset.currency !== baseCurrency) {
        newValue = PortfolioCalculationService.convertCurrency(
          newValue,
          asset.currency,
          baseCurrency,
          exchangeRate.rate
        );
      }
      
      // 新しい配分率
      const newPercentage = (newValue / projectedTotalAssets) * 100;
      const targetPercentage = target ? target.targetPercentage : 0;
      
      return {
        ticker: asset.ticker,
        name: asset.name,
        newHoldings,
        newValue,
        newPercentage,
        targetPercentage,
        difference: newPercentage - targetPercentage
      };
    });
  }

  /**
   * シミュレーション結果のサマリーを生成
   * @private
   */
  static generateSummary(purchases, budget, baseCurrency) {
    const totalPurchased = purchases.reduce((sum, p) => sum + p.amount, 0);
    const purchaseCount = purchases.filter(p => p.shares > 0).length;
    
    return {
      totalBudget: budget,
      totalPurchased,
      remainingBudget: budget - totalPurchased,
      utilizationRate: (totalPurchased / budget) * 100,
      purchaseCount,
      currency: baseCurrency
    };
  }

  /**
   * 購入実行（実際の購入処理）
   * @param {Array} purchases - 購入計画
   * @param {Array} currentAssets - 現在の資産
   * @returns {Array} 更新された資産配列
   */
  static executePurchases(purchases, currentAssets) {
    const updatedAssets = currentAssets.map(asset => {
      const purchase = purchases.find(p => p.ticker === asset.ticker);
      
      if (purchase && purchase.shares > 0) {
        return {
          ...asset,
          holdings: asset.holdings + purchase.shares,
          lastUpdated: new Date().toISOString()
        };
      }
      
      return asset;
    });

    return updatedAssets;
  }
}