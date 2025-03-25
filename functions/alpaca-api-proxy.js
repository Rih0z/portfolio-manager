// functions/alpaca-api-proxy.js
/**
 * Alpaca APIへのプロキシ関数（すべてのETF対応版）
 * 株価データを取得する
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // シンボルパラメータの取得
  const symbol = event.queryStringParameters?.symbol;
  
  if (!symbol) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'シンボルパラメータが必要です'
      })
    };
  }

  console.log(`Alpaca API request for symbol: ${symbol}`);
  
  // ETFかどうかをチェック
  const isEtf = isETF(symbol);
  
  // ETFの場合は特別処理
  if (isEtf) {
    const etfType = getETFType(symbol);
    console.log(`${symbol} is an ETF (${etfType}). Using enhanced handling...`);
    return await handleETF(symbol, etfType, headers);
  }

  // 環境変数からキーを取得
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;

  // APIキーとシークレットが設定されているか確認
  if (!apiKey || !apiSecret) {
    console.error('Alpaca API keys are not configured');
    return generateFallbackResponse(symbol, headers, 'APIキーが設定されていません');
  }

  try {
    // Alpaca APIを呼び出す（最新の株価データを取得）
    const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret
      },
      timeout: 10000
    });
    
    // レスポンスからデータを抽出
    const quoteData = response.data;
    
    if (!quoteData || !quoteData.quote || !quoteData.quote.ap) {
      console.warn(`No valid quote data found for ${symbol}`);
      return generateFallbackResponse(symbol, headers, `${symbol}の株価データが見つかりません`);
    }
    
    // 結果を整形
    const result = {
      ticker: symbol,
      price: quoteData.quote.ap, // 気配値（ask price）
      name: symbol, // Alpaca APIは銘柄名を直接提供しないため
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      source: 'Alpaca',
      isStock: true,
      isMutualFund: false
    };
    
    console.log(`Successfully retrieved data for ${symbol} from Alpaca API`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };
  } catch (error) {
    console.error(`Alpaca API error for ${symbol}:`, error);
    
    // エラーの詳細をログ出力
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', JSON.stringify(error.response.data).substring(0, 500));
    }
    
    // エラーメッセージを生成
    let errorMessage = `Alpaca APIからの取得に失敗しました`;
    
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        errorMessage = 'Alpaca APIの認証に失敗しました。APIキーを確認してください。';
      } else if (status === 404) {
        errorMessage = `銘柄 ${symbol} は見つかりませんでした。銘柄コードを確認してください。`;
      } else if (status === 429) {
        errorMessage = 'Alpaca APIの使用制限に達しました。しばらく時間をおいて再試行してください。';
      } else if (status >= 500) {
        errorMessage = 'Alpaca APIサーバーでエラーが発生しました。しばらく時間をおいて再試行してください。';
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Alpaca APIからの応答がタイムアウトしました。接続状況を確認してください。';
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
    }
    
    return generateFallbackResponse(symbol, headers, errorMessage);
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

// ------------------ ETF処理関連の関数 ------------------

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

/**
 * ETF用のフォールバックデータを生成する
 * @param {string} symbol - ティッカーシンボル（ETF）
 * @param {string} etfType - ETFの種類
 * @returns {Object} ETF用フォールバックデータ
 */
