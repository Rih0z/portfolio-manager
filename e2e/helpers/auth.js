import { expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * 認証ヘルパー
 */
export class AuthHelper {
  constructor(page) {
    this.page = page;
  }

  /**
   * Google OAuth モックログイン
   */
  async mockGoogleLogin() {
    // Google OAuthのモック
    await this.page.addInitScript(() => {
      window.google = {
        accounts: {
          id: {
            initialize: () => {},
            renderButton: (element, config) => {
              const button = document.createElement('button');
              button.textContent = 'Sign in with Google (Mock)';
              button.className = 'mock-google-button';
              button.onclick = () => {
                // モック認証レスポンス
                if (window.handleGoogleLogin) {
                  window.handleGoogleLogin({
                    credential: 'mock-credential-token',
                    select_by: 'btn'
                  });
                }
              };
              element.appendChild(button);
            },
            prompt: () => {}
          }
        }
      };
    });
  }

  /**
   * テスト用の認証状態を設定
   */
  async setupTestAuth() {
    // テスト用のセッションクッキーを設定
    await this.page.context().addCookies([
      {
        name: 'test-session',
        value: 'test-session-id',
        domain: new URL(this.page.url()).hostname,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
    
    // ローカルストレージに認証情報を設定
    await this.page.evaluate(() => {
      localStorage.setItem('authToken', 'test-auth-token');
      localStorage.setItem('sessionId', 'test-session-id');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });
  }

  /**
   * 認証状態を保存
   */
  async saveAuthState(filepath) {
    const cookies = await this.page.context().cookies();
    const localStorage = await this.page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
    
    const authState = {
      cookies,
      localStorage,
      timestamp: new Date().toISOString()
    };
    
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(authState, null, 2));
  }

  /**
   * 認証状態を復元
   */
  async loadAuthState(filepath) {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const authState = JSON.parse(content);
      
      // クッキーを復元
      if (authState.cookies && authState.cookies.length > 0) {
        await this.page.context().addCookies(authState.cookies);
      }
      
      // ローカルストレージを復元
      if (authState.localStorage) {
        await this.page.evaluate((localStorage) => {
          Object.entries(localStorage).forEach(([key, value]) => {
            window.localStorage.setItem(key, value);
          });
        }, authState.localStorage);
      }
      
      return true;
    } catch (error) {
      console.log('No auth state found:', filepath);
      return false;
    }
  }

  /**
   * ログイン処理
   */
  async login() {
    await this.page.goto('/');
    
    // モックGoogle認証を設定
    await this.mockGoogleLogin();
    
    // ログインボタンをクリック
    await this.page.click('button.mock-google-button');
    
    // ログイン成功を確認
    await expect(this.page.locator('text=ログアウト')).toBeVisible({ timeout: 10000 });
    
    // 認証状態を保存
    await this.saveAuthState('e2e/.auth/user.json');
  }

  /**
   * ログアウト処理
   */
  async logout() {
    await this.page.click('button:has-text("ログアウト")');
    
    // ログアウト確認ダイアログがある場合
    const dialog = this.page.locator('text=ログアウトしますか？');
    if (await dialog.isVisible()) {
      await this.page.click('button:has-text("はい")');
    }
    
    // ログアウト完了を確認
    await expect(this.page.locator('text=ログイン')).toBeVisible({ timeout: 5000 });
  }

  /**
   * 認証が必要かチェック
   */
  async isAuthRequired() {
    const loginButton = this.page.locator('text=ログイン');
    const logoutButton = this.page.locator('text=ログアウト');
    
    if (await logoutButton.isVisible()) {
      return false; // 既にログイン済み
    }
    
    if (await loginButton.isVisible()) {
      return true; // ログインが必要
    }
    
    // どちらも見つからない場合は、ページの状態を確認
    throw new Error('Cannot determine authentication state');
  }
}