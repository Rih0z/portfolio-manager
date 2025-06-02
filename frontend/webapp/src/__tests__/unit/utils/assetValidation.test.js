/**
 * assetValidation.js のユニットテスト
 * アセット検証ユーティリティのテスト
 */

import {
  validateAssetTypes,
  validatePortfolioData,
  sanitizeAssetData,
  validateAssetInput,
  validateTickerFormat,
  validateAssetName,
  validateNumericValue
} from '../../../utils/assetValidation';

// fundUtilsのモック
jest.mock('../../../utils/fundUtils', () => ({
  guessFundType: jest.fn(),
  FUND_TYPES: {
    STOCK: 'stock',
    MUTUAL_FUND: 'mutual_fund',
    ETF: 'etf',
    UNKNOWN: 'unknown'
  },
  FUND_TYPE_FEES: {
    stock: 0,
    mutual_fund: 1.0,
    etf: 0.3
  },
  TICKER_SPECIFIC_FEES: {
    'VTI': 0.03,
    'VXUS': 0.08,
    'SPY': 0.09
  }
}));

import { guessFundType, FUND_TYPES, FUND_TYPE_FEES, TICKER_SPECIFIC_FEES } from '../../../utils/fundUtils';

describe('assetValidation', () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // guessFundTypeのデフォルトモック
    guessFundType.mockReturnValue(FUND_TYPES.STOCK);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('validateAssetTypes', () => {
    it('正常な資産配列を検証する', () => {
      const assets = [
        {
          id: '1',
          ticker: 'AAPL',
          name: 'Apple Inc.',
          fundType: 'stock',
          annualFee: 0,
          holdings: 100
        },
        {
          id: '2',
          ticker: 'VTI',
          name: 'Vanguard Total Stock Market ETF',
          fundType: 'etf',
          annualFee: 0.03,
          holdings: 50
        }
      ];

      guessFundType
        .mockReturnValueOnce(FUND_TYPES.STOCK)
        .mockReturnValueOnce(FUND_TYPES.ETF);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets).toHaveLength(2);
      expect(result.changes.fundType).toBe(0);
      expect(result.changes.fees).toBe(0);
      expect(result.changes.dividends).toBe(0);
    });

    it('空でない配列以外は空の結果を返す', () => {
      const testCases = [
        null,
        undefined,
        'not an array',
        123,
        {}
      ];

      testCases.forEach(input => {
        const result = validateAssetTypes(input);
        
        expect(result).toEqual({
          updatedAssets: [],
          changes: { fundType: 0, fees: 0, dividends: 0 }
        });
      });
    });

    it('ファンドタイプが未設定の場合は推測値を設定する', () => {
      const assets = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          // fundTypeが未設定
          annualFee: 0
        },
        {
          ticker: 'VTI',
          name: 'Vanguard ETF',
          fundType: 'unknown',
          annualFee: 0.03
        }
      ];

      guessFundType
        .mockReturnValueOnce(FUND_TYPES.STOCK)
        .mockReturnValueOnce(FUND_TYPES.ETF);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets[0].fundType).toBe(FUND_TYPES.STOCK);
      expect(result.updatedAssets[1].fundType).toBe(FUND_TYPES.ETF);
      expect(result.changes.fundType).toBe(2);
    });

    it('不正なファンドタイプを修正する', () => {
      const assets = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          fundType: '不明',
          annualFee: 0
        }
      ];

      guessFundType.mockReturnValue(FUND_TYPES.STOCK);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets[0].fundType).toBe(FUND_TYPES.STOCK);
      expect(result.changes.fundType).toBe(1);
    });

    it('推測と異なるファンドタイプを修正する', () => {
      const assets = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          fundType: 'mutual_fund', // 間違ったタイプ
          annualFee: 1.0
        }
      ];

      guessFundType.mockReturnValue(FUND_TYPES.STOCK);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets[0].fundType).toBe(FUND_TYPES.STOCK);
      expect(result.changes.fundType).toBe(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'ファンドタイプを修正: AAPL - mutual_fund → stock'
      );
    });

    it('isStockとisMutualFundフラグを正しく設定する', () => {
      const assets = [
        { ticker: 'AAPL', name: 'Apple' },
        { ticker: 'FUND', name: 'Mutual Fund' }
      ];

      guessFundType
        .mockReturnValueOnce(FUND_TYPES.STOCK)
        .mockReturnValueOnce(FUND_TYPES.MUTUAL_FUND);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets[0].isStock).toBe(true);
      expect(result.updatedAssets[0].isMutualFund).toBe(false);
      expect(result.updatedAssets[1].isStock).toBe(false);
      expect(result.updatedAssets[1].isMutualFund).toBe(true);
    });

    it('個別株の手数料を0に修正する', () => {
      const assets = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          fundType: 'stock',
          annualFee: 1.0 // 間違った手数料
        }
      ];

      guessFundType.mockReturnValue(FUND_TYPES.STOCK);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets[0].annualFee).toBe(0);
      expect(result.changes.fees).toBe(1);
    });

    it('ETFの手数料をティッカー固有の値に修正する', () => {
      const assets = [
        {
          ticker: 'VTI',
          name: 'Vanguard ETF',
          fundType: 'etf',
          annualFee: 1.0 // 間違った手数料
        }
      ];

      guessFundType.mockReturnValue(FUND_TYPES.ETF);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets[0].annualFee).toBe(0.03);
      expect(result.changes.fees).toBe(1);
    });

    it('投資信託の手数料をデフォルト値に修正する', () => {
      const assets = [
        {
          ticker: 'FUND123',
          name: 'Some Mutual Fund',
          fundType: 'mutual_fund',
          annualFee: 0 // 間違った手数料
        }
      ];

      guessFundType.mkReturn(FUND_TYPES.MUTUAL_FUND);

      const result = validateAssetTypes(assets);

      expect(result.updatedAssets[0].annualFee).toBe(1.0);
      expect(result.changes.fees).toBe(1);
    });

    it('ティッカーがない場合はidを使用する', () => {
      const assets = [
        {
          id: 'MSFT',
          name: 'Microsoft',
          // tickerが未設定
        }
      ];

      guessFundType.mockReturnValue(FUND_TYPES.STOCK);

      const result = validateAssetTypes(assets);

      expect(guessFundType).toHaveBeenCalledWith('MSFT', 'Microsoft');
    });

    it('名前がない場合はティッカーを使用する', () => {
      const assets = [
        {
          ticker: 'GOOGL',
          // nameが未設定
        }
      ];

      guessFundType.mockReturnValue(FUND_TYPES.STOCK);

      const result = validateAssetTypes(assets);

      expect(guessFundType).toHaveBeenCalledWith('GOOGL', 'GOOGL');
    });

    it('配当支払い状況の検証を行う', () => {
      const assets = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          fundType: 'stock',
          paysDividend: undefined
        }
      ];

      guessFundType.mockReturnValue(FUND_TYPES.STOCK);

      const result = validateAssetTypes(assets);

      // 配当情報が設定されることを確認
      expect(result.updatedAssets[0]).toHaveProperty('paysDividend');
    });
  });

  describe('validatePortfolioData', () => {
    it('正常なポートフォリオデータを検証する', () => {
      const portfolioData = {
        currentAssets: [
          { ticker: 'AAPL', name: 'Apple', fundType: 'stock', holdings: 100 }
        ],
        targetPortfolio: [
          { ticker: 'AAPL', name: 'Apple', targetPercentage: 50 }
        ],
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150, source: 'test' }
      };

      const result = validatePortfolioData(portfolioData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('無効なポートフォリオデータを検証する', () => {
      const portfolioData = {
        currentAssets: 'not an array',
        targetPortfolio: null,
        baseCurrency: '',
        exchangeRate: undefined
      };

      const result = validatePortfolioData(portfolioData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('空のポートフォリオデータを処理する', () => {
      const result = validatePortfolioData({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('currentAssetsが無効です');
    });
  });

  describe('sanitizeAssetData', () => {
    it('アセットデータをサニタイズする', () => {
      const dirtyAsset = {
        ticker: '  AAPL  ',
        name: '  Apple Inc.  ',
        holdings: '100',
        annualFee: '0.5',
        extraField: 'should be removed'
      };

      const result = sanitizeAssetData(dirtyAsset);

      expect(result.ticker).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.holdings).toBe(100);
      expect(result.annualFee).toBe(0.5);
      expect(result).not.toHaveProperty('extraField');
    });

    it('不正な数値を0に修正する', () => {
      const asset = {
        ticker: 'TEST',
        holdings: 'invalid',
        annualFee: 'not a number'
      };

      const result = sanitizeAssetData(asset);

      expect(result.holdings).toBe(0);
      expect(result.annualFee).toBe(0);
    });
  });

  describe('validateAssetInput', () => {
    it('有効な入力を検証する', () => {
      const input = {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        holdings: 100,
        annualFee: 0
      };

      const result = validateAssetInput(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('無効な入力を検証する', () => {
      const input = {
        ticker: '',
        name: '',
        holdings: -10,
        annualFee: 150
      };

      const result = validateAssetInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTickerFormat', () => {
    it('有効なティッカー形式を検証する', () => {
      const validTickers = [
        'AAPL',
        'VTI',
        '7203.T',
        'BRK.B',
        'MSFT'
      ];

      validTickers.forEach(ticker => {
        expect(validateTickerFormat(ticker)).toBe(true);
      });
    });

    it('無効なティッカー形式を検証する', () => {
      const invalidTickers = [
        '',
        '   ',
        '123',
        'tick er',
        'TICKER_WITH_UNDERSCORE'
      ];

      invalidTickers.forEach(ticker => {
        expect(validateTickerFormat(ticker)).toBe(false);
      });
    });
  });

  describe('validateAssetName', () => {
    it('有効な名前を検証する', () => {
      const validNames = [
        'Apple Inc.',
        'Vanguard Total Stock Market ETF',
        '三菱UFJ銀行'
      ];

      validNames.forEach(name => {
        expect(validateAssetName(name)).toBe(true);
      });
    });

    it('無効な名前を検証する', () => {
      const invalidNames = [
        '',
        '   ',
        'A', // 短すぎる
        'A'.repeat(101) // 長すぎる
      ];

      invalidNames.forEach(name => {
        expect(validateAssetName(name)).toBe(false);
      });
    });
  });

  describe('validateNumericValue', () => {
    it('有効な数値を検証する', () => {
      const validCases = [
        { value: 100, min: 0, max: 1000, expected: true },
        { value: 0, min: 0, max: 100, expected: true },
        { value: 50.5, min: 0, max: 100, expected: true }
      ];

      validCases.forEach(({ value, min, max, expected }) => {
        expect(validateNumericValue(value, min, max)).toBe(expected);
      });
    });

    it('無効な数値を検証する', () => {
      const invalidCases = [
        { value: -10, min: 0, max: 100, expected: false },
        { value: 150, min: 0, max: 100, expected: false },
        { value: NaN, min: 0, max: 100, expected: false },
        { value: 'not a number', min: 0, max: 100, expected: false }
      ];

      invalidCases.forEach(({ value, min, max, expected }) => {
        expect(validateNumericValue(value, min, max)).toBe(expected);
      });
    });
  });

  describe('エラーケース', () => {
    it('nullアセット配列を処理する', () => {
      const result = validateAssetTypes(null);
      
      expect(result.updatedAssets).toEqual([]);
      expect(result.changes).toEqual({ fundType: 0, fees: 0, dividends: 0 });
    });

    it('空のアセットオブジェクトを処理する', () => {
      const assets = [{}];
      
      guessFundType.mockReturnValue(FUND_TYPES.UNKNOWN);
      
      const result = validateAssetTypes(assets);
      
      expect(result.updatedAssets[0].ticker).toBe('');
      expect(result.updatedAssets[0].fundType).toBe(FUND_TYPES.UNKNOWN);
    });

    it('guessFundTypeがエラーを投げた場合を処理する', () => {
      const assets = [
        { ticker: 'ERROR', name: 'Error Test' }
      ];

      guessFundType.mockImplementation(() => {
        throw new Error('Fund type detection failed');
      });

      expect(() => validateAssetTypes(assets)).not.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のアセットを効率的に処理する', () => {
      const assets = Array.from({ length: 1000 }, (_, i) => ({
        ticker: `STOCK${i}`,
        name: `Stock ${i}`,
        fundType: 'unknown',
        holdings: i + 1
      }));

      guessFundType.mockReturnValue(FUND_TYPES.STOCK);

      const startTime = Date.now();
      const result = validateAssetTypes(assets);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // 500ms以内
      expect(result.updatedAssets).toHaveLength(1000);
      expect(result.changes.fundType).toBe(1000);
    });
  });

  describe('統合テスト', () => {
    it('複数の検証処理を組み合わせて実行する', () => {
      const assets = [
        {
          ticker: '  AAPL  ',
          name: '  Apple Inc.  ',
          fundType: 'unknown',
          annualFee: '1.0',
          holdings: '100'
        },
        {
          ticker: 'VTI',
          name: 'Vanguard ETF',
          fundType: 'mutual_fund', // 間違ったタイプ
          annualFee: 1.0 // 間違った手数料
        }
      ];

      guessFundType
        .mockReturnValueOnce(FUND_TYPES.STOCK)
        .mockReturnValueOnce(FUND_TYPES.ETF);

      // 1. 基本検証
      const validationResult = validateAssetTypes(assets);
      
      // 2. データサニタイズ
      const sanitizedAssets = validationResult.updatedAssets.map(asset => 
        sanitizeAssetData(asset)
      );

      expect(validationResult.changes.fundType).toBe(2);
      expect(validationResult.changes.fees).toBe(2);
      expect(sanitizedAssets[0].ticker).toBe('AAPL');
      expect(sanitizedAssets[0].annualFee).toBe(0);
      expect(sanitizedAssets[1].fundType).toBe(FUND_TYPES.ETF);
      expect(sanitizedAssets[1].annualFee).toBe(0.03);
    });
  });
});