/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: functions/yahoo-finance-proxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2023/03/25 10:45:00 
 * 
 * 更新履歴: 
 * - 2023/03/25 10:45:00 Koki Riho 初回作成
 * - 2023/04/15 15:30:00 Yuta Sato ETF対応機能を追加
 * - 2023/05/05 09:15:00 Koki Riho 代替エンドポイント試行機能を強化
 * 
 * 説明: 
 * Yahoo Finance非公式APIを使用して株価データを取得するサーバーレス関数。
 * 米国株、日本株、投資信託、ETFなど様々な金融商品の価格データに対応し、
 * 統一されたフォーマットで提供する。Alpacaやスクレイピングのバックアップとして機能する。
 * ETF（上場投資信託）の識別と特殊処理、日本株や投資信託のティッカー形式変換なども実装している。
 */
const axios = require('axios');

// ------------------ ETF関連の定義 ------------------

// 主な発行会社のプレフィックスとパターン
const ETF_PREFIXES = {
  VANGUARD: ['V', 'VO', 'VB', 'VT', 'VU', 'VG', 'VA', 'VE', 'VF', 'VD', 'VC'],
  ISHARES: ['I', 'IW', 'IJR', 'IJH', 'IEF', 'EW', 'IE', 'IA', 'SH'],
  SPDR: ['SPY', 'XL', 'XBI', 'XLF', 'XLE', 'XLB', 'XLK', 'XLP', 'XLU', 'XLI', 'XLV', 'GLD', 'DIA'],
  INVESCO: ['Q', 'PG', 'PJ', 'PW', 'PZ', 'REZ', 'RYJ', 'RPG', 'RSP', 'RWJ', 'RYE', 'RYF', 'RYH', 'RYT', 'RYU'],
  SCHWAB: ['SCH'],
  ARK: ['ARK'],
  FIDELITY: ['FID'],
  GLOBAL_X: ['LIT', 'AIQ', 'BUG', 'CTEC', 'EBIZ', 'BKCH', 'BOTZ', 'FINX', 'MLPA'],
  WISDOM_TREE: ['DXJ', 'DLS', 'DNL', 'EPI', 'DFE']
};

// ETFパターンを結合
const ALL_ETF_PREFIXES = [].concat(
  ...Object.values(ETF_PREFIXES)
);

// 債券ETFの明示的なリスト
const BOND_ETFS = [
  'LQD', 'BND', 'AGG', 'TLT', 'IEF', 'GOVT', 'HYG', 'JNK', 'MUB', 'VCIT', 'VCSH', 
  'BNDX', 'SCHZ', 'IGIB', 'VGIT', 'VGLT', 'VGSH', 'SHY', 'VMBS', 'MBB', 'AGNC',
  'SPTL', 'SPTI', 'SPTS', 'SPLB', 'BSCO', 'LKOR', 'FBND', 'FMHI', 'TDTF', 'TDTT'
];

// 国際ETFのリスト
const INTL_ETFS = [
  'INDA', 'EIDO', 'EWZ', 'EWJ', 'EWY', 'EWM', 'EWT', 'MCHI', 'FXI', 'EWH', 'EWS',
  'EZU', 'EWG', 'EWQ', 'EWP', 'EWI', 'EWL', 'EWD', 'EWN', 'EWA', 'EWU', 'EWC',
  'IEUR', 'IEFA', 'IEMG', 'VEA', 'VWO', 'VSS', 'VXUS', 'BBJP', 'GXG', 'EIRL',
  'FLCH', 'FLJP', 'FLJH', 'FLKR', 'FLBR', 'EPOL', 'ADRE', 'HEEM', 'FNDE'
];

// ESG/テーマ型ETFのリスト
const THEMATIC_ETFS = [
  'ARKK', 'ARKW', 'ARKG', 'ARKF', 'ARKQ', 'IBIT', 'GBTC', 'ETHE', 'BITQ',
  'ICLN', 'TAN', 'FAN', 'PBW', 'QCLN', 'ACES', 'ESGU', 'ESGE', 'ESGD',
  'ESML', 'SDG', 'SUSL', 'LRGE', 'SUSA', 'DSI', 'USSG', 'CRBN', 'LOWC',
  'SPYX', 'NULG', 'NULV', 'FRDM', 'VOTE', 'VEGN', 'GRNB'
];

