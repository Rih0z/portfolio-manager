/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/fundUtils.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-12 13:20:45 
 * 
 * 更新履歴: 
 * - 2025-03-12 13:20:45 Koki Riho 初回作成
 * - 2025-03-28 15:35:10 Koki Riho ETFリストを拡充
 * - 2025-04-10 09:40:20 Yuta Sato 債券ETF判定ロジックを追加
 * - 2025-04-25 11:15:30 Koki Riho 配当情報推定ロジックを強化
 * 
 * 説明: 
 * ファンドの種類と手数料推定のためのユーティリティ関数。
 * ファンドタイプの判定、年間手数料率の推定、配当利回りの推定などの機能を提供する。
 */

/**
 * ファンドの種類と手数料推定のためのユーティリティ関数
 */

// データソース定数（更新版）
export const DATA_SOURCES = {
  ALPACA: 'Alpaca',
  YAHOO_FINANCE: 'Yahoo Finance',
  EXCHANGERATE: 'exchangerate.host',
  FALLBACK: 'Fallback'
};

// データソース優先順位（更新版）
export const SOURCE_PRIORITY = [
  DATA_SOURCES.ALPACA, // 米国株向けプライマリソース
  DATA_SOURCES.YAHOO_FINANCE, // 日本株・投資信託向けプライマリソース
  DATA_SOURCES.FALLBACK // 最終フォールバック
];

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
  MUTUAL_FUND: '投資信託',
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

// 明示的に米国ETFリストを定義
export const US_ETF_LIST = [
  'SPY', 'VOO', 'VTI', 'QQQ', 'IVV', 'VGT', 'VYM', 'VEA', 'VWO', 'BND', 'BNDX', 
  'AGG', 'VNQ', 'GLD', 'LQD', 'EIDO', 'INDA', 'IBIT', 'DIA', 'XLF', 'XLE', 'XLK', 
  'XLV', 'SCHD', 'IEMG', 'IJH', 'IJR', 'ARKK', 'ARKW', 'ARKG', 'ARKF', 'IEFA', 
  'EEM', 'EFA', 'ITOT', 'DVY', 'MUB', 'TLT', 'SHY', 'HYG', 'JNK',
  'VXUS' // 明示的にVXUSを追加（Vanguard Total International Stock ETF）
];

