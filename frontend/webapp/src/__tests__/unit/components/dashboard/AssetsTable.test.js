/**
 * AssetsTable.jsx のテストファイル
 * 保有資産の詳細テーブルコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssetsTable from '../../../../components/dashboard/AssetsTable';

// usePortfolioContextフックのモック
const mockPortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: mockPortfolioContext
}));

// formatters utilsのモック
jest.mock('../../../../utils/formatters', () => ({
  formatCurrency: jest.fn((value, currency) => `${currency} ${value?.toLocaleString()}`),
  formatPercent: jest.fn((value, decimals = 1) => `${value?.toFixed(decimals)}%`)
}));

// japaneseStockNames utilsのモック
jest.mock('../../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: jest.fn((ticker) => {
    const names = {
      '2557': 'MAXIS 米国株式(S&P500)上場投信',
      '1234.T': 'テスト株式会社',
      'VTI': 'VTI'
    };
    return names[ticker] || ticker;
  })
}));

// DataSourceBadgeのモック
jest.mock('../../../../components/common/DataSourceBadge', () => {
  return function DataSourceBadge({ source }) {
    return <span data-testid="data-source-badge">{source}</span>;
  };
});

describe('AssetsTable Component', () => {
  const defaultMockData = {
    currentAssets: [
      {
        id: '1',
        name: '米国株式ETF',
        ticker: 'VTI',
        currency: 'USD',
        price: 100,
        holdings: 500,
        annualFee: 0.03,
        hasDividend: true,
        dividendYield: 1.8,
        dividendFrequency: 'quarterly',
        dividendIsEstimated: false,
        fundType: 'ETF',
        source: 'manual',
        feeSource: 'ETF',
        feeIsEstimated: false,
        isStock: false,
        isMutualFund: false
      },
      {
        id: '2',
        name: '日本株式インデックス',
        ticker: '2557',
        currency: 'JPY',
        price: 15000,
        holdings: 300,
        annualFee: 0.15,
        hasDividend: true,
        dividendYield: 2.2,
        dividendFrequency: 'annual',
        dividendIsEstimated: true,
        fundType: '投資信託',
        source: 'api',
        feeSource: '投資信託',
        feeIsEstimated: false,
        isStock: false,
        isMutualFund: true
      },
      {
        id: '3',
        name: 'テスト株式',
        ticker: '1234.T',
        currency: 'JPY',
        price: 2000,
        holdings: 100,
        annualFee: 0,
        hasDividend: false,
        dividendYield: 0,
        fundType: '個別株',
        source: 'yahoo',
        feeSource: '個別株',
        feeIsEstimated: false,
        isStock: true,
        isMutualFund: false
      }
    ],
    targetPortfolio: [
      { id: '1', targetPercentage: 50 },
      { id: '2', targetPercentage: 30 },
      { id: '3', targetPercentage: 20 }
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
    test('テーブルヘッダーが正しく表示される', () => {
      render(<AssetsTable />);
      
      expect(screen.getByText('保有資産詳細')).toBeInTheDocument();
      expect(screen.getByText('銘柄')).toBeInTheDocument();
      expect(screen.getByText('価格')).toBeInTheDocument();
      expect(screen.getByText('保有数')).toBeInTheDocument();
      expect(screen.getByText('評価額')).toBeInTheDocument();
      expect(screen.getByText('現在割合')).toBeInTheDocument();
      expect(screen.getByText('目標割合')).toBeInTheDocument();
      expect(screen.getByText('差分')).toBeInTheDocument();
      expect(screen.getByText('手数料')).toBeInTheDocument();
      expect(screen.getByText('配当')).toBeInTheDocument();
    });

    test('資産データが正しく表示される', () => {
      const { formatCurrency, formatPercent } = require('../../../../utils/formatters');
      
      render(<AssetsTable />);
      
      // 銘柄名が表示される
      expect(screen.getByText('米国株式ETF')).toBeInTheDocument();
      expect(screen.getByText('VTI')).toBeInTheDocument();
      
      // フォーマット関数が適切に呼ばれる
      expect(formatCurrency).toHaveBeenCalledWith(100, 'USD');
      expect(formatPercent).toHaveBeenCalled();
    });

    test('日本の投資信託名が正しく表示される', () => {
      const { getJapaneseStockName } = require('../../../../utils/japaneseStockNames');
      
      render(<AssetsTable />);
      
      expect(getJapaneseStockName).toHaveBeenCalledWith('2557');
      expect(screen.getByText('MAXIS 米国株式(S&P500)上場投信')).toBeInTheDocument();
    });

    test('日本株式名が正しく表示される', () => {
      const { getJapaneseStockName } = require('../../../../utils/japaneseStockNames');
      
      render(<AssetsTable />);
      
      expect(getJapaneseStockName).toHaveBeenCalledWith('1234.T');
      expect(screen.getByText('テスト株式会社')).toBeInTheDocument();
    });
  });

  describe('資産がない場合', () => {
    test('空の状態が正しく表示される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: []
      });

      render(<AssetsTable />);
      
      expect(screen.getByText('保有資産詳細')).toBeInTheDocument();
      expect(screen.getByText('保有資産が設定されていません。')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('ファンドタイプバッジ', () => {
    test('ETFのバッジが正しく表示される', () => {
      render(<AssetsTable />);
      
      const etfBadge = screen.getByText('ETF');
      expect(etfBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    test('投資信託のバッジが正しく表示される', () => {
      render(<AssetsTable />);
      
      const mutualFundBadge = screen.getByText('投資信託');
      expect(mutualFundBadge).toHaveClass('bg-indigo-100', 'text-indigo-800');
    });

    test('個別株のバッジが正しく表示される', () => {
      render(<AssetsTable />);
      
      const stockBadge = screen.getByText('個別株');
      expect(stockBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('データソースバッジ', () => {
    test('DataSourceBadgeが適切に表示される', () => {
      render(<AssetsTable />);
      
      const badges = screen.getAllByTestId('data-source-badge');
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent('manual');
      expect(badges[1]).toHaveTextContent('api');
      expect(badges[2]).toHaveTextContent('yahoo');
    });
  });

  describe('価格表示', () => {
    test('投資信託の価格に基準価額表示が追加される', () => {
      render(<AssetsTable />);
      
      expect(screen.getByText('(基準価額)')).toBeInTheDocument();
    });

    test('ETFには基準価額表示がない', () => {
      render(<AssetsTable />);
      
      // ETFの価格セルには基準価額表示がない
      const etfRow = screen.getByText('VTI').closest('tr');
      expect(etfRow.querySelector('td:nth-child(2)')).not.toHaveTextContent('(基準価額)');
    });
  });

  describe('差分表示の色分け', () => {
    test('プラスの差分が緑色で表示される', () => {
      // targetPercentage > currentPercentage になるようにデータを調整
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', targetPercentage: 80 }, // 現在より高い目標
          { id: '2', targetPercentage: 30 },
          { id: '3', targetPercentage: 20 }
        ]
      });

      render(<AssetsTable />);
      
      // プラスの差分を探す（緑色のテキスト）
      const positiveDifferences = screen.getAllByText(/\+/);
      expect(positiveDifferences.length).toBeGreaterThan(0);
      positiveDifferences.forEach(element => {
        expect(element).toHaveClass('text-green-600');
      });
    });

    test('マイナスの差分が赤色で表示される', () => {
      // targetPercentage < currentPercentage になるようにデータを調整
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: [
          { id: '1', targetPercentage: 10 }, // 現在より低い目標
          { id: '2', targetPercentage: 5 },
          { id: '3', targetPercentage: 5 }
        ]
      });

      render(<AssetsTable />);
      
      // マイナスの差分を探す（赤色のテキスト）
      const negativeDifferences = screen.getAllByText(/-/);
      expect(negativeDifferences.length).toBeGreaterThan(0);
      negativeDifferences.forEach(element => {
        expect(element).toHaveClass('text-red-600');
      });
    });
  });

  describe('手数料表示', () => {
    test('手数料が正しく表示される', () => {
      const { formatCurrency } = require('../../../../utils/formatters');
      
      render(<AssetsTable />);
      
      // 手数料が計算されて表示される
      expect(formatCurrency).toHaveBeenCalledWith(
        expect.any(Number), 
        'JPY'
      );
      
      // 手数料率が表示される
      expect(screen.getByText('(0.03%)')).toBeInTheDocument();
      expect(screen.getByText('(0.15%)')).toBeInTheDocument();
    });

    test('手数料情報源バッジが表示される', () => {
      render(<AssetsTable />);
      
      expect(screen.getByText('ETF')).toBeInTheDocument();
      expect(screen.getByText('投資信託')).toBeInTheDocument();
      expect(screen.getByText('個別株')).toBeInTheDocument();
    });

    test('推定手数料のバッジが黄色で表示される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            feeIsEstimated: true
          }
        ]
      });

      render(<AssetsTable />);
      
      const estimatedBadge = screen.getByText('ETF');
      expect(estimatedBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('配当表示', () => {
    test('配当がある銘柄の配当情報が表示される', () => {
      const { formatCurrency, formatPercent } = require('../../../../utils/formatters');
      
      render(<AssetsTable />);
      
      // 配当金額と利回りが表示される
      expect(formatCurrency).toHaveBeenCalled();
      expect(formatPercent).toHaveBeenCalled();
      
      // 配当頻度が表示される
      expect(screen.getByText('四半期')).toBeInTheDocument();
      expect(screen.getByText('年1回')).toBeInTheDocument();
    });

    test('配当がない銘柄は"なし"と表示される', () => {
      render(<AssetsTable />);
      
      expect(screen.getByText('なし')).toBeInTheDocument();
    });

    test('推定配当のバッジが表示される', () => {
      render(<AssetsTable />);
      
      expect(screen.getByText('年1回（推定）')).toBeInTheDocument();
    });

    test('配当頻度の変換が正しく動作する', () => {
      const frequencies = [
        { frequency: 'monthly', expected: '毎月' },
        { frequency: 'quarterly', expected: '四半期' },
        { frequency: 'semi-annual', expected: '半年' },
        { frequency: 'annual', expected: '年1回' }
      ];

      frequencies.forEach(({ frequency, expected }) => {
        mockPortfolioContext.mockReturnValue({
          ...defaultMockData,
          currentAssets: [
            {
              ...defaultMockData.currentAssets[0],
              dividendFrequency: frequency,
              hasDividend: true
            }
          ]
        });

        const { rerender } = render(<AssetsTable />);
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        
        rerender(<div />); // コンポーネントをクリア
      });
    });
  });

  describe('通貨換算', () => {
    test('USD to JPY 換算が正しく処理される', () => {
      render(<AssetsTable />);
      
      // USD資産の評価額がJPYで表示される
      const { formatCurrency } = require('../../../../utils/formatters');
      expect(formatCurrency).toHaveBeenCalledWith(
        expect.any(Number), 
        'JPY'
      );
    });

    test('JPY to USD 換算が正しく処理される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        baseCurrency: 'USD'
      });

      render(<AssetsTable />);
      
      // JPY資産の評価額がUSDで表示される
      const { formatCurrency } = require('../../../../utils/formatters');
      expect(formatCurrency).toHaveBeenCalledWith(
        expect.any(Number), 
        'USD'
      );
    });
  });

  describe('ソート機能', () => {
    test('評価額の降順でソートされている', () => {
      render(<AssetsTable />);
      
      const rows = screen.getAllByRole('row');
      // ヘッダー行を除く
      const dataRows = rows.slice(1);
      
      // 最初の行が最大評価額の資産であることを確認
      // USD 500 * 100 * 150 = 7,500,000 JPY (最大)
      expect(dataRows[0]).toHaveTextContent('VTI');
    });
  });

  describe('保有数の表示', () => {
    test('保有数が小数点付きで表示される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            holdings: 123.4567
          }
        ]
      });

      render(<AssetsTable />);
      
      expect(screen.getByText('123.4567')).toBeInTheDocument();
    });
  });

  describe('Target配分がない場合', () => {
    test('目標割合が0%で表示される', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        targetPortfolio: []
      });

      const { formatPercent } = require('../../../../utils/formatters');
      
      render(<AssetsTable />);
      
      expect(formatPercent).toHaveBeenCalledWith(0);
    });
  });

  describe('エッジケース', () => {
    test('annualFeeが0の場合の手数料表示', () => {
      render(<AssetsTable />);
      
      expect(screen.getByText('(0%)')).toBeInTheDocument();
    });

    test('dividendYieldが0の場合の配当表示', () => {
      render(<AssetsTable />);
      
      // 配当なしの銘柄に対して
      expect(screen.getByText('なし')).toBeInTheDocument();
    });

    test('totalAssetsが0の場合の割合計算', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        totalAssets: 0
      });

      render(<AssetsTable />);
      
      // 0除算を避けて0%が計算される
      expect(screen.getByText('保有資産詳細')).toBeInTheDocument();
    });
  });
});