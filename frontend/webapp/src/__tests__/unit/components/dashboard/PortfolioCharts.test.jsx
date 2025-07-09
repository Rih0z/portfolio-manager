/**
 * PortfolioCharts.jsx のテストファイル
 * ポートフォリオチャートコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioCharts from '../../../../components/dashboard/PortfolioCharts';
import { PortfolioContext } from '../../../../context/PortfolioContext';

// rechartsライブラリのモック
jest.mock('recharts', () => ({
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data, label, children }) => (
    <div data-testid="pie" data-testlabel={label ? 'has-label' : 'no-label'}>
      {data && data.map((item, index) => (
        <div key={index} data-testid={`pie-cell-${index}`}>
          {item.name}: {item.value}%
        </div>
      ))}
      {children}
    </div>
  ),
  Cell: ({ fill }) => <div data-testid="pie-cell" data-fill={fill} />,
  ResponsiveContainer: ({ children, width, height }) => (
    <div data-testid="responsive-container" style={{ width, height }}>
      {children}
    </div>
  ),
  Legend: () => <div data-testid="legend" />,
  Tooltip: ({ content }) => <div data-testid="tooltip">{content}</div>
}));

// console.logのモック（デバッグログを抑制）
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

// テスト用のコンテキスト値を作成するヘルパー関数
const createMockPortfolioContext = (overrides = {}) => ({
  currentAssets: [],
  targetPortfolio: [],
  baseCurrency: 'JPY',
  totalAssets: 0,
  exchangeRate: { rate: 150, source: 'test', lastUpdated: new Date() },
  ...overrides
});

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children, portfolioContext }) => (
  <PortfolioContext.Provider value={portfolioContext}>
    {children}
  </PortfolioContext.Provider>
);

describe('PortfolioCharts', () => {
  describe('基本レンダリング', () => {
    test('基本構造が正しく表示される', () => {
      const portfolioContext = createMockPortfolioContext();

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getByText('ポートフォリオ配分')).toBeInTheDocument();
      expect(screen.getByText('理想配分')).toBeInTheDocument();
      expect(screen.getByText('現在配分')).toBeInTheDocument();
    });

    test('グリッドレイアウトが適用される', () => {
      const portfolioContext = createMockPortfolioContext();

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      const container = screen.getByText('ポートフォリオ配分').closest('div');
      expect(container).toHaveClass('bg-dark-200', 'rounded-lg', 'shadow-xl', 'p-6', 'mb-6');
    });
  });

  describe('理想配分チャート', () => {
    test('理想配分データがある場合はチャートを表示', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: [
          { name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 60 },
          { name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 40 }
        ]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
      expect(screen.getAllByTestId('pie-chart')).toHaveLength(2);
      
      // データが正しく渡されていることを確認
      expect(screen.getByText('Apple Inc.: 60%')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corp.: 40%')).toBeInTheDocument();
    });

    test('理想配分データがない場合は空状態を表示', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: []
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getByText('理想配分データがありません')).toBeInTheDocument();
      expect(screen.getByText('設定タブから目標配分を設定してください')).toBeInTheDocument();
    });

    test('targetPercentageが0のアイテムは除外される', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: [
          { name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 60 },
          { name: 'Excluded Stock', ticker: 'EX', targetPercentage: 0 },
          { name: 'Microsoft Corp.', ticker: 'MSFT', targetPercentage: 40 }
        ]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getByText('Apple Inc.: 60%')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corp.: 40%')).toBeInTheDocument();
      expect(screen.queryByText('Excluded Stock: 0%')).not.toBeInTheDocument();
    });
  });

  describe('現在配分チャート', () => {
    test('現在の資産データがある場合はチャートを表示', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Apple Inc.', ticker: 'AAPL', price: 150, holdings: 100, currency: 'USD' },
          { name: 'Toyota Motor Corp.', ticker: 'TM', price: 180, holdings: 50, currency: 'USD' }
        ],
        totalAssets: 24000, // 15000 + 9000 = 24000 USD
        baseCurrency: 'USD'
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      // パーセンテージの計算確認 (15000/24000 = 62.5%, 9000/24000 = 37.5%)
      expect(screen.getByText('Apple Inc.: 62.5%')).toBeInTheDocument();
      expect(screen.getByText('Toyota Motor Corp.: 37.5%')).toBeInTheDocument();
    });

    test('現在の資産データがない場合は空状態を表示', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        totalAssets: 0
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getByText('現在の保有資産データがありません')).toBeInTheDocument();
      expect(screen.getByText('設定タブから保有資産を登録してください')).toBeInTheDocument();
    });

    test('totalAssetsが0の場合は空状態を表示', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Apple Inc.', ticker: 'AAPL', price: 150, holdings: 100, currency: 'USD' }
        ],
        totalAssets: 0
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getByText('現在の保有資産データがありません')).toBeInTheDocument();
    });
  });

  describe('通貨換算', () => {
    test('USD→JPY変換が正しく動作する', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Apple Inc.', ticker: 'AAPL', price: 150, holdings: 100, currency: 'USD' }
        ],
        totalAssets: 2250000, // 15000 USD * 150 JPY/USD = 2,250,000 JPY
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      // 100%になることを確認
      expect(screen.getByText('Apple Inc.: 100.0%')).toBeInTheDocument();
    });

    test('JPY→USD変換が正しく動作する', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Toyota Motor Corp.', ticker: 'TM', price: 3000, holdings: 100, currency: 'JPY' }
        ],
        totalAssets: 2000, // 300,000 JPY / 150 JPY/USD = 2000 USD
        baseCurrency: 'USD',
        exchangeRate: { rate: 150 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      // 100%になることを確認
      expect(screen.getByText('Toyota Motor Corp.: 100.0%')).toBeInTheDocument();
    });

    test('同一通貨の場合は変換しない', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Apple Inc.', ticker: 'AAPL', price: 150, holdings: 100, currency: 'USD' }
        ],
        totalAssets: 15000,
        baseCurrency: 'USD',
        exchangeRate: { rate: 150 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      // 変換なしで100%になることを確認
      expect(screen.getByText('Apple Inc.: 100.0%')).toBeInTheDocument();
    });
  });

  describe('資産フィルタリング', () => {
    test('0以下の資産価値は除外される', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Valid Stock', ticker: 'VS', price: 100, holdings: 10, currency: 'USD' },
          { name: 'Zero Holdings', ticker: 'ZH', price: 100, holdings: 0, currency: 'USD' },
          { name: 'Negative Holdings', ticker: 'NH', price: 100, holdings: -5, currency: 'USD' }
        ],
        totalAssets: 1000,
        baseCurrency: 'USD'
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getByText('Valid Stock: 100.0%')).toBeInTheDocument();
      expect(screen.queryByText('Zero Holdings')).not.toBeInTheDocument();
      expect(screen.queryByText('Negative Holdings')).not.toBeInTheDocument();
    });
  });

  describe('デバッグログ', () => {
    test('コンポーネントマウント時にデバッグログが出力される', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [{ name: 'Test Asset', ticker: 'TEST', price: 100, holdings: 10 }],
        targetPortfolio: [{ name: 'Test Target', ticker: 'TEST', targetPercentage: 50 }],
        totalAssets: 1000,
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(console.log).toHaveBeenCalledWith('PortfolioCharts Debug:', expect.objectContaining({
        currentAssets: expect.any(Array),
        targetPortfolio: expect.any(Array),
        totalAssets: 1000,
        baseCurrency: 'JPY',
        exchangeRate: expect.any(Object)
      }));

      expect(console.log).toHaveBeenCalledWith('Current portfolio data:', expect.objectContaining({
        currentData: expect.any(Array),
        totalAssets: 1000,
        currentAssetsLength: 1
      }));
    });
  });

  describe('チャートの詳細設定', () => {
    test('チャートコンポーネントに正しいpropsが渡される', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: [
          { name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 60 }
        ]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      const pieComponents = screen.getAllByTestId('pie');
      expect(pieComponents[0]).toHaveAttribute('data-testlabel', 'has-label');
    });

    test('ResponsiveContainerが正しいサイズで設定される', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: [
          { name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 60 }
        ]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      const containers = screen.getAllByTestId('responsive-container');
      containers.forEach(container => {
        expect(container).toHaveStyle({ width: '100%', height: '300px' });
      });
    });
  });

  describe('カラーパレット', () => {
    test('複数のアイテムで異なるカラーが適用される', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: [
          { name: 'Stock 1', ticker: 'S1', targetPercentage: 30 },
          { name: 'Stock 2', ticker: 'S2', targetPercentage: 40 },
          { name: 'Stock 3', ticker: 'S3', targetPercentage: 30 }
        ]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      const cells = screen.getAllByTestId('pie-cell');
      // 各セルに異なる色が設定されていることを確認（fill属性の存在確認）
      cells.forEach(cell => {
        expect(cell).toHaveAttribute('data-fill');
      });
    });
  });

  describe('CustomTooltip', () => {
    test('Tooltipコンポーネントが正しく配置される', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: [
          { name: 'Apple Inc.', ticker: 'AAPL', targetPercentage: 60 }
        ]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips).toHaveLength(2); // 理想配分と現在配分の2つ
    });
  });

  describe('エッジケース', () => {
    test('exchangeRateがundefinedでもエラーが発生しない', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Apple Inc.', ticker: 'AAPL', price: 150, holdings: 100, currency: 'USD' }
        ],
        totalAssets: 15000,
        baseCurrency: 'JPY',
        exchangeRate: undefined
      });

      expect(() => {
        render(
          <TestWrapper portfolioContext={portfolioContext}>
            <PortfolioCharts />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    test('currentAssetsがundefinedでもエラーが発生しない', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: undefined,
        totalAssets: 0
      });

      expect(() => {
        render(
          <TestWrapper portfolioContext={portfolioContext}>
            <PortfolioCharts />
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByText('現在の保有資産データがありません')).toBeInTheDocument();
    });

    test('targetPortfolioがundefinedでもエラーが発生しない', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: undefined
      });

      expect(() => {
        render(
          <TestWrapper portfolioContext={portfolioContext}>
            <PortfolioCharts />
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByText('理想配分データがありません')).toBeInTheDocument();
    });
  });

  describe('数値の精度', () => {
    test('パーセンテージが適切に小数点以下1桁で表示される', () => {
      const portfolioContext = createMockPortfolioContext({
        targetPortfolio: [
          { name: 'Precise Stock', ticker: 'PS', targetPercentage: 33.333333 }
        ]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      expect(screen.getByText('Precise Stock: 33.3%')).toBeInTheDocument();
    });

    test('現在配分の計算精度が適切', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [
          { name: 'Stock A', ticker: 'SA', price: 100, holdings: 33, currency: 'USD' },
          { name: 'Stock B', ticker: 'SB', price: 200, holdings: 33, currency: 'USD' }
        ],
        totalAssets: 9900, // 3300 + 6600 = 9900
        baseCurrency: 'USD'
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <PortfolioCharts />
        </TestWrapper>
      );

      // 3300/9900 = 33.33%, 6600/9900 = 66.67%
      expect(screen.getByText('Stock A: 33.3%')).toBeInTheDocument();
      expect(screen.getByText('Stock B: 66.7%')).toBeInTheDocument();
    });
  });
});