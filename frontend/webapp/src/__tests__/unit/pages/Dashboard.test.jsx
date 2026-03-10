import { vi } from "vitest";
/**
 * Dashboard.tsx のユニットテスト
 * ダッシュボードページコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../../pages/Dashboard';

// react-router-dom の useNavigate をモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Lucide icons をモック
vi.mock('lucide-react', () => ({
  Upload: (props) => <svg data-testid="lucide-upload" {...props} />,
  PlusCircle: (props) => <svg data-testid="lucide-plus-circle" {...props} />,
}));

vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

// ダッシュボードコンポーネントをモック
vi.mock('../../../components/dashboard/PortfolioSummary', () => ({
  default: function PortfolioSummary() {
    return <div data-testid="portfolio-summary">Portfolio Summary</div>;
  },
}));

vi.mock('../../../components/dashboard/PortfolioCharts', () => ({
  default: function PortfolioCharts() {
    return <div data-testid="portfolio-charts">Portfolio Charts</div>;
  },
}));

vi.mock('../../../components/dashboard/DifferenceChart', () => ({
  default: function DifferenceChart() {
    return <div data-testid="difference-chart">Difference Chart</div>;
  },
}));

vi.mock('../../../components/dashboard/AssetsTable', () => ({
  default: function AssetsTable() {
    return <div data-testid="assets-table">Assets Table</div>;
  },
}));

vi.mock('../../../components/layout/DataStatusBar', () => ({
  default: function DataStatusBar() {
    return <div data-testid="data-status-bar">Data Status Bar</div>;
  },
}));

vi.mock('../../../components/dashboard/PortfolioScoreCard', () => ({
  default: function PortfolioScoreCard() {
    return <div data-testid="portfolio-score-card">Portfolio Score Card</div>;
  },
}));

vi.mock('../../../components/dashboard/PnLSummary', () => ({
  default: function PnLSummary() {
    return <div data-testid="pnl-summary">PnL Summary</div>;
  },
}));

vi.mock('../../../components/dashboard/PnLTrendChart', () => ({
  default: function PnLTrendChart() {
    return <div data-testid="pnl-trend-chart">PnL Trend Chart</div>;
  },
}));

vi.mock('../../../components/ai/StrengthsWeaknessCard', () => ({
  default: function StrengthsWeaknessCard() {
    return <div data-testid="strengths-weakness-card">Strengths Weakness Card</div>;
  },
}));

vi.mock('../../../components/goals/GoalProgressSection', () => ({
  default: function GoalProgressSection() {
    return <div data-testid="goal-progress-section">Goal Progress Section</div>;
  },
}));

vi.mock('../../../hooks/queries', () => ({
  useIsPremium: vi.fn(() => false),
}));

vi.mock('../../../utils/portfolioDataEnricher', () => ({
  enrichPortfolioData: vi.fn(() => ({
    strengths: [],
    weaknesses: [],
    totalValue: 0,
  })),
}));

vi.mock('../../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  AnalyticsEvents: { DASHBOARD_VIEW: 'dashboard_view' },
}));

import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのPortfolioContextモック
    usePortfolioContext.mockReturnValue({
      currentAssets: [
        { id: 1, symbol: 'AAPL', name: 'Apple Inc.', shares: 10, price: 150 }
      ]
    });
  });

  describe('データが存在する場合', () => {
    it('ダッシュボードの完全なレイアウトを表示する', () => {
      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      // タイトルとサブタイトルの確認
      expect(screen.getByText('ポートフォリオダッシュボード')).toBeInTheDocument();
      expect(screen.getByText('資産配分・損益・スコアの全体概要')).toBeInTheDocument();

      // データステータスバーの表示
      expect(screen.getByTestId('data-status-bar')).toBeInTheDocument();

      // ダッシュボードコンポーネントの表示
      expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-charts')).toBeInTheDocument();
      expect(screen.getByTestId('difference-chart')).toBeInTheDocument();
      expect(screen.getByTestId('assets-table')).toBeInTheDocument();
    });

    it('正しいCSS クラスが適用されている', () => {
      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      // メインコンテナのクラス
      const mainContainer = document.querySelector('.space-y-4.sm\\:space-y-6.animate-fade-in');
      expect(mainContainer).toBeInTheDocument();

      // タイトルのグラデーションクラス
      const title = screen.getByText('ポートフォリオダッシュボード');
      expect(title).toHaveClass('bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 'bg-clip-text', 'text-transparent');
    });
  });

  describe('データが存在しない場合（空の状態）', () => {
    beforeEach(() => {
      usePortfolioContext.mockReturnValue({
        currentAssets: []
      });
    });

    it('空の状態のUIを表示する', () => {
      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      expect(screen.getByText('ポートフォリオを始めましょう')).toBeInTheDocument();
      expect(screen.getByText('証券口座のCSVをインポートするか、銘柄を手動で追加できます。')).toBeInTheDocument();
    });

    it('CSVインポートボタンでdata-importへ遷移する', () => {
      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      const csvButton = screen.getByText('CSVインポート');
      fireEvent.click(csvButton);

      expect(mockNavigate).toHaveBeenCalledWith('/data-import');
    });

    it('手動追加ボタンで設定ページへ遷移する', () => {
      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      const manualButton = screen.getByText('手動で追加');
      fireEvent.click(manualButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('空の状態にLucideアイコンが表示される', () => {
      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      // Upload アイコンはヒーロー + ボタンで2つ
      expect(screen.getAllByTestId('lucide-upload').length).toBeGreaterThanOrEqual(1);
    });

    it('ダッシュボードコンポーネントが表示されない', () => {
      render(<MemoryRouter><Dashboard /></MemoryRouter>);

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

      expect(() => render(<MemoryRouter><Dashboard /></MemoryRouter>)).toThrow();
    });

    it('currentAssetsが未定義の場合はエラーが発生する', () => {
      usePortfolioContext.mockReturnValue({ currentAssets: undefined });

      expect(() => render(<MemoryRouter><Dashboard /></MemoryRouter>)).toThrow();
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

      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      // 1. タイトルエリアの表示
      expect(screen.getByText('ポートフォリオダッシュボード')).toBeInTheDocument();
      expect(screen.getByText('資産配分・損益・スコアの全体概要')).toBeInTheDocument();

      // 2. データステータスバーの表示
      expect(screen.getByTestId('data-status-bar')).toBeInTheDocument();

      // 3. 全ダッシュボードコンポーネントの表示
      expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-charts')).toBeInTheDocument();
      expect(screen.getByTestId('difference-chart')).toBeInTheDocument();
      expect(screen.getByTestId('assets-table')).toBeInTheDocument();
    });

    it('空の状態からの遷移フローが正常に動作する', () => {
      usePortfolioContext.mockReturnValue({ currentAssets: [] });

      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      // 1. 空の状態メッセージの表示
      expect(screen.getByText('ポートフォリオを始めましょう')).toBeInTheDocument();

      // 2. 説明の表示
      expect(screen.getByText('証券口座のCSVをインポートするか、銘柄を手動で追加できます。')).toBeInTheDocument();

      // 3. CSVインポートボタンクリック
      fireEvent.click(screen.getByText('CSVインポート'));
      expect(mockNavigate).toHaveBeenCalledWith('/data-import');

      // 4. 手動追加ボタンクリック
      fireEvent.click(screen.getByText('手動で追加'));
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });
});
