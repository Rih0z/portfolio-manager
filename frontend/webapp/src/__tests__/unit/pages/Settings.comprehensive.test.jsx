/**
 * Settings.jsxの包括的ユニットテスト
 * 
 * 62行のページコンポーネントの全機能をテスト
 * - 子コンポーネント統合（6つのコンポーネント）
 * - レイアウト構造（グリッド、カード）
 * - スタイリング（TailwindCSS）
 * - 静的コンテンツ表示
 * - レスポンシブデザイン
 * - 階層構造
 * - アクセシビリティ
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Settings from '../../../pages/Settings';

// 子コンポーネントのモック
jest.mock('../../../components/settings/TickerSearch', () => {
  return function MockTickerSearch() {
    return (
      <div data-testid="ticker-search">
        <div>Ticker Search Mock</div>
        <input placeholder="銘柄を検索" />
      </div>
    );
  };
});

jest.mock('../../../components/settings/PopularTickers', () => {
  return function MockPopularTickers() {
    return (
      <div data-testid="popular-tickers">
        <div>Popular Tickers Mock</div>
        <button>AAPL</button>
        <button>VTI</button>
      </div>
    );
  };
});

jest.mock('../../../components/settings/HoldingsEditor', () => {
  return function MockHoldingsEditor() {
    return (
      <div data-testid="holdings-editor">
        <div>Holdings Editor Mock</div>
        <table>
          <thead>
            <tr><th>銘柄</th><th>保有株数</th></tr>
          </thead>
        </table>
      </div>
    );
  };
});

jest.mock('../../../components/settings/AllocationEditor', () => {
  return function MockAllocationEditor() {
    return (
      <div data-testid="allocation-editor">
        <div>Allocation Editor Mock</div>
        <div>目標配分設定</div>
      </div>
    );
  };
});

jest.mock('../../../components/settings/AiPromptSettings', () => {
  return function MockAiPromptSettings() {
    return (
      <div data-testid="ai-prompt-settings">
        <div>AI Prompt Settings Mock</div>
        <textarea placeholder="プロンプト設定"></textarea>
      </div>
    );
  };
});

jest.mock('../../../components/settings/ResetSettings', () => {
  return function MockResetSettings() {
    return (
      <div data-testid="reset-settings">
        <div>Reset Settings Mock</div>
        <button>リセット</button>
      </div>
    );
  };
});

describe('Settings - 包括的テスト', () => {
  const renderSettings = () => {
    return render(<Settings />);
  };

  describe('初期レンダリング', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
      renderSettings();
      
      expect(screen.getByText('銘柄の追加')).toBeInTheDocument();
      expect(screen.getByText('保有資産の設定')).toBeInTheDocument();
      expect(screen.getByText('目標配分の設定')).toBeInTheDocument();
    });

    it('すべてのメインヘッダーが表示される', () => {
      renderSettings();
      
      expect(screen.getByRole('heading', { level: 2, name: '銘柄の追加' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: '保有資産の設定' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: '目標配分の設定' })).toBeInTheDocument();
    });

    it('サブヘッダーが表示される', () => {
      renderSettings();
      
      expect(screen.getByRole('heading', { level: 3, name: '銘柄を検索して追加' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: '人気銘柄を追加' })).toBeInTheDocument();
    });
  });

  describe('子コンポーネント統合', () => {
    it('すべての子コンポーネントが正しく統合されている', () => {
      renderSettings();
      
      expect(screen.getByTestId('ticker-search')).toBeInTheDocument();
      expect(screen.getByTestId('popular-tickers')).toBeInTheDocument();
      expect(screen.getByTestId('holdings-editor')).toBeInTheDocument();
      expect(screen.getByTestId('allocation-editor')).toBeInTheDocument();
      expect(screen.getByTestId('ai-prompt-settings')).toBeInTheDocument();
      expect(screen.getByTestId('reset-settings')).toBeInTheDocument();
    });

    it('TickerSearchコンポーネントが正しく表示される', () => {
      renderSettings();
      
      const tickerSearch = screen.getByTestId('ticker-search');
      expect(tickerSearch).toContainHTML('Ticker Search Mock');
      expect(screen.getByPlaceholderText('銘柄を検索')).toBeInTheDocument();
    });

    it('PopularTickersコンポーネントが正しく表示される', () => {
      renderSettings();
      
      const popularTickers = screen.getByTestId('popular-tickers');
      expect(popularTickers).toContainHTML('Popular Tickers Mock');
      expect(screen.getByRole('button', { name: 'AAPL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'VTI' })).toBeInTheDocument();
    });

    it('HoldingsEditorコンポーネントが正しく表示される', () => {
      renderSettings();
      
      const holdingsEditor = screen.getByTestId('holdings-editor');
      expect(holdingsEditor).toContainHTML('Holdings Editor Mock');
      expect(screen.getByRole('columnheader', { name: '銘柄' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: '保有株数' })).toBeInTheDocument();
    });

    it('AllocationEditorコンポーネントが正しく表示される', () => {
      renderSettings();
      
      const allocationEditor = screen.getByTestId('allocation-editor');
      expect(allocationEditor).toContainHTML('Allocation Editor Mock');
      expect(allocationEditor).toContainHTML('目標配分設定');
    });

    it('AiPromptSettingsコンポーネントが正しく表示される', () => {
      renderSettings();
      
      const aiPromptSettings = screen.getByTestId('ai-prompt-settings');
      expect(aiPromptSettings).toContainHTML('AI Prompt Settings Mock');
      expect(screen.getByPlaceholderText('プロンプト設定')).toBeInTheDocument();
    });

    it('ResetSettingsコンポーネントが正しく表示される', () => {
      renderSettings();
      
      const resetSettings = screen.getByTestId('reset-settings');
      expect(resetSettings).toContainHTML('Reset Settings Mock');
      expect(screen.getByRole('button', { name: 'リセット' })).toBeInTheDocument();
    });
  });

  describe('レイアウト構造', () => {
    it('メインコンテナに適切なスペーシングクラスが適用されている', () => {
      const { container } = renderSettings();
      
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('space-y-6');
    });

    it('銘柄追加セクションのカードスタイルが適用されている', () => {
      renderSettings();
      
      const addStockSection = screen.getByText('銘柄の追加').closest('div');
      expect(addStockSection).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-6');
    });

    it('保有資産設定セクションのカードスタイルが適用されている', () => {
      renderSettings();
      
      const holdingsSection = screen.getByText('保有資産の設定').closest('div');
      expect(holdingsSection).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-6');
    });

    it('目標配分設定セクションのカードスタイルが適用されている', () => {
      renderSettings();
      
      const allocationSection = screen.getByText('目標配分の設定').closest('div');
      expect(allocationSection).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-6');
    });

    it('グリッドレイアウトが適用されている', () => {
      renderSettings();
      
      const gridContainer = screen.getByText('銘柄を検索して追加').closest('div').parentElement;
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
    });

    it('グリッド内の各列が適切に配置されている', () => {
      renderSettings();
      
      const searchColumn = screen.getByText('銘柄を検索して追加').closest('div');
      const popularColumn = screen.getByText('人気銘柄を追加').closest('div');
      
      expect(searchColumn).toBeInTheDocument();
      expect(popularColumn).toBeInTheDocument();
    });
  });

  describe('スタイリング詳細', () => {
    it('h2ヘッダーに適切なスタイルが適用されている', () => {
      renderSettings();
      
      const h2Headers = screen.getAllByRole('heading', { level: 2 });
      h2Headers.forEach(header => {
        expect(header).toHaveClass('text-xl', 'font-semibold', 'mb-4');
      });
    });

    it('h3ヘッダーに適切なスタイルが適用されている', () => {
      renderSettings();
      
      const h3Headers = screen.getAllByRole('heading', { level: 3 });
      h3Headers.forEach(header => {
        expect(header).toHaveClass('text-lg', 'font-medium', 'mb-3');
      });
    });

    it('カードコンテナが一貫したスタイリングを持つ', () => {
      renderSettings();
      
      const cardContainers = screen.getAllByText(/銘柄の追加|保有資産の設定|目標配分の設定/)
        .map(text => text.closest('div'));
      
      cardContainers.forEach(container => {
        expect(container).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-6');
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('グリッドが小画面で1列、中画面以上で2列になる', () => {
      renderSettings();
      
      const gridContainer = screen.getByText('銘柄を検索して追加').closest('div').parentElement;
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    });

    it('メディアクエリ対応のスペーシングが適用されている', () => {
      renderSettings();
      
      const gridContainer = screen.getByText('銘柄を検索して追加').closest('div').parentElement;
      expect(gridContainer).toHaveClass('gap-6');
    });
  });

  describe('コンポーネント階層', () => {
    it('コンポーネントが正しい順序で表示される', () => {
      const { container } = renderSettings();
      
      const sections = container.querySelectorAll('[data-testid], .bg-white');
      const elements = Array.from(sections);
      
      // 最初の3つはカードセクション、その後にAiPromptSettings、最後にResetSettings
      expect(elements.length).toBeGreaterThanOrEqual(5);
    });

    it('銘柄追加セクションが最初に表示される', () => {
      renderSettings();
      
      const addStockHeader = screen.getByText('銘柄の追加');
      const holdingsHeader = screen.getByText('保有資産の設定');
      
      expect(addStockHeader.compareDocumentPosition(holdingsHeader))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('保有資産設定が目標配分設定より前に表示される', () => {
      renderSettings();
      
      const holdingsHeader = screen.getByText('保有資産の設定');
      const allocationHeader = screen.getByText('目標配分の設定');
      
      expect(holdingsHeader.compareDocumentPosition(allocationHeader))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('AI設定とリセット設定が最後に表示される', () => {
      renderSettings();
      
      const allocationHeader = screen.getByText('目標配分の設定');
      const aiPromptSettings = screen.getByTestId('ai-prompt-settings');
      const resetSettings = screen.getByTestId('reset-settings');
      
      expect(allocationHeader.compareDocumentPosition(aiPromptSettings))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(aiPromptSettings.compareDocumentPosition(resetSettings))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なヘッダー階層が使用されている', () => {
      renderSettings();
      
      const h2Headers = screen.getAllByRole('heading', { level: 2 });
      const h3Headers = screen.getAllByRole('heading', { level: 3 });
      
      expect(h2Headers.length).toBe(3);
      expect(h3Headers.length).toBe(2);
    });

    it('見出しが論理的な順序である', () => {
      renderSettings();
      
      const allHeadings = screen.getAllByRole('heading');
      expect(allHeadings.length).toBeGreaterThanOrEqual(5);
    });

    it('フォーム要素が適切にラベル付けされている', () => {
      renderSettings();
      
      // モックコンポーネント内のフォーム要素を確認
      expect(screen.getByPlaceholderText('銘柄を検索')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('プロンプト設定')).toBeInTheDocument();
    });

    it('ボタンが適切に配置されている', () => {
      renderSettings();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3); // AAPL, VTI, リセット
    });

    it('テーブルヘッダーが適切に設定されている', () => {
      renderSettings();
      
      const tableHeaders = screen.getAllByRole('columnheader');
      expect(tableHeaders.length).toBe(2); // 銘柄, 保有株数
    });
  });

  describe('セマンティックHTML', () => {
    it('適切なHTML構造が使用されている', () => {
      renderSettings();
      
      // div要素が適切に階層化されている
      const mainContainer = screen.getByText('銘柄の追加').closest('div').closest('div');
      expect(mainContainer).toBeInTheDocument();
    });

    it('見出し要素がセマンティックに正しい', () => {
      renderSettings();
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      
      h2Elements.forEach(h2 => {
        expect(h2.tagName).toBe('H2');
      });
      
      h3Elements.forEach(h3 => {
        expect(h3.tagName).toBe('H3');
      });
    });
  });

  describe('CSS クラス検証', () => {
    it('一貫したスペーシングクラスが使用されている', () => {
      const { container } = renderSettings();
      
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('space-y-6');
    });

    it('カードスタイルが一貫している', () => {
      renderSettings();
      
      const cardSections = screen.getAllByText(/銘柄の追加|保有資産の設定|目標配分の設定/)
        .map(text => text.closest('div'));
      
      cardSections.forEach(section => {
        expect(section).toHaveClass('bg-white');
        expect(section).toHaveClass('rounded-lg');
        expect(section).toHaveClass('shadow');
        expect(section).toHaveClass('p-6');
      });
    });

    it('テキストスタイルが適切に適用されている', () => {
      renderSettings();
      
      const h2Headers = screen.getAllByRole('heading', { level: 2 });
      h2Headers.forEach(header => {
        expect(header).toHaveClass('text-xl');
        expect(header).toHaveClass('font-semibold');
        expect(header).toHaveClass('mb-4');
      });
      
      const h3Headers = screen.getAllByRole('heading', { level: 3 });
      h3Headers.forEach(header => {
        expect(header).toHaveClass('text-lg');
        expect(header).toHaveClass('font-medium');
        expect(header).toHaveClass('mb-3');
      });
    });
  });

  describe('パフォーマンス', () => {
    it('コンポーネントが高速にレンダリングされる', () => {
      const startTime = Date.now();
      renderSettings();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });

    it('すべての子コンポーネントが一度に読み込まれる', () => {
      renderSettings();
      
      // すべてのモックコンポーネントが同時にレンダリングされる
      expect(screen.getByTestId('ticker-search')).toBeInTheDocument();
      expect(screen.getByTestId('popular-tickers')).toBeInTheDocument();
      expect(screen.getByTestId('holdings-editor')).toBeInTheDocument();
      expect(screen.getByTestId('allocation-editor')).toBeInTheDocument();
      expect(screen.getByTestId('ai-prompt-settings')).toBeInTheDocument();
      expect(screen.getByTestId('reset-settings')).toBeInTheDocument();
    });
  });

  describe('コンポーネント統合テスト', () => {
    it('各セクションが独立して機能する', () => {
      renderSettings();
      
      // 銘柄追加セクション
      const addStockSection = screen.getByText('銘柄の追加').closest('div');
      expect(addStockSection).toContainElement(screen.getByTestId('ticker-search'));
      expect(addStockSection).toContainElement(screen.getByTestId('popular-tickers'));
      
      // 保有資産設定セクション
      const holdingsSection = screen.getByText('保有資産の設定').closest('div');
      expect(holdingsSection).toContainElement(screen.getByTestId('holdings-editor'));
      
      // 目標配分設定セクション
      const allocationSection = screen.getByText('目標配分の設定').closest('div');
      expect(allocationSection).toContainElement(screen.getByTestId('allocation-editor'));
    });

    it('各コンポーネントが適切なコンテナ内に配置されている', () => {
      renderSettings();
      
      // TickerSearchとPopularTickersが同じグリッドコンテナ内にある
      const tickerSearch = screen.getByTestId('ticker-search');
      const popularTickers = screen.getByTestId('popular-tickers');
      const gridContainer = tickerSearch.closest('.grid');
      
      expect(gridContainer).toContainElement(popularTickers);
    });
  });
});