/**
 * japaneseStockNames.js のユニットテスト
 * 日本の投資信託と株式の名前マッピングのテスト
 */

import {
  MUTUAL_FUND_NAMES,
  JAPAN_STOCK_NAMES,
  getJapaneseStockName,
  formatJapaneseStockDisplay
} from '../../../utils/japaneseStockNames';

describe('japaneseStockNames', () => {
  describe('MUTUAL_FUND_NAMES', () => {
    it('主要な投資信託の名前が定義されている', () => {
      expect(MUTUAL_FUND_NAMES).toBeDefined();
      expect(typeof MUTUAL_FUND_NAMES).toBe('object');
      
      // eMAXIS Slim 米国株式(S&P500)
      expect(MUTUAL_FUND_NAMES['0331418A']).toBe('eMAXIS Slim 米国株式(S&P500)');
      
      // eMAXIS Slim 全世界株式(オール・カントリー)
      expect(MUTUAL_FUND_NAMES['03311187']).toBe('eMAXIS Slim 全世界株式(オール・カントリー)');
      
      // ひふみプラス
      expect(MUTUAL_FUND_NAMES['9C31116A']).toBe('ひふみプラス');
    });

    it('少なくとも15種類以上の投資信託が登録されている', () => {
      const count = Object.keys(MUTUAL_FUND_NAMES).length;
      expect(count).toBeGreaterThanOrEqual(15);
    });
  });

  describe('JAPAN_STOCK_NAMES', () => {
    it('主要な日本株の名前が定義されている', () => {
      expect(JAPAN_STOCK_NAMES).toBeDefined();
      expect(typeof JAPAN_STOCK_NAMES).toBe('object');
      
      // トヨタ自動車
      expect(JAPAN_STOCK_NAMES['7203']).toBe('トヨタ自動車');
      
      // ソニーグループ
      expect(JAPAN_STOCK_NAMES['6758']).toBe('ソニーグループ');
    });

    it('少なくとも20種類以上の日本株が登録されている', () => {
      const count = Object.keys(JAPAN_STOCK_NAMES).length;
      expect(count).toBeGreaterThanOrEqual(20);
    });
  });

  describe('getJapaneseStockName', () => {
    it('日本株の名前を正しく取得する', () => {
      expect(getJapaneseStockName('7203')).toBe('トヨタ自動車');
      expect(getJapaneseStockName('6758')).toBe('ソニーグループ');
    });

    it('4桁の番号コードで正しく動作する', () => {
      expect(getJapaneseStockName('7203')).toBe('トヨタ自動車');
      expect(getJapaneseStockName('6758')).toBe('ソニーグループ');
    });

    it('.T付きの銘柄コードを4桁に変換して処理する', () => {
      expect(getJapaneseStockName('7203.T')).toBe('トヨタ自動車');
      expect(getJapaneseStockName('6758.T')).toBe('ソニーグループ');
    });

    it('未知の銘柄コードの場合は元の値を返す', () => {
      expect(getJapaneseStockName('9999')).toBe('9999');
      expect(getJapaneseStockName('AAPL')).toBe('AAPL');
      expect(getJapaneseStockName('0331418A')).toBe('0331418A');
    });

    it('無効な入力に対しても元の値を返す', () => {
      expect(getJapaneseStockName('')).toBe('');
      expect(getJapaneseStockName(null)).toBe(null);
      expect(getJapaneseStockName(undefined)).toBe(undefined);
    });

    it('4桁でない数字は変換しない', () => {
      expect(getJapaneseStockName('123')).toBe('123');
      expect(getJapaneseStockName('12345')).toBe('12345');
    });
  });

  describe('formatJapaneseStockDisplay', () => {
    it('日本株の場合は「銘柄コード - 名前」形式で返す', () => {
      expect(formatJapaneseStockDisplay('7203')).toBe('7203 - トヨタ自動車');
      expect(formatJapaneseStockDisplay('6758')).toBe('6758 - ソニーグループ');
    });

    it('.T付きの銘柄でも正しく動作する', () => {
      expect(formatJapaneseStockDisplay('7203.T')).toBe('7203.T - トヨタ自動車');
      expect(formatJapaneseStockDisplay('6758.T')).toBe('6758.T - ソニーグループ');
    });

    it('未知の銘柄の場合は銘柄コードのみを返す', () => {
      expect(formatJapaneseStockDisplay('9999')).toBe('9999');
      expect(formatJapaneseStockDisplay('AAPL')).toBe('AAPL');
      expect(formatJapaneseStockDisplay('0331418A')).toBe('0331418A');
    });

    it('空文字や無効な値の場合も適切に処理する', () => {
      expect(formatJapaneseStockDisplay('')).toBe('');
      expect(formatJapaneseStockDisplay(null)).toBe(null);
      expect(formatJapaneseStockDisplay(undefined)).toBe(undefined);
    });
  });

  describe('データ整合性テスト', () => {
    it('MUTUAL_FUND_NAMESのすべてのキーが文字列である', () => {
      Object.keys(MUTUAL_FUND_NAMES).forEach(key => {
        expect(typeof key).toBe('string');
      });
    });

    it('MUTUAL_FUND_NAMESのすべての値が文字列である', () => {
      Object.values(MUTUAL_FUND_NAMES).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('JAPAN_STOCK_NAMESのすべてのキーが4桁の数字である', () => {
      Object.keys(JAPAN_STOCK_NAMES).forEach(key => {
        expect(typeof key).toBe('string');
        expect(/^\d{4}$/.test(key)).toBe(true);
      });
    });

    it('JAPAN_STOCK_NAMESのすべての値が文字列である', () => {
      Object.values(JAPAN_STOCK_NAMES).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('エッジケース', () => {
    it('非常に長い文字列でも適切に処理される', () => {
      const longString = 'a'.repeat(1000);
      expect(getJapaneseStockName(longString)).toBe(longString);
      expect(formatJapaneseStockDisplay(longString)).toBe(longString);
    });

    it('特殊文字を含む銘柄コードも適切に処理される', () => {
      const specialChars = ['ABC-123', 'DEF.GHI', 'JKL/MNO'];
      specialChars.forEach(ticker => {
        expect(getJapaneseStockName(ticker)).toBe(ticker);
        expect(formatJapaneseStockDisplay(ticker)).toBe(ticker);
      });
    });

    it('数値を渡しても適切に処理される', () => {
      expect(getJapaneseStockName(7203)).toBe(7203);
      expect(formatJapaneseStockDisplay(7203)).toBe(7203);
    });
  });
});