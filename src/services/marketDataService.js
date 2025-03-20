/**
 * 銘柄データを取得 - Alpha Vantageをプライマリソースとして使用
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
  
  try {
    // Alpha Vantage APIからデータ取得を試みる（プライマリソース）
    console.log(`Attempting to fetch data for ${ticker} from Alpha Vantage at: ${ALPHA_VANTAGE_URL}`);
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: ticker
      },
      timeout: 15000, // 15秒タイムアウト設定
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    // APIレート制限のチェック
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      console.warn(`Alpha Vantage API rate limit reached for ${ticker}`);
      return {
        success: false,
        message: 'Alpha Vantage APIのリクエスト制限に達しました。しばらく待ってから再試行してください。',
        error: true,
        errorType: 'RATE_LIMIT',
        data: generateFallbackTickerData(ticker).data
      };
    }
    
    // レスポンスの検証（より堅牢な検証）
    if (response.data && response.data['Global Quote']) {
      const quoteData = response.data['Global Quote'];
      
      // 価格データが存在するか確認
      if (quoteData && quoteData['05. price']) {
        const price = parseFloat(quoteData['05. price']);
        
        // 価格が有効な数値かチェック
        if (!isNaN(price) && price > 0) {
          console.log(`Successfully fetched data for ${ticker} from Alpha Vantage: $${price}`);
          
          // 銘柄名の取得を試みる（短めのフォールバック処理）
          let name = ticker;
          try {
            // もし時間とAPIリクエスト数に余裕があれば
            // SYMBOL_SEARCH機能で銘柄名を取得することも可能
            // ここでは単純にティッカーを名前として使用
          } catch (error) {
            console.log(`Could not fetch name for ${ticker}, using ticker as name`);
          }
          
          // ファンドタイプを判定（ETFリストを優先）
          const fundType = determineFundType(ticker, name);
          console.log(`Determined fund type for ${ticker}: ${fundType}`);
          
          // 個別株かどうかを判定（ETFリストに含まれる場合は必ず個別株ではない）
          const isStock = fundType === FUND_TYPES.STOCK;
          
          // 手数料情報を取得
          const feeInfo = estimateAnnualFee(ticker, name);
          
          // 基本情報を取得
          const fundInfo = extractFundInfo(ticker, name);
          
          // 配当情報の取得
          const dividendInfo = estimateDividendYield(ticker, name);
          
          // 配当情報を確定（ETFリストを優先）
          const hasDividend = determineHasDividend(ticker);
          
          // 通貨判定
          const currency = fundInfo.currency || (ticker.includes('.T') ? 'JPY' : 'USD');
          
          // 手数料情報（個別株は常に0%）
          const annualFee = isStock ? 0 : feeInfo.fee;
          
          return {
            success: true,
            data: {
              id: ticker,
              name: name,
              ticker: ticker,
              exchangeMarket: ticker.includes('.T') ? 'Japan' : 'US',
              price: price,
              currency: currency,
              holdings: 0,
              annualFee: annualFee,
              fundType: fundType,
              isStock: isStock,
              feeSource: isStock ? '個別株' : feeInfo.source,
              feeIsEstimated: isStock ? false : feeInfo.isEstimated,
              region: fundInfo.region || 'unknown',
              lastUpdated: new Date().toISOString(),
              source: 'Alpha Vantage',
              // 配当情報
              dividendYield: dividendInfo.yield,
              hasDividend: hasDividend,
              dividendFrequency: dividendInfo.dividendFrequency,
              dividendIsEstimated: dividendInfo.isEstimated
            },
            message: '正常に取得しました'
          };
        } else {
          console.warn(`Invalid price value for ${ticker}: ${price}. Using fallback.`);
        }
      } else {
        console.warn(`Missing price data for ${ticker} in response. Using fallback.`);
      }
    } else if (response.data && response.data['Error Message']) {
      // Alpha Vantage のエラーメッセージがある場合
      console.error(`Alpha Vantage API error for ${ticker}: ${response.data['Error Message']}`);
      return {
        success: false,
        message: `銘柄情報の取得エラー: ${response.data['Error Message']}`,
        error: true,
        errorType: 'API_ERROR',
        data: generateFallbackTickerData(ticker).data
      };
    }
    
    console.log(`No valid data found for ${ticker} from Alpha Vantage, using fallback`);
    // データが適切な形式でない場合、フォールバック値を使用
    return generateFallbackTickerData(ticker);
    
  } catch (error) {
    console.error(`Alpha Vantage API error for ${ticker}:`, error.message);
    
    // エラーの種類を特定して適切なメッセージを生成
    let errorType = 'UNKNOWN';
    let errorMessage = 'データの取得に失敗しました。';
    
    if (error.response) {
      // サーバーからのレスポンスがある場合
      if (error.response.status === 429) {
        errorType = 'RATE_LIMIT';
        errorMessage = 'APIリクエスト制限に達しました。しばらく待ってから再試行してください。';
      } else {
        errorType = 'API_ERROR';
        errorMessage = `API エラー (${error.response.status}): ${error.response.data?.message || error.message}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT';
      errorMessage = 'リクエストのタイムアウトが発生しました。ネットワーク接続を確認してください。';
    } else if (error.code === 'ERR_NETWORK') {
      errorType = 'NETWORK';
      errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    }
    
    // エラー詳細を含むレスポンス
    const fallbackResult = generateFallbackTickerData(ticker);
    
    return {
      ...fallbackResult,
      errorType: errorType,
      message: errorMessage
    };
  }
}
