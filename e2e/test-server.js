/**
 * テスト用のMockサーバー
 * Playwrightテスト実行時に使用
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3001;

// CORS設定
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// 静的ファイル提供（React build）
const buildPath = path.join(__dirname, '../frontend/webapp/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
} else {
  console.log('Build directory not found, serving development mode');
}

// API Mock Endpoints
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      apiBaseUrl: 'http://localhost:3001',
      googleClientId: 'mock-google-client-id',
      defaultExchangeRate: 150.0,
      environment: 'test'
    }
  });
});

app.get('/api/market-data/:symbol', (req, res) => {
  const { symbol } = req.params;
  res.json({
    success: true,
    data: {
      symbol: symbol,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 20,
      changePercent: (Math.random() - 0.5) * 5,
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/portfolio/save', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio saved successfully',
    data: { id: 'mock-portfolio-id' }
  });
});

app.get('/api/portfolio/load', (req, res) => {
  res.json({
    success: true,
    data: {
      currentAssets: [],
      targetPortfolio: [],
      settings: {
        baseCurrency: 'JPY',
        riskTolerance: 'moderate'
      }
    }
  });
});

// Google OAuth Mock
app.get('/auth/google', (req, res) => {
  res.redirect('http://localhost:3001/?auth=success');
});

app.get('/auth/google/callback', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'mock-user-id',
      email: 'test@example.com',
      name: 'Test User'
    },
    token: 'mock-jwt-token'
  });
});

// React Router - すべてのルートをindex.htmlに転送
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(buildPath, 'index.html'))) {
    res.sendFile(path.join(buildPath, 'index.html'));
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Server</title>
          <meta charset="utf-8">
        </head>
        <body>
          <div id="root">
            <h1>Test Server Running</h1>
            <p>React build not found. Please build the frontend first:</p>
            <pre>cd frontend/webapp && npm run build</pre>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Build path: ${buildPath}`);
  console.log(`Build exists: ${fs.existsSync(buildPath)}`);
});

module.exports = app;