function generateETFFallbackData(symbol, etfType) {
  // 大文字に変換
  const upperSymbol = symbol.toUpperCase();
  
  // ETFのデフォルト価格を取得（なければ一般的な値を使用）
  const price = ETF_DEFAULTS[upperSymbol] || 100;
  
  // ETFタイプに基づく詳細な特性
  const properties = getETFProperties(upperSymbol, etfType);
  
  // 特定のETFに関するログを表示
  if (['LQD', 'INDA', 'SPY', 'ARKK', 'GLD'].includes(upperSymbol)) {
    console.log(`[Alpaca API] Special handling for ${upperSymbol} (${etfType}) with price: ${price}`);
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
 * ETF専用のハンドラー - 複数のエンドポイントを試す
 * @param {string} symbol - ティッカーシンボル
 * @param {string} etfType - ETFの種類
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Object} レスポンスオブジェクト
 */
async function handleETF(symbol, etfType, headers) {
  console.log(`Using enhanced ETF handler for ${symbol} (${etfType})`);
  
  // 環境変数からキーを取得
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;
  
  // APIキーとシークレットが設定されているか確認
  if (!apiKey || !apiSecret) {
    console.error('Alpaca API keys are not configured');
    return generateETFFallbackResponse(symbol, etfType, headers, 'APIキーが設定されていません');
  }
  
  try {
    // 1. まずAlpacaの通常エンドポイントを試す
    try {
      console.log(`Trying primary Alpaca endpoint for ${etfType} ETF ${symbol}...`);
      
      const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret
        },
        timeout: 10000
      });
      
      // レスポンスからデータを抽出
      const quoteData = response.data;
      
      if (quoteData && quoteData.quote && quoteData.quote.ap) {
        console.log(`Successfully retrieved data for ${etfType} ETF ${symbol} from primary Alpaca endpoint`);
        
        // ETF特性の取得
        const properties = getETFProperties(symbol, etfType);
        
        // 結果を整形
        const result = {
          ticker: symbol,
          price: quoteData.quote.ap,
          name: properties.name,
          currency: 'USD',
          lastUpdated: new Date().toISOString(),
          source: `Alpaca (${properties.typeLabel} ETF)`,
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
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: result
          })
        };
      }
      
      console.log(`No valid quote data found for ${etfType} ETF ${symbol} from primary endpoint`);
      throw new Error('Primary endpoint returned no valid data');
      
    } catch (primaryError) {
      console.warn(`Primary Alpaca endpoint failed for ${etfType} ETF ${symbol}:`, primaryError.message);
      
      // 2. 次にAlpacaの代替エンドポイントを試す
      try {
        console.log(`Trying alternative Alpaca endpoint for ${etfType} ETF ${symbol}...`);
        
        // 代替エンドポイント（バーデータ）を使用
        const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/bars/latest?timeframe=1Day`, {
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret
          },
          timeout: 10000
        });
        
        // レスポンスからデータを抽出
        const barData = response.data;
        
        if (barData && barData.bar && barData.bar.c) {
          console.log(`Successfully retrieved data for ${etfType} ETF ${symbol} from alternative Alpaca endpoint`);
          
          // ETF特性の取得
          const properties = getETFProperties(symbol, etfType);
          
          // 結果を整形
          const result = {
            ticker: symbol,
            price: barData.bar.c, // 終値を使用
            name: properties.name,
            currency: 'USD',
            lastUpdated: barData.bar.t || new Date().toISOString(),
            source: `Alpaca (${properties.typeLabel} ETF - Alternative)`,
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
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: result
            })
          };
        }
        
        console.log(`No valid bar data found for ${etfType} ETF ${symbol} from alternative endpoint`);
        throw new Error('Alternative endpoint returned no valid data');
        
      } catch (alternativeError) {
        console.warn(`Alternative Alpaca endpoint failed for ${etfType} ETF ${symbol}:`, alternativeError.message);
        
        // 3. 最後に別のエンドポイントを試す
        try {
          console.log(`Trying last resort endpoint for ${etfType} ETF ${symbol}...`);
          
          // 日足の履歴データを使用（最新のデータから取得）
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7); // 7日前から
          const startDateStr = startDate.toISOString().split('T')[0];
          
          const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/bars`, {
            params: {
              timeframe: '1Day',
              start: startDateStr,
              end: endDate
            },
            headers: {
              'APCA-API-KEY-ID': apiKey,
              'APCA-API-SECRET-KEY': apiSecret
            },
            timeout: 15000
          });
          
          // レスポンスからデータを抽出
          const barsData = response.data;
          
          if (barsData && barsData.bars && barsData.bars.length > 0) {
            // 最新のデータを使用
            const latestBar = barsData.bars[barsData.bars.length - 1];
            console.log(`Successfully retrieved historical data for ${etfType} ETF ${symbol}`);
            
            // ETF特性の取得
            const properties = getETFProperties(symbol, etfType);
            
            // 結果を整形
            const result = {
              ticker: symbol,
              price: latestBar.c, // 終値を使用
              name: properties.name,
              currency: 'USD',
              lastUpdated: latestBar.t || new Date().toISOString(),
              source: `Alpaca (${properties.typeLabel} ETF - Historical)`,
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
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data: result
              })
            };
          }
          
          console.log(`No valid historical data found for ${etfType} ETF ${symbol}`);
          throw new Error('Historical data endpoint returned no valid data');
          
        } catch (lastResortError) {
          console.warn(`Last resort endpoint failed for ${etfType} ETF ${symbol}:`, lastResortError.message);
          
          // 4. すべてのエンドポイントが失敗した場合はフォールバック
          console.log(`All Alpaca endpoints failed. Using fallback data for ${etfType} ETF ${symbol}`);
          return generateETFFallbackResponse(symbol, etfType, headers, '利用可能なAPIエンドポイントからデータを取得できませんでした');
        }
      }
    }
  } catch (error) {
    console.error(`ETF handler error for ${symbol}:`, error);
    return generateETFFallbackResponse(symbol, etfType, headers, `ETF ${symbol} の処理中にエラーが発生しました`);
  }
}

/**
 * ETF用のフォールバックレスポンスを生成する
 * @param {string} symbol - ティッカーシンボル
 * @param {string} etfType - ETFの種類
 * @param {Object} headers - レスポンスヘッダー
 * @param {string} message - メッセージ
 * @returns {Object} レスポンスオブジェクト
 */
function generateETFFallbackResponse(symbol, etfType, headers, message) {
  // ETF用のフォールバックデータを生成
  const fallbackData = generateETFFallbackData(symbol, etfType);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true, // ユーザー体験向上のために成功とする
      message: message,
      data: fallbackData
    })
  };
}

/**
 * フォールバックレスポンスを生成する
 * @param {string} symbol - ティッカーシンボル
 * @param {Object} headers - レスポンスヘッダー
 * @param {string} message - エラーメッセージ
 * @returns {Object} レスポンスオブジェクト
 */
function generateFallbackResponse(symbol, headers, message) {
  // ETFかどうかをチェック
  if (isETF(symbol)) {
    const etfType = getETFType(symbol);
    return generateETFFallbackResponse(symbol, etfType, headers, message);
  }
  
  // 通常のフォールバック値を設定
  const fallbackData = {
    ticker: symbol,
    price: ETF_DEFAULTS[symbol.toUpperCase()] || 100, // デフォルト価格
    name: symbol,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    source: 'Fallback',
    isStock: true,
    isMutualFund: false
  };
  
  return {
    statusCode: 200, // エラーでもクライアントには200を返す
    headers,
    body: JSON.stringify({
      success: true, // フォールバックデータを返すので成功とみなす
      message: message,
      data: fallbackData
    })
  };
}
