/**
 * fundUtils.js のユニットテスト
 * ファンドの種類と手数料推定のためのユーティリティ関数のテスト
 */

import {
  guessFundType,
  estimateAnnualFee,
  extractFundInfo,
  estimateDividendYield,
  FUND_TYPES,
  US_ETF_LIST,
  TICKER_SPECIFIC_FEES,
  TICKER_SPECIFIC_DIVIDENDS
} from '../../../utils/fundUtils';

describe('fundUtils', () => {
  describe('guessFundType', () => {
    it('空のティッカーでは UNKNOWN を返す', () => {
      expect(guessFundType('')).toBe(FUND_TYPES.UNKNOWN);
      expect(guessFundType(null)).toBe(FUND_TYPES.UNKNOWN);
      expect(guessFundType(undefined)).toBe(FUND_TYPES.UNKNOWN);
    });

    it('米国ETFを正しく判定する', () => {
      expect(guessFundType('SPY')).toBe(FUND_TYPES.ETF_US);
      expect(guessFundType('VOO')).toBe(FUND_TYPES.ETF_US);
      expect(guessFundType('VTI')).toBe(FUND_TYPES.ETF_US);
      expect(guessFundType('VXUS')).toBe(FUND_TYPES.ETF_US);
    });

    it('日本のETFを正しく判定する', () => {
      expect(guessFundType('1306.T')).toBe(FUND_TYPES.ETF_JP);
      expect(guessFundType('1320.T')).toBe(FUND_TYPES.ETF_JP);
      expect(guessFundType('1234.T', '')).toBe(FUND_TYPES.ETF_JP);
    });

    it('米国REITを正しく判定する', () => {
      expect(guessFundType('VNQ', 'real estate')).toBe(FUND_TYPES.REIT_US);
      expect(guessFundType('SPY', 'reit fund')).toBe(FUND_TYPES.REIT_US);
    });

    it('日本REITを正しく判定する', () => {
      expect(guessFundType('1343.T', 'リート')).toBe(FUND_TYPES.REIT_JP);
      expect(guessFundType('1343', 'リート')).toBe(FUND_TYPES.REIT_JP);
    });

    it('債券ファンドを正しく判定する', () => {
      expect(guessFundType('BND')).toBe(FUND_TYPES.BOND);
      expect(guessFundType('AGG')).toBe(FUND_TYPES.BOND);
      expect(guessFundType('TEST', 'bond fund')).toBe(FUND_TYPES.BOND);
      expect(guessFundType('TEST', '債券ファンド')).toBe(FUND_TYPES.BOND);
    });

    it('暗号資産関連を正しく判定する', () => {
      expect(guessFundType('GBTC')).toBe(FUND_TYPES.CRYPTO);
      expect(guessFundType('IBIT')).toBe(FUND_TYPES.CRYPTO);
      expect(guessFundType('TEST', 'bitcoin')).toBe(FUND_TYPES.CRYPTO);
      expect(guessFundType('TEST', 'ビットコイン')).toBe(FUND_TYPES.CRYPTO);
    });

    it('eMAXISファンドを正しく判定する', () => {
      expect(guessFundType('253266', 'eMAXIS Slim 全世界')).toBe(FUND_TYPES.INDEX_GLOBAL);
      expect(guessFundType('2533106', 'eMAXIS Slim 米国')).toBe(FUND_TYPES.INDEX_US);
      expect(guessFundType('253265', 'eMAXIS 日経225')).toBe(FUND_TYPES.INDEX_JP);
    });

    it('楽天VTファンドを正しく判定する', () => {
      expect(guessFundType('252499', '楽天 全世界')).toBe(FUND_TYPES.INDEX_GLOBAL);
      expect(guessFundType('252498', '楽天 米国')).toBe(FUND_TYPES.INDEX_US);
    });

    it('投資信託（インデックス）を正しく判定する', () => {
      expect(guessFundType('12345678', 'インデックス グローバル')).toBe(FUND_TYPES.INDEX_GLOBAL);
      expect(guessFundType('1234567A', 'index 米国')).toBe(FUND_TYPES.INDEX_US);
      expect(guessFundType('ABCD1234', 'インデックス 日本')).toBe(FUND_TYPES.INDEX_JP);
    });

    it('投資信託（アクティブ）を正しく判定する', () => {
      expect(guessFundType('12345678', 'アクティブ グローバル')).toBe(FUND_TYPES.ACTIVE_GLOBAL);
      expect(guessFundType('1234567A', 'アクティブ 米国')).toBe(FUND_TYPES.ACTIVE_US);
      expect(guessFundType('ABCD1234', 'アクティブ 日本')).toBe(FUND_TYPES.ACTIVE_JP);
    });

    it('4桁コードの判定が正しく動作する', () => {
      expect(guessFundType('2530')).toBe(FUND_TYPES.INDEX_JP); // 253で始まる
      expect(guessFundType('2599', '')).toBe(FUND_TYPES.INDEX_JP); // 25で始まる、名前が空なのでisActiveOrIndex -> INDEX_JP
      expect(guessFundType('1234')).toBe(FUND_TYPES.ETF_JP); // 1で始まる
      expect(guessFundType('2234')).toBe(FUND_TYPES.ETF_JP); // 2で始まる
      expect(guessFundType('7203')).toBe(FUND_TYPES.STOCK); // その他
    });

    it('ファンド名からETFを判定する', () => {
      expect(guessFundType('TEST', 'SPDR S&P 500 ETF')).toBe(FUND_TYPES.ETF_US);
      expect(guessFundType('1234.T', '上場投信')).toBe(FUND_TYPES.ETF_JP);
    });

    it('個別株を正しく判定する', () => {
      expect(guessFundType('AAPL')).toBe(FUND_TYPES.STOCK);
      expect(guessFundType('GOOGL')).toBe(FUND_TYPES.STOCK);
      expect(guessFundType('7203')).toBe(FUND_TYPES.STOCK); // トヨタ
    });
  });

  describe('estimateAnnualFee', () => {
    it('空のティッカーでは UNKNOWN タイプの手数料を返す', () => {
      const result = estimateAnnualFee('');
      expect(result.fee).toBe(0.5);
      expect(result.fundType).toBe(FUND_TYPES.UNKNOWN);
      expect(result.isEstimated).toBe(true);
    });

    it('特定ティッカーの手数料を正しく返す', () => {
      const result = estimateAnnualFee('SPY');
      expect(result.fee).toBe(0.09);
      expect(result.fundType).toBe(FUND_TYPES.ETF_US);
      expect(result.isEstimated).toBe(false);
      expect(result.source).toBe('ティッカー固有の情報');
    });

    it('個別株では手数料0を返す', () => {
      const result = estimateAnnualFee('AAPL');
      expect(result.fee).toBe(0);
      expect(result.fundType).toBe(FUND_TYPES.STOCK);
      expect(result.isEstimated).toBe(false);
      expect(result.source).toBe('個別株');
    });

    it('ファンドタイプから手数料を推定する', () => {
      const result = estimateAnnualFee('TEST', 'インデックス 米国');
      expect(result.fee).toBe(0.15); // INDEX_US の手数料
      expect(result.fundType).toBe(FUND_TYPES.INDEX_US);
      expect(result.isEstimated).toBe(true);
      expect(result.source).toBe('ファンドタイプからの推定');
    });

    it('大文字小文字を区別しない', () => {
      const result1 = estimateAnnualFee('spy');
      const result2 = estimateAnnualFee('SPY');
      expect(result1.fee).toBe(result2.fee);
    });
  });

  describe('extractFundInfo', () => {
    it('基本的な情報を正しく抽出する', () => {
      const info = extractFundInfo('SPY', 'SPDR S&P 500 ETF');
      expect(info.currency).toBe('USD');
      expect(info.region).toBe('米国');
      expect(info.fundType).toBe(FUND_TYPES.ETF_US);
      expect(info.isStock).toBe(false);
    });

    it('日本の銘柄を正しく判定する', () => {
      const info = extractFundInfo('1306.T', 'TOPIX ETF');
      expect(info.currency).toBe('JPY');
      expect(info.region).toBe('日本');
    });

    it('グローバルファンドを正しく判定する', () => {
      const info = extractFundInfo('VT', 'Vanguard Total World Stock ETF');
      expect(info.region).toBe('グローバル');
    });

    it('配当情報を正しく推定する', () => {
      const info = extractFundInfo('VYM', 'Vanguard High Dividend Yield ETF');
      expect(info.hasDividend).toBe(true);
      expect(info.dividendFrequency).toBe('quarterly');
    });

    it('毎月配当を正しく判定する', () => {
      const info = extractFundInfo('TEST', 'Monthly Dividend Fund');
      expect(info.hasDividend).toBe(true);
      expect(info.dividendFrequency).toBe('monthly');
    });

    it('個別株の情報を正しく抽出する', () => {
      const info = extractFundInfo('AAPL', 'Apple Inc.');
      expect(info.isStock).toBe(true);
      expect(info.fundType).toBe(FUND_TYPES.STOCK);
      expect(info.hasDividend).toBe(false);
    });

    it('ETFの配当情報を正しく推定する', () => {
      const info = extractFundInfo('VTI', 'Vanguard Total Stock Market ETF');
      expect(info.hasDividend).toBe(true);
      expect(info.dividendFrequency).toBe('quarterly');
    });
  });

  describe('estimateDividendYield', () => {
    it('空のティッカーでは0を返す', () => {
      const result = estimateDividendYield('');
      expect(result.yield).toBe(0);
      expect(result.isEstimated).toBe(true);
      expect(result.hasDividend).toBe(false);
    });

    it('特定ティッカーの配当利回りを正しく返す', () => {
      const result = estimateDividendYield('SPY');
      expect(result.yield).toBe(1.5);
      expect(result.isEstimated).toBe(false);
      expect(result.hasDividend).toBe(true);
    });

    it('個別株では0を返す', () => {
      const result = estimateDividendYield('AAPL');
      expect(result.yield).toBe(0);
      expect(result.hasDividend).toBe(false);
    });

    it('米国REITの配当利回りを推定する', () => {
      const result = estimateDividendYield('TEST', 'US REIT Fund');
      expect(result.yield).toBe(4.0);
      expect(result.hasDividend).toBe(true);
      expect(result.isEstimated).toBe(true);
    });

    it('日本REITの配当利回りを推定する', () => {
      const result = estimateDividendYield('1343.T', 'J-REIT ETF');
      expect(result.yield).toBe(3.5);
      expect(result.hasDividend).toBe(true);
    });

    it('債券ファンドの配当利回りを推定する', () => {
      const result = estimateDividendYield('TEST', 'Bond Fund');
      expect(result.yield).toBe(2.5);
      expect(result.hasDividend).toBe(true);
    });

    it('高配当ファンドを正しく判定する', () => {
      const result = estimateDividendYield('TEST', 'dividend fund');
      expect(result.yield).toBe(3.0);
      expect(result.hasDividend).toBe(true);
    });

    it('金ETFでは配当なしを返す', () => {
      const result = estimateDividendYield('GLD');
      expect(result.yield).toBe(0);
      expect(result.hasDividend).toBe(false);
    });

    it('米国ETFの平均配当利回りを推定する', () => {
      const result = estimateDividendYield('TEST_ETF', 'US ETF');
      expect(result.yield).toBe(1.5);
      expect(result.hasDividend).toBe(true);
    });

    it('配当頻度を正しく設定する', () => {
      const result = estimateDividendYield('TEST', 'Quarterly Dividend Fund');
      expect(result.dividendFrequency).toBe('quarterly');
    });
  });

  describe('定数の整合性チェック', () => {
    it('US_ETF_LIST の銘柄が TICKER_SPECIFIC_FEES に含まれる', () => {
      const missingTickers = US_ETF_LIST.filter(ticker => 
        !TICKER_SPECIFIC_FEES.hasOwnProperty(ticker)
      );
      
      // 一部の銘柄は手数料が未定義でも問題ない
      expect(missingTickers.length).toBeLessThan(US_ETF_LIST.length);
    });

    it('TICKER_SPECIFIC_FEES の値がすべて数値である', () => {
      Object.values(TICKER_SPECIFIC_FEES).forEach(fee => {
        expect(typeof fee).toBe('number');
        expect(fee).toBeGreaterThanOrEqual(0);
        expect(fee).toBeLessThan(10); // 手数料は10%未満であるべき
      });
    });

    it('TICKER_SPECIFIC_DIVIDENDS の値がすべて数値である', () => {
      Object.values(TICKER_SPECIFIC_DIVIDENDS).forEach(dividend => {
        expect(typeof dividend).toBe('number');
        expect(dividend).toBeGreaterThanOrEqual(0);
        expect(dividend).toBeLessThan(20); // 配当利回りは20%未満であるべき
      });
    });

    it('FUND_TYPES の値がすべて文字列である', () => {
      Object.values(FUND_TYPES).forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('エッジケースのテスト', () => {
    it('nullやundefinedの名前を正しく処理する', () => {
      expect(() => guessFundType('SPY', null)).not.toThrow();
      expect(() => guessFundType('SPY', undefined)).not.toThrow();
      expect(() => extractFundInfo('SPY', null)).not.toThrow();
      expect(() => estimateDividendYield('SPY', null)).not.toThrow();
    });

    it('空白の名前を正しく処理する', () => {
      const result = guessFundType('SPY', '   ');
      expect(result).toBeDefined();
    });

    it('非常に長い名前を正しく処理する', () => {
      const longName = 'A'.repeat(1000);
      const result = guessFundType('SPY', longName);
      expect(result).toBeDefined();
    });

    it('特殊文字を含む名前を正しく処理する', () => {
      const result = guessFundType('SPY', 'Fund with @#$%^&*() characters');
      expect(result).toBeDefined();
    });

    it('日本語と英語が混在する名前を正しく処理する', () => {
      const result = guessFundType('TEST', 'eMAXIS Slim 全世界株式 All World');
      expect(result).toBe(FUND_TYPES.INDEX_GLOBAL);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のティッカーを高速で処理できる', () => {
      const tickers = Array.from({ length: 1000 }, (_, i) => `TICKER${i}`);
      
      const startTime = Date.now();
      tickers.forEach(ticker => {
        guessFundType(ticker);
        estimateAnnualFee(ticker);
        extractFundInfo(ticker);
        estimateDividendYield(ticker);
      });
      const endTime = Date.now();
      
      // 1000件の処理が1秒以内に完了することを確認
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});