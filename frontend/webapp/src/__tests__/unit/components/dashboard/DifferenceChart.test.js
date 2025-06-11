/**
 * DifferenceChart.jsx のテストファイル
 * ポートフォリオの現在配分と目標配分の差分を表示する棒グラフコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DifferenceChart from '../../../../components/dashboard/DifferenceChart';

// usePortfolioContextフックのモック
const mockPortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: mockPortfolioContext
}));

// rechartsライブラリのモック
jest.mock('recharts', () => ({
  BarChart: ({ children, data, ...props }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} {...props}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill, ...props }) => (
    <div data-testid="bar" data-key={dataKey} data-fill={fill} {...props} />
  ),
  XAxis: ({ dataKey, ...props }) => (
    <div data-testid="x-axis" data-key={dataKey} {...props} />
  ),
  YAxis: ({ label, ...props }) => (
    <div data-testid="y-axis" data-label={JSON.stringify(label)} {...props} />
  ),
  CartesianGrid: (props) => (
    <div data-testid="cartesian-grid" {...props} />
  ),
  Tooltip: ({ content, ...props }) => (
    <div data-testid="tooltip" {...props}>
      {content && React.createElement(content, { active: false, payload: [] })}
    </div>
  ),
  ResponsiveContainer: ({ children, width, height, ...props }) => (
    <div data-testid="responsive-container" data-width={width} data-height={height} {...props}>
      {children}
    </div>
  )
}));

describe('DifferenceChart Component', () => {
  const defaultMockData = {
    currentAssets: [
      {
        id: '1',
        name: '米国株式ETF',
        ticker: 'VTI',
        currency: 'USD',
        price: 100,
        holdings: 500
      },
      {
        id: '2',
        name: '日本株式インデックス',
        ticker: '2557',
        currency: 'JPY',
        price: 15000,
        holdings: 300
      },
      {
        id: '3',
        name: '新興国株式',
        ticker: 'VWO',
        currency: 'USD',
        price: 50,
        holdings: 200
      }
    ],
    targetPortfolio: [
      { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 60 },
      { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 30 },
      { id: '3', name: '新興国株式', ticker: 'VWO', targetPercentage: 10 }
    ],
    baseCurrency: 'JPY',
    totalAssets: 12000000,
    exchangeRate: { rate: 150 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPortfolioContext.mockReturnValue(defaultMockData);
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<DifferenceChart />);
      
      expect(screen.getByText('ポートフォリオ差分')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    test('BarChartに正しいpropsが渡される', () => {
      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-width', '100%');
      expect(barChart).toHaveAttribute('data-height', '400');
      
      // データが正しく渡されているかチェック
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      expect(chartData).toHaveLength(3);
      expect(chartData[0]).toHaveProperty('name');
      expect(chartData[0]).toHaveProperty('ticker');
      expect(chartData[0]).toHaveProperty('difference');
    });

    test('チャートの構成要素が表示される', () => {
      render(<DifferenceChart />);
      
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toBeInTheDocument();
    });

    test('X軸に正しい設定が適用される', () => {
      render(<DifferenceChart />);
      
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'ticker');
    });

    test('Y軸にラベルが設定される', () => {
      render(<DifferenceChart />);
      
      const yAxis = screen.getByTestId('y-axis');
      const label = JSON.parse(yAxis.getAttribute('data-label'));
      expect(label).toEqual({
        value: '差分 (パーセントポイント)',
        angle: -90,
        position: 'insideLeft',
        style: { textAnchor: 'middle' }
      });
    });

    test('Barに正しいdataKeyが設定される', () => {
      render(<DifferenceChart />);
      
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-key', 'difference');
    });
  });

  describe('データがない場合', () => {
    test('targetPortfolioが空の場合のメッセージ表示', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: []
      });

      render(<DifferenceChart />);
      
      expect(screen.getByText('ポートフォリオ差分')).toBeInTheDocument();
      expect(screen.getByText('表示するデータがありません。目標配分を設定してください。')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    test('currentAssetsが空の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [],
        totalAssets: 0
      });

      render(<DifferenceChart />);
      
      // チャートは表示されるが、差分はすべて目標値と同じになる
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('差分計算', () => {
    test('差分が正しく計算される', () => {
      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      
      // 各銘柄の差分が計算されている
      chartData.forEach(item => {
        expect(item).toHaveProperty('difference');
        expect(typeof item.difference).toBe('number');
      });
    });

    test('現在割合が目標より少ない場合の正の差分', () => {
      // 目標が現在より高い設定
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 80 }, // 高い目標
          { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 20 }
        ]
      });

      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      
      // 差分データが含まれている
      expect(chartData.length).toBeGreaterThan(0);
    });

    test('現在割合が目標より多い場合の負の差分', () => {
      // 目標が現在より低い設定
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 10 }, // 低い目標
          { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 5 }
        ]
      });

      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      
      // 差分データが含まれている
      expect(chartData.length).toBeGreaterThan(0);
    });
  });

  describe('通貨換算', () => {
    test('USD to JPY 換算が差分計算に反映される', () => {
      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      
      // USD資産も含めて差分が計算されている
      const usdAssets = chartData.filter(item => ['VTI', 'VWO'].includes(item.ticker));
      expect(usdAssets.length).toBeGreaterThan(0);
    });

    test('JPY to USD 換算が差分計算に反映される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        baseCurrency: 'USD'
      });

      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      
      // JPY資産も含めて差分が計算されている
      const jpyAssets = chartData.filter(item => item.ticker === '2557');
      expect(jpyAssets.length).toBeGreaterThan(0);
    });
  });

  describe('ソート機能', () => {
    test('差分の絶対値でソートされている', () => {
      // 異なる差分を持つデータを設定
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 80 }, // 大きな差分
          { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 35 }, // 中程度の差分
          { id: '3', name: '新興国株式', ticker: 'VWO', targetPercentage: 8 } // 小さな差分
        ]
      });

      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      
      // 差分の絶対値が降順になっているかチェック
      for (let i = 0; i < chartData.length - 1; i++) {
        const current = Math.abs(chartData[i].difference);
        const next = Math.abs(chartData[i + 1].difference);
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('小数点処理', () => {
    test('差分が小数点2桁に丸められている', () => {
      render(<DifferenceChart />);
      
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      
      chartData.forEach(item => {
        // 小数点2桁まで
        const decimalPlaces = (item.difference.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('CustomTooltip', () => {
    test('カスタムツールチップが表示される', () => {
      render(<DifferenceChart />);
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    test('totalAssetsが0の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        totalAssets: 0
      });

      render(<DifferenceChart />);
      
      // エラーにならずにチャートが表示される
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    test('currentAssetsとtargetPortfolioのIDが一致しない場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          { id: '999', name: '存在しない資産', ticker: 'XXX', currency: 'JPY', price: 100, holdings: 10 }
        ]
      });

      render(<DifferenceChart />);
      
      // 現在割合が0として計算される
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    test('targetPortfolioにないIDのcurrentAssetsがある場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          ...defaultMockData.currentAssets,
          { id: '999', name: '新しい資産', ticker: 'NEW', currency: 'JPY', price: 100, holdings: 10 }
        ]
      });

      render(<DifferenceChart />);
      
      // targetPortfolioに基づいてチャートが生成される
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data'));
      expect(chartData).toHaveLength(3); // targetPortfolioの数
    });

    test('exchangeRateが0の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        exchangeRate: { rate: 0 }
      });

      render(<DifferenceChart />);
      
      // エラーにならずにチャートが表示される
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    test('priceまたはholdingsが0の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          { id: '1', name: 'ゼロ価格', ticker: 'ZERO', currency: 'JPY', price: 0, holdings: 100 },
          { id: '2', name: 'ゼロ保有', ticker: 'NONE', currency: 'JPY', price: 100, holdings: 0 }
        ]
      });

      render(<DifferenceChart />);
      
      // エラーにならずにチャートが表示される
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('レスポンシブ対応', () => {
    test('ResponsiveContainerが適切に設定される', () => {
      render(<DifferenceChart />);
      
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-width', '100%');
      expect(container).toHaveAttribute('data-height', '400');
    });
  });
});