// レバレッジ/インバースETFのリスト
const LEVERAGED_ETFS = [
  'TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'UDOW', 'SDOW', 'TECL', 'TECS', 'FAS',
  'FAZ', 'ERX', 'ERY', 'LABU', 'LABD', 'NUGT', 'DUST', 'JNUG', 'JDST',
  'NAIL', 'DRN', 'DRV', 'SOXL', 'SOXS', 'SPXL', 'SPXS', 'TNA', 'TZA',
  'UVXY', 'SVXY', 'VXX'
];

// 米国大型株ETFのリスト
const US_LARGE_CAP_ETFS = [
  'SPY', 'VOO', 'IVV', 'VTI', 'QQQ', 'DIA', 'SCHB', 'SCHX', 'SPLG', 'ITOT',
  'RSP', 'SCHG', 'SCHV', 'SPYG', 'SPYV', 'VOOG', 'VOOV', 'MGC', 'IOO',
  'OEF', 'MTUM', 'VLUE', 'USMV', 'QUAL', 'SIZE', 'QQQM', 'QQQE'
];

// セクターETFのリスト
const SECTOR_ETFS = [
  'XLF', 'XLE', 'XLK', 'XLV', 'XLB', 'XLI', 'XLP', 'XLU', 'XLY', 'XLRE',
  'VGT', 'VHT', 'VDC', 'VDE', 'VAW', 'VFH', 'VIS', 'VCR', 'VPU', 'VNQ',
  'IBB', 'IYH', 'IYE', 'IYF', 'IYK', 'IYM', 'IYC', 'IYZ', 'IYT', 'IYR',
  'FXI', 'KBWB', 'SMH', 'SOXX', 'HACK', 'SOCL', 'GAMR', 'PBE', 'FBT'
];

// コモディティETFのリスト
const COMMODITY_ETFS = [
  'GLD', 'SLV', 'IAU', 'PPLT', 'PALL', 'USO', 'BNO', 'UNG', 'UGA', 'DBC',
  'GSG', 'DJP', 'PDBC', 'COMT', 'COM', 'COMB', 'USCI', 'GCC', 'RJI', 
  'DBA', 'MOO', 'JJG', 'WEAT', 'CORN', 'SOYB', 'NIB', 'JO', 'SGG',
  'COW', 'WOOD', 'PSCE', 'XME'
];

// すべてのETFを一つのリストに結合
const ALL_KNOWN_ETFS = [].concat(
  BOND_ETFS,
  INTL_ETFS,
  THEMATIC_ETFS,
  LEVERAGED_ETFS,
  US_LARGE_CAP_ETFS,
  SECTOR_ETFS,
  COMMODITY_ETFS
);

// ETFのデフォルト価格
const ETF_DEFAULTS = {
  // 債券ETF
  'LQD': 109.64, 'BND': 73.57, 'AGG': 98.32, 'TLT': 96.18, 'IEF': 95.35,
  'GOVT': 25.10, 'HYG': 76.89, 'JNK': 93.22, 'MUB': 106.54, 'VCIT': 80.38,
  'VCSH': 76.98,
  
  // 国際株式ETF
  'INDA': 50.50, 'EIDO': 25.30, 'EWZ': 32.60, 'EWJ': 65.20, 'MCHI': 46.80,
  'FXI': 27.30, 'VEA': 48.20, 'VWO': 43.80, 'IEFA': 72.50, 'IEMG': 52.90,
  'VXUS': 58.40,
  
  // 米国大型株ETF
  'SPY': 540.00, 'VOO': 480.00, 'QQQ': 470.00, 'VTI': 265.00, 'IVV': 539.00,
  'DIA': 392.00,
  
  // テーマ型ETF
  'ARKK': 48.20, 'ARKW': 75.60, 'ARKG': 31.40, 'IBIT': 44.00, 'GBTC': 42.20,
  
  // コモディティETF
  'GLD': 220.00, 'SLV': 26.20, 'USO': 72.40,
  
  // レバレッジETF
  'TQQQ': 62.80, 'SQQQ': 7.90, 'UPRO': 75.20, 'SPXU': 8.60
};

// 配当利回りのデフォルト値（％）
const DEFAULT_DIVIDEND_YIELDS = {
  'bond': 3.0,               // 債券ETF
  'international': 2.8,      // 国際株式ETF
  'us_large_cap': 1.5,       // 米国大型株ETF
  'sector': 1.8,             // セクターETF
  'thematic': 0.5,           // テーマ型ETF
  'commodity': 0.0,          // コモディティETF
  'leveraged': 0.0,          // レバレッジETF
  'unknown': 1.5             // 不明なETF
};

// ------------------ メインハンドラー ------------------

