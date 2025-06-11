/**
 * PortfolioCharts.jsx のテストファイル
 * ポートフォリオの現在配分と理想配分を円グラフで表示するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioCharts from '../../../../components/dashboard/PortfolioCharts';

// usePortfolioContextフックのモック
const mockPortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: mockPortfolioContext
}));

// rechartsライブラリのモック
jest.mock('recharts', () => ({
  PieChart: ({ children, ...props }) => (
    <div data-testid="pie-chart" {...props}>
      {children}
    </div>
  ),
  Pie: ({ data, dataKey, label, ...props }) => (
    <div 
      data-testid="pie" 
      data-key={dataKey} 
      data-chart-data={JSON.stringify(data)}
      {...props}
    >
      {label && <div data-testid="pie-label">{typeof label === 'function' ? 'Custom Label' : label}</div>}
    </div>
  ),
  Cell: ({ fill, ...props }) => (
    <div data-testid="pie-cell" data-fill={fill} {...props} />
  ),
  ResponsiveContainer: ({ children, width, height, ...props }) => (
    <div data-testid="responsive-container" data-width={width} data-height={height} {...props}>
      {children}
    </div>
  ),
  Legend: (props) => (
    <div data-testid="legend" {...props} />
  ),
  Tooltip: ({ content, ...props }) => (
    <div data-testid="tooltip" {...props}>
      {content && React.createElement(content, { active: false, payload: [] })}
    </div>
  )
}));

describe('PortfolioCharts Component', () => {
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

  // console.logのモック
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPortfolioContext.mockReturnValue(defaultMockData);
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<PortfolioCharts />);
      
      expect(screen.getByText('ポートフォリオ配分')).toBeInTheDocument();
      expect(screen.getByText('理想配分')).toBeInTheDocument();
      expect(screen.getByText('現在配分')).toBeInTheDocument();
    });

    test('2つのPieChartが表示される', () => {
      render(<PortfolioCharts />);
      
      const pieCharts = screen.getAllByTestId('pie-chart');
      expect(pieCharts).toHaveLength(2);
    });

    test('ResponsiveContainerが適切に設定される', () => {
      render(<PortfolioCharts />);
      
      const containers = screen.getAllByTestId('responsive-container');
      expect(containers).toHaveLength(2);
      
      containers.forEach(container => {
        expect(container).toHaveAttribute('data-width', '100%');
        expect(container).toHaveAttribute('data-height', '300');
      });
    });

    test('grid layoutが適用される', () => {
      render(<PortfolioCharts />);
      
      const gridContainer = screen.getByText('理想配分').closest('.grid');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
    });
  });

  describe('デバッグログ', () => {
    test('デバッグ情報が出力される', () => {
      render(<PortfolioCharts />);
      
      expect(console.log).toHaveBeenCalledWith('PortfolioCharts Debug:', {
        currentAssets: defaultMockData.currentAssets,
        targetPortfolio: defaultMockData.targetPortfolio,
        totalAssets: defaultMockData.totalAssets,
        baseCurrency: defaultMockData.baseCurrency,
        exchangeRate: defaultMockData.exchangeRate
      });

      expect(console.log).toHaveBeenCalledWith('Current portfolio data:', expect.objectContaining({
        currentData: expect.any(Array),
        totalAssets: defaultMockData.totalAssets,
        currentAssetsLength: defaultMockData.currentAssets.length
      }));
    });
  });

  describe('理想配分チャート', () => {
    test('targetPercentage > 0 の銘柄のみが表示される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 60 },
          { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 0 }, // 0%は除外
          { id: '3', name: '新興国株式', ticker: 'VWO', targetPercentage: 40 }
        ]
      });

      render(<PortfolioCharts />);
      
      const pies = screen.getAllByTestId('pie');
      const targetPie = pies[0]; // 最初のPieが理想配分
      const targetData = JSON.parse(targetPie.getAttribute('data-chart-data'));
      
      // targetPercentage > 0 の銘柄のみ
      expect(targetData).toHaveLength(2);
      expect(targetData.find(item => item.ticker === '2557')).toBeUndefined();
    });

    test('理想配分データがない場合のメッセージ表示', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: []
      });

      render(<PortfolioCharts />);
      
      expect(screen.getByText('理想配分データがありません')).toBeInTheDocument();
      expect(screen.getByText('設定タブから目標配分を設定してください')).toBeInTheDocument();
    });

    test('すべてのtargetPercentageが0の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 0 },
          { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 0 }
        ]
      });

      render(<PortfolioCharts />);
      
      expect(screen.getByText('理想配分データがありません')).toBeInTheDocument();
    });
  });

  describe('現在配分チャート', () => {
    test('assetValue > 0 の銘柄のみが表示される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
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
            name: 'ゼロ保有',
            ticker: 'ZERO',
            currency: 'JPY',
            price: 100,
            holdings: 0 // 0保有は除外
          }
        ]
      });

      render(<PortfolioCharts />);
      
      const pies = screen.getAllByTestId('pie');
      const currentPie = pies[1]; // 2番目のPieが現在配分
      const currentData = JSON.parse(currentPie.getAttribute('data-chart-data'));
      
      // holdings > 0 の銘柄のみ
      expect(currentData).toHaveLength(1);
      expect(currentData.find(item => item.ticker === 'ZERO')).toBeUndefined();
    });

    test('totalAssetsが0の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        totalAssets: 0
      });

      render(<PortfolioCharts />);
      
      // 現在配分チャートが表示されない
      const pies = screen.getAllByTestId('pie');
      const currentPie = pies[1];
      const currentData = JSON.parse(currentPie.getAttribute('data-chart-data'));
      
      expect(currentData).toHaveLength(0);
    });

    test('現在の保有資産データがない場合のメッセージ表示', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [],
        totalAssets: 0
      });

      render(<PortfolioCharts />);
      
      expect(screen.getByText('現在の保有資産データがありません')).toBeInTheDocument();
      expect(screen.getByText('設定タブから保有資産を登録してください')).toBeInTheDocument();
    });
  });

  describe('通貨換算', () => {
    test('USD to JPY 換算が現在配分に反映される', () => {
      render(<PortfolioCharts />);
      
      const pies = screen.getAllByTestId('pie');
      const currentPie = pies[1];
      const currentData = JSON.parse(currentPie.getAttribute('data-chart-data'));
      
      // USD資産が含まれている
      const usdAssets = currentData.filter(item => ['VTI', 'VWO'].includes(item.ticker));
      expect(usdAssets.length).toBeGreaterThan(0);
      
      // 割合が計算されている
      usdAssets.forEach(asset => {
        expect(asset.value).toBeGreaterThan(0);
      });
    });

    test('JPY to USD 換算が現在配分に反映される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        baseCurrency: 'USD'
      });

      render(<PortfolioCharts />);
      
      const pies = screen.getAllByTestId('pie');
      const currentPie = pies[1];
      const currentData = JSON.parse(currentPie.getAttribute('data-chart-data'));
      
      // JPY資産が含まれている
      const jpyAssets = currentData.filter(item => item.ticker === '2557');
      expect(jpyAssets.length).toBeGreaterThan(0);
      
      // 割合が計算されている
      jpyAssets.forEach(asset => {
        expect(asset.value).toBeGreaterThan(0);
      });
    });
  });

  describe('Pieチャートの設定', () => {
    test('Pieに正しいpropsが設定される', () => {
      render(<PortfolioCharts />);
      
      const pies = screen.getAllByTestId('pie');
      
      pies.forEach(pie => {
        expect(pie).toHaveAttribute('data-key', 'value');
        // その他のpie属性をチェック
      });
    });

    test('カスタムラベルが設定される', () => {
      render(<PortfolioCharts />);
      
      const pieLabels = screen.getAllByTestId('pie-label');
      expect(pieLabels).toHaveLength(2); // 理想配分と現在配分
      
      pieLabels.forEach(label => {
        expect(label).toHaveTextContent('Custom Label');
      });
    });
  });

  describe('色設定', () => {
    test('Cellコンポーネントが適切に表示される', () => {
      render(<PortfolioCharts />);
      
      const cells = screen.getAllByTestId('pie-cell');
      expect(cells.length).toBeGreaterThan(0);
      
      // 各セルに色が設定されている
      cells.forEach(cell => {
        expect(cell).toHaveAttribute('data-fill');
      });
    });
  });

  describe('CustomTooltip', () => {
    test('カスタムツールチップが表示される', () => {
      render(<PortfolioCharts />);
      
      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips).toHaveLength(2); // 理想配分と現在配分
    });
  });

  describe('エッジケース', () => {
    test('currentAssetsに同じIDが複数ある場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            id: '1',
            name: '米国株式ETF-1',
            ticker: 'VTI',
            currency: 'USD',
            price: 100,
            holdings: 300
          },
          {
            id: '1', // 同じID
            name: '米国株式ETF-2',
            ticker: 'VTI',
            currency: 'USD',
            price: 100,
            holdings: 200
          }
        ]
      });

      render(<PortfolioCharts />);
      
      // エラーにならずにチャートが表示される
      expect(screen.getByText('ポートフォリオ配分')).toBeInTheDocument();
    });

    test('exchangeRateが0または負の値の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        exchangeRate: { rate: 0 }
      });

      render(<PortfolioCharts />);
      
      // エラーにならずにチャートが表示される
      expect(screen.getByText('ポートフォリオ配分')).toBeInTheDocument();
    });

    test('priceまたはholdingsが負の値の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            id: '1',
            name: '負価格',
            ticker: 'NEG',
            currency: 'JPY',
            price: -100,
            holdings: 10
          }
        ]
      });

      render(<PortfolioCharts />);
      
      // 負の評価額は除外される
      const pies = screen.getAllByTestId('pie');
      const currentPie = pies[1];
      const currentData = JSON.parse(currentPie.getAttribute('data-chart-data'));
      
      expect(currentData).toHaveLength(0);
    });

    test('targetPortfolioにname/tickerがない場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', targetPercentage: 60 } // nameとtickerがない
        ]
      });

      render(<PortfolioCharts />);
      
      // エラーにならずにチャートが表示される
      expect(screen.getByText('ポートフォリオ配分')).toBeInTheDocument();
    });

    test('currentAssetsに無効な通貨が含まれる場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            id: '1',
            name: '無効通貨',
            ticker: 'INVALID',
            currency: 'XXX', // 無効な通貨
            price: 100,
            holdings: 10
          }
        ]
      });

      render(<PortfolioCharts />);
      
      // 通貨換算されずにそのまま計算される
      expect(screen.getByText('ポートフォリオ配分')).toBeInTheDocument();
    });
  });

  describe('スタイリング', () => {
    test('ダークテーマのスタイルが適用される', () => {
      render(<PortfolioCharts />);
      
      const mainContainer = screen.getByText('ポートフォリオ配分').closest('div');
      expect(mainContainer).toHaveClass('bg-dark-200', 'border-dark-400');
      
      const title = screen.getByText('ポートフォリオ配分');
      expect(title).toHaveClass('text-white');
      
      const subTitles = screen.getAllByText(/配分$/);
      subTitles.forEach(title => {
        expect(title).toHaveClass('text-gray-200');
      });
    });

    test('空状態のメッセージスタイル', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [],
        currentAssets: []
      });

      render(<PortfolioCharts />);
      
      const emptyMessages = screen.getAllByText(/データがありません/);
      emptyMessages.forEach(message => {
        expect(message.closest('div')).toHaveClass('text-gray-400');
      });
    });
  });

  describe('アクセシビリティ', () => {
    test('適切な見出し構造', () => {
      render(<PortfolioCharts />);
      
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ポートフォリオ配分');
      expect(screen.getByRole('heading', { level: 3, name: '理想配分' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: '現在配分' })).toBeInTheDocument();
    });
  });
});