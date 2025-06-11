/**
 * PortfolioCalculationServiceのユニットテスト
 * 
 * 総資産計算、年間手数料・配当金計算、通貨換算、配分計算、リバランス差分計算
 * の包括的なテストを実装
 */

import { PortfolioCalculationService } from '../../../../services/portfolio/CalculationService';

describe('PortfolioCalculationService', () => {
  const mockExchangeRate = {
    rate: 150.0,
    source: 'Test',
    lastUpdated: new Date().toISOString()
  };

  const mockAssets = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      price: 150,
      holdings: 10,
      currency: 'USD',
      annualFee: 0.5,
      hasDividend: true,
      dividendYield: 2.0
    },
    {
      ticker: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      price: 200,
      holdings: 5,
      currency: 'USD',
      annualFee: 0.03,
      hasDividend: true,
      dividendYield: 1.8
    },
    {
      ticker: '7203.T',
      name: 'トヨタ自動車',
      price: 2500,
      holdings: 100,
      currency: 'JPY',
      annualFee: 0.0,
      hasDividend: true,
      dividendYield: 2.5
    },
    {
      ticker: 'BTC-USD',
      name: 'Bitcoin',
      price: 50000,
      holdings: 0.1,
      currency: 'USD',
      annualFee: 0.0,
      hasDividend: false,
      dividendYield: 0
    }
  ];

  // Console.warn のスパイを設定
  let consoleWarnSpy;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('calculateTotalAssets', () => {
    it('USD基準で総資産額を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateTotalAssets(
        mockAssets,
        'USD',
        mockExchangeRate
      );

      // 期待値計算:
      // AAPL: 150 * 10 = 1500 USD
      // VTI: 200 * 5 = 1000 USD  
      // 7203.T: 2500 * 100 = 250000 JPY = 250000 / 150 = 1666.67 USD
      // BTC: 50000 * 0.1 = 5000 USD
      // 合計: 1500 + 1000 + 1666.67 + 5000 = 9166.67 USD
      expect(result).toBeCloseTo(9166.67, 2);
    });

    it('JPY基準で総資産額を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateTotalAssets(
        mockAssets,
        'JPY',
        mockExchangeRate
      );

      // 期待値計算:
      // AAPL: 150 * 10 * 150 = 225000 JPY
      // VTI: 200 * 5 * 150 = 150000 JPY
      // 7203.T: 2500 * 100 = 250000 JPY
      // BTC: 50000 * 0.1 * 150 = 750000 JPY
      // 合計: 225000 + 150000 + 250000 + 750000 = 1375000 JPY
      expect(result).toBeCloseTo(1375000, 2);
    });

    it('空の配列の場合は0を返す', () => {
      const result = PortfolioCalculationService.calculateTotalAssets(
        [],
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(0);
    });

    it('nullまたはundefinedの場合は0を返す', () => {
      expect(PortfolioCalculationService.calculateTotalAssets(null, 'USD', mockExchangeRate)).toBe(0);
      expect(PortfolioCalculationService.calculateTotalAssets(undefined, 'USD', mockExchangeRate)).toBe(0);
    });

    it('単一資産の計算が正確', () => {
      const singleAsset = [{
        ticker: 'AAPL',
        price: 100,
        holdings: 5,
        currency: 'USD'
      }];

      const result = PortfolioCalculationService.calculateTotalAssets(
        singleAsset,
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(500);
    });

    it('ゼロ保有の資産を正しく処理する', () => {
      const assetsWithZero = [
        { ticker: 'AAPL', price: 100, holdings: 0, currency: 'USD' },
        { ticker: 'VTI', price: 200, holdings: 5, currency: 'USD' }
      ];

      const result = PortfolioCalculationService.calculateTotalAssets(
        assetsWithZero,
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(1000); // 200 * 5 のみ
    });
  });

  describe('calculateAnnualFees', () => {
    it('USD基準で年間手数料を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateAnnualFees(
        mockAssets,
        'USD',
        mockExchangeRate
      );

      // 期待値計算:
      // AAPL: 1500 * 0.5 / 100 = 7.5 USD
      // VTI: 1000 * 0.03 / 100 = 0.3 USD
      // 7203.T: 1666.67 * 0.0 / 100 = 0 USD
      // BTC: 5000 * 0.0 / 100 = 0 USD
      // 合計: 7.5 + 0.3 + 0 + 0 = 7.8 USD
      expect(result).toBeCloseTo(7.8, 2);
    });

    it('JPY基準で年間手数料を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateAnnualFees(
        mockAssets,
        'JPY',
        mockExchangeRate
      );

      // 期待値計算:
      // AAPL: 225000 * 0.5 / 100 = 1125 JPY
      // VTI: 150000 * 0.03 / 100 = 45 JPY
      // 7203.T: 250000 * 0.0 / 100 = 0 JPY
      // BTC: 750000 * 0.0 / 100 = 0 JPY
      // 合計: 1125 + 45 + 0 + 0 = 1170 JPY
      expect(result).toBeCloseTo(1170, 2);
    });

    it('手数料がnullまたはundefinedの場合は0として扱う', () => {
      const assetsWithoutFees = [
        { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
        { ticker: 'VTI', price: 200, holdings: 5, currency: 'USD', annualFee: null }
      ];

      const result = PortfolioCalculationService.calculateAnnualFees(
        assetsWithoutFees,
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(0);
    });

    it('空の配列の場合は0を返す', () => {
      const result = PortfolioCalculationService.calculateAnnualFees(
        [],
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(0);
    });
  });

  describe('calculateAnnualDividends', () => {
    it('USD基準で年間配当金を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateAnnualDividends(
        mockAssets,
        'USD',
        mockExchangeRate
      );

      // 期待値計算:
      // AAPL: 1500 * 2.0 / 100 = 30 USD
      // VTI: 1000 * 1.8 / 100 = 18 USD
      // 7203.T: 1666.67 * 2.5 / 100 = 41.67 USD
      // BTC: 配当なし = 0 USD
      // 合計: 30 + 18 + 41.67 + 0 = 89.67 USD
      expect(result).toBeCloseTo(89.67, 2);
    });

    it('JPY基準で年間配当金を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateAnnualDividends(
        mockAssets,
        'JPY',
        mockExchangeRate
      );

      // 期待値計算:
      // AAPL: 225000 * 2.0 / 100 = 4500 JPY
      // VTI: 150000 * 1.8 / 100 = 2700 JPY
      // 7203.T: 250000 * 2.5 / 100 = 6250 JPY
      // BTC: 配当なし = 0 JPY
      // 合計: 4500 + 2700 + 6250 + 0 = 13450 JPY
      expect(result).toBeCloseTo(13450, 2);
    });

    it('配当なし資産をスキップする', () => {
      const assetsNoDividend = [
        {
          ticker: 'BTC',
          price: 50000,
          holdings: 0.1,
          currency: 'USD',
          hasDividend: false,
          dividendYield: 0
        }
      ];

      const result = PortfolioCalculationService.calculateAnnualDividends(
        assetsNoDividend,
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(0);
    });

    it('dividendYieldが0またはnullの場合をスキップする', () => {
      const assetsZeroDividend = [
        {
          ticker: 'AAPL',
          price: 100,
          holdings: 10,
          currency: 'USD',
          hasDividend: true,
          dividendYield: 0
        },
        {
          ticker: 'VTI',
          price: 200,
          holdings: 5,
          currency: 'USD',
          hasDividend: true,
          dividendYield: null
        }
      ];

      const result = PortfolioCalculationService.calculateAnnualDividends(
        assetsZeroDividend,
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(0);
    });

    it('空の配列の場合は0を返す', () => {
      const result = PortfolioCalculationService.calculateAnnualDividends(
        [],
        'USD',
        mockExchangeRate
      );
      expect(result).toBe(0);
    });
  });

  describe('convertCurrency', () => {
    it('同じ通貨の場合は元の金額を返す', () => {
      expect(PortfolioCalculationService.convertCurrency(1000, 'USD', 'USD', 150)).toBe(1000);
      expect(PortfolioCalculationService.convertCurrency(15000, 'JPY', 'JPY', 150)).toBe(15000);
    });

    it('USDからJPYへの換算が正確', () => {
      const result = PortfolioCalculationService.convertCurrency(100, 'USD', 'JPY', 150);
      expect(result).toBe(15000);
    });

    it('JPYからUSDへの換算が正確', () => {
      const result = PortfolioCalculationService.convertCurrency(15000, 'JPY', 'USD', 150);
      expect(result).toBe(100);
    });

    it('小数点を含む換算計算の精度', () => {
      const result1 = PortfolioCalculationService.convertCurrency(123.45, 'USD', 'JPY', 150.5);
      expect(result1).toBeCloseTo(18579.225, 3);

      const result2 = PortfolioCalculationService.convertCurrency(18579.225, 'JPY', 'USD', 150.5);
      expect(result2).toBeCloseTo(123.45, 3);
    });

    it('ゼロ金額の換算', () => {
      expect(PortfolioCalculationService.convertCurrency(0, 'USD', 'JPY', 150)).toBe(0);
      expect(PortfolioCalculationService.convertCurrency(0, 'JPY', 'USD', 150)).toBe(0);
    });

    it('負の金額の換算', () => {
      expect(PortfolioCalculationService.convertCurrency(-100, 'USD', 'JPY', 150)).toBe(-15000);
      expect(PortfolioCalculationService.convertCurrency(-15000, 'JPY', 'USD', 150)).toBe(-100);
    });

    it('サポートされていない通貨ペアの場合は警告を出し元の金額を返す', () => {
      const result = PortfolioCalculationService.convertCurrency(1000, 'EUR', 'USD', 150);
      
      expect(result).toBe(1000);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unsupported currency pair: EUR/USD');
    });

    it('複数のサポートされていない通貨ペアで警告が出る', () => {
      PortfolioCalculationService.convertCurrency(1000, 'GBP', 'EUR', 150);
      PortfolioCalculationService.convertCurrency(500, 'CHF', 'CAD', 150);
      
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unsupported currency pair: GBP/EUR');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unsupported currency pair: CHF/CAD');
    });

    it('極端な為替レートでの計算', () => {
      // 非常に高い為替レート
      const result1 = PortfolioCalculationService.convertCurrency(1, 'USD', 'JPY', 10000);
      expect(result1).toBe(10000);

      // 非常に低い為替レート
      const result2 = PortfolioCalculationService.convertCurrency(10000, 'JPY', 'USD', 0.01);
      expect(result2).toBe(1000000);
    });
  });

  describe('calculateCurrentAllocations', () => {
    const totalAssets = 9166.67; // USD基準での総資産額

    it('USD基準で現在の配分率を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateCurrentAllocations(
        mockAssets,
        totalAssets,
        'USD',
        mockExchangeRate
      );

      expect(result).toHaveLength(4);

      // AAPL: 1500 / 9166.67 * 100 = 16.36%
      expect(result[0].ticker).toBe('AAPL');
      expect(result[0].currentValue).toBeCloseTo(1500, 2);
      expect(result[0].currentPercentage).toBeCloseTo(16.36, 2);

      // VTI: 1000 / 9166.67 * 100 = 10.91%
      expect(result[1].ticker).toBe('VTI');
      expect(result[1].currentValue).toBeCloseTo(1000, 2);
      expect(result[1].currentPercentage).toBeCloseTo(10.91, 2);

      // 7203.T: 1666.67 / 9166.67 * 100 = 18.18%
      expect(result[2].ticker).toBe('7203.T');
      expect(result[2].currentValue).toBeCloseTo(1666.67, 2);
      expect(result[2].currentPercentage).toBeCloseTo(18.18, 2);

      // BTC: 5000 / 9166.67 * 100 = 54.55%
      expect(result[3].ticker).toBe('BTC-USD');
      expect(result[3].currentValue).toBeCloseTo(5000, 2);
      expect(result[3].currentPercentage).toBeCloseTo(54.55, 2);
    });

    it('元の資産データが変更されない（イミュータブル）', () => {
      const originalAssets = [...mockAssets];
      
      PortfolioCalculationService.calculateCurrentAllocations(
        mockAssets,
        totalAssets,
        'USD',
        mockExchangeRate
      );

      expect(mockAssets).toEqual(originalAssets);
      expect(mockAssets[0].currentValue).toBeUndefined();
      expect(mockAssets[0].currentPercentage).toBeUndefined();
    });

    it('空の配列の場合は空配列を返す', () => {
      const result = PortfolioCalculationService.calculateCurrentAllocations(
        [],
        totalAssets,
        'USD',
        mockExchangeRate
      );
      expect(result).toEqual([]);
    });

    it('総資産がゼロの場合は空配列を返す', () => {
      const result = PortfolioCalculationService.calculateCurrentAllocations(
        mockAssets,
        0,
        'USD',
        mockExchangeRate
      );
      expect(result).toEqual([]);
    });

    it('配分率の合計が100%になる', () => {
      const result = PortfolioCalculationService.calculateCurrentAllocations(
        mockAssets,
        totalAssets,
        'USD',
        mockExchangeRate
      );

      const totalPercentage = result.reduce((sum, asset) => sum + asset.currentPercentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('単一資産の場合100%になる', () => {
      const singleAsset = [{
        ticker: 'AAPL',
        price: 100,
        holdings: 10,
        currency: 'USD'
      }];

      const result = PortfolioCalculationService.calculateCurrentAllocations(
        singleAsset,
        1000,
        'USD',
        mockExchangeRate
      );

      expect(result[0].currentPercentage).toBe(100);
    });
  });

  describe('calculateRebalanceDifferences', () => {
    const currentAllocations = [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        currentPercentage: 40
      },
      {
        ticker: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        currentPercentage: 35
      },
      {
        ticker: '7203.T',
        name: 'トヨタ自動車',
        currentPercentage: 25
      }
    ];

    const targetAllocations = [
      { ticker: 'AAPL', targetPercentage: 30 },
      { ticker: 'VTI', targetPercentage: 40 },
      { ticker: '7203.T', targetPercentage: 30 }
    ];

    it('リバランス差分を正確に計算する', () => {
      const result = PortfolioCalculationService.calculateRebalanceDifferences(
        currentAllocations,
        targetAllocations
      );

      expect(result).toHaveLength(3);

      // AAPL: 30 - 40 = -10 (10%オーバーウェイト)
      expect(result[0].ticker).toBe('AAPL');
      expect(result[0].currentPercentage).toBe(40);
      expect(result[0].targetPercentage).toBe(30);
      expect(result[0].difference).toBe(-10);

      // VTI: 40 - 35 = 5 (5%アンダーウェイト)
      expect(result[1].ticker).toBe('VTI');
      expect(result[1].currentPercentage).toBe(35);
      expect(result[1].targetPercentage).toBe(40);
      expect(result[1].difference).toBe(5);

      // 7203.T: 30 - 25 = 5 (5%アンダーウェイト)
      expect(result[2].ticker).toBe('7203.T');
      expect(result[2].currentPercentage).toBe(25);
      expect(result[2].targetPercentage).toBe(30);
      expect(result[2].difference).toBe(5);
    });

    it('目標配分に存在しない資産は目標0%として扱う', () => {
      const currentWithExtra = [
        ...currentAllocations,
        {
          ticker: 'EXTRA',
          name: 'Extra Asset',
          currentPercentage: 10
        }
      ];

      const result = PortfolioCalculationService.calculateRebalanceDifferences(
        currentWithExtra,
        targetAllocations
      );

      const extraAsset = result.find(r => r.ticker === 'EXTRA');
      expect(extraAsset.targetPercentage).toBe(0);
      expect(extraAsset.difference).toBe(-10); // 0 - 10 = -10
    });

    it('空の配列を正しく処理する', () => {
      const result = PortfolioCalculationService.calculateRebalanceDifferences([], []);
      expect(result).toEqual([]);
    });

    it('必要なフィールドが全て含まれる', () => {
      const result = PortfolioCalculationService.calculateRebalanceDifferences(
        currentAllocations,
        targetAllocations
      );

      result.forEach(item => {
        expect(item).toHaveProperty('ticker');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('currentPercentage');
        expect(item).toHaveProperty('targetPercentage');
        expect(item).toHaveProperty('difference');
      });
    });

    it('差分の合計はゼロになる（バランス確認）', () => {
      const result = PortfolioCalculationService.calculateRebalanceDifferences(
        currentAllocations,
        targetAllocations
      );

      const totalDifference = result.reduce((sum, item) => sum + item.difference, 0);
      expect(totalDifference).toBe(0); // -10 + 5 + 5 = 0
    });

    it('完全にバランスされた場合は全て0差分', () => {
      const balancedCurrent = [
        { ticker: 'AAPL', name: 'Apple Inc.', currentPercentage: 30 },
        { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', currentPercentage: 40 },
        { ticker: '7203.T', name: 'トヨタ自動車', currentPercentage: 30 }
      ];

      const result = PortfolioCalculationService.calculateRebalanceDifferences(
        balancedCurrent,
        targetAllocations
      );

      result.forEach(item => {
        expect(item.difference).toBe(0);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('リアルなポートフォリオシナリオ：米国株＋日本株の混合', () => {
      const realAssets = [
        {
          ticker: 'SPY',
          name: 'SPDR S&P 500 ETF',
          price: 400,
          holdings: 25,
          currency: 'USD',
          annualFee: 0.09,
          hasDividend: true,
          dividendYield: 1.5
        },
        {
          ticker: 'VEA',
          name: 'Vanguard FTSE Developed Markets ETF',
          price: 50,
          holdings: 200,
          currency: 'USD',
          annualFee: 0.05,
          hasDividend: true,
          dividendYield: 2.8
        },
        {
          ticker: '1306.T',
          name: 'TOPIX連動型上場投資信託',
          price: 2000,
          holdings: 500,
          currency: 'JPY',
          annualFee: 0.06,
          hasDividend: true,
          dividendYield: 2.1
        }
      ];

      const totalAssetsUSD = PortfolioCalculationService.calculateTotalAssets(
        realAssets,
        'USD',
        mockExchangeRate
      );

      const totalFeesUSD = PortfolioCalculationService.calculateAnnualFees(
        realAssets,
        'USD',
        mockExchangeRate
      );

      const totalDividendsUSD = PortfolioCalculationService.calculateAnnualDividends(
        realAssets,
        'USD',
        mockExchangeRate
      );

      const allocations = PortfolioCalculationService.calculateCurrentAllocations(
        realAssets,
        totalAssetsUSD,
        'USD',
        mockExchangeRate
      );

      // 検証
      expect(totalAssetsUSD).toBeGreaterThan(0);
      expect(totalFeesUSD).toBeGreaterThan(0);
      expect(totalDividendsUSD).toBeGreaterThan(0);
      expect(allocations).toHaveLength(3);

      const totalPercentage = allocations.reduce((sum, asset) => sum + asset.currentPercentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('極端なシナリオ：単一銘柄の巨額投資', () => {
      const extremeAssets = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          price: 150,
          holdings: 100000, // 巨額
          currency: 'USD',
          annualFee: 0.0,
          hasDividend: true,
          dividendYield: 0.5
        }
      ];

      const totalAssets = PortfolioCalculationService.calculateTotalAssets(
        extremeAssets,
        'USD',
        mockExchangeRate
      );

      const allocations = PortfolioCalculationService.calculateCurrentAllocations(
        extremeAssets,
        totalAssets,
        'USD',
        mockExchangeRate
      );

      expect(totalAssets).toBe(15000000); // 150 * 100000
      expect(allocations[0].currentPercentage).toBe(100);
    });

    it('ゼロ金額資産を含むミックスポートフォリオ', () => {
      const mixedAssets = [
        {
          ticker: 'AAPL',
          price: 150,
          holdings: 0, // ゼロ保有
          currency: 'USD',
          annualFee: 0.5,
          hasDividend: true,
          dividendYield: 2.0
        },
        {
          ticker: 'VTI',
          price: 200,
          holdings: 5,
          currency: 'USD',
          annualFee: 0.03,
          hasDividend: true,
          dividendYield: 1.8
        }
      ];

      const totalAssets = PortfolioCalculationService.calculateTotalAssets(
        mixedAssets,
        'USD',
        mockExchangeRate
      );

      const fees = PortfolioCalculationService.calculateAnnualFees(
        mixedAssets,
        'USD',
        mockExchangeRate
      );

      const dividends = PortfolioCalculationService.calculateAnnualDividends(
        mixedAssets,
        'USD',
        mockExchangeRate
      );

      expect(totalAssets).toBe(1000); // VTIのみ
      expect(fees).toBeCloseTo(0.3, 2); // VTIの手数料のみ
      expect(dividends).toBeCloseTo(18, 2); // VTIの配当のみ
    });

    it('数学的精度テスト：小数点以下の精度確認', () => {
      const precisionAssets = [
        {
          ticker: 'TEST1',
          price: 33.33,
          holdings: 3.333,
          currency: 'USD',
          annualFee: 0.123,
          hasDividend: true,
          dividendYield: 1.234
        },
        {
          ticker: 'TEST2',
          price: 123.456,
          holdings: 7.89,
          currency: 'JPY',
          annualFee: 0.0987,
          hasDividend: true,
          dividendYield: 2.468
        }
      ];

      const totalAssets = PortfolioCalculationService.calculateTotalAssets(
        precisionAssets,
        'USD',
        mockExchangeRate
      );

      const fees = PortfolioCalculationService.calculateAnnualFees(
        precisionAssets,
        'USD',
        mockExchangeRate
      );

      const dividends = PortfolioCalculationService.calculateAnnualDividends(
        precisionAssets,
        'USD',
        mockExchangeRate
      );

      // 精度チェック - 計算結果が数値であり、NaNでないことを確認
      expect(typeof totalAssets).toBe('number');
      expect(typeof fees).toBe('number');
      expect(typeof dividends).toBe('number');
      expect(isNaN(totalAssets)).toBe(false);
      expect(isNaN(fees)).toBe(false);
      expect(isNaN(dividends)).toBe(false);
    });
  });
});