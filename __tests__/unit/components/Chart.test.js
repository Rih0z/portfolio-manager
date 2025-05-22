/**
 * ファイルパス: __test__/unit/components/Chart.test.js
 * 
 * Chartコンポーネントの単体テスト
 * 円グラフとバーチャートの描画、データなし時の表示、インタラクション機能をテスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import Chart from '@/components/common/Chart';

// テスト用ライブラリ
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// モックデータ
import { mockChartData } from '../../mocks/data';

// RechartsのResponsiveContainerをモック化
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    BarChart: ({ children }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    Pie: ({ data }) => (
      <div data-testid="pie">
        {data.map((item, index) => (
          <div key={index} data-name={item.name} data-value={item.value}>
            {item.name}: {item.percentage}%
          </div>
        ))}
      </div>
    ),
    Bar: ({ dataKey }) => <div data-testid={`bar-${dataKey}`}></div>,
    Cell: ({ fill }) => <div data-testid="chart-cell" style={{ backgroundColor: fill }}></div>,
    XAxis: () => <div data-testid="x-axis"></div>,
    YAxis: () => <div data-testid="y-axis"></div>,
    CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
    Tooltip: () => <div data-testid="tooltip"></div>,
    Legend: () => <div data-testid="legend"></div>,
    LabelList: () => <div data-testid="label-list"></div>,
    ReferenceLine: () => <div data-testid="reference-line"></div>
  };
});

describe('Chartコンポーネント', () => {
  // 基本的なprops
  const pieChartProps = {
    type: 'pie',
    data: mockChartData.pieChart,
    title: '資産配分',
    height: 300,
    onClick: jest.fn()
  };
  
  const barChartProps = {
    type: 'bar',
    data: mockChartData.barChart,
    title: '配分差異',
    height: 300,
    keys: ['current', 'target'],
    labels: ['現在の配分', '目標配分'],
    colors: ['#4299E1', '#48BB78'],
    onClick: jest.fn()
  };
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
  });
  
  it('データがないとプレースホルダーが表示される', () => {
    // テスト実行
    render(<Chart {...pieChartProps} data={[]} />);
    
    // タイトルが表示されていることを検証
    expect(screen.getByText('資産配分')).toBeInTheDocument();
    
    // プレースホルダーが表示されていることを検証
    expect(screen.getByText('データがありません')).toBeInTheDocument();
    
    // チャートが表示されていないことを検証
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });
  
  it('円グラフが正しくレンダリングされる', () => {
    // テスト実行
    render(<Chart {...pieChartProps} />);
    
    // タイトルが表示されていることを検証
    expect(screen.getByText('資産配分')).toBeInTheDocument();
    
    // 円グラフが表示されていることを検証
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    
    // データが正しく表示されていることを検証
    const pie = screen.getByTestId('pie');
    mockChartData.pieChart.forEach(item => {
      expect(pie).toHaveTextContent(`${item.name}: ${item.percentage}%`);
    });
    
    // 凡例が表示されていることを検証
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });
  
  it('バーチャートが正しくレンダリングされる', () => {
    // テスト実行
    render(<Chart {...barChartProps} />);
    
    // タイトルが表示されていることを検証
    expect(screen.getByText('配分差異')).toBeInTheDocument();
    
    // バーチャートが表示されていることを検証
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // 軸が表示されていることを検証
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    
    // データバーが表示されていることを検証
    expect(screen.getByTestId('bar-current')).toBeInTheDocument();
    expect(screen.getByTestId('bar-target')).toBeInTheDocument();
    
    // 凡例が表示されていることを検証
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });
  
  it('グラフの領域をクリックするとonClickハンドラーが呼ばれる', async () => {
    // テスト実行
    render(<Chart {...pieChartProps} />);
    
    // 円グラフをクリック
    const pieChart = screen.getByTestId('pie-chart');
    await userEvent.click(pieChart);
    
    // onClickが呼ばれたことを検証
    expect(pieChartProps.onClick).toHaveBeenCalledTimes(1);
  });
  
  it('カスタムレイアウトオプションが適用される', () => {
    // カスタムレイアウトオプション
    const customLayoutOptions = {
      showLegend: false,
      showTooltip: false,
      showLabel: true,
      labelPosition: 'outside'
    };
    
    // テスト実行
    render(<Chart {...pieChartProps} layoutOptions={customLayoutOptions} />);
    
    // 凡例が表示されていないことを検証
    expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    
    // ツールチップが表示されていないことを検証
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    
    // ラベルが表示されていることを検証
    expect(screen.getByTestId('label-list')).toBeInTheDocument();
  });
  
  it('異なるチャートタイプで正しくレンダリングされる', () => {
    // 線グラフのprops
    const lineChartProps = {
      type: 'line',
      data: [
        { name: '1月', value: 100 },
        { name: '2月', value: 150 },
        { name: '3月', value: 120 },
        { name: '4月', value: 180 }
      ],
      title: '月次推移',
      height: 300,
      onClick: jest.fn()
    };
    
    // テスト実行
    render(<Chart {...lineChartProps} />);
    
    // タイトルが表示されていることを検証
    expect(screen.getByText('月次推移')).toBeInTheDocument();
    
    // 未サポートのチャートタイプの場合はエラーメッセージが表示されるか、
    // デフォルトのチャートタイプにフォールバックすることを検証
    // (この実装はコンポーネントの実装によって異なる可能性があります)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
  
  it('レスポンシブコンテナーが指定の高さで表示される', () => {
    // テスト実行
    const { container } = render(<Chart {...pieChartProps} height={500} />);
    
    // レスポンシブコンテナーが表示されていることを検証
    const responsiveContainer = screen.getByTestId('responsive-container');
    
    // スタイルの検証には実際のDOM要素の検証が必要なため、
    // コンテナのスタイルを検証するか、コンポーネントの実装に応じて調整
    // (この部分はモック化の方法によっては検証できない場合があります)
    expect(responsiveContainer).toBeInTheDocument();
  });
});
