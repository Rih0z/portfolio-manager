// src/services/scrapingMarketDataService.js
// スクレイピングベースの市場データサービス

import axios from 'axios';

// データソース定数
export const DATA_SOURCES = {
  YAHOO_JAPAN: 'Yahoo Finance Japan',
  MINKABU: 'Minkabu',
  KABUTAN: 'Kabutan',
  TOUSHIN_LIB: '投資信託協会',
  MORNINGSTAR: 'Morningstar Japan',
  FALLBACK: 'Fallback'
};

// APIエンドポイント
const API_ENDPOINTS = {
  JP_STOCK: '/api/jp-stock-scraping-proxy',
  MUTUAL_FUND: '/api/mutual-fund-scraping-proxy',
  EXCHANGE_RATE: '/api/exchangerate-proxy'
};

// タイムアウト設定
const TIMEOUT = {
  JP_STOCK: 15000,
  MUTUAL_FUND: 15000,
  EXCHANGE_RATE: 5000
};

// キャッシュ時間（ミリ秒）
const CACHE_DURATION = 3600000; // 1時間

/**
 * 投資信託かどうかを判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} 投資信託の場合はtrue
 */
export function isMutualFund(ticker) {
  if (!ticker) return false;
  return /^\d{7,8}C(\.T)?$/i.test(ticker);
}

/**
 * 日本株かどうかを判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} 日本株の場合はtrue
 */
export function isJapaneseStock(ticker) {
  if (!ticker) return false;
  ticker = ticker.toString();
  return /^\d{4}(\.T)?$/.test(ticker) || ticker.endsWith('.T');
}

/**
 * フォールバックデータを生成する関数
 * @param {string} ticker - ティッカーシンボル
 * @param {Object|null} lastData - 前回のデータ
 * @returns {Object} フォールバックデータ
 */
export function generateFallbackData(ticker, lastData = null) {
  const is_mutual_fund = isMutualFund(ticker);
  const is_japanese_stock = isJapaneseStock(ticker);
  const cleanTicker = ticker.replace(/\.T$/, '');
  
  // 前回のデータがあれば優先して使用
  if (lastData && lastData.price) {
    return {
      ...lastData,
      lastUpdated: new Date().toISOString(),
      source: DATA_SOURCES.FALLBACK
    };
  }
  
  if (is_mutual_fund) {
    return {
      ticker: cleanTicker,
      price: 10000, // 投資信託のデフォルト価格
      name: `投資信託 ${cleanTicker}`,
      currency: 'JPY',
      lastUpdated: new Date().toISOString(),
      source: DATA_SOURCES.FALLBACK,
      isStock: false,
      isMutualFund: true,
      priceLabel: '基準価額'
    };
  }
  
  if (is_japanese_stock) {
    return {
      ticker: cleanTicker,
      price: 2500, // 日本株のデフォルト価格
      name: `日本株 ${cleanTicker}`,
      currency: 'JPY',
      lastUpdated: new Date().toISOString(),
      source: DATA_SOURCES.FALLBACK,
      isStock: true,
      isMutualFund: false
    };
  }
  
  // それ以外（米国株など）
  return {
    ticker: cleanTicker,
    price: 100, // 米国株のデフォルト価格
    name: ticker,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    source: DATA_SOURCES.FALLBACK,
    isStock: true,
    isMutualFund: false
  };
}

/**
 * キャッシュから銘柄データを取得または保存する
 * @param {string} ticker - ティッカーシンボル
 * @param {Object|null} data - 保存するデータ（nullの場合は取得）
 * @returns {Object|null} 取得したデータまたはnull
 */
function cacheStockData(ticker, data = null) {
  const cacheKey = `stock_data_${ticker}`;
  
  // データをキャッシュに保存
  if (data !== null) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
      return data;
    } catch (e) {
      console.error('キャッシュ保存エラー:', e);
      return data;
    }
  }
  
  // キャッシュからデータを取得
  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const parsedCache = JSON.parse(cachedData);
      const cacheTime = new Date(parsedCache.timestamp);
      const now = new Date();
      
      // キャッシュが有効期限内かチェック
      if (now.getTime() - cacheTime.getTime() < CACHE_DURATION) {
        console.log(`キャッシュからデータを取得: ${ticker}`);
        return parsedCache.data;
      }
    }
  } catch (e) {
    console.error('キャッシュ取得エラー:', e);
  }
  
  return null;
}

/**
 * 銘柄データを取得する主要関数（キャッシュ機能付き）
 * @param {string} ticker - ティッカーシンボル
 * @param {Object} lastData - 前回のデータ（フォールバック用）
 * @param {boolean} forceRefresh - キャッシュを無視して強制更新するかどうか
 * @returns {Promise<Object>} 銘柄データ
 */
export async function fetchStockData(ticker, lastData = null, forceRefresh = false) {
  // キャッシュからデータを取得（強制更新でない場合）
  if (!forceRefresh) {
    const cachedData = cacheStockData(ticker);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // 銘柄タイプを判定
  const is_mutual_fund = isMutualFund(ticker);
  const is_japanese_stock = isJapaneseStock(ticker);
  
  try {
    let resultData;
    
    // 1. 投資信託の場合
    if (is_mutual_fund) {
      console.log(`投資信託データを取得: ${ticker}`);
      
      const fundCode = ticker.replace(/\.T$/, '').replace(/C$/i, '');
      const response = await axios.get(API_ENDPOINTS.MUTUAL_FUND, {
        params: { code: fundCode },
        timeout: TIMEOUT.MUTUAL_FUND
      });
      
      if (response.data.success && response.data.data) {
        resultData = response.data.data;
      } else {
        throw new Error('投資信託データの取得に失敗しました');
      }
    }
    // 2. 日本株の場合
    else if (is_japanese_stock) {
      console.log(`日本株データを取得: ${ticker}`);
      
      const stockCode = ticker.replace(/\.T$/, '');
      const response = await axios.get(API_ENDPOINTS.JP_STOCK, {
        params: { code: stockCode },
        timeout: TIMEOUT.JP_STOCK
      });
      
      if (response.data.success && response.data.data) {
        resultData = response.data.data;
      } else {
        throw new Error('日本株データの取得に失敗しました');
      }
    }
    // 3. それ以外の銘柄（米国株など - Alpacaプロキシを使用）
    else {
      console.log(`米国株データを取得: ${ticker}`);
      
      // 既存のAlpacaプロキシがあれば、それを使用します
      // このコードでは、米国株データの取得方法は既存のものを使用するものとします
      throw new Error('サポートされていない銘柄タイプです');
    }
    
    // データをキャッシュに保存
    const cachedResult = cacheStockData(ticker, resultData);
    return cachedResult;
    
  } catch (error) {
    console.error(`株価データ取得エラー: ${ticker}:`, error);
    
    // フォールバックデータを返す
    const fallbackData = generateFallbackData(ticker, lastData);
    return fallbackData;
  }
}

/**
 * 為替レートを取得する関数
 * @param {string} fromCurrency - 変換元通貨
 * @param {string} toCurrency - 変換先通貨
 * @param {boolean} forceRefresh - キャッシュを無視して強制更新するかどうか
 * @returns {Promise<Object>} 為替レート情報
 */
export async function fetchExchangeRate(fromCurrency = 'USD', toCurrency = 'JPY', forceRefresh = false) {
  // キャッシュキー
  const cacheKey = `exchange_rate_${fromCurrency}_${toCurrency}`;
  
  // キャッシュからデータを取得（強制更新でない場合）
  if (!forceRefresh) {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const cacheTime = new Date(parsedCache.timestamp);
        const now = new Date();
        
        // キャッシュが有効期限内かチェック
        if (now.getTime() - cacheTime.getTime() < CACHE_DURATION) {
          console.log(`キャッシュから為替レートを取得: ${fromCurrency}/${toCurrency}`);
          return parsedCache.data;
        }
      }
    } catch (e) {
      console.error('為替レートキャッシュ取得エラー:', e);
    }
  }
  
  try {
    console.log(`為替レートを取得: ${fromCurrency}/${toCurrency}`);
    
    // exchangerate.hostを使用（既存のプロキシ）
    const response = await axios.get(API_ENDPOINTS.EXCHANGE_RATE, {
      params: {
        base: fromCurrency,
        symbols: toCurrency
      },
      timeout: TIMEOUT.EXCHANGE_RATE
    });
    
    if (response.data.success && response.data.data && response.data.data.rate) {
      const rateData = response.data.data;
      
      // データをキャッシュに保存
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: rateData,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.error('為替レートキャッシュ保存エラー:', e);
      }
      
      return rateData;
    }
    
    throw new Error('為替レートの取得に失敗しました');
    
  } catch (error) {
    console.error(`為替レート取得エラー:`, error);
    
    // フォールバック値を返す
    const defaultRate = fromCurrency === 'USD' && toCurrency === 'JPY' ? 155.0 : 1.0;
    
    return {
      rate: defaultRate,
      source: DATA_SOURCES.FALLBACK,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * 複数銘柄の市場データを一括で更新する関数
 * @param {Array} assets - 資産の配列
 * @param {boolean} forceRefresh - キャッシュを無視して強制更新するかどうか
 * @returns {Promise<Object>} 更新された資産と統計情報
 */
export async function updateMarketData(assets, forceRefresh = false) {
  if (!assets || assets.length === 0) {
    return { 
      assets: [], 
      stats: {}, 
      errors: [] 
    };
  }
  
  const updatedAssets = [...assets];
  const stats = {
    [DATA_SOURCES.YAHOO_JAPAN]: { total: 0, stocks: 0, funds: 0 },
    [DATA_SOURCES.MINKABU]: { total: 0, stocks: 0, funds: 0 },
    [DATA_SOURCES.KABUTAN]: { total: 0 },
    [DATA_SOURCES.TOUSHIN_LIB]: { total: 0 },
    [DATA_SOURCES.MORNINGSTAR]: { total: 0 },
    [DATA_SOURCES.FALLBACK]: { total: 0, stocks: 0, funds: 0 }
  };
  const errors = [];
  
  // 為替レートを取得
  let exchangeRate = null;
  try {
    exchangeRate = await fetchExchangeRate('USD', 'JPY', forceRefresh);
  } catch (error) {
    console.error('為替レート取得エラー:', error);
    exchangeRate = {
      rate: 155.0,
      source: DATA_SOURCES.FALLBACK,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // アプリケーションパフォーマンスのために、同時ではなく順次処理
  for (let i = 0; i < updatedAssets.length; i++) {
    const asset = updatedAssets[i];
    
    try {
      // 最新の市場データを取得
      const marketData = await fetchStockData(asset.ticker, asset, forceRefresh);
      
      // データソースの統計を更新
      if (marketData.source) {
        if (!stats[marketData.source]) {
          stats[marketData.source] = { total: 0, stocks: 0, funds: 0 };
        }
        
        stats[marketData.source].total++;
        
        if (marketData.isMutualFund) {
          stats[marketData.source].funds = (stats[marketData.source].funds || 0) + 1;
        } else {
          stats[marketData.source].stocks = (stats[marketData.source].stocks || 0) + 1;
        }
      }
      
      // 資産データを更新
      updatedAssets[i] = {
        ...asset,
        price: marketData.price || asset.price,
        name: marketData.name || asset.name,
        lastUpdated: marketData.lastUpdated || new Date().toISOString(),
        source: marketData.source || DATA_SOURCES.FALLBACK,
        isStock: marketData.isStock !== undefined ? marketData.isStock : asset.isStock,
        isMutualFund: marketData.isMutualFund !== undefined ? marketData.isMutualFund : asset.isMutualFund,
        priceLabel: marketData.priceLabel || (marketData.isMutualFund ? '基準価額' : '株価')
      };
      
      // 順次処理時の負荷軽減のための遅延
      if (i < updatedAssets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
    } catch (error) {
      console.error(`市場データ更新エラー: ${asset.ticker}:`, error);
      errors.push({
        ticker: asset.ticker,
        message: error.message
      });
      
      // エラー時はソースをフォールバックに変更
      updatedAssets[i] = {
        ...asset,
        source: DATA_SOURCES.FALLBACK,
        lastUpdated: new Date().toISOString()
      };
      
      stats[DATA_SOURCES.FALLBACK].total++;
      if (asset.isMutualFund) {
        stats[DATA_SOURCES.FALLBACK].funds = (stats[DATA_SOURCES.FALLBACK].funds || 0) + 1;
      } else {
        stats[DATA_SOURCES.FALLBACK].stocks = (stats[DATA_SOURCES.FALLBACK].stocks || 0) + 1;
      }
    }
  }
  
  return {
    assets: updatedAssets,
    exchangeRate,
    stats,
    errors
  };
}

/**
 * キャッシュをクリアする関数
 * @param {string|null} ticker - 特定の銘柄のキャッシュをクリアする場合に指定
 */
export function clearCache(ticker = null) {
  if (ticker) {
    // 特定の銘柄のキャッシュをクリア
    const cacheKey = `stock_data_${ticker}`;
    localStorage.removeItem(cacheKey);
    console.log(`キャッシュをクリアしました: ${ticker}`);
  } else {
    // 株価データ関連のキャッシュをすべてクリア
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('stock_data_') || key.startsWith('exchange_rate_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`${keysToRemove.length}件のキャッシュをクリアしました`);
  }
}

/**
 * 通知メッセージを生成する関数
 * @param {Object} stats - データソース統計情報
 * @param {Array} errors - エラー情報
 * @returns {Array} 通知メッセージの配列
 */
export function generateNotifications(stats, errors) {
  const notifications = [];
  
  // 成功通知
  const successSources = Object.entries(stats)
    .filter(([source, stat]) => source !== DATA_SOURCES.FALLBACK && stat.total > 0)
    .map(([source, stat]) => {
      if (stat.stocks > 0 && stat.funds > 0) {
        return `${source}: ${stat.total}件（日本株: ${stat.stocks}件、投資信託: ${stat.funds}件）`;
      } else {
        return `${source}: ${stat.total}件`;
      }
    });
  
  if (successSources.length > 0) {
    notifications.push({
      message: `市場データを更新しました: ${successSources.join(', ')}`,
      type: stats[DATA_SOURCES.FALLBACK].total > 0 ? 'warning' : 'success'
    });
  }
  
  // フォールバック通知
  if (stats[DATA_SOURCES.FALLBACK].total > 0) {
    notifications.push({
      message: `${stats[DATA_SOURCES.FALLBACK].total}件の銘柄データは取得できず、フォールバック値を使用しています`,
      type: 'warning'
    });
  }
  
  // エラー通知
  if (errors.length > 0) {
    // 最初の3件のみ詳細を表示
    errors.slice(0, 3).forEach(error => {
      notifications.push({
        message: `データ取得エラー（${error.ticker}）: ${error.message}`,
        type: 'error'
      });
    });
    
    if (errors.length > 3) {
      notifications.push({
        message: `...ほか${errors.length - 3}件のエラー`,
        type: 'error'
      });
    }
  }
  
  return notifications;
}

export default {
  fetchStockData,
  fetchExchangeRate,
  updateMarketData,
  clearCache,
  generateNotifications,
  isMutualFund,
  isJapaneseStock,
  generateFallbackData,
  DATA_SOURCES
};
