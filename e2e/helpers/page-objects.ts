/**
 * Page Object Model for E2E tests
 * @file e2e/helpers/page-objects.ts
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-constants';

export class AppPage {
  readonly page: Page;
  readonly header: Locator;
  readonly tabNavigation: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator(SELECTORS.appHeader);
    this.tabNavigation = page.locator(SELECTORS.tabNavigation);
  }

  async goto(path: string = '/') {
    await this.page.goto(path, { timeout: TIMEOUTS.pageLoad });
  }

  async waitForAppLoad() {
    // Wait for header or main content to be visible
    await this.page.waitForLoadState('domcontentloaded');
    // Give React time to hydrate
    await this.page.waitForTimeout(1000);
  }

  async expectNoErrors() {
    const errorBoundary = this.page.locator(SELECTORS.errorBoundary);
    await expect(errorBoundary).toHaveCount(0);
  }
}

export class DashboardPage extends AppPage {
  readonly portfolioScoreCard: Locator;
  readonly pnlSummary: Locator;
  readonly strengthsWeaknessCard: Locator;

  constructor(page: Page) {
    super(page);
    this.portfolioScoreCard = page.locator(SELECTORS.portfolioScoreCard);
    this.pnlSummary = page.locator(SELECTORS.pnlSummary);
    this.strengthsWeaknessCard = page.locator(SELECTORS.strengthsWeaknessCard);
  }

  async goto() {
    await super.goto('/');
  }
}

export class SettingsPage extends AppPage {
  async goto() {
    await super.goto('/settings');
  }
}

export class PricingPage extends AppPage {
  async goto() {
    await super.goto('/pricing');
  }
}
