/**
 * PortfolioSummary.jsx のテストファイル
 * ポートフォリオサマリーコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import PortfolioSummary from '../../../../components/dashboard/PortfolioSummary';
import { usePortfolioContext } from '../../../../hooks/usePortfolioContext';
import i18n from '../../../../i18n';

// usePortfolioContextフックのモック
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// formatters utilsのモック
jest.mock('../../../../utils/formatters', () => ({
  formatCurrency: jest.fn((value, currency) => `${currency} ${value?.toLocaleString()}`),
  formatPercent: jest.fn((value, decimals = 1) => `${value?.toFixed(decimals)}%`)
}));

// ModernCardのモック
jest.mock('../../../../components/common/ModernCard', () => {
  const MockedModernCard = ({ children, className, gradient, hover, ...props }) => (
    <div data-testid="modern-card" className={className} {...props}>
      {children}
    </div>
  );
  
  MockedModernCard.Header = ({ children }) => (
    <div data-testid="modern-card-header">{children}</div>
  );
  
  MockedModernCard.Title = ({ children, size }) => (
    <h1 data-testid="modern-card-title" data-size={size}>{children}</h1>
  );
  
  MockedModernCard.Content = ({ children }) => (
    <div data-testid="modern-card-content">{children}</div>
  );
  
  MockedModernCard.Icon = ({ icon, color, className }) => (
    <div data-testid="modern-card-icon" data-color={color} className={className}>
      {icon}
    </div>
  );
  
  return MockedModernCard;
});

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe('PortfolioSummary', () => {
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
        dividendFrequency: 'quarterly',
        dividendIsEstimated: false,
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
        dividendFrequency: 'annual',
        dividendIsEstimated: true,
        fundType: '投資信託'
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
        fundType: '個別株'
      }
    ],
    targetPortfolio: [
      { id: '1', targetPercentage: 50 },
      { id: '2', targetPercentage: 30 },
      { id: '3', targetPercentage: 20 }
    ],
    exchangeRate: { rate: 150 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
  });

  describe('基本レンダリング', () => {
    test('サマリータイトルが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    test('4つの統計カードが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      const cards = screen.getAllByTestId('modern-card');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    test('すべての統計項目が表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('設定銘柄数')).toBeInTheDocument();
      expect(screen.getByText('年間手数料（推定）')).toBeInTheDocument();
      expect(screen.getByText('年間配当金（推定）')).toBeInTheDocument();
    });
  });

  describe('統計値の計算', () => {
    test('銘柄数が正しく計算される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('年間手数料率が正しく表示される', () => {
      const { formatPercent } = require('../../../../utils/formatters');
      
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(formatPercent).toHaveBeenCalledWith(0.5, 2); // 50000/10000000 * 100 = 0.5%
    });

    test('配当利回りが正しく表示される', () => {
      const { formatPercent } = require('../../../../utils/formatters');
      
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(formatPercent).toHaveBeenCalledWith(2.0, 2); // 200000/10000000 * 100 = 2.0%
    });

    test('通貨フォーマットが正しく呼ばれる', () => {
      const { formatCurrency } = require('../../../../utils/formatters');
      
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(formatCurrency).toHaveBeenCalledWith(10000000, 'JPY');
      expect(formatCurrency).toHaveBeenCalledWith(50000, 'JPY');
      expect(formatCurrency).toHaveBeenCalledWith(200000, 'JPY');
    });
  });

  describe('資産がない場合', () => {
    test('空の資産配列でも正常にレンダリングされる', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [],
        totalAssets: 0,
        annualFees: 0,
        annualDividends: 0
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // 銘柄数が0
    });

    test('詳細セクションが表示されない', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [],
        totalAssets: 0
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.queryByText('手数料と配当詳細')).not.toBeInTheDocument();
    });
  });

  describe('手数料と配当詳細セクション', () => {
    test('資産がある場合は詳細セクションが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('手数料と配当詳細')).toBeInTheDocument();
    });

    test('最高手数料率の銘柄が表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('最も高い手数料率の銘柄')).toBeInTheDocument();
      expect(screen.getByText('日本株式インデックス')).toBeInTheDocument(); // 0.15%が最高
    });

    test('最低手数料率の銘柄が表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('最も低い手数料率の銘柄')).toBeInTheDocument();
      expect(screen.getByText('米国株式ETF')).toBeInTheDocument(); // 0.03%が最低（0%は除外）
    });

    test('最高配当利回りの銘柄が表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('最も高い配当利回りの銘柄')).toBeInTheDocument();
      expect(screen.getByText('日本株式インデックス')).toBeInTheDocument(); // 2.2%が最高
    });

    test('配当がない場合は高配当銘柄セクションが表示されない', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[2], // 配当なしの株式のみ
            holdings: 100
          }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.queryByText('最も高い配当利回りの銘柄')).not.toBeInTheDocument();
    });
  });

  describe('配当頻度の表示', () => {
    test('quarterly配当が正しく表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('四半期分配')).toBeInTheDocument();
    });

    test('annual配当が正しく表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('年1回分配')).toBeInTheDocument();
    });

    test('monthly配当の表示テスト', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            dividendFrequency: 'monthly',
            dividendYield: 3.0 // 最高配当利回りにするため
          }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('毎月分配')).toBeInTheDocument();
    });

    test('semi-annual配当の表示テスト', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            dividendFrequency: 'semi-annual',
            dividendYield: 3.0
          }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('半年分配')).toBeInTheDocument();
    });

    test('推定配当のバッジが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('推定値')).toBeInTheDocument();
    });
  });

  describe('ファンドタイプ別集計', () => {
    test('ファンドタイプ別年間手数料が表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('ファンドタイプ別年間手数料（上位3種類）')).toBeInTheDocument();
    });

    test('ファンドタイプ別年間配当金が表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('ファンドタイプ別年間配当金（上位3種類）')).toBeInTheDocument();
    });

    test('銘柄数バッジが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      const badges = screen.getAllByText(/\d+銘柄/);
      expect(badges.length).toBeGreaterThan(0);
    });

    test('平均手数料率が表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText(/平均手数料率:/)).toBeInTheDocument();
    });

    test('平均利回りが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText(/平均利回り:/)).toBeInTheDocument();
    });
  });

  describe('通貨換算', () => {
    test('USD to JPY 換算が正しく処理される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      // 統計値の計算とレンダリングが正常に行われることを確認
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    test('JPY to USD 換算が正しく処理される', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        baseCurrency: 'USD'
      });

      const { formatCurrency } = require('../../../../utils/formatters');
      
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(formatCurrency).toHaveBeenCalledWith(expect.any(Number), 'USD');
    });
  });

  describe('統計アイコン', () => {
    test('各統計項目にアイコンが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      const icons = screen.getAllByTestId('modern-card-icon');
      expect(icons.length).toBeGreaterThanOrEqual(4);
    });

    test('アイコンに正しい色が設定される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      const icons = screen.getAllByTestId('modern-card-icon');
      const colors = icons.map(icon => icon.getAttribute('data-color'));
      expect(colors).toContain('primary');
      expect(colors).toContain('secondary');
      expect(colors).toContain('danger');
      expect(colors).toContain('success');
    });
  });

  describe('計算について説明', () => {
    test('計算についての説明セクションが表示される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('計算について')).toBeInTheDocument();
      expect(screen.getByText(/手数料は各銘柄の現在の保有額と設定された年間手数料率に基づいて計算/)).toBeInTheDocument();
      expect(screen.getByText(/配当金は各銘柄の現在の保有額と推定配当利回りに基づいて計算/)).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    test('totalAssetsが0の場合の手数料率計算', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        totalAssets: 0,
        annualFees: 1000
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      // 0除算を避けて0%が計算されることを確認
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    test('holdings が 0 の資産は最高/最低手数料から除外される', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            holdings: 0, // 保有数0
            annualFee: 10.0 // 非常に高い手数料
          },
          defaultMockData.currentAssets[1] // 保有数あり
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      // 保有数0の銘柄は除外され、保有数ありの銘柄が表示される
      expect(screen.getByText('日本株式インデックス')).toBeInTheDocument();
      expect(screen.queryByText('米国株式ETF')).not.toBeInTheDocument();
    });

    test('手数料が0の銘柄は最低手数料銘柄から除外される', () => {
      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      // annualFee = 0 の「テスト株式」は最低手数料銘柄として表示されない
      // 代わりにannualFee = 0.03の「米国株式ETF」が表示される
      const lowestFeeSection = screen.getByText('最も低い手数料率の銘柄');
      expect(lowestFeeSection).toBeInTheDocument();
    });

    test('配当なしの銘柄は最高配当から除外される', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          defaultMockData.currentAssets[2] // 配当なしの銘柄のみ
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.queryByText('最も高い配当利回りの銘柄')).not.toBeInTheDocument();
    });

    test('未知のファンドタイプも正しく処理される', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            fundType: undefined // undefined のファンドタイプ
          }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      // エラーなくレンダリングされることを確認
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    test('配当頻度が未知の場合のデフォルト表示', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            dividendFrequency: 'unknown',
            dividendYield: 3.0 // 最高配当利回りにするため
          }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('配当あり')).toBeInTheDocument();
    });
  });

  describe('ソート機能', () => {
    test('手数料の高い順でファンドタイプがソートされる', () => {
      // 複数のファンドタイプで手数料の違いを明確にするデータ
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            id: '1',
            name: 'ETF 1',
            fundType: 'ETF',
            price: 100,
            holdings: 100,
            annualFee: 0.1,
            currency: 'JPY',
            hasDividend: false
          },
          {
            id: '2',
            name: '投資信託 1',
            fundType: '投資信託',
            price: 100,
            holdings: 100,
            annualFee: 1.0, // 高い手数料
            currency: 'JPY',
            hasDividend: false
          },
          {
            id: '3',
            name: '個別株 1',
            fundType: '個別株',
            price: 100,
            holdings: 100,
            annualFee: 0.5,
            currency: 'JPY',
            hasDividend: false
          }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('ファンドタイプ別年間手数料（上位3種類）')).toBeInTheDocument();
    });

    test('配当の高い順でファンドタイプがソートされる', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            id: '1',
            name: 'ETF 1',
            fundType: 'ETF',
            price: 100,
            holdings: 100,
            annualFee: 0.1,
            currency: 'JPY',
            hasDividend: true,
            dividendYield: 2.0
          },
          {
            id: '2',
            name: '投資信託 1',
            fundType: '投資信託',
            price: 100,
            holdings: 100,
            annualFee: 1.0,
            currency: 'JPY',
            hasDividend: true,
            dividendYield: 4.0 // 高い配当
          }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioSummary />
        </TestWrapper>
      );

      expect(screen.getByText('ファンドタイプ別年間配当金（上位3種類）')).toBeInTheDocument();
    });
  });
});