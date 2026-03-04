/**
 * ローカル開発用のマーケットデータサービス
 * 実際のAWSサーバーを使用しながら、エラー時のフォールバックも提供
 */

import { getApiEndpoint } from '../utils/envUtils';
import { fetchWithRetry, formatErrorResponse, generateFallbackData, TIMEOUT } from '../utils/apiUtils';

// モックAPIを使用するかどうか
const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK_API === 'true';

// 開発用のログ出力
const logApiCall = (method: string, params: Record<string, any>, response: any, error: any = null): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`API Call: ${method}`);
    console.log('Parameters:', params);
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Response:', response);
    }
    console.groupEnd();
  }
};

interface ExchangeRateResponse {
  success: boolean;
  rate: number;
  source: string;
  lastUpdated: string;
  error?: boolean;
  message?: string;
}

interface StockDataResponse {
  success: boolean;
  data?: Record<string, any>;
  source?: string;
  message?: string;
  error?: boolean;
}

// 通貨換算レート取得（開発用）
export const fetchExchangeRate = async (fromCurrency: string = 'USD', toCurrency: string = 'JPY', refresh: boolean = false): Promise<ExchangeRateResponse> => {
  if (USE_MOCK) {
    const mockData: ExchangeRateResponse = {
      success: true,
      rate: 150.0,
      source: 'Mock',
      lastUpdated: new Date().toISOString()
    };
    logApiCall('fetchExchangeRate', { fromCurrency, toCurrency }, mockData);
    return mockData;
  }

  try {
    const endpoint = await getApiEndpoint('api/market-data');
    const params = {
      type: 'exchange-rate',
      base: fromCurrency,
      target: toCurrency,
      refresh: refresh ? 'true' : 'false'
    };

    const response = await fetchWithRetry(endpoint, params, TIMEOUT.EXCHANGE_RATE);
    logApiCall('fetchExchangeRate', params, response);
    return response;
  } catch (error: any) {
    logApiCall('fetchExchangeRate', { fromCurrency, toCurrency }, null, error);

    // フォールバック値を返す
    return {
      success: false,
      error: true,
      message: '為替レートの取得に失敗しました',
      ...formatErrorResponse(error),
      rate: fromCurrency === 'USD' && toCurrency === 'JPY' ? 150.0 :
            fromCurrency === 'JPY' && toCurrency === 'USD' ? 1/150.0 : 1.0,
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    };
  }
};

// 単一銘柄データ取得（開発用）
export const fetchStockData = async (ticker: string, refresh: boolean = false): Promise<StockDataResponse> => {
  if (USE_MOCK) {
    const mockData: StockDataResponse = {
      success: true,
      data: {
        [ticker]: {
          ticker,
          price: /^\d{4}(\.T)?$/.test(ticker) ? 2500 : 150,
          currency: /^\d{4}(\.T)?$/.test(ticker) ? 'JPY' : 'USD',
          name: `${ticker} (Mock)`,
          source: 'Mock',
          lastUpdated: new Date().toISOString()
        }
      }
    };
    logApiCall('fetchStockData', { ticker }, mockData);
    return mockData;
  }

  let type: string = 'us-stock';
  let timeout: number = TIMEOUT.US_STOCK;

  if (/^\d{4}(\.T)?$/.test(ticker)) {
    type = 'jp-stock';
    timeout = TIMEOUT.JP_STOCK;
  } else if (/^\d{7}C(\.T)?$/.test(ticker)) {
    type = 'mutual-fund';
    timeout = TIMEOUT.MUTUAL_FUND;
  }

  try {
    const endpoint = await getApiEndpoint('api/market-data');
    const params = {
      type,
      symbols: ticker,
      refresh: refresh ? 'true' : 'false'
    };

    const response = await fetchWithRetry(endpoint, params, timeout);
    logApiCall('fetchStockData', params, response);
    return response;
  } catch (error: any) {
    logApiCall('fetchStockData', { ticker }, null, error);

    return {
      success: false,
      ...formatErrorResponse(error, ticker),
      data: {
        [ticker]: generateFallbackData(ticker)
      },
      source: 'Fallback'
    };
  }
};

// エクスポート
export { fetchMultipleStocks, fetchApiStatus } from './marketDataService';

import { fetchMultipleStocks as _fetchMultipleStocks, fetchApiStatus as _fetchApiStatus } from './marketDataService';

export default {
  fetchExchangeRate,
  fetchStockData,
  fetchMultipleStocks: _fetchMultipleStocks,
  fetchApiStatus: _fetchApiStatus
};
