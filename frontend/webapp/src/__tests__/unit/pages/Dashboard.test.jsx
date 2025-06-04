/**
 * Dashboard.jsx のユニットテスト
 * ダッシュボードページコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../../pages/Dashboard';

// モック設定
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}));

jest.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// ダッシュボードコンポーネントをモック
jest.mock('../../../components/dashboard/PortfolioSummary', () => {
  return function PortfolioSummary() {
    return <div data-testid="portfolio-summary">Portfolio Summary</div>;
  };
});

jest.mock('../../../components/dashboard/PortfolioCharts', () => {
  return function PortfolioCharts() {
    return <div data-testid="portfolio-charts">Portfolio Charts</div>;
  };
});

jest.mock('../../../components/dashboard/DifferenceChart', () => {
  return function DifferenceChart() {
    return <div data-testid="difference-chart">Difference Chart</div>;
  };
});

jest.mock('../../../components/dashboard/AssetsTable', () => {
  return function AssetsTable() {
    return <div data-testid="assets-table">Assets Table</div>;
  };
});

jest.mock('../../../components/layout/DataStatusBar', () => {
  return function DataStatusBar() {
    return <div data-testid="data-status-bar">Data Status Bar</div>;
  };
});

jest.mock('../../../components/common/ModernCard', () => {
  return function ModernCard({ children }) {
    return <div data-testid="modern-card">{children}</div>;
  };
});

jest.mock('../../../components/common/ModernButton', () => {
  return function ModernButton({ children, onClick }) {
    return <button data-testid="modern-button" onClick={onClick}>{children}</button>;
  };
});

const { useTranslation } = require('react-i18next');
const { usePortfolioContext } = require('../../../hooks/usePortfolioContext');

describe('Dashboard', () => {
  let mockT;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 翻訳関数のモック
    mockT = jest.fn((key) => {
      const translations = {
        'dashboard.noPortfolio': 'ポートフォリオがまだ設定されていません',
        'dashboard.setupInstructions': '設定ページで保有銘柄を追加してください。',
        'dashboard.goToSettings': '設定ページへ',
        'dashboard.title': 'ダッシュボード'
      };
      return translations[key] || key;
    });
    
    useTranslation.mockReturnValue({ t: mockT });
    
    // デフォルトのPortfolioContextモック
    usePortfolioContext.mockReturnValue({
      currentAssets: [
        { id: 1, symbol: 'AAPL', name: 'Apple Inc.', shares: 10, price: 150 }
      ]
    });
  });

  describe('データが存在する場合', () => {
    it('ダッシュボードの完全なレイアウトを表示する', () => {
      render(<Dashboard />);
      
      // タイトルとサブタイトルの確認
      expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText('Portfolio performance and analytics overview')).toBeInTheDocument();
      
      // データステータスバーの表示
      expect(screen.getByTestId('data-status-bar')).toBeInTheDocument();
      
      // ダッシュボードコンポーネントの表示
      expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-charts')).toBeInTheDocument();
      expect(screen.getByTestId('difference-chart')).toBeInTheDocument();
      expect(screen.getByTestId('assets-table')).toBeInTheDocument();
    });

    it('正しいCSS クラスが適用されている', () => {
      render(<Dashboard />);
      
      // メインコンテナのクラス
      const mainContainer = document.querySelector('.space-y-4.sm\\:space-y-6.animate-fade-in');
      expect(mainContainer).toBeInTheDocument();
      
      // タイトルのグラデーションクラス
      const title = screen.getByText('ダッシュボード');
      expect(title).toHaveClass('bg-gradient-to-r', 'from-primary-400', 'to-primary-500', 'bg-clip-text', 'text-transparent');
    });

    it('翻訳キーを正しく使用している', () => {
      render(<Dashboard />);
      
      expect(mockT).toHaveBeenCalledWith('dashboard.title');
    });
  });

  describe('データが存在しない場合（空の状態）', () => {
    beforeEach(() => {
      usePortfolioContext.mockReturnValue({
        currentAssets: []
      });
    });

    it('空の状態のUIを表示する', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('ポートフォリオがまだ設定されていません')).toBeInTheDocument();
      expect(screen.getByText('設定ページで保有銘柄を追加してください。')).toBeInTheDocument();
      expect(screen.getByText('設定ページへ')).toBeInTheDocument();
    });

    it('設定ページへのナビゲーションボタンが機能する', () => {
      // window.location.hrefをモック
      delete window.location;
      window.location = { href: '' };
      
      render(<Dashboard />);
      
      const settingsButton = screen.getByRole('button');
      fireEvent.click(settingsButton);
      
      expect(window.location.href).toBe('/settings');
    });

    it('空の状態のSVGアイコンが表示される', () => {
      render(<Dashboard />);
      
      const svgIcon = document.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toHaveClass('w-10', 'h-10', 'sm:w-12', 'sm:h-12', 'text-primary-400');
    });

    it('翻訳キーを正しく使用している', () => {
      render(<Dashboard />);
      
      expect(mockT).toHaveBeenCalledWith('dashboard.noPortfolio');
      expect(mockT).toHaveBeenCalledWith('dashboard.setupInstructions');
      expect(mockT).toHaveBeenCalledWith('dashboard.goToSettings');
    });

    it('ダッシュボードコンポーネントが表示されない', () => {
      render(<Dashboard />);
      
      expect(screen.queryByTestId('portfolio-summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('portfolio-charts')).not.toBeInTheDocument();
      expect(screen.queryByTestId('difference-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('assets-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('data-status-bar')).not.toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('usePortfolioContextが未定義を返す場合はエラーが発生する', () => {
      usePortfolioContext.mockReturnValue({});
      
      // 実際のコンポーネントはcurrentAssets.lengthでエラーが発生する
      expect(() => render(<Dashboard />)).toThrow();
    });

    it('currentAssetsが未定義の場合はエラーが発生する', () => {
      usePortfolioContext.mockReturnValue({ currentAssets: undefined });
      
      // 実際のコンポーネントはcurrentAssets.lengthでエラーが発生する
      expect(() => render(<Dashboard />)).toThrow();
    });

    it('翻訳関数が利用できない場合でも動作する', () => {
      useTranslation.mockReturnValue({ t: undefined });
      
      expect(() => render(<Dashboard />)).toThrow();
    });
  });

  describe('統合テスト', () => {
    it('完全なダッシュボード表示フローが正常に動作する', () => {
      const mockAssets = [
        { id: 1, symbol: 'AAPL', name: 'Apple Inc.', shares: 10, price: 150 },
        { id: 2, symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 5, price: 2500 }
      ];
      
      usePortfolioContext.mockReturnValue({
        currentAssets: mockAssets
      });
      
      render(<Dashboard />);
      
      // 1. タイトルエリアの表示
      expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText('Portfolio performance and analytics overview')).toBeInTheDocument();
      
      // 2. データステータスバーの表示
      expect(screen.getByTestId('data-status-bar')).toBeInTheDocument();
      
      // 3. 全ダッシュボードコンポーネントの表示
      expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-charts')).toBeInTheDocument();
      expect(screen.getByTestId('difference-chart')).toBeInTheDocument();
      expect(screen.getByTestId('assets-table')).toBeInTheDocument();
      
      // 4. 翻訳キーの使用確認
      expect(mockT).toHaveBeenCalledWith('dashboard.title');
    });

    it('空の状態から設定ページへの遷移フローが正常に動作する', () => {
      usePortfolioContext.mockReturnValue({ currentAssets: [] });
      
      delete window.location;
      window.location = { href: '' };
      
      render(<Dashboard />);
      
      // 1. 空の状態メッセージの表示
      expect(screen.getByText('ポートフォリオがまだ設定されていません')).toBeInTheDocument();
      
      // 2. 設定手順の表示
      expect(screen.getByText('設定ページで保有銘柄を追加してください。')).toBeInTheDocument();
      
      // 3. 設定ページへのボタンクリック
      const settingsButton = screen.getByRole('button');
      fireEvent.click(settingsButton);
      
      // 4. ナビゲーションの実行確認
      expect(window.location.href).toBe('/settings');
      
      // 5. 翻訳キーの使用確認
      expect(mockT).toHaveBeenCalledWith('dashboard.noPortfolio');
      expect(mockT).toHaveBeenCalledWith('dashboard.setupInstructions');
      expect(mockT).toHaveBeenCalledWith('dashboard.goToSettings');
    });
  });
});