/**
 * PnLTrendChart unit tests
 *
 * 通貨換算ロジック検証（9-BX ルール準拠）:
 * - チャートデータ計算時の通貨換算
 * - 価格履歴なし資産のフォールバック
 * - Y軸/ツールチップのフォーマット
 *
 * @file src/__tests__/unit/components/dashboard/PnLTrendChart.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
const mockPortfolioContext: Record<string, any> = {};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

const mockFetchMultiplePriceHistories = vi.fn();

vi.mock('../../../../services/priceHistoryService', () => ({
  fetchMultiplePriceHistories: (...args: any[]) => mockFetchMultiplePriceHistories(...args),
}));

vi.mock('../../../../utils/logger', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// Mock Recharts to render data as testable elements
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ data, children }: any) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ tickFormatter }: any) => {
    // Expose formatter for testing
    if (tickFormatter) {
      (window as any).__yAxisFormatter = tickFormatter;
    }
    return <div data-testid="y-axis" />;
  },
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ formatter }: any) => {
    if (formatter) {
      (window as any).__tooltipFormatter = formatter;
    }
    return <div data-testid="tooltip" />;
  },
}));

import PnLTrendChart from '../../../../components/dashboard/PnLTrendChart';

// --- Helper ---
function setContext(overrides: Record<string, any> = {}) {
  Object.assign(mockPortfolioContext, {
    baseCurrency: 'JPY',
    currentAssets: [],
    exchangeRate: { rate: 150 },
    ...overrides,
  });
}

function generateDates(count: number): string[] {
  const dates: string[] = [];
  const base = new Date('2026-03-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function createPriceHistory(ticker: string, dates: string[], prices: number[]) {
  return {
    [ticker]: {
      ticker,
      prices: dates.map((date, i) => ({ date, close: prices[i] || prices[prices.length - 1] })),
    },
  };
}

describe('PnLTrendChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setContext();
    mockFetchMultiplePriceHistories.mockResolvedValue({});
    delete (window as any).__yAxisFormatter;
    delete (window as any).__tooltipFormatter;
  });

  // === ローディング・空状態 ===
  it('shows loading skeleton initially', () => {
    setContext({
      currentAssets: [{ ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' }],
    });
    mockFetchMultiplePriceHistories.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<PnLTrendChart />);
    // Loading state shows pulse animation skeleton
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows insufficient data message when less than 7 data points', async () => {
    const dates = generateDates(3);
    setContext({
      currentAssets: [{ ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' }],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('AAPL', dates, [100, 101, 102])
    );
    render(<PnLTrendChart />);
    await waitFor(() => {
      expect(screen.getByText('価格履歴を蓄積中です。数日後にグラフが表示されます。')).toBeInTheDocument();
    });
  });

  // === 通貨換算テスト — チャートデータ ===
  it('converts USD asset values to JPY in chart data', async () => {
    const dates = generateDates(10);
    const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];

    setContext({
      currentAssets: [
        { ticker: 'AAPL', price: 109, holdings: 10, currency: 'USD' },
      ],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('AAPL', dates, prices)
    );

    render(<PnLTrendChart />);

    await waitFor(() => {
      const chart = screen.getByTestId('area-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data')!);
      expect(data.length).toBeGreaterThanOrEqual(7);
      // First data point: 100 * 10 * 150 = 150,000
      expect(data[0].value).toBe(150000);
      // Last data point: 109 * 10 * 150 = 163,500
      expect(data[data.length - 1].value).toBe(163500);
    });
  });

  it('converts JPY asset values to USD in chart data', async () => {
    const dates = generateDates(10);
    const prices = [3000, 3010, 3020, 3030, 3040, 3050, 3060, 3070, 3080, 3090];

    setContext({
      baseCurrency: 'USD',
      currentAssets: [
        { ticker: '7203', price: 3090, holdings: 100, currency: 'JPY' },
      ],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('7203', dates, prices)
    );

    render(<PnLTrendChart />);

    await waitFor(() => {
      const chart = screen.getByTestId('area-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data')!);
      expect(data.length).toBeGreaterThanOrEqual(7);
      // First: 3000 * 100 / 150 = 2000
      expect(data[0].value).toBe(2000);
      // Last: 3090 * 100 / 150 = 2060
      expect(data[data.length - 1].value).toBe(2060);
    });
  });

  it('aggregates mixed USD+JPY assets correctly', async () => {
    const dates = generateDates(10);

    setContext({
      currentAssets: [
        { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
        { ticker: '7203', price: 3000, holdings: 100, currency: 'JPY' },
      ],
    });

    mockFetchMultiplePriceHistories.mockResolvedValue({
      ...createPriceHistory('AAPL', dates, Array(10).fill(100)),
      ...createPriceHistory('7203', dates, Array(10).fill(3000)),
    });

    render(<PnLTrendChart />);

    await waitFor(() => {
      const chart = screen.getByTestId('area-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data')!);
      // AAPL: 100 * 10 * 150 = 150,000 JPY
      // 7203: 3000 * 100 = 300,000 JPY
      // Total: 450,000 JPY
      expect(data[0].value).toBe(450000);
    });
  });

  // === 価格履歴なし資産のフォールバック ===
  it('uses current price for assets without history', async () => {
    const dates = generateDates(10);

    setContext({
      currentAssets: [
        { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
        { ticker: 'NEW', price: 50, holdings: 20, currency: 'USD' }, // no history
      ],
    });

    // Only AAPL has history
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('AAPL', dates, Array(10).fill(100))
    );

    render(<PnLTrendChart />);

    await waitFor(() => {
      const chart = screen.getByTestId('area-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data')!);
      // AAPL: 100 * 10 * 150 = 150,000
      // NEW: 50 * 20 * 150 = 150,000 (current price fallback, converted)
      // Total: 300,000
      expect(data[0].value).toBe(300000);
    });
  });

  // === Y軸フォーマッター ===
  it('formats Y-axis values correctly for JPY', async () => {
    const dates = generateDates(10);
    setContext({
      baseCurrency: 'JPY',
      currentAssets: [
        { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
      ],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('AAPL', dates, Array(10).fill(100))
    );

    render(<PnLTrendChart />);

    await waitFor(() => {
      const formatter = (window as any).__yAxisFormatter;
      expect(formatter).toBeDefined();
      expect(formatter(1500000)).toBe('1.5M');
      expect(formatter(150000)).toBe('150K');
      expect(formatter(500)).toBe('500');
    });
  });

  it('formats Y-axis values correctly for USD', async () => {
    const dates = generateDates(10);
    setContext({
      baseCurrency: 'USD',
      currentAssets: [
        { ticker: '7203', price: 3000, holdings: 100, currency: 'JPY' },
      ],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('7203', dates, Array(10).fill(3000))
    );

    render(<PnLTrendChart />);

    await waitFor(() => {
      const formatter = (window as any).__yAxisFormatter;
      expect(formatter).toBeDefined();
      expect(formatter(1500000)).toBe('$1.5M');
      expect(formatter(150000)).toBe('$150K');
      expect(formatter(500)).toBe('$500');
    });
  });

  // === ツールチップフォーマッター ===
  it('formats tooltip with correct currency symbol', async () => {
    const dates = generateDates(10);
    setContext({
      baseCurrency: 'JPY',
      currentAssets: [
        { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
      ],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('AAPL', dates, Array(10).fill(100))
    );

    render(<PnLTrendChart />);

    await waitFor(() => {
      const formatter = (window as any).__tooltipFormatter;
      expect(formatter).toBeDefined();
      const [value, label] = formatter(150000);
      expect(value).toBe('¥150,000');
      expect(label).toBe('参考評価額');
    });
  });

  // === 期間切り替え ===
  it('calls fetchMultiplePriceHistories with selected period', async () => {
    const dates = generateDates(10);
    setContext({
      currentAssets: [
        { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
      ],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('AAPL', dates, Array(10).fill(100))
    );

    render(<PnLTrendChart />);

    // Wait for initial chart render
    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    expect(mockFetchMultiplePriceHistories).toHaveBeenCalledWith(['AAPL'], '1m');

    // Switch to 3M
    const btn3M = screen.getByLabelText('3ヶ月の推移を表示');
    fireEvent.click(btn3M);

    await waitFor(() => {
      expect(mockFetchMultiplePriceHistories).toHaveBeenCalledWith(['AAPL'], '3m');
    });
  });

  // === exchangeRate undefined フォールバック ===
  it('uses fallback rate=150 when exchangeRate is undefined', async () => {
    const dates = generateDates(10);
    setContext({
      exchangeRate: undefined,
      currentAssets: [
        { ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' },
      ],
    });
    mockFetchMultiplePriceHistories.mockResolvedValue(
      createPriceHistory('AAPL', dates, Array(10).fill(100))
    );

    render(<PnLTrendChart />);

    await waitFor(() => {
      const chart = screen.getByTestId('area-chart');
      const data = JSON.parse(chart.getAttribute('data-chart-data')!);
      // Fallback rate=150: 100 * 10 * 150 = 150,000
      expect(data[0].value).toBe(150000);
    });
  });
});
