/**
 * 証券会社別CSVパーサー
 *
 * SBI証券、楽天証券、汎用CSV形式に対応。
 * Shift-JIS エンコーディングの自動検出・変換を含む。
 *
 * @file src/utils/csvParsers.ts
 */
import Papa from 'papaparse';

// ─── Types ─────────────────────────────────────────────────

export type BrokerFormat = 'sbi' | 'rakuten' | 'generic' | 'pfwise';

export interface ParsedAsset {
  id: string;
  ticker: string;
  name: string;
  price: number;
  holdings: number;
  currency: string;
  annualFee: number;
  lastUpdated: string;
  source: string;
  fundType: string;
}

export interface CSVParseResult {
  broker: BrokerFormat;
  currentAssets: ParsedAsset[];
  baseCurrency: string;
  warnings: string[];
}

// ─── Shift-JIS Detection & Decode ──────────────────────────

/**
 * ArrayBuffer が Shift-JIS エンコーディングかを推定する
 */
export function isLikelyShiftJIS(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  let sjisScore = 0;
  let utf8Score = 0;

  for (let i = 0; i < Math.min(bytes.length, 2000); i++) {
    const b = bytes[i];
    // Shift-JIS 2byte 文字の先頭バイト (0x81-0x9F, 0xE0-0xFC)
    if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC)) {
      const next = bytes[i + 1];
      if (next !== undefined && ((next >= 0x40 && next <= 0x7E) || (next >= 0x80 && next <= 0xFC))) {
        sjisScore++;
        i++; // skip next byte
      }
    }
    // UTF-8 multibyte (0xC0-0xDF = 2byte, 0xE0-0xEF = 3byte)
    if (b >= 0xC0 && b <= 0xDF && i + 1 < bytes.length) {
      const n = bytes[i + 1];
      if (n >= 0x80 && n <= 0xBF) utf8Score++;
    }
    if (b >= 0xE0 && b <= 0xEF && i + 2 < bytes.length) {
      const n1 = bytes[i + 1], n2 = bytes[i + 2];
      if (n1 >= 0x80 && n1 <= 0xBF && n2 >= 0x80 && n2 <= 0xBF) utf8Score++;
    }
  }

  return sjisScore > utf8Score && sjisScore > 3;
}

/**
 * ArrayBuffer → 文字列（Shift-JIS / UTF-8 自動判定）
 */
