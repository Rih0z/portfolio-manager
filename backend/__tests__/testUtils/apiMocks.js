/**
 * テスト用モックヘルパー - API モックと関連ユーティリティ
 * 
 * @file __tests__/testUtils/apiMocks.js
 * @updated 2025-05-15 - モック機能強化、エラーハンドリング改善
 * @updated 2025-05-20 - クエリパラメータマッチング改善
 * @updated 2025-05-21 - バグ修正: ヘッダー処理を改善し、テスト互換性を強化
 */

const nock = require('nock');

// APIキーと関連設定の取得ヘルパー
const getConfigValue = (envVar, defaultValue) => process.env[envVar] || defaultValue;

// API設定の取得
const API_CONFIG = {
  yahooFinance: {
    apiKey: getConfigValue('YAHOO_FINANCE_API_KEY', 'test-api-key'),
    apiHost: getConfigValue('YAHOO_FINANCE_API_HOST', 'yh-finance.p.rapidapi.com')
  },
  exchangeRate: {
    apiKey: getConfigValue('EXCHANGE_RATE_API_KEY', 'test-api-key'),
    apiUrl: getConfigValue('EXCHANGE_RATE_API_URL', 'https://api.exchangerate.host')
  }
};

// テストデータのエクスポート
const TEST_DATA = {
  samplePortfolio: {
    name: 'Test Portfolio',
    holdings: [
      { symbol: 'AAPL', shares: 10, cost: 150.0 },
      { symbol: '7203', shares: 100, cost: 2000 }
    ]
  },
  // 市場データ
  marketData: {
    usStocks: {
      AAPL: {
        ticker: 'AAPL',
        price: 190.5,
        change: 2.3,
        changePercent: 1.2,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      },
      MSFT: {
        ticker: 'MSFT',
        price: 310.75,
        change: 5.25,
        changePercent: 1.7,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      },
      GOOGL: {
        ticker: 'GOOGL',
        price: 175.25,
        change: -0.8,
        changePercent: -0.45,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      }
    },
    jpStocks: {
      '7203': {
        ticker: '7203',
        price: 2500,
        change: 50,
        changePercent: 2.0,
        currency: 'JPY',
        lastUpdated: new Date().toISOString()
      },
      '9984': {
        ticker: '9984',
        price: 8750,
        change: -120,
        changePercent: -1.35,
        currency: 'JPY',
        lastUpdated: new Date().toISOString()
      }
    },
    exchangeRates: {
      'USD-JPY': {
        pair: 'USD-JPY',
        rate: 148.5,
        change: 0.5,
        changePercent: 0.3,
        base: 'USD',
        target: 'JPY',
        lastUpdated: new Date().toISOString()
      },
      'EUR-JPY': {
        pair: 'EUR-JPY',
        rate: 160.2,
        change: -0.8,
        changePercent: -0.5,
        base: 'EUR',
        target: 'JPY',
        lastUpdated: new Date().toISOString()
      }
    },
    mutualFunds: {
      '0131103C': {
        ticker: '0131103C',
        price: 12345,
        change: 25,
        changePercent: 0.2,
        name: 'テスト投資信託',
        currency: 'JPY',
        isMutualFund: true,
        lastUpdated: new Date().toISOString()
      }
    }
  }
};

// セッション状態の追跡
const sessionState = {
  // 有効なセッションクッキーを追跡
  activeSessions: new Set(['test-session-id', 'complete-flow-session-id']),
  
  // ログアウト状態のセッションを追跡
  loggedOutSessions: new Set(),
  
  // セッションを追加
  addSession(sessionId) {
    this.activeSessions.add(sessionId);
    this.loggedOutSessions.delete(sessionId);
  },
  
  // セッションを無効化（ログアウト）
  invalidateSession(sessionId) {
    this.activeSessions.delete(sessionId);
    this.loggedOutSessions.add(sessionId);
  },
  
  // セッションが有効かチェック
  isSessionValid(cookie) {
    if (!cookie) return false;
    
    // クッキー文字列からセッションIDを抽出
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (!sessionMatch) return false;
    
    const sessionId = sessionMatch[1];
    return this.activeSessions.has(sessionId) && !this.loggedOutSessions.has(sessionId);
  },
  
  // セッションIDがログアウト済みかチェック
  isSessionLoggedOut(cookie) {
    if (!cookie) return false;
    
    // Max-Age=0 または空のセッションはログアウト済みと判断
    if (cookie.includes('Max-Age=0') || cookie.includes('session=;')) {
      return true;
    }
    
    // クッキー文字列からセッションIDを抽出
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (!sessionMatch) return false;
    
    const sessionId = sessionMatch[1];
    return this.loggedOutSessions.has(sessionId);
  },
  
  // すべてのセッションをリセット
  reset() {
    this.activeSessions = new Set(['test-session-id', 'complete-flow-session-id']);
    this.loggedOutSessions = new Set();
  }
};

