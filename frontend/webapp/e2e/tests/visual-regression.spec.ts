/**
 * ビジュアルリグレッションテスト
 *
 * Phase R7-C: 主要画面のスクリーンショット比較による視覚的変更検知。
 * 初回実行時にベースラインを生成し、以降の実行で差分を検出する。
 *
 * 実行方法:
 *   npx playwright test e2e/tests/visual-regression.spec.ts --update-snapshots  # ベースライン更新
 *   npx playwright test e2e/tests/visual-regression.spec.ts                      # 差分検出
 *
 * @file e2e/tests/visual-regression.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('ビジュアルリグレッション — デスクトップ', () => {
  test.beforeEach(async ({ page }) => {
    // フォントの読み込みを待つ
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // フォントが確実にレンダリングされるまで待機
    await page.waitForTimeout(1000);
  });

  test('ランディングページ — ヒーローセクション', async ({ page }) => {
    await expect(page.getByText('分散投資の全体像が、')).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('landing-hero-desktop.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('ランディングページ — フルページ', async ({ page }) => {
    await expect(page.getByText('分散投資の全体像が、')).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('landing-fullpage-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('料金ページ', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: /Free/ }).first()).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('pricing-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('ビジュアルリグレッション — モバイル', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('ランディングページ — ヒーロー（モバイル）', async ({ page }) => {
    await expect(page.getByText('分散投資の全体像が、')).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('landing-hero-mobile.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('ランディングページ — フルページ（モバイル）', async ({ page }) => {
    await expect(page.getByText('分散投資の全体像が、')).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('landing-fullpage-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
