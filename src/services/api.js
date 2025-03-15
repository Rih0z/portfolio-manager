import axios from 'axios';

// 環境に応じたAPIエンドポイント
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/v7/finance/quote'  // プロキシ経由
  : '/.netlify/functions/yahoo-finance-proxy'; // 本番環境（Netlify Functions経由）

/**
 * Yahoo FinanceからティッカーシンボルのデータFetch
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise} - 銘柄情報
 */
export async function fetchTickerData(ticker) {
  try {
    // Yahoo Finance APIへリクエスト
    const response = await axios.get(API_BASE_URL, {
      params: {
        symbols: ticker
      }
    });
    
    if (response.data && 
        response.data.quoteResponse && 
        response.data.quoteResponse.result && 
        response.data.quoteResponse.result.length > 0) {
      
      const data = response.data.quoteResponse.result[0];
      
      return {
        id: data.symbol,
        name: data.shortName || data.longName || ticker,
        ticker: data.symbol,
        exchangeMarket: data.fullExchangeName?.includes('Tokyo') ? 'Japan' : 'US',
        price: data.regularMarketPrice,
        currency: data.currency,
        holdings: 0,  // デフォルトは0
        annualFee: 0.3  // デフォルトの手数料率
      };
    }
    
    throw new Error('銘柄情報が見つかりませんでした');
  } catch (error) {
    console.error('Yahoo Finance API error:', error);
    
    // エラー時のフォールバック（ダミーデータ）
    return {
      id: ticker,
      name: ticker,
      ticker: ticker,
      exchangeMarket: ticker.includes('.T') ? 'Japan' : 'US',
      price: Math.floor(Math.random() * 1000) + 100,  // 100〜1100のランダム価格
      currency: ticker.includes('.T') ? 'JPY' : 'USD',
      holdings: 0,
      annualFee: 0.3
    };
  }
}

/**
 * 為替レートを取得する
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Promise} - 為替レート
 */
export async function fetchExchangeRate(fromCurrency, toCurrency) {
  try {
    // 同一通貨の場合は1を返す
    if (fromCurrency === toCurrency) {
      return {
        rate: 1,
        source: 'Direct'
      };
    }
    
    // 為替ペアを構築
    const pair = `${fromCurrency}${toCurrency}=X`;
    
    // Yahoo Finance APIから為替データ取得
    const response = await axios.get(API_BASE_URL, {
      params: {
        symbols: pair
      }
    });
    
    if (response.data && 
        response.data.quoteResponse && 
        response.data.quoteResponse.result && 
        response.data.quoteResponse.result.length > 0) {
      
      const data = response.data.quoteResponse.result[0];
      
      if (data.regularMarketPrice) {
        return {
          rate: data.regularMarketPrice,
          source: 'Yahoo Finance'
        };
      }
    }
    
    // データが取得できない場合はデフォルト値を返す
    throw new Error('為替レートの取得に失敗しました');
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    
    // USD/JPYのデフォルト値
    if (fromCurrency === 'USD' && toCurrency === 'JPY') {
      return {
        rate: 150.0,
        source: 'Default'
      };
    }
    
    // JPY/USDのデフォルト値
    if (fromCurrency === 'JPY' && toCurrency === 'USD') {
      return {
        rate: 1/150.0,
        source: 'Default'
      };
    }
    
    // その他の通貨ペアの場合は1を返す
    return {
      rate: 1,
      source: 'Default'
    };
  }
}