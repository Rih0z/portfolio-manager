/**
 * monthlyReport unit tests (TDD — テストファースト)
 *
 * 月次レポート生成: 月間リターン計算、トップ銘柄抽出、スコア変化を検証する。
 * @file src/__tests__/unit/utils/monthlyReport.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  generateMonthlyReport,
  calculateMonthlyReturn,
  formatReportSummary,
  type MonthlyReportInput,
  type MonthlyReport,
} from '../../../utils/monthlyReport';

// --- Test helpers ---
const createAsset = (overrides: Record<string, any> = {}) => ({
  ticker: 'VOO',
  name: 'Vanguard S&P 500 ETF',
  currency: 'USD',
  price: 450,
  holdings: 10,
  purchasePrice: 400,
  ...overrides,
});

describe('monthlyReport', () => {
  // =========================================================================
  // calculateMonthlyReturn
  // =========================================================================
  describe('calculateMonthlyReturn', () => {
    it('should calculate positive monthly return', () => {
      const result = calculateMonthlyReturn(10_000_000, 10_500_000);
      expect(result.absoluteChange).toBe(500_000);
      expect(result.percentChange).toBeCloseTo(5.0, 1);
    });

    it('should calculate negative monthly return', () => {
      const result = calculateMonthlyReturn(10_000_000, 9_200_000);
      expect(result.absoluteChange).toBe(-800_000);
      expect(result.percentChange).toBeCloseTo(-8.0, 1);
    });

    it('should return 0 when values are equal', () => {
      const result = calculateMonthlyReturn(10_000_000, 10_000_000);
      expect(result.absoluteChange).toBe(0);
      expect(result.percentChange).toBe(0);
    });

    it('should handle zero opening value', () => {
      const result = calculateMonthlyReturn(0, 1_000_000);
      expect(result.absoluteChange).toBe(1_000_000);
      expect(result.percentChange).toBe(0);
    });

    it('should handle zero closing value', () => {
      const result = calculateMonthlyReturn(10_000_000, 0);
      expect(result.absoluteChange).toBe(-10_000_000);
      expect(result.percentChange).toBeCloseTo(-100, 1);
    });
  });

  // =========================================================================
  // generateMonthlyReport
  // =========================================================================
  describe('generateMonthlyReport', () => {
    const baseInput: MonthlyReportInput = {
      month: '2026-02',
      currentAssets: [
        createAsset({ ticker: 'VOO', price: 450, holdings: 10, purchasePrice: 400 }),
        createAsset({ ticker: 'VTI', price: 250, holdings: 20, purchasePrice: 230 }),
        createAsset({ ticker: 'BND', price: 80, holdings: 50, purchasePrice: 82 }),
      ],
      openingTotalValue: 12_000_000,
      baseCurrency: 'JPY',
      exchangeRate: 150,
      portfolioScore: 72,
      previousMonthScore: 68,
    };

    it('should generate report with correct month', () => {
      const report = generateMonthlyReport(baseInput);
      expect(report.month).toBe('2026-02');
    });

    it('should calculate closing value from current assets', () => {
      const report = generateMonthlyReport(baseInput);
      // VOO: $450*10=$4500 → ¥675,000
      // VTI: $250*20=$5000 → ¥750,000
      // BND: $80*50=$4000  → ¥600,000
      // Total: ¥2,025,000 (baseCurrency=JPY, exchangeRate=150)
      expect(report.closingValue).toBe(2025000);
    });

    it('should calculate monthly return', () => {
      const report = generateMonthlyReport(baseInput);
      expect(report.monthlyReturn).toBeDefined();
      expect(report.monthlyReturnPercent).toBeDefined();
    });

    it('should identify top gainers', () => {
      const report = generateMonthlyReport(baseInput);
      expect(report.topGainers).toBeDefined();
      expect(Array.isArray(report.topGainers)).toBe(true);
    });

    it('should identify top losers', () => {
      const report = generateMonthlyReport(baseInput);
      // BND has negative P&L (80 < 82)
      expect(report.topLosers).toBeDefined();
      expect(Array.isArray(report.topLosers)).toBe(true);
    });

    it('should include score change', () => {
      const report = generateMonthlyReport(baseInput);
      expect(report.scoreChange).toBe(4); // 72 - 68
    });

    it('should include holdings count', () => {
      const report = generateMonthlyReport(baseInput);
      expect(report.holdingsCount).toBe(3);
    });

    it('should handle empty assets', () => {
      const report = generateMonthlyReport({
        ...baseInput,
        currentAssets: [],
        openingTotalValue: 0,
      });
      expect(report.closingValue).toBe(0);
      expect(report.monthlyReturn).toBe(0);
      expect(report.holdingsCount).toBe(0);
    });
  });

  // =========================================================================
  // formatReportSummary
  // =========================================================================
  describe('formatReportSummary', () => {
    it('should format positive return summary in Japanese', () => {
      const report: MonthlyReport = {
        month: '2026-02',
        openingValue: 10_000_000,
        closingValue: 10_500_000,
        monthlyReturn: 500_000,
        monthlyReturnPercent: 5.0,
        topGainers: [{ ticker: 'VOO', name: 'VOO', pnlPercent: 12.5 }],
        topLosers: [],
        scoreChange: 4,
        holdingsCount: 3,
      };
      const summary = formatReportSummary(report, 'JPY', 'ja');
      expect(summary).toContain('2026年2月');
      expect(summary).toContain('+');
    });

    it('should format negative return summary', () => {
      const report: MonthlyReport = {
        month: '2026-02',
        openingValue: 10_000_000,
        closingValue: 9_500_000,
        monthlyReturn: -500_000,
        monthlyReturnPercent: -5.0,
        topGainers: [],
        topLosers: [{ ticker: 'BND', name: 'BND', pnlPercent: -3.2 }],
        scoreChange: -2,
        holdingsCount: 3,
      };
      const summary = formatReportSummary(report, 'JPY', 'ja');
      expect(summary).toContain('-');
    });

    it('should include holdings count', () => {
      const report: MonthlyReport = {
        month: '2026-03',
        openingValue: 0,
        closingValue: 0,
        monthlyReturn: 0,
        monthlyReturnPercent: 0,
        topGainers: [],
        topLosers: [],
        scoreChange: 0,
        holdingsCount: 5,
      };
      const summary = formatReportSummary(report, 'JPY', 'ja');
      expect(summary).toContain('5');
    });
  });
});
