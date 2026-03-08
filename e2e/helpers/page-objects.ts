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
    await this.page.waitForLoadState('domcontentloaded');
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
    await super.goto('/dashboard');
  }
}

export class SettingsPage extends AppPage {
  async goto() {
    await super.goto('/settings');
  }
}

export class PricingPage extends AppPage {
  readonly pricingPage: Locator;

  constructor(page: Page) {
    super(page);
    this.pricingPage = page.locator(SELECTORS.pricingPage);
  }

  async goto() {
    await super.goto('/pricing');
  }
}

export class LandingPage extends AppPage {
  readonly landingPage: Locator;

  constructor(page: Page) {
    super(page);
    this.landingPage = page.locator(SELECTORS.landingPage);
  }

  async goto() {
    await super.goto('/');
  }
}

export class LegalPage extends AppPage {
  async gotoTerms() {
    await super.goto('/legal/terms');
  }

  async gotoPrivacy() {
    await super.goto('/legal/privacy');
  }

  async gotoKKKR() {
    await super.goto('/legal/kkkr');
  }

  async gotoDisclaimer() {
    await super.goto('/legal/disclaimer');
  }
}
