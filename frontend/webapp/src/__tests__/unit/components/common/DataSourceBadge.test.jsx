/**
 * DataSourceBadgeコンポーネントのユニットテスト
 * 
 * テスト対象:
 * - 全データソースの正しい表示
 * - 色分けとアイコンの確認
 * - showIconプロパティの動作
 * - 表示テキストの短縮機能
 * - 不明なソースのフォールバック
 * - titleアトリビュートの設定
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataSourceBadge from '../../../../components/common/DataSourceBadge';

describe('DataSourceBadge', () => {
  describe('基本的なレンダリング', () => {
    test('Alpacaソースが正しく表示される', () => {
      render(<DataSourceBadge source="Alpaca" />);
      
      const badge = screen.getByText('Alpaca');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(badge).toHaveAttribute('title', 'Alpaca APIから取得した米国株データ');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('📊');
    });

    test('Yahoo Financeソースが正しく表示される（短縮形）', () => {
      render(<DataSourceBadge source="Yahoo Finance" />);
      
      const badge = screen.getByText('YFinance');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
      expect(badge).toHaveAttribute('title', 'Yahoo Finance APIから取得した株価・投資信託データ');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('📈');
    });

    test('exchangerate.hostソースが正しく表示される（短縮形）', () => {
      render(<DataSourceBadge source="exchangerate.host" />);
      
      const badge = screen.getByText('Exchg.host');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-indigo-100', 'text-indigo-800');
      expect(badge).toHaveAttribute('title', 'exchangerate.hostから取得した為替レートデータ');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('💱');
    });

    test('Fallbackソースが正しく表示される', () => {
      render(<DataSourceBadge source="Fallback" />);
      
      const badge = screen.getByText('Fallback');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      expect(badge).toHaveAttribute('title', 'デフォルト値を使用中（最新データの取得に失敗）');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('⚠️');
    });

    test('Default Valuesソースが正しく表示される', () => {
      render(<DataSourceBadge source="Default Values" />);
      
      const badge = screen.getByText('Default Values');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      expect(badge).toHaveAttribute('title', 'デフォルト値を使用中');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('⚠️');
    });

    test('Cacheソースが正しく表示される', () => {
      render(<DataSourceBadge source="Cache" />);
      
      const badge = screen.getByText('Cache');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-800');
      expect(badge).toHaveAttribute('title', 'キャッシュデータを使用中');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('💾');
    });

    test('Alpha Vantageソース（互換性対応）が正しく表示される', () => {
      render(<DataSourceBadge source="Alpha Vantage" />);
      
      const badge = screen.getByText('Alpha Vantage');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
      expect(badge).toHaveAttribute('title', '旧API (Alpha Vantage) からのデータ');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('🔄');
    });

    test('Python yfinanceソース（互換性対応）が正しく表示される', () => {
      render(<DataSourceBadge source="Python yfinance" />);
      
      const badge = screen.getByText('Python yfinance');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
      expect(badge).toHaveAttribute('title', '旧API (Python yfinance) からのデータ');
      
      // アイコンの確認
      expect(badge).toHaveTextContent('🔄');
    });
  });

  describe('不明なソースのフォールバック', () => {
    test('不明なソースはデフォルトスタイルで表示される', () => {
      render(<DataSourceBadge source="Unknown Source" />);
      
      const badge = screen.getByText('Unknown Source');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
      expect(badge).toHaveAttribute('title', '不明なデータソース');
      
      // デフォルトアイコンの確認
      expect(badge).toHaveTextContent('ℹ️');
    });

    test('空文字列のソースはデフォルトスタイルで表示される', () => {
      render(<DataSourceBadge source="" />);
      
      const badge = screen.getByText('');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
      expect(badge).toHaveAttribute('title', '不明なデータソース');
    });

    test('undefinedのソースはデフォルトスタイルで表示される', () => {
      render(<DataSourceBadge source={undefined} />);
      
      const badge = screen.getByRole('generic'); // spanタグ
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
      expect(badge).toHaveAttribute('title', '不明なデータソース');
    });
  });

  describe('showIconプロパティ', () => {
    test('showIcon=true（デフォルト）でアイコンが表示される', () => {
      render(<DataSourceBadge source="Alpaca" />);
      
      const badge = screen.getByText((content, element) => {
        return element.textContent === '📊Alpaca';
      });
      expect(badge).toBeInTheDocument();
    });

    test('showIcon=falseでアイコンが表示されない', () => {
      render(<DataSourceBadge source="Alpaca" showIcon={false} />);
      
      const badge = screen.getByText('Alpaca');
      expect(badge).toBeInTheDocument();
      expect(badge).not.toHaveTextContent('📊');
    });

    test('showIcon=falseでYahoo Financeの短縮形のみ表示', () => {
      render(<DataSourceBadge source="Yahoo Finance" showIcon={false} />);
      
      const badge = screen.getByText('YFinance');
      expect(badge).toBeInTheDocument();
      expect(badge).not.toHaveTextContent('📈');
    });

    test('showIcon=falseでexchangerate.hostの短縮形のみ表示', () => {
      render(<DataSourceBadge source="exchangerate.host" showIcon={false} />);
      
      const badge = screen.getByText('Exchg.host');
      expect(badge).toBeInTheDocument();
      expect(badge).not.toHaveTextContent('💱');
    });
  });

  describe('CSSクラスとスタイリング', () => {
    test('基本的なCSSクラスが正しく適用される', () => {
      render(<DataSourceBadge source="Alpaca" />);
      
      const badge = screen.getByText((content, element) => {
        return element.textContent === '📊Alpaca';
      });
      
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'px-2.5',
        'py-0.5',
        'rounded-full',
        'text-xs',
        'font-medium'
      );
    });

    test('全てのソースで必須CSSクラスが適用される', () => {
      const sources = [
        'Alpaca',
        'Yahoo Finance',
        'exchangerate.host',
        'Fallback',
        'Default Values',
        'Cache',
        'Alpha Vantage',
        'Python yfinance'
      ];

      sources.forEach(source => {
        const { unmount } = render(<DataSourceBadge source={source} />);
        
        const badge = screen.getByRole('generic');
        expect(badge).toHaveClass(
          'inline-flex',
          'items-center',
          'px-2.5',
          'py-0.5',
          'rounded-full',
          'text-xs',
          'font-medium'
        );
        
        unmount();
      });
    });
  });

  describe('表示テキスト短縮機能', () => {
    test('Yahoo Financeが"YFinance"に短縮される', () => {
      render(<DataSourceBadge source="Yahoo Finance" />);
      
      expect(screen.getByText('YFinance')).toBeInTheDocument();
      expect(screen.queryByText('Yahoo Finance')).not.toBeInTheDocument();
    });

    test('exchangerate.hostが"Exchg.host"に短縮される', () => {
      render(<DataSourceBadge source="exchangerate.host" />);
      
      expect(screen.getByText('Exchg.host')).toBeInTheDocument();
      expect(screen.queryByText('exchangerate.host')).not.toBeInTheDocument();
    });

    test('その他のソースは短縮されない', () => {
      const unshortened = ['Alpaca', 'Cache', 'Fallback', 'Default Values'];
      
      unshortened.forEach(source => {
        const { unmount } = render(<DataSourceBadge source={source} />);
        expect(screen.getByText(source)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('アクセシビリティ', () => {
    test('titleアトリビュートが設定される', () => {
      render(<DataSourceBadge source="Alpaca" />);
      
      const badge = screen.getByRole('generic');
      expect(badge).toHaveAttribute('title', 'Alpaca APIから取得した米国株データ');
    });

    test('全てのソースでtitleアトリビュートが設定される', () => {
      const sourcesWithTitles = {
        'Alpaca': 'Alpaca APIから取得した米国株データ',
        'Yahoo Finance': 'Yahoo Finance APIから取得した株価・投資信託データ',
        'exchangerate.host': 'exchangerate.hostから取得した為替レートデータ',
        'Fallback': 'デフォルト値を使用中（最新データの取得に失敗）',
        'Default Values': 'デフォルト値を使用中',
        'Cache': 'キャッシュデータを使用中',
        'Alpha Vantage': '旧API (Alpha Vantage) からのデータ',
        'Python yfinance': '旧API (Python yfinance) からのデータ'
      };

      Object.entries(sourcesWithTitles).forEach(([source, expectedTitle]) => {
        const { unmount } = render(<DataSourceBadge source={source} />);
        
        const badge = screen.getByRole('generic');
        expect(badge).toHaveAttribute('title', expectedTitle);
        
        unmount();
      });
    });
  });

  describe('エッジケース', () => {
    test('nullのソースでエラーにならない', () => {
      expect(() => {
        render(<DataSourceBadge source={null} />);
      }).not.toThrow();
    });

    test('数値のソースでもレンダリングされる', () => {
      render(<DataSourceBadge source={123} />);
      
      const badge = screen.getByText('123');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    test('showIconがundefinedでもエラーにならない', () => {
      expect(() => {
        render(<DataSourceBadge source="Alpaca" showIcon={undefined} />);
      }).not.toThrow();
    });
  });
});