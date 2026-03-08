/**
 * CSVパーサーユーティリティの単体テスト
 *
 * @file __tests__/unit/utils/csvParsers.test.ts
 */

import {
  detectBrokerFormat,
  parseSBICSV,
  parseRakutenCSV,
  parseGenericCSV,
  parseBrokerCSV,
  isLikelyShiftJIS,
  decodeCSVBuffer,
} from '@/utils/csvParsers';

// ─── detectBrokerFormat ──────────────────────────────────────

describe('detectBrokerFormat', () => {
  it('SBI証券フォーマットを検出する', () => {
    const csv = '銘柄コード,銘柄名,預り区分,保有数量,取得単価,現在値\n7203,トヨタ,特定,100,2000,2500';
    expect(detectBrokerFormat(csv)).toBe('sbi');
  });

  it('SBI証券フォーマット（口座）を検出する', () => {
    const csv = '銘柄コード,銘柄名,口座,保有数量,取得単価,現在値\n7203,トヨタ,特定,100,2000,2500';
    expect(detectBrokerFormat(csv)).toBe('sbi');
  });

  it('楽天証券フォーマットを検出する', () => {
    const csv = '銘柄コード,銘柄名,数量,取得単価,現在値,トータルリターン\n7203,トヨタ,100,2000,2500,50000';
    expect(detectBrokerFormat(csv)).toBe('rakuten');
  });

  it('楽天証券（ISINコード）を検出する', () => {
    const csv = 'ISINコード,銘柄名,数量,取得単価,現在値,トータルリターン\nJP123,テスト,100,1000,1100,10000';
    expect(detectBrokerFormat(csv)).toBe('rakuten');
  });

  it('PfWise独自フォーマットを検出する', () => {
    const csv = '# 保有資産\nticker,name,price\nAAPL,Apple,150';
    expect(detectBrokerFormat(csv)).toBe('pfwise');
  });

  it('PfWise独自フォーマット（目標配分）を検出する', () => {
    const csv = '# 目標配分\nticker,targetPercentage\nAAPL,30';
    expect(detectBrokerFormat(csv)).toBe('pfwise');
  });

  it('日本語ヘッダー付き汎用CSVをgenericとして検出する', () => {
    const csv = '銘柄,数量,価格\nトヨタ,100,2500';
    expect(detectBrokerFormat(csv)).toBe('generic');
  });

  it('英語ヘッダーCSVをgenericとして検出する', () => {
    const csv = 'ticker,price,holdings\nAAPL,150,10';
    expect(detectBrokerFormat(csv)).toBe('generic');
  });

  it('ヘッダーに「保有」を含む場合genericを返す', () => {
    const csv = '保有銘柄,数量,価格\nトヨタ,100,2500';
    expect(detectBrokerFormat(csv)).toBe('generic');
  });

  it('ヘッダーに「口数」を含む場合genericを返す', () => {
    const csv = '銘柄名,口数,基準価額\nテスト,50000,15000';
    expect(detectBrokerFormat(csv)).toBe('generic');
  });

  it('銘柄コード+口座区分ヘッダーでSBIと判定する', () => {
    const csv = '銘柄コード,銘柄名,口座区分,保有数量\n7203,トヨタ,特定,100';
    expect(detectBrokerFormat(csv)).toBe('sbi');
  });

  it('銘柄コードありだが預り区分/トータルリターンなしの場合はgenericになる', () => {
    // 銘柄コード is present but none of the SBI/rakuten distinguishing headers
    const csv = '銘柄コード,銘柄名,数量,価格\n7203,トヨタ,100,2500';
    expect(detectBrokerFormat(csv)).toBe('generic');
  });

  it('銘柄コード+トータルリターンヘッダーで楽天と判定する（getFirstRowHeaders経由）', () => {
    // This CSV has 銘柄 (generic match) and 銘柄コード in headers
    // but the first-pass SBI/rakuten check won't match because the exact
    // combination requires going through getFirstRowHeaders
    const csv = '銘柄コード,銘柄,トータルリターン,保有数量\n7203,トヨタ,50000,100';
    expect(detectBrokerFormat(csv)).toBe('rakuten');
  });

  it('楽天証券（楽天キーワード）を検出する', () => {
    const csv = '銘柄コード,銘柄名,楽天ポイント,数量\n7203,トヨタ,100,50';
    expect(detectBrokerFormat(csv)).toBe('rakuten');
  });
});

