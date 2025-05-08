/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: functions/alternative-exchangerate-proxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2023/04/20 16:45:00 
 * 
 * 更新履歴: 
 * - 2023/04/20 16:45:00 Koki Riho 初回作成
 * - 2023/05/05 14:30:00 Yuta Sato 複数のデータソースを追加
 * 
 * 説明: 
 * 複数の為替レートAPIをカスケード的に利用する代替為替レートプロキシ。
 * 主要な為替レートAPIが利用できない場合のフォールバックとして機能する。
 * exchangerate.host、openexchangerates.org、fixer.io、ハードコードされた値の順に試行し、
 * 最初に成功したソースからのデータを返す。常に何らかのレート値を返すことを保証する。
 */
const axios = require('axios');

// デフォルト為替レート
const DEFAULT_EXCHANGE_RATE = 150.0;

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  // パラメータを取得
  let base = event.queryStringParameters?.base || 'USD';
  let symbols = event.queryStringParameters?.symbols || 'JPY';
  
  // 要求されたオリジナルの通貨ペアを記録
  const originalBase = base;
  const originalSymbols = symbols;
  
  // JPY/USDの場合のフラグ
  const isJpyToUsd = base === 'JPY' && symbols === 'USD';
  
  // JPY/USDの場合はUSD/JPYとして取得して後で逆数を計算
  if (isJpyToUsd) {
    base = 'USD';
    symbols = 'JPY';
  }
  
  // 環境変数からデフォルト値を取得、または固定値を使用
  const defaultRate = process.env.DEFAULT_EXCHANGE_RATE 
    ? parseFloat(process.env.DEFAULT_EXCHANGE_RATE) 
    : DEFAULT_EXCHANGE_RATE;
    
  // リクエスト情報をログ出力
  console.log(`Exchange rate API request for ${originalBase}/${originalSymbols} (converted to ${base}/${symbols} for API call)`);
  
  // APIソースごとに処理を試みる
  try {
    // 1. まず、exchangerate.hostを試す
    try {
      console.log('Trying exchangerate.host API...');
      const response = await axios.get('https://api.exchangerate.host/latest', {
        params: {
          base: base,
          symbols: symbols
        },
        timeout: 5000
      });
      
      const data = response.data;
      
      if (data && data.rates && data.rates[symbols]) {
        // レートを取得
        let rate = data.rates[symbols];
        
        // JPY/USDの場合は逆数を計算
        if (isJpyToUsd) {
          rate = 1 / rate;
        }
        
        console.log(`exchangerate.host API successful! Rate: ${rate}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              rate: rate,
              source: 'exchangerate.host',
              base: originalBase,
              currency: originalSymbols,
              timestamp: data.date || new Date().toISOString()
            }
          })
        };
      }
      
      console.warn('exchangerate.host API returned no data for the requested currency pair');
      throw new Error('No data in exchangerate.host response');
    } catch (error1) {
      console.warn(`exchangerate.host API failed: ${error1.message}`);
      
      // 2. 次に、openexchangerates.orgを試す
      try {
        console.log('Trying open exchange rates API...');
        // 注: APP_IDが必要、環境変数があれば使用
        const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
        
        if (!appId) {
          throw new Error('OPEN_EXCHANGE_RATES_APP_ID not configured');
        }
        
        const response = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD&symbols=${symbols}`);
        
        const data = response.data;
        
        if (data && data.rates && data.rates[symbols]) {
          // レートを取得 (always USD based)
          let rate = data.rates[symbols];
          
          // USD以外のベース通貨の場合は計算が必要
          if (base !== 'USD' && data.rates[base]) {
            // convert through USD
            rate = rate / data.rates[base];
          }
          
          // JPY/USDの場合は逆数を計算
          if (isJpyToUsd) {
            rate = 1 / rate;
          }
          
          console.log(`openexchangerates.org API successful! Rate: ${rate}`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: {
                rate: rate,
                source: 'openexchangerates.org',
                base: originalBase,
                currency: originalSymbols,
                timestamp: new Date(data.timestamp * 1000).toISOString()
              }
            })
          };
        }
        
        throw new Error('No data in openexchangerates.org response');
      } catch (error2) {
        console.warn(`openexchangerates.org API failed: ${error2.message}`);
        
        // 3. 次に、fixer.ioを試す
        try {
          console.log('Trying fixer.io API...');
          // 注: APIキーが必要、環境変数があれば使用
          const apiKey = process.env.FIXER_API_KEY;
          
          if (!apiKey) {
            throw new Error('FIXER_API_KEY not configured');
          }
          
          // 注意: fixerの無料プランはEURベースのみ
          const response = await axios.get(`https://data.fixer.io/api/latest?access_key=${apiKey}&symbols=${base},${symbols}`);
          
          const data = response.data;
          
          if (data && data.success && data.rates && data.rates[symbols] && data.rates[base]) {
            // EUR基準の値から計算
            let rate = data.rates[symbols] / data.rates[base];
            
            // JPY/USDの場合は逆数を計算
            if (isJpyToUsd) {
              rate = 1 / rate;
            }
            
            console.log(`fixer.io API successful! Rate: ${rate}`);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data: {
                  rate: rate,
                  source: 'fixer.io',
                  base: originalBase,
                  currency: originalSymbols,
                  timestamp: new Date(data.timestamp * 1000).toISOString()
                }
              })
            };
          }
          
          throw new Error('No data in fixer.io response');
        } catch (error3) {
          console.warn(`fixer.io API failed: ${error3.message}`);
          
          // 4. 最後に、自前の為替レートを試す
          try {
            console.log('Trying hardcoded exchange rates...');
            // 主要な通貨ペアの最新レート（2025年3月23日時点の想定値）
            const hardcodedRates = {
              'USDJPY': 149.5,
              'JPYUSD': 1/149.5,
              'EURJPY': 160.2,
              'EURUSD': 1.08,
              'GBPUSD': 1.27,
              'GBPJPY': 189.8
            };
            
            const pairKey = `${base}${symbols}`;
            let rate = hardcodedRates[pairKey];
            
            if (!rate) {
              // ハードコードされていない場合はデフォルト値を使用
              rate = (pairKey === 'USDJPY') ? defaultRate : 1.0;
            }
            
            // JPY/USDの場合は逆数を計算
            if (isJpyToUsd) {
              rate = 1 / rate;
            }
            
            console.log(`Using hardcoded exchange rate! Rate: ${rate}`);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data: {
                  rate: rate,
                  source: 'Hardcoded',
                  base: originalBase,
                  currency: originalSymbols,
                  timestamp: new Date().toISOString()
                }
              })
            };
          } catch (error4) {
            // これは失敗しないはずだが、万が一のため
            console.error(`Hardcoded rates also failed: ${error4.message}`);
          }
        }
      }
    }
    
    // すべての方法が失敗した場合、最終的にデフォルト値を使用
    console.warn(`All exchange rate sources failed. Using default fallback value: ${defaultRate}`);
    
    // JPY/USDの場合はデフォルト値の逆数を使用
    let fallbackRate = isJpyToUsd ? (1 / defaultRate) : defaultRate;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `為替レートデータの取得に失敗したため、デフォルト値を使用します`,
        data: {
          rate: fallbackRate,
          source: 'Default Fallback',
          base: originalBase,
          currency: originalSymbols,
          timestamp: new Date().toISOString()
        }
      })
    };
    
  } catch (error) {
    console.error('Unexpected error in exchange rate proxy:', error);
    
    // 完全に予期しないエラーの場合、デフォルト値を使用
    let fallbackRate = isJpyToUsd ? (1 / defaultRate) : defaultRate;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `予期しないエラーが発生したため、デフォルト値を使用します: ${error.message}`,
        data: {
          rate: fallbackRate,
          source: 'Emergency Fallback',
          base: originalBase,
          currency: originalSymbols,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};
