// src/services/marketDataService.js
// 市場データ取得サービス（スクレイピングベース版）

import axios from 'axios';
import { 
  guessFundType, 
  estimateAnnualFee, 
  extractFundInfo, 
  estimateDividendYield,
  TICKER_SPECIFIC_FEES,
  TICKER_SPECIFIC_DIVIDENDS,
  FUND_TYPES,
  US_ETF_LIST as BASE_US_ETF_LIST,
  DATA_SOURCES
} from '../utils/fundUtils';

// 債券ETFリストを明示的に定義（独立変数として保持）
const BOND_ETFS = ['LQD', 'BND', 'AGG', 'TLT', 'IEF', 'GOVT', 'HYG', 'JNK', 'MUB', 'VCIT', 'VCSH'];

// US ETFリストを拡張（債券ETFを追加）
const US_ETF_LIST = [
  ...BASE_US_ETF_LIST,  // 既存のETFリスト
  ...BOND_ETFS  // 債券ETFを追加
];

// データソース定数を更新（スクレイピングソースを追加）
export const SCRAPING_DATA_SOURCES = {
  ...DATA_SOURCES,
  YAHOO_JAPAN: 'Yahoo Finance Japan',
  MINKABU: 'Minkabu',
  KABUTAN: 'Kabutan',
  TOUSHIN_LIB: '投資信託協会',
  MORNINGSTAR: 'Morningstar Japan'
};

// 環境に応じたベースURL設定
const isLocalhost = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// 本番環境のURLは環境変数から取得、未設定の場合は現在のオリジンを使用
const PROD_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
                      (!isLocalhost ? window.location.origin : 'https://delicate-malasada-1fb747.netlify.app');

// API エンドポイントの設定
const BASE_URL = isLocalhost ? '' : PROD_BASE_URL;

// Alpaca APIエンドポイント（米国株のプライマリソース）
const ALPACA_API_URL = isLocalhost
  ? '/api/alpaca-api-proxy' // ローカル環境では直接プロキシ経由
  : `${BASE_URL}/api/alpaca-api-proxy`; // 本番環境

// スクレイピングベースの日本株データ取得プロキシ
const JP_STOCK_SCRAPING_URL = isLocalhost
  ? '/api/jp-stock-scraping-proxy' // ローカル環境では直接プロキシ経由
  : `${BASE_URL}/api/jp-stock-scraping-proxy`; // 本番環境

// スクレイピングベースの投資信託データ取得プロキシ
const MUTUAL_FUND_SCRAPING_URL = isLocalhost
  ? '/api/mutual-fund-scraping-proxy' // ローカル環境では直接プロキシ経由
  : `${BASE_URL}/api/mutual-fund-scraping-proxy`; // 本番環境

// Yahoo Finance APIエンドポイント（米国株のバックアップソース）
const YAHOO_FINANCE_URL = isLocalhost
  ? '/api/yahoo-finance-proxy' // ローカル環境では直接プロキシ経由
  : `${BASE_URL}/api/yahoo-finance-proxy`; // 本番環境

// 為替レート取得APIエンドポイント（代替APIに変更）
const EXCHANGERATE_API_URL = isLocalhost
  ? '/api/alternative-exchangerate-proxy' // 代替APIを使用
  : `${BASE_URL}/api/alternative-exchangerate-proxy`; // 本番環境

// API有効フラグ
const ENABLE_YAHOO_FINANCE_API = true;
const ENABLE_ALPACA_API = true;
const ENABLE_JP_STOCK_SCRAPING = true;
const ENABLE_MUTUAL_FUND_SCRAPING = true;

// タイムアウト設定
const ALPACA_API_TIMEOUT = 10000; // 10秒
const YAHOO_FINANCE_API_TIMEOUT = 15000; // 15秒
const JP_STOCK_SCRAPING_TIMEOUT = 20000; // 20秒 (スクレイピングは時間がかかる場合がある)
const MUTUAL_FUND_SCRAPING_TIMEOUT = 20000; // 20秒
const EXCHANGERATE_API_TIMEOUT = 10000; // 10秒

// 設定情報をログ出力（開発時の確認用）
console.log(`API Configuration:
- Environment: ${isLocalhost ? 'Local development' : 'Production'}
- Base URL: ${BASE_URL || '(using proxy)'}
- Alpaca API (米国株向け): ${ALPACA_API_URL}
- JP Stock Scraping (日本株向け): ${JP_STOCK_SCRAPING_URL}
- Mutual Fund Scraping (投資信託向け): ${MUTUAL_FUND_SCRAPING_URL}
- Yahoo Finance API (バックアップソース): ${YAHOO_FINANCE_URL}
- Exchange Rate API: ${EXCHANGERATE_API_URL} (Alternative version)
- Alpaca API Enabled: ${ENABLE_ALPACA_API}
- JP Stock Scraping Enabled: ${ENABLE_JP_STOCK_SCRAPING}
- Mutual Fund Scraping Enabled: ${ENABLE_MUTUAL_FUND_SCRAPING}
- Yahoo Finance API Enabled: ${ENABLE_YAHOO_FINANCE_API}
- Bond ETFs registered: ${BOND_ETFS.join(', ')}
`);

// 為替レートのデフォルト値（最終手段）
const DEFAULT_EXCHANGE_RATES = {
  'USD/JPY': 150.0,
  'JPY/USD': 1/150.0,
  'EUR/JPY': 160.0,
  'EUR/USD': 1.1,
};

/**
 * 投資信託かどうかを判定する関数（改善版）
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} 投資信託の場合はtrue
 */
function isMutualFund(ticker) {
  if (!ticker) return false;
  ticker = ticker.toString().toUpperCase();
  
  // パターン1: 7-8桁の数字 + C (+ .T)
  if (/^\d{7,8}C(\.T)?$/.test(ticker)) {
    return true;
  }
  
  // パターン2: 7-8桁の数字 (投資信託コードのCなし)
  if (/^\d{7,8}$/.test(ticker)) {
    return true;
  }
  
  return false;
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

/**
 * 債券ETFかどうかを明示的に判定する関数（強化版）
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} - 債券ETFの場合はtrue
 */
function isBondETF(ticker) {
  if (!ticker) return false;
  
  // 大文字に変換して確認
  ticker = ticker.toString().toUpperCase();
  
  // 登録済みの債券ETFリストと照合
  if (BOND_ETFS.includes(ticker)) {
    console.log(`[isBondETF] ${ticker} is identified as a bond ETF in our registry`);
    return true;
  }
  
  return false;
}

/**
 * 投資信託や銘柄の通貨を判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @param {string} name - 銘柄名
 * @returns {string} 通貨コード ('JPY' or 'USD')
 */
function determineCurrency(ticker, name = '') {
  // 日本株または投資信託の場合はJPY
  if (isJapaneseStock(ticker) || isMutualFund(ticker)) {
    // 明らかに米国投資を示す名前の場合でも、日本の投資信託の価格表示は円建てなのでJPY
    return 'JPY';
  }
  // それ以外はUSD
  return 'USD';
}

/**
 * REITかどうかを判定する
 * @param {string} name - 銘柄名
 * @returns {boolean} - REITならtrue
 */
function isREIT(name) {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return lowerName.includes('reit') || 
         lowerName.includes('リート') || 
         lowerName.includes('不動産投資') ||
         lowerName.includes('不動産信託');
}

/**
 * 暗号資産関連銘柄かどうかを判定する
 * @param {string} name - 銘柄名
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} - 暗号資産関連ならtrue
 */
function isCrypto(name, ticker) {
  if (!name && !ticker) return false;
  
  // 特定の暗号資産関連ティッカー
  const cryptoTickers = ['IBIT', 'GBTC', 'ETHE', 'BITO', 'COIN', 'MSTR'];
  
  if (ticker && cryptoTickers.includes(ticker.toUpperCase())) {
    return true;
  }
  
  if (!name) return false;
  
  const lowerName = name.toLowerCase();
  return lowerName.includes('bitcoin') || 
         lowerName.includes('ビットコイン') || 
         lowerName.includes('暗号資産') || 
         lowerName.includes('仮想通貨') ||
         lowerName.includes('crypto') ||
         lowerName.includes('ethereum') ||
         lowerName.includes('イーサリアム');
}

/**
 * 債券関連銘柄かどうかを判定する
 * @param {string} name - 銘柄名
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} - 債券関連ならtrue
 */
function isBond(name, ticker) {
  if (!name && !ticker) return false;
  
  // 債券ETFの場合は即時true
  if (isBondETF(ticker)) {
    return true;
  }
  
  if (!name) return false;
  
  const lowerName = name.toLowerCase();
  return lowerName.includes('bond') || 
         lowerName.includes('債券') || 
         lowerName.includes('ボンド') ||
         lowerName.includes('国債') ||
         lowerName.includes('社債') ||
         lowerName.includes('fixed income') ||
         lowerName.includes('treasury') || 
         lowerName.includes('corporate debt') ||
         lowerName.includes('aggregate bond');
}

/**
 * ティッカーシンボルをAlpaca API用にフォーマットする
 * @param {string} ticker - 元のティッカーシンボル
 * @returns {string|null} - フォーマットされたティッカーシンボル、またはnull
 */
function formatTickerForAlpaca(ticker) {
  if (!ticker) return null;
  
  // 大文字に変換
  ticker = ticker.toUpperCase();
  
  // 日本株や投資信託の場合はAlpaca APIでは取得できない
  if (isJapaneseStock(ticker) || isMutualFund(ticker)) {
    return null;
  }
  
  // 米国株式市場のシンボルはそのまま返す
  return ticker;
}

/**
 * ティッカーシンボルをYahoo Finance用にフォーマットする（改善版）
 * @param {string} ticker - 元のティッカーシンボル
 * @returns {string} - フォーマットされたティッカーシンボル
 */
function formatTickerForYahoo(ticker) {
  if (!ticker) return '';
  
  // 大文字に変換
  ticker = ticker.toUpperCase();
  
  // 投資信託コードの場合
  if (isMutualFund(ticker)) {
    // 既にC.Tが付いているか確認
    if (ticker.endsWith('.T')) {
      // CがついているかCを追加
      if (ticker.indexOf('C') === -1) {
        // .Tの前にCを挿入
        return ticker.replace(/\.T$/, 'C.T');
      }
      return ticker;
    }
    
    // Cがついているか確認
    if (ticker.indexOf('C') === -1) {
      return `${ticker}C.T`;
    }
    
    // Cはあるが.Tがない
    return `${ticker}.T`;
  }
  
  // 4桁数字で.Tが付いていない日本株の場合は.Tを追加
  if (/^\d{4}$/.test(ticker) && !ticker.includes('.T')) {
    return `${ticker}.T`;
  }
  
  return ticker;
}

/**
 * 証券コードを日本株スクレイピングプロキシ用にフォーマットする
 * @param {string} ticker - 元のティッカーシンボル
 * @returns {string} - フォーマットされた証券コード
 */
function formatCodeForJPStockScraping(ticker) {
  if (!ticker) return '';
  
  // 大文字に変換
  ticker = ticker.toUpperCase();
  
  // .Tを取り除く
  return ticker.replace(/\.T$/, '');
}

/**
 * ファンドコードを投資信託スクレイピングプロキシ用にフォーマットする（改善版）
 * @param {string} ticker - 元のティッカーシンボル
 * @returns {string} - フォーマットされたファンドコード
 */
function formatCodeForMutualFundScraping(ticker) {
  if (!ticker) return '';
  
  // 大文字に変換
  ticker = ticker.toUpperCase();
  
  // .Tを取り除く
  ticker = ticker.replace(/\.T$/, '');
  
  // Cがあってもなくても良いように正規化
  // （スクレイピングプロキシ側でCの付け外しを適切に処理する）
  return ticker.replace(/C$/, '');
}

/**
 * 銘柄のファンドタイプを確実に判定する
 * @param {string} ticker - ティッカーシンボル
 * @param {string} name - 銘柄名 
 * @returns {string} - 確定したファンドタイプ
 */
function determineFundType(ticker, name) {
  if (!ticker) return FUND_TYPES.UNKNOWN;
  
  // 大文字に統一
  ticker = ticker.toUpperCase();
  
  // 債券ETFの場合
  if (isBondETF(ticker)) {
    return FUND_TYPES.BOND;
  }
  
  // 米国ETFリストに明示的に含まれているか確認
  if (US_ETF_LIST.includes(ticker)) {
    if (ticker === 'IBIT' || ticker === 'GBTC' || ticker === 'ETHE') {
      return FUND_TYPES.CRYPTO;
    }
    return FUND_TYPES.ETF_US;
  }
  
  // 投資信託の場合
  if (isMutualFund(ticker)) {
    return FUND_TYPES.MUTUAL_FUND;
  }
  
  // ティッカーが特定の構造に一致する場合
  if (isJapaneseStock(ticker)) {
    // 日本の個別株かETF
    if (TICKER_SPECIFIC_FEES[ticker]) {
      return FUND_TYPES.ETF_JP;
    }
    return FUND_TYPES.STOCK;
  }
  
  // REIT判定
  if (isREIT(name)) {
    return isJapaneseStock(ticker) ? FUND_TYPES.REIT_JP : FUND_TYPES.REIT_US;
  }
  
  // 暗号資産判定
  if (isCrypto(name, ticker)) {
    return FUND_TYPES.CRYPTO;
  }
  
  // 債券判定
  if (isBond(name, ticker)) {
    return FUND_TYPES.BOND;
  }
  
  // そうでなければ通常の判定ロジックを使用
  return guessFundType(ticker, name);
}

/**
 * 配当情報を確定する
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} - 配当があるならtrue
 */
function determineHasDividend(ticker) {
  if (!ticker) return false;
  
  // 大文字に統一
  ticker = ticker.toUpperCase();
  
  // 特定の配当リストに情報があればそれを使用
  if (TICKER_SPECIFIC_DIVIDENDS[ticker] !== undefined) {
    return TICKER_SPECIFIC_DIVIDENDS[ticker] > 0;
  }
  
  // 知られている無配当ETF
  const noDividendETFs = ['GLD', 'IBIT', 'GBTC', 'ETHE'];
  if (noDividendETFs.includes(ticker)) {
    return false;
  }
  
  // 投資信託は基本的に配当あり
  if (isMutualFund(ticker)) {
    return true;
  }
  
  // 債券ETFは配当あり
  if (isBondETF(ticker)) {
    return true;
  }
  
  // ファンドタイプに基づく判断
  const fundType = determineFundType(ticker, ticker);
  
  if (fundType === FUND_TYPES.STOCK) {
    // 個別株は配当の有無不明のためfalse
    return false;
  } else if (
    fundType === FUND_TYPES.ETF_JP || 
    fundType === FUND_TYPES.ETF_US || 
    fundType === FUND_TYPES.INDEX_JP || 
    fundType === FUND_TYPES.INDEX_US || 
    fundType === FUND_TYPES.INDEX_GLOBAL ||
    fundType === FUND_TYPES.REIT_JP || 
    fundType === FUND_TYPES.REIT_US || 
    fundType === FUND_TYPES.BOND
  ) {
    // ETF、インデックスファンド、REIT、債券ファンドは通常配当あり
    return true;
  }
  
  // デフォルトはfalse
  return false;
}

/**
 * Alpaca APIからデータを取得する（改善版）
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - Alpaca APIからのデータまたはnull
 */
async function fetchFromAlpaca(ticker) {
  // Alpaca APIが無効化されている場合は直接nullを返す
  if (!ENABLE_ALPACA_API) {
    console.log(`Alpaca API is disabled. Skipping fetch for ${ticker}`);
    return null;
  }
  
  // 日本株や投資信託は処理しない
  if (isJapaneseStock(ticker) || isMutualFund(ticker)) {
    console.log(`${ticker} is not supported by Alpaca API (Japanese stock or mutual fund)`);
    return null;
  }
  
  try {
    // Alpaca API用にティッカーをフォーマット
    const formattedTicker = formatTickerForAlpaca(ticker);
    if (!formattedTicker) {
      console.log(`${ticker} cannot be formatted for Alpaca API`);
      return null;
    }
    
    console.log(`Attempting to fetch data for ${formattedTicker} from Alpaca API at: ${ALPACA_API_URL}`);
    
    // Alpaca APIプロキシにリクエスト - リトライメカニズム改善版
    let retries = 3; // 最大4回試行（初回 + 3回リトライ）
    let response = null;
    let error = null;
    
    while (retries >= 0) {
      try {
        response = await axios.get(ALPACA_API_URL, {
          params: { 
            symbol: formattedTicker 
          },
          timeout: ALPACA_API_TIMEOUT + (3 - retries) * 2000, // リトライごとにタイムアウトを延長
          validateStatus: function (status) {
            // 全てのステータスコードを許可して、エラー時にPromiseをリジェクトしないようにする
            return true;
          }
        });
        
        // 成功した場合はループを抜ける
        if (response.status === 200 && response.data && response.data.success) {
          break;
        }
        
        // 429エラー（レート制限）の場合は少し長く待ってからリトライ
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        retries--;
        if (retries >= 0) {
          console.log(`Retrying Alpaca API for ${formattedTicker}, attempts left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (e) {
        error = e;
        retries--;
        if (retries >= 0) {
          console.log(`Error fetching from Alpaca API, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
    
    // 最終的なレスポンスをチェック
    if (!response || response.status !== 200) {
      console.log(`Alpaca API failed after all attempts for ${formattedTicker}`);
      return null;
    }
    
    // レスポンスデータをログ（デバッグ用）
    console.log(`Alpaca API response for ${formattedTicker}:`, response.data);
    
    // データの存在を確認
    if (response.data && response.data.success) {
      const quoteData = response.data.data;
      
      // 銘柄データが存在するかチェック
      if (quoteData && quoteData.price) {
        console.log(`Successfully fetched data for ${formattedTicker} from Alpaca API: $${quoteData.price}`);
        
        // 銘柄名を取得または生成
        const name = quoteData.name || ticker;
        
        // ファンドタイプを判定
        const fundType = determineFundType(ticker, name);
        console.log(`Determined fund type for ${ticker} from Alpaca API: ${fundType}`);
        
        // 個別株かどうかを判定
        const isStock = fundType === FUND_TYPES.STOCK;
        
        // 債券ETFかどうかを判定
        const bondETF = isBondETF(ticker);
        
        // 手数料情報を取得
        const feeInfo = estimateAnnualFee(ticker, name);
        
        // 基本情報を取得
        const fundInfo = extractFundInfo(ticker, name);
        
        // 配当情報の取得
        const dividendInfo = estimateDividendYield(ticker, name);
        
        // 配当情報を確定
        const hasDividend = determineHasDividend(ticker);
        
        // 通貨判定
        const currency = quoteData.currency || fundInfo.currency || 'USD';
        
        // 手数料情報（個別株は常に0%）
        const annualFee = isStock ? 0 : (bondETF ? 0.15 : feeInfo.fee);
        
        return {
          success: true,
          data: {
            id: ticker,
            name: name,
            ticker: ticker,
            exchangeMarket: 'US',
            price: quoteData.price,
            currency: currency,
            holdings: 0,
            annualFee: annualFee,
            fundType: fundType,
            isStock: isStock,
            isMutualFund: false,
            isBondETF: bondETF,  // 債券ETFフラグを追加
            feeSource: isStock ? '個別株' : (bondETF ? '債券ETF' : feeInfo.source),
            feeIsEstimated: isStock ? false : feeInfo.isEstimated,
            region: fundInfo.region || 'unknown',
            lastUpdated: new Date().toISOString(),
            source: DATA_SOURCES.ALPACA,
            // 配当情報
            dividendYield: bondETF ? 3.0 : dividendInfo.yield,  // 債券ETFは3%とする
            hasDividend: hasDividend,
            dividendFrequency: bondETF ? 'monthly' : dividendInfo.dividendFrequency,
            dividendIsEstimated: dividendInfo.isEstimated
          },
          message: 'Alpacaから正常に取得しました'
        };
      }
    }
    
    console.log(`No valid data found for ${formattedTicker} from Alpaca API`);
    return null;
  } catch (error) {
    console.error(`Alpaca API error for ${ticker}:`, error.message);
    
    if (error.response) {
      console.error(`Alpaca API response error status: ${error.response.status}`);
      console.error(`Alpaca API response data:`, error.response.data);
    }
    
    return null;
  }
}

/**
 * 日本株スクレイピングプロキシからデータを取得する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - 日本株データまたはnull
 */
async function fetchFromJPStockScraping(ticker) {
  // 日本株スクレイピングが無効化されている場合は直接nullを返す
  if (!ENABLE_JP_STOCK_SCRAPING) {
    console.log(`JP Stock Scraping is disabled. Skipping fetch for ${ticker}`);
    return null;
  }
  
  // 日本株でない場合は処理しない
  if (!isJapaneseStock(ticker)) {
    console.log(`${ticker} is not a Japanese stock. Skipping JP Stock Scraping.`);
    return null;
  }
  
  try {
    // 日本株スクレイピング用に証券コードをフォーマット
    const stockCode = formatCodeForJPStockScraping(ticker);
    console.log(`Formatted code for JP Stock Scraping: ${stockCode}`);
    
    console.log(`Attempting to fetch data for ${stockCode} from JP Stock Scraping at: ${JP_STOCK_SCRAPING_URL}`);
    
    // スクレイピングプロキシにリクエスト - リトライメカニズム追加
    let retries = 2; // 最大3回試行（初回 + 2回リトライ）
    let response = null;
    let error = null;
    
    while (retries >= 0) {
      try {
        response = await axios.get(JP_STOCK_SCRAPING_URL, {
          params: { 
            code: stockCode 
          },
          timeout: JP_STOCK_SCRAPING_TIMEOUT + (2 - retries) * 3000, // リトライごとにタイムアウトを延長
          validateStatus: function (status) {
            // 全てのステータスコードを許可して、エラー時にPromiseをリジェクトしないようにする
            return true;
          }
        });
        
        // 成功した場合はループを抜ける
        if (response.status === 200 && response.data && response.data.success) {
          break;
        }
        
        retries--;
        if (retries >= 0) {
          console.log(`Retrying JP Stock Scraping for ${stockCode}, attempts left: ${retries}`);
          // 次の試行前に短い遅延を入れる（スクレイピングは時間がかかることがあるため）
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e) {
        error = e;
        retries--;
        if (retries >= 0) {
          console.log(`Error fetching from JP Stock Scraping, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // レスポンスデータをログ（デバッグ用）
    console.log(`JP Stock Scraping response for ${stockCode}:`, response?.data);
    
    // データの存在を確認
    if (response?.data?.success && response.data.data) {
      const stockData = response.data.data;
      
      // 価格の存在確認
      if (stockData && stockData.price) {
        const price = stockData.price;
        
        console.log(`Successfully fetched data for ${stockCode} from JP Stock Scraping: ${price}`);
        
        // 銘柄名を取得
        const name = stockData.name || ticker;
        
        // ファンドタイプを判定（ETFかどうかなど）
        const fundType = determineFundType(ticker, name);
        
        console.log(`Determined fund type for ${ticker} from JP Stock Scraping: ${fundType}`);
        
        // 個別株かどうかを判定
        const isStock = fundType === FUND_TYPES.STOCK;
        
        // 手数料情報を取得
        const feeInfo = estimateAnnualFee(ticker, name);
        
        // 基本情報を取得
        const fundInfo = extractFundInfo(ticker, name);
        
        // 配当情報の取得
        const dividendInfo = estimateDividendYield(ticker, name);
        
        // 配当情報を確定
        const hasDividend = determineHasDividend(ticker);
        
        // 通貨判定
        const currency = stockData.currency || 'JPY';
        
        // 手数料情報（個別株は常に0%）
        const annualFee = isStock ? 0 : feeInfo.fee;
        
        // データソース表示用（スクレイピング元のサイト名）
        const dataSource = stockData.source || SCRAPING_DATA_SOURCES.MINKABU;
        
        return {
          success: true,
          data: {
            id: ticker,
            name: name,
            ticker: ticker,
            exchangeMarket: 'Japan',
            price: price,
            currency: currency,
            holdings: 0,
            annualFee: annualFee,
            fundType: fundType,
            isStock: isStock,
            isMutualFund: false,
            feeSource: isStock ? '個別株' : feeInfo.source,
            feeIsEstimated: isStock ? false : feeInfo.isEstimated,
            region: fundInfo.region || 'Japan',
            lastUpdated: stockData.lastUpdated || new Date().toISOString(),
            source: dataSource,
            // 配当情報
            dividendYield: dividendInfo.yield,
            hasDividend: hasDividend,
            dividendFrequency: dividendInfo.dividendFrequency,
            dividendIsEstimated: dividendInfo.isEstimated,
            // 株価表示ラベル
            priceLabel: '株価'
          },
          message: `${dataSource}から正常に取得しました`
        };
      }
    }
    
    console.log(`No valid data found for ${stockCode} from JP Stock Scraping`);
    return null;
  } catch (error) {
    console.error(`JP Stock Scraping error for ${ticker}:`, error.message);
    
    if (error.response) {
      console.error(`JP Stock Scraping response error status: ${error.response.status}`);
      console.error(`JP Stock Scraping response data:`, error.response.data);
    }
    
    return null;
  }
}

/**
 * 投資信託スクレイピングプロキシからデータを取得する
 * @param {string} ticker - ティッカーシンボル（投資信託コード）
 * @returns {Promise<Object>} - 投資信託データまたはnull
 */
async function fetchFromMutualFundScraping(ticker) {
  // 投資信託スクレイピングが無効化されている場合は直接nullを返す
  if (!ENABLE_MUTUAL_FUND_SCRAPING) {
    console.log(`Mutual Fund Scraping is disabled. Skipping fetch for ${ticker}`);
    return null;
  }
  
  // 投資信託でない場合は処理しない
  if (!isMutualFund(ticker)) {
    console.log(`${ticker} is not a mutual fund. Skipping Mutual Fund Scraping.`);
    return null;
  }
  
  try {
    // 投資信託スクレイピング用にファンドコードをフォーマット
    const fundCode = formatCodeForMutualFundScraping(ticker);
    console.log(`Formatted code for Mutual Fund Scraping: ${fundCode}`);
    
    console.log(`Attempting to fetch data for ${fundCode} from Mutual Fund Scraping at: ${MUTUAL_FUND_SCRAPING_URL}`);
    
    // スクレイピングプロキシにリクエスト - リトライメカニズム追加
    let retries = 2; // 最大3回試行（初回 + 2回リトライ）
    let response = null;
    let error = null;
    
    while (retries >= 0) {
      try {
        response = await axios.get(MUTUAL_FUND_SCRAPING_URL, {
          params: { 
            code: fundCode 
          },
          timeout: MUTUAL_FUND_SCRAPING_TIMEOUT + (2 - retries) * 3000, // リトライごとにタイムアウトを延長
          validateStatus: function (status) {
            // 全てのステータスコードを許可して、エラー時にPromiseをリジェクトしないようにする
            return true;
          }
        });
        
        // 成功した場合はループを抜ける
        if (response.status === 200 && response.data && response.data.success) {
          break;
        }
        
        retries--;
        if (retries >= 0) {
          console.log(`Retrying Mutual Fund Scraping for ${fundCode}, attempts left: ${retries}`);
          // 次の試行前に短い遅延を入れる（スクレイピングは時間がかかることがあるため）
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e) {
        error = e;
        retries--;
        if (retries >= 0) {
          console.log(`Error fetching from Mutual Fund Scraping, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // レスポンスデータをログ（デバッグ用）
    console.log(`Mutual Fund Scraping response for ${fundCode}:`, response?.data);
    
    // データの存在を確認
    if (response?.data?.success && response.data.data) {
      const fundData = response.data.data;
      
      // 価格の存在確認
      if (fundData && fundData.price) {
        const price = fundData.price;
        
        console.log(`Successfully fetched data for ${fundCode} from Mutual Fund Scraping: ${price}`);
        
        // ファンド名を取得
        const name = fundData.name || `投資信託 ${ticker}`;
        
        // 手数料情報を取得
        const feeInfo = estimateAnnualFee(ticker, name);
        
        // 基本情報を取得
        const fundInfo = extractFundInfo(ticker, name);
        
        // 配当情報の取得
        const dividendInfo = estimateDividendYield(ticker, name);
        
        // 配当情報を確定
        const hasDividend = determineHasDividend(ticker);
        
        // 通貨判定
        const currency = fundData.currency || 'JPY';
        
        // データソース表示用（スクレイピング元のサイト名）
        const dataSource = fundData.source || SCRAPING_DATA_SOURCES.TOUSHIN_LIB;
        
        return {
          success: true,
          data: {
            id: ticker,
            name: name,
            ticker: ticker,
            exchangeMarket: 'Japan',
            price: price,
            currency: currency,
            holdings: 0,
            annualFee: feeInfo.fee,
            fundType: FUND_TYPES.MUTUAL_FUND,
            isStock: false,
            isMutualFund: true,
            feeSource: '投資信託',
            feeIsEstimated: feeInfo.isEstimated,
            region: fundInfo.region || 'Japan',
            lastUpdated: fundData.lastUpdated || new Date().toISOString(),
            source: dataSource,
            // 配当情報
            dividendYield: dividendInfo.yield,
            hasDividend: hasDividend,
            dividendFrequency: dividendInfo.dividendFrequency,
            dividendIsEstimated: dividendInfo.isEstimated,
            // 基準価額ラベル
            priceLabel: '基準価額'
          },
          message: `${dataSource}から正常に取得しました`
        };
      }
    }
    
    console.log(`No valid data found for ${fundCode} from Mutual Fund Scraping`);
    return null;
  } catch (error) {
    console.error(`Mutual Fund Scraping error for ${ticker}:`, error.message);
    
    if (error.response) {
      console.error(`Mutual Fund Scraping response error status: ${error.response.status}`);
      console.error(`Mutual Fund Scraping response data:`, error.response.data);
    }
    
    return null;
  }
}

/**
 * Yahoo Finance APIからデータを取得する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - Yahoo Financeからのデータまたはnull
 */
async function fetchFromYahoo(ticker) {
  // Yahoo Finance APIが無効化されている場合は直接nullを返す
  if (!ENABLE_YAHOO_FINANCE_API) {
    console.log(`Yahoo Finance API is disabled. Skipping fetch for ${ticker}`);
    return null;
  }
  
  try {
    // Yahoo Finance用にティッカーをフォーマット
    const formattedTicker = formatTickerForYahoo(ticker);
    console.log(`Formatted ticker for Yahoo Finance: ${formattedTicker}`);
    console.log(`Attempting to fetch data for ${formattedTicker} from Yahoo Finance at: ${YAHOO_FINANCE_URL}`);
    
    // Yahoo Financeプロキシにリクエスト - リトライメカニズム追加
    let retries = 2; // 最大3回試行（初回 + 2回リトライ）
    let response = null;
    let error = null;
    
    while (retries >= 0) {
      try {
        response = await axios.get(YAHOO_FINANCE_URL, {
          params: { 
            symbols: formattedTicker 
          },
          timeout: YAHOO_FINANCE_API_TIMEOUT + (2 - retries) * 3000, // リトライごとにタイムアウトを延長
          validateStatus: function (status) {
            // 全てのステータスコードを許可して、エラー時にPromiseをリジェクトしないようにする
            return true;
          }
        });
        
        // 成功した場合はループを抜ける
        if (response.status === 200 && response.data && response.data.success) {
          // データが含まれていることも確認
          const quoteData = response.data.data && response.data.data[formattedTicker];
          if (quoteData && quoteData.price) {
            break;
          }
        }
        
        retries--;
        if (retries >= 0) {
          console.log(`Retrying Yahoo Finance API for ${formattedTicker}, attempts left: ${retries}`);
          // 次の試行前に短い遅延を入れる
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (e) {
        error = e;
        retries--;
        if (retries >= 0) {
          console.log(`Error fetching from Yahoo Finance API, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
    
    // ステータスコードをチェック
    if (!response || response.status !== 200) {
      console.log(`Yahoo Finance returned status code ${response?.status || 'unknown'} for ${formattedTicker}`);
      return null;
    }
    
    // レスポンスデータをログ（デバッグ用）
    console.log(`Yahoo Finance response for ${formattedTicker}:`, response.data);
    
    // データの存在を確認
    if (response.data && response.data.success) {
      // 元のリクエストティッカーに合わせてデータを取得
      const quoteData = response.data.data[formattedTicker];
      
      if (!quoteData) {
        console.log(`No data found for ${formattedTicker} in Yahoo Finance response`);
        return null;
      }
      
      // 価格の存在確認
      if (quoteData && quoteData.price) {
        const price = quoteData.price;
        
        console.log(`Successfully fetched data for ${formattedTicker} from Yahoo Finance: ${price}`);
        
        // 銘柄名を取得
        const name = quoteData.name || ticker;
        
        // 投資信託かどうかを判定
        const isMutualFundTicker = isMutualFund(ticker);
        
        // 債券ETFかどうかを判定
        const bondETF = isBondETF(ticker);
        
        // ファンドタイプを判定
        const fundType = isMutualFundTicker 
          ? FUND_TYPES.MUTUAL_FUND
          : bondETF 
            ? FUND_TYPES.BOND
            : determineFundType(ticker, name);
        
        console.log(`Determined fund type for ${ticker} from Yahoo Finance: ${fundType}`);
        
        // 個別株かどうかを判定
        const isStock = fundType === FUND_TYPES.STOCK;
        
        // 手数料情報を取得
        const feeInfo = estimateAnnualFee(ticker, name);
        
        // 基本情報を取得
        const fundInfo = extractFundInfo(ticker, name);
        
        // 配当情報の取得
        const dividendInfo = estimateDividendYield(ticker, name);
        
        // 配当情報を確定
        const hasDividend = determineHasDividend(ticker);
        
        // 通貨判定（改善版）
        const currency = quoteData.currency || fundInfo.currency || 
                        determineCurrency(ticker, name);
        
        // 手数料情報（個別株は常に0%）
        const annualFee = isStock ? 0 : (bondETF ? 0.15 : feeInfo.fee);
        
        // 価格表示ラベル（投資信託なら「基準価額」、それ以外は「株価」）
        const priceLabel = isMutualFundTicker ? '基準価額' : '株価';
        
        return {
          success: true,
          data: {
            id: ticker,
            name: name,
            ticker: ticker,
            exchangeMarket: isJapaneseStock(ticker) ? 'Japan' : 'US',
            price: price,
            currency: currency,
            holdings: 0,
            annualFee: annualFee,
            fundType: fundType,
            isStock: isStock,
            isMutualFund: isMutualFundTicker,
            isBondETF: bondETF,  // 債券ETFフラグを追加
            feeSource: isStock ? '個別株' : (bondETF ? '債券ETF' : (isMutualFundTicker ? '投資信託' : feeInfo.source)),
            feeIsEstimated: isStock ? false : feeInfo.isEstimated,
            region: fundInfo.region || 'unknown',
            lastUpdated: new Date().toISOString(),
            source: DATA_SOURCES.YAHOO_FINANCE,
            // 配当情報
            dividendYield: bondETF ? 3.0 : dividendInfo.yield,  // 債券ETFは3%とする
            hasDividend: hasDividend || bondETF,  // 債券ETFは配当あり
            dividendFrequency: bondETF ? 'monthly' : dividendInfo.dividendFrequency,
            dividendIsEstimated: dividendInfo.isEstimated,
            // 投資信託特有の項目
            priceLabel: priceLabel
          },
          message: 'Yahoo Financeから正常に取得しました'
        };
      }
    }
    
    console.log(`No valid data found for ${formattedTicker} from Yahoo Finance`);
    return null;
  } catch (error) {
    console.error(`Yahoo Finance error for ${ticker}:`, error.message);
    
    if (error.response) {
      console.error(`Yahoo Finance response error status: ${error.response.status}`);
      console.error(`Yahoo Finance response data:`, error.response.data);
    }
    
    return null;
  }
}

/**
 * 米国株の場合はAlpaca APIを優先するが、債券ETFの場合は特別処理を追加
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - 銘柄データとステータス
 */
export async function fetchTickerData(ticker) {
  if (!ticker) {
    return {
      success: false,
      message: 'ティッカーシンボルが指定されていません',
      error: true
    };
  }
  
  // ティッカーを大文字に統一
  ticker = ticker.toUpperCase();
  
  // 債券ETFかどうかを直接チェック（特別処理）
  const isBondETFTicker = isBondETF(ticker);
  
  // 債券ETFの場合は特別処理を実行
  if (isBondETFTicker) {
    console.log(`${ticker} is a bond ETF. Trying Yahoo Finance first for more reliable data.`);
    // 債券ETFの場合はYahoo Financeを優先する（より信頼性の高いデータのため）
    try {
      // Yahoo Financeを最初に試行
      const yahooResult = await fetchFromYahoo(ticker);
      if (yahooResult && yahooResult.success) {
        console.log(`Successfully fetched ${ticker} from Yahoo Finance`);
        return {
          ...yahooResult,
          alpacaTried: false,
          alpacaSuccess: false,
          yahooFinanceTried: true,
          yahooFinanceSuccess: true,
          isBondETF: true
        };
      }
    } catch (yahooError) {
      console.error(`Yahoo Finance error for ${ticker}:`, yahooError.message);
    }
    
    // Yahoo Financeが失敗した場合はAlpacaを試行
    try {
      console.log(`Yahoo Finance failed for ${ticker}. Trying Alpaca API.`);
      const alpacaResult = await fetchFromAlpaca(ticker);
      if (alpacaResult && alpacaResult.success) {
        console.log(`Successfully fetched ${ticker} from Alpaca API`);
        return {
          ...alpacaResult,
          alpacaTried: true,
          alpacaSuccess: true,
          yahooFinanceTried: true,
          yahooFinanceSuccess: false,
          isBondETF: true
        };
      }
    } catch (alpacaError) {
      console.error(`Alpaca API error for ${ticker}:`, alpacaError.message);
    }
    
    // 両方のAPIが失敗した場合はフォールバック値を生成
    console.log(`Both APIs failed for ${ticker}. Using enhanced fallback for bond ETF.`);
    const fallbackData = generateBondETFFallback(ticker);
    return {
      ...fallbackData,
      alpacaTried: true,
      alpacaSuccess: false,
      yahooFinanceTried: true,
      yahooFinanceSuccess: false,
      isBondETF: true,
      message: `${ticker}のデータ取得に失敗しました。債券ETF用のフォールバック値を使用します。`
    };
  }
  
  // 日本株または投資信託かを判定
  const isJapanese = isJapaneseStock(ticker);
  const isMutualFundTicker = isMutualFund(ticker);
  
  // データ取得試行履歴
  let jpStockScrapingTried = false;
  let jpStockScrapingSuccess = false;
  let mutualFundScrapingTried = false;
  let mutualFundScrapingSuccess = false;
  let alpacaTried = false;
  let alpacaSuccess = false;
  let yahooFinanceTried = false;
  let yahooFinanceSuccess = false;
  
  // 投資信託の場合
  if (isMutualFundTicker) {
    try {
      // 投資信託スクレイピングからデータ取得を試みる
      console.log(`${ticker} is a mutual fund. Trying Mutual Fund Scraping first.`);
      mutualFundScrapingTried = true;
      const mutualFundResult = await fetchFromMutualFundScraping(ticker);
      
      if (mutualFundResult && mutualFundResult.success) {
        mutualFundScrapingSuccess = true;
        return {
          ...mutualFundResult,
          mutualFundScrapingTried,
          mutualFundScrapingSuccess
        };
      }
      
      // 投資信託スクレイピングが失敗した場合は、Yahoo Financeを試行
      console.log(`Mutual Fund Scraping failed for ${ticker}. Trying Yahoo Finance.`);
      yahooFinanceTried = true;
      const yahooResult = await fetchFromYahoo(ticker);
      
      if (yahooResult && yahooResult.success) {
        yahooFinanceSuccess = true;
        return {
          ...yahooResult,
          mutualFundScrapingTried,
          mutualFundScrapingSuccess,
          yahooFinanceTried,
          yahooFinanceSuccess
        };
      }
      
      // すべてのAPIが失敗した場合は、フォールバック値を使用
      console.log(`All APIs failed for ${ticker}. Using fallback data.`);
      const fallbackData = generateFallbackTickerData(ticker);
      
      return {
        ...fallbackData,
        mutualFundScrapingTried,
        mutualFundScrapingSuccess,
        yahooFinanceTried,
        yahooFinanceSuccess,
        message: `全てのAPIからのデータ取得に失敗しました: ${ticker}. フォールバック値を使用します。`
      };
    } catch (error) {
      console.error(`Error fetching mutual fund data for ${ticker}:`, error.message);
      
      // フォールバック値を使用
      const fallbackData = generateFallbackTickerData(ticker);
      
      return {
        ...fallbackData,
        mutualFundScrapingTried,
        mutualFundScrapingSuccess,
        yahooFinanceTried,
        yahooFinanceSuccess,
        error: true,
        errorMessage: error.message,
        message: `データ取得中にエラーが発生しました: ${error.message}. フォールバック値を使用します。`
      };
    }
  }
  
  // 日本株の場合
  if (isJapanese) {
    try {
      // 日本株スクレイピングからデータ取得を試みる
      console.log(`${ticker} is a Japanese stock. Trying JP Stock Scraping first.`);
      jpStockScrapingTried = true;
      const jpStockResult = await fetchFromJPStockScraping(ticker);
      
      if (jpStockResult && jpStockResult.success) {
        jpStockScrapingSuccess = true;
        return {
          ...jpStockResult,
          jpStockScrapingTried,
          jpStockScrapingSuccess
        };
      }
      
      // 日本株スクレイピングが失敗した場合は、Yahoo Financeを試行
      console.log(`JP Stock Scraping failed for ${ticker}. Trying Yahoo Finance.`);
      yahooFinanceTried = true;
      const yahooResult = await fetchFromYahoo(ticker);
      
      if (yahooResult && yahooResult.success) {
        yahooFinanceSuccess = true;
        return {
          ...yahooResult,
          jpStockScrapingTried,
          jpStockScrapingSuccess,
          yahooFinanceTried,
          yahooFinanceSuccess
        };
      }
      
      // すべてのAPIが失敗した場合は、フォールバック値を使用
      console.log(`All APIs failed for ${ticker}. Using fallback data.`);
      const fallbackData = generateFallbackTickerData(ticker);
      
      return {
        ...fallbackData,
        jpStockScrapingTried,
        jpStockScrapingSuccess,
        yahooFinanceTried,
        yahooFinanceSuccess,
        message: `全てのAPIからのデータ取得に失敗しました: ${ticker}. フォールバック値を使用します。`
      };
    } catch (error) {
      console.error(`Error fetching Japanese stock data for ${ticker}:`, error.message);
      
      // フォールバック値を使用
      const fallbackData = generateFallbackTickerData(ticker);
      
      return {
        ...fallbackData,
        jpStockScrapingTried,
        jpStockScrapingSuccess,
        yahooFinanceTried,
        yahooFinanceSuccess,
        error: true,
        errorMessage: error.message,
        message: `データ取得中にエラーが発生しました: ${error.message}. フォールバック値を使用します。`
      };
    }
  }
  
  // 米国株の場合はAlpaca APIを優先
  try {
    // Alpaca APIからデータ取得を試みる
    console.log(`${ticker} is likely a US stock. Trying Alpaca API first.`);
    alpacaTried = true;
    const alpacaResult = await fetchFromAlpaca(ticker);
    
    if (alpacaResult && alpacaResult.success) {
      alpacaSuccess = true;
      return alpacaResult;
    }
    
    // Alpaca APIが失敗した場合は、Yahoo Financeを試行
    console.log(`Alpaca API failed for ${ticker}. Trying Yahoo Finance.`);
    yahooFinanceTried = true;
    const yahooResult = await fetchFromYahoo(ticker);
    
    if (yahooResult && yahooResult.success) {
      yahooFinanceSuccess = true;
      return {
        ...yahooResult,
        alpacaTried,
        alpacaSuccess: false
      };
    }
    
    // すべてのAPIが失敗した場合は、フォールバック値を使用
    console.log(`All APIs failed for ${ticker}. Using fallback data.`);
    const fallbackData = generateFallbackTickerData(ticker);
    
    return {
      ...fallbackData,
      alpacaTried,
      alpacaSuccess,
      yahooFinanceTried,
      yahooFinanceSuccess,
      message: `すべてのAPIからのデータ取得に失敗しました: ${ticker}. フォールバック値を使用します。`
    };
  } catch (error) {
    console.error(`Error fetching ${ticker} from APIs:`, error.message);
    
    // Yahoo Financeをまだ試していない場合は試行
    if (!yahooFinanceTried && ENABLE_YAHOO_FINANCE_API) {
      try {
        console.log(`Error with Alpaca API, trying Yahoo Finance for ${ticker}`);
        yahooFinanceTried = true;
        const yahooResult = await fetchFromYahoo(ticker);
        
        if (yahooResult && yahooResult.success) {
          yahooFinanceSuccess = true;
          return {
            ...yahooResult,
            alpacaTried,
            alpacaSuccess: false,
            message: `Alpaca APIでエラーが発生し、Yahoo Financeから取得しました: ${ticker}`
          };
        }
      } catch (yahooError) {
        console.error(`Yahoo Finance also failed for ${ticker}:`, yahooError.message);
      }
    }
    
    // エラーの種類を特定して適切なメッセージを生成
    let errorType = 'UNKNOWN';
    let errorMessage = 'データの取得に失敗しました。フォールバック値を使用します。';
    
    if (error.response) {
      // サーバーからのレスポンスがある場合
      if (error.response.status === 429) {
        errorType = 'RATE_LIMIT';
        errorMessage = 'APIリクエスト制限に達しました。フォールバック値を使用します。';
      } else {
        errorType = 'API_ERROR';
        errorMessage = `API エラー (${error.response.status}): ${error.response.data?.message || error.message}. フォールバック値を使用します。`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT';
      errorMessage = 'リクエストのタイムアウトが発生しました。フォールバック値を使用します。';
    } else if (error.code === 'ERR_NETWORK') {
      errorType = 'NETWORK';
      errorMessage = 'ネットワークエラーが発生しました。フォールバック値を使用します。';
    }
    
    // フォールバック値を使用
    const fallbackData = generateFallbackTickerData(ticker);
    
    return {
      ...fallbackData,
      alpacaTried,
      alpacaSuccess,
      yahooFinanceTried,
      yahooFinanceSuccess,
      errorType,
      error: true,
      errorMessage: error.message,
      message: errorMessage
    };
  }
}

/**
 * 債券ETF専用のフォールバックデータを生成する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} - 債券ETF用のフォールバックデータ
 */
function generateBondETFFallback(ticker) {
  // 債券ETF向けのより正確なフォールバック値を設定
  const bondETFDefaults = {
    'LQD': { price: 108.50, name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF' },
    'BND': { price: 72.20, name: 'Vanguard Total Bond Market ETF' },
    'AGG': { price: 96.70, name: 'iShares Core U.S. Aggregate Bond ETF' },
    'TLT': { price: 95.80, name: 'iShares 20+ Year Treasury Bond ETF' },
    'IEF': { price: 94.20, name: 'iShares 7-10 Year Treasury Bond ETF' },
    'GOVT': { price: 24.50, name: 'iShares U.S. Treasury Bond ETF' },
    'HYG': { price: 75.30, name: 'iShares iBoxx $ High Yield Corporate Bond ETF' },
    'JNK': { price: 91.40, name: 'SPDR Bloomberg High Yield Bond ETF' },
    'MUB': { price: 105.60, name: 'iShares National Muni Bond ETF' },
    'VCIT': { price: 79.90, name: 'Vanguard Intermediate-Term Corporate Bond ETF' },
    'VCSH': { price: 76.50, name: 'Vanguard Short-Term Corporate Bond ETF' }
  };
  
  // デフォルト値またはティッカー固有の値を取得
  const defaults = bondETFDefaults[ticker] || { price: 100.00, name: `${ticker} Bond ETF` };
  
  const currentDate = new Date().toISOString();
  
  return {
    success: false,
    data: {
      id: ticker,
      name: defaults.name,
      ticker: ticker,
      exchangeMarket: 'US',
      price: defaults.price,
      currency: 'USD',
      holdings: 0,
      annualFee: 0.15, // 債券ETFの一般的な手数料率
      fundType: FUND_TYPES.BOND,
      isStock: false,
      isMutualFund: false,
      isBondETF: true,
      feeSource: '債券ETF',
      feeIsEstimated: true,
      region: 'US',
      lastUpdated: currentDate,
      source: DATA_SOURCES.FALLBACK,
      // 配当情報（債券ETFは通常配当あり）
      dividendYield: 3.0, // 債券ETFの一般的な利回り
      hasDividend: true,
      dividendFrequency: 'monthly', // 債券ETFは通常月次配当
      dividendIsEstimated: true,
      priceLabel: '株価'
    },
    message: '債券ETFのフォールバック値を使用しています。実際の値と異なる可能性があります。',
    error: true
  };
}

/**
 * 全ての取得方法が失敗した場合のフォールバックデータ生成
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} - フォールバック銘柄データとステータス
 */
function generateFallbackTickerData(ticker) {
  if (!ticker) {
    return {
      success: false,
      data: {
        id: 'unknown',
        name: 'Unknown Ticker',
        ticker: 'unknown',
        exchangeMarket: 'Unknown',
        price: 0,
        currency: 'USD',
        holdings: 0,
        annualFee: 0,
        fundType: FUND_TYPES.UNKNOWN,
        isStock: false,
        isMutualFund: false,
        feeSource: 'unknown',
        feeIsEstimated: true,
        region: 'unknown',
        lastUpdated: new Date().toISOString(),
        source: DATA_SOURCES.FALLBACK,
        dividendYield: 0,
        hasDividend: false,
        dividendFrequency: 'unknown',
        dividendIsEstimated: true,
        priceLabel: '株価'
      },
      message: 'ティッカーが無効なため、デフォルト値を使用しています。',
      error: true
    };
  }

  // ティッカーを大文字に統一
  ticker = ticker.toUpperCase();
  
  // 債券ETFかどうかを直接チェック
  if (isBondETF(ticker)) {
    console.log(`${ticker} is identified as a Bond ETF in fallback generation. Using specialized bond ETF fallback.`);
    return generateBondETFFallback(ticker);
  }
  
  // 米国ETFリストに含まれているか確認
  const isUSETF = US_ETF_LIST.includes(ticker);
  
  // 市場とティッカーから推測されるデフォルト値を使用
  const isJapaneseStockTicker = isJapaneseStock(ticker);
  const isMutualFundTicker = isMutualFund(ticker);
  
  // デフォルト価格を設定
  let defaultPrice;
  
  if (isMutualFundTicker) {
    defaultPrice = 10000; // 投資信託の基準価額デフォルト値
  } else if (isJapaneseStockTicker) {
    defaultPrice = 2500; // 日本株のデフォルト価格
  } else {
    // 米国株のデフォルト価格
    const etfPrices = {
      'VXUS': 60.0,
      'IBIT': 40.0,
      'LQD': 110.0,
      'GLD': 200.0,
      'SPY': 500.0,
      'VOO': 450.0,
      'VTI': 250.0,
      'QQQ': 400.0
    };
    
    defaultPrice = etfPrices[ticker] || 150;
  }
  
  // ファンドタイプを判定
  const fundType = isMutualFundTicker 
    ? FUND_TYPES.MUTUAL_FUND
    : determineFundType(ticker, ticker);
  
  // 個別株かどうかを判定
  const isStock = fundType === FUND_TYPES.STOCK;
  
  // 基本情報と手数料情報を取得
  const fundInfo = extractFundInfo(ticker, ticker);
  const feeInfo = estimateAnnualFee(ticker, name);
  
  // 配当情報の推定
  const dividendInfo = estimateDividendYield(ticker, ticker);
  
  // 配当情報を確定
  const hasDividend = determineHasDividend(ticker);
  
  // 手数料情報（個別株は常に0%）
  const annualFee = isStock ? 0 : feeInfo.fee;
  
  // 価格表示ラベル（投資信託なら「基準価額」、それ以外は「株価」）
  const priceLabel = isMutualFundTicker ? '基準価額' : '株価';
  
  // 通貨判定（改善版）
  const currency = determineCurrency(ticker, ticker);
  
  // 米国ETFの場合、特定の情報をログ
  if (isUSETF) {
    console.log(`Using fallback data for US ETF: ${ticker}, Price: ${defaultPrice}, FundType: ${fundType}`);
  }
  
  return {
    success: false,
    data: {
      id: ticker,
      name: ticker,
      ticker: ticker,
      exchangeMarket: isJapaneseStockTicker || isMutualFundTicker ? 'Japan' : 'US',
      price: defaultPrice,
      currency: currency,
      holdings: 0,
      annualFee: annualFee,
      fundType: fundType,
      isStock: isStock,
      isMutualFund: isMutualFundTicker,
      feeSource: isStock ? '個別株' : (isMutualFundTicker ? '投資信託' : feeInfo.source),
      feeIsEstimated: isStock ? false : feeInfo.isEstimated,
      region: fundInfo.region || 'unknown',
      lastUpdated: new Date().toISOString(),
      source: DATA_SOURCES.FALLBACK,
      // 配当情報
      dividendYield: dividendInfo.yield,
      hasDividend: hasDividend,
      dividendFrequency: dividendInfo.dividendFrequency,
      dividendIsEstimated: dividendInfo.isEstimated,
      // 投資信託特有の項目
      priceLabel: priceLabel
    },
    message: '最新の価格データを取得できませんでした。前回の価格または推定値を使用しています。',
    error: true
  };
}

/**
 * 複数銘柄のデータを一括取得する
 * @param {Array<string>} tickers - ティッカーシンボルの配列
 * @returns {Promise<Object>} - 複数銘柄のデータとステータス
 */
export async function fetchMultipleTickerData(tickers) {
  if (!tickers || !tickers.length) {
    return {
      success: false,
      data: [],
      message: 'ティッカーリストが空です',
      error: true
    };
  }
  
  console.log(`Fetching data for ${tickers.length} tickers: ${tickers.join(', ')}`);
  
  // 各ティッカーを並行して取得
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      // ここでは個別ティッカー取得を使用（すでにフォールバックロジックを含む）
      const result = await fetchTickerData(ticker);
      return {
        ticker,
        ...result
      };
    })
  );
  
  // データソースの情報を集計
  const sourceStats = results.reduce((stats, result) => {
    const source = result.data?.source || 'Unknown';
    stats[source] = (stats[source] || 0) + 1;
    return stats;
  }, {});
  
  // スクレイピングソースのカウント
  const jpStockScrapingResults = results.filter(result => result.jpStockScrapingTried);
  const jpStockScrapingSuccess = jpStockScrapingResults.filter(result => result.jpStockScrapingSuccess);
  
  const mutualFundScrapingResults = results.filter(result => result.mutualFundScrapingTried);
  const mutualFundScrapingSuccess = mutualFundScrapingResults.filter(result => result.mutualFundScrapingSuccess);
  
  // Alpacaの成功/失敗カウントを計算
  const alpacaResults = results.filter(result => result.alpacaTried);
  const alpacaSuccess = alpacaResults.filter(result => result.alpacaSuccess);
  
  // Yahoo Financeの成功/失敗カウントを計算
  const yahooResults = results.filter(result => result.yahooFinanceTried);
  const yahooSuccess = yahooResults.filter(result => result.yahooFinanceSuccess);
  
  // 債券ETFのカウント
  const bondETFs = results.filter(result => result.isBondETF);
  
  // 日本株・投資信託・米国株の分類
  const japaneseStocks = results.filter(result => isJapaneseStock(result.ticker) && !isMutualFund(result.ticker));
  const mutualFunds = results.filter(result => isMutualFund(result.ticker));
  const usStocks = results.filter(result => !isJapaneseStock(result.ticker) && !isMutualFund(result.ticker));
  
  console.log(`Data source statistics:`, sourceStats);
  console.log(`Stock types: Japanese: ${japaneseStocks.length}, US: ${usStocks.length}, Mutual Funds: ${mutualFunds.length}, Bond ETFs: ${bondETFs.length}`);
  
  if (jpStockScrapingResults.length > 0) {
    console.log(`JP Stock Scraping statistics: tried: ${jpStockScrapingResults.length}, succeeded: ${jpStockScrapingSuccess.length}`);
  }
  
  if (mutualFundScrapingResults.length > 0) {
    console.log(`Mutual Fund Scraping statistics: tried: ${mutualFundScrapingResults.length}, succeeded: ${mutualFundScrapingSuccess.length}`);
  }
  
  if (alpacaResults.length > 0) {
    console.log(`Alpaca statistics: tried: ${alpacaResults.length}, succeeded: ${alpacaSuccess.length}`);
  }
  
  if (yahooResults.length > 0) {
    console.log(`Yahoo Finance statistics: tried: ${yahooResults.length}, succeeded: ${yahooSuccess.length}`);
  }
  
  if (bondETFs.length > 0) {
    console.log(`Bond ETF statistics: total: ${bondETFs.length}`);
  }
  
  // 全体の成功・失敗を判定
  const hasError = results.some(result => !result.success);
  const allSuccess = results.every(result => result.success);
  
  // 結果のサマリーをログ
  console.log(`Fetch summary: ${results.filter(r => r.success).length} succeeded, ${results.filter(r => !r.success).length} failed`);
  
  // 各APIの情報を含む
  const resultInfo = {
    success: allSuccess,
    data: results.map(result => result.data),
    partialSuccess: hasError && results.some(result => result.success),
    message: allSuccess 
      ? '全ての銘柄データを正常に取得しました' 
      : hasError 
        ? '一部の銘柄データの取得に失敗しました' 
        : '全ての銘柄データの取得に失敗しました',
    error: hasError,
    details: results.map(result => ({
      ticker: result.ticker,
      success: result.success,
      message: result.message,
      source: result.data.source,
      isBondETF: result.isBondETF || false
    })),
    // スクレイピングソースの統計を追加
    jpStockScrapingStats: {
      tried: jpStockScrapingResults.length,
      succeeded: jpStockScrapingSuccess.length,
      failedTickers: jpStockScrapingResults
        .filter(r => !r.jpStockScrapingSuccess)
        .map(r => r.ticker)
    },
    mutualFundScrapingStats: {
      tried: mutualFundScrapingResults.length,
      succeeded: mutualFundScrapingSuccess.length,
      failedTickers: mutualFundScrapingResults
        .filter(r => !r.mutualFundScrapingSuccess)
        .map(r => r.ticker)
    },
    alpacaStats: {
      tried: alpacaResults.length,
      succeeded: alpacaSuccess.length,
      failedTickers: alpacaResults
        .filter(r => !r.alpacaSuccess)
        .map(r => r.ticker)
    },
    yahooFinanceStats: {
      tried: yahooResults.length,
      succeeded: yahooSuccess.length,
      failedTickers: yahooResults
        .filter(r => !r.yahooFinanceSuccess)
        .map(r => r.ticker)
    },
    bondETFStats: {
      total: bondETFs.length,
      tickers: bondETFs.map(r => r.ticker)
    },
    stockTypeStats: {
      japaneseStocks: japaneseStocks.length,
      mutualFunds: mutualFunds.length,
      usStocks: usStocks.length,
      bondETFs: bondETFs.length
    }
  };
  
  // APIの統計情報をメッセージに含める
  if (jpStockScrapingResults.length > 0) {
    if (jpStockScrapingSuccess.length > 0) {
      resultInfo.jpStockScrapingSuccessMessage = `${jpStockScrapingSuccess.length}件の日本株はスクレイピングから取得しました`;
    }
    if (jpStockScrapingResults.length - jpStockScrapingSuccess.length > 0) {
      resultInfo.jpStockScrapingFailureMessage = `${jpStockScrapingResults.length - jpStockScrapingSuccess.length}件の日本株はスクレイピングから取得できませんでした`;
    }
  }
  
  if (mutualFundScrapingResults.length > 0) {
    if (mutualFundScrapingSuccess.length > 0) {
      resultInfo.mutualFundScrapingSuccessMessage = `${mutualFundScrapingSuccess.length}件の投資信託はスクレイピングから取得しました`;
    }
    if (mutualFundScrapingResults.length - mutualFundScrapingSuccess.length > 0) {
      resultInfo.mutualFundScrapingFailureMessage = `${mutualFundScrapingResults.length - mutualFundScrapingSuccess.length}件の投資信託はスクレイピングから取得できませんでした`;
    }
  }
  
  if (alpacaResults.length > 0) {
    if (alpacaSuccess.length > 0) {
      resultInfo.alpacaSuccessMessage = `${alpacaSuccess.length}件の銘柄はAlpaca APIから取得しました`;
    }
    if (alpacaResults.length - alpacaSuccess.length > 0) {
      resultInfo.alpacaFailureMessage = `${alpacaResults.length - alpacaSuccess.length}件の銘柄はAlpaca APIから取得できませんでした`;
    }
  }
  
  if (yahooResults.length > 0) {
    if (yahooSuccess.length > 0) {
      resultInfo.yahooFinanceSuccessMessage = `${yahooSuccess.length}件の銘柄はYahoo Financeから取得しました`;
    }
    if (yahooResults.length - yahooSuccess.length > 0) {
      resultInfo.yahooFinanceFailureMessage = `${yahooResults.length - yahooSuccess.length}件の銘柄はYahoo Financeからも取得できませんでした`;
    }
  }
  
  if (bondETFs.length > 0) {
    resultInfo.bondETFMessage = `${bondETFs.length}件の債券ETFを処理しました`;
  }
  
  return resultInfo;
}

/**
 * 配当データを取得する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - 配当データとステータス
 */
export const fetchDividendData = async function(ticker) {
  try {
    // ティッカーを大文字に統一
    ticker = ticker.toUpperCase();
    
    // 債券ETFかどうかを判定
    const bondETF = isBondETF(ticker);
    
    // 債券ETFの場合は固定値を返す
    if (bondETF) {
      return {
        success: true,
        data: {
          dividendYield: 3.0, // 債券ETFの一般的な利回り
          hasDividend: true,
          dividendFrequency: 'monthly', // 債券ETFは通常月次配当
          dividendIsEstimated: true,
          lastUpdated: new Date().toISOString()
        },
        message: '債券ETFの配当情報を取得しました'
      };
    }
    
    // ファンドタイプを判定
    const fundType = determineFundType(ticker, ticker);
    
    // 配当情報の取得
    const dividendInfo = estimateDividendYield(ticker, ticker);
    
    // 配当情報を確定
    const hasDividend = determineHasDividend(ticker);
    
    return {
      success: true,
      data: {
        dividendYield: dividendInfo.yield,
        hasDividend: hasDividend,
        dividendFrequency: dividendInfo.dividendFrequency,
        dividendIsEstimated: dividendInfo.isEstimated,
        lastUpdated: new Date().toISOString()
      },
      message: '配当情報を取得しました'
    };
  } catch (error) {
    console.error('Dividend data fetch error:', error);
    
    // 債券ETFかどうかを判定
    const bondETF = isBondETF(ticker);
    
    if (bondETF) {
      return {
        success: true,
        data: {
          dividendYield: 3.0, // 債券ETFの一般的な利回り
          hasDividend: true,
          dividendFrequency: 'monthly', // 債券ETFは通常月次配当
          dividendIsEstimated: true,
          lastUpdated: new Date().toISOString()
        },
        message: '債券ETFの配当情報を取得しました'
      };
    }
    
    // エラー時はティッカーからの推定値を返す
    const dividendInfo = estimateDividendYield(ticker, ticker);
    const hasDividend = determineHasDividend(ticker);
    
    return {
      success: false,
      data: {
        dividendYield: dividendInfo.yield,
        hasDividend: hasDividend,
        dividendFrequency: dividendInfo.dividendFrequency,
        dividendIsEstimated: true,
        lastUpdated: new Date().toISOString()
      },
      message: '配当情報の取得に失敗しました。推定値を使用しています。',
      error: true
    };
  }
};

/**
 * ファンド情報を取得する
 * @param {string} ticker - ティッカーシンボル
 * @param {string} name - 銘柄名（省略可）
 * @returns {Promise<Object>} - ファンド情報とステータス
 */
export const fetchFundInfo = async function(ticker, name = '') {
  try {
    // ティッカーを大文字に統一
    ticker = ticker.toUpperCase();
    
    // 債券ETFかどうかを判定
    const bondETF = isBondETF(ticker);
    
    // 投資信託かどうかを判定
    const isMutualFundTicker = isMutualFund(ticker);
    
    // ファンドタイプを判定
    const fundType = isMutualFundTicker
      ? FUND_TYPES.MUTUAL_FUND
      : bondETF
        ? FUND_TYPES.BOND
        : determineFundType(ticker, name);
    
    // 個別株かどうかを判定
    const isStock = fundType === FUND_TYPES.STOCK;
    
    // 手数料情報を推定
    const feeInfo = estimateAnnualFee(ticker, name);
    
    // 配当情報を推定
    const dividendInfo = estimateDividendYield(ticker, name);
    
    // 配当情報を確定
    const hasDividend = determineHasDividend(ticker) || bondETF;
    
    // 債券ETF固有の値
    const fee = isStock ? 0 : (bondETF ? 0.15 : feeInfo.fee);
    const source = isStock ? '個別株' : (bondETF ? '債券ETF' : (isMutualFundTicker ? '投資信託' : feeInfo.source));
    
    return {
      success: true,
      ticker: ticker,
      name: name || ticker,
      fundType: fundType,
      isStock: isStock,
      isMutualFund: isMutualFundTicker,
      isBondETF: bondETF,
      annualFee: fee,
      feeSource: source,
      feeIsEstimated: isStock ? false : (bondETF ? true : feeInfo.isEstimated),
      dividendYield: bondETF ? 3.0 : dividendInfo.yield,
      hasDividend: hasDividend,
      dividendFrequency: bondETF ? 'monthly' : dividendInfo.dividendFrequency,
      dividendIsEstimated: bondETF ? true : dividendInfo.isEstimated,
      message: 'ファンド情報を取得しました'
    };
  } catch (error) {
    console.error('Fund info fetch error:', error);
    
    return {
      success: false,
      ticker: ticker,
      fundType: 'UNKNOWN',
      isStock: false,
      isMutualFund: false,
      isBondETF: false,
      annualFee: 0,
      feeSource: '取得失敗',
      feeIsEstimated: true,
      dividendYield: 0,
      hasDividend: false,
      dividendFrequency: 'unknown',
      dividendIsEstimated: true,
      message: 'ファンド情報の取得に失敗しました',
      error: true
    };
  }
};

/**
 * 為替レートを取得する（改善版）
 * @param {string} fromCurrency - 変換元通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Promise<Object>} - 為替レートデータとステータス
 */
/**
 * 為替レートを取得する（改善版）の続き
 */
export const fetchExchangeRate = async function(fromCurrency, toCurrency) {
  try {
    // 同一通貨の場合は1を返す
    if (fromCurrency === toCurrency) {
      return {
        success: true,
        rate: 1,
        source: 'Direct',
        message: '同一通貨間のレートです',
        lastUpdated: new Date().toISOString()
      };
    }
    
    console.log(`Attempting to fetch exchange rate for ${fromCurrency}/${toCurrency} from alternative exchangerate API`);
    
    // リトライメカニズムを実装
    let retries = 2; // 最大3回試行（初回 + 2回リトライ）
    let response = null;
    let error = null;
    
    while (retries >= 0) {
      try {
        // 代替exchangerate APIを呼び出す
        response = await axios.get(EXCHANGERATE_API_URL, {
          params: {
            base: fromCurrency,
            symbols: toCurrency
          },
          timeout: EXCHANGERATE_API_TIMEOUT + (2 - retries) * 2000 // リトライごとにタイムアウトを延長
        });
        
        // 成功した場合はループを抜ける
        if (response.status === 200 && response.data && response.data.success) {
          break;
        }
        
        retries--;
        if (retries >= 0) {
          console.log(`Retrying exchange rate API for ${fromCurrency}/${toCurrency}, attempts left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        error = e;
        retries--;
        if (retries >= 0) {
          console.log(`Error fetching from exchange rate API, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // データの存在確認
    if (response && response.data && response.data.success && response.data.data) {
      const rate = response.data.data.rate;
      const source = response.data.data.source || DATA_SOURCES.EXCHANGERATE;
      
      console.log(`Successfully fetched exchange rate for ${fromCurrency}/${toCurrency} from ${source}: ${rate}`);
      
      return {
        success: true,
        rate: rate,
        source: source,
        message: '正常に取得しました',
        lastUpdated: new Date().toISOString()
      };
    }
    
    console.log(`No valid exchange rate data from API, using fallback value`);
    
    // データがない場合はフォールバック値を使用
    return generateFallbackExchangeRate(fromCurrency, toCurrency);
    
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    console.log(`Error fetching exchange rate, using fallback value`);
    
    // フォールバック値を返す
    return generateFallbackExchangeRate(fromCurrency, toCurrency);
  }
};

/**
 * フォールバック為替レートを生成する
 * @param {string} fromCurrency - 変換元通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Object} - フォールバック為替レートデータとステータス
 */
function generateFallbackExchangeRate(fromCurrency, toCurrency) {
  const pair = `${fromCurrency}/${toCurrency}`;
  let rate;
  
  // デフォルト値から取得を試みる
  if (DEFAULT_EXCHANGE_RATES[pair]) {
    rate = DEFAULT_EXCHANGE_RATES[pair];
  } else if (fromCurrency === 'JPY' && toCurrency === 'USD') {
    rate = 1 / 150.0; // 円からドル (約0.0067)
  } else if (fromCurrency === 'USD' && toCurrency === 'JPY') {
    rate = 150.0; // ドルから円
  } else {
    // その他の通貨ペアの場合は1を使用
    rate = 1;
  }
  
  console.log(`Using fallback exchange rate for ${fromCurrency}/${toCurrency}: ${rate}`);
  
  return {
    success: false,
    rate: rate,
    source: DATA_SOURCES.FALLBACK,
    message: '最新の為替レートを取得できませんでした。デフォルト値を使用しています。',
    error: true,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * データの鮮度を確認する
 * @param {Array<Object>} assets - 資産データの配列
 * @param {number} staleThresholdHours - 古いとみなす時間（時間単位）
 * @returns {Object} - データの鮮度情報
 */
export const checkDataFreshness = function(assets, staleThresholdHours = 24) {
  if (!assets || !assets.length) {
    return {
      fresh: true,
      staleItems: [],
      missingUpdateTime: [],
      message: 'データがありません'
    };
  }
  
  const now = new Date();
  const staleThreshold = staleThresholdHours * 60 * 60 * 1000; // ミリ秒に変換
  
  const staleItems = [];
  const missingUpdateTime = [];
  
  assets.forEach(asset => {
    if (!asset.lastUpdated) {
      missingUpdateTime.push(asset.ticker);
    } else {
      const updateTime = new Date(asset.lastUpdated);
      const age = now - updateTime;
      
      if (age > staleThreshold) {
        staleItems.push({
          ticker: asset.ticker,
          age: Math.floor(age / (60 * 60 * 1000)), // 時間単位に変換
          lastUpdated: asset.lastUpdated
        });
      }
    }
  });
  
  return {
    fresh: staleItems.length === 0 && missingUpdateTime.length === 0,
    staleItems,
    missingUpdateTime,
    message: staleItems.length > 0 
      ? `${staleItems.length}個の銘柄データが${staleThresholdHours}時間以上更新されていません` 
      : missingUpdateTime.length > 0 
        ? `${missingUpdateTime.length}個の銘柄に更新時間情報がありません` 
        : 'すべてのデータは最新です'
  };
};