// ─── parseSBICSV ─────────────────────────────────────────────

describe('parseSBICSV', () => {
  it('正常なSBI証券CSVをパースする', () => {
    // ヘッダーは銘柄名を先に置き、findColumnのファジーマッチで正しくパースされることを検証
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203,トヨタ自動車,100,2000,2500\n9984,ソフトバンクG,50,6000,7000';
    const result = parseSBICSV(csv);

    expect(result.broker).toBe('sbi');
    expect(result.baseCurrency).toBe('JPY');
    expect(result.currentAssets).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);

    expect(result.currentAssets[0].ticker).toBe('7203');
    expect(result.currentAssets[0].name).toBe('トヨタ自動車');
    expect(result.currentAssets[0].price).toBe(2500);
    expect(result.currentAssets[0].holdings).toBe(100);
    expect(result.currentAssets[0].purchasePrice).toBe(2000);
    expect(result.currentAssets[0].currency).toBe('JPY');
    expect(result.currentAssets[0].source).toBe('SBI証券CSV');
    expect(result.currentAssets[0].fundType).toBe('個別株');
  });

  it('投資信託の口数を正規化する（10000口→1口）', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n12345678,eMAXIS Slim,50000,15000,16000';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].holdings).toBe(5); // 50000 / 10000
    expect(result.currentAssets[0].fundType).toBe('投資信託');
  });

  it('空行をスキップする', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n,,,,\n7203,トヨタ自動車,100,2000,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets).toHaveLength(1);
  });

  it('資産が0件の場合に警告を返す', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値';
    const result = parseSBICSV(csv);

    expect(result.currentAssets).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('SBI証券');
  });

  it('日本語の数値表記（カンマ、円記号）をパースする', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203,トヨタ,"1,000","¥2,000","¥2,500"';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].holdings).toBe(1000);
    expect(result.currentAssets[0].purchasePrice).toBe(2000);
    expect(result.currentAssets[0].price).toBe(2500);
  });

  it('取得単価が0の場合purchasePriceを設定しない', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203,トヨタ,100,0,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBeUndefined();
  });

  it('米国株ティッカーのcurrencyがUSDになる', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nAAPL,Apple Inc,10,150,175';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].currency).toBe('USD');
  });

  it('ティッカーなしの場合は銘柄名からID生成', () => {
    // findColumnは銘柄名列の値をnameとして取得する
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n,eMAXIS Slim 全世界,50000,15000,16000';
    const result = parseSBICSV(csv);

    // ティッカーが空文字なのでnameから生成（name.slice(0,10)）
    expect(result.currentAssets).toHaveLength(1);
    expect(result.currentAssets[0].name).toBe('eMAXIS Slim 全世界');
  });
});

// ─── parseRakutenCSV ─────────────────────────────────────────

describe('parseRakutenCSV', () => {
  it('正常な楽天証券CSVをパースする', () => {
    const csv = 'ティッカー,ファンド名,数量,取得単価,現在値\n7203,トヨタ自動車,100,2000,2500\n9984,ソフトバンクG,50,6000,7000';
    const result = parseRakutenCSV(csv);

    expect(result.broker).toBe('rakuten');
    expect(result.baseCurrency).toBe('JPY');
    expect(result.currentAssets).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.currentAssets[0].source).toBe('楽天証券CSV');
  });

  it('投資信託の口数を正規化する', () => {
    const csv = 'ティッカー,ファンド名,口数,取得単価,基準価額\n12345678,楽天VTI,30000,15000,16000';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].holdings).toBe(3); // 30000 / 10000
  });

  it('資産が0件の場合に警告を返す', () => {
    const csv = 'ティッカー,ファンド名,数量,取得単価,現在値';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets).toHaveLength(0);
    expect(result.warnings[0]).toContain('楽天証券');
  });

  it('空行をスキップする', () => {
    const csv = 'ティッカー,ファンド名,数量,取得単価,現在値\n,,,,\n7203,トヨタ自動車,100,2000,2500';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets).toHaveLength(1);
  });
});