exports.handler = async function(event, context) {
  // リクエスト情報をログ出力
  console.log('Yahoo Finance Proxy - Request received:');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  console.log('Query parameters:', JSON.stringify(event.queryStringParameters));
  
  // CORS ヘッダーを設定 - すべてのオリジンからのリクエストを許可
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
  
  // プリフライトリクエスト（OPTIONS）をハンドリング
  if (event.httpMethod === 'OPTIONS') {
    console.log('Responding to OPTIONS request');
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  try {
    // クエリパラメータを取得
    const params = event.queryStringParameters || {};
    
    // シンボルまたは為替レートのパラメータが必要
    if (!params.symbols && !params.exchange_rate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'symbols or exchange_rate parameter is required',
          message: 'symbols または exchange_rate パラメータが必要です'
        })
      };
    }
    
    // 株価データを取得
    if (params.symbols) {
      return await handleStockData(params.symbols, headers);
    }
    
    // 為替レートを取得
    if (params.exchange_rate) {
      return await handleExchangeRate(params.exchange_rate, headers);
    }
    
  } catch (error) {
    console.error('Yahoo Finance proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch data from Yahoo Finance',
        message: error.message || 'Unknown error',
        details: error.stack
      })
    };
  }
};

// ------------------ ETF判定関連の関数 ------------------

/**
 * ティッカーシンボルがETFかどうかを判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} ETFの場合はtrue
 */
function isETF(ticker) {
  if (!ticker) return false;
  
  // 大文字に変換
  ticker = ticker.toString().toUpperCase();
  
  // 1. 既知のETFリストにあれば間違いなくETF
  if (ALL_KNOWN_ETFS.includes(ticker)) {
    return true;
  }
  
  // 2. プレフィックスによる判定
  for (const prefix of ALL_ETF_PREFIXES) {
    if (ticker.startsWith(prefix)) {
      return true;
    }
  }
  
  // 3. 構造による判定
  // ETFはほとんどが3-4文字で構成される
  if (ticker.length <= 4 && 
      /^[A-Z]+$/.test(ticker) && // 英字のみ
      !isMutualFund(ticker) && 
      !isJapaneseStock(ticker)) {
    return true;
  }
  
  return false;
}

/**
 * ETFの種類を判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {string} ETFの種類
 */
function getETFType(ticker) {
  if (!ticker) return 'unknown';
  
  // 大文字に変換
  ticker = ticker.toString().toUpperCase();
  
  // ETFリストで種類を判定
  if (BOND_ETFS.includes(ticker)) {
    return 'bond';
  } else if (INTL_ETFS.includes(ticker)) {
    return 'international';
  } else if (US_LARGE_CAP_ETFS.includes(ticker)) {
    return 'us_large_cap';
  } else if (SECTOR_ETFS.includes(ticker)) {
    return 'sector';
  } else if (THEMATIC_ETFS.includes(ticker)) {
    return 'thematic';
  } else if (LEVERAGED_ETFS.includes(ticker)) {
    return 'leveraged';
  } else if (COMMODITY_ETFS.includes(ticker)) {
    return 'commodity';
  }
  
  // プレフィックスによる推測
  for (const [type, prefixes] of Object.entries(ETF_PREFIXES)) {
    for (const prefix of prefixes) {
      if (ticker.startsWith(prefix)) {
        switch (type) {
          case 'VANGUARD':
            return ticker.includes('B') ? 'us_large_cap' : 'international';
          case 'ISHARES':
            return ticker.startsWith('IE') ? 'international' : 
                   ticker.startsWith('IEF') ? 'bond' : 'us_large_cap';
          case 'SPDR':
            return ticker.startsWith('XL') ? 'sector' : 'us_large_cap';
          case 'ARK':
            return 'thematic';
          default:
            return 'unknown';
        }
      }
    }
  }
  
  return 'unknown';
}

/**
 * 投資信託かどうかを判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} 投資信託の場合はtrue
 */
function isMutualFund(ticker) {
  if (!ticker) return false;
  return /^\d{7,8}C(\.T)?$/i.test(ticker);
}

/**
 * 日本株かどうかを判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} 日本株の場合はtrue
 */
function isJapaneseStock(ticker) {
  if (!ticker) return false;
  ticker = ticker.toString();
  return /^\d{4}(\.T)?$/.test(ticker) || ticker.endsWith('.T');
}

// ------------------ データ生成関連の関数 ------------------

/**
 * ティッカーシンボルからフォールバックデータを生成する
 * @param {string} symbol - ティッカーシンボル
 * @returns {Object} フォールバックデータ
 */
