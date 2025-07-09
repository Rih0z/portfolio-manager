/**
 * Data Import/Export E2E Tests
 */

import { test, expect } from '@playwright/test';
import { DataImportPage } from '../pages/DataImportPage.js';
import { testImportData } from '../fixtures/test-data.js';
import { waitForAppReady } from '../utils/helpers.js';
import path from 'path';
import fs from 'fs';

test.describe('Data Import/Export', () => {
  let dataImportPage;

  test.beforeEach(async ({ page }) => {
    dataImportPage = new DataImportPage(page);
    await dataImportPage.goto();
    await waitForAppReady(page);
  });

  test.describe('Import Functionality', () => {
    test('should import CSV file successfully', async ({ page }) => {
      await dataImportPage.switchToImportTab();
      
      // Upload CSV content
      await dataImportPage.uploadFileContent('portfolio.csv', testImportData.csv, 'text/csv');
      
      // Check preview
      const previewData = await dataImportPage.getPreviewData();
      expect(previewData.length).toBeGreaterThan(0);
      
      // Execute import
      await dataImportPage.executeImport();
      
      // Check success
      const isSuccess = await dataImportPage.isImportSuccessful();
      expect(isSuccess).toBe(true);
      
      await dataImportPage.screenshot('import-csv-success');
    });

    test('should import JSON file successfully', async ({ page }) => {
      await dataImportPage.switchToImportTab();
      
      // Select JSON format
      await dataImportPage.selectFormat('json');
      
      // Upload JSON content
      await dataImportPage.uploadFileContent('portfolio.json', testImportData.json, 'application/json');
      
      // Check preview
      const previewData = await dataImportPage.getPreviewData();
      expect(previewData.length).toBeGreaterThan(0);
      
      // Execute import
      await dataImportPage.executeImport();
      
      // Check success
      const isSuccess = await dataImportPage.isImportSuccessful();
      expect(isSuccess).toBe(true);
    });

    test('should handle drag and drop', async ({ page }) => {
      await dataImportPage.switchToImportTab();
      
      // This is a simplified test - actual drag and drop is complex
      // We'll simulate it by using the upload method
      await dataImportPage.dragAndDropFile('portfolio.csv', testImportData.csv);
      
      // Check preview appeared
      const previewData = await dataImportPage.getPreviewData();
      expect(previewData.length).toBeGreaterThan(0);
    });

    test('should validate import data', async ({ page }) => {
      await dataImportPage.switchToImportTab();
      
      // Upload invalid CSV (missing required fields)
      const invalidCsv = `ticker,quantity
AAPL,100
GOOGL,`;
      
      await dataImportPage.uploadFileContent('invalid.csv', invalidCsv, 'text/csv');
      
      // Check for validation warnings
      const warnings = await dataImportPage.getValidationWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      
      await dataImportPage.screenshot('import-validation-warnings');
    });

    test('should handle different encodings', async ({ page }) => {
      await dataImportPage.switchToImportTab();
      
      // Select Shift-JIS encoding for Japanese data
      await dataImportPage.selectEncoding('shift-jis');
      
      // Upload CSV with Japanese characters
      await dataImportPage.uploadFileContent('portfolio-jp.csv', testImportData.csv, 'text/csv');
      
      // Check preview shows Japanese characters correctly
      const previewData = await dataImportPage.getPreviewData();
      const hasJapanese = previewData.some(row => 
        row.some(cell => /[ぁ-んァ-ヶー一-龠]/.test(cell))
      );
      expect(hasJapanese).toBe(true);
    });

    test('should show import progress', async ({ page }) => {
      await dataImportPage.switchToImportTab();
      
      // Upload large file
      const largeData = Array(100).fill(null).map((_, i) => 
        `STOCK${i},Stock ${i},${100 + i},${1000 + i * 10},USD`
      ).join('\n');
      
      await dataImportPage.uploadFileContent('large-portfolio.csv', largeData, 'text/csv');
      
      // Start import
      const importPromise = dataImportPage.executeImport();
      
      // Check loading state appears
      const isLoading = await dataImportPage.isLoading();
      expect(isLoading).toBe(true);
      
      await importPromise;
    });

    test('should handle import errors gracefully', async ({ page }) => {
      await dataImportPage.switchToImportTab();
      
      // Mock API error
      await page.route('**/api/portfolio/import', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Import failed' })
        });
      });
      
      // Try to import
      await dataImportPage.uploadFileContent('portfolio.csv', testImportData.csv, 'text/csv');
      await dataImportPage.executeImport();
      
      // Check error message
      const error = await dataImportPage.getImportError();
      expect(error).toBeTruthy();
    });
  });

  test.describe('Export Functionality', () => {
    test('should export portfolio as CSV', async ({ page }) => {
      await dataImportPage.switchToExportTab();
      
      // Select CSV format
      await dataImportPage.selectExportFormat('csv');
      
      // Download
      const download = await dataImportPage.downloadExport();
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/portfolio.*\.csv/);
      
      // Save and check content
      const path = await download.path();
      const content = fs.readFileSync(path, 'utf8');
      expect(content).toContain('ticker');
      expect(content).toContain('quantity');
    });

    test('should export portfolio as JSON', async ({ page }) => {
      await dataImportPage.switchToExportTab();
      
      // Select JSON format
      await dataImportPage.selectExportFormat('json');
      
      // Download
      const download = await dataImportPage.downloadExport();
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/portfolio.*\.json/);
      
      // Save and check content
      const path = await download.path();
      const content = fs.readFileSync(path, 'utf8');
      const data = JSON.parse(content);
      expect(data).toHaveProperty('holdings');
      expect(Array.isArray(data.holdings)).toBe(true);
    });

    test('should export with current date in filename', async ({ page }) => {
      await dataImportPage.switchToExportTab();
      
      const download = await dataImportPage.downloadExport();
      const filename = download.suggestedFilename();
      
      // Check filename contains date
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      expect(filename).toMatch(datePattern);
    });

    test('should include all portfolio data in export', async ({ page }) => {
      await dataImportPage.switchToExportTab();
      
      // Export as JSON to check all fields
      await dataImportPage.selectExportFormat('json');
      const download = await dataImportPage.downloadExport();
      
      const path = await download.path();
      const content = fs.readFileSync(path, 'utf8');
      const data = JSON.parse(content);
      
      // Check required fields
      expect(data.holdings).toBeDefined();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.exportDate).toBeDefined();
      expect(data.metadata.version).toBeDefined();
      
      // Check holding fields
      if (data.holdings.length > 0) {
        const holding = data.holdings[0];
        expect(holding).toHaveProperty('tickerLocal');
        expect(holding).toHaveProperty('quantity');
        expect(holding).toHaveProperty('purchasePrice');
        expect(holding).toHaveProperty('currency');
      }
    });
  });

  test.describe('Google Drive Integration', () => {
    test('should show Google Drive connection status', async ({ page }) => {
      const status = await dataImportPage.getGoogleDriveStatus();
      
      // Status should be either connected or not connected
      expect(status).toMatch(/接続|未接続|Connected|Not connected/i);
    });

    test('should handle Google Drive button click', async ({ page }) => {
      // Mock the Google Drive API
      await page.route('**/api/google-drive/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connected: false })
        });
      });
      
      await dataImportPage.clickGoogleDrive();
      
      // Should show authentication prompt or status
      const modal = await dataImportPage.isModalVisible();
      const status = await dataImportPage.getGoogleDriveStatus();
      
      expect(modal || status).toBeTruthy();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Switch to import tab
      await dataImportPage.switchToImportTab();
      
      // File input should still be accessible
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
      
      // Test export on mobile
      await dataImportPage.switchToExportTab();
      const exportButton = page.locator('button:has-text("ダウンロード"), button:has-text("Download")');
      await expect(exportButton).toBeVisible();
      
      await dataImportPage.screenshot('data-import-mobile');
    });
  });
});