// ─── parseGenericCSV ─────────────────────────────────────────

describe('parseGenericCSV', () => {
  it('英語ヘッダーCSVをパースする', () => {
    const csv = 'ticker,name,price,holdings,currency\nAAPL,Apple Inc,175.50,10,USD\nVTI,Vanguard Total,220.00,5,USD';
    const result = parseGenericCSV(csv);

    expect(result.broker).toBe('generic');
    expect(result.currentAssets).toHaveLength(2);
    expect(result.currentAssets[0].ticker).toBe('AAPL');
    expect(result.currentAssets[0].name).toBe('Apple Inc');
    expect(result.currentAssets[0].price).toBe(175.50);
    expect(result.currentAssets[0].holdings).toBe(10);
    expect(result.currentAssets[0].currency).toBe('USD');
  });

  it('USD資産がある場合baseCurrencyがUSDになる', () => {
    const csv = 'ticker,name,price,holdings,currency\nAAPL,Apple,175,10,USD';
    const result = parseGenericCSV(csv);

    expect(result.baseCurrency).toBe('USD');
  });

  it('JPY資産のみの場合baseCurrencyがJPYになる', () => {
    const csv = 'ticker,name,price,holdings,currency\n7203,トヨタ,2500,100,JPY';
    const result = parseGenericCSV(csv);

    expect(result.baseCurrency).toBe('JPY');
  });

  it('手数料情報をパースする', () => {
    const csv = 'ticker,name,price,holdings,annualFee\n12345678,eMAXIS,16000,5,0.0938';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].annualFee).toBe(0.0938);
  });

  it('購入価格をパースする', () => {
    const csv = 'ticker,name,price,holdings,purchasePrice\nAAPL,Apple,175,10,150';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBe(150);
  });

  it('空のCSVで警告を返す', () => {
    const csv = 'ticker,price,holdings';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets).toHaveLength(0);
    expect(result.warnings[0]).toContain('CSV');
  });

  it('priceとholdingsが両方0の行をスキップする', () => {
    const csv = 'ticker,name,price,holdings\nAAPL,Apple,0,0\nGOOG,Google,150,5';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets).toHaveLength(1);
    expect(result.currentAssets[0].ticker).toBe('GOOG');
  });

  it('通貨が指定されていない場合ティッカーから推測する', () => {
    const csv = 'ticker,name,price,holdings\nAAPL,Apple,175,10\n7203,トヨタ,2500,100';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].currency).toBe('USD');
    expect(result.currentAssets[1].currency).toBe('JPY');
  });

  it('日本語ヘッダーCSVをパースする', () => {
    const csv = '銘柄コード,銘柄名,価格,数量\n7203,トヨタ,2500,100';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets).toHaveLength(1);
    expect(result.currentAssets[0].ticker).toBe('7203');
  });
});

// ─── parseBrokerCSV ──────────────────────────────────────────