function generateFallbackData(symbol) {
  if (!symbol) return null;
  
  // 大文字に変換
  const upperSymbol = symbol.toUpperCase();
  
  // ETFかどうかを判定
  const etfCheck = isETF(upperSymbol);
  
  // ETFの場合はETF専用のフォールバックを使用
  if (etfCheck) {
    return generateETFFallbackData(upperSymbol);
  }
  
  // 投資信託かどうかを判定
  const isMutualFundTicker = isMutualFund(symbol);
  const isJapaneseStockTicker = isJapaneseStock(symbol);
  
  // オリジナルのティッカーシンボル（.Tを取り除く）
  const originalSymbol = symbol.replace(/\.T$/, '');
  
  return {
    ticker: originalSymbol,
    price: isMutualFundTicker ? 10000 : isJapaneseStockTicker ? 2500 : 150,
    name: isMutualFundTicker ? `投資信託 ${originalSymbol}` : 
          isJapaneseStockTicker ? `日本株 ${originalSymbol}` : 
          `${originalSymbol}`,
    currency: isJapaneseStockTicker || isMutualFundTicker ? 'JPY' : 'USD',
    lastUpdated: new Date().toISOString(),
    source: 'Fallback',
    isStock: !isMutualFundTicker,
    isMutualFund: isMutualFundTicker,
    priceLabel: isMutualFundTicker ? '基準価額' : '株価'
  };
}

/**
 * ETF用のフォールバックデータを生成する
 * @param {string} symbol - ティッカーシンボル（ETF）
 * @returns {Object} ETF用フォールバックデータ
 */
function generateETFFallbackData(symbol) {
  // 大文字に変換
  const upperSymbol = symbol.toUpperCase();
  
  // ETFタイプを判定
  const etfType = getETFType(upperSymbol);
  
  // ETFのデフォルト価格を取得（なければ一般的な値を使用）
  const price = ETF_DEFAULTS[upperSymbol] || 100;
  
  // ETFタイプに基づく詳細な特性
  const properties = getETFProperties(upperSymbol, etfType);
  
  // 特定のETFに関するログを表示
  if (['LQD', 'INDA', 'SPY', 'ARKK', 'GLD'].includes(upperSymbol)) {
    console.log(`[Yahoo Finance Proxy] Special handling for ${upperSymbol} (${etfType}) with price: ${price}`);
  }
  
  // ETFタイプに基づいてフォールバックデータを生成
  return {
    ticker: upperSymbol,
    price: price,
    name: properties.name,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    source: `Fallback (${properties.typeLabel} ETF)`,
    isStock: false,
    isMutualFund: false,
    isETF: true,
    etfType: etfType,
    // ETFタイプごとの特性
    ...properties.flags,
    priceLabel: '株価',
    // 配当情報
    dividendYield: properties.dividendYield,
    hasDividend: properties.hasDividend,
    dividendFrequency: properties.dividendFrequency
  };
}

/**
 * ETFタイプに基づいてETFの特性を取得する
 * @param {string} symbol - ティッカーシンボル
 * @param {string} etfType - ETFの種類
 * @returns {Object} ETFの特性情報
 */
