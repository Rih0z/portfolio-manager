const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // APIプロキシ設定
  app.use(
    '/api',
    proxy({
      target: process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000', // デフォルトはローカル開発用
      changeOrigin: true,
      pathRewrite: {
        '^/api/market-data': '/dev/api/market-data',
        '^/api/auth': '/dev/auth',
        '^/api/drive': '/dev/drive'
      },
      onProxyReq: (proxyReq, req, res) => {
        // ログ出力
        console.log(`Proxying ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
      }
    })
  );
};