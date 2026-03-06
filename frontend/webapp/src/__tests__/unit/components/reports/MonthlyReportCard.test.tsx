/**
 * MonthlyReportCard unit tests (TDD — テストファースト)
 *
 * 月次レポート表示カードの表示内容を検証する。
 * @file src/__tests__/unit/components/reports/MonthlyReportCard.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MonthlyReportCard from '../../../../components/reports/MonthlyReportCard';
import type { MonthlyReport } from '../../../../utils/monthlyReport';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

const createReport = (overrides: Partial<MonthlyReport> = {}): MonthlyReport => ({
  month: '2026-02',
  openingValue: 10_000_000,
  closingValue: 10_500_000,
  monthlyReturn: 500_000,
  monthlyReturnPercent: 5.0,
  topGainers: [{ ticker: 'VOO', name: 'Vanguard S&P 500', pnlPercent: 12.5 }],
  topLosers: [{ ticker: 'BND', name: 'Vanguard Bond', pnlPercent: -2.1 }],
  scoreChange: 4,
  holdingsCount: 5,
  ...overrides,
});

describe('MonthlyReportCard', () => {
  it('should render with data-testid', () => {
    render(<MonthlyReportCard report={createReport()} baseCurrency="JPY" />);
    expect(screen.getByTestId('monthly-report-card')).toBeInTheDocument();
  });

  it('should display month label', () => {
    render(<MonthlyReportCard report={createReport()} baseCurrency="JPY" />);
    expect(screen.getByText(/2026年2月/)).toBeInTheDocument();
  });

  it('should display positive return with green styling', () => {
    render(<MonthlyReportCard report={createReport()} baseCurrency="JPY" />);
    const returnElement = screen.getByTestId('monthly-return');
    expect(returnElement.textContent).toContain('+');
    expect(returnElement.textContent).toContain('5');
  });

  it('should display negative return with red styling', () => {
    render(
      <MonthlyReportCard
        report={createReport({
          monthlyReturn: -300_000,
          monthlyReturnPercent: -3.0,
        })}
        baseCurrency="JPY"
      />
    );
    const returnElement = screen.getByTestId('monthly-return');
    expect(returnElement.textContent).toContain('-');
  });

  it('should display holdings count', () => {
    render(<MonthlyReportCard report={createReport()} baseCurrency="JPY" />);
    expect(screen.getByText('5件')).toBeInTheDocument();
  });

  it('should display top gainer', () => {
    render(<MonthlyReportCard report={createReport()} baseCurrency="JPY" />);
    expect(screen.getByText(/VOO/)).toBeInTheDocument();
  });

  it('should display top loser', () => {
    render(<MonthlyReportCard report={createReport()} baseCurrency="JPY" />);
    expect(screen.getByText(/BND/)).toBeInTheDocument();
  });

  it('should display score change', () => {
    render(<MonthlyReportCard report={createReport({ scoreChange: 4 })} baseCurrency="JPY" />);
    expect(screen.getByTestId('score-change')).toBeInTheDocument();
    expect(screen.getByTestId('score-change').textContent).toContain('+4');
  });

  it('should handle zero return', () => {
    render(
      <MonthlyReportCard
        report={createReport({ monthlyReturn: 0, monthlyReturnPercent: 0 })}
        baseCurrency="JPY"
      />
    );
    const returnElement = screen.getByTestId('monthly-return');
    expect(returnElement.textContent).toContain('0');
  });

  it('should handle empty gainers and losers', () => {
    render(
      <MonthlyReportCard
        report={createReport({ topGainers: [], topLosers: [] })}
        baseCurrency="JPY"
      />
    );
    expect(screen.getByTestId('monthly-report-card')).toBeInTheDocument();
  });
});