/**
 * 外部APIのモックを設定する
 */
const mockExternalApis = () => {
  // クリーンアップ前にカウントを確認
  const pendingMocksBefore = nock.pendingMocks();
  if (pendingMocksBefore.length > 0) {
    console.log(`Warning: ${pendingMocksBefore.length} pending mocks found before setup`);
  }
  
  // すべてのモックをクリーンアップ
  nock.cleanAll();
  nock.enableNetConnect();
  
  try {
    // Yahoo Finance APIのモック
    nock(`https://${API_CONFIG.yahooFinance.apiHost}`)
      .persist()
      .get('/v8/finance/quote')
      .query(true)
      .reply(function(uri, requestBody) {
        // リクエストヘッダーをチェック
        const headers = this.req.headers;
        const hasApiKey = headers['x-rapidapi-key'] !== undefined;
        
        if (!hasApiKey) {
          console.warn('Warning: Yahoo Finance API called without API key');
        }
        
        // クエリからシンボルを抽出
        const urlObj = new URL(`https://${API_CONFIG.yahooFinance.apiHost}${uri}`);
        const symbols = urlObj.searchParams.get('symbols') || 'AAPL';
        const symbolsArray = symbols.split(',');
        
        // レスポンスデータを作成
        return [
          200, 
          {
            quoteResponse: {
              result: symbolsArray.map(symbol => {
                // テストデータにあればそれを使用、なければ生成
                const stockData = TEST_DATA.marketData.usStocks[symbol] || {
                  symbol,
                  regularMarketPrice: 100 + Math.random() * 100,
                  regularMarketChange: Math.random() * 10 - 5,
                  regularMarketChangePercent: Math.random() * 5 - 2.5,
                  shortName: `${symbol} Inc.`,
                  currency: 'USD',
                  regularMarketTime: Math.floor(Date.now() / 1000)
                };
                
                return {
                  symbol: stockData.ticker || symbol,
                  regularMarketPrice: stockData.price,
                  regularMarketChange: stockData.change,
                  regularMarketChangePercent: stockData.changePercent,
                  shortName: stockData.name || `${symbol} Inc.`,
                  currency: stockData.currency,
                  regularMarketTime: Math.floor(Date.now() / 1000)
                };
              }),
              error: null
            }
          }
        ];
      });
    
    // Yahoo Finance Japan APIのモック
    nock('https://finance.yahoo.co.jp')
      .persist()
      .get(/^\/quote\/.+/)
      .reply(function(uri, requestBody) {
        // 証券コードを抽出
        const match = uri.match(/\/quote\/([0-9]+)/);
        const code = match ? match[1] : '7203';
        
        // テストデータにあればそれを使用
        const stockData = TEST_DATA.marketData.jpStocks[code];
        const price = stockData ? stockData.price : 2500;
        
        return [
          200,
          `<html><body><div class="stocksPrice">${price}</div><div class="change">+50（+2.00%）</div></body></html>`
        ];
      });
    
    // 為替レートAPIのモック
    nock(API_CONFIG.exchangeRate.apiUrl)
      .persist()
      .get('/latest')
      .query(true)
      .reply(function(uri, requestBody) {
        // クエリパラメータを解析
        const urlObj = new URL(`${API_CONFIG.exchangeRate.apiUrl}${uri}`);
        const base = urlObj.searchParams.get('base') || 'USD';
        const symbols = urlObj.searchParams.get('symbols') || 'JPY';
        
        // レスポンスデータを作成
        const rates = {};
        symbols.split(',').forEach(symbol => {
          const pair = `${base}-${symbol}`;
          if (TEST_DATA.marketData.exchangeRates[pair]) {
            rates[symbol] = TEST_DATA.marketData.exchangeRates[pair].rate;
          } else {
            rates[symbol] = symbol === 'JPY' ? 148.5 : 
                             symbol === 'EUR' ? 0.93 : 
                             symbol === 'GBP' ? 0.79 : 1.0;
          }
        });
        
        return [
          200,
          {
            success: true,
            base,
            date: new Date().toISOString().split('T')[0],
            rates
          }
        ];
      });
    
    // Google OAuth2 APIのモック
    nock('https://oauth2.googleapis.com')
      .persist()
      .post('/token')
      .reply(200, {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        id_token: 'test-id-token',
        expires_in: 3600,
        token_type: 'Bearer'
      });
    
    nock('https://www.googleapis.com')
      .persist()
      .get('/oauth2/v3/userinfo')
      .reply(200, {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        email_verified: true
      });
    
    // Google Drive APIのモック
    nock('https://www.googleapis.com')
      .persist()
      .get('/drive/v3/files')
      .query(true)
      .reply(function(uri, requestBody) {
        // ヘッダーをチェック - 認証ヘッダーの確認
        const authHeader = this.req.headers.authorization;
        if (!authHeader || !authHeader.includes('Bearer')) {
          return [401, { error: { code: 401, message: 'Unauthorized' } }];
        }
        
        return [
          200,
          {
            files: [
              {
                id: 'file-123',
                name: 'test-portfolio.json',
                createdTime: new Date().toISOString(),
                modifiedTime: new Date().toISOString(),
                webViewLink: 'https://drive.google.com/file/d/file-123/view'
              },
              {
                id: 'new-file-123',
                name: 'portfolio-data.json',
                createdTime: new Date().toISOString(),
                modifiedTime: new Date().toISOString(),
                webViewLink: 'https://drive.google.com/file/d/new-file-123/view'
              }
            ]
          }
        ];
      });
    
    nock('https://www.googleapis.com')
      .persist()
      .post('/drive/v3/files')
      .reply(function(uri, requestBody) {
        // ヘッダーをチェック - 認証ヘッダーの確認
        const authHeader = this.req.headers.authorization;
        if (!authHeader || !authHeader.includes('Bearer')) {
          return [401, { error: { code: 401, message: 'Unauthorized' } }];
        }
        
        // アップロードされたファイル名
        let filename = 'portfolio-data.json';
        if (typeof requestBody === 'object' && requestBody.name) {
          filename = requestBody.name;
        } else if (this.req.headers['content-disposition']) {
          const match = this.req.headers['content-disposition'].match(/filename="([^"]+)"/);
          if (match) {
            filename = match[1];
          }
        }
        
        return [
          200,
          {
            id: 'new-file-123',
            name: filename,
            createdTime: new Date().toISOString(),
            webViewLink: 'https://drive.google.com/file/d/new-file-123/view'
          }
        ];
      });
    
    nock('https://www.googleapis.com')
      .persist()
      .get(/^\/drive\/v3\/files\/.+/)
      .reply(function(uri, requestBody) {
        // ファイルIDを抽出
        const match = uri.match(/\/files\/([^\/\?]+)/);
        const fileId = match ? match[1] : 'file-123';
        
        // ヘッダーをチェック - 認証ヘッダーの確認
        const authHeader = this.req.headers.authorization;
        if (!authHeader || !authHeader.includes('Bearer')) {
          return [401, { error: { code: 401, message: 'Unauthorized' } }];
        }
        
        return [
          200, 
          {
            id: fileId,
            name: 'test-portfolio.json',
            createdTime: new Date().toISOString(),
            modifiedTime: new Date().toISOString(),
            contents: JSON.stringify(TEST_DATA.samplePortfolio)
          }
        ];
      });
    
    // 投資信託データAPIのモック
    nock('https://toushin-lib.fwg.ne.jp')
      .persist()
      .get(/^\/FdsWeb\/FDST/)
      .reply(function(uri, requestBody) {
        // ファンドコードを抽出
        const match = uri.match(/\/FDST\/([0-9A-Z]+)/);
        const code = match ? match[1] : '0131103C';
        
        // テストデータにあればそれを使用
        const fundData = TEST_DATA.marketData.mutualFunds[code];
        const price = fundData ? fundData.price : 10000;
        const change = fundData ? fundData.change : 25;
        const changePercent = fundData ? fundData.changePercent : 0.2;
        const name = fundData ? fundData.name : 'テスト投資信託';
        
        return [
          200,
          `<html><body>
            <div class="standard-price">${price.toLocaleString()}円</div>
            <div class="price-change">+${change}円(+${changePercent}%)</div>
            <div class="fund-name">${name}</div>
          </body></html>`
        ];
      });
    
    // 成功メッセージ
    console.log('External API mocks configured successfully');
    return true;
  } catch (error) {
    console.error('Error setting up API mocks:', error);
    return false;
  }
};

