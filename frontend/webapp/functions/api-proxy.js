/**
 * Cloudflare Pages Function
 * APIプロキシ - フロントエンドからのAPIリクエストをバックエンドに転送
 * セキュリティヘッダーを追加して、直接アクセスを防ぐ
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // リクエストURLからパスを取得
  const url = new URL(request.url);
  const apiPath = url.pathname.replace('/api-proxy', '');
  
  // バックエンドAPIのURL
  const backendUrl = `${env.REACT_APP_API_BASE_URL || 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod'}${apiPath}${url.search}`;
  
  // セキュリティヘッダーを追加
  const headers = new Headers(request.headers);
  headers.set('X-API-Secret', env.API_SECRET || 'your-secret-key-here');
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP'));
  
  // バックエンドにリクエストを転送
  try {
    const response = await fetch(backendUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.text() 
        : undefined,
    });
    
    // レスポンスヘッダーをコピー
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', url.origin);
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}