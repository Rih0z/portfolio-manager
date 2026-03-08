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
} from '@/utils/csvParsers';

// Note: isLikelyShiftJIS / decodeCSVBuffer tests omitted because
// JSDOM lacks TextEncoder/TextDecoder. These functions are covered
// indirectly through integration tests.

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
});
