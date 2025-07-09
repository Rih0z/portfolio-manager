/**
 * AI Advisor E2E Tests
 */

import { test, expect } from '@playwright/test';
import { AIAdvisorPage } from '../pages/AIAdvisorPage.js';
import { testAIPrompts, testPortfolioData } from '../fixtures/test-data.js';
import { waitForAppReady, setupAPIMocks } from '../utils/helpers.js';

test.describe('AI Advisor Functionality', () => {
  let aiAdvisorPage;

  test.beforeEach(async ({ page }) => {
    aiAdvisorPage = new AIAdvisorPage(page);
    
    // Setup API mocks
    await setupAPIMocks(page, {
      portfolio: testPortfolioData,
      config: {
        features: {
          aiAdvisor: true,
          authentication: false
        }
      }
    });
    
    // Mock AI analysis endpoint
    await page.route('**/api/ai/analyze', async (route) => {
      const request = route.request();
      const data = request.postDataJSON();
      
      // Simulate processing delay
      await page.waitForTimeout(2000);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          analysis: {
            summary: 'ポートフォリオは適切に分散されています。',
            risk: {
              level: '中',
              description: '市場変動リスクは中程度です。テクノロジー株への集中が見られます。'
            },
            recommendations: [
              '債券への配分を10-15%増やすことを検討してください。',
              '新興市場株式への分散投資を考慮してください。',
              '定期的なリバランスを実施してください。'
            ],
            marketInsights: '現在の市場環境では、防御的な資産配分が推奨されます。'
          },
          metadata: {
            model: 'gpt-4',
            timestamp: new Date().toISOString(),
            tokensUsed: 1500
          }
        })
      });
    });
    
    await aiAdvisorPage.goto();
    await waitForAppReady(page);
  });

  test.describe('AI Prompt Interface', () => {
    test('should display prompt templates', async ({ page }) => {
      const templates = await aiAdvisorPage.getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      // Should include common analysis types
      const hasRiskAnalysis = templates.some(t => 
        t.includes('リスク') || t.includes('Risk')
      );
      expect(hasRiskAnalysis).toBe(true);
    });

    test('should allow custom prompt input', async ({ page }) => {
      const customPrompt = 'カスタム分析：長期投資戦略について教えてください。';
      await aiAdvisorPage.enterPrompt(customPrompt);
      
      // Verify prompt was entered
      const promptTextarea = page.locator('textarea[name="prompt"]');
      const value = await promptTextarea.inputValue();
      expect(value).toBe(customPrompt);
    });

    test('should select and use template', async ({ page }) => {
      // Select risk analysis template
      await aiAdvisorPage.selectTemplate('リスク分析');
      
      // Check prompt was populated
      const promptTextarea = page.locator('textarea[name="prompt"]');
      const value = await promptTextarea.inputValue();
      expect(value).toContain('リスク');
    });

    test('should validate prompt before analysis', async ({ page }) => {
      // Try to analyze with empty prompt
      await aiAdvisorPage.enterPrompt('');
      await aiAdvisorPage.startAnalysis();
      
      // Should show validation error
      const error = page.locator('text=/プロンプトを入力|Enter prompt|必須/i');
      await expect(error).toBeVisible();
    });
  });

  test.describe('AI Analysis Process', () => {
    test('should show progress during analysis', async ({ page }) => {
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      
      // Check analyzing state
      const isAnalyzing = await aiAdvisorPage.isAnalyzing();
      expect(isAnalyzing).toBe(true);
      
      // Progress indicator should be visible
      const progress = await aiAdvisorPage.getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      
      // Wait for completion
      await aiAdvisorPage.waitForAnalysisComplete();
    });

    test('should display analysis results', async ({ page }) => {
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Get results
      const results = await aiAdvisorPage.getAnalysisResults();
      expect(results.full).toBeTruthy();
      
      // Check for key sections
      if (results.risk) {
        expect(results.risk).toContain('リスク');
      }
      
      if (results.recommendations) {
        expect(results.recommendations).toBeTruthy();
      }
      
      await aiAdvisorPage.screenshot('ai-analysis-results');
    });

    test('should handle analysis errors', async ({ page }) => {
      // Mock error response
      await page.route('**/api/ai/analyze', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'AI service temporarily unavailable' 
          })
        });
      });
      
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      
      // Should show error message
      const error = await page.locator('text=/エラー|Error|失敗/i').first();
      await expect(error).toBeVisible({ timeout: 10000 });
    });

    test('should allow canceling analysis', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/ai/analyze', async (route) => {
        await page.waitForTimeout(30000); // Very long delay
        await route.fulfill({ status: 200 });
      });
      
      await aiAdvisorPage.enterPrompt(testAIPrompts.marketTrends);
      await aiAdvisorPage.startAnalysis();
      
      // Cancel button should appear
      const cancelButton = page.locator('button:has-text("キャンセル"), button:has-text("Cancel")');
      await expect(cancelButton).toBeVisible();
      
      await cancelButton.click();
      
      // Should stop analyzing
      const isAnalyzing = await aiAdvisorPage.isAnalyzing();
      expect(isAnalyzing).toBe(false);
    });
  });

  test.describe('Results Management', () => {
    test('should copy results to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      
      // Run analysis
      await aiAdvisorPage.enterPrompt(testAIPrompts.optimizationSuggestion);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Copy results
      await aiAdvisorPage.copyResults();
      
      // Verify copy notification
      const notification = page.locator('text=/コピーしました|Copied/i');
      await expect(notification).toBeVisible();
    });

    test('should clear results', async ({ page }) => {
      // Run analysis
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Clear results
      await aiAdvisorPage.clearResults();
      
      // Results should be gone
      const results = page.locator('[data-testid="ai-results"]');
      const hasContent = await results.textContent();
      expect(hasContent).toBeFalsy();
    });

    test('should export analysis as PDF', async ({ page }) => {
      // Run analysis first
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Export as PDF
      const download = await aiAdvisorPage.exportPDF();
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test('should export analysis as Markdown', async ({ page }) => {
      // Run analysis first
      await aiAdvisorPage.enterPrompt(testAIPrompts.marketTrends);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Export as Markdown
      const download = await aiAdvisorPage.exportMarkdown();
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.md$/);
    });
  });

  test.describe('Analysis History', () => {
    test('should show analysis history', async ({ page }) => {
      // Run multiple analyses
      const prompts = [
        testAIPrompts.riskAnalysis,
        testAIPrompts.optimizationSuggestion
      ];
      
      for (const prompt of prompts) {
        await aiAdvisorPage.enterPrompt(prompt);
        await aiAdvisorPage.startAnalysis();
        await aiAdvisorPage.waitForAnalysisComplete();
        await aiAdvisorPage.clearResults();
      }
      
      // Check history
      const history = await aiAdvisorPage.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    test('should load previous analysis from history', async ({ page }) => {
      // Run analysis
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      await aiAdvisorPage.clearResults();
      
      // Select from history
      await aiAdvisorPage.selectHistoryItem(0);
      
      // Prompt should be populated
      const promptTextarea = page.locator('textarea[name="prompt"]');
      const value = await promptTextarea.inputValue();
      expect(value).toContain('リスク');
    });
  });

  test.describe('Advanced Settings', () => {
    test('should configure advanced AI settings', async ({ page }) => {
      await aiAdvisorPage.updateAdvancedSettings({
        temperature: 0.7,
        maxLength: 2000
      });
      
      // Run analysis with custom settings
      await aiAdvisorPage.enterPrompt(testAIPrompts.marketTrends);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Results should reflect settings (length check)
      const results = await aiAdvisorPage.getAnalysisResults();
      expect(results.full.length).toBeLessThanOrEqual(2000 * 4); // Rough character estimate
    });
  });

  test.describe('Portfolio Context', () => {
    test('should include portfolio context in analysis', async ({ page }) => {
      // Verify portfolio data is available
      const portfolioInfo = page.locator('[data-testid="portfolio-context"], .portfolio-summary');
      if (await portfolioInfo.count() > 0) {
        await expect(portfolioInfo).toBeVisible();
      }
      
      // Run analysis
      await aiAdvisorPage.enterPrompt('現在のポートフォリオを分析してください。');
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Results should reference portfolio holdings
      const results = await aiAdvisorPage.getAnalysisResults();
      const mentionsHoldings = 
        results.full.includes('AAPL') || 
        results.full.includes('ソフトバンク') ||
        results.full.includes('トヨタ');
      
      expect(mentionsHoldings).toBe(true);
    });

    test('should update analysis when portfolio changes', async ({ page }) => {
      // Initial analysis
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      const initialResults = await aiAdvisorPage.getAnalysisResults();
      
      // Update portfolio mock
      await setupAPIMocks(page, {
        portfolio: {
          ...testPortfolioData,
          holdings: [
            ...testPortfolioData.holdings,
            { tickerLocal: 'GOOGL', name: 'Alphabet', quantity: 50, currentPrice: 150 }
          ]
        }
      });
      
      // Run analysis again
      await aiAdvisorPage.clearResults();
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      const newResults = await aiAdvisorPage.getAnalysisResults();
      
      // Results should be different
      expect(newResults.full).not.toBe(initialResults.full);
    });
  });

  test.describe('Mobile AI Advisor', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Prompt input should be accessible
      const promptTextarea = page.locator('textarea[name="prompt"]');
      await expect(promptTextarea).toBeVisible();
      
      // Templates might be in dropdown on mobile
      const templates = await aiAdvisorPage.getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      // Run analysis
      await aiAdvisorPage.enterPrompt(testAIPrompts.riskAnalysis);
      await aiAdvisorPage.startAnalysis();
      await aiAdvisorPage.waitForAnalysisComplete();
      
      // Results should be visible
      const results = await aiAdvisorPage.getAnalysisResults();
      expect(results.full).toBeTruthy();
      
      await aiAdvisorPage.screenshot('ai-advisor-mobile');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limit errors', async ({ page }) => {
      // Mock rate limit response
      let requestCount = 0;
      await page.route('**/api/ai/analyze', async (route) => {
        requestCount++;
        if (requestCount > 2) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Rate limit exceeded',
              retryAfter: 60
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Make multiple requests
      for (let i = 0; i < 3; i++) {
        await aiAdvisorPage.enterPrompt(`Test ${i}`);
        await aiAdvisorPage.startAnalysis();
        
        if (i < 2) {
          await aiAdvisorPage.waitForAnalysisComplete();
          await aiAdvisorPage.clearResults();
        }
      }
      
      // Should show rate limit error
      const error = page.locator('text=/制限|Rate limit|しばらく/i');
      await expect(error).toBeVisible();
    });
  });
});