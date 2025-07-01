/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/services/marketDataService.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-11 17:00:00 
 * 
 * 更新履歴: 
 * - 2025-05-11 17:00:00 Koki Riho 初回作成
 * - 2025-05-12 10:30:00 外部APIサーバー利用に修正
 * - 2025-05-19 12:15:00 System Admin AWS環境対応に修正
 * 
 * 説明: 
 * 市場データ取得のための集約API呼び出しを提供するサービス。
 * 株価データ、為替レート、ファンド情報、配当データなどを
 * 一元的に取得する機能を提供する。
 */

import { getApiEndpoint } from '../utils/envUtils';
import { fetchWithRetry, formatErrorResponse, generateFallbackData, TIMEOUT } from '../utils/apiUtils';

// 通貨換算レート取得
export const fetchExchangeRate = async (fromCurrency = 'USD', toCurrency = 'JPY', refresh = false) => {
  // 為替レートのデフォルト値を定義
  const getDefaultRate = () => {
    if (fromCurrency === 'USD' && toCurrency === 'JPY') return 150.0;
    if (fromCurrency === 'JPY' && toCurrency === 'USD') return 1/150.0;
    if (fromCurrency === 'EUR' && toCurrency === 'JPY') return 160.0;
    if (fromCurrency === 'GBP' && toCurrency === 'JPY') return 185.0;
    return 1.0;
  };
  
  // キャッシュチェック（タイムアウト時の高速フォールバック用）
  const cacheKey = `exchangeRate_${fromCurrency}_${toCurrency}`;
  const cached = localStorage.getItem(cacheKey);
  
  try {
    const endpoint = await getApiEndpoint('api/market-data');
    
    console.log(`為替レート取得開始: ${fromCurrency}/${toCurrency}, refresh: ${refresh}`);
    
    const response = await fetchWithRetry(
      endpoint,
      {
        type: 'exchange-rate',
        base: fromCurrency,
        target: toCurrency,
        refresh: refresh ? 'true' : 'false'
      },
      TIMEOUT.EXCHANGE_RATE
    );
    
    // バックエンドから返されたデータの形式をチェック
    if (response.success && response.data) {
      const pairKey = `${fromCurrency}-${toCurrency}`;
      const exchangeData = response.data[pairKey];
      
      if (exchangeData) {
        // 警告があるかチェック
        if (exchangeData.isDefault || exchangeData.isStale || exchangeData.error) {
          console.warn(`為替レート警告 (${pairKey}):`, {
            isDefault: exchangeData.isDefault,
            isStale: exchangeData.isStale,
            error: exchangeData.error
          });
        }
        
        // フロントエンドが期待する形式に変換
        return {
          success: true,
          rate: exchangeData.rate,
          source: exchangeData.isDefault ? 'Default' : 'API',
          lastUpdated: exchangeData.lastUpdated || new Date().toISOString(),
          isDefault: exchangeData.isDefault,
          isStale: exchangeData.isStale,
          warnings: response.warnings
        };
      }
    }
    
    // データが期待通りでない場合は元の形式をそのまま返す
    return response;
  } catch (error) {
    console.error(`Error fetching exchange rate ${fromCurrency}/${toCurrency}:`, error);
    
    // タイムアウトエラーの特別処理
    const isTimeoutError = error.code === 'ECONNABORTED' || 
                          error.message?.includes('timeout') || 
                          error.message?.includes('ETIMEDOUT');
    
    let fallbackSource = 'Fallback';
    let fallbackRate = getDefaultRate();
    let fallbackLastUpdated = new Date().toISOString();
    
    // キャッシュからフォールバックデータを取得を試みる
    if (cached && isTimeoutError) {
      try {
        const cachedData = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(cachedData.timestamp).getTime();
        
        // 7日以内のキャッシュデータは使用可能
        if (cacheAge < 7 * 24 * 60 * 60 * 1000 && cachedData.rate && cachedData.rate > 0) {
          console.log(`タイムアウトのためキャッシュデータを使用: ${cachedData.rate} (キャッシュ年齢: ${Math.round(cacheAge / 1000 / 60 / 60)}時間)`);
          fallbackRate = cachedData.rate;
          fallbackSource = 'Cached Data (Timeout Fallback)';
          fallbackLastUpdated = cachedData.lastUpdated || fallbackLastUpdated;
        }
      } catch (cacheError) {
        console.warn('キャッシュデータの読み込みに失敗:', cacheError.message);
      }
    }
    
    const errorMessage = isTimeoutError 
      ? '為替レートの取得がタイムアウトしました。デフォルト値を使用します。'
      : '為替レートの取得に失敗しました。デフォルト値を使用します。';
    
    // フォールバック値を返す
    return {
      success: false,
      error: true,
      message: errorMessage,
      errorType: isTimeoutError ? 'TIMEOUT' : 'API_ERROR',
      ...formatErrorResponse(error),
      rate: fallbackRate,
      source: fallbackSource,
      lastUpdated: fallbackLastUpdated,
      isDefault: fallbackSource === 'Fallback',
      isStale: fallbackSource.includes('Cached')
    };
  }
};

