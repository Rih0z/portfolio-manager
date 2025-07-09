/**
 * DataStatusBarコンポーネントのユニットテスト
 * 
 * テスト対象:
 * - データ状態の表示（最終更新日時、為替レート）
 * - データ鮮度に基づく警告表示
 * - ソース別の色分け（Default, Fallback, その他）
 * - 更新ボタンの動作とローディング状態
 * - 24時間経過判定
 * - エラーケースとエッジケース
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataStatusBar from '../../../../components/layout/DataStatusBar';

// usePortfolioContextをモック
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// formattersをモック
jest.mock('../../../../utils/formatters', () => ({
  formatDate: jest.fn((date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ja-JP');
  })
}));

const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');

describe('DataStatusBar', () => {
  const mockRefreshMarketPrices = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのモック設定
    usePortfolioContext.mockReturnValue({
      lastUpdated: '2025-01-15T10:00:00Z',
      exchangeRate: {
        rate: 150.5,
        source: 'Yahoo Finance'
      },
      baseCurrency: 'JPY',
      refreshMarketPrices: mockRefreshMarketPrices,
      isLoading: false
    });
  });

  describe('基本的なレンダリング', () => {
    test('最終更新日時が正しく表示される', () => {
      render(<DataStatusBar />);
      
      expect(screen.getByText('最終更新:')).toBeInTheDocument();
      expect(screen.getByText('2025/1/15')).toBeInTheDocument();
    });

    test('為替レート情報が正しく表示される', () => {
      render(<DataStatusBar />);
      
      expect(screen.getByText('為替レート (USD/JPY):')).toBeInTheDocument();
      expect(screen.getByText('150.50')).toBeInTheDocument();
      expect(screen.getByText('Yahoo Finance')).toBeInTheDocument();
    });

    test('更新ボタンが表示される', () => {
      render(<DataStatusBar />);
      
      const updateButton = screen.getByRole('button', { name: /更新/ });
      expect(updateButton).toBeInTheDocument();
      expect(updateButton).not.toBeDisabled();
    });

    test('基本的なCSSクラスが適用される', () => {
      const { container } = render(<DataStatusBar />);
      
      const statusBar = container.firstChild;
      expect(statusBar).toHaveClass('text-xs', 'px-4', 'py-2', 'border-t', 'border-b');
    });
  });

  describe('データ鮮度警告', () => {
    test('データが新しい場合（24時間以内）、警告が表示されない', () => {
      const recentDate = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12時間前
      usePortfolioContext.mockReturnValue({
        lastUpdated: recentDate,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      const { container } = render(<DataStatusBar />);
      
      expect(screen.queryByText('データの更新が必要です')).not.toBeInTheDocument();
      
      const statusBar = container.firstChild;
      expect(statusBar).toHaveClass('bg-gray-50');
      expect(statusBar).not.toHaveClass('bg-yellow-50');
    });

    test('データが古い場合（24時間超過）、警告が表示される', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25時間前
      usePortfolioContext.mockReturnValue({
        lastUpdated: oldDate,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      const { container } = render(<DataStatusBar />);
      
      expect(screen.getByText('データの更新が必要です')).toBeInTheDocument();
      
      const statusBar = container.firstChild;
      expect(statusBar).toHaveClass('bg-yellow-50');
      expect(statusBar).not.toHaveClass('bg-gray-50');
    });

    test('最終更新日時がnullの場合、警告が表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: null,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      const { container } = render(<DataStatusBar />);
      
      expect(screen.getByText('未取得')).toBeInTheDocument();
      expect(screen.getByText('データの更新が必要です')).toBeInTheDocument();
      
      const statusBar = container.firstChild;
      expect(statusBar).toHaveClass('bg-yellow-50');
    });

    test('警告アイコンが正しく表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: null,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      const warningDiv = screen.getByText('データの更新が必要です').parentElement;
      expect(warningDiv).toHaveClass('text-yellow-700', 'bg-yellow-100');
      
      const warningIcon = warningDiv.querySelector('svg');
      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveClass('h-4', 'w-4', 'mr-1');
    });
  });

  describe('為替レート表示のバリエーション', () => {
    test('Defaultソースの場合、黄色で表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 150.0, source: 'Default' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      const rateText = screen.getByText('150.00');
      expect(rateText).toHaveClass('text-yellow-600');
      
      const sourceBadge = screen.getByText('Default');
      expect(sourceBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    test('Fallbackソースの場合、オレンジ色で表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 148.5, source: 'Fallback' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      const rateText = screen.getByText('148.50');
      expect(rateText).toHaveClass('text-orange-600');
      
      const sourceBadge = screen.getByText('Fallback');
      expect(sourceBadge).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    test('通常ソースの場合、グレーで表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 152.3, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      const rateText = screen.getByText('152.30');
      expect(rateText).toHaveClass('text-gray-900');
      
      const sourceBadge = screen.getByText('Yahoo Finance');
      expect(sourceBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    test('為替レート情報がない場合、---が表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: null, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      expect(screen.getByText('---')).toBeInTheDocument();
    });

    test('exchangeRateオブジェクト自体がない場合、為替レート情報が表示されない', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: null,
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      expect(screen.queryByText('為替レート (USD/JPY):')).not.toBeInTheDocument();
    });

    test('ソース情報がない場合、ソースバッジが表示されない', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 150.5, source: null },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      expect(screen.getByText('150.50')).toBeInTheDocument();
      
      // ソースバッジは表示されない
      const badges = screen.queryAllByText(/bg-.*-100/);
      expect(badges).toHaveLength(0);
    });
  });

  describe('更新ボタンの動作', () => {
    test('更新ボタンをクリックするとrefreshMarketPricesが呼ばれる', () => {
      render(<DataStatusBar />);
      
      const updateButton = screen.getByRole('button', { name: /更新/ });
      fireEvent.click(updateButton);
      
      expect(mockRefreshMarketPrices).toHaveBeenCalledTimes(1);
    });

    test('ローディング中はボタンが無効化される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: true
      });

      render(<DataStatusBar />);
      
      const updateButton = screen.getByRole('button', { name: /更新中/ });
      expect(updateButton).toBeDisabled();
      expect(updateButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    test('ローディング中はスピナーアイコンが表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: true
      });

      render(<DataStatusBar />);
      
      expect(screen.getByText('更新中...')).toBeInTheDocument();
      
      const spinner = screen.getByText('更新中...').previousSibling;
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin', 'h-4', 'w-4', 'mr-1');
    });

    test('ローディング中でないときは通常の更新アイコンが表示される', () => {
      render(<DataStatusBar />);
      
      expect(screen.getByText('更新')).toBeInTheDocument();
      
      const updateIcon = screen.getByText('更新').previousSibling;
      expect(updateIcon).toBeInTheDocument();
      expect(updateIcon).toHaveClass('h-4', 'w-4', 'mr-1');
      expect(updateIcon).not.toHaveClass('animate-spin');
    });

    test('ローディング中でもクリックイベントは発火しない', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: true
      });

      render(<DataStatusBar />);
      
      const updateButton = screen.getByRole('button', { name: /更新中/ });
      fireEvent.click(updateButton);
      
      expect(mockRefreshMarketPrices).not.toHaveBeenCalled();
    });
  });

  describe('日時フォーマット', () => {
    test('formatDate関数が正しく呼ばれる', () => {
      const { formatDate } = require('../../../../utils/formatters');
      
      render(<DataStatusBar />);
      
      expect(formatDate).toHaveBeenCalledWith('2025-01-15T10:00:00Z');
    });

    test('lastUpdatedがundefinedの場合、formatDateが呼ばれない', () => {
      const { formatDate } = require('../../../../utils/formatters');
      usePortfolioContext.mockReturnValue({
        lastUpdated: undefined,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      expect(screen.getByText('未取得')).toBeInTheDocument();
      expect(formatDate).not.toHaveBeenCalled();
    });
  });

  describe('レスポンシブデザイン', () => {
    test('flex-wrapクラスによりレスポンシブ対応している', () => {
      const { container } = render(<DataStatusBar />);
      
      const flexContainer = container.querySelector('.flex.flex-wrap');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('items-center', 'justify-between');
    });

    test('各アイテムにmy-1クラスが適用されている', () => {
      const { container } = render(<DataStatusBar />);
      
      const leftItems = container.querySelector('.flex.items-center.space-x-2.my-1');
      const rightItems = container.querySelectorAll('.my-1')[1];
      
      expect(leftItems).toBeInTheDocument();
      expect(rightItems).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    test('ボタンがrole="button"として認識される', () => {
      render(<DataStatusBar />);
      
      const updateButton = screen.getByRole('button');
      expect(updateButton).toBeInTheDocument();
    });

    test('SVGアイコンが適切に配置されている', () => {
      render(<DataStatusBar />);
      
      const updateIcon = screen.getByText('更新').previousSibling;
      expect(updateIcon.tagName).toBe('svg');
      expect(updateIcon).toHaveAttribute('fill', 'currentColor');
      expect(updateIcon).toHaveAttribute('viewBox', '0 0 20 20');
    });

    test('警告アイコンが適切に設定されている', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: null,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      const warningIcon = screen.getByText('データの更新が必要です').previousSibling;
      expect(warningIcon.tagName).toBe('svg');
      expect(warningIcon).toHaveAttribute('fill', 'currentColor');
      expect(warningIcon).toHaveAttribute('viewBox', '0 0 20 20');
    });
  });

  describe('エッジケース', () => {
    test('全ての値がnull/undefinedでもエラーにならない', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: null,
        exchangeRate: null,
        baseCurrency: null,
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      expect(() => {
        render(<DataStatusBar />);
      }).not.toThrow();
      
      expect(screen.getByText('未取得')).toBeInTheDocument();
      expect(screen.queryByText('為替レート (USD/JPY):')).not.toBeInTheDocument();
    });

    test('refreshMarketPricesがnullでもレンダリングできる', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: null,
        isLoading: false
      });

      expect(() => {
        render(<DataStatusBar />);
      }).not.toThrow();
    });

    test('為替レートが0の場合も正しく表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 0, source: 'Test' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    test('非常に大きな為替レートも正しく表示される', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 999999.99, source: 'Test' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      render(<DataStatusBar />);
      
      expect(screen.getByText('999999.99')).toBeInTheDocument();
    });

    test('空文字列のソースでもエラーにならない', () => {
      usePortfolioContext.mockReturnValue({
        lastUpdated: '2025-01-15T10:00:00Z',
        exchangeRate: { rate: 150.5, source: '' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      expect(() => {
        render(<DataStatusBar />);
      }).not.toThrow();
      
      expect(screen.getByText('150.50')).toBeInTheDocument();
    });
  });

  describe('境界値テスト', () => {
    test('ちょうど24時間前のデータ（境界値）', () => {
      const exactlyOneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      usePortfolioContext.mockReturnValue({
        lastUpdated: exactlyOneDayAgo,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      const { container } = render(<DataStatusBar />);
      
      // 24時間ちょうどの場合は更新不要（24時間「超過」で更新が必要）
      expect(screen.queryByText('データの更新が必要です')).not.toBeInTheDocument();
      
      const statusBar = container.firstChild;
      expect(statusBar).toHaveClass('bg-gray-50');
    });

    test('24時間1秒前のデータ（境界値）', () => {
      const justUnderOneDay = new Date(Date.now() - (24 * 60 * 60 * 1000 - 1000)).toISOString();
      usePortfolioContext.mockReturnValue({
        lastUpdated: justUnderOneDay,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      const { container } = render(<DataStatusBar />);
      
      expect(screen.queryByText('データの更新が必要です')).not.toBeInTheDocument();
      
      const statusBar = container.firstChild;
      expect(statusBar).toHaveClass('bg-gray-50');
    });

    test('24時間1秒後のデータ（境界値）', () => {
      const justOverOneDay = new Date(Date.now() - (24 * 60 * 60 * 1000 + 1000)).toISOString();
      usePortfolioContext.mockReturnValue({
        lastUpdated: justOverOneDay,
        exchangeRate: { rate: 150.5, source: 'Yahoo Finance' },
        baseCurrency: 'JPY',
        refreshMarketPrices: mockRefreshMarketPrices,
        isLoading: false
      });

      const { container } = render(<DataStatusBar />);
      
      expect(screen.getByText('データの更新が必要です')).toBeInTheDocument();
      
      const statusBar = container.firstChild;
      expect(statusBar).toHaveClass('bg-yellow-50');
    });
  });
});