function getETFProperties(symbol, etfType) {
  // 基本情報を初期化
  const properties = {
    name: `${symbol} ETF`,
    typeLabel: 'Unknown',
    dividendYield: DEFAULT_DIVIDEND_YIELDS[etfType] || DEFAULT_DIVIDEND_YIELDS.unknown,
    hasDividend: true,
    dividendFrequency: 'quarterly',
    flags: {}
  };
  
  // ETFタイプに基づいて情報を設定
  switch (etfType) {
    case 'bond':
      properties.name = `${symbol} - Bond ETF`;
      properties.typeLabel = 'Bond';
      properties.dividendFrequency = 'monthly';
      properties.flags.isBondETF = true;
      break;
      
    case 'international':
      properties.name = `${symbol} - International Equity ETF`;
      properties.typeLabel = 'International';
      properties.flags.isIntlETF = true;
      break;
      
    case 'us_large_cap':
      properties.name = `${symbol} - US Large Cap ETF`;
      properties.typeLabel = 'US Large Cap';
      properties.flags.isUSETF = true;
      break;
      
    case 'sector':
      properties.name = `${symbol} - Sector ETF`;
      properties.typeLabel = 'Sector';
      properties.flags.isSectorETF = true;
      break;
      
    case 'thematic':
      properties.name = `${symbol} - Thematic ETF`;
      properties.typeLabel = 'Thematic';
      properties.flags.isThematicETF = true;
      break;
      
    case 'leveraged':
      properties.name = `${symbol} - Leveraged ETF`;
      properties.typeLabel = 'Leveraged';
      properties.hasDividend = false;
      properties.dividendYield = 0;
      properties.flags.isLeveragedETF = true;
      break;
      
    case 'commodity':
      properties.name = `${symbol} - Commodity ETF`;
      properties.typeLabel = 'Commodity';
      properties.hasDividend = false;
      properties.dividendYield = 0;
      properties.flags.isCommodityETF = true;
      break;
      
    default:
      properties.name = `${symbol} ETF`;
      properties.typeLabel = 'ETF';
      break;
  }
  
  // シンボル特有の情報を追加
  if (symbol === 'SPY') {
    properties.name = 'SPDR S&P 500 ETF Trust';
  } else if (symbol === 'VOO') {
    properties.name = 'Vanguard S&P 500 ETF';
  } else if (symbol === 'QQQ') {
    properties.name = 'Invesco QQQ Trust (NASDAQ-100 Index)';
  } else if (symbol === 'VTI') {
    properties.name = 'Vanguard Total Stock Market ETF';
  } else if (symbol === 'INDA') {
    properties.name = 'iShares MSCI India ETF';
  } else if (symbol === 'LQD') {
    properties.name = 'iShares iBoxx $ Investment Grade Corporate Bond ETF';
  } else if (symbol === 'GLD') {
    properties.name = 'SPDR Gold Shares';
    properties.hasDividend = false;
    properties.dividendYield = 0;
  } else if (symbol === 'ARKK') {
    properties.name = 'ARK Innovation ETF';
  }
  
  return properties;
}

// ------------------ ETF処理関連の関数 ------------------

/**
 * ETF用の特別ハンドラ - より信頼性の高いデータ取得を試みる
 * @param {string} symbol - ティッカーシンボル
 * @returns {Promise<Object>} - ETFデータ
 */
async function handleETF(symbol) {
  const upperSymbol = symbol.toUpperCase();
  const etfType = getETFType(upperSymbol);
  
  console.log(`[Yahoo Finance Proxy] Using specialized ETF handler for ${upperSymbol} (${etfType})`);
  
  try {
    // 特化したエンドポイントを試みる
    const etfUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${upperSymbol}?modules=price,defaultKeyStatistics,summaryDetail`;
    
    const response = await axios.get(etfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': `https://finance.yahoo.com/quote/${upperSymbol}`,
        'Origin': 'https://finance.yahoo.com'
      },
      timeout: 10000
    });
    
    // データが存在するか確認
    if (response.data && 
        response.data.quoteSummary && 
        response.data.quoteSummary.result && 
        response.data.quoteSummary.result.length > 0) {
      
      const result = response.data.quoteSummary.result[0];
      const priceData = result.price || {};
      const statsData = result.defaultKeyStatistics || {};
      const summaryData = result.summaryDetail || {};
      
      // 実際の名前を取得
      const name = priceData.shortName || priceData.longName || `${upperSymbol} ETF`;
      
      // 価格を取得
      const price = (priceData.regularMarketPrice?.raw || 
                     summaryData.previousClose?.raw || 
                     ETF_DEFAULTS[upperSymbol] || 
                     100);
      
      // 配当利回りを取得 (存在する場合)
      let dividendYield = DEFAULT_DIVIDEND_YIELDS[etfType] || DEFAULT_DIVIDEND_YIELDS.unknown;
      let hasDividend = true;
      let dividendFrequency = 'quarterly';
      
      if (summaryData.dividendYield && summaryData.dividendYield.raw) {
        dividendYield = (summaryData.dividendYield.raw * 100).toFixed(2); // パーセンテージに変換
        hasDividend = dividendYield > 0;
      } else if (statsData.yield && statsData.yield.raw) {
        dividendYield = (statsData.yield.raw * 100).toFixed(2); // パーセンテージに変換
        hasDividend = dividendYield > 0;
      } else {
        // ETFタイプに基づくデフォルト値を使用
        if (etfType === 'commodity' || etfType === 'leveraged') {
          hasDividend = false;
          dividendYield = 0;
        }
      }
      
      // 通貨を取得
      const currency = priceData.currency || 'USD';
      
      console.log(`[Yahoo Finance Proxy] Successfully fetched ETF data for ${upperSymbol}: ${price}`);
      
      // ETF特性の取得
      const properties = getETFProperties(upperSymbol, etfType);
      
      return {
        ticker: upperSymbol,
        price: price,
        name: name,
        currency: currency,
        lastUpdated: new Date().toISOString(),
        source: `Yahoo Finance (${properties.typeLabel} ETF)`,
        isStock: false,
        isMutualFund: false,
        isETF: true,
        etfType: etfType,
        // ETFタイプごとの特性
        ...properties.flags,
        priceLabel: '株価',
        // 配当情報
        dividendYield: dividendYield,
        hasDividend: hasDividend,
        dividendFrequency: properties.dividendFrequency
      };
    } else {
      throw new Error(`No valid data found for ETF ${upperSymbol}`);
    }
  } catch (error) {
    console.warn(`[Yahoo Finance Proxy] ETF handler failed for ${upperSymbol}: ${error.message}`);
    
    // フォールバック値を返す
    return generateETFFallbackData(symbol);
  }
}

