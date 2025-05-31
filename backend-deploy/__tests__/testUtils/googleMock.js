/**
 * Google OAuth2モックを管理するユーティリティ
 */
const nock = require('nock');

// トークン要求の履歴を保存
let tokenRequests = [];
let tokenCallCount = 0;

/**
 * Google OAuth2モックをセットアップする
 */
const setupGoogleOAuth2Mock = () => {
  // 履歴をリセット
  tokenRequests = [];
  tokenCallCount = 0;
  
  // OAuth2トークンエンドポイントのモック
  nock('https://oauth2.googleapis.com')
    .persist()
    .post('/token')
    .reply(function(uri, requestBody) {
      // リクエスト情報を記録
      tokenRequests.push(requestBody);
      tokenCallCount++;
      
      // 成功レスポンスを返す
      return [
        200,
        {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          id_token: 'test-id-token',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      ];
    });
  
  // ユーザー情報エンドポイントのモック
  nock('https://www.googleapis.com')
    .persist()
    .get('/oauth2/v3/userinfo')
    .reply(200, {
      sub: 'user-123',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/pic.jpg',
      locale: 'en'
    });
  
  return {
    // モックの停止
    stop: () => {
      nock.cleanAll();
    },
    
    // トークン要求の回数を取得
    getTokenCallCount: () => tokenCallCount,
    
    // 最後のトークン要求を取得
    getLastTokenRequest: () => tokenRequests[tokenRequests.length - 1] || null,
    
    // すべてのトークン要求を取得
    getAllTokenRequests: () => [...tokenRequests]
  };
};

module.exports = {
  setupGoogleOAuth2Mock
};

