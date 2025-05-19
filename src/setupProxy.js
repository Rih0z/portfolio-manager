/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/setupProxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-05 14:20:00 
 * 更新日: 2025-05-19 13:30:00
 * 
 * 更新履歴: 
 * - 2025-03-05 14:20:00 Koki Riho 初回作成
 * - 2025-03-25 11:15:00 Koki Riho Netlify Functions用のプロキシ設定を更新
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * - 2025-05-19 13:30:00 System Admin AWS環境対応に修正
 * 
 * 説明: 
 * 開発環境用のプロキシ設定を行うファイル。
 * ローカルサーバーからAPIサーバーへのAPI呼び出しを適切にリダイレクトする。
 * http-proxy-middlewareを使用して、開発サーバー上の/dev/apiなどのパスへのリクエストを
 * ローカルのAPI開発サーバーに転送する。
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // ローカル開発環境でのAPI呼び出しをプロキシ
  app.use(
    '/dev/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
    })
  );
  
  // 認証関連のプロキシ
  app.use(
    '/dev/auth',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      cookieDomainRewrite: 'localhost',
    })
  );
  
  // Google Drive関連のプロキシ
  app.use(
    '/dev/drive',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
    })
  );
  
  // 管理者用API呼び出しのプロキシ
  app.use(
    '/dev/admin',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
    })
  );
};