/**
 * リクエストパラメータが条件に一致するか検証する
 * @param {object} req リクエストオブジェクト
 * @param {object} options モックオプション（queryParams、headers、body）
 * @returns {boolean} 一致する場合はtrue
 */
const requestMatchesConditions = (req, options) => {
  const debug = process.env.DEBUG === 'true';
  
  // クエリパラメータのマッチング
  if (options.queryParams) {
    // 実際のURLからクエリパラメータを取得
    let reqParams = {};
    
    // パスからクエリパラメータを抽出
    if (req.path && req.path.includes('?')) {
      const [path, queryString] = req.path.split('?');
      const searchParams = new URLSearchParams(queryString);
      for (const [key, value] of searchParams.entries()) {
        reqParams[key] = value;
      }
    }
    
    // reqオブジェクトのqueryプロパティからパラメータを抽出
    if (req.query) {
      Object.assign(reqParams, req.query);
    }
    
    // URLからもパラメータを抽出
    if (req.url) {
      const url = new URL(`http://example.com${req.url}`);
      for (const [key, value] of url.searchParams.entries()) {
        reqParams[key] = value;
      }
    }
    
    // さらにリクエストオブジェクトからパラメータを抽出 (nockのreq実装に依存)
    try {
      if (req.options && req.options.path) {
        const urlPath = req.options.path;
        if (urlPath.includes('?')) {
          const queryString = urlPath.split('?')[1];
          const searchParams = new URLSearchParams(queryString);
          for (const [key, value] of searchParams.entries()) {
            reqParams[key] = value;
          }
        }
      }
    } catch (e) {
      // 無視 - これは拡張的な試みです
    }
    
    if (debug) {
      console.log('Query params matching:');
      console.log('Expected:', options.queryParams);
      console.log('Actual:', reqParams);
      console.log('Request path:', req.path);
      console.log('Request URL:', req.url);
    }
    
    const expectedParams = Object.entries(options.queryParams);
    
    // 各クエリパラメータが一致するかチェック
    for (const [key, value] of expectedParams) {
      const paramValue = reqParams[key];
      
      if (debug) {
        console.log(`Checking param ${key}: expected=${value}, actual=${paramValue}`);
      }
      
      // 値がRegExpの場合はパターンマッチング
      if (value instanceof RegExp) {
        if (!paramValue || !value.test(paramValue)) {
          if (debug) console.log(`Regex match failed for ${key}`);
          return false;
        }
      } else if (value === undefined) {
        // 未定義の場合はパラメータが存在しないことをチェック
        if (reqParams.hasOwnProperty(key)) {
          if (debug) console.log(`Parameter ${key} should not exist but does`);
          return false;
        }
      } else if (value === null) {
        // nullの場合はパラメータが存在するが値がないことをチェック
        if (!reqParams.hasOwnProperty(key) || reqParams[key] !== '') {
          if (debug) console.log(`Parameter ${key} should exist with empty value`);
          return false;
        }
      } else if (typeof value === 'object' && value.partialMatch) {
        // 部分一致の場合（カンマ区切りの値など）
        if (!paramValue || !paramValue.includes(value.partialMatch)) {
          if (debug) console.log(`Partial match failed for ${key}`);
          return false;
        }
      } else if (paramValue !== value) {
        // 完全一致をチェック
        if (debug) console.log(`Exact match failed for ${key}: ${paramValue} !== ${value}`);
        return false;
      }
    }
  }
  
  // ヘッダーのマッチング
  if (options.headers) {
    if (debug) {
      console.log('Header matching:');
      console.log('Expected:', options.headers);
      console.log('Actual:', req.headers);
    }
    
    const headers = Object.entries(options.headers);
    
    for (const [key, value] of headers) {
      const headerValue = req.headers[key.toLowerCase()];
      
      if (!headerValue || !headerValue.includes(value)) {
        if (debug) console.log(`Header match failed for ${key}`);
        return false;
      }
    }
  }
  
  // ボディのマッチング
  if (options.body) {
    try {
      const reqBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const expectedBody = options.body;
      
      if (debug) {
        console.log('Body matching:');
        console.log('Expected:', expectedBody);
        console.log('Actual:', reqBody);
      }
      
      // 関数による検証
      if (typeof expectedBody === 'function') {
        return expectedBody(reqBody);
      }
      
      // 簡易的な比較（深い比較が必要な場合は改良が必要）
      for (const key in expectedBody) {
        if (reqBody[key] !== expectedBody[key]) {
          if (debug) console.log(`Body match failed for ${key}`);
          return false;
        }
      }
    } catch (error) {
      if (debug) console.log(`Body parse error: ${error.message}`);
      return false;
    }
  }
  
  return true;
};