export function decodeCSVBuffer(buffer: ArrayBuffer): string {
  if (isLikelyShiftJIS(buffer)) {
    const decoder = new TextDecoder('shift_jis');
    return decoder.decode(buffer);
  }
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

// ─── Format Detection ──────────────────────────────────────

/**
 * CSV 文字列のヘッダーから証券会社フォーマットを推定する
 */
export function detectBrokerFormat(content: string): BrokerFormat {
  const firstLines = content.slice(0, 1000).toLowerCase();

  // PfWise独自フォーマット
  if (firstLines.includes('# 保有資産') || firstLines.includes('# 目標配分')) {
    return 'pfwise';
  }

  // SBI証券: 特有の列名
  if (
    firstLines.includes('銘柄コード') &&
    (firstLines.includes('預り区分') || firstLines.includes('口座'))
  ) {
    return 'sbi';
  }

  // 楽天証券: 特有の列名
  if (
    (firstLines.includes('銘柄コード') || firstLines.includes('isinコード')) &&
    (firstLines.includes('トータルリターン') || firstLines.includes('楽天'))
  ) {
    return 'rakuten';
  }

  // ヘッダーに日本語の証券用語があれば汎用日本語CSVとして扱う
  if (
    firstLines.includes('銘柄') ||
    firstLines.includes('保有') ||
    firstLines.includes('数量') ||
    firstLines.includes('口数')
  ) {
    // SBI/楽天を区別できない場合もgenericで対応
    if (firstLines.includes('銘柄コード')) {
      // ヘッダーパターンで最終判定
      const headers = getFirstRowHeaders(content);
      if (headers.includes('預り区分') || headers.includes('口座区分')) return 'sbi';
      if (headers.includes('トータルリターン')) return 'rakuten';
    }
    return 'generic';
  }

  return 'generic';
}

function getFirstRowHeaders(content: string): string[] {
  const firstLine = content.split('\n')[0] || '';
  return firstLine.split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
}

// ─── Number Parsing Helpers ────────────────────────────────

function parseJapaneseNumber(val: string | undefined): number {
  if (!val) return 0;
  // Remove commas, spaces, yen/dollar signs
  const cleaned = val.replace(/[,\s¥＄$%％]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '--') return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function findColumn(row: Record<string, string>, candidates: string[]): string {
  for (const key of Object.keys(row)) {
    const normalized = key.trim().toLowerCase();
    for (const candidate of candidates) {
      if (normalized.includes(candidate.toLowerCase())) {
        return row[key];
      }
    }
  }
  return '';
}

function guessCurrency(ticker: string): string {
  // 日本の投資信託（8桁数字 or 7桁+英字）
  if (/^\d{7,8}[A-Z]?$/i.test(ticker)) return 'JPY';
  // 日本株（4桁.T or 4桁数字）
  if (/^\d{4}(\.T)?$/.test(ticker)) return 'JPY';
  // 英字のみ = US市場
  if (/^[A-Z]{1,5}$/.test(ticker)) return 'USD';
  return 'JPY';
}

function guessFundType(ticker: string, name: string): string {
  if (/^\d{4}(\.T)?$/.test(ticker)) return '個別株';
  if (/^\d{7,8}[A-Z]?$/i.test(ticker)) return '投資信託';
  if (/^[A-Z]{1,5}$/.test(ticker)) {
    if (/ETF|fund|index/i.test(name)) return 'ETF';
    return 'ETF/個別株';
  }
  return '投資信託';
}

// ─── SBI証券 Parser ────────────────────────────────────────

/**
 * SBI証券の保有証券CSV（国内株式・投資信託）をパースする
 *
 * 想定ヘッダー例:
 * 銘柄コード, 銘柄, 保有数量/口数, 取得単価, 現在値/基準価額, 評価額, ...
 */
export function parseSBICSV(content: string): CSVParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const assets: ParsedAsset[] = [];
  const now = new Date().toISOString();

  for (const row of result.data as Record<string, string>[]) {
    const ticker = findColumn(row, ['銘柄コード', 'ティッカー', 'コード']);
    const name = findColumn(row, ['銘柄', '銘柄名', 'ファンド名']);

    if (!ticker && !name) continue; // skip empty rows

    const price = parseJapaneseNumber(
      findColumn(row, ['現在値', '基準価額', '現在の基準価額'])
    );
    const holdings = parseJapaneseNumber(
      findColumn(row, ['保有数量', '数量', '口数', '保有口数'])
    );

    // 投資信託の口数は通常10000口単位なので口数→数量に変換
    const normalizedTicker = ticker.replace(/"/g, '').trim();
    let normalizedHoldings = holdings;
    if (/^\d{7,8}/.test(normalizedTicker) && holdings >= 10000) {
      normalizedHoldings = holdings / 10000;
    }

    if (normalizedTicker || name) {
      assets.push({
        id: normalizedTicker || name.slice(0, 10),
        ticker: normalizedTicker || name.slice(0, 10),
        name: name || normalizedTicker,
        price,
        holdings: normalizedHoldings,
        currency: guessCurrency(normalizedTicker),
        annualFee: 0,
        lastUpdated: now,
        source: 'SBI証券CSV',
        fundType: guessFundType(normalizedTicker, name),
      });
    }
  }

  if (assets.length === 0) {
    warnings.push('SBI証券フォーマットとして認識しましたが、資産データを抽出できませんでした');
  }

  return {
    broker: 'sbi',
    currentAssets: assets,
    baseCurrency: 'JPY',
    warnings,
  };
}

// ─── 楽天証券 Parser ───────────────────────────────────────

/**
 * 楽天証券の保有商品CSVをパースする
 *
 * 想定ヘッダー例:
 * 銘柄コード/ISINコード, 銘柄名, 数量/口数, 取得単価, 現在値/基準価額, 評価損益額, ...
 */
export function parseRakutenCSV(content: string): CSVParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const assets: ParsedAsset[] = [];
  const now = new Date().toISOString();

  for (const row of result.data as Record<string, string>[]) {
    const ticker = findColumn(row, ['銘柄コード', 'ISINコード', 'コード', 'ティッカー']);
    const name = findColumn(row, ['銘柄名', '銘柄', 'ファンド名']);

    if (!ticker && !name) continue;

    const price = parseJapaneseNumber(
      findColumn(row, ['現在値', '基準価額', '時価'])
    );
    const holdings = parseJapaneseNumber(
      findColumn(row, ['数量', '口数', '保有数量', '保有口数'])
    );

    const normalizedTicker = ticker.replace(/"/g, '').trim();
    let normalizedHoldings = holdings;
    if (/^\d{7,8}/.test(normalizedTicker) && holdings >= 10000) {
      normalizedHoldings = holdings / 10000;
    }

    if (normalizedTicker || name) {
      assets.push({
        id: normalizedTicker || name.slice(0, 10),
        ticker: normalizedTicker || name.slice(0, 10),
        name: name || normalizedTicker,
        price,
        holdings: normalizedHoldings,
        currency: guessCurrency(normalizedTicker),
        annualFee: 0,
        lastUpdated: now,
        source: '楽天証券CSV',
        fundType: guessFundType(normalizedTicker, name),
      });
    }
  }

  if (assets.length === 0) {
    warnings.push('楽天証券フォーマットとして認識しましたが、資産データを抽出できませんでした');
  }

  return {
    broker: 'rakuten',
    currentAssets: assets,
    baseCurrency: 'JPY',
    warnings,
  };
}

// ─── Generic CSV Parser ────────────────────────────────────

/**
 * 汎用CSVパーサー（自動列検出）
 *
 * ticker/銘柄コード、name/銘柄名、price/価格、holdings/数量 等のカラムを
 * ファジーマッチで検出してパースする。英語ヘッダーにも対応。
 */
export function parseGenericCSV(content: string): CSVParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.data.length === 0) {
    return { broker: 'generic', currentAssets: [], baseCurrency: 'JPY', warnings: ['CSVにデータ行がありません'] };
  }

  const assets: ParsedAsset[] = [];
  const now = new Date().toISOString();

  for (const row of result.data as Record<string, string>[]) {
    const ticker = findColumn(row, [
      'ticker', 'symbol', 'code', '銘柄コード', 'コード', 'ISINコード',
    ]);
    const name = findColumn(row, [
      'name', '銘柄名', '銘柄', 'ファンド名', 'description',
    ]);
    const price = parseJapaneseNumber(
      findColumn(row, ['price', '価格', '現在値', '基準価額', '時価', 'current_price'])
    );
    const holdings = parseJapaneseNumber(
      findColumn(row, [
        'holdings', 'quantity', 'shares', '数量', '口数', '保有数量', '保有口数',
      ])
    );
    const currency = findColumn(row, ['currency', '通貨']) || '';
    const fee = parseJapaneseNumber(
      findColumn(row, ['fee', 'annualFee', '手数料', '信託報酬', 'annual_fee'])
    );

    if (!ticker && !name) continue;
    if (price === 0 && holdings === 0) continue; // skip header-like or empty rows

    const cleanTicker = (ticker || name.slice(0, 10)).replace(/"/g, '').trim();

    assets.push({
      id: cleanTicker,
      ticker: cleanTicker,
      name: name || cleanTicker,
      price,
      holdings,
      currency: currency.toUpperCase() || guessCurrency(cleanTicker),
      annualFee: fee,
      lastUpdated: now,
      source: 'CSVインポート',
      fundType: guessFundType(cleanTicker, name),
    });
  }

  if (assets.length === 0) {
    warnings.push('CSV列の自動検出に失敗しました。列名に ticker/銘柄コード, price/価格, holdings/数量 が含まれているか確認してください');
  }

  return {
    broker: 'generic',
    currentAssets: assets,
    baseCurrency: assets.some(a => a.currency === 'USD') ? 'USD' : 'JPY',
    warnings,
  };
}

// ─── Main Entry Point ──────────────────────────────────────

/**
 * CSV文字列を自動検出してパースする
 */
export function parseBrokerCSV(content: string, forceFormat?: BrokerFormat): CSVParseResult {
  const format = forceFormat || detectBrokerFormat(content);

  switch (format) {
    case 'sbi':
      return parseSBICSV(content);
    case 'rakuten':
      return parseRakutenCSV(content);
    case 'generic':
      return parseGenericCSV(content);
    case 'pfwise':
      // PfWise独自フォーマットは既存parseCSV関数で処理（ImportOptionsで分岐）
      return { broker: 'pfwise', currentAssets: [], baseCurrency: 'JPY', warnings: [] };
    default:
      return parseGenericCSV(content);
  }
}
