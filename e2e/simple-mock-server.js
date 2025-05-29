const http = require('http');

// 簡単なモックサーバー
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Routes
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else if (req.url.startsWith('/api/market-data')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const symbols = url.searchParams.get('symbols');
    const type = url.searchParams.get('type');
    
    if (type === 'exchange-rate') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          'USD-JPY': {
            rate: 150.23,
            base: 'USD',
            target: 'JPY',
            timestamp: new Date().toISOString()
          }
        }
      }));
    } else if (symbols) {
      const symbolList = symbols.split(',');
      const data = {};
      symbolList.forEach(symbol => {
        data[symbol] = {
          symbol: symbol,
          price: Math.random() * 200 + 100,
          currency: 'USD',
          source: 'mock',
          timestamp: new Date().toISOString()
        };
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing parameters' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});