// ------------------ 主要なデータ取得関数 ------------------

/**
 * 株価データを取得する
 * @param {string} symbols - カンマ区切りのティッカーシンボル
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Object} - レスポンスオブジェクト
 */
async function handleStockData(symbols, headers) {
  // カンマ区切りのシンボルを配列に変換
  const symbolsList = symbols.split(',').map(s => s.trim());
  
  // 各シンボルをタイプごとに分類
  const etfSymbols = symbolsList.filter(s => isETF(s));
  const regularSymbols = symbolsList.filter(s => !isETF(s));
  
  console.log(`Symbol categorization: ETFs=${etfSymbols.length}, Regular=${regularSymbols.length}`);
  if (etfSymbols.length > 0) {
    console.log(`ETF symbols: ${etfSymbols.join(', ')}`);
  }
  
  // 結果格納用オブジェクト
  const result = {};
  
  // 1. まずETFを専用ハンドラで処理
  if (etfSymbols.length > 0) {
    console.log(`Processing ${etfSymbols.length} ETFs with dedicated handler`);
    
    for (const etfSymbol of etfSymbols) {
      // ETF用の特化したハンドラを使用
      const etfData = await handleETF(etfSymbol);
      result[etfSymbol] = etfData;
      
      // APIレート制限を避けるための短い遅延
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // 2. 次に通常のシンボルを処理
  if (regularSymbols.length > 0) {
    // 日本株と投資信託の場合は.Tを追加
    const formattedRegularSymbols = regularSymbols.map(symbol => {
      // 投資信託コード処理を追加（7-8桁数字+C）
      if (/^\d{7,8}C$/i.test(symbol) && !symbol.includes('.T')) {
        return `${symbol}.T`;
      }
      // 日本株の場合（4桁数字）
      else if (/^\d{4}$/.test(symbol) && !symbol.includes('.T')) {
        return `${symbol}.T`;
      }
      return symbol;
    });
    
    try {
      // 複数のアプローチを試す
      console.log(`Attempting to fetch data for regular symbols: ${formattedRegularSymbols.join(',')}`);
      
      // アプローチ1: Yahoo Finance APIを直接呼び出す
      try {
        console.log('Trying approach 1: Direct Yahoo Finance API call with enhanced headers');
        
        // ランダムなユーザーエージェントを選択
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
        ];
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${formattedRegularSymbols.join(',')}`;
        
        const response = await axios.get(yahooUrl, {
          headers: {
            'User-Agent': randomUserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://finance.yahoo.com/quote/AAPL/',
            'Origin': 'https://finance.yahoo.com',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          },
          timeout: 15000
        });
        
        // データが正常に取得できたかチェック
        if (response.data && 
            response.data.quoteResponse && 
            response.data.quoteResponse.result &&
            response.data.quoteResponse.result.length > 0) {
          
          console.log(`Successfully retrieved data via approach 1 for ${response.data.quoteResponse.result.length} symbols`);
          
          const quotes = response.data.quoteResponse.result;
          
          quotes.forEach(quote => {
            const ticker = quote.symbol;
            const plainTicker = ticker.replace(/\.T$/, '');
            const isMutualFundTicker = isMutualFund(ticker);
            
            result[plainTicker] = {
              ticker: plainTicker,
              price: quote.regularMarketPrice || quote.ask || quote.bid || 0,
              name: quote.shortName || quote.longName || ticker,
              currency: quote.currency || (ticker.includes('.T') ? 'JPY' : 'USD'),
              lastUpdated: new Date().toISOString(),
              source: 'Yahoo Finance',
              isStock: !isMutualFundTicker,
              isMutualFund: isMutualFundTicker,
              priceLabel: isMutualFundTicker ? '基準価額' : '株価'
            };
          });
          
          // 見つからなかったシンボルにフォールバックデータを追加
          const foundSymbols = quotes.map(q => q.symbol);
          const notFoundSymbols = formattedRegularSymbols.filter(s => !foundSymbols.includes(s));
          
          if (notFoundSymbols.length > 0) {
            console.log(`Generating fallback data for ${notFoundSymbols.length} missing regular symbols`);
            
            notFoundSymbols.forEach(symbol => {
              const plainSymbol = symbol.replace(/\.T$/, '');
              result[plainSymbol] = generateFallbackData(symbol);
            });
          }
        } else {
          throw new Error('No valid data found in Yahoo Finance response');
        }
        
      } catch (error1) {
        console.log(`Approach 1 failed: ${error1.message}`);
        
        // アプローチ2: アルタネイトエンドポイントを試す
        try {
          console.log('Trying approach 2: Alternate Yahoo Finance endpoint');
          
          // 各シンボルを個別に取得（異なるエンドポイント）
          for (const symbol of formattedRegularSymbols) {
            if (result[symbol.replace(/\.T$/, '')]) {
              continue; // 既に結果があるシンボルはスキップ
            }
            
            try {
              const plainSymbol = symbol.replace(/\.T$/, '');
              const altUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
              
              console.log(`Fetching data for ${symbol} from alternate endpoint`);
              
              const response = await axios.get(altUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                  'Accept': 'application/json',
                  'Referer': `https://finance.yahoo.com/quote/${symbol}`,
                  'Origin': 'https://finance.yahoo.com'
                },
                timeout: 10000
              });
              
              if (response.data && 
                  response.data.quoteSummary && 
                  response.data.quoteSummary.result && 
                  response.data.quoteSummary.result.length > 0 &&
                  response.data.quoteSummary.result[0].price) {
                
                const priceData = response.data.quoteSummary.result[0].price;
                const isMutualFundTicker = isMutualFund(symbol);
                
                result[plainSymbol] = {
                  ticker: plainSymbol,
                  price: priceData.regularMarketPrice?.raw || 0,
                  name: priceData.shortName || priceData.longName || symbol,
                  currency: priceData.currency || (symbol.includes('.T') ? 'JPY' : 'USD'),
                  lastUpdated: new Date().toISOString(),
                  source: 'Yahoo Finance',
                  isStock: !isMutualFundTicker,
                  isMutualFund: isMutualFundTicker,
                  priceLabel: isMutualFundTicker ? '基準価額' : '株価'
                };
                
                console.log(`Successfully retrieved data for ${symbol} via approach 2`);
              } else {
                throw new Error(`No valid data found for ${symbol}`);
              }
            } catch (symbolError) {
              console.log(`Failed to fetch data for ${symbol}: ${symbolError.message}`);
              const plainSymbol = symbol.replace(/\.T$/, '');
              // まだ結果がない場合のみフォールバックを設定
              if (!result[plainSymbol]) {
                result[plainSymbol] = generateFallbackData(symbol);
              }
            }
            
            // APIレート制限を避けるための短い遅延
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
        } catch (error2) {
          console.log(`Approach 2 failed: ${error2.message}`);
          
          // アプローチ3: 残りのシンボルにはフォールバックデータを使用
          console.log('Using fallback data for remaining symbols');
          
          formattedRegularSymbols.forEach(symbol => {
            const plainSymbol = symbol.replace(/\.T$/, '');
            // まだ結果がない場合のみフォールバックを設定
            if (!result[plainSymbol]) {
              result[plainSymbol] = generateFallbackData(symbol);
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error in handleStockData for regular symbols:', error);
      
      // 最終的なフォールバック（残りの全てのシンボル）
      formattedRegularSymbols.forEach(symbol => {
        const plainSymbol = symbol.replace(/\.T$/, '');
        // まだ結果がない場合のみフォールバックを設定
        if (!result[plainSymbol]) {
          result[plainSymbol] = generateFallbackData(symbol);
        }
      });
    }
  }
  
  // すべてのリクエストされたシンボルの結果があることを確認（最終チェック）
  symbolsList.forEach(symbol => {
    if (!result[symbol]) {
      result[symbol] = generateFallbackData(symbol);
    }
  });
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: result
    })
  };
}

