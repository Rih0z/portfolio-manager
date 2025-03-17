/**
 * ファンドの種類と手数料推定のためのユーティリティ関数
 */

// ファンドタイプのマッピング
export const FUND_TYPES = {
  INDEX_JP: 'インデックス（日本）',
  INDEX_US: 'インデックス（米国）',
  INDEX_GLOBAL: 'インデックス（グローバル）',
  ACTIVE_JP: 'アクティブ（日本）',
  ACTIVE_US: 'アクティブ（米国）',
  ACTIVE_GLOBAL: 'アクティブ（グローバル）',
  ETF_JP: 'ETF（日本）',
  ETF_US: 'ETF（米国）',
  REIT_JP: 'REIT（日本）',
  REIT_US: 'REIT（米国）',
  CRYPTO: '暗号資産関連',
  BOND: '債券',
  STOCK: '個別株',
  UNKNOWN: '不明'
};

// ファンドタイプごとの平均年間手数料率（％）
export const FUND_TYPE_FEES = {
  [FUND_TYPES.INDEX_JP]: 0.3,
  [FUND_TYPES.INDEX_US]: 0.15,
  [FUND_TYPES.INDEX_GLOBAL]: 0.25,
  [FUND_TYPES.ACTIVE_JP]: 1.5,
  [FUND_TYPES.ACTIVE_US]: 0.75,
  [FUND_TYPES.ACTIVE_GLOBAL]: 1.0,
  [FUND_TYPES.ETF_JP]: 0.22,
  [FUND_TYPES.ETF_US]: 0.12,
  [FUND_TYPES.REIT_JP]: 0.6,
  [FUND_TYPES.REIT_US]: 0.5,
  [FUND_TYPES.CRYPTO]: 2.0,
  [FUND_TYPES.BOND]: 0.4,
  [FUND_TYPES.STOCK]: 0.0, // 個別株は手数料なし
  [FUND_TYPES.UNKNOWN]: 0.5 // 不明な場合のデフォルト値
};

// 特定のティッカーシンボルに対する手数料のオーバーライド
export const TICKER_SPECIFIC_FEES = {
  // 日本のETF
  '1306.T': 0.11, // TOPIX
  '1320.T': 0.16, // 日経225
  '1330.T': 0.09, // 日経225ミニ
  '1343.T': 0.55, // NEXT FUNDS 東証REIT指数
  '1348.T': 0.09, // MAXIS トピックス上場投信
  
  // 米国のETF
  'SPY': 0.09,  // SPDR S&P 500 ETF
  'VOO': 0.03,  // Vanguard S&P 500 ETF
  'VTI': 0.03,  // Vanguard Total Stock Market ETF
  'QQQ': 0.20,  // Invesco QQQ Trust (ナスダック100)
  'IVV': 0.03,  // iShares Core S&P 500 ETF
  'VGT': 0.10,  // Vanguard Information Technology ETF
  'VYM': 0.06,  // Vanguard High Dividend Yield ETF
  'VEA': 0.05,  // Vanguard FTSE Developed Markets ETF
  'VWO': 0.08,  // Vanguard FTSE Emerging Markets ETF
  'BND': 0.03,  // Vanguard Total Bond Market ETF
  'BNDX': 0.07, // Vanguard Total International Bond ETF
  'AGG': 0.04,  // iShares Core U.S. Aggregate Bond ETF
  'VNQ': 0.12,  // Vanguard Real Estate ETF
  
  // その他の有名なファンド
  'VTSAX': 0.04, // Vanguard Total Stock Market Index Fund Admiral Shares
  'VFIAX': 0.04, // Vanguard 500 Index Fund Admiral Shares
  
  // 暗号資産関連
  'GBTC': 2.00, // Grayscale Bitcoin Trust
  'ETHE': 2.50  // Grayscale Ethereum Trust
};

// ティッカーシンボルからファンドの種類を推定する
export function guessFundType(ticker, name = '') {
  ticker = ticker.toUpperCase();
  name = name.toLowerCase();
  
  // 日本市場のティッカー判定
  const isJapanese = ticker.includes('.T');
  
  // 個別株の判定
  // 日本株の判定（4桁+.T形式で、かつETFでない）
  const isJapaneseStock = isJapanese && !(/^[1-9]\d{3}\.T$/.test(ticker));
  
  // 米国の有名ETFかどうかの判定
  const isKnownETF = Object.keys(TICKER_SPECIFIC_FEES).includes(ticker);
  
  // ETFの判定
  const isETF = (
    (isJapanese && /^[1-9]\d{3}\.T$/.test(ticker)) // 日本のETFは通常4桁の数字で1から始まる
    || isKnownETF
    || name.includes('etf')
    || name.includes('連動型')
    || name.includes('上場投信')
  );
  
  // インデックスファンドの判定
  const isIndex = (
    name.includes('index')
    || name.includes('インデックス')
    || name.includes('日経')
    || name.includes('topix')
    || name.includes('トピックス')
    || name.includes('s&p')
    || name.includes('sp500')
    || name.includes('msci')
    || name.includes('ftse')
    || name.includes('russell')
  );
  
  // REITの判定
  const isREIT = (
    name.includes('reit')
    || name.includes('リート')
    || name.includes('不動産投資')
  );
  
  // 債券ファンドの判定
  const isBond = (
    name.includes('bond')
    || name.includes('債券')
    || name.includes('aggregate')
    || name.includes('国債')
    || name.includes('社債')
    || ticker === 'BND'
    || ticker === 'AGG'
  );
  
  // 暗号資産の判定
  const isCrypto = (
    name.includes('bitcoin')
    || name.includes('ethereum')
    || name.includes('crypto')
    || name.includes('暗号資産')
    || ticker === 'GBTC'
    || ticker === 'ETHE'
  );
  
  // アクティブファンドの判定
  const isActive = (
    name.includes('active')
    || name.includes('アクティブ')
    || name.includes('厳選')
    || name.includes('セレクト')
    || name.includes('選定')
  );
  
  // グローバル分散の判定
  const isGlobal = (
    name.includes('global')
    || name.includes('グローバル')
    || name.includes('international')
    || name.includes('world')
    || name.includes('世界')
  );
  
  // 明らかに個別株の場合
  if (isJapaneseStock || (!isETF && !isIndex && !isREIT && !isBond && !isCrypto && !isActive)) {
    return FUND_TYPES.STOCK;
  } else if (isCrypto) {
    return FUND_TYPES.CRYPTO;
  } else if (isREIT) {
    return isJapanese ? FUND_TYPES.REIT_JP : FUND_TYPES.REIT_US;
  } else if (isBond) {
    return FUND_TYPES.BOND;
  } else if (isETF) {
    return isJapanese ? FUND_TYPES.ETF_JP : FUND_TYPES.ETF_US;
  } else if (isIndex) {
    if (isGlobal) {
      return FUND_TYPES.INDEX_GLOBAL;
    } else {
      return isJapanese ? FUND_TYPES.INDEX_JP : FUND_TYPES.INDEX_US;
    }
  } else if (isActive) {
    if (isGlobal) {
      return FUND_TYPES.ACTIVE_GLOBAL;
    } else {
      return isJapanese ? FUND_TYPES.ACTIVE_JP : FUND_TYPES.ACTIVE_US;
    }
  }
  
  // 個別株と判断する基準を強化
  // 日本株で.T形式のものや、米国の通常の2-5文字ティッカーで
  // かつ特殊ファンドと判定されていないものは個別株とみなす
  if ((isJapanese && /\.\w+$/.test(ticker)) || (ticker.length >= 1 && ticker.length <= 5)) {
    return FUND_TYPES.STOCK;
  }
  
  // デフォルト
  return FUND_TYPES.UNKNOWN;
}

// ティッカーシンボルからファンドの年間手数料を推定する
export function estimateAnnualFee(ticker, name = '') {
  ticker = ticker.toUpperCase();
  
  // 特定のティッカーに対するオーバーライド値があれば使用
  if (TICKER_SPECIFIC_FEES[ticker]) {
    return {
      fee: TICKER_SPECIFIC_FEES[ticker],
      source: 'ティッカー固有の情報',
      isEstimated: false
    };
  }
  
  // ファンドタイプから手数料を推定
  const fundType = guessFundType(ticker, name);
  
  // 個別株の場合は必ず0を返す
  if (fundType === FUND_TYPES.STOCK) {
    return {
      fee: 0,
      fundType: FUND_TYPES.STOCK,
      source: '個別株',
      isEstimated: false
    };
  }
  
  const fee = FUND_TYPE_FEES[fundType] || FUND_TYPE_FEES[FUND_TYPES.UNKNOWN];
  
  return {
    fee,
    fundType,
    source: 'ファンドタイプからの推定',
    isEstimated: true
  };
}

// ファンド名から追加情報を推測する（ファンドタイプの補助情報）
export function extractFundInfo(ticker, name = '') {
  const info = {};
  ticker = ticker.toUpperCase();
  name = name.toLowerCase();
  
  // 通貨の判定
  info.currency = ticker.includes('.T') ? 'JPY' : 'USD';
  
  // 地域の判定
  if (
    name.includes('japan') ||
    name.includes('日本') ||
    name.includes('topix') ||
    name.includes('トピックス') ||
    name.includes('日経') ||
    ticker.includes('.T')
  ) {
    info.region = '日本';
  } else if (
    name.includes('us') ||
    name.includes('united states') ||
    name.includes('米国') ||
    name.includes('アメリカ') ||
    name.includes('s&p') ||
    name.includes('dow') ||
    name.includes('nasdaq')
  ) {
    info.region = '米国';
  } else if (
    name.includes('global') ||
    name.includes('world') ||
    name.includes('グローバル') ||
    name.includes('世界')
  ) {
    info.region = 'グローバル';
  } else {
    info.region = '不明';
  }
  
  return info;
}