describe('parseBrokerCSV', () => {
  it('SBI証券フォーマットを自動検出してパースする', () => {
    const csv = '銘柄コード,銘柄,預り区分,保有数量,取得単価,現在値\n7203,トヨタ,特定,100,2000,2500';
    const result = parseBrokerCSV(csv);

    expect(result.broker).toBe('sbi');
    expect(result.currentAssets).toHaveLength(1);
  });

  it('forceFormatで強制指定できる', () => {
    const csv = 'ticker,name,price,holdings\nAAPL,Apple,175,10';
    const result = parseBrokerCSV(csv, 'sbi');

    expect(result.broker).toBe('sbi');
  });

  it('楽天証券フォーマットを自動検出してパースする', () => {
    const csv = '銘柄コード,銘柄名,数量,取得単価,現在値,トータルリターン\n7203,トヨタ,100,2000,2500,50000';
    const result = parseBrokerCSV(csv);

    expect(result.broker).toBe('rakuten');
  });

  it('pfwiseフォーマットは空配列を返す', () => {
    const csv = '# 保有資産\nticker,name,price\nAAPL,Apple,150';
    const result = parseBrokerCSV(csv);

    expect(result.broker).toBe('pfwise');
    expect(result.currentAssets).toHaveLength(0);
  });

  it('不明なフォーマットはgenericでパースする', () => {
    const csv = 'ticker,price,holdings\nAAPL,175,10';
    const result = parseBrokerCSV(csv);

    expect(result.broker).toBe('generic');
  });

  it('forceFormatでrakutenを強制指定できる', () => {
    const csv = 'ticker,name,price,holdings\nAAPL,Apple,175,10';
    const result = parseBrokerCSV(csv, 'rakuten');

    expect(result.broker).toBe('rakuten');
  });

  it('forceFormatでgenericを強制指定できる', () => {
    const csv = '銘柄コード,銘柄,預り区分,保有数量,取得単価,現在値\n7203,トヨタ,特定,100,2000,2500';
    const result = parseBrokerCSV(csv, 'generic');

    expect(result.broker).toBe('generic');
    expect(result.currentAssets).toHaveLength(1);
  });

  it('forceFormatでpfwiseを強制指定すると空配列を返す', () => {
    const csv = 'ticker,name,price\nAAPL,Apple,150';
    const result = parseBrokerCSV(csv, 'pfwise');

    expect(result.broker).toBe('pfwise');
    expect(result.currentAssets).toHaveLength(0);
  });
});

// ─── isLikelyShiftJIS ─────────────────────────────────────────