/**
 * 為替レートを取得する
 * @param {string} exchangeRate - 通貨ペア（例: USDJPY）
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Object} - レスポンスオブジェクト
 */
async function handleExchangeRate(exchangeRate, headers) {
  // 通貨ペアを解析
  if (exchangeRate.length < 6) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Invalid exchange rate format',
        message: '無効な為替レート形式です。USDJPY のような形式を使用してください。'
      })
    };
  }
  
  const fromCurrency = exchangeRate.substring(0, 3);
  const toCurrency = exchangeRate.substring(3, 6);
  
  // 同一通貨の場合は1を返す
  if (fromCurrency === toCurrency) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rate: 1.0,
        source: 'Direct',
        lastUpdated: new Date().toISOString()
      })
    };
  }
  
  try {
    // 一番信頼性の高いexchangerate.hostを優先的に使用
    try {
      console.log(`Attempting to use exchangerate.host API for ${fromCurrency}/${toCurrency}...`);
      
      const response = await axios.get('https://api.exchangerate.host/latest', {
        params: {
          base: fromCurrency,
          symbols: toCurrency
        },
        timeout: 5000
      });
      
      if (response.data && response.data.rates && response.data.rates[toCurrency]) {
        const rate = response.data.rates[toCurrency];
        
        console.log(`Successfully retrieved exchange rate from exchangerate.host: ${rate}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            rate: rate,
            source: 'exchangerate.host',
            lastUpdated: new Date().toISOString()
          })
        };
      }
      
      throw new Error('No valid data in exchangerate.host response');
      
    } catch (error1) {
      console.warn(`exchangerate.host API failed: ${error1.message}`);
      
      // フォールバックとしてYahoo Financeを試す
      try {
        console.log(`Trying Yahoo Finance for ${fromCurrency}/${toCurrency} exchange rate`);
        
        const symbol = `${fromCurrency}${toCurrency}=X`;
        const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
        
        const response = await axios.get(yahooUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://finance.yahoo.com/'
          },
          timeout: 10000
        });
        
        if (response.data && 
            response.data.quoteResponse && 
            response.data.quoteResponse.result && 
            response.data.quoteResponse.result.length > 0) {
          
          const quote = response.data.quoteResponse.result[0];
          const rate = quote.regularMarketPrice || quote.ask || quote.bid || 0;
          
          console.log(`Successfully retrieved exchange rate from Yahoo Finance: ${rate}`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              rate: rate,
              source: 'Yahoo Finance',
              lastUpdated: new Date().toISOString()
            })
          };
        }
        
        throw new Error('No valid data in Yahoo Finance response');
        
      } catch (error2) {
        console.warn(`Yahoo Finance exchange rate failed: ${error2.message}`);
        
        // デフォルト値にフォールバック
        const defaultRate = getDefaultExchangeRate(fromCurrency, toCurrency);
        
        console.log(`Using fallback exchange rate: ${defaultRate}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            rate: defaultRate,
            source: 'Fallback',
            message: 'Using fallback exchange rate due to API errors',
            lastUpdated: new Date().toISOString()
          })
        };
      }
    }
    
  } catch (error) {
    console.error(`Exchange rate error: ${error.message}`);
    
    const defaultRate = getDefaultExchangeRate(fromCurrency, toCurrency);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rate: defaultRate,
        source: 'Fallback',
        message: 'Using fallback exchange rate due to API error',
        lastUpdated: new Date().toISOString()
      })
    };
  }
}

/**
 * 通貨ペアに基づいたデフォルト為替レートを返す
 * @param {string} fromCurrency - 変換元通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {number} - デフォルト為替レート
 */
function getDefaultExchangeRate(fromCurrency, toCurrency) {
  // よく使われる通貨ペアのデフォルト値
  const defaultRates = {
    'USDJPY': 155.0,
    'JPYUSD': 1/155.0,
    'EURJPY': 160.0,
    'EURUSD': 1.1
  };
  
  const pair = `${fromCurrency}${toCurrency}`;
  
  if (defaultRates[pair]) {
    return defaultRates[pair];
  }
  
  // 環境変数からデフォルト値を取得（USDJPY用）
  if (pair === 'USDJPY' && process.env.DEFAULT_EXCHANGE_RATE) {
    return parseFloat(process.env.DEFAULT_EXCHANGE_RATE);
  }
  
  // JPYUSD用のデフォルト値
  if (pair === 'JPYUSD' && process.env.DEFAULT_EXCHANGE_RATE) {
    return 1 / parseFloat(process.env.DEFAULT_EXCHANGE_RATE);
  }
  
  // その他の通貨ペアは1をデフォルト値とする
  return 1.0;
}
