/**
 * Data Import/Export Page Object Model
 */

import { BasePage } from './BasePage.js';

export class DataImportPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      ...this.selectors,
      // Import section
      importTab: 'button:has-text("インポート"), button:has-text("Import")',
      exportTab: 'button:has-text("エクスポート"), button:has-text("Export")',
      
      // File upload
      fileInput: 'input[type="file"]',
      dropZone: '[data-testid="drop-zone"], .drop-zone',
      
      // Import options
      formatSelect: 'select[name="format"], [data-testid="format-select"]',
      encodingSelect: 'select[name="encoding"], [data-testid="encoding-select"]',
      
      // Preview
      previewTable: '[data-testid="preview-table"], .preview-table',
      previewRow: '[data-testid="preview-row"], .preview-table tbody tr',
      
      // Actions
      importButton: 'button:has-text("インポート実行"), button:has-text("Import Data")',
      cancelButton: 'button:has-text("キャンセル"), button:has-text("Cancel")',
      
      // Export options
      exportFormatSelect: '[data-testid="export-format-select"]',
      downloadButton: 'button:has-text("ダウンロード"), button:has-text("Download")',
      
      // Google Drive
      googleDriveButton: 'button:has-text("Google Drive")',
      googleDriveStatus: '[data-testid="google-drive-status"]',
      
      // Messages
      successMessage: '[data-testid="import-success"], .success-message',
      errorMessage: '[data-testid="import-error"], .error-message',
      validationWarning: '[data-testid="validation-warning"], .warning-message'
    };
  }

  /**
   * Navigate to data import page
   */
  async goto() {
    await super.goto('/data');
    await this.waitForPageLoad();
  }

  /**
   * Switch to import tab
   */
  async switchToImportTab() {
    await this.page.locator(this.selectors.importTab).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to export tab
   */
  async switchToExportTab() {
    await this.page.locator(this.selectors.exportTab).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Upload file via file input
   */
  async uploadFile(filePath) {
    await this.page.setInputFiles(this.selectors.fileInput, filePath);
    await this.waitForPreview();
  }

  /**
   * Upload file content programmatically
   */
  async uploadFileContent(fileName, content, mimeType = 'text/csv') {
    const buffer = Buffer.from(content, 'utf-8');
    
    await this.page.setInputFiles(this.selectors.fileInput, {
      name: fileName,
      mimeType: mimeType,
      buffer: buffer
    });
    
    await this.waitForPreview();
  }

  /**
   * Drag and drop file
   */
  async dragAndDropFile(fileName, content) {
    const dropZone = this.page.locator(this.selectors.dropZone);
    
    // Create a data transfer
    await dropZone.dispatchEvent('dragenter', {
      dataTransfer: { files: [] }
    });
    
    await dropZone.dispatchEvent('dragover', {
      dataTransfer: { files: [] }
    });
    
    // This is a simplified version - actual file drop is complex in Playwright
    // For real tests, use uploadFile or uploadFileContent instead
    await this.uploadFileContent(fileName, content);
  }

  /**
   * Wait for preview to load
   */
  async waitForPreview() {
    await this.page.waitForSelector(this.selectors.previewTable, { 
      state: 'visible',
      timeout: 10000 
    });
  }

  /**
   * Get preview data
   */
  async getPreviewData() {
    const rows = this.page.locator(this.selectors.previewRow);
    const count = await rows.count();
    const data = [];
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cells = row.locator('td');
      const cellCount = await cells.count();
      const rowData = [];
      
      for (let j = 0; j < cellCount; j++) {
        rowData.push(await cells.nth(j).textContent());
      }
      
      data.push(rowData);
    }
    
    return data;
  }

  /**
   * Select import format
   */
  async selectFormat(format) {
    await this.page.selectOption(this.selectors.formatSelect, format);
  }

  /**
   * Select encoding
   */
  async selectEncoding(encoding) {
    await this.page.selectOption(this.selectors.encodingSelect, encoding);
  }

  /**
   * Execute import
   */
  async executeImport() {
    await this.page.locator(this.selectors.importButton).click();
    
    // Wait for import to complete
    await this.page.waitForSelector(
      `${this.selectors.successMessage}, ${this.selectors.errorMessage}`,
      { state: 'visible', timeout: 30000 }
    );
  }

  /**
   * Check if import was successful
   */
  async isImportSuccessful() {
    const success = this.page.locator(this.selectors.successMessage);
    return await success.isVisible();
  }

  /**
   * Get import error message
   */
  async getImportError() {
    const error = this.page.locator(this.selectors.errorMessage);
    if (await error.isVisible()) {
      return await error.textContent();
    }
    return null;
  }

  /**
   * Get validation warnings
   */
  async getValidationWarnings() {
    const warnings = this.page.locator(this.selectors.validationWarning);
    const count = await warnings.count();
    const messages = [];
    
    for (let i = 0; i < count; i++) {
      messages.push(await warnings.nth(i).textContent());
    }
    
    return messages;
  }

  /**
   * Select export format
   */
  async selectExportFormat(format) {
    await this.page.selectOption(this.selectors.exportFormatSelect, format);
  }

  /**
   * Download export file
   */
  async downloadExport() {
    // Start waiting for download before clicking
    const downloadPromise = this.page.waitForEvent('download');
    
    await this.page.locator(this.selectors.downloadButton).click();
    
    const download = await downloadPromise;
    return download;
  }

  /**
   * Check Google Drive connection status
   */
  async getGoogleDriveStatus() {
    const status = this.page.locator(this.selectors.googleDriveStatus);
    if (await status.count() > 0) {
      return await status.textContent();
    }
    return null;
  }

  /**
   * Click Google Drive button
   */
  async clickGoogleDrive() {
    await this.page.locator(this.selectors.googleDriveButton).click();
  }
}