describe('isLikelyShiftJIS', () => {
  it('純粋なASCIIバッファをShift-JISでないと判定する', () => {
    // ASCII bytes only (0x00-0x7F range) - no multibyte patterns
    const bytes = Array.from('ticker,name,price\nAAPL,Apple,175').map(c => c.charCodeAt(0));
    const buffer = new Uint8Array(bytes).buffer;

    expect(isLikelyShiftJIS(buffer)).toBe(false);
  });

  it('空のバッファをShift-JISでないと判定する', () => {
    const buffer = new ArrayBuffer(0);
    expect(isLikelyShiftJIS(buffer)).toBe(false);
  });

  it('Shift-JISパターンのバイト列をShift-JISと判定する', () => {
    // Shift-JIS lead byte 0x82 (range 0x81-0x9F), trail byte 0x60 (range 0x40-0x7E)
    const bytes = [];
    for (let i = 0; i < 10; i++) {
      bytes.push(0x82, 0x60);
    }
    const buffer = new Uint8Array(bytes).buffer;

    // sjisScore=10, utf8Score=0, 10 > 0 && 10 > 3 => true
    expect(isLikelyShiftJIS(buffer)).toBe(true);
  });

  it('sjisScoreが3以下の場合はfalseを返す', () => {
    // Only 2 valid Shift-JIS pairs + some ASCII
    const bytes = [0x82, 0x60, 0x82, 0x60, 0x41, 0x42, 0x43];
    const buffer = new Uint8Array(bytes).buffer;

    expect(isLikelyShiftJIS(buffer)).toBe(false);
  });

  it('2000バイト以上のバッファは最初の2000バイトのみ検査する', () => {
    const bytes = new Uint8Array(3000).fill(0x41); // All 'A'
    const buffer = bytes.buffer;

    expect(isLikelyShiftJIS(buffer)).toBe(false);
  });

  it('Shift-JISの第2バイト範囲0x80-0xFCを正しく検出する', () => {
    // Lead byte in 0xE0-0xFC range, trail byte in 0x80-0xFC range
    const bytes = [];
    for (let i = 0; i < 10; i++) {
      bytes.push(0xE0, 0x80);
    }
    const buffer = new Uint8Array(bytes).buffer;

    expect(isLikelyShiftJIS(buffer)).toBe(true);
  });

  it('UTF-8 2byteスコアのみの場合falseを返す', () => {
    // UTF-8 2-byte sequences with lead bytes 0xC0-0xDF
    // 0xC3 is NOT in the Shift-JIS lead byte range (0x81-0x9F, 0xE0-0xFC)
    // so only UTF-8 score increments
    const bytes = [];
    for (let i = 0; i < 20; i++) {
      bytes.push(0xC3, 0xA0); // valid UTF-8 2-byte, NOT valid Shift-JIS lead
    }
    const buffer = new Uint8Array(bytes).buffer;

    // utf8Score=20, sjisScore=0 => sjisScore not > utf8Score => false
    expect(isLikelyShiftJIS(buffer)).toBe(false);
  });

  it('lead byte 0x81-0x9F + trail byte 0x40-0x7E をShift-JISとして検出する', () => {
    const bytes = [];
    for (let i = 0; i < 5; i++) {
      bytes.push(0x81, 0x40); // lead 0x81, trail 0x40
    }
    const buffer = new Uint8Array(bytes).buffer;

    // sjisScore=5, utf8Score=0 => 5 > 0 && 5 > 3 => true
    expect(isLikelyShiftJIS(buffer)).toBe(true);
  });

  it('Shift-JIS lead byte + 無効なtrail byteはカウントしない', () => {
    // Lead byte in SJIS range but trail byte is 0x3F (below 0x40), so invalid SJIS pair
    const bytes = [];
    for (let i = 0; i < 10; i++) {
      bytes.push(0x82, 0x3F); // invalid trail byte
    }
    const buffer = new Uint8Array(bytes).buffer;

    expect(isLikelyShiftJIS(buffer)).toBe(false);
  });
});

// ─── decodeCSVBuffer ─────────────────────────────────────────

describe('decodeCSVBuffer', () => {
  // TextDecoder is not available in JSDOM, so we provide a minimal polyfill for these tests
  const OriginalTextDecoder = globalThis.TextDecoder;

  beforeEach(() => {
    // Minimal TextDecoder polyfill for UTF-8 only (sufficient for testing)
    globalThis.TextDecoder = class MockTextDecoder {
      encoding: string;
      constructor(encoding = 'utf-8') {
        this.encoding = encoding;
      }
      decode(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        // Simple ASCII decode for test purposes
        return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      }
    } as unknown as typeof TextDecoder;
  });

  afterEach(() => {
    if (OriginalTextDecoder) {
      globalThis.TextDecoder = OriginalTextDecoder;
    } else {
      delete (globalThis as Record<string, unknown>).TextDecoder;
    }
  });

  it('UTF-8バッファをデコードする（Shift-JISでないバッファ）', () => {
    // Pure ASCII - will be detected as not Shift-JIS, decoded as UTF-8
    const text = 'ticker,name,price';
    const bytes = Array.from(text).map(c => c.charCodeAt(0));
    const buffer = new Uint8Array(bytes).buffer;

    const decoded = decodeCSVBuffer(buffer);
    expect(decoded).toBe(text);
  });

  it('空のバッファをデコードすると空文字列を返す', () => {
    const buffer = new ArrayBuffer(0);
    expect(decodeCSVBuffer(buffer)).toBe('');
  });

  it('Shift-JISと判定されたバッファはshift_jisデコーダーを使用する', () => {
    // Track which encoding was requested
    let requestedEncoding = '';
    globalThis.TextDecoder = class MockTextDecoder {
      encoding: string;
      constructor(encoding = 'utf-8') {
        this.encoding = encoding;
        requestedEncoding = encoding;
      }
      decode(_buffer: ArrayBuffer): string {
        return 'decoded-content';
      }
    } as unknown as typeof TextDecoder;

    // Create a buffer that isLikelyShiftJIS returns true for
    const bytes = [];
    for (let i = 0; i < 10; i++) {
      bytes.push(0x82, 0x60);
    }
    const buffer = new Uint8Array(bytes).buffer;

    const result = decodeCSVBuffer(buffer);
    expect(requestedEncoding).toBe('shift_jis');
    expect(result).toBe('decoded-content');
  });
});

