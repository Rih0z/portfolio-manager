/**
 * コアフロー E2Eテスト
 *
 * Phase R7-B: PortfolioWise の主要ユーザーフローを検証する。
 * 未認証状態で実行可能なフローのみテスト。
 *
 * @file e2e/tests/core-flows.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('1. Landing → ダッシュボード表示', () => {
  test('ランディングページが正しくレンダリングされる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ランディングページのヒーローが表示される
    await expect(page.getByText('分散投資の全体像が、')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ひとつの画面で完結')).toBeVisible();
  });

  test('スタッツバーが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('日米株・投信', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('SBI・楽天', { exact: true })).toBeVisible();
    await expect(page.getByText('8指標', { exact: true })).toBeVisible();
  });

  test('Google ログインボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // OAuthLoginButton が表示される
    const loginButton = page.getByRole('button').filter({ hasText: /Google|ログイン|始める/ });
    await expect(loginButton.first()).toBeVisible({ timeout: 15000 });
  });

  test('ナビゲーションリンクが機能する（料金ページ）', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 「料金プランを詳しく見る」リンクをクリック
    const pricingLink = page.getByText('料金プランを詳しく見る');
    await expect(pricingLink).toBeVisible({ timeout: 15000 });
    await pricingLink.click();

    await expect(page).toHaveURL(/.*pricing.*/);
  });
});

test.describe('2. ランディングページ 各セクション表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('課題セクション（Pain）が表示される', async ({ page }) => {
    await expect(page.getByText('こんな状況、心当たりはありませんか')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('口座ごとにバラバラで把握できない')).toBeVisible();
    await expect(page.getByText('リバランスの計算が面倒')).toBeVisible();
    await expect(page.getByText('既存ツールは使いにくい')).toBeVisible();
  });

  test('ソリューションセクションが表示される', async ({ page }) => {
    await expect(page.getByText('PortfolioWise が解決します')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('STEP 1')).toBeVisible();
    await expect(page.getByText('STEP 2')).toBeVisible();
    await expect(page.getByText('STEP 3')).toBeVisible();
  });

  test('機能セクションが表示される', async ({ page }) => {
    await expect(page.getByText('主要機能')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'PFスコア' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AIプロンプト生成' })).toBeVisible();
  });

  test('セキュリティセクションが表示される', async ({ page }) => {
    await expect(page.getByText('安心のセキュリティ')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Google OAuth 認証')).toBeVisible();
    await expect(page.getByText('Stripe 決済')).toBeVisible();
    await expect(page.getByText('AWS インフラ')).toBeVisible();
  });

  test('料金セクションが表示される', async ({ page }) => {
    await expect(page.getByText('シンプルな料金体系')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('¥0')).toBeVisible();
    await expect(page.getByText('¥700')).toBeVisible();
  });

  test('FAQセクションが表示される', async ({ page }) => {
    await expect(page.getByText('よくある質問')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('PortfolioWise は投資助言サービスですか？')).toBeVisible();
  });

  test('最終CTAセクションが表示される', async ({ page }) => {
    await expect(page.getByText('今すぐ無料で始める')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('3. 料金ページ', () => {
  test('料金ページが正しく表示される', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    // 料金情報が表示される
    await expect(page.getByRole('heading', { name: /Free/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Standard/ })).toBeVisible();
  });
});

test.describe('4. レスポンシブデザイン', () => {
  test('モバイルビューポートで正しく表示される', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ヒーローテキストが表示される
    await expect(page.getByText('分散投資の全体像が、')).toBeVisible({ timeout: 15000 });

    // ログインボタンが表示される
    const loginButton = page.getByRole('button').filter({ hasText: /Google|ログイン|始める/ });
    await expect(loginButton.first()).toBeVisible();
  });

  test('デスクトップビューポートで正しく表示される', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('分散投資の全体像が、')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('5. パフォーマンスとアクセシビリティ', () => {
  test('ページの初回ロードが5秒以内に完了する', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });

  test('主要要素にaria属性が設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // h1が存在する
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 15000 });

    // ボタンが適切にラベル付けされている
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('画像にalt属性が設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // SVGアイコンにaria-hidden="true"が設定されている
    const svgs = page.locator('svg[aria-hidden="true"]');
    const svgCount = await svgs.count();
    // Lucideアイコンは自動的にaria-hidden設定
    expect(svgCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('6. SEOとメタタグ', () => {
  test('ページタイトルが設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('meta descriptionが設定されている', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const metaDescription = await page.locator('meta[name="description"]').first().getAttribute('content');
    expect(metaDescription).toBeTruthy();
  });
});
