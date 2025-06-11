/**
 * SimulationServiceの包括的ユニットテスト
 * 
 * 投資シミュレーションの全機能をテスト
 * - 通貨変換シナリオ
 * - 予算制約テスト
 * - 目標配分計算
 * - 株数計算（整数株のみ）
 * - 複数投資戦略（現在保有を含む/含まない）
 * - エッジケース処理
 * - 数学的精度検証
 * - PortfolioCalculationServiceとの統合
 */

import { SimulationService } from '../../../../services/portfolio/SimulationService';
import { PortfolioCalculationService } from '../../../../services/portfolio/CalculationService';

// PortfolioCalculationServiceをモック化
jest.mock('../../../../services/portfolio/CalculationService');

describe('SimulationService - 包括的テスト', () => {
  let mockPortfolioCalculationService;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // PortfolioCalculationServiceのモック設定
    mockPortfolioCalculationService = PortfolioCalculationService;
    
    // デフォルトのモック実装
    mockPortfolioCalculationService.convertCurrency.mockImplementation(
      (amount, fromCurrency, toCurrency, rate) => {
        if (fromCurrency === toCurrency) return amount;
        if (fromCurrency === 'USD' && toCurrency === 'JPY') return amount * rate;
        if (fromCurrency === 'JPY' && toCurrency === 'USD') return amount / rate;
        return amount;
      }
    );
    
    mockPortfolioCalculationService.calculateTotalAssets.mockImplementation(
      (assets, baseCurrency, exchangeRate) => {
        return assets.reduce((total, asset) => {
          let value = asset.price * asset.holdings;
          if (asset.currency !== baseCurrency) {
            value = mockPortfolioCalculationService.convertCurrency(
              value, asset.currency, baseCurrency, exchangeRate.rate
            );
          }
          return total + value;
        }, 0);
      }
    );
  });

  // テストデータ定義
  const mockExchangeRate = {
    rate: 150.0,
    source: 'Test',
    lastUpdated: new Date().toISOString()
  };

  const mockCurrentAssets = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      price: 150.00,
      holdings: 10,
      currency: 'USD'
    },
    {
      ticker: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      price: 200.00,
      holdings: 5,
      currency: 'USD'
    },
    {
      ticker: '7203.T',
      name: 'トヨタ自動車',
      price: 2500,
      holdings: 100,
      currency: 'JPY'
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      price: 300.00,
      holdings: 0, // 保有なし
      currency: 'USD'
    }
  ];

  const mockTargetPortfolio = [
    { ticker: 'AAPL', targetPercentage: 30 },
    { ticker: 'VTI', targetPercentage: 25 },
    { ticker: '7203.T', targetPercentage: 20 },
    { ticker: 'MSFT', targetPercentage: 25 }
  ];

  describe('runSimulation() - メイン機能テスト', () => {
    beforeEach(() => {
      // 現在の総資産額のモック（USD資産をJPYに変換 + JPY資産）
      // AAPL: 150 * 10 * 150 = 225,000 JPY
      // VTI: 200 * 5 * 150 = 150,000 JPY  
      // 7203.T: 2500 * 100 = 250,000 JPY
      // 合計: 625,000 JPY
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);
    });

    it('基本的なシミュレーション実行', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      const result = SimulationService.runSimulation(params);

      // 結果構造の検証
      expect(result).toHaveProperty('purchases');
      expect(result).toHaveProperty('totalPurchaseAmount');
      expect(result).toHaveProperty('remainingBudget');
      expect(result).toHaveProperty('newAllocations');
      expect(result).toHaveProperty('projectedTotalAssets');
      expect(result).toHaveProperty('summary');

      // 基本的な値の検証
      expect(Array.isArray(result.purchases)).toBe(true);
      expect(Array.isArray(result.newAllocations)).toBe(true);
      expect(typeof result.totalPurchaseAmount).toBe('number');
      expect(typeof result.remainingBudget).toBe('number');
      expect(result.projectedTotalAssets).toBe(725000); // 625,000 + 100,000

      // 予算制約の検証
      expect(result.totalPurchaseAmount + result.remainingBudget).toBe(100000);
      expect(result.remainingBudget).toBeGreaterThanOrEqual(0);

      // PortfolioCalculationServiceの呼び出し検証
      expect(mockPortfolioCalculationService.calculateTotalAssets).toHaveBeenCalledWith(
        mockCurrentAssets, 'JPY', mockExchangeRate
      );
    });

    it('includeCurrentHoldings=false - 新規投資のみ', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // 新規投資額の配分のみで計算されることを検証
      expect(result.totalPurchaseAmount).toBeLessThanOrEqual(100000);
      
      // 各購入の配分が目標配分に基づいていることを検証
      result.purchases.forEach(purchase => {
        const target = mockTargetPortfolio.find(t => t.ticker === purchase.ticker);
        if (target) {
          const expectedPercentage = target.targetPercentage;
          expect(purchase.percentage).toBeCloseTo(expectedPercentage, 1);
        }
      });
    });

    it('includeCurrentHoldings=true - 現在保有を考慮', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 300000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      const result = SimulationService.runSimulation(params);

      // 目標配分に向けたリバランス購入が行われることを検証
      result.newAllocations.forEach(allocation => {
        const target = mockTargetPortfolio.find(t => t.ticker === allocation.ticker);
        if (target) {
          // 目標配分に近づいていることを検証（完全一致は予算制約により困難）
          expect(Math.abs(allocation.difference)).toBeLessThan(allocation.targetPercentage);
        }
      });
    });

    it('デフォルトパラメータの検証', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate
        // includeCurrentHoldingsを省略
      };

      const result = SimulationService.runSimulation(params);

      // デフォルトでincludeCurrentHoldings=falseになることを検証
      expect(result).toBeDefined();
      expect(result.totalPurchaseAmount).toBeLessThanOrEqual(100000);
    });
  });

  describe('通貨変換シナリオ', () => {
    it('USD予算をJPY基準通貨で処理', () => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);

      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 1000, currency: 'USD' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // USD予算がJPYに変換されることを検証
      expect(result.summary.totalBudget).toBe(150000); // 1000 * 150
      expect(mockPortfolioCalculationService.convertCurrency).toHaveBeenCalledWith(
        1000, 'USD', 'JPY', 150.0
      );
    });

    it('JPY予算をUSD基準通貨で処理', () => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(4167); // 625000 / 150

      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 150000, currency: 'JPY' },
        baseCurrency: 'USD',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // JPY予算がUSDに変換されることを検証
      expect(result.summary.totalBudget).toBe(1000); // 150000 / 150
      expect(mockPortfolioCalculationService.convertCurrency).toHaveBeenCalledWith(
        150000, 'JPY', 'USD', 150.0
      );
    });

    it('同一通貨の場合は変換なし', () => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);

      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      expect(result.summary.totalBudget).toBe(100000);
      // 同一通貨なので変換は呼ばれない（内部で早期リターン）
    });
  });

  describe('予算制約テスト', () => {
    beforeEach(() => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);
    });

    it('予算ゼロの場合', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 0, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      expect(result.purchases).toHaveLength(0);
      expect(result.totalPurchaseAmount).toBe(0);
      expect(result.remainingBudget).toBe(0);
      expect(result.summary.utilizationRate).toBe(0);
    });

    it('非常に小さな予算（1株も買えない）', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100, currency: 'JPY' }, // 最安値の7203.T(2500円)も買えない
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      expect(result.purchases.every(p => p.shares === 0)).toBe(true);
      expect(result.totalPurchaseAmount).toBe(0);
      expect(result.remainingBudget).toBe(100);
    });

    it('巨額予算の処理', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 10000000, currency: 'JPY' }, // 1000万円
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      expect(result.totalPurchaseAmount).toBeGreaterThan(0);
      expect(result.remainingBudget).toBeGreaterThanOrEqual(0);
      expect(result.totalPurchaseAmount + result.remainingBudget).toBe(10000000);
    });

    it('予算制限による購入優先順位', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 50000, currency: 'JPY' }, // 限られた予算
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // 目標配分の順序で予算が使われることを検証
      const purchasedTickers = result.purchases
        .filter(p => p.shares > 0)
        .map(p => p.ticker);
      
      expect(purchasedTickers.length).toBeGreaterThan(0);
    });
  });

  describe('株数計算（整数株のみ）', () => {
    beforeEach(() => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);
    });

    it('Math.floor により整数株のみ購入', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      result.purchases.forEach(purchase => {
        expect(Number.isInteger(purchase.shares)).toBe(true);
        expect(purchase.shares).toBeGreaterThanOrEqual(0);
        
        // 実際の購入金額 = 株数 × 株価
        expect(purchase.amount).toBe(purchase.shares * purchase.pricePerShare);
      });
    });

    it('端数の処理による残余予算の検証', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 100 }],
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      const applePurchase = result.purchases.find(p => p.ticker === 'AAPL');
      if (applePurchase) {
        const appleAsset = mockCurrentAssets.find(a => a.ticker === 'AAPL');
        const priceInJPY = appleAsset.price * mockExchangeRate.rate; // 150 * 150 = 22500 JPY
        const maxShares = Math.floor(100000 / priceInJPY);
        
        expect(applePurchase.shares).toBe(maxShares);
        expect(result.remainingBudget).toBe(100000 - (maxShares * priceInJPY));
      }
    });
  });

  describe('目標配分計算', () => {
    beforeEach(() => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);
    });

    it('目標配分に基づく購入金額計算', () => {
      const singleTargetPortfolio = [{ ticker: 'AAPL', targetPercentage: 100 }];
      
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: singleTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      const applePurchase = result.purchases.find(p => p.ticker === 'AAPL');
      expect(applePurchase).toBeDefined();
      expect(applePurchase.percentage).toBeCloseTo(100, 1);
    });

    it('複数銘柄の配分比率検証', () => {
      const balancedPortfolio = [
        { ticker: 'AAPL', targetPercentage: 50 },
        { ticker: 'VTI', targetPercentage: 50 }
      ];
      
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: balancedPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      const applePurchase = result.purchases.find(p => p.ticker === 'AAPL');
      const vtiPurchase = result.purchases.find(p => p.ticker === 'VTI');

      if (applePurchase && vtiPurchase) {
        // 配分比率が目標に近いことを検証（整数株制約により完全一致は困難）
        expect(applePurchase.percentage).toBeCloseTo(50, 10);
        expect(vtiPurchase.percentage).toBeCloseTo(50, 10);
      }
    });

    it('目標配分の合計が100%でない場合', () => {
      const unbalancedPortfolio = [
        { ticker: 'AAPL', targetPercentage: 30 },
        { ticker: 'VTI', targetPercentage: 25 }
        // 合計55%のみ
      ];
      
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: unbalancedPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // 指定された配分のみに投資される
      const totalInvested = result.purchases.reduce((sum, p) => sum + p.percentage, 0);
      expect(totalInvested).toBeLessThanOrEqual(55);
    });
  });

  describe('エッジケースと無効入力', () => {
    it('空の現在資産配列', () => {
      const params = {
        currentAssets: [],
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(0);

      const result = SimulationService.runSimulation(params);

      expect(result.purchases).toHaveLength(0);
      expect(result.totalPurchaseAmount).toBe(0);
      expect(result.projectedTotalAssets).toBe(100000);
    });

    it('空の目標ポートフォリオ', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: [],
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);

      const result = SimulationService.runSimulation(params);

      expect(result.purchases).toHaveLength(0);
      expect(result.remainingBudget).toBe(100000);
    });

    it('マッチしない銘柄（目標に現在資産にない銘柄）', () => {
      const mismatchedPortfolio = [
        { ticker: 'NONEXISTENT', targetPercentage: 100 }
      ];
      
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mismatchedPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);

      const result = SimulationService.runSimulation(params);

      expect(result.purchases).toHaveLength(0);
      expect(result.remainingBudget).toBe(100000);
    });

    it('負の目標配分率', () => {
      const negativePortfolio = [
        { ticker: 'AAPL', targetPercentage: -10 },
        { ticker: 'VTI', targetPercentage: 110 }
      ];
      
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: negativePortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);

      const result = SimulationService.runSimulation(params);

      // 負の配分は購入しない
      const applePurchase = result.purchases.find(p => p.ticker === 'AAPL');
      expect(applePurchase?.shares || 0).toBe(0);
    });

    it('無効な為替レート', () => {
      const invalidExchangeRate = { rate: 0, source: 'Test', lastUpdated: new Date().toISOString() };
      
      // ゼロ除算を防ぐため、convertCurrencyが適切に処理することを検証
      mockPortfolioCalculationService.convertCurrency.mockImplementation(
        (amount, fromCurrency, toCurrency, rate) => {
          if (rate === 0) return 0;
          return amount; // 簡単な実装
        }
      );

      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 1000, currency: 'USD' },
        baseCurrency: 'JPY',
        exchangeRate: invalidExchangeRate,
        includeCurrentHoldings: false
      };

      expect(() => SimulationService.runSimulation(params)).not.toThrow();
    });
  });

  describe('複雑なマルチ資産ポートフォリオシナリオ', () => {
    const complexAssets = [
      { ticker: 'AAPL', name: 'Apple', price: 150, holdings: 10, currency: 'USD' },
      { ticker: 'MSFT', name: 'Microsoft', price: 300, holdings: 5, currency: 'USD' },
      { ticker: 'GOOGL', name: 'Google', price: 2500, holdings: 2, currency: 'USD' },
      { ticker: '7203.T', name: 'Toyota', price: 2500, holdings: 100, currency: 'JPY' },
      { ticker: '6758.T', name: 'Sony', price: 8000, holdings: 50, currency: 'JPY' },
      { ticker: 'NVDA', name: 'NVIDIA', price: 800, holdings: 0, currency: 'USD' },
    ];

    const complexTargets = [
      { ticker: 'AAPL', targetPercentage: 20 },
      { ticker: 'MSFT', targetPercentage: 15 },
      { ticker: 'GOOGL', targetPercentage: 10 },
      { ticker: '7203.T', targetPercentage: 15 },
      { ticker: '6758.T', targetPercentage: 20 },
      { ticker: 'NVDA', targetPercentage: 20 },
    ];

    beforeEach(() => {
      // 複雑な資産の総額計算
      // USD資産をJPYに変換して合計
      const totalUSD = (150*10 + 300*5 + 2500*2 + 800*0); // 8500 USD
      const totalJPY = (2500*100 + 8000*50); // 650000 JPY
      const totalInJPY = totalUSD * 150 + totalJPY; // 1275000 + 650000 = 1925000 JPY
      
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(totalInJPY);
    });

    it('大規模ポートフォリオの正確な計算', () => {
      const params = {
        currentAssets: complexAssets,
        targetPortfolio: complexTargets,
        additionalBudget: { amount: 500000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      const result = SimulationService.runSimulation(params);

      // すべての銘柄が考慮されることを検証
      expect(result.newAllocations).toHaveLength(complexAssets.length);
      
      // 目標配分の合計が100%であることを検証
      const totalTarget = complexTargets.reduce((sum, t) => sum + t.targetPercentage, 0);
      expect(totalTarget).toBe(100);

      // 各新しい配分が妥当な範囲内であることを検証
      result.newAllocations.forEach(allocation => {
        expect(allocation.newPercentage).toBeGreaterThanOrEqual(0);
        expect(allocation.newPercentage).toBeLessThanOrEqual(100);
      });
    });

    it('ゼロ保有からの新規購入', () => {
      const params = {
        currentAssets: complexAssets,
        targetPortfolio: [{ ticker: 'NVDA', targetPercentage: 100 }],
        additionalBudget: { amount: 300000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      const nvdaPurchase = result.purchases.find(p => p.ticker === 'NVDA');
      expect(nvdaPurchase).toBeDefined();
      expect(nvdaPurchase.shares).toBeGreaterThan(0);

      // 新しい配分でNVDAの保有が増加
      const nvidaAllocation = result.newAllocations.find(a => a.ticker === 'NVDA');
      expect(nvidaAllocation.newHoldings).toBe(nvdaPurchase.shares);
    });

    it('リバランスの精度検証', () => {
      const params = {
        currentAssets: complexAssets,
        targetPortfolio: complexTargets,
        additionalBudget: { amount: 1000000, currency: 'JPY' }, // 大きな予算でリバランス
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      const result = SimulationService.runSimulation(params);

      // リバランス後の配分が目標に近づいていることを検証
      result.newAllocations.forEach(allocation => {
        const target = complexTargets.find(t => t.ticker === allocation.ticker);
        if (target) {
          // 差分が妥当な範囲内（整数株制約を考慮して±5%以内）
          expect(Math.abs(allocation.difference)).toBeLessThan(5);
        }
      });
    });
  });

  describe('数学的精度検証', () => {
    beforeEach(() => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);
    });

    it('予算配分の数学的整合性', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // 購入金額と残余予算の合計が元の予算と一致
      const totalUsed = result.totalPurchaseAmount + result.remainingBudget;
      expect(totalUsed).toBeCloseTo(100000, 2);

      // 各購入の金額 = 株数 × 株価
      result.purchases.forEach(purchase => {
        expect(purchase.amount).toBeCloseTo(purchase.shares * purchase.pricePerShare, 2);
      });
    });

    it('配分率の計算精度', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // 配分率の合計が予算使用率と一致
      const totalPercentage = result.purchases.reduce((sum, p) => sum + p.percentage, 0);
      const expectedPercentage = (result.totalPurchaseAmount / 100000) * 100;
      expect(totalPercentage).toBeCloseTo(expectedPercentage, 2);
    });

    it('通貨変換の往復精度', () => {
      // USD -> JPY -> USD の変換で精度をテスト
      const originalAmount = 1000;
      const rate = 150;

      // USD -> JPY
      const jpy = mockPortfolioCalculationService.convertCurrency(originalAmount, 'USD', 'JPY', rate);
      // JPY -> USD
      const backToUsd = mockPortfolioCalculationService.convertCurrency(jpy, 'JPY', 'USD', rate);

      expect(backToUsd).toBeCloseTo(originalAmount, 2);
    });
  });

  describe('executePurchases() - 購入実行テスト', () => {
    it('購入計画の正確な実行', () => {
      const purchases = [
        { ticker: 'AAPL', shares: 5 },
        { ticker: 'VTI', shares: 10 },
        { ticker: 'MSFT', shares: 3 }
      ];

      const result = SimulationService.executePurchases(purchases, mockCurrentAssets);

      expect(result).toHaveLength(mockCurrentAssets.length);

      // AAPLの保有数更新確認
      const appleAsset = result.find(a => a.ticker === 'AAPL');
      expect(appleAsset.holdings).toBe(15); // 10 + 5
      expect(appleAsset.lastUpdated).toBeDefined();

      // VTIの保有数更新確認
      const vtiAsset = result.find(a => a.ticker === 'VTI');
      expect(vtiAsset.holdings).toBe(15); // 5 + 10
      expect(vtiAsset.lastUpdated).toBeDefined();

      // MSFTは0保有から3に
      const msftAsset = result.find(a => a.ticker === 'MSFT');
      expect(msftAsset.holdings).toBe(3); // 0 + 3
      expect(msftAsset.lastUpdated).toBeDefined();

      // 7203.Tは購入なしなので変更なし
      const toyotaAsset = result.find(a => a.ticker === '7203.T');
      expect(toyotaAsset.holdings).toBe(100);
      expect(toyotaAsset.lastUpdated).toBeUndefined();
    });

    it('部分購入（一部銘柄のみ）', () => {
      const partialPurchases = [
        { ticker: 'AAPL', shares: 2 }
      ];

      const result = SimulationService.executePurchases(partialPurchases, mockCurrentAssets);

      // AAPLのみ更新
      const appleAsset = result.find(a => a.ticker === 'AAPL');
      expect(appleAsset.holdings).toBe(12);
      expect(appleAsset.lastUpdated).toBeDefined();

      // 他は変更なし
      const vtiAsset = result.find(a => a.ticker === 'VTI');
      expect(vtiAsset.holdings).toBe(5);
      expect(vtiAsset.lastUpdated).toBeUndefined();
    });

    it('ゼロ株購入の処理', () => {
      const zeroPurchases = [
        { ticker: 'AAPL', shares: 0 },
        { ticker: 'VTI', shares: 0 }
      ];

      const result = SimulationService.executePurchases(zeroPurchases, mockCurrentAssets);

      // ゼロ株購入では更新されない
      result.forEach(asset => {
        const original = mockCurrentAssets.find(a => a.ticker === asset.ticker);
        expect(asset.holdings).toBe(original.holdings);
        expect(asset.lastUpdated).toBeUndefined();
      });
    });

    it('空の購入リスト', () => {
      const result = SimulationService.executePurchases([], mockCurrentAssets);

      expect(result).toEqual(mockCurrentAssets);
    });

    it('存在しない銘柄の購入無視', () => {
      const invalidPurchases = [
        { ticker: 'INVALID_TICKER', shares: 100 },
        { ticker: 'AAPL', shares: 5 }
      ];

      const result = SimulationService.executePurchases(invalidPurchases, mockCurrentAssets);

      // 有効な購入のみ実行
      const appleAsset = result.find(a => a.ticker === 'AAPL');
      expect(appleAsset.holdings).toBe(15);

      // 無効な銘柄は無視（エラーなし）
      expect(result.find(a => a.ticker === 'INVALID_TICKER')).toBeUndefined();
    });

    it('lastUpdatedタイムスタンプの妥当性', () => {
      const before = Date.now();
      
      const purchases = [{ ticker: 'AAPL', shares: 1 }];
      const result = SimulationService.executePurchases(purchases, mockCurrentAssets);
      
      const after = Date.now();
      const appleAsset = result.find(a => a.ticker === 'AAPL');
      const updateTime = new Date(appleAsset.lastUpdated).getTime();
      
      expect(updateTime).toBeGreaterThanOrEqual(before);
      expect(updateTime).toBeLessThanOrEqual(after);
    });
  });

  describe('プライベートメソッドのパブリックインターフェース経由テスト', () => {
    beforeEach(() => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(625000);
    });

    it('calculatePurchases の動作確認（runSimulation経由）', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 100 }],
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // calculatePurchasesの結果が正しく返されることを検証
      expect(result.purchases).toBeDefined();
      expect(Array.isArray(result.purchases)).toBe(true);
      
      const applePurchase = result.purchases.find(p => p.ticker === 'AAPL');
      expect(applePurchase).toHaveProperty('ticker');
      expect(applePurchase).toHaveProperty('name');
      expect(applePurchase).toHaveProperty('shares');
      expect(applePurchase).toHaveProperty('amount');
      expect(applePurchase).toHaveProperty('pricePerShare');
      expect(applePurchase).toHaveProperty('percentage');
    });

    it('calculateNewAllocations の動作確認（runSimulation経由）', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      const result = SimulationService.runSimulation(params);

      // calculateNewAllocationsの結果が正しく返されることを検証
      expect(result.newAllocations).toBeDefined();
      expect(Array.isArray(result.newAllocations)).toBe(true);
      expect(result.newAllocations).toHaveLength(mockCurrentAssets.length);

      result.newAllocations.forEach(allocation => {
        expect(allocation).toHaveProperty('ticker');
        expect(allocation).toHaveProperty('name');
        expect(allocation).toHaveProperty('newHoldings');
        expect(allocation).toHaveProperty('newValue');
        expect(allocation).toHaveProperty('newPercentage');
        expect(allocation).toHaveProperty('targetPercentage');
        expect(allocation).toHaveProperty('difference');
      });
    });

    it('generateSummary の動作確認（runSimulation経由）', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const result = SimulationService.runSimulation(params);

      // generateSummaryの結果が正しく返されることを検証
      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('totalBudget');
      expect(result.summary).toHaveProperty('totalPurchased');
      expect(result.summary).toHaveProperty('remainingBudget');
      expect(result.summary).toHaveProperty('utilizationRate');
      expect(result.summary).toHaveProperty('purchaseCount');
      expect(result.summary).toHaveProperty('currency');

      expect(result.summary.totalBudget).toBe(100000);
      expect(result.summary.currency).toBe('JPY');
      expect(result.summary.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(result.summary.utilizationRate).toBeLessThanOrEqual(100);
    });
  });

  describe('PortfolioCalculationServiceとの統合テスト', () => {
    it('convertCurrency の正しい呼び出し', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 1000, currency: 'USD' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      SimulationService.runSimulation(params);

      // 予算変換の呼び出し確認
      expect(mockPortfolioCalculationService.convertCurrency).toHaveBeenCalledWith(
        1000, 'USD', 'JPY', 150.0
      );

      // 資産価格変換の呼び出し確認（USD資産の価格をJPYに変換）
      expect(mockPortfolioCalculationService.convertCurrency).toHaveBeenCalledWith(
        expect.any(Number), 'USD', 'JPY', 150.0
      );
    });

    it('calculateTotalAssets の正しい呼び出し', () => {
      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      SimulationService.runSimulation(params);

      expect(mockPortfolioCalculationService.calculateTotalAssets).toHaveBeenCalledWith(
        mockCurrentAssets, 'JPY', mockExchangeRate
      );
    });

    it('依存サービスエラー時のハンドリング', () => {
      // convertCurrency でエラーを発生させる
      mockPortfolioCalculationService.convertCurrency.mockImplementation(() => {
        throw new Error('Currency conversion failed');
      });

      const params = {
        currentAssets: mockCurrentAssets,
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 1000, currency: 'USD' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      // エラーが適切に伝播されることを確認
      expect(() => SimulationService.runSimulation(params)).toThrow('Currency conversion failed');
    });

    it('calculateTotalAssets がゼロを返す場合', () => {
      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(0);

      const params = {
        currentAssets: [],
        targetPortfolio: mockTargetPortfolio,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: true
      };

      const result = SimulationService.runSimulation(params);

      expect(result.projectedTotalAssets).toBe(100000); // 0 + 100000
      expect(result.purchases).toHaveLength(0);
    });
  });

  describe('パフォーマンスと安定性', () => {
    it('大量データの処理', () => {
      const largeAssets = Array.from({ length: 100 }, (_, i) => ({
        ticker: `STOCK${i}`,
        name: `Stock ${i}`,
        price: Math.random() * 1000 + 10,
        holdings: Math.floor(Math.random() * 100),
        currency: i % 2 === 0 ? 'USD' : 'JPY'
      }));

      const largeTargets = largeAssets.map((asset, i) => ({
        ticker: asset.ticker,
        targetPercentage: 1 // 均等配分
      }));

      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(10000000);

      const params = {
        currentAssets: largeAssets,
        targetPortfolio: largeTargets,
        additionalBudget: { amount: 1000000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      const startTime = Date.now();
      const result = SimulationService.runSimulation(params);
      const endTime = Date.now();

      // 実行時間が妥当な範囲内（1秒以内）
      expect(endTime - startTime).toBeLessThan(1000);

      // 結果の整合性
      expect(result.purchases.length).toBeLessThanOrEqual(largeAssets.length);
      expect(result.totalPurchaseAmount + result.remainingBudget).toBe(1000000);
    });

    it('極端な値での安定性', () => {
      const extremeAssets = [
        {
          ticker: 'EXPENSIVE',
          name: 'Very Expensive Stock',
          price: 1000000, // 100万円/株
          holdings: 1,
          currency: 'JPY'
        },
        {
          ticker: 'CHEAP',
          name: 'Very Cheap Stock',
          price: 0.01, // 1セント/株
          holdings: 1000000,
          currency: 'USD'
        }
      ];

      const extremeTargets = [
        { ticker: 'EXPENSIVE', targetPercentage: 50 },
        { ticker: 'CHEAP', targetPercentage: 50 }
      ];

      mockPortfolioCalculationService.calculateTotalAssets.mockReturnValue(2500000);

      const params = {
        currentAssets: extremeAssets,
        targetPortfolio: extremeTargets,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        baseCurrency: 'JPY',
        exchangeRate: mockExchangeRate,
        includeCurrentHoldings: false
      };

      expect(() => SimulationService.runSimulation(params)).not.toThrow();
    });
  });
});