import { vi } from "vitest";
/**
 * Settings.tsx のユニットテスト
 * 設定ページコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../../../pages/Settings';

// lucide-react モック
vi.mock('lucide-react', () => ({
  BarChart3: function BarChart3(props) {
    return <svg data-testid="icon-bar-chart3" {...props} />;
  },
  Bot: function Bot(props) {
    return <svg data-testid="icon-bot" {...props} />;
  },
  ArrowUpDown: function ArrowUpDown(props) {
    return <svg data-testid="icon-arrow-up-down" {...props} />;
  },
  Bell: function Bell(props) {
    return <svg data-testid="icon-bell" {...props} />;
  },
  Settings: function SettingsIcon(props) {
    return <svg data-testid="icon-settings" {...props} />;
  },
  Upload: function Upload(props) {
    return <svg data-testid="icon-upload" {...props} />;
  },
}));

// 設定コンポーネントをモック
vi.mock('../../../components/settings/TickerSearch', () => ({
  default: function TickerSearch() {
    return <div data-testid="ticker-search">Ticker Search</div>;
  },
}));

vi.mock('../../../components/settings/PopularTickers', () => ({
  default: function PopularTickers() {
    return <div data-testid="popular-tickers">Popular Tickers</div>;
  },
}));

vi.mock('../../../components/settings/HoldingsEditor', () => ({
  default: function HoldingsEditor() {
    return <div data-testid="holdings-editor">Holdings Editor</div>;
  },
}));

vi.mock('../../../components/settings/AllocationEditor', () => ({
  default: function AllocationEditor() {
    return <div data-testid="allocation-editor">Allocation Editor</div>;
  },
}));

vi.mock('../../../components/settings/AiPromptSettings', () => ({
  default: function AiPromptSettings() {
    return <div data-testid="ai-prompt-settings">AI Prompt Settings</div>;
  },
}));

vi.mock('../../../components/settings/PortfolioYamlConverter', () => ({
  default: function PortfolioYamlConverter() {
    return <div data-testid="portfolio-yaml-converter">Portfolio YAML Converter</div>;
  },
}));

vi.mock('../../../components/settings/ResetSettings', () => ({
  default: function ResetSettings() {
    return <div data-testid="reset-settings">Reset Settings</div>;
  },
}));

vi.mock('../../../components/notifications/AlertRulesManager', () => ({
  default: function AlertRulesManager() {
    return <div data-testid="alert-rules-manager">Alert Rules Manager</div>;
  },
}));

vi.mock('../../../components/notifications/NotificationPreferences', () => ({
  default: function NotificationPreferences() {
    return <div data-testid="notification-preferences">Notification Preferences</div>;
  },
}));

describe('Settings', () => {
  describe('基本レンダリング', () => {
    it('デフォルトのポートフォリオ設定タブのコンポーネントを表示する', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // ポートフォリオ設定タブ（デフォルト）のコンポーネント
      expect(screen.getByTestId('ticker-search')).toBeInTheDocument();
      expect(screen.getByTestId('popular-tickers')).toBeInTheDocument();
      expect(screen.getByTestId('holdings-editor')).toBeInTheDocument();
      expect(screen.getByTestId('allocation-editor')).toBeInTheDocument();
    });

    it('正しいセクションタイトルを表示する（ポートフォリオタブ）', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      expect(screen.getByText('銘柄の追加')).toBeInTheDocument();
      expect(screen.getByText('保有資産の設定')).toBeInTheDocument();
      expect(screen.getByText('目標配分の設定')).toBeInTheDocument();
    });

    it('サブセクションタイトルを表示する', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      expect(screen.getByText('銘柄を検索して追加')).toBeInTheDocument();
      expect(screen.getByText('人気銘柄を追加')).toBeInTheDocument();
    });
  });

  describe('タブナビゲーション', () => {
    it('セクションタブが表示される', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      expect(screen.getByText('銘柄管理')).toBeInTheDocument();
      expect(screen.getByText('AI設定')).toBeInTheDocument();
      expect(screen.getByText('データ')).toBeInTheDocument();
      expect(screen.getByText('通知')).toBeInTheDocument();
      expect(screen.getByText('システム')).toBeInTheDocument();
    });

    it('各タブにLucideアイコンが表示される', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      expect(screen.getByTestId('icon-bar-chart3')).toBeInTheDocument();
      expect(screen.getByTestId('icon-bot')).toBeInTheDocument();
      expect(screen.getByTestId('icon-arrow-up-down')).toBeInTheDocument();
      expect(screen.getByTestId('icon-bell')).toBeInTheDocument();
      expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    });

    it('AI設定タブに切り替えるとAiPromptSettingsが表示される', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      fireEvent.click(screen.getByText('AI設定'));

      expect(screen.getByTestId('ai-prompt-settings')).toBeInTheDocument();
      // ポートフォリオ設定のコンポーネントは非表示
      expect(screen.queryByTestId('ticker-search')).not.toBeInTheDocument();
    });

    it('データタブに切り替えるとPortfolioYamlConverterが表示される', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      fireEvent.click(screen.getByText('データ'));

      expect(screen.getByTestId('portfolio-yaml-converter')).toBeInTheDocument();
    });

    it('通知タブに切り替えるとAlertRulesManagerとNotificationPreferencesが表示される', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      fireEvent.click(screen.getByText('通知'));

      expect(screen.getByTestId('alert-rules-manager')).toBeInTheDocument();
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
      expect(screen.getByText('アラートルール')).toBeInTheDocument();
      expect(screen.getByText('通知設定')).toBeInTheDocument();
    });

    it('システムタブに切り替えるとResetSettingsが表示される', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      fireEvent.click(screen.getByText('システム'));

      expect(screen.getByTestId('reset-settings')).toBeInTheDocument();
    });
  });

  describe('レイアウトとスタイリング', () => {
    it('正しいレイアウトクラスが適用されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // メインコンテナの空間設定
      const mainContainer = document.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
    });

    it('bg-cardのカードレイアウトが適用されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // ポートフォリオ設定タブのカード（bg-card + border-border + rounded-xl + shadow-sm）
      const cards = document.querySelectorAll('.bg-card.rounded-xl.shadow-sm');
      // タブバー + 3つのセクションカード = 4
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('グリッドレイアウトが正しく適用されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // 銘柄追加セクションのグリッドレイアウト
      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.gap-6');
      expect(gridContainer).toBeInTheDocument();
    });

    it('パディングクラスが正しく適用されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // パディングを持つカードコンテナ
      const paddedContainers = document.querySelectorAll('.p-6');
      expect(paddedContainers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイル対応のグリッドクラスが適用されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // モバイルでは1列、デスクトップでは2列のグリッド
      const responsiveGrid = document.querySelector('.grid-cols-1.md\\:grid-cols-2');
      expect(responsiveGrid).toBeInTheDocument();
    });

    it('レスポンシブなテキストサイズクラスが適用されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // h2とh3タイトルのクラス
      const h2Title = screen.getByText('銘柄の追加').closest('h2');
      const h3Title = screen.getByText('銘柄を検索して追加').closest('h3');

      expect(h2Title).toHaveClass('text-lg', 'font-semibold');
      expect(h3Title).toHaveClass('text-base', 'font-medium');
    });
  });

  describe('コンポーネント配置', () => {
    it('銘柄追加セクションが正しく配置されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      const tickerSection = screen.getByText('銘柄の追加').closest('div');
      expect(tickerSection).toContainElement(screen.getByTestId('ticker-search'));
      expect(tickerSection).toContainElement(screen.getByTestId('popular-tickers'));
    });

    it('保有資産設定セクションが正しく配置されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      const holdingsSection = screen.getByText('保有資産の設定').closest('div');
      expect(holdingsSection).toContainElement(screen.getByTestId('holdings-editor'));
    });

    it('目標配分設定セクションが正しく配置されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      const allocationSection = screen.getByText('目標配分の設定').closest('div');
      expect(allocationSection).toContainElement(screen.getByTestId('allocation-editor'));
    });

    it('AI分析プロンプト設定がAI設定タブにある', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // AI設定タブに切り替え
      fireEvent.click(screen.getByText('AI設定'));

      const aiPromptSettings = screen.getByTestId('ai-prompt-settings');
      expect(aiPromptSettings).toBeInTheDocument();
    });
  });

  describe('セマンティック構造', () => {
    it('適切な見出し階層を持つ（ポートフォリオタブ）', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // h2とh3の見出しが存在する
      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      const h3Headings = screen.getAllByRole('heading', { level: 3 });

      expect(h2Headings.length).toBe(3); // 3つのメインセクション
      expect(h3Headings.length).toBe(2); // 銘柄追加サブセクション
    });

    it('見出しに適切なテキストが設定されている', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      expect(screen.getByRole('heading', { level: 2, name: '銘柄の追加' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: '保有資産の設定' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: '目標配分の設定' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: '銘柄を検索して追加' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: '人気銘柄を追加' })).toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    it('コンポーネントが効率的にレンダリングされる', () => {
      const startTime = performance.now();
      render(<MemoryRouter><Settings /></MemoryRouter>);
      const endTime = performance.now();

      // レンダリング時間が100ms以下であることを確認
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('統合テスト', () => {
    it('完全な設定ページレイアウトが正常に動作する', () => {
      render(<MemoryRouter><Settings /></MemoryRouter>);

      // 1. タブナビゲーションの存在確認
      expect(screen.getByText('銘柄管理')).toBeInTheDocument();
      expect(screen.getByText('AI設定')).toBeInTheDocument();
      expect(screen.getByText('データ')).toBeInTheDocument();
      expect(screen.getByText('通知')).toBeInTheDocument();
      expect(screen.getByText('システム')).toBeInTheDocument();

      // 2. デフォルトタブのメインセクション
      expect(screen.getByText('銘柄の追加')).toBeInTheDocument();
      expect(screen.getByText('保有資産の設定')).toBeInTheDocument();
      expect(screen.getByText('目標配分の設定')).toBeInTheDocument();

      // 3. 全コンポーネントの存在確認
      expect(screen.getByTestId('ticker-search')).toBeInTheDocument();
      expect(screen.getByTestId('popular-tickers')).toBeInTheDocument();
      expect(screen.getByTestId('holdings-editor')).toBeInTheDocument();
      expect(screen.getByTestId('allocation-editor')).toBeInTheDocument();

      // 4. レイアウト構造の確認
      const mainContainer = document.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();

      // 5. AI設定タブに切り替え
      fireEvent.click(screen.getByText('AI設定'));
      expect(screen.getByTestId('ai-prompt-settings')).toBeInTheDocument();

      // 6. 通知タブに切り替え
      fireEvent.click(screen.getByText('通知'));
      expect(screen.getByTestId('alert-rules-manager')).toBeInTheDocument();
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });
  });
});