// 単一銘柄データ取得
export const fetchStockData = async (ticker, refresh = false) => {
  // 銘柄タイプに基づくタイムアウト設定
  let type = 'us-stock';
  let timeout = TIMEOUT.US_STOCK;
  
  // 日本株判定（数字4桁 + オプションの.T）
  if (/^\d{4}(\.T)?$/.test(ticker)) {
    type = 'jp-stock';
    timeout = TIMEOUT.JP_STOCK;
  }
  // 投資信託判定（複数のパターンに対応）
  // パターン1: 8桁の数字（例：03311187）
  // パターン2: 7桁の数字+アルファベット1文字（例：0331418A）
  // パターン3: アルファベット+数字の組み合わせ（例：9C31116A）
  else if (/^(\d{8}|\d{7}[A-Z]|[A-Z0-9]{8})$/i.test(ticker)) {
    type = 'mutual-fund';
    timeout = TIMEOUT.MUTUAL_FUND;
  }
  
  try {
    console.log(`Attempting to fetch data for ${ticker} from Market Data API`);
    const endpoint = await getApiEndpoint('api/market-data');
    const response = await fetchWithRetry(
      endpoint,
      {
        type,
        symbols: ticker,
        refresh: refresh ? 'true' : 'false'
      },
      timeout
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching ${ticker} from Market Data API:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
    
    // フォールバック処理
    return {
      success: false,
      ...formatErrorResponse(error, ticker),
      // フォールバックデータも含める
      data: {
        [ticker]: generateFallbackData(ticker)
      },
      source: 'Fallback'
    };
  }
};

// 複数銘柄データ一括取得
export const fetchMultipleStocks = async (tickers, refresh = false) => {
  if (!tickers || tickers.length === 0) {
    return { success: true, data: {} };
  }
  
  // 銘柄をタイプ別に分類
  const jpStocks = tickers.filter(ticker => /^\d{4}(\.T)?$/.test(ticker));
  const mutualFunds = tickers.filter(ticker => /^(\d{8}|\d{7}[A-Z]|[A-Z0-9]{8})$/i.test(ticker));
  const usStocks = tickers.filter(ticker => 
    !(/^\d{4}(\.T)?$/.test(ticker)) && !(/^(\d{8}|\d{7}[A-Z]|[A-Z0-9]{8})$/i.test(ticker))
  );
  
  const results = {
    success: true,
    data: {},
    errors: [],
    sources: {}
  };
  
  // 並列にAPI呼び出し
  const requests = [];
  
  if (usStocks.length > 0) {
    requests.push(
      fetchStockBatch('us-stock', usStocks, refresh, TIMEOUT.US_STOCK)
      .then(data => {
        Object.assign(results.data, data.data || {});
        if (data.errors) results.errors = [...results.errors, ...data.errors];
        if (data.source) {
          results.sources[data.source] = (results.sources[data.source] || 0) + Object.keys(data.data || {}).length;
        }
      })
      .catch(error => {
        console.error('Error fetching US stocks:', error);
        // フォールバック処理
        usStocks.forEach(ticker => {
          results.data[ticker] = generateFallbackData(ticker);
          results.sources['Fallback'] = (results.sources['Fallback'] || 0) + 1;
        });
      })
    );
  }
  
  if (jpStocks.length > 0) {
    requests.push(
      fetchStockBatch('jp-stock', jpStocks, refresh, TIMEOUT.JP_STOCK)
      .then(data => {
        Object.assign(results.data, data.data || {});
        if (data.errors) results.errors = [...results.errors, ...data.errors];
        if (data.source) {
          results.sources[data.source] = (results.sources[data.source] || 0) + Object.keys(data.data || {}).length;
        }
      })
      .catch(error => {
        console.error('Error fetching JP stocks:', error);
        // フォールバック処理
        jpStocks.forEach(ticker => {
          results.data[ticker] = generateFallbackData(ticker);
          results.sources['Fallback'] = (results.sources['Fallback'] || 0) + 1;
        });
      })
    );
  }
  
  if (mutualFunds.length > 0) {
    requests.push(
      fetchStockBatch('mutual-fund', mutualFunds, refresh, TIMEOUT.MUTUAL_FUND)
      .then(data => {
        Object.assign(results.data, data.data || {});
        if (data.errors) results.errors = [...results.errors, ...data.errors];
        if (data.source) {
          results.sources[data.source] = (results.sources[data.source] || 0) + Object.keys(data.data || {}).length;
        }
      })
      .catch(error => {
        console.error('Error fetching mutual funds:', error);
        // フォールバック処理
        mutualFunds.forEach(ticker => {
          results.data[ticker] = generateFallbackData(ticker);
          results.sources['Fallback'] = (results.sources['Fallback'] || 0) + 1;
        });
      })
    );
  }
  
  // すべてのリクエストが完了するのを待つ
  await Promise.all(requests);
  
  // 結果をソースごとに集計
  results.sourcesSummary = Object.entries(results.sources)
    .map(([source, count]) => `${source}: ${count}件`)
    .join(', ');
  
  return results;
};

// バッチでのデータ取得（内部関数）
const fetchStockBatch = async (type, symbols, refresh, timeout) => {
  try {
    const endpoint = await getApiEndpoint('api/market-data');
    return await fetchWithRetry(
      endpoint,
      {
        type,
        symbols: symbols.join(','),
        refresh: refresh ? 'true' : 'false'
      },
      timeout
    );
  } catch (error) {
    console.error(`Error in fetchStockBatch (${type}):`, error);
    throw error;
  }
};

// ステータス取得（管理者用）
export const fetchApiStatus = async () => {
  try {
    const endpoint = await getApiEndpoint('admin/status');
    const response = await fetchWithRetry(
      endpoint,
      {
        // APIキーはAWSから動的に管理されるため、ここでは指定しない
      }
    );
    return response;
  } catch (error) {
    console.error('Error fetching API status:', error);
    return { success: false, error: formatErrorResponse(error) };
  }
};

export default {
  fetchExchangeRate,
  fetchStockData,
  fetchMultipleStocks,
  fetchApiStatus
};