/**
 * APIリクエストのモックを設定する
 * @param {string} url モックするURL
 * @param {string} method HTTPメソッド
 * @param {object|function} response レスポンスデータ（関数の場合は動的レスポンス）
 * @param {number} statusCode HTTPステータスコード
 * @param {object} headers レスポンスヘッダー
 * @param {object} options 追加オプション（queryParams, headers, bodyなど）
 * @returns {boolean} 成功した場合はtrue
 */
const mockApiRequest = (url, method = 'GET', response = {}, statusCode = 200, headers = {}, options = {}) => {
  const debug = process.env.DEBUG === 'true';
  
  try {
    const urlObj = new URL(url);
    
    // メソッドを小文字に変換し、存在チェック
    const normalizedMethod = method.toLowerCase();
    if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(normalizedMethod)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    
    // デバッグ情報
    if (debug || process.env.MOCK_DEBUG === 'true') {
      console.log(`Setting up mock: ${method.toUpperCase()} ${url}`);
      if (options.queryParams) {
        console.log(`With query params: ${JSON.stringify(options.queryParams)}`);
      }
    }
    
    // モックインスタンスの作成
    let mockScope = nock(urlObj.origin).persist();
    
    // 特殊条件の対応
    if (options.queryParams) {
      // クエリパラメータによる条件付きレスポンス
      // 常にtrueを返して、後でリクエストマッチングでフィルタリング
      mockScope = mockScope[normalizedMethod](urlObj.pathname).query(() => true);
    } else {
      // 通常のURLパスとクエリ（完全一致）
      mockScope = mockScope[normalizedMethod](urlObj.pathname + urlObj.search);
    }
    
    // リクエストボディのマッチング
    if (options.body) {
      if (typeof options.body === 'function') {
        mockScope = mockScope.body(options.body);
      } else {
        mockScope = mockScope.body(options.body);
      }
    }
    
    // ヘッダーの正規化を行い、大文字小文字の不一致を解決
    const normalizedHeaders = {};
    
    // ヘッダーの正規化
    Object.entries(headers).forEach(([key, value]) => {
      // ヘッダー名を正規化
      normalizedHeaders[key] = value;
      
      // Set-CookieヘッダーはCapitalizationが重要なので両方提供
      if (key.toLowerCase() === 'set-cookie') {
        // 明示的に両方のケースでヘッダーを提供
        normalizedHeaders['Set-Cookie'] = value;
        normalizedHeaders['set-cookie'] = value;
      }
    });
    
    // レスポンス設定
    mockScope.reply(function(uri, requestBody) {
      // リクエストマッチング
      if (options.queryParams || options.headers || options.body) {
        const matches = requestMatchesConditions(this.req, options);
        if (!matches) {
          // 条件に一致しなければ、スキップして次のモックにパス
          if (debug) {
            console.log(`Mock skipped for ${method.toUpperCase()} ${uri} - conditions not met`);
          }
          // nockのインターセプターチェーンを続行
          return null;
        }
      }
      
      // デバッグ情報
      if (debug) {
        console.log(`Mock matched request: ${method.toUpperCase()} ${uri}`);
        if (requestBody) {
          console.log(`Request body: ${typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)}`);
        }
      }
      
      // セッション関連の特別処理
      if (uri.includes('/auth/session')) {
        const cookie = this.req.headers.cookie || '';
        
        // セッションがログアウト済みまたは無効な場合
        if (sessionState.isSessionLoggedOut(cookie) || !sessionState.isSessionValid(cookie)) {
          if (debug) {
            console.log(`Invalid session detected: ${cookie}`);
          }
          return [
            401, 
            {
              success: false,
              error: {
                code: 'NO_SESSION',
                message: '認証されていません'
              }
            }, 
            normalizedHeaders
          ];
        }
      } else if (uri.includes('/auth/logout')) {
        // ログアウト時にセッションを無効化
        const cookie = this.req.headers.cookie || '';
        const sessionId = cookie.match(/session=([^;]+)/);
        if (sessionId && sessionId[1]) {
          sessionState.invalidateSession(sessionId[1]);
          if (debug) {
            console.log(`Session invalidated: ${sessionId[1]}`);
          }
        }
      }
      
      // 動的レスポンス処理
      let finalResponse = response;
      if (typeof response === 'function') {
        finalResponse = response(uri, requestBody, this.req);
      }
      
      // レスポンス遅延
      if (options.delay && options.delay > 0) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve([statusCode, finalResponse, normalizedHeaders]);
          }, options.delay);
        });
      }
      
      // 通常レスポンス
      return [statusCode, finalResponse, normalizedHeaders];
    });
    
    return true;
  } catch (error) {
    console.error(`Error mocking API request to ${url}:`, error);
    return false;
  }
};

/**
 * APIモックをリセットする
 */
const resetApiMocks = () => {
  try {
    // 既存のモックをすべてクリア
    nock.cleanAll();
    
    // セッション状態をリセット
    sessionState.reset();
    
    // 未解決のモックを確認
    const pendingMocks = nock.pendingMocks();
    if (pendingMocks.length > 0) {
      console.warn(`Warning: ${pendingMocks.length} pending mocks remained`);
      if (process.env.DEBUG === 'true') {
        console.warn(pendingMocks);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting API mocks:', error);
    return false;
  }
};

/**
 * 未処理リクエスト用のフォールバックレスポンスを設定
 */
const setupFallbackResponses = () => {
  if (process.env.DEBUG === 'true') {
    console.log('Setting up fallback responses...');
  }
  
  try {
    // ヘルスチェックフォールバック
    nock(/.*/)
      .persist()
      .get(/\/health/)
      .reply(200, {
        success: true,
        status: 'ok',
        mockFallback: true,
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    
    // セッション取得APIフォールバック
    nock(/.*/)
      .persist()
      .get(/\/auth\/session/)
      .reply(function(uri, requestBody) {
        const cookies = this.req.headers.cookie;
        
        // セッション状態に基づいてレスポンス
        if (sessionState.isSessionLoggedOut(cookies)) {
          return [
            401,
            {
              success: false,
              mockFallback: true,
              error: {
                code: 'NO_SESSION',
                message: '認証されていません'
              }
            }
          ];
        }
        
        if (sessionState.isSessionValid(cookies)) {
          return [
            200,
            {
              success: true,
              mockFallback: true,
              data: {
                isAuthenticated: true,
                user: {
                  id: 'user-123',
                  email: 'test@example.com',
                  name: 'Test User'
                }
              }
            }
          ];
        }
        
        return [
          401,
          {
            success: false,
            mockFallback: true,
            error: {
              code: 'NO_SESSION',
              message: '認証されていません'
            }
          }
        ];
      });
    
    // Google Drive ファイル読み込みフォールバック
    nock(/.*/)
      .persist()
      .get(/\/drive\/load/)
      .query(true)
      .reply(function(uri, requestBody) {
        // クエリパラメータ解析
        const url = new URL(`http://localhost${uri}`);
        const fileId = url.searchParams.get('fileId') || 'file-123';
        
        return [
          200,
          {
            success: true,
            mockFallback: true,
            message: `Fallback portfolio data for fileId: ${fileId}`,
            data: TEST_DATA.samplePortfolio,
            file: {
              id: fileId,
              name: 'test-portfolio.json',
              createdTime: new Date().toISOString()
            }
          }
        ];
      });
    
    // ドライブファイル一覧APIフォールバック
    nock(/.*/)
      .persist()
      .get(/\/drive\/files/)
      .reply(function(uri, requestBody) {
        // リクエストのCookieをチェック
        const cookies = this.req.headers.cookie;
        const hasValidSession = cookies && sessionState.isSessionValid(cookies);
        
        if (hasValidSession) {
          return [
            200,
            {
              success: true,
              mockFallback: true,
              files: [
                {
                  id: 'file-123',
                  name: 'test-portfolio.json',
                  createdTime: new Date().toISOString(),
                  modifiedTime: new Date().toISOString()
                },
                {
                  id: 'new-file-123',
                  name: 'portfolio-data.json',
                  createdTime: new Date().toISOString(),
                  modifiedTime: new Date().toISOString()
                }
              ]
            }
          ];
        } else {
          return [
            401,
            {
              success: false,
              mockFallback: true,
              error: {
                code: 'NO_SESSION',
                message: '認証されていません'
              }
            }
          ];
        }
      });
    
    // マーケットデータAPIフォールバック（株式データ）
    nock(/.*/)
      .persist()
      .get(/\/api\/market-data/)
      .query(params => params.type === 'us-stock')
      .reply(function(uri, requestBody) {
        // URLからシンボルを抽出
        const url = new URL(`http://localhost${uri}`);
        const symbols = url.searchParams.get('symbols') || 'AAPL';
        const symbolsList = symbols.split(',');
        
        // レスポンスデータを構築
        const data = {};
        symbolsList.forEach(symbol => {
          data[symbol] = TEST_DATA.marketData.usStocks[symbol] || {
            ticker: symbol,
            price: 150 + Math.random() * 50,
            change: Math.random() * 10 - 5,
            changePercent: Math.random() * 5 - 2.5,
            currency: 'USD',
            lastUpdated: new Date().toISOString()
          };
        });
        
        return [
          200,
          {
            success: true,
            mockFallback: true,
            data
          }
        ];
      });
    
    // マーケットデータAPIフォールバック（日本株データ）
    nock(/.*/)
      .persist()
      .get(/\/api\/market-data/)
      .query(params => params.type === 'jp-stock')
      .reply(function(uri, requestBody) {
        // URLからシンボルを抽出
        const url = new URL(`http://localhost${uri}`);
        const symbols = url.searchParams.get('symbols') || '7203';
        const symbolsList = symbols.split(',');
        
        // レスポンスデータを構築
        const data = {};
        symbolsList.forEach(symbol => {
          data[symbol] = TEST_DATA.marketData.jpStocks[symbol] || {
            ticker: symbol,
            price: 2000 + Math.random() * 1000,
            change: Math.random() * 100 - 50,
            changePercent: Math.random() * 4 - 2,
            currency: 'JPY',
            lastUpdated: new Date().toISOString()
          };
        });
        
        return [
          200,
          {
            success: true,
            mockFallback: true,
            data
          }
        ];
      });
    
    // マーケットデータAPIフォールバック（為替レート）
    nock(/.*/)
      .persist()
      .get(/\/api\/market-data/)
      .query(params => params.type === 'exchange-rate')
      .reply(function(uri, requestBody) {
        // URLからシンボルを抽出
        const url = new URL(`http://localhost${uri}`);
        const symbols = url.searchParams.get('symbols') || 'USD-JPY';
        const symbolsList = symbols.split(',');
        
        // レスポンスデータを構築
        const data = {};
        symbolsList.forEach(symbol => {
          data[symbol] = TEST_DATA.marketData.exchangeRates[symbol] || {
            pair: symbol,
            rate: symbol.includes('JPY') ? 148.5 : 0.93,
            change: Math.random() * 2 - 1,
            changePercent: Math.random() * 1 - 0.5,
            base: symbol.split('-')[0],
            target: symbol.split('-')[1],
            lastUpdated: new Date().toISOString()
          };
        });
        
        return [
          200,
          {
            success: true,
            mockFallback: true,
            data
          }
        ];
      });
    
    // マーケットデータAPIフォールバック（投資信託）
    nock(/.*/)
      .persist()
      .get(/\/api\/market-data/)
      .query(params => params.type === 'mutual-fund')
      .reply(function(uri, requestBody) {
        // URLからシンボルを抽出
        const url = new URL(`http://localhost${uri}`);
        const symbols = url.searchParams.get('symbols') || '0131103C';
        const symbolsList = symbols.split(',');
        
        // レスポンスデータを構築
        const data = {};
        symbolsList.forEach(symbol => {
          data[symbol] = TEST_DATA.marketData.mutualFunds[symbol] || {
            ticker: symbol,
            price: 10000 + Math.random() * 5000,
            change: Math.random() * 50 - 25,
            changePercent: Math.random() * 1 - 0.5,
            name: `テスト投資信託 ${symbol}`,
            currency: 'JPY',
            isMutualFund: true,
            lastUpdated: new Date().toISOString()
          };
        });
        
        return [
          200,
          {
            success: true,
            mockFallback: true,
            data
          }
        ];
      });
    
    // エラーレスポンスのフォールバック（無効なパラメータ）
    nock(/.*/)
      .persist()
      .get(/\/api\/market-data/)
      .query(params => params.type === 'invalid-type')
      .reply(400, {
        success: false,
        mockFallback: true,
        error: {
          code: 'INVALID_PARAMS',
          message: 'Invalid market data type'
        }
      });
    
    // ログアウトAPIフォールバック
    nock(/.*/)
      .persist()
      .post(/\/auth\/logout/)
      .reply(function(uri, requestBody) {
        const cookies = this.req.headers.cookie;
        if (cookies) {
          const sessionMatch = cookies.match(/session=([^;]+)/);
          if (sessionMatch && sessionMatch[1]) {
            sessionState.invalidateSession(sessionMatch[1]);
          }
        }
        
        return [
          200,
          {
            success: true,
            mockFallback: true,
            message: 'ログアウトしました'
          },
          {
            'Set-Cookie': ['session=; Max-Age=0; HttpOnly; Secure'],
            'set-cookie': ['session=; Max-Age=0; HttpOnly; Secure']
          }
        ];
      });
    
    // その他のGETリクエストのフォールバック
    nock(/.*/)
      .persist()
      .get(/.*/)
      .reply(function(uri, requestBody) {
        if (process.env.DEBUG === 'true') {
          console.log(`Fallback: Unhandled GET ${uri}`);
        }
        return [
          404,
          {
            success: false,
            mockFallback: true,
            error: {
              code: 'NOT_FOUND',
              message: 'Endpoint not found'
            }
          }
        ];
      });
    
    // その他のPOSTリクエストのフォールバック
    nock(/.*/)
      .persist()
      .post(/.*/)
      .reply(function(uri, requestBody) {
        if (process.env.DEBUG === 'true') {
          console.log(`Fallback: Unhandled POST ${uri}`);
        }
        return [
          404,
          {
            success: false,
            mockFallback: true,
            error: {
              code: 'NOT_FOUND',
              message: 'Endpoint not found'
            }
          }
        ];
      });
    
    return true;
  } catch (error) {
    console.error('Error setting up fallback responses:', error);
    return false;
  }
};

// モジュールのエクスポート
module.exports = {
  mockExternalApis,
  resetApiMocks,
  mockApiRequest,
  setupFallbackResponses,
  TEST_DATA,
  sessionState,
  requestMatchesConditions,
  // 追加機能
  getConfigValue,
  API_CONFIG
};
