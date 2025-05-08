/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/setupProxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-05 14:20:00 
 * 
 * 更新履歴: 
 * - 2025-03-05 14:20:00 Koki Riho 初回作成
 * - 2025-03-25 11:15:00 Koki Riho Netlify Functions用のプロキシ設定を更新
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * 
 * 説明: 
 * 開発環境用のプロキシ設定を行うファイル。
 * Netlify Functionsへのリクエストを適切にリダイレクトするために使用される。
 * http-proxy-middlewareを使用して、開発サーバー上の/.netlify/functions/へのリクエストを
 * ローカルのNetlify Functions開発サーバー（port: 9000）に転送する。
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/.netlify/functions/',
    createProxyMiddleware({
      target: 'http://localhost:9000',
      pathRewrite: {
        '^/\\.netlify/functions': ''
      },
      changeOrigin: true
    })
  );
};
