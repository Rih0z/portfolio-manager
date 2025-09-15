/**
 * Playwright Google認証テストセットアップ
 * 
 * Google OAuth2テストのための設定ファイル
 * 実際のGoogle認証をテストするためのセットアップ
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

// 認証状態を保存するファイル
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

// Google OAuth Test用の設定
const GOOGLE_TEST_CONFIG = {
  // テスト用Googleアカウント（実際のアカウントを使用）
  TEST_EMAIL: process.env.GOOGLE_TEST_EMAIL || 'your-test-account@gmail.com',
  TEST_PASSWORD: process.env.GOOGLE_TEST_PASSWORD || '',
  
  // OAuth Playground用設定
  CLIENT_ID: '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com',
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  REDIRECT_URI: 'https://portfolio-wise.com/auth/google/callback',
  
  // テスト対象URL
  APP_URL: 'https://portfolio-wise.com/',
  API_BASE_URL: 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod'
};

/**
 * Method 1: 認証状態の保存・再利用パターン
 * 一度手動で認証を行い、その状態を保存して再利用
 */
setup('authenticate via browser', async ({ page }) => {
  console.log('Google認証セットアップを開始します...');
  
  await page.goto(GOOGLE_TEST_CONFIG.APP_URL);
  
  // Google認証ボタンをクリック
  await page.click('[data-testid="google-login-button"]', { timeout: 10000 });
  
  // Googleログインページの処理
  // ※実際のGoogle認証フローを完了させる必要があります
  // このステップは手動で実行するか、テスト用アカウントの認証情報を使用
  
  console.log('Google認証フローを開始しました。手動で認証を完了してください...');
  
  // 認証完了まで待機（ダッシュボードページに到達するまで）
  await page.waitForURL('**/dashboard', { timeout: 60000 });
  
  // 認証状態をファイルに保存
  await page.context().storageState({ path: authFile });
  
  console.log('認証状態を保存しました:', authFile);
});

/**
 * Method 2: OAuth Playgroundを使用したトークン生成
 * Google OAuth Playgroundで生成したリフレッシュトークンを使用
 */
setup('authenticate via oauth playground token', async ({ page, request }) => {
  // リフレッシュトークンからアクセストークンを生成
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  
  if (!refreshToken) {
    console.log('GOOGLE_REFRESH_TOKEN環境変数が設定されていません');
    return;
  }
  
  const tokenResponse = await request.post('https://www.googleapis.com/oauth2/v4/token', {
    data: {
      client_id: GOOGLE_TEST_CONFIG.CLIENT_ID,
      client_secret: GOOGLE_TEST_CONFIG.CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }
  });
  
  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    throw new Error('アクセストークンの取得に失敗しました');
  }
  
  // 取得したトークンを使用してバックエンドに認証リクエストを送信
  const authResponse = await request.post(`${GOOGLE_TEST_CONFIG.API_BASE_URL}/auth/google/login`, {
    data: {
      access_token: tokenData.access_token
    },
    headers: {
      'Origin': 'https://portfolio-wise.com'
    }
  });
  
  const authData = await authResponse.json();
  console.log('OAuth認証レスポンス:', authData);
  
  // 認証Cookieを設定
  await page.context().addCookies([
    {
      name: 'sessionId',
      value: authData.sessionId,
      domain: '.portfolio-wise.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None'
    }
  ]);
  
  await page.context().storageState({ path: authFile });
});

/**
 * Method 3: テスト専用エンドポイントの活用
 * バックエンドにテスト専用の認証エンドポイントを作成
 */
setup('authenticate via test endpoint', async ({ page, request }) => {
  // テスト専用の認証エンドポイントを呼び出し
  const testAuthResponse = await request.post(`${GOOGLE_TEST_CONFIG.API_BASE_URL}/auth/test-login`, {
    data: {
      email: 'playwright-test@example.com',
      name: 'Playwright Test User',
      testMode: true
    },
    headers: {
      'Origin': 'https://portfolio-wise.com',
      'X-Test-Auth': 'playwright-e2e-test' // テスト認証のためのヘッダー
    }
  });
  
  const authData = await testAuthResponse.json();
  
  if (authData.success) {
    // 認証状態をページに設定
    await page.goto(GOOGLE_TEST_CONFIG.APP_URL);
    
    // ローカルストレージに認証情報を設定
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('isAuthenticated', 'true');
    }, authData.token);
    
    await page.context().storageState({ path: authFile });
  }
});

export { GOOGLE_TEST_CONFIG };