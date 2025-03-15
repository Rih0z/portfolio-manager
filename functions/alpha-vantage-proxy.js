// functions/alpha-vantage-proxy.js

/**
 * Alpha Vantage APIへのプロキシ関数
 * CORSの問題を回避し、APIキーを安全に管理するためのサーバーレス関数
 */
exports.handler = async function(event, context) {
    const axios = require('axios');
    
    // クエリパラメータを取得
    const queryParams = event.queryStringParameters || {};
    
    // APIキーを環境変数から取得（または提供されたものを使用）
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || queryParams.apikey || 'demo';
    
    // 必須パラメータ
    const functionType = queryParams.function;
    
    if (!functionType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'function parameter is required' })
      };
    }
    
    try {
      // パラメータからAPIキーを除外して新しいパラメータオブジェクトを作成
      const params = { ...queryParams };
      if (params.apikey) delete params.apikey;
      
      // APIキーを追加
      params.apikey = apiKey;
      
      // Alpha Vantage APIにリクエスト
      const response = await axios.get('https://www.alphavantage.co/query', {
        params,
        headers: {
          'User-Agent': 'PortfolioManager/1.0'
        }
      });
      
      // CORSヘッダーを追加して結果を返す
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(response.data)
      };
    } catch (error) {
      console.error('Alpha Vantage API error:', error);
      
      // エラーレスポンス
      return {
        statusCode: error.response?.status || 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Failed to fetch data from Alpha Vantage API',
          details: error.response?.data || error.message
        })
      };
    }
  };
  
  // functions/yahoo-finance-proxy.js (更新版)
  
  /**
   * Yahoo Finance APIへのプロキシ関数
   * CORSの問題を回避し、リクエスト制限やIPブロックを軽減するためのサーバーレス関数
   */
  exports.handler = async function(event, context) {
    const axios = require('axios');
    
    try {
      // リクエストからクエリパラメータを取得
      const queryParams = event.queryStringParameters || {};
      
      // シンボルは必須
      if (!queryParams.symbols) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'symbols parameter is required' })
        };
      }
      
      // 複数のYahoo Finance APIエンドポイントをサポート
      const apiPath = queryParams.module || 'v7/finance/quote';
      delete queryParams.module; // クエリから削除
      
      // UA文字列の設定
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      // Yahoo Finance APIにリクエスト
      const response = await axios.get(`https://query1.finance.yahoo.com/${apiPath}`, {
        params: queryParams,
        headers: {
          'User-Agent': userAgent
        }
      });
      
      // CORSヘッダーを追加して結果を返す
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300', // 5分間キャッシュ
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(response.data)
      };
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      
      // エラーレスポンス
      return {
        statusCode: error.response?.status || 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Failed to fetch data from Yahoo Finance API',
          details: error.response?.data || error.message
        })
      };
    }
  };
  
  // functions/mof-exchange-rate-proxy.js
  
  /**
   * 日本の財務省為替レートAPIへのプロキシ関数
   * 公式の為替レートを代替データソースとして使用
   */
  exports.handler = async function(event, context) {
    const axios = require('axios');
    
    try {
      // 財務省の為替レートデータを取得
      // このエンドポイントは実際のAPIではなく、HTMLページなのでスクレイピングが必要
      const response = await axios.get('https://www.mof.go.jp/english/policy/international_policy/reference/feio/index.htm', {
        headers: {
          'User-Agent': 'PortfolioManager/1.0'
        }
      });
      
      // HTMLからデータを抽出（実際の実装ではより堅牢なスクレイピングが必要）
      // 簡易的な実装例
      const html = response.data;
      const ratesData = extractExchangeRatesFromHTML(html);
      
      // CORSヘッダーを追加して結果を返す
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=86400', // 24時間キャッシュ
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ratesData)
      };
    } catch (error) {
      console.error('MOF exchange rate fetch error:', error);
      
      // エラーレスポンス
      return {
        statusCode: error.response?.status || 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Failed to fetch exchange rate data from MOF',
          details: error.message
        })
      };
    }
  };
  
  /**
   * 財務省ページからの為替レートデータ抽出（簡易版）
   * 実際の実装ではより堅牢なHTMLパーサーを使用すべき
   */
  function extractExchangeRatesFromHTML(html) {
    // 注意: これは簡易的な実装例です。実際にはより堅牢なHTMLパーサーを使用して
    // 適切にデータを抽出する必要があります。
    
    // 為替レートのデフォルト値（財務省データの抽出に失敗した場合のフォールバック）
    const defaultRates = {
      'USD/JPY': 150.0,
      'EUR/JPY': 160.0,
      'GBP/JPY': 190.0,
      'AUD/JPY': 95.0,
      'CAD/JPY': 105.0,
      'CHF/JPY': 145.0,
      'CNY/JPY': 20.0,
      'KRW/JPY': 0.1
    };
    
    try {
      // HTMLからテーブルデータを抽出する実装
      // ...実際の抽出ロジック...
      
      // 簡易版では財務省データの抽出は省略し、デフォルト値を返す
      return {
        rates: defaultRates,
        source: 'MOF Fallback',
        lastUpdated: new Date().toISOString(),
        note: 'これはデフォルト値です。実際のデータ抽出に失敗しました。'
      };
    } catch (error) {
      console.error('Exchange rate extraction error:', error);
      return {
        rates: defaultRates,
        source: 'Default Values',
        lastUpdated: new Date().toISOString(),
        error: true,
        note: 'データ抽出中にエラーが発生しました。デフォルト値を使用しています。'
      };
    }
  }