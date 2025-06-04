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
    it('投資信託の名前マッピングが定義されている', () => {
      expect(MUTUAL_FUND_NAMES).toBeDefined();
      expect(typeof MUTUAL_FUND_NAMES).toBe('object');
      expect(Object.keys(MUTUAL_FUND_NAMES).length).toBeGreaterThan(0);
    });

    it('ニッセイファンドの名前が正しく定義されている', () => {
      expect(MUTUAL_FUND_NAMES['2931113C']).toBe('ニッセイ日経225インデックスファンド');
      expect(MUTUAL_FUND_NAMES['29311137']).toBe('ニッセイTOPIXインデックスファンド');
      expect(MUTUAL_FUND_NAMES['2931217C']).toBe('ニッセイ外国株式インデックスファンド');
    });

    it('eMAXIS Slimシリーズの名前が正しく定義されている', () => {
      expect(MUTUAL_FUND_NAMES['0331418A']).toBe('eMAXIS Slim 米国株式(S&P500)');
      expect(MUTUAL_FUND_NAMES['03311187']).toBe('eMAXIS Slim 全世界株式(オール・カントリー)');
      expect(MUTUAL_FUND_NAMES['0331119A']).toBe('eMAXIS Slim 先進国株式インデックス');
      expect(MUTUAL_FUND_NAMES['03311179']).toBe('eMAXIS Slim 国内株式(TOPIX)');
      expect(MUTUAL_FUND_NAMES['0331418B']).toBe('eMAXIS Slim 全世界株式(除く日本)');
    });

    it('iFreeシリーズの名前が正しく定義されている', () => {
      expect(MUTUAL_FUND_NAMES['04311138']).toBe('iFree 日経225インデックス');
      expect(MUTUAL_FUND_NAMES['04311217']).toBe('iFree TOPIXインデックス');
      expect(MUTUAL_FUND_NAMES['04311224']).toBe('iFree 外国株式インデックス(為替ヘッジなし)');
    });

    it('野村ファンドの名前が正しく定義されている', () => {
      expect(MUTUAL_FUND_NAMES['01311021']).toBe('野村インデックスファンド・日経225');
      expect(MUTUAL_FUND_NAMES['01311101']).toBe('野村インデックスファンド・TOPIX');
    });

    it('レオスファンドの名前が正しく定義されている', () => {
      expect(MUTUAL_FUND_NAMES['9C31116A']).toBe('ひふみプラス');
      expect(MUTUAL_FUND_NAMES['9C311125']).toBe('ひふみワールド');
    });

    it('SBIファンドの名前が正しく定義されている', () => {
      expect(MUTUAL_FUND_NAMES['89311199']).toBe('SBI・V・S&P500インデックス・ファンド');
      expect(MUTUAL_FUND_NAMES['89311229']).toBe('SBI・V・全世界株式インデックス・ファンド');
      expect(MUTUAL_FUND_NAMES['89311219']).toBe('SBI・V・全米株式インデックス・ファンド');
    });

    it('楽天ファンドの名前が正しく定義されている', () => {
      expect(MUTUAL_FUND_NAMES['9I311179']).toBe('楽天・全世界株式インデックス・ファンド');
      expect(MUTUAL_FUND_NAMES['9I311189']).toBe('楽天・全米株式インデックス・ファンド');
      expect(MUTUAL_FUND_NAMES['9I31118B']).toBe('楽天・S&P500インデックス・ファンド');
    });

    it('すべてのファンドコードが8文字または7文字+1英字の形式', () => {
      Object.keys(MUTUAL_FUND_NAMES).forEach(code => {
        expect(code).toMatch(/^(\d{8}|\d{7}[A-Z]|[A-Z0-9]{8})$/);
      });
    });

    it('すべてのファンド名が空でない文字列', () => {
      Object.values(MUTUAL_FUND_NAMES).forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('JAPAN_STOCK_NAMES', () => {
    it('日本株の名前マッピングが定義されている', () => {
      expect(JAPAN_STOCK_NAMES).toBeDefined();
      expect(typeof JAPAN_STOCK_NAMES).toBe('object');
      expect(Object.keys(JAPAN_STOCK_NAMES).length).toBeGreaterThan(0);
    });

    it('トヨタグループの名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['7203']).toBe('トヨタ自動車');
      expect(JAPAN_STOCK_NAMES['6201']).toBe('豊田自動織機');
      expect(JAPAN_STOCK_NAMES['6902']).toBe('デンソー');
      expect(JAPAN_STOCK_NAMES['7211']).toBe('三菱自動車');
      expect(JAPAN_STOCK_NAMES['7201']).toBe('日産自動車');
      expect(JAPAN_STOCK_NAMES['7267']).toBe('ホンダ');
    });

    it('ソニーグループの名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['6758']).toBe('ソニーグループ');
      expect(JAPAN_STOCK_NAMES['6971']).toBe('京セラ');
      expect(JAPAN_STOCK_NAMES['6861']).toBe('キーエンス');
    });

    it('通信会社の名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['9432']).toBe('日本電信電話（NTT）');
      expect(JAPAN_STOCK_NAMES['9433']).toBe('KDDI');
      expect(JAPAN_STOCK_NAMES['9434']).toBe('ソフトバンク');
      expect(JAPAN_STOCK_NAMES['9984']).toBe('ソフトバンクグループ');
    });

    it('銀行の名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['8306']).toBe('三菱UFJフィナンシャル・グループ');
      expect(JAPAN_STOCK_NAMES['8316']).toBe('三井住友フィナンシャルグループ');
      expect(JAPAN_STOCK_NAMES['8411']).toBe('みずほフィナンシャルグループ');
      expect(JAPAN_STOCK_NAMES['8308']).toBe('りそなホールディングス');
    });

    it('商社の名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['8058']).toBe('三菱商事');
      expect(JAPAN_STOCK_NAMES['8053']).toBe('住友商事');
      expect(JAPAN_STOCK_NAMES['8001']).toBe('伊藤忠商事');
      expect(JAPAN_STOCK_NAMES['8002']).toBe('丸紅');
      expect(JAPAN_STOCK_NAMES['8031']).toBe('三井物産');
    });

    it('テクノロジー企業の名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['6501']).toBe('日立製作所');
      expect(JAPAN_STOCK_NAMES['6503']).toBe('三菱電機');
      expect(JAPAN_STOCK_NAMES['6752']).toBe('パナソニック');
      expect(JAPAN_STOCK_NAMES['6753']).toBe('シャープ');
      expect(JAPAN_STOCK_NAMES['7751']).toBe('キヤノン');
      expect(JAPAN_STOCK_NAMES['7974']).toBe('任天堂');
    });

    it('小売・サービス企業の名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['3382']).toBe('セブン&アイ・ホールディングス');
      expect(JAPAN_STOCK_NAMES['8267']).toBe('イオン');
      expect(JAPAN_STOCK_NAMES['9983']).toBe('ファーストリテイリング');
      expect(JAPAN_STOCK_NAMES['4452']).toBe('花王');
      expect(JAPAN_STOCK_NAMES['4911']).toBe('資生堂');
    });

    it('製薬会社の名前が正しく定義されている', () => {
      expect(JAPAN_STOCK_NAMES['4502']).toBe('武田薬品工業');
      expect(JAPAN_STOCK_NAMES['4503']).toBe('アステラス製薬');
      expect(JAPAN_STOCK_NAMES['4519']).toBe('中外製薬');
      expect(JAPAN_STOCK_NAMES['4523']).toBe('エーザイ');
      expect(JAPAN_STOCK_NAMES['4568']).toBe('第一三共');
    });

    it('すべての株式コードが4桁の数字', () => {
      Object.keys(JAPAN_STOCK_NAMES).forEach(code => {
        expect(code).toMatch(/^\d{4}$/);
      });
    });

    it('すべての会社名が空でない文字列', () => {
      Object.values(JAPAN_STOCK_NAMES).forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getJapaneseStockName', () => {
    describe('投資信託の処理', () => {
      it('8桁の数字コードを正しく処理する', () => {
        expect(getJapaneseStockName('29311137')).toBe('ニッセイTOPIXインデックスファンド');
        expect(getJapaneseStockName('03311187')).toBe('eMAXIS Slim 全世界株式(オール・カントリー)');
      });

      it('7桁数字+1英字のコードを正しく処理する', () => {
        expect(getJapaneseStockName('2931113C')).toBe('ニッセイ日経225インデックスファンド');
        expect(getJapaneseStockName('0331418A')).toBe('eMAXIS Slim 米国株式(S&P500)');
        expect(getJapaneseStockName('9C31116A')).toBe('ひふみプラス');
      });

      it('8文字の英数字混合コードを正しく処理する', () => {
        expect(getJapaneseStockName('9I311179')).toBe('楽天・全世界株式インデックス・ファンド');
        expect(getJapaneseStockName('9I31118B')).toBe('楽天・S&P500インデックス・ファンド');
      });

      it('小文字の英字を大文字に変換して処理する', () => {
        expect(getJapaneseStockName('2931113c')).toBe('ニッセイ日経225インデックスファンド');
        expect(getJapaneseStockName('0331418a')).toBe('eMAXIS Slim 米国株式(S&P500)');
        expect(getJapaneseStockName('9c31116a')).toBe('ひふみプラス');
      });

      it('存在しない投資信託コードは元のコードを返す', () => {
        expect(getJapaneseStockName('12345678')).toBe('12345678');
        expect(getJapaneseStockName('1234567Z')).toBe('1234567Z');
        expect(getJapaneseStockName('ZZ311199')).toBe('ZZ311199');
      });
    });

    describe('日本株の処理', () => {
      it('4桁の株式コードを正しく処理する', () => {
        expect(getJapaneseStockName('7203')).toBe('トヨタ自動車');
        expect(getJapaneseStockName('6758')).toBe('ソニーグループ');
        expect(getJapaneseStockName('9432')).toBe('日本電信電話（NTT）');
        expect(getJapaneseStockName('8306')).toBe('三菱UFJフィナンシャル・グループ');
        expect(getJapaneseStockName('7974')).toBe('任天堂');
      });

      it('.Tサフィックスを除去して処理する', () => {
        expect(getJapaneseStockName('7203.T')).toBe('トヨタ自動車');
        expect(getJapaneseStockName('6758.T')).toBe('ソニーグループ');
        expect(getJapaneseStockName('9432.T')).toBe('日本電信電話（NTT）');
      });

      it('存在しない株式コードは元のコードを返す', () => {
        expect(getJapaneseStockName('9999')).toBe('9999');
        expect(getJapaneseStockName('0001')).toBe('0001');
        expect(getJapaneseStockName('1111.T')).toBe('1111.T');
      });
    });

    describe('その他の形式の処理', () => {
      it('米国株などの他の形式はそのまま返す', () => {
        expect(getJapaneseStockName('AAPL')).toBe('AAPL');
        expect(getJapaneseStockName('MSFT')).toBe('MSFT');
        expect(getJapaneseStockName('GOOGL')).toBe('GOOGL');
        expect(getJapaneseStockName('TSLA')).toBe('TSLA');
      });

      it('3桁や5桁以上の数字コードはそのまま返す', () => {
        expect(getJapaneseStockName('123')).toBe('123');
        expect(getJapaneseStockName('12345')).toBe('12345');
        expect(getJapaneseStockName('123456')).toBe('123456');
      });

      it('空文字やnull、undefinedを適切に処理する', () => {
        expect(getJapaneseStockName('')).toBe('');
        expect(getJapaneseStockName(null)).toBe(null);
        expect(getJapaneseStockName(undefined)).toBe(undefined);
      });

      it('特殊文字を含む文字列はそのまま返す', () => {
        expect(getJapaneseStockName('ABC-123')).toBe('ABC-123');
        expect(getJapaneseStockName('7203/T')).toBe('7203/T');
        expect(getJapaneseStockName('test@example')).toBe('test@example');
      });

      it('数字と文字の混合（投資信託以外）はそのまま返す', () => {
        expect(getJapaneseStockName('1A2B3C4D')).toBe('1A2B3C4D');
        expect(getJapaneseStockName('ABC12345')).toBe('ABC12345');
      });
    });

    describe('境界値テスト', () => {
      it('ちょうど7文字のコードは日本株として扱わない', () => {
        expect(getJapaneseStockName('1234567')).toBe('1234567');
      });

      it('ちょうど9文字のコードは投資信託として扱わない', () => {
        expect(getJapaneseStockName('123456789')).toBe('123456789');
      });

      it('投資信託パターンに一致するが存在しないコード', () => {
        expect(getJapaneseStockName('00000000')).toBe('00000000');
        expect(getJapaneseStockName('0000000A')).toBe('0000000A');
        expect(getJapaneseStockName('AA000000')).toBe('AA000000');
      });
    });
  });

  describe('formatJapaneseStockDisplay', () => {
    it('日本語名が見つかる場合はコード - 名前の形式で返す', () => {
      expect(formatJapaneseStockDisplay('7203')).toBe('7203 - トヨタ自動車');
      expect(formatJapaneseStockDisplay('6758')).toBe('6758 - ソニーグループ');
      expect(formatJapaneseStockDisplay('2931113C')).toBe('2931113C - ニッセイ日経225インデックスファンド');
      expect(formatJapaneseStockDisplay('0331418A')).toBe('0331418A - eMAXIS Slim 米国株式(S&P500)');
    });

    it('.Tサフィックス付きでも正しく表示する', () => {
      expect(formatJapaneseStockDisplay('7203.T')).toBe('7203.T - トヨタ自動車');
      expect(formatJapaneseStockDisplay('6758.T')).toBe('6758.T - ソニーグループ');
    });

    it('日本語名が見つからない場合はコードのみを返す', () => {
      expect(formatJapaneseStockDisplay('AAPL')).toBe('AAPL');
      expect(formatJapaneseStockDisplay('MSFT')).toBe('MSFT');
      expect(formatJapaneseStockDisplay('9999')).toBe('9999');
      expect(formatJapaneseStockDisplay('12345678')).toBe('12345678');
    });

    it('空文字やnull、undefinedを適切に処理する', () => {
      expect(formatJapaneseStockDisplay('')).toBe('');
      expect(formatJapaneseStockDisplay(null)).toBe(null);
      expect(formatJapaneseStockDisplay(undefined)).toBe(undefined);
    });

    it('複数の投資信託を正しくフォーマットする', () => {
      expect(formatJapaneseStockDisplay('29311137')).toBe('29311137 - ニッセイTOPIXインデックスファンド');
      expect(formatJapaneseStockDisplay('03311187')).toBe('03311187 - eMAXIS Slim 全世界株式(オール・カントリー)');
      expect(formatJapaneseStockDisplay('9I311179')).toBe('9I311179 - 楽天・全世界株式インデックス・ファンド');
    });

    it('複数の日本株を正しくフォーマットする', () => {
      expect(formatJapaneseStockDisplay('9432')).toBe('9432 - 日本電信電話（NTT）');
      expect(formatJapaneseStockDisplay('8306')).toBe('8306 - 三菱UFJフィナンシャル・グループ');
      expect(formatJapaneseStockDisplay('7974')).toBe('7974 - 任天堂');
    });

    it('長い企業名も正しく表示する', () => {
      const longNameTicker = '8306';
      const expectedDisplay = '8306 - 三菱UFJフィナンシャル・グループ';
      expect(formatJapaneseStockDisplay(longNameTicker)).toBe(expectedDisplay);
    });
  });

  describe('デフォルトエクスポート', () => {
    it('すべてのエクスポートがデフォルトエクスポートに含まれている', async () => {
      const defaultExport = (await import('../../../utils/japaneseStockNames')).default;
      
      expect(defaultExport).toHaveProperty('MUTUAL_FUND_NAMES');
      expect(defaultExport).toHaveProperty('JAPAN_STOCK_NAMES');
      expect(defaultExport).toHaveProperty('getJapaneseStockName');
      expect(defaultExport).toHaveProperty('formatJapaneseStockDisplay');
    });

    it('デフォルトエクスポートの関数が正常に動作する', () => {
      const defaultExport = require('../../../utils/japaneseStockNames').default;
      
      expect(defaultExport.getJapaneseStockName('7203')).toBe('トヨタ自動車');
      expect(defaultExport.formatJapaneseStockDisplay('7203')).toBe('7203 - トヨタ自動車');
    });

    it('デフォルトエクスポートのデータオブジェクトが正しい', () => {
      const defaultExport = require('../../../utils/japaneseStockNames').default;
      
      expect(defaultExport.MUTUAL_FUND_NAMES['0331418A']).toBe('eMAXIS Slim 米国株式(S&P500)');
      expect(defaultExport.JAPAN_STOCK_NAMES['7203']).toBe('トヨタ自動車');
    });
  });

  describe('データ整合性テスト', () => {
    it('投資信託名に重複がない', () => {
      const names = Object.values(MUTUAL_FUND_NAMES);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it('日本株名に重複がない', () => {
      const names = Object.values(JAPAN_STOCK_NAMES);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it('投資信託コードに重複がない', () => {
      const codes = Object.keys(MUTUAL_FUND_NAMES);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it('日本株コードに重複がない', () => {
      const codes = Object.keys(JAPAN_STOCK_NAMES);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it('投資信託と日本株でコードの重複がない', () => {
      const mutualFundCodes = Object.keys(MUTUAL_FUND_NAMES);
      const stockCodes = Object.keys(JAPAN_STOCK_NAMES);
      
      const intersection = mutualFundCodes.filter(code => stockCodes.includes(code));
      expect(intersection).toHaveLength(0);
    });

    it('すべての投資信託名が日本語を含む', () => {
      Object.values(MUTUAL_FUND_NAMES).forEach(name => {
        expect(name).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
      });
    });

    it('ほとんどの日本株名が日本語を含む', () => {
      const nonJapaneseExceptions = ['TDK', 'HOYA', 'KDDI']; // ローマ字表記の会社名
      Object.values(JAPAN_STOCK_NAMES).forEach(name => {
        if (!nonJapaneseExceptions.includes(name)) {
          expect(name).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
        }
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の株式コード処理が高速で動作する', () => {
      const testCodes = [
        '7203', '6758', '9432', '8306', 'AAPL', 'MSFT',
        '2931113C', '0331418A', '9999', 'UNKNOWN'
      ];
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        testCodes.forEach(code => {
          getJapaneseStockName(code);
          formatJapaneseStockDisplay(code);
        });
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });

    it('関数呼び出しのオーバーヘッドが小さい', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        getJapaneseStockName('7203');
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });
  });
});