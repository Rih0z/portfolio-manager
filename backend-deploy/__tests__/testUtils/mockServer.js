/**
 * 外部APIのモックサーバー
 */
const http = require('http');
const { parse } = require('url');

let server = null;
let budgetUsage = 25; // デフォルト値
let isServerRunning = false;

/**
 * モックサーバーをセットアップする
 * 修正: エラーハンドリングの強化とポート競合の対応
 */
const setupMockServer = async (port = 3001) => {
  if (server) {
    console.log('Mock server is already running');
    return server;
  }
  
  // ポート使用チェックを追加
  if (await isPortInUse(port)) {
    console.warn(`Port ${port} is already in use, trying alternate port`);
    // 代替ポートを試す
    for (let alternatePort = 3002; alternatePort < 3010; alternatePort++) {
      if (!await isPortInUse(alternatePort)) {
        port = alternatePort;
        console.log(`Using alternate port: ${port}`);
        break;
      }
    }
  }
  
  return new Promise((resolve, reject) => {
    try {
      server = http.createServer((req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          const { pathname } = parsedUrl;
          
          // CORSヘッダーを設定
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }
          
          // Yahoo Finance APIのモック
          if (pathname === '/v8/finance/quote') {
            handleYahooFinanceAPI(req, res, parsedUrl.query);
            return;
          }
          
          // 為替レートAPIのモック
          if (pathname === '/exchange-rate') {
            handleExchangeRateAPI(req, res, parsedUrl.query);
            return;
          }
          
          // AWS予算APIのモック
          if (pathname === '/mock-aws-budget') {
            handleBudgetAPI(req, res);
            return;
          }
          
          // Googleリダイレクトエンドポイントのモック
          if (pathname === '/auth/callback') {
            handleGoogleCallback(req, res, parsedUrl.query);
            return;
          }
          
          // ヘルスチェックエンドポイント
          if (pathname === '/health') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok' }));
            return;
          }
          
          // 不明なエンドポイント
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        } catch (requestError) {
          console.error('Error handling request:', requestError);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
      
      // エラーハンドリングを追加
      server.on('error', (error) => {
        console.error('Mock server error:', error);
        
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(error);
        }
      });
      
      server.listen(port, () => {
        console.log(`Mock server running at http://localhost:${port}`);
        isServerRunning = true;
        resolve(server);
      });
    } catch (error) {
      console.error('Failed to create mock server:', error);
      reject(error);
    }
  });
};

/**
 * ポートが使用中かどうかを確認する
 */
const isPortInUse = async (port) => {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    
    testServer.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    testServer.once('listening', () => {
      testServer.close();
      resolve(false);
    });
    
    testServer.listen(port);
  });
};

/**
 * モックサーバーを停止する
 */
const stopMockServer = () => {
  if (server) {
    console.log('Stopping mock server...');
    server.close();
    server = null;
    isServerRunning = false;
  }
};

/**
 * Yahoo Finance APIのモックハンドラー
 */
const handleYahooFinanceAPI = (req, res, query) => {
  try {
    const symbols = (query.symbols || 'AAPL').split(',');
    
    const result = {
      quoteResponse: {
        result: symbols.map(symbol => ({
          symbol,
          regularMarketPrice: 150 + Math.random() * 50,
          regularMarketChange: 2.5 - Math.random() * 5,
          regularMarketChangePercent: 1.5 - Math.random() * 3,
          shortName: `${symbol} Inc.`,
          currency: 'USD',
          regularMarketTime: Math.floor(Date.now() / 1000)
        })),
        error: null
      }
    };
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error handling Yahoo Finance API:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};

/**
 * 為替レートAPIのモックハンドラー
 */
const handleExchangeRateAPI = (req, res, query) => {
  try {
    const base = query.base || 'USD';
    const target = query.target || 'JPY';
    
    const result = {
      success: true,
      base,
      date: new Date().toISOString().split('T')[0],
      rates: {
        [target]: target === 'JPY' ? 148.5 + Math.random() * 3 : 1 + Math.random() * 0.1
      }
    };
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error handling Exchange Rate API:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};

/**
 * AWS予算APIのモックハンドラー
 */
const handleBudgetAPI = (req, res) => {
  try {
    const result = {
      budgetPerformanceHistory: {
        budgetName: 'AWS Free Tier',
        budgetType: 'COST',
        costFilters: {},
        costTypes: {
          includeCredit: true,
          includeDiscount: true,
          includeOtherSubscription: true,
          includeRecurring: true,
          includeRefund: true,
          includeSubscription: true,
          includeSupport: true,
          includeTax: true,
          includeUpfront: true,
          useAmortized: false,
          useBlended: false
        },
        timeUnit: 'MONTHLY',
        budgetedAndActualAmountsList: [
          {
            budgetedAmount: {
              amount: '25',
              unit: 'USD'
            },
            actualAmount: {
              amount: (budgetUsage).toString(),
              unit: 'USD'
            },
            timePeriod: {
              start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
              end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
            }
          }
        ]
      }
    };
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error handling Budget API:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};

/**
 * Google認証コールバックのモックハンドラー
 */
const handleGoogleCallback = (req, res, query) => {
  try {
    const code = query.code || 'test-auth-code';
    
    // リダイレクト先に認証コードを付けて返す
    const redirectUri = query.redirect_uri || 'http://localhost:3000';
    res.statusCode = 302;
    res.setHeader('Location', `${redirectUri}?code=${code}`);
    res.end();
  } catch (error) {
    console.error('Error handling Google callback:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};

/**
 * 予算使用率を設定する
 */
const setBudgetUsage = (percentage) => {
  budgetUsage = percentage;
  return budgetUsage;
};

/**
 * サーバーの実行状態を取得
 */
const isServerActive = () => {
  return isServerRunning;
};

module.exports = {
  setupMockServer,
  stopMockServer,
  setBudgetUsage,
  isServerActive
};

