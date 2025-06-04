/**
 * Settings.jsx のユニットテスト
 * 設定ページコンポーネントのテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../../../pages/Settings';

// 設定コンポーネントをモック
jest.mock('../../../components/settings/TickerSearch', () => {
  return function TickerSearch() {
    return <div data-testid="ticker-search">Ticker Search</div>;
  };
});

jest.mock('../../../components/settings/PopularTickers', () => {
  return function PopularTickers() {
    return <div data-testid="popular-tickers">Popular Tickers</div>;
  };
});

jest.mock('../../../components/settings/HoldingsEditor', () => {
  return function HoldingsEditor() {
    return <div data-testid="holdings-editor">Holdings Editor</div>;
  };
});

jest.mock('../../../components/settings/AllocationEditor', () => {
  return function AllocationEditor() {
    return <div data-testid="allocation-editor">Allocation Editor</div>;
  };
});

jest.mock('../../../components/settings/AiPromptSettings', () => {
  return function AiPromptSettings() {
    return <div data-testid="ai-prompt-settings">AI Prompt Settings</div>;
  };
});

describe('Settings', () => {
  describe('基本レンダリング', () => {
    it('すべての設定コンポーネントを表示する', () => {
      render(<Settings />);
      
      // 銘柄検索とポピュラー銘柄セクション
      expect(screen.getByTestId('ticker-search')).toBeInTheDocument();
      expect(screen.getByTestId('popular-tickers')).toBeInTheDocument();
      
      // 保有資産設定セクション
      expect(screen.getByTestId('holdings-editor')).toBeInTheDocument();
      
      // 目標配分設定セクション
      expect(screen.getByTestId('allocation-editor')).toBeInTheDocument();
      
      // AI分析プロンプト設定
      expect(screen.getByTestId('ai-prompt-settings')).toBeInTheDocument();
    });

    it('正しいセクションタイトルを表示する', () => {
      render(<Settings />);
      
      expect(screen.getByText('銘柄の追加')).toBeInTheDocument();
      expect(screen.getByText('保有資産の設定')).toBeInTheDocument();
      expect(screen.getByText('目標配分の設定')).toBeInTheDocument();
    });

    it('サブセクションタイトルを表示する', () => {
      render(<Settings />);
      
      expect(screen.getByText('銘柄を検索して追加')).toBeInTheDocument();
      expect(screen.getByText('人気銘柄を追加')).toBeInTheDocument();
    });
  });

  describe('レイアウトとスタイリング', () => {
    it('正しいレイアウトクラスが適用されている', () => {
      render(<Settings />);
      
      // メインコンテナの空間設定
      const mainContainer = document.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
    });

    it('白背景のカードレイアウトが適用されている', () => {
      render(<Settings />);
      
      // 白背景とシャドウのカード
      const whiteCards = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      expect(whiteCards.length).toBe(3); // 3つのメインセクション
    });

    it('グリッドレイアウトが正しく適用されている', () => {
      render(<Settings />);
      
      // 銘柄追加セクションのグリッドレイアウト
      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.gap-6');
      expect(gridContainer).toBeInTheDocument();
    });

    it('パディングクラスが正しく適用されている', () => {
      render(<Settings />);
      
      // パディングを持つカードコンテナ
      const paddedContainers = document.querySelectorAll('.p-6');
      expect(paddedContainers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイル対応のグリッドクラスが適用されている', () => {
      render(<Settings />);
      
      // モバイルでは1列、デスクトップでは2列のグリッド
      const responsiveGrid = document.querySelector('.grid-cols-1.md\\:grid-cols-2');
      expect(responsiveGrid).toBeInTheDocument();
    });

    it('レスポンシブなテキストサイズクラスが適用されている', () => {
      render(<Settings />);
      
      // h2とh3タイトルのクラス
      const h2Title = screen.getByText('銘柄の追加').closest('h2');
      const h3Title = screen.getByText('銘柄を検索して追加').closest('h3');
      
      expect(h2Title).toHaveClass('text-xl', 'font-semibold');
      expect(h3Title).toHaveClass('text-lg', 'font-medium');
    });
  });

  describe('コンポーネント配置', () => {
    it('銘柄追加セクションが正しく配置されている', () => {
      render(<Settings />);
      
      const tickerSection = screen.getByText('銘柄の追加').closest('div');
      expect(tickerSection).toContainElement(screen.getByTestId('ticker-search'));
      expect(tickerSection).toContainElement(screen.getByTestId('popular-tickers'));
    });

    it('保有資産設定セクションが正しく配置されている', () => {
      render(<Settings />);
      
      const holdingsSection = screen.getByText('保有資産の設定').closest('div');
      expect(holdingsSection).toContainElement(screen.getByTestId('holdings-editor'));
    });

    it('目標配分設定セクションが正しく配置されている', () => {
      render(<Settings />);
      
      const allocationSection = screen.getByText('目標配分の設定').closest('div');
      expect(allocationSection).toContainElement(screen.getByTestId('allocation-editor'));
    });

    it('AI分析プロンプト設定が独立して配置されている', () => {
      render(<Settings />);
      
      const aiPromptSettings = screen.getByTestId('ai-prompt-settings');
      expect(aiPromptSettings).toBeInTheDocument();
    });
  });

  describe('セマンティック構造', () => {
    it('適切な見出し階層を持つ', () => {
      render(<Settings />);
      
      // h2とh3の見出しが存在する
      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      const h3Headings = screen.getAllByRole('heading', { level: 3 });
      
      expect(h2Headings.length).toBe(3); // 3つのメインセクション
      expect(h3Headings.length).toBe(2); // 銘柄追加サブセクション
    });

    it('見出しに適切なテキストが設定されている', () => {
      render(<Settings />);
      
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
      render(<Settings />);
      const endTime = performance.now();
      
      // レンダリング時間が100ms以下であることを確認
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('統合テスト', () => {
    it('完全な設定ページレイアウトが正常に動作する', () => {
      render(<Settings />);
      
      // 1. メインセクションの存在確認
      expect(screen.getByText('銘柄の追加')).toBeInTheDocument();
      expect(screen.getByText('保有資産の設定')).toBeInTheDocument();
      expect(screen.getByText('目標配分の設定')).toBeInTheDocument();
      
      // 2. 全コンポーネントの存在確認
      expect(screen.getByTestId('ticker-search')).toBeInTheDocument();
      expect(screen.getByTestId('popular-tickers')).toBeInTheDocument();
      expect(screen.getByTestId('holdings-editor')).toBeInTheDocument();
      expect(screen.getByTestId('allocation-editor')).toBeInTheDocument();
      expect(screen.getByTestId('ai-prompt-settings')).toBeInTheDocument();
      
      // 3. レイアウト構造の確認
      const mainContainer = document.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
      
      // 4. カードレイアウトの確認
      const whiteCards = document.querySelectorAll('.bg-white.rounded-lg.shadow.p-6');
      expect(whiteCards.length).toBe(3);
    });
  });
});