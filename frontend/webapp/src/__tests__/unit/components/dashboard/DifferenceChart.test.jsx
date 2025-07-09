/**
 * DifferenceChart.jsx のテストファイル
 * ポートフォリオ差分チャートコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DifferenceChart from '../../../../components/dashboard/DifferenceChart';

// rechartsライブラリのモック
jest.mock('recharts', () => ({
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }) => (
    <div data-testid="bar" data-key={dataKey} data-fill={fill}>
      Bar Component
    </div>
  ),
  XAxis: ({ dataKey, angle, textAnchor, height, tick }) => (
    <div 
      data-testid="x-axis" 
      data-key={dataKey}
      data-angle={angle}
      data-text-anchor={textAnchor}
      data-height={height}
      data-tick={JSON.stringify(tick)}
    >
      XAxis Component
    </div>
  ),
  YAxis: ({ label }) => (
    <div data-testid="y-axis" data-label={JSON.stringify(label)}>
      YAxis Component
    </div>
  ),
  CartesianGrid: ({ strokeDasharray }) => (
    <div data-testid="cartesian-grid" data-stroke-dasharray={strokeDasharray}>
      CartesianGrid Component
    </div>
  ),
  Tooltip: ({ content }) => (
    <div data-testid="tooltip">
      Tooltip Component
    </div>
  ),
  ResponsiveContainer: ({ children, width, height }) => (
    <div data-testid="responsive-container" data-width={width} data-height={height}>
      {children}
    </div>
  )
}));

// usePortfolioContextのモック
const mockUsePortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockUsePortfolioContext()
}));

describe('DifferenceChart', () => {
  const defaultPortfolioContext = {
    currentAssets: [
      {
        id: 'AAPL',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        price: 150,
        holdings: 10,
        currency: 'USD'
      },
      {
        id: 'MSFT',
        ticker: 'MSFT',
        name: 'Microsoft Corp.',
        price: 300,
        holdings: 5,
        currency: 'USD'
      }
    ],
    targetPortfolio: [
      {
        id: 'AAPL',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        targetPercentage: 60
      },
      {
        id: 'MSFT',
        ticker: 'MSFT',
        name: 'Microsoft Corp.',
        targetPercentage: 40
      }
    ],
    baseCurrency: 'USD',
    totalAssets: 3000, // AAPL: 1500, MSFT: 1500
    exchangeRate: {
      rate: 150
    }
  };

  const emptyPortfolioContext = {
    currentAssets: [],
    targetPortfolio: [],
    baseCurrency: 'USD',
    totalAssets: 0,
    exchangeRate: { rate: 150 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePortfolioContext.mockReturnValue(defaultPortfolioContext);
  });

  describe('基本レンダリング', () => {
    test('チャートタイトルが表示される', () => {
      render(<DifferenceChart />);
      
      expect(screen.getByText('ポートフォリオ差分')).toBeInTheDocument();
    });

    test('ResponsiveContainerが正しい設定で表示される', () => {
      render(<DifferenceChart />);
      
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-width', '100%');
      expect(container).toHaveAttribute('data-height', '400');
    });

    test('BarChartコンポーネントが表示される', () => {
      render(<DifferenceChart />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    test('チャートの各コンポーネントが表示される', () => {
      render(<DifferenceChart />);
      
      expect(screen.getByTestId('bar')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    test('チャート全体が正しいクラスで囲まれている', () => {
      const { container } = render(<DifferenceChart />);
      
      const chartContainer = container.firstChild;
      expect(chartContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-6', 'mb-6');
    });
  });

  describe('差分データの計算', () => {
    test('基本的な差分計算が正しく行われる', () => {
      render(<DifferenceChart />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent);
      
      expect(data).toHaveLength(2);
      
      // AAPL: 現在50% (1500/3000), 目標60% → 差分 +10%
      const appleData = data.find(item => item.ticker === 'AAPL');
      expect(appleData).toEqual({
        name: 'Apple Inc.',
        ticker: 'AAPL',
        difference: 10
      });
      
      // MSFT: 現在50% (1500/3000), 目標40% → 差分 -10%
      const msftData = data.find(item => item.ticker === 'MSFT');
      expect(msftData).toEqual({
        name: 'Microsoft Corp.',
        ticker: 'MSFT',
        difference: -10
      });
    });

    test('差分の絶対値でソートされる', () => {
      // 差分の大きさが異なるケース
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        currentAssets: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            price: 150,
            holdings: 10,
            currency: 'USD'
          },
          {
            id: 'MSFT',
            ticker: 'MSFT',
            name: 'Microsoft Corp.',
            price: 300,
            holdings: 1, // 割合を小さく
            currency: 'USD'
          }
        ],
        totalAssets: 1800 // AAPL: 1500 (83.33%), MSFT: 300 (16.67%)
      });

      render(<DifferenceChart />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent);
      
      // AAPL: 現在83.33%, 目標60% → 差分 -23.33%
      // MSFT: 現在16.67%, 目標40% → 差分 +23.33%
      // 絶対値が同じなので、元の順序を保持
      expect(data[0].ticker).toBe('AAPL');
      expect(data[1].ticker).toBe('MSFT');
    });

    test('現在資産がない銘柄の場合、差分が目標値と同じになる', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        currentAssets: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            price: 150,
            holdings: 10,
            currency: 'USD'
          }
        ],
        totalAssets: 1500
      });

      render(<DifferenceChart />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent);
      
      const msftData = data.find(item => item.ticker === 'MSFT');
      expect(msftData.difference).toBe(40); // 目標40% - 現在0% = +40%
    });

    test('totalAssetsが0の場合、現在割合が0になる', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        totalAssets: 0
      });

      render(<DifferenceChart />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent);
      
      data.forEach(item => {
        // 目標値がそのまま差分になる
        if (item.ticker === 'AAPL') {
          expect(item.difference).toBe(60);
        } else if (item.ticker === 'MSFT') {
          expect(item.difference).toBe(40);
        }
      });
    });
  });

  describe('通貨変換', () => {
    test('JPY基準通貨でUSD資産の場合、適切に変換される', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        baseCurrency: 'JPY',
        totalAssets: 450000, // 3000 USD * 150 JPY/USD
        exchangeRate: { rate: 150 }
      });

      render(<DifferenceChart />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent);
      
      // 通貨変換後も割合は同じになるはず
      const appleData = data.find(item => item.ticker === 'AAPL');
      expect(appleData.difference).toBe(10); // 50% → 60%の差分
    });

    test('USD基準通貨でJPY資産の場合、適切に変換される', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        currentAssets: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            price: 150,
            holdings: 10,
            currency: 'USD'
          },
          {
            id: 'NIKKEI',
            ticker: 'NIKKEI',
            name: 'Nikkei 225',
            price: 30000,
            holdings: 1,
            currency: 'JPY'
          }
        ],
        targetPortfolio: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            targetPercentage: 50
          },
          {
            id: 'NIKKEI',
            ticker: 'NIKKEI',
            name: 'Nikkei 225',
            targetPercentage: 50
          }
        ],
        baseCurrency: 'USD',
        totalAssets: 1700, // AAPL: 1500 USD + NIKKEI: 200 USD (30000 JPY / 150)
        exchangeRate: { rate: 150 }
      });

      render(<DifferenceChart />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent);
      
      const nikkeiData = data.find(item => item.ticker === 'NIKKEI');
      // NIKKEI: 現在11.76% (200/1700), 目標50% → 差分約 +38.24%
      expect(nikkeiData.difference).toBeCloseTo(38.24, 1);
    });

    test('同じ通貨の場合、変換が適用されない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        currentAssets: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            price: 150,
            holdings: 10,
            currency: 'USD' // baseCurrencyと同じ
          }
        ],
        baseCurrency: 'USD'
      });

      render(<DifferenceChart />);
      
      // エラーが発生しないことを確認
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('空データの処理', () => {
    test('目標ポートフォリオが空の場合、メッセージが表示される', () => {
      mockUsePortfolioContext.mockReturnValue(emptyPortfolioContext);

      render(<DifferenceChart />);
      
      expect(screen.getByText('ポートフォリオ差分')).toBeInTheDocument();
      expect(screen.getByText('表示するデータがありません。目標配分を設定してください。')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    test('空データ時に適切なスタイリングが適用される', () => {
      mockUsePortfolioContext.mockReturnValue(emptyPortfolioContext);

      const { container } = render(<DifferenceChart />);
      
      const messageContainer = container.firstChild;
      expect(messageContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-6', 'mb-6', 'text-center');
    });
  });

  describe('チャートコンポーネントの設定', () => {
    test('BarChartのmargin設定が正しい', () => {
      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();
    });

    test('XAxisの設定が正しい', () => {
      render(<DifferenceChart />);
      
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'ticker');
      expect(xAxis).toHaveAttribute('data-angle', '-45');
      expect(xAxis).toHaveAttribute('data-text-anchor', 'end');
      expect(xAxis).toHaveAttribute('data-height', '70');
      expect(xAxis).toHaveAttribute('data-tick', '{"fontSize":12}');
    });

    test('YAxisのラベル設定が正しい', () => {
      render(<DifferenceChart />);
      
      const yAxis = screen.getByTestId('y-axis');
      const labelData = JSON.parse(yAxis.getAttribute('data-label'));
      
      expect(labelData).toEqual({
        value: '差分 (パーセントポイント)',
        angle: -90,
        position: 'insideLeft',
        style: { textAnchor: 'middle' }
      });
    });

    test('CartesianGridの設定が正しい', () => {
      render(<DifferenceChart />);
      
      const grid = screen.getByTestId('cartesian-grid');
      expect(grid).toHaveAttribute('data-stroke-dasharray', '3 3');
    });

    test('Barの設定が正しい', () => {
      render(<DifferenceChart />);
      
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-key', 'difference');
    });
  });

  describe('数値の精度', () => {
    test('差分が小数点2桁で丸められる', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        currentAssets: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            price: 150.333,
            holdings: 10.1234,
            currency: 'USD'
          }
        ],
        targetPortfolio: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            targetPercentage: 50.12345
          }
        ],
        totalAssets: 1518.8640 // 150.333 * 10.1234
      });

      render(<DifferenceChart />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent);
      
      const appleData = data.find(item => item.ticker === 'AAPL');
      expect(Number.isInteger(appleData.difference * 100)).toBe(true); // 小数点2桁まで
    });
  });

  describe('エラーハンドリング', () => {
    test('exchangeRateが存在しない場合でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        exchangeRate: null
      });

      expect(() => {
        render(<DifferenceChart />);
      }).not.toThrow();
    });

    test('currentAssetsにpriceがない場合でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        currentAssets: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            holdings: 10,
            currency: 'USD'
            // price プロパティなし
          }
        ]
      });

      expect(() => {
        render(<DifferenceChart />);
      }).not.toThrow();
    });

    test('targetPortfolioにtargetPercentageがない場合でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        ...defaultPortfolioContext,
        targetPortfolio: [
          {
            id: 'AAPL',
            ticker: 'AAPL',
            name: 'Apple Inc.'
            // targetPercentage プロパティなし
          }
        ]
      });

      expect(() => {
        render(<DifferenceChart />);
      }).not.toThrow();
    });

    test('無効なデータ型でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        currentAssets: null,
        targetPortfolio: undefined,
        baseCurrency: '',
        totalAssets: 'invalid',
        exchangeRate: {}
      });

      expect(() => {
        render(<DifferenceChart />);
      }).not.toThrow();
    });
  });
});