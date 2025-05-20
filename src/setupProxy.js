/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/setupProxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-05 14:20:00 
 * 更新日: 2025-05-21 16:15:00
 * 
 * 更新履歴: 
 * - 2025-03-05 14:20:00 Koki Riho 初回作成
 * - 2025-03-25 11:15:00 Koki Riho Netlify Functions用のプロキシ設定を更新
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * - 2025-05-19 13:30:00 System Admin AWS環境対応に修正
 * - 2025-05-21 16:15:00 System Admin 統合プロキシ設定に修正
 * 
 * 説明: 
 * 開発環境用のプロキシ設定を行うファイル。
 * ローカルサーバーからAPIサーバーへのAPI呼び出しを適切にリダイレクトする。
 * http-proxy-middlewareを使用して、開発サーバー上の/dev/apiなどのパスへのリクエストを
 * ローカルのAPI開発サーバーに転送する。
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 環境変数から設定を取得
  const apiStage = process.env.REACT_APP_API_STAGE || 'dev';
  const apiUrl = process.env.REACT_APP_LOCAL_API_URL || process.env.REACT_APP_AWS_API_URL || 'http://localhost:3000';
  
  console.log('開発プロキシ設定:');
  console.log(`- APIステージ: ${apiStage}`);
  console.log(`- API URL: ${apiUrl}`);
  console.log(`- プロキシパス: /${apiStage}/*`);
  
  // すべてのAPI呼び出しを統合プロキシで処理
  app.use(
    `/${apiStage}`,
    createProxyMiddleware({
      target: apiUrl,
      changeOrigin: true,
      secure: false, // 開発環境では自己署名証明書を許可
      xfwd: true, // X-Forwarded-* ヘッダーを追加
      logLevel: 'debug',
      
      // リクエストインターセプター
      onProxyReq: (proxyReq, req, res) => {
        // ホストヘッダーを設定
        proxyReq.setHeader('x-forwarded-host', req.headers.host);
        proxyReq.setHeader('x-forwarded-proto', req.protocol);
        
        // 認証ヘッダーを保持
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
        }
        
        // リクエスト情報をログ出力
        console.log(`プロキシリクエスト: ${req.method} ${req.url}`);
      },
      
      // レスポンスインターセプター
      onProxyRes: (proxyRes, req, res) => {
        // Cookieドメインの書き換え
        const setCookieHeader = proxyRes.headers['set-cookie'];
        if (setCookieHeader) {
          const cookies = setCookieHeader.map(cookie => {
            // Domain属性を削除（ブラウザはリクエスト先のドメインを使用）
            return cookie.replace(/Domain=[^;]+;/i, '');
          });
          proxyRes.headers['set-cookie'] = cookies;
        }
        
        // レスポンス情報をログ出力
        console.log(`プロキシレスポンス: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
      },
      
      // エラーハンドラー
      onError: (err, req, res) => {
        console.error('プロキシエラー:', err);
        
        // エラーページを返す
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: `APIサーバーへの接続に失敗しました: ${err.message}`
          }
        }));
      },
      
      // Cookieドメインの書き換え
      cookieDomainRewrite: {
        '*': '' // すべてのドメインをクライアントドメインに書き換え
      }
    })
  );
  
  // プロキシ設定を環境変数として設定
  process.env.REACT_APP_USE_PROXY = 'true';
};