// 特定のティッカーシンボルに対する手数料のオーバーライド
export const TICKER_SPECIFIC_FEES = {
  // 日本のETF
  '1306.T': 0.11, // TOPIX
  '1320.T': 0.16, // 日経225
  '1330.T': 0.09, // 日経225ミニ
  '1343.T': 0.55, // NEXT FUNDS 東証REIT指数
  '1348.T': 0.09, // MAXIS トピックス上場投信
  
  // 米国の主要ETF
  'SPY': 0.09,  // SPDR S&P 500 ETF
  'VOO': 0.03,  // Vanguard S&P 500 ETF
  'VTI': 0.03,  // Vanguard Total Stock Market ETF
  'QQQ': 0.20,  // Invesco QQQ Trust (ナスダック100)
  'IVV': 0.03,  // iShares Core S&P 500 ETF
  'VGT': 0.10,  // Vanguard Information Technology ETF
  'VYM': 0.06,  // Vanguard High Dividend Yield ETF
  'VEA': 0.05,  // Vanguard FTSE Developed Markets ETF
  'VWO': 0.08,  // Vanguard FTSE Emerging Markets ETF
  'VXUS': 0.07, // Vanguard Total International Stock ETF - 明示的に追加
  'BND': 0.03,  // Vanguard Total Bond Market ETF
  'BNDX': 0.07, // Vanguard Total International Bond ETF
  'AGG': 0.04,  // iShares Core U.S. Aggregate Bond ETF
  'VNQ': 0.12,  // Vanguard Real Estate ETF
  
  // 問題が報告されたETF
  'GLD': 0.40,  // SPDR Gold Shares
  'LQD': 0.14,  // iShares iBoxx $ Investment Grade Corporate Bond ETF
  'LVXUS': 0.09, // Leavenworth International Equity Fund
  
  // 新しく追加するETF
  'EIDO': 0.57, // iShares MSCI Indonesia ETF
  'INDA': 0.65, // iShares MSCI India ETF
  'IBIT': 0.25, // iShares Bitcoin Trust
  
  // その他の有名なETF（追加）
  'DIA': 0.16,  // SPDR Dow Jones Industrial Average ETF
  'XLF': 0.12,  // Financial Select Sector SPDR Fund
  'XLE': 0.12,  // Energy Select Sector SPDR Fund
  'XLK': 0.12,  // Technology Select Sector SPDR Fund
  'XLV': 0.12,  // Health Care Select Sector SPDR Fund
  'SCHD': 0.06, // Schwab US Dividend Equity ETF
  'IEMG': 0.09, // iShares Core MSCI Emerging Markets ETF
  'IJH': 0.04,  // iShares Core S&P Mid-Cap ETF
  'IJR': 0.06,  // iShares Core S&P Small-Cap ETF
  'ARKK': 0.75, // ARK Innovation ETF
  'ARKW': 0.75, // ARK Web x.0 ETF
  'ARKG': 0.75, // ARK Genomic Revolution ETF
  'ARKF': 0.75, // ARK Fintech Innovation ETF
  'IEFA': 0.07, // iShares Core MSCI EAFE ETF
  'EEM': 0.68,  // iShares MSCI Emerging Markets ETF
  'EFA': 0.32,  // iShares MSCI EAFE ETF
  'ITOT': 0.03, // iShares Core S&P Total U.S. Stock Market ETF
  'DVY': 0.38,  // iShares Select Dividend ETF
  'MUB': 0.07,  // iShares National Muni Bond ETF
  'TLT': 0.15,  // iShares 20+ Year Treasury Bond ETF
  'SHY': 0.15,  // iShares 1-3 Year Treasury Bond ETF
  'HYG': 0.48,  // iShares iBoxx $ High Yield Corporate Bond ETF
  'JNK': 0.40,  // SPDR Bloomberg High Yield Bond ETF
  
  // その他の有名なファンド
  'VTSAX': 0.04, // Vanguard Total Stock Market Index Fund Admiral Shares
  'VFIAX': 0.04, // Vanguard 500 Index Fund Admiral Shares
  
  // 暗号資産関連
  'GBTC': 2.00, // Grayscale Bitcoin Trust
  'ETHE': 2.50  // Grayscale Ethereum Trust
};

// 特定のティッカーシンボルの配当利回り情報（％）
export const TICKER_SPECIFIC_DIVIDENDS = {
  // 米国の主要ETF
  'SPY': 1.5,   // SPDR S&P 500 ETF
  'VOO': 1.5,   // Vanguard S&P 500 ETF
  'VTI': 1.5,   // Vanguard Total Stock Market ETF
  'QQQ': 0.6,   // Invesco QQQ Trust (ナスダック100)
  'IVV': 1.5,   // iShares Core S&P 500 ETF
  'VGT': 0.7,   // Vanguard Information Technology ETF
  'VYM': 3.2,   // Vanguard High Dividend Yield ETF
  'VEA': 3.0,   // Vanguard FTSE Developed Markets ETF
  'VWO': 3.2,   // Vanguard FTSE Emerging Markets ETF
  'VXUS': 3.0,  // Vanguard Total International Stock ETF - 明示的に追加
  'BND': 2.8,   // Vanguard Total Bond Market ETF
  'BNDX': 2.5,  // Vanguard Total International Bond ETF
  'AGG': 2.7,   // iShares Core U.S. Aggregate Bond ETF
  'VNQ': 4.0,   // Vanguard Real Estate ETF
  
  // 問題が報告されたETF
  'GLD': 0.0,   // SPDR Gold Shares - 配当なし
  'LQD': 3.5,   // iShares iBoxx $ Investment Grade Corporate Bond ETF
  'LVXUS': 2.2, // Leavenworth International Equity Fund
  
  // 新しく追加するETF
  'EIDO': 1.8,  // iShares MSCI Indonesia ETF
  'INDA': 0.7,  // iShares MSCI India ETF
  'IBIT': 0.0,  // iShares Bitcoin Trust - 暗号資産ETFのため配当なし
  
  // その他の有名なETF（追加）
  'DIA': 2.2,   // SPDR Dow Jones Industrial Average ETF
  'XLF': 2.0,   // Financial Select Sector SPDR Fund
  'XLE': 3.8,   // Energy Select Sector SPDR Fund
  'XLK': 0.7,   // Technology Select Sector SPDR Fund
  'XLV': 1.5,   // Health Care Select Sector SPDR Fund
  'SCHD': 3.5,  // Schwab US Dividend Equity ETF
  'DVY': 3.8,   // iShares Select Dividend ETF
  'HDV': 3.9,   // iShares Core High Dividend ETF
  
  // 債券ETF
  'HYG': 5.0,   // iShares iBoxx $ High Yield Corporate Bond ETF
  'JNK': 5.2,   // SPDR Bloomberg High Yield Bond ETF
  'TLT': 3.0,   // iShares 20+ Year Treasury Bond ETF
  'SHY': 1.8,   // iShares 1-3 Year Treasury Bond ETF
  'MUB': 2.5,   // iShares National Muni Bond ETF
};

