/**
 * PortfolioSummary.jsx のテストファイル
 * ポートフォリオの概要情報を表示するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioSummary from '../../../../components/dashboard/PortfolioSummary';
import { usePortfolioContext } from '../../../../hooks/usePortfolioContext';

// React i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'dashboard.totalAssets': '総資産'
      };
      return translations[key] || key;
    },
    i18n: { language: 'ja' }
  })
}));

// usePortfolioContextフックのモック
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// formatters utilsのモック
jest.mock('../../../../utils/formatters', () => ({
  formatCurrency: jest.fn((value, currency) => `${currency} ${value?.toLocaleString()}`),
  formatPercent: jest.fn((value, decimals = 1) => `${value?.toFixed(decimals)}%`)
}));

// ModernCardコンポーネントのモック
jest.mock('../../../../components/common/ModernCard', () => {
  const MockModernCard = ({ children, className, gradient, hover, ...props }) => (
    <div data-testid="modern-card" className={className} {...props}>
      {children}
    </div>
  );
  
  MockModernCard.Header = ({ children }) => (
    <div data-testid="modern-card-header">{children}</div>
  );
  
  MockModernCard.Title = ({ children, size }) => (
    <h3 data-testid="modern-card-title" data-size={size}>{children}</h3>
  );
  
  MockModernCard.Content = ({ children }) => (
    <div data-testid="modern-card-content">{children}</div>
  );
  
  MockModernCard.Icon = ({ icon, color, className }) => (
    <div data-testid="modern-card-icon" data-color={color} className={className}>
      {icon}
    </div>
  );
  
  return MockModernCard;
});

describe('PortfolioSummary Component', () => {
  const defaultMockData = {
    baseCurrency: 'JPY',
    totalAssets: 10000000,
    annualFees: 50000,
    annualDividends: 200000,
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
        fundType: 'ETF'
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
        fundType: '投資信託'
      }
    ],
    targetPortfolio: [
      { id: '1', targetPercentage: 60 },
      { id: '2', targetPercentage: 40 }
    ],
    exchangeRate: { rate: 150 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<PortfolioSummary />);
      
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
      expect(screen.getByText('総資産')).toBeInTheDocument();
      expect(screen.getByText('設定銘柄数')).toBeInTheDocument();
      expect(screen.getByText('年間手数料（推定）')).toBeInTheDocument();
      expect(screen.getByText('年間配当金（推定）')).toBeInTheDocument();
    });

    test('統計データが正しく計算されて表示される', () => {
      const { formatCurrency, formatPercent } = require('../../../../utils/formatters');
      
      render(<PortfolioSummary />);
      
      expect(formatCurrency).toHaveBeenCalledWith(10000000, 'JPY');
      expect(formatCurrency).toHaveBeenCalledWith(50000, 'JPY');
      expect(formatCurrency).toHaveBeenCalledWith(200000, 'JPY');
      expect(formatPercent).toHaveBeenCalledWith(0.5, 2); // 手数料率
      expect(formatPercent).toHaveBeenCalledWith(2, 2); // 配当利回り
    });

    test('銘柄数が正しく表示される', () => {
      render(<PortfolioSummary />);
      
      // 2つの銘柄があるので2が表示される
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('手数料と配当詳細セクション', () => {
    test('最高手数料率の銘柄が正しく表示される', () => {
      render(<PortfolioSummary />);
      
      expect(screen.getByText('最も高い手数料率の銘柄')).toBeInTheDocument();
      expect(screen.getByText('日本株式インデックス')).toBeInTheDocument();
    });

    test('最低手数料率の銘柄が正しく表示される', () => {
      render(<PortfolioSummary />);
      
      expect(screen.getByText('最も低い手数料率の銘柄')).toBeInTheDocument();
      expect(screen.getByText('米国株式ETF')).toBeInTheDocument();
    });

    test('最高配当利回りの銘柄が正しく表示される', () => {
      render(<PortfolioSummary />);
      
      expect(screen.getByText('最も高い配当利回りの銘柄')).toBeInTheDocument();
    });

    test('配当頻度の表示', () => {
      const mockDataWithDividendFrequency = {
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            dividendFrequency: 'quarterly',
            dividendIsEstimated: true
          }
        ]
      };
      
      mockPortfolioContext.mockReturnValue(mockDataWithDividendFrequency);
      
      render(<PortfolioSummary />);
      
      expect(screen.getByText('四半期分配')).toBeInTheDocument();
      expect(screen.getByText('推定値')).toBeInTheDocument();
    });
  });

  describe('ファンドタイプ別集計', () => {
    test('ファンドタイプ別手数料が表示される', () => {
      render(<PortfolioSummary />);
      
      expect(screen.getByText('ファンドタイプ別年間手数料（上位3種類）')).toBeInTheDocument();
      expect(screen.getByText('ETF')).toBeInTheDocument();
      expect(screen.getByText('投資信託')).toBeInTheDocument();
    });

    test('ファンドタイプ別配当が表示される', () => {
      render(<PortfolioSummary />);
      
      expect(screen.getByText('ファンドタイプ別年間配当金（上位3種類）')).toBeInTheDocument();
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('保有資産がない場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [],
        totalAssets: 0
      });

      render(<PortfolioSummary />);
      
      // 基本統計は表示されるが、詳細セクションは表示されない
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
      expect(screen.queryByText('手数料と配当詳細')).not.toBeInTheDocument();
    });

    test('保有額が0の資産がある場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            holdings: 0
          }
        ]
      });

      render(<PortfolioSummary />);
      
      // holdings = 0の資産は手数料計算から除外される
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    test('配当がない銘柄のみの場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            hasDividend: false,
            dividendYield: 0
          }
        ]
      });

      render(<PortfolioSummary />);
      
      // 配当関連の表示がない
      expect(screen.queryByText('最も高い配当利回りの銘柄')).not.toBeInTheDocument();
    });

    test('totalAssetsが0の場合の割合計算', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        totalAssets: 0
      });

      const { formatPercent } = require('../../../../utils/formatters');
      
      render(<PortfolioSummary />);
      
      // 0除算を避けて0%が表示される
      expect(formatPercent).toHaveBeenCalledWith(0, 2);
    });

    test('annualFeeが未定義の場合', () => {
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            annualFee: undefined
          }
        ]
      });

      render(<PortfolioSummary />);
      
      // undefinedでもエラーにならない
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });
  });

  describe('通貨換算', () => {
    test('USD to JPY 換算が正しく処理される', () => {
      const usdAsset = {
        ...defaultMockData.currentAssets[0],
        currency: 'USD',
        price: 100,
        holdings: 10
      };
      
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        baseCurrency: 'JPY',
        currentAssets: [usdAsset],
        exchangeRate: { rate: 150 }
      });

      render(<PortfolioSummary />);
      
      // USD資産が円換算される
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    test('JPY to USD 換算が正しく処理される', () => {
      const jpyAsset = {
        ...defaultMockData.currentAssets[1],
        currency: 'JPY',
        price: 15000,
        holdings: 10
      };
      
      mockPortfolioContext.mockReturnValue({
        ...defaultMockData,
        baseCurrency: 'USD',
        currentAssets: [jpyAsset],
        exchangeRate: { rate: 150 }
      });

      render(<PortfolioSummary />);
      
      // JPY資産がUSD換算される
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });
  });

  describe('配当頻度の変換', () => {
    test('各配当頻度が正しく表示される', () => {
      const frequencies = [
        { frequency: 'monthly', expected: '毎月分配' },
        { frequency: 'quarterly', expected: '四半期分配' },
        { frequency: 'semi-annual', expected: '半年分配' },
        { frequency: 'annual', expected: '年1回分配' }
      ];

      frequencies.forEach(({ frequency, expected }) => {
        mockPortfolioContext.mockReturnValue({
          ...defaultMockData,
          currentAssets: [
            {
              ...defaultMockData.currentAssets[0],
              dividendFrequency: frequency,
              hasDividend: true,
              dividendYield: 2.0
            }
          ]
        });

        const { rerender } = render(<PortfolioSummary />);
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        
        rerender(<div />); // コンポーネントをクリア
      });
    });
  });

  describe('計算について情報', () => {
    test('計算についての説明が表示される', () => {
      render(<PortfolioSummary />);
      
      expect(screen.getByText('計算について')).toBeInTheDocument();
      expect(screen.getByText(/手数料は各銘柄の現在の保有額と設定された年間手数料率に基づいて計算/)).toBeInTheDocument();
      expect(screen.getByText(/配当金は各銘柄の現在の保有額と推定配当利回りに基づいて計算/)).toBeInTheDocument();
    });
  });

  describe('SVGアイコンの表示', () => {
    test('各統計にSVGアイコンが表示される', () => {
      render(<PortfolioSummary />);
      
      const icons = screen.getAllByTestId('modern-card-icon');
      expect(icons).toHaveLength(4); // 4つの主要統計
      
      icons.forEach(icon => {
        expect(icon.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});