// ─── parseJapaneseNumber (via parseSBICSV/parseGenericCSV) ───

describe('parseJapaneseNumber edge cases (via parseSBICSV)', () => {
  it('ダッシュ「-」を0としてパースする', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203,トヨタ,-,-,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].holdings).toBe(0);
    expect(result.currentAssets[0].purchasePrice).toBeUndefined();
  });

  it('ダブルダッシュ「--」を0としてパースする', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203,トヨタ,100,--,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBeUndefined();
  });

  it('パーセント記号を除去してパースする', () => {
    const csv = 'ticker,name,price,holdings,annualFee\nAAPL,Apple,175,10,0.5%';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].annualFee).toBe(0.5);
  });

  it('全角ドル記号＄を除去してパースする', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nAAPL,Apple,10,＄150,＄175';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].price).toBe(175);
    expect(result.currentAssets[0].purchasePrice).toBe(150);
  });

  it('全角パーセント記号％を除去してパースする', () => {
    const csv = 'ticker,name,price,holdings,annualFee\nAAPL,Apple,175,10,1.5％';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].annualFee).toBe(1.5);
  });

  it('スペースのみの値を0としてパースする', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203,トヨタ, ,  ,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].holdings).toBe(0);
  });
});

// ─── guessCurrency / guessFundType (via parsers) ─────────────

describe('guessCurrency and guessFundType (via parseSBICSV)', () => {
  it('8桁数字ティッカーをJPY投資信託と判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n12345678,eMAXIS Slim,5000,15000,16000';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].currency).toBe('JPY');
    expect(result.currentAssets[0].fundType).toBe('投資信託');
  });

  it('7桁数字+英字ティッカーをJPY投資信託と判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n1234567A,テストファンド,100,10000,11000';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].currency).toBe('JPY');
    expect(result.currentAssets[0].fundType).toBe('投資信託');
  });

  it('4桁.Tティッカーを日本株JPYと判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203.T,トヨタ自動車,100,2000,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].currency).toBe('JPY');
    expect(result.currentAssets[0].fundType).toBe('個別株');
  });

  it('英字1-5文字ティッカーをUSDと判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nVTI,Vanguard Total Market,5,200,220';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].currency).toBe('USD');
  });

  it('ETFキーワードを含む場合ETFと判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nVTI,Vanguard Total Market ETF,5,200,220';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].fundType).toBe('ETF');
  });

  it('fund/indexキーワードを含む場合ETFと判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nSPY,S&P 500 Index Fund,10,450,460';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].fundType).toBe('ETF');
  });

  it('英字ティッカーでETF/fundキーワードなしの場合ETF/個別株と判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nAAPL,Apple Inc,10,150,175';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].fundType).toBe('ETF/個別株');
  });

  it('判定不能なティッカーは投資信託とデフォルト判定する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nXX-123-YZ,Unknown Fund,10,1000,1100';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].fundType).toBe('投資信託');
  });

  it('判定不能なティッカーのcurrencyはJPYデフォルト', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\nXX-123,Unknown,10,1000,1100';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].currency).toBe('JPY');
  });
});

// ─── parseSBICSV additional edge cases ─────────────────────────

describe('parseSBICSV additional edge cases', () => {
  it('ティッカーにクォートが含まれる場合除去する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n"7203",トヨタ自動車,100,2000,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].ticker).toBe('7203');
  });

  it('投資信託で口数が10000未満の場合はそのまま', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n12345678,eMAXIS Slim,5000,15000,16000';
    const result = parseSBICSV(csv);

    // 5000 < 10000 so no normalization
    expect(result.currentAssets[0].holdings).toBe(5000);
  });

  it('名前のみでティッカーなしの場合、名前からIDを生成する', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n,テストファンド名称,100,1000,1100';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].id).toBe('テストファンド名称');
    expect(result.currentAssets[0].ticker).toBe('テストファンド名称');
    expect(result.currentAssets[0].name).toBe('テストファンド名称');
  });

  it('銘柄コードヘッダーでもマッチする', () => {
    const csv = '銘柄コード,銘柄名,保有数量,取得単価,現在値\n7203,トヨタ自動車,100,2000,2500';
    const result = parseSBICSV(csv);

    expect(result.currentAssets[0].ticker).toBe('7203');
  });

  it('複数の資産を正しくパースする（混在ティッカー）', () => {
    const csv = 'ティッカー,ファンド名,保有数量,取得単価,現在値\n7203,トヨタ,100,2000,2500\nAAPL,Apple,10,150,175\n12345678,eMAXIS,50000,15000,16000';
    const result = parseSBICSV(csv);

    expect(result.currentAssets).toHaveLength(3);
    expect(result.currentAssets[0].currency).toBe('JPY');
    expect(result.currentAssets[0].fundType).toBe('個別株');
    expect(result.currentAssets[1].currency).toBe('USD');
    expect(result.currentAssets[2].currency).toBe('JPY');
    expect(result.currentAssets[2].fundType).toBe('投資信託');
    expect(result.currentAssets[2].holdings).toBe(5); // normalized
  });
});

// ─── parseRakutenCSV additional edge cases ─────────────────────

describe('parseRakutenCSV additional edge cases', () => {
  it('ISINコードヘッダーでマッチする', () => {
    const csv = 'ISINコード,銘柄名,数量,取得単価,現在値\nJP1234567890,テストファンド,100,1000,1100';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets).toHaveLength(1);
    expect(result.currentAssets[0].name).toBe('テストファンド');
  });

  it('時価ヘッダーで価格をマッチする', () => {
    const csv = 'ティッカー,銘柄名,数量,取得単価,時価\n7203,トヨタ,100,2000,2500';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].price).toBe(2500);
  });

  it('保有口数ヘッダーで数量をマッチする', () => {
    const csv = 'ティッカー,銘柄名,保有口数,取得単価,現在値\n7203,トヨタ,100,2000,2500';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].holdings).toBe(100);
  });

  it('ティッカーにクォートが含まれる場合除去する', () => {
    const csv = 'ティッカー,銘柄名,数量,取得単価,現在値\n"7203",トヨタ,100,2000,2500';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].ticker).toBe('7203');
  });

  it('取得単価が0の場合purchasePriceを設定しない', () => {
    const csv = 'ティッカー,銘柄名,数量,取得単価,現在値\n7203,トヨタ,100,0,2500';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBeUndefined();
  });

  it('名前のみでティッカーなしの場合、名前からIDを生成する', () => {
    const csv = 'ティッカー,銘柄名,数量,取得単価,現在値\n,楽天VTI投資信託,100,1000,1100';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].id).toBe('楽天VTI投資信託');
    expect(result.currentAssets[0].ticker).toBe('楽天VTI投資信託');
  });

  it('米国株ティッカーのcurrencyがUSDになる', () => {
    const csv = 'ティッカー,銘柄名,数量,取得単価,現在値\nVTI,Vanguard Total,5,200,220';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].currency).toBe('USD');
    expect(result.currentAssets[0].source).toBe('楽天証券CSV');
  });

  it('投資信託の口数が10000未満の場合はそのまま', () => {
    const csv = 'ティッカー,銘柄名,数量,取得単価,現在値\n12345678,楽天VTI,5000,15000,16000';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].holdings).toBe(5000);
  });

  it('日本語数値表記をパースする', () => {
    const csv = 'ティッカー,銘柄名,数量,取得単価,現在値\n7203,トヨタ,"1,000","¥2,000","¥2,500"';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].holdings).toBe(1000);
    expect(result.currentAssets[0].price).toBe(2500);
    expect(result.currentAssets[0].purchasePrice).toBe(2000);
  });

  it('平均取得単価ヘッダーでpurchasePriceをマッチする', () => {
    const csv = 'ティッカー,銘柄名,数量,平均取得単価,現在値\n7203,トヨタ,100,2000,2500';
    const result = parseRakutenCSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBe(2000);
  });
});

// ─── parseGenericCSV additional edge cases ────────────────────

describe('parseGenericCSV additional edge cases', () => {
  it('tickerなしでnameのみの場合、nameからID生成する', () => {
    const csv = 'name,price,holdings\nApple Inc,175,10';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].ticker).toBe('Apple Inc');
    expect(result.currentAssets[0].id).toBe('Apple Inc');
  });

  it('symbolヘッダーでtickerをマッチする', () => {
    const csv = 'symbol,name,price,holdings\nAAPL,Apple,175,10';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].ticker).toBe('AAPL');
  });

  it('codeヘッダーでtickerをマッチする', () => {
    const csv = 'code,description,current_price,shares\n7203,トヨタ,2500,100';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].ticker).toBe('7203');
  });

  it('手数料ヘッダー「信託報酬」でfeeをマッチする', () => {
    const csv = '銘柄コード,銘柄名,価格,数量,信託報酬\n12345678,eMAXIS,16000,5,0.1';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].annualFee).toBe(0.1);
  });

  it('取得価額ヘッダーでpurchasePriceをマッチする', () => {
    const csv = 'ticker,name,price,holdings,取得価額\nAAPL,Apple,175,10,150';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBe(150);
  });

  it('purchasePriceが0の場合はundefined', () => {
    const csv = 'ticker,name,price,holdings,purchasePrice\nAAPL,Apple,175,10,0';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBeUndefined();
  });

  it('全行がprice=0かつholdings=0でスキップされた場合警告を出す', () => {
    const csv = 'ticker,name,price,holdings\nAAPL,Apple,0,0\nGOOG,Google,0,0';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('CSV列の自動検出');
  });

  it('通貨が小文字で指定された場合大文字に変換する', () => {
    const csv = 'ticker,name,price,holdings,currency\nAAPL,Apple,175,10,usd';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].currency).toBe('USD');
  });

  it('ISINコードヘッダーでtickerをマッチする', () => {
    const csv = 'ISINコード,銘柄名,価格,数量\nJP123456,テスト,1000,5';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].ticker).toBe('JP123456');
  });

  it('ファンド名ヘッダーでnameをマッチする', () => {
    const csv = 'ticker,ファンド名,price,holdings\nAAPL,Apple Fund,175,10';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].name).toBe('Apple Fund');
  });

  it('cost/purchase_priceヘッダーでpurchasePriceをマッチする', () => {
    const csv = 'ticker,name,price,holdings,cost\nAAPL,Apple,175,10,150';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].purchasePrice).toBe(150);
  });

  it('annual_feeヘッダーでannualFeeをマッチする', () => {
    const csv = 'ticker,name,price,holdings,annual_fee\nAAPL,Apple,175,10,0.03';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].annualFee).toBe(0.03);
  });

  it('quantityヘッダーでholdingsをマッチする', () => {
    const csv = 'ticker,name,price,quantity\nAAPL,Apple,175,10';
    const result = parseGenericCSV(csv);

    expect(result.currentAssets[0].holdings).toBe(10);
  });
});