// EMAXISシリーズのファンドコードリスト（日本のインデックスファンド）
export const EMAXIS_FUNDS = [
  '253266', '253265', '253264', '253263', '253262', '253261', '25326A',
  '253259', '253258', '253257', '2533141', '2533131', '2533121', '2533111',
  '2533101', '2531081', '2531071', '2531061', '2531051', '2531031', '2531111',
  '2531106', '2531105', '2531104', '2531103', '2531102', '2531101', '25311A',
  '2531091', '2531081', '2531071', '2531061', '2531051', '2531041', '2531031',
  '2531021', '2531011',
];

// eMAXIS Slimシリーズのファンドコードリスト
export const EMAXIS_SLIM_FUNDS = [
  '2533106', '2531108', '2533118', '2533105', '2533112', '2533120',
  '2533117', '2531111', '2531211', '2531210',
];

// 楽天VTシリーズのファンドコードリスト
export const RAKUTEN_VT_FUNDS = [
  '252499', '252498', '252497', '252496', '252495', '252494', '252493',
];

// 代表的なインデックスファンド接頭辞（大文字小文字区別なし）
export const INDEX_FUND_PREFIXES = [
  'EMAXIS', 'eMAXIS', 'eMaxis', 'たわらノーロード', 'ニッセイ', 'お買い得', 'インデックス',
  'MAXIS', 'Smart-i', 'iFree', 'iシェアーズ', '上場インデックス', 'NEXT FUNDS', 'ダイワ',
  'One', 'SBI', '楽天', 'NZAM', 'Funds-i', 'iFreeNext', '三井住友・', 'AM-One'
];

// 代表的なETF接頭辞（大文字小文字区別なし）
export const ETF_PREFIXES = [
  'SPDR', 'Vanguard', 'iShares', 'Invesco', 'NEXT', 'ProShares', 'Direxion',
  'Global X', 'ARK', 'WisdomTree', 'First Trust', 'VanEck', 'Schwab', 'MAXIS',
  'JP Morgan', 'BlackRock', 'State Street', 'PIMCO', 'Fidelity', 'Dimensional',
  'Goldman Sachs', 'DIAM', 'MAXIS', 'Mirae Asset'
];

// 日本の証券コード接頭辞マッピング
export const JP_CODE_PREFIX_MAP = {
  '1': 'ETF', // 通常のETF
  '2': 'ETF/REIT',  // ETFまたはREIT
  '25': 'ファンド',  // 投資信託のコード
  '253': 'インデックスファンド',  // eMAXISなどのインデックスファンド
};

// ETFかどうかの簡易判定（TICKER_SPECIFIC_FEESに含まれるか）
const isKnownETF = (ticker) => {
  return Object.keys(TICKER_SPECIFIC_FEES).includes(ticker) || US_ETF_LIST.includes(ticker);
};

// ティッカーシンボルからファンドの種類を推定する
export const guessFundType = (ticker, name = '') => {
  if (!ticker) return FUND_TYPES.UNKNOWN;
  
  ticker = ticker.toUpperCase();
  name = (name || '').toLowerCase();
  
  // 明示的に米国ETFリストをチェック（VXUSもここでチェックされる）
  if (US_ETF_LIST.includes(ticker)) {
    if (isREIT(name)) {
      return FUND_TYPES.REIT_US;
    }
    if (isBond(name, ticker)) {
      return FUND_TYPES.BOND;
    }
    if (isCrypto(name, ticker)) {
      return FUND_TYPES.CRYPTO;
    }
    // VXUSを含む米国ETF
    return FUND_TYPES.ETF_US;
  }
  
  // 日本市場のティッカー判定
  const isJapanese = ticker.includes('.T') || /^\d{4,}$/.test(ticker);
  
  // 重要: 特定のティッカーリストに含まれる銘柄は優先的にETFとして判定
  if (isKnownETF(ticker)) {
    // 特定のETFかどうかをチェック
    if (isREIT(name)) {
      return isJapanese ? FUND_TYPES.REIT_JP : FUND_TYPES.REIT_US;
    } else if (isCrypto(name, ticker)) {
      return FUND_TYPES.CRYPTO;
    } else if (isBond(name, ticker)) {
      return FUND_TYPES.BOND;
    } else {
      return isJapanese ? FUND_TYPES.ETF_JP : FUND_TYPES.ETF_US;
    }
  }
  
  // 特定のファンドリストに含まれるかチェック
  if (EMAXIS_FUNDS.includes(ticker) || EMAXIS_SLIM_FUNDS.includes(ticker) || RAKUTEN_VT_FUNDS.includes(ticker)) {
    if (name.includes('グローバル') || name.includes('全世界') || name.includes('global') || name.includes('world')) {
      return FUND_TYPES.INDEX_GLOBAL;
    } else if (name.includes('米国') || name.includes('米株') || name.includes('us')) {
      return FUND_TYPES.INDEX_US;
    } else {
      return FUND_TYPES.INDEX_JP;
    }
  }
  
  // 日本の投資信託パターン（8桁数字、または7桁+アルファベット）
  if (/^(\d{8}|\d{7}[A-Z]|[A-Z0-9]{8})$/i.test(ticker)) {
    // 投資信託として判定
    // 名称に基づいてインデックスかアクティブか判定
    if (isIndex(name)) {
      if (isGlobal(name)) {
        return FUND_TYPES.INDEX_GLOBAL;
      } else if (name.includes('米国') || name.includes('米株') || name.includes('US') || name.includes('S&P')) {
        return FUND_TYPES.INDEX_US;
      } else {
        return FUND_TYPES.INDEX_JP;
      }
    } else {
      // アクティブファンド
      if (isGlobal(name)) {
        return FUND_TYPES.ACTIVE_GLOBAL;
      } else if (name.includes('米国') || name.includes('米株') || name.includes('US')) {
        return FUND_TYPES.ACTIVE_US;
      } else {
        return FUND_TYPES.ACTIVE_JP;
      }
    }
  }
  
  // 日本のコード接頭辞による判定（4桁数字）
  if (/^\d{4}$/.test(ticker)) {
    const prefix1 = ticker.substring(0, 1);
    const prefix2 = ticker.substring(0, 2);
    const prefix3 = ticker.substring(0, 3);
    
    // コード系列判定
    if (prefix3 === '253') {
      // eMAXISなどのインデックスファンド系
      return FUND_TYPES.INDEX_JP;
    } else if (prefix2 === '25') {
      // その他の投資信託コード
      return isActiveOrIndex(name, isJapanese);
    } else if (prefix1 === '1' || prefix1 === '2') {
      // ETFまたはREIT
      if (isREIT(name)) {
        return isJapanese ? FUND_TYPES.REIT_JP : FUND_TYPES.REIT_US;
      } else {
        return FUND_TYPES.ETF_JP;
      }
    } else {
      // 4桁の通常の株式
      return FUND_TYPES.STOCK;
    }
  }
  
  // 日本のETF（一般的に1または2から始まるコード）
  if (isJapanese && /^[12]\d{3}\.T$/.test(ticker)) {
    return FUND_TYPES.ETF_JP;
  }
  
  // ファンド名称による判定
  // ETF判定
  if (isETF(name, ticker)) {
    return isJapanese ? FUND_TYPES.ETF_JP : FUND_TYPES.ETF_US;
  }
  
  // インデックスファンド判定
  if (isIndex(name)) {
    if (isGlobal(name)) {
      return FUND_TYPES.INDEX_GLOBAL;
    } else {
      return isJapanese ? FUND_TYPES.INDEX_JP : FUND_TYPES.INDEX_US;
    }
  }
  
  // REIT判定
  if (isREIT(name)) {
    return isJapanese ? FUND_TYPES.REIT_JP : FUND_TYPES.REIT_US;
  }
  
  // 債券ファンド判定
  if (isBond(name, ticker)) {
    return FUND_TYPES.BOND;
  }
  
  // 暗号資産判定
  if (isCrypto(name, ticker)) {
    return FUND_TYPES.CRYPTO;
  }
  
  // アクティブファンド判定
  if (isActive(name)) {
    if (isGlobal(name)) {
      return FUND_TYPES.ACTIVE_GLOBAL;
    } else {
      return isJapanese ? FUND_TYPES.ACTIVE_JP : FUND_TYPES.ACTIVE_US;
    }
  }
  
  // 明らかなファンド指標がある場合はファンドとして扱う
  if (containsFundIndicators(name)) {
    // 地域による分類
    if (isGlobal(name)) {
      return isActive(name) ? FUND_TYPES.ACTIVE_GLOBAL : FUND_TYPES.INDEX_GLOBAL;
    } else if (isJapanese || name.includes('japan') || name.includes('日本')) {
      return isActive(name) ? FUND_TYPES.ACTIVE_JP : FUND_TYPES.INDEX_JP;
    } else {
      return isActive(name) ? FUND_TYPES.ACTIVE_US : FUND_TYPES.INDEX_US;
    }
  }
  
  // 3文字以上のティッカーに特定のキーワードが含まれる場合はETFの可能性が高い
  if (ticker.length >= 3) {
    // ETFの特徴的なティッカーパターン
    if (/^[A-Z]{3,5}$/.test(ticker)) {
      const etfPatterns = [
        'ETF', 'VOO', 'SPY', 'QQQ', 'DIA', 'XL', 'IVV', 'EFA', 'VT', 'ARK',
        'VFH', 'VGT', 'VHT', 'VIS', 'VDE', 'VAW', 'VNQ', 'VPU', 'VCR', 'BND', 'SHY'
      ];
      
      for (const pattern of etfPatterns) {
        if (ticker.includes(pattern)) {
          return FUND_TYPES.ETF_US;
        }
      }
    }
  }
  
  // 最終的な判断（デフォルトは個別株）
  return FUND_TYPES.STOCK;
}

// ファンド名称に明らかなファンド指標があるかチェック
const containsFundIndicators = (name) => {
  return name.includes('fund') || 
         name.includes('ファンド') || 
         name.includes('投信') || 
         name.includes('etf') || 
         name.includes('インデックス') || 
         name.includes('index') ||
         name.includes('trust') ||
         name.includes('ishares') ||
         name.includes('vanguard') ||
         name.includes('シェアーズ') ||
         name.includes('spdr');
};

// ETFかどうかを判定
const isETF = (name, ticker) => {
  return name.includes('etf') || 
         name.includes('exchange traded fund') || 
         name.includes('上場投信') || 
         name.includes('上場投資信託') ||
         ETF_PREFIXES.some(prefix => name.includes(prefix.toLowerCase())) ||
         (ticker.includes('-') && (name.includes('ishares') || name.includes('vanguard') || name.includes('spdr')));
};

// インデックスファンドかどうかを判定
const isIndex = (name) => {
  return name.includes('index') ||
         name.includes('インデックス') ||
         name.includes('日経') ||
         name.includes('topix') ||
         name.includes('トピックス') ||
         name.includes('s&p') ||
         name.includes('sp500') ||
         name.includes('msci') ||
         name.includes('ftse') ||
         name.includes('russell') ||
         name.includes('ベンチマーク') ||
         name.includes('パッシブ') ||
         INDEX_FUND_PREFIXES.some(prefix => name.includes(prefix.toLowerCase()));
};

// グローバル分散かどうかを判定
const isGlobal = (name) => {
  return name.includes('global') ||
         name.includes('グローバル') ||
         name.includes('international') ||
         name.includes('world') ||
         name.includes('世界') ||
         name.includes('全世界') ||
         name.includes('海外');
};

// REITかどうかを判定
const isREIT = (name) => {
  return name.includes('reit') ||
         name.includes('リート') ||
         name.includes('不動産投資') ||
         name.includes('real estate') ||
         name.includes('不動産投資法人');
};

// 債券ファンドかどうかを判定
const isBond = (name, ticker) => {
  return name.includes('bond') ||
         name.includes('債券') ||
         name.includes('aggregate') ||
         name.includes('国債') ||
         name.includes('社債') ||
         name.includes('fixed income') ||
         ticker === 'BND' ||
         ticker === 'AGG' ||
         ticker === 'BNDX' ||
         ticker === 'LQD' ||
         ticker === 'HYG' ||
         ticker === 'JNK' ||
         ticker === 'TLT' ||
         ticker === 'SHY' ||
         ticker === 'MUB';
};

// 暗号資産関連かどうかを判定
const isCrypto = (name, ticker) => {
  return name.includes('bitcoin') ||
         name.includes('ethereum') ||
         name.includes('crypto') ||
         name.includes('暗号資産') ||
         name.includes('ビットコイン') ||
         name.includes('イーサリアム') ||
         ticker === 'GBTC' ||
         ticker === 'ETHE' ||
         ticker === 'IBIT';
};

// アクティブファンドかどうかを判定
const isActive = (name) => {
  return name.includes('active') ||
         name.includes('アクティブ') ||
         name.includes('厳選') ||
         name.includes('セレクト') ||
         name.includes('選定') ||
         name.includes('運用') ||
         name.includes('マネージド');
};

// インデックスファンドかアクティブファンドかを判定
const isActiveOrIndex = (name, isJapanese) => {
  if (isActive(name)) {
    if (isGlobal(name)) {
      return FUND_TYPES.ACTIVE_GLOBAL;
    } else {
      return isJapanese ? FUND_TYPES.ACTIVE_JP : FUND_TYPES.ACTIVE_US;
    }
  } else {
    if (isGlobal(name)) {
      return FUND_TYPES.INDEX_GLOBAL;
    } else {
      return isJapanese ? FUND_TYPES.INDEX_JP : FUND_TYPES.INDEX_US;
    }
  }
};

// ティッカーシンボルからファンドの年間手数料を推定する
export const estimateAnnualFee = (ticker, name = '') => {
  if (!ticker) return {
    fee: FUND_TYPE_FEES[FUND_TYPES.UNKNOWN],
    fundType: FUND_TYPES.UNKNOWN,
    source: 'ファンドタイプからの推定',
    isEstimated: true
  };
  
  ticker = ticker.toUpperCase();
  
  // 特定のティッカーに対するオーバーライド値があれば使用
  if (TICKER_SPECIFIC_FEES[ticker]) {
    // ファンドタイプも取得して一緒に返す
    const fundType = guessFundType(ticker, name);
    return {
      fee: TICKER_SPECIFIC_FEES[ticker],
      fundType: fundType,
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
export const extractFundInfo = (ticker, name = '') => {
  const info = {};
  ticker = ticker.toUpperCase();
  name = (name || '').toLowerCase();
  
  // 通貨の判定
  info.currency = ticker.includes('.T') || /^\d{4,}$/.test(ticker) ? 'JPY' : 'USD';
  
  // 地域の判定
  if (
    name.includes('japan') ||
    name.includes('日本') ||
    name.includes('topix') ||
    name.includes('トピックス') ||
    name.includes('日経') ||
    ticker.includes('.T') ||
    /^\d{4,}$/.test(ticker)
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
    name.includes('世界') ||
    name.includes('international') ||
    name.includes('全世界')
  ) {
    info.region = 'グローバル';
  } else {
    info.region = '不明';
  }

  if (info.region === '不明' && US_ETF_LIST.includes(ticker)) {
    info.region = '米国';
  }
  
  // 配当情報の推測
  if (
    name.includes('dividend') ||
    name.includes('配当') ||
    name.includes('income') ||
    name.includes('yield') ||
    name.includes('high yield') ||
    name.includes('ハイイールド') ||
    name.includes('分配金')
  ) {
    info.hasDividend = true;
    
    // 配当頻度の推測
    if (name.includes('monthly') || name.includes('毎月')) {
      info.dividendFrequency = 'monthly';
    } else if (name.includes('quarterly') || name.includes('四半期')) {
      info.dividendFrequency = 'quarterly';
    } else if (name.includes('semi-annual') || name.includes('半年')) {
      info.dividendFrequency = 'semi-annual';
    } else if (name.includes('annual') || name.includes('年1回')) {
      info.dividendFrequency = 'annual';
    } else {
      // デフォルトの配当頻度（不明の場合）
      info.dividendFrequency = 'quarterly';
    }
  } else {
    // 配当情報がない場合でも、ファンドタイプに基づいてデフォルト値を設定
    const fundType = guessFundType(ticker, name);
    
    if (fundType === FUND_TYPES.STOCK) {
      // 個別株は配当があるかどうか不明なのでfalseにしておく
      info.hasDividend = false;
    } else if (fundType === FUND_TYPES.BOND || 
               fundType === FUND_TYPES.ETF_JP || 
               fundType === FUND_TYPES.ETF_US || 
               fundType === FUND_TYPES.REIT_JP || 
               fundType === FUND_TYPES.REIT_US) {
      // 債券、ETF、REITは基本的に配当あり
      info.hasDividend = true;
      info.dividendFrequency = 'quarterly'; // デフォルトは四半期
    } else {
      // その他のタイプはケースバイケース
      info.hasDividend = false;
    }
  }
  
  // 銘柄タイプを取得
  info.fundType = guessFundType(ticker, name);
  info.isStock = info.fundType === FUND_TYPES.STOCK;
  
  return info;
}

// 推定配当利回りを計算する
export const estimateDividendYield = (ticker, name = '') => {
  if (!ticker) return {
    yield: 0,
    isEstimated: true,
    hasDividend: false,
    dividendFrequency: 'unknown'
  };
  
  ticker = ticker.toUpperCase();
  const info = extractFundInfo(ticker, name);
  
  // 基本的な推定値
  let estimatedYield = 0;
  let isEstimated = true;
  let hasDividend = info.hasDividend || false;
  
  // 特定のティッカーに対する配当利回り情報があれば使用
  if (TICKER_SPECIFIC_DIVIDENDS[ticker] !== undefined) {
    estimatedYield = TICKER_SPECIFIC_DIVIDENDS[ticker];
    isEstimated = false;
    hasDividend = estimatedYield > 0;
  } else {
    // ファンドタイプに基づく推定
    const fundType = info.fundType;
    
    if (fundType === FUND_TYPES.STOCK) {
      // 個別株の場合は配当情報を持たないと仮定（推定困難のため、後でデータを更新）
      estimatedYield = 0;
      hasDividend = false;
    } else if (fundType === FUND_TYPES.REIT_US) {
      estimatedYield = 4.0; // 米国REITの平均
      hasDividend = true;
    } else if (fundType === FUND_TYPES.REIT_JP) {
      estimatedYield = 3.5; // 日本REITの平均
      hasDividend = true;
    } else if (fundType === FUND_TYPES.BOND) {
      estimatedYield = 2.5; // 債券ファンドの平均
      hasDividend = true;
    } else if (
      name.includes('dividend') || 
      name.includes('配当') || 
      name.includes('income') || 
      name.includes('yield') ||
      name.includes('高配当')
    ) {
      // 名前から高配当と推測される場合
      estimatedYield = 3.0;
      hasDividend = true;
    } else if (fundType === FUND_TYPES.ETF_US) {
      estimatedYield = 1.5; // 米国ETFの平均
      hasDividend = true;
    } else if (fundType === FUND_TYPES.ETF_JP) {
      estimatedYield = 1.8; // 日本ETFの平均
      hasDividend = true;
    } else if (fundType === FUND_TYPES.INDEX_US) {
      estimatedYield = 1.5; // 米国インデックスファンドの平均
      hasDividend = true;
    } else if (fundType === FUND_TYPES.INDEX_JP) {
      estimatedYield = 1.2; // 日本インデックスファンドの平均
      hasDividend = true;
    } else {
      estimatedYield = 1.0; // その他のファンドのデフォルト値
      hasDividend = estimatedYield > 0;
    }
  }
  
  // 金ETFは特に配当がない
  if (ticker === 'GLD' || name.includes('gold') || name.includes('ゴールド') || name.includes('金')) {
    hasDividend = false;
    estimatedYield = 0;
  }
  
  return {
    yield: estimatedYield,
    isEstimated: isEstimated,
    hasDividend: hasDividend,
    dividendFrequency: info.dividendFrequency || 'quarterly' // デフォルトは四半期
  };
}
