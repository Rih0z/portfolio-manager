/**
 * SimulationServiceのユニットテスト
 */

import { SimulationService } from '../../../services/portfolio/SimulationService';

describe('SimulationService', () => {
  const mockExchangeRate = {
    rate: 150.0,
    source: 'Test',
    lastUpdated: new Date().toISOString()
  };

  const mockCurrentAssets = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      price: 150,
      holdings: 10,
      currency: 'USD'
    },
    {
      ticker: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      price: 200,
      holdings: 5,
      currency: 'USD'
    },
    {
      ticker: '7203.T',
      name: 'トヨタ自動車',
      price: 2500,
      holdings: 100,
      currency: 'JPY'
    }
  ];

  const mockTargetPortfolio = [
    { ticker: 'AAPL', targetPercentage: 40 },
    { ticker: 'VTI', targetPercentage: 30 },
    { ticker: '7203.T', targetPercentage: 30 }
  ];

  const mockAdditionalBudget = {
    amount: 100000,
    currency: 'JPY'
  };

  describe('runSimulation', () => {
    it('追加投資シミュレーションを実行できる', () => {
      const result = SimulationService.runSimulation({
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: mockAdditionalBudget,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      });

      expect(result).toHaveProperty('purchases');
      expect(result).toHaveProperty('totalPurchaseAmount');
      expect(result).toHaveProperty('remainingBudget');
      expect(result).toHaveProperty('newAllocations');
      expect(result).toHaveProperty('projectedTotalAssets');
      expect(result).toHaveProperty('summary');

      expect(Array.isArray(result.purchases)).toBe(true);
      expect(Array.isArray(result.newAllocations)).toBe(true);
      expect(typeof result.totalPurchaseAmount).toBe('number');
      expect(typeof result.remainingBudget).toBe('number');
    });

    it('現在保有を含まない場合、追加投資額の配分のみ計算する', () => {
      const result = SimulationService.runSimulation({
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: mockAdditionalBudget,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      });

      // 追加投資額のみで配分される
      expect(result.totalPurchaseAmount).toBeLessThanOrEqual(mockAdditionalBudget.amount);
      expect(result.remainingBudget).toBeGreaterThanOrEqual(0);
    });

    it('通貨変換が正しく行われる', () => {
      const usdBudget = {
        amount: 1000,
        currency: 'USD'
      };

      const result = SimulationService.runSimulation({
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: usdBudget,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      });

      // USD予算がJPYに変換される（1000 * 150 = 150,000 JPY）
      const expectedBudgetInJPY = 1000 * 150;
      expect(result.summary.totalBudget).toBe(expectedBudgetInJPY);
    });

    it('空の目標ポートフォリオでも実行できる', () => {
      const result = SimulationService.runSimulation({
        currentAssets: mockCurrentAssets,
        targetPortfolio: [],
        additionalBudget: mockAdditionalBudget,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      });

      expect(result.purchases).toHaveLength(0);
      expect(result.totalPurchaseAmount).toBe(0);
      expect(result.remainingBudget).toBe(mockAdditionalBudget.amount);
    });

    it('includeCurrentHoldingsがデフォルトでfalseになる', () => {
      const result = SimulationService.runSimulation({
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: mockAdditionalBudget,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate
        // includeCurrentHoldingsを指定しない
      });

      expect(result).toHaveProperty('purchases');
      expect(result.totalPurchaseAmount).toBeLessThanOrEqual(mockAdditionalBudget.amount);
    });

    it('目標ポートフォリオに存在しない銘柄はスキップされる', () => {
      const targetWithMissingAsset = [
        { ticker: 'AAPL', targetPercentage: 50 },
        { ticker: 'MISSING_TICKER', targetPercentage: 50 } // 存在しない銘柄
      ];

      const result = SimulationService.runSimulation({
        currentAssets: mockCurrentAssets,
        targetPortfolio: targetWithMissingAsset,
        additionalBudget: mockAdditionalBudget,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      });

      // MISSING_TICKERの購入はスキップされ、AAPLのみ購入される
      expect(result.purchases.find(p => p.ticker === 'MISSING_TICKER')).toBeUndefined();
      expect(result.purchases.find(p => p.ticker === 'AAPL')).toBeDefined();
    });
  });

  describe('calculatePurchases', () => {
    it('目標配分に基づいて購入計画を作成する', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        budgetInBaseCurrency: 100000,
        projectedTotalAssets: 650000, // 現在資産 + 追加投資
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      const purchases = SimulationService.calculatePurchases(params);

      expect(Array.isArray(purchases)).toBe(true);
      purchases.forEach(purchase => {
        expect(purchase).toHaveProperty('ticker');
        expect(purchase).toHaveProperty('name');
        expect(purchase).toHaveProperty('shares');
        expect(purchase).toHaveProperty('amount');
        expect(purchase).toHaveProperty('pricePerShare');
        expect(purchase).toHaveProperty('percentage');
        expect(purchase.shares).toBeGreaterThanOrEqual(0);
        expect(purchase.amount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('calculateNewAllocations', () => {
    it('購入後の新しい配分を計算する', () => {
      const mockPurchases = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          shares: 10,
          amount: 225000, // 150 * 10 * 150 (JPY換算)
          pricePerShare: 22500
        }
      ];

      const newAllocations = SimulationService.calculateNewAllocations({
        currentAssets: mockCurrentAssets,
        purchases: mockPurchases,
        projectedTotalAssets: 650000,
        targetPortfolio: mockTargetPortfolio,
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate
      });

      expect(Array.isArray(newAllocations)).toBe(true);
      expect(newAllocations).toHaveLength(mockCurrentAssets.length);

      newAllocations.forEach(allocation => {
        expect(allocation).toHaveProperty('ticker');
        expect(allocation).toHaveProperty('name');
        expect(allocation).toHaveProperty('newHoldings');
        expect(allocation).toHaveProperty('newValue');
        expect(allocation).toHaveProperty('newPercentage');
        expect(allocation).toHaveProperty('targetPercentage');
        expect(allocation).toHaveProperty('difference');
      });

      // AAPLの新しい保有数は元の10 + 購入10 = 20になる
      const appleAllocation = newAllocations.find(a => a.ticker === 'AAPL');
      expect(appleAllocation.newHoldings).toBe(20);
    });
  });

  describe('generateSummary', () => {
    it('シミュレーション結果のサマリーを生成する', () => {
      const mockPurchases = [
        { ticker: 'AAPL', shares: 10, amount: 50000 },
        { ticker: 'VTI', shares: 5, amount: 30000 },
        { ticker: '7203.T', shares: 0, amount: 0 }
      ];

      const summary = SimulationService.generateSummary(mockPurchases, 100000, 'JPY');

      expect(summary).toEqual({
        totalBudget: 100000,
        totalPurchased: 80000, // 50000 + 30000
        remainingBudget: 20000, // 100000 - 80000
        utilizationRate: 80, // (80000 / 100000) * 100
        purchaseCount: 2, // shares > 0の購入のみカウント
        currency: 'JPY'
      });
    });

    it('購入がない場合のサマリー', () => {
      const summary = SimulationService.generateSummary([], 100000, 'JPY');

      expect(summary).toEqual({
        totalBudget: 100000,
        totalPurchased: 0,
        remainingBudget: 100000,
        utilizationRate: 0,
        purchaseCount: 0,
        currency: 'JPY'
      });
    });
  });

  describe('executePurchases', () => {
    it('購入を実行して資産を更新する', () => {
      const mockPurchases = [
        { ticker: 'AAPL', shares: 5 },
        { ticker: 'VTI', shares: 10 }
      ];

      const updatedAssets = SimulationService.executePurchases(mockPurchases, mockCurrentAssets);

      expect(updatedAssets).toHaveLength(mockCurrentAssets.length);

      // AAPLの保有数が10 + 5 = 15になる
      const appleAsset = updatedAssets.find(a => a.ticker === 'AAPL');
      expect(appleAsset.holdings).toBe(15);
      expect(appleAsset.lastUpdated).toBeDefined();

      // VTIの保有数が5 + 10 = 15になる
      const vtiAsset = updatedAssets.find(a => a.ticker === 'VTI');
      expect(vtiAsset.holdings).toBe(15);
      expect(vtiAsset.lastUpdated).toBeDefined();

      // 7203.Tは購入なしなので変更なし
      const toyotaAsset = updatedAssets.find(a => a.ticker === '7203.T');
      expect(toyotaAsset.holdings).toBe(100);
      expect(toyotaAsset.lastUpdated).toBeUndefined();
    });

    it('空の購入リストでも実行できる', () => {
      const updatedAssets = SimulationService.executePurchases([], mockCurrentAssets);

      expect(updatedAssets).toEqual(mockCurrentAssets);
    });

    it('存在しない銘柄の購入は無視される', () => {
      const invalidPurchases = [
        { ticker: 'INVALID', shares: 10 }
      ];

      const updatedAssets = SimulationService.executePurchases(invalidPurchases, mockCurrentAssets);

      expect(updatedAssets).toEqual(mockCurrentAssets);
    });
  });
});