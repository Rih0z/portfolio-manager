/**
 * ポートフォリオ計算サービス
 * 
 * Single Responsibility: ポートフォリオに関する計算ロジックのみを担当
 */

export class PortfolioCalculationService {
  /**
   * 総資産額を計算
   * @param {Array} assets - 資産の配列
   * @param {string} baseCurrency - 基準通貨
   * @param {Object} exchangeRate - 為替レート情報
   * @returns {number} 総資産額
   */
  static calculateTotalAssets(assets, baseCurrency, exchangeRate) {
    if (!assets || assets.length === 0) return 0;

    return assets.reduce((total, asset) => {
      let assetValue = asset.price * asset.holdings;
      
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
   * @param {Array} assets - 資産の配列
   * @param {string} baseCurrency - 基準通貨
   * @param {Object} exchangeRate - 為替レート情報
   * @returns {number} 年間手数料総額
   */
  static calculateAnnualFees(assets, baseCurrency, exchangeRate) {
    if (!assets || assets.length === 0) return 0;

    return assets.reduce((total, asset) => {
      let assetValue = asset.price * asset.holdings;
      
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
      const annualFee = assetValue * (asset.annualFee || 0) / 100;
      
      return total + annualFee;
    }, 0);
  }

  /**
   * 年間配当金総額を計算
   * @param {Array} assets - 資産の配列
   * @param {string} baseCurrency - 基準通貨
   * @param {Object} exchangeRate - 為替レート情報
   * @returns {number} 年間配当金総額
   */
  static calculateAnnualDividends(assets, baseCurrency, exchangeRate) {
    if (!assets || assets.length === 0) return 0;

    return assets.reduce((total, asset) => {
      if (!asset.hasDividend || !asset.dividendYield) return total;
      
      let assetValue = asset.price * asset.holdings;
      
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
      const annualDividend = assetValue * (asset.dividendYield / 100);
      
      return total + annualDividend;
    }, 0);
  }

  /**
   * 通貨換算
   * @param {number} amount - 金額
   * @param {string} fromCurrency - 元の通貨
   * @param {string} toCurrency - 変換先の通貨
   * @param {number} rate - 為替レート（USD/JPY）
   * @returns {number} 換算後の金額
   */
  static convertCurrency(amount, fromCurrency, toCurrency, rate) {
    if (fromCurrency === toCurrency) return amount;
    
    if (fromCurrency === 'USD' && toCurrency === 'JPY') {
      return amount * rate;
    } else if (fromCurrency === 'JPY' && toCurrency === 'USD') {
      return amount / rate;
    }
    
    // サポートされていない通貨ペア
    console.warn(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
    return amount;
  }

  /**
   * 各資産の現在の配分率を計算
   * @param {Array} assets - 資産の配列
   * @param {number} totalAssets - 総資産額
   * @param {string} baseCurrency - 基準通貨
   * @param {Object} exchangeRate - 為替レート情報
   * @returns {Array} 配分率を含む資産の配列
   */
  static calculateCurrentAllocations(assets, totalAssets, baseCurrency, exchangeRate) {
    if (!assets || assets.length === 0 || totalAssets === 0) return [];

    return assets.map(asset => {
      let assetValue = asset.price * asset.holdings;
      
      // 通貨換算
      if (asset.currency !== baseCurrency) {
        assetValue = this.convertCurrency(
          assetValue, 
          asset.currency, 
          baseCurrency, 
          exchangeRate.rate
        );
      }
      
      const percentage = (assetValue / totalAssets) * 100;
      
      return {
        ...asset,
        currentValue: assetValue,
        currentPercentage: percentage
      };
    });
  }

  /**
   * リバランスの差分を計算
   * @param {Array} currentAllocations - 現在の配分（currentPercentageを含む）
   * @param {Array} targetAllocations - 目標配分
   * @returns {Array} 差分情報を含む配列
   */
  static calculateRebalanceDifferences(currentAllocations, targetAllocations) {
    return currentAllocations.map(current => {
      const target = targetAllocations.find(t => t.ticker === current.ticker);
      const targetPercentage = target ? target.targetPercentage : 0;
      
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