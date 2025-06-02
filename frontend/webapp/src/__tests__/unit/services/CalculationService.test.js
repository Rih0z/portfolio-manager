/**
 * PortfolioCalculationServiceのユニットテスト
 */

import { PortfolioCalculationService } from '../../../services/portfolio/CalculationService';

describe('PortfolioCalculationService', () => {
  const mockExchangeRate = {
    rate: 150.0,
    source: 'Test',
    lastUpdated: new Date().toISOString()
  };

  const mockAssets = [
    {
      ticker: 'AAPL',
      price: 100,
      holdings: 10,
      currency: 'USD',
      annualFee: 0,
      hasDividend: true,
      dividendYield: 2.5
    },
    {
      ticker: '7203.T',
      price: 2500,
      holdings: 100,
      currency: 'JPY',
      annualFee: 0,
      hasDividend: true,
      dividendYield: 3.0
    },
    {
      ticker: 'VOO',
      price: 400,
      holdings: 5,
      currency: 'USD',
      annualFee: 0.03,
      hasDividend: true,
      dividendYield: 1.5
    }
  ];

  describe('calculateTotalAssets', () => {
    it('JPY基準で総資産を計算できる', () => {
      const total = PortfolioCalculationService.calculateTotalAssets(
        mockAssets,
        'JPY',
        mockExchangeRate
      );
      
      // AAPL: 100 * 10 * 150 = 150,000 JPY
      // 7203.T: 2500 * 100 = 250,000 JPY  
      // VOO: 400 * 5 * 150 = 300,000 JPY
      // Total: 700,000 JPY
      expect(total).toBe(700000);
    });

    it('USD基準で総資産を計算できる', () => {
      const total = PortfolioCalculationService.calculateTotalAssets(
        mockAssets,
        'USD',
        mockExchangeRate
      );
      
      // AAPL: 100 * 10 = 1,000 USD
      // 7203.T: 2500 * 100 / 150 = 1,666.67 USD
      // VOO: 400 * 5 = 2,000 USD
      // Total: 4,666.67 USD
      expect(total).toBeCloseTo(4666.67, 2);
    });

    it('空の資産配列では0を返す', () => {
      const total = PortfolioCalculationService.calculateTotalAssets(
        [],
        'JPY',
        mockExchangeRate
      );
      
      expect(total).toBe(0);
    });

    it('nullまたはundefinedでは0を返す', () => {
      expect(PortfolioCalculationService.calculateTotalAssets(null, 'JPY', mockExchangeRate)).toBe(0);
      expect(PortfolioCalculationService.calculateTotalAssets(undefined, 'JPY', mockExchangeRate)).toBe(0);
    });
  });

  describe('calculateAnnualFees', () => {
    it('年間手数料を計算できる', () => {
      const fees = PortfolioCalculationService.calculateAnnualFees(
        mockAssets,
        'JPY',
        mockExchangeRate
      );
      
      // AAPL: 0% of 150,000 = 0 JPY
      // 7203.T: 0% of 250,000 = 0 JPY
      // VOO: 0.03% of 300,000 = 90 JPY
      expect(fees).toBe(90);
    });

    it('空の資産配列では0を返す', () => {
      const fees = PortfolioCalculationService.calculateAnnualFees(
        [],
        'JPY',
        mockExchangeRate
      );
      
      expect(fees).toBe(0);
    });

    it('nullまたはundefinedでは0を返す', () => {
      expect(PortfolioCalculationService.calculateAnnualFees(null, 'JPY', mockExchangeRate)).toBe(0);
      expect(PortfolioCalculationService.calculateAnnualFees(undefined, 'JPY', mockExchangeRate)).toBe(0);
    });

    it('USD基準で年間手数料を計算できる', () => {
      const fees = PortfolioCalculationService.calculateAnnualFees(
        mockAssets,
        'USD',
        mockExchangeRate
      );
      
      // VOO: 0.03% of 2,000 = 0.6 USD
      expect(fees).toBeCloseTo(0.6, 2);
    });
  });

  describe('calculateAnnualDividends', () => {
    it('年間配当金を計算できる', () => {
      const dividends = PortfolioCalculationService.calculateAnnualDividends(
        mockAssets,
        'JPY',
        mockExchangeRate
      );
      
      // AAPL: 2.5% of 150,000 = 3,750 JPY
      // 7203.T: 3.0% of 250,000 = 7,500 JPY
      // VOO: 1.5% of 300,000 = 4,500 JPY
      // Total: 15,750 JPY
      expect(dividends).toBe(15750);
    });

    it('空の資産配列では0を返す', () => {
      const dividends = PortfolioCalculationService.calculateAnnualDividends(
        [],
        'JPY',
        mockExchangeRate
      );
      
      expect(dividends).toBe(0);
    });

    it('nullまたはundefinedでは0を返す', () => {
      expect(PortfolioCalculationService.calculateAnnualDividends(null, 'JPY', mockExchangeRate)).toBe(0);
      expect(PortfolioCalculationService.calculateAnnualDividends(undefined, 'JPY', mockExchangeRate)).toBe(0);
    });

    it('配当なしの資産は無視される', () => {
      const assetsWithoutDividends = mockAssets.map(asset => ({
        ...asset,
        hasDividend: false
      }));
      
      const dividends = PortfolioCalculationService.calculateAnnualDividends(
        assetsWithoutDividends,
        'JPY',
        mockExchangeRate
      );
      
      expect(dividends).toBe(0);
    });
  });

  describe('convertCurrency', () => {
    it('USD to JPY変換', () => {
      const result = PortfolioCalculationService.convertCurrency(100, 'USD', 'JPY', 150);
      expect(result).toBe(15000);
    });

    it('JPY to USD変換', () => {
      const result = PortfolioCalculationService.convertCurrency(15000, 'JPY', 'USD', 150);
      expect(result).toBe(100);
    });

    it('同じ通貨では変換しない', () => {
      const result = PortfolioCalculationService.convertCurrency(100, 'USD', 'USD', 150);
      expect(result).toBe(100);
    });

    it('サポートされていない通貨ペアでは元の値を返す', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = PortfolioCalculationService.convertCurrency(100, 'EUR', 'GBP', 150);
      
      expect(result).toBe(100);
      expect(consoleSpy).toHaveBeenCalledWith('Unsupported currency pair: EUR/GBP');
      
      consoleSpy.mockRestore();
    });
  });

  describe('calculateCurrentAllocations', () => {
    it('現在の配分率を計算できる', () => {
      const allocations = PortfolioCalculationService.calculateCurrentAllocations(
        mockAssets,
        700000,
        'JPY',
        mockExchangeRate
      );
      
      expect(allocations).toHaveLength(3);
      
      // AAPL: 150,000 / 700,000 = 21.43%
      expect(allocations[0]).toMatchObject({
        ticker: 'AAPL',
        currentValue: 150000,
        currentPercentage: expect.closeTo(21.43, 1)
      });
      
      // 7203.T: 250,000 / 700,000 = 35.71%
      expect(allocations[1]).toMatchObject({
        ticker: '7203.T',
        currentValue: 250000,
        currentPercentage: expect.closeTo(35.71, 1)
      });
      
      // VOO: 300,000 / 700,000 = 42.86%
      expect(allocations[2]).toMatchObject({
        ticker: 'VOO',
        currentValue: 300000,
        currentPercentage: expect.closeTo(42.86, 1)
      });
    });

    it('総資産が0の場合は空配列を返す', () => {
      const allocations = PortfolioCalculationService.calculateCurrentAllocations(
        mockAssets,
        0,
        'JPY',
        mockExchangeRate
      );
      
      expect(allocations).toEqual([]);
    });
  });

  describe('calculateRebalanceDifferences', () => {
    it('リバランスの差分を計算できる', () => {
      const currentAllocations = [
        { ticker: 'AAPL', name: 'Apple', currentPercentage: 30 },
        { ticker: 'VOO', name: 'Vanguard S&P 500', currentPercentage: 70 }
      ];
      
      const targetAllocations = [
        { ticker: 'AAPL', targetPercentage: 40 },
        { ticker: 'VOO', targetPercentage: 60 }
      ];
      
      const differences = PortfolioCalculationService.calculateRebalanceDifferences(
        currentAllocations,
        targetAllocations
      );
      
      expect(differences).toEqual([
        {
          ticker: 'AAPL',
          name: 'Apple',
          currentPercentage: 30,
          targetPercentage: 40,
          difference: 10
        },
        {
          ticker: 'VOO',
          name: 'Vanguard S&P 500',
          currentPercentage: 70,
          targetPercentage: 60,
          difference: -10
        }
      ]);
    });

    it('目標配分がない銘柄は0%として扱う', () => {
      const currentAllocations = [
        { ticker: 'AAPL', name: 'Apple', currentPercentage: 100 }
      ];
      
      const targetAllocations = [];
      
      const differences = PortfolioCalculationService.calculateRebalanceDifferences(
        currentAllocations,
        targetAllocations
      );
      
      expect(differences[0]).toMatchObject({
        targetPercentage: 0,
        difference: -100
      });
    });
  });
});