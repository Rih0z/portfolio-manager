/**
 * TabNavigation.jsx のテストファイル
 * タブナビゲーションコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TabNavigation from '../../../../components/layout/TabNavigation';
import { PortfolioContext } from '../../../../context/PortfolioContext';

// react-i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'navigation.dashboard': 'ダッシュボード',
        'navigation.aiPlan': 'AI投資戦略',
        'navigation.settings': '設定',
        'navigation.dataImport': 'データ'
      };
      return translations[key] || key;
    }
  })
}));

// react-router-domのNavLinkをモック
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  NavLink: ({ children, to, className, ...props }) => {
    const isActive = to === '/'; // デフォルトでホームを active にする
    const computedClassName = typeof className === 'function' ? className({ isActive }) : className;
    return (
      <div data-testid={`navlink-${to}`} className={computedClassName} {...props}>
        {typeof children === 'function' ? children({ isActive }) : children}
      </div>
    );
  }
}));

describe('TabNavigation', () => {
  const defaultPortfolioContext = {
    currentAssets: [{ ticker: 'AAPL', amount: 100 }],
    targetPortfolio: [{ ticker: 'MSFT', allocation: 50 }],
    additionalBudget: { amount: 1000, currency: 'USD' }
  };

  const emptyPortfolioContext = {
    currentAssets: [],
    targetPortfolio: [],
    additionalBudget: null
  };

  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithContext = (portfolioContext = defaultPortfolioContext) => {
    return render(
      <BrowserRouter>
        <PortfolioContext.Provider value={portfolioContext}>
          <TabNavigation />
        </PortfolioContext.Provider>
      </BrowserRouter>
    );
  };

  describe('基本レンダリング（通常状態）', () => {
    test('4つのタブが表示される', () => {
      renderWithContext();
      
      expect(screen.getByTestId('navlink-/')).toBeInTheDocument();
      expect(screen.getByTestId('navlink-/ai-advisor')).toBeInTheDocument();
      expect(screen.getByTestId('navlink-/settings')).toBeInTheDocument();
      expect(screen.getByTestId('navlink-/data-import')).toBeInTheDocument();
    });

    test('各タブのラベルが正しく表示される', () => {
      renderWithContext();
      
      expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText('AI投資戦略')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();
      expect(screen.getByText('データ')).toBeInTheDocument();
    });

    test('各タブにアイコンが表示される', () => {
      const { container } = renderWithContext();
      
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements).toHaveLength(4);
      
      // 各SVGが正しいviewBoxを持つことを確認
      svgElements.forEach(svg => {
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
        expect(svg).toHaveClass('w-6', 'h-6');
      });
    });

    test('ナビゲーションが固定位置に配置される', () => {
      const { container } = renderWithContext();
      
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass(
        'fixed',
        'bottom-0', 
        'left-0',
        'right-0',
        'bg-dark-200/95',
        'backdrop-blur-xl',
        'border-t',
        'border-dark-400',
        'z-50'
      );
    });

    test('4列グリッドレイアウトが適用される', () => {
      const { container } = renderWithContext();
      
      const gridContainer = container.querySelector('.grid-cols-4');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('h-16', 'sm:h-18', 'max-w-sm', 'sm:max-w-lg', 'mx-auto');
    });
  });

  describe('初期設定未完了状態', () => {
    test('設定が空で初期設定未完了の場合、AI投資戦略タブのみ表示される', () => {
      renderWithContext(emptyPortfolioContext);
      
      // AI投資戦略タブのみが表示される
      expect(screen.getByTestId('navlink-/ai-advisor')).toBeInTheDocument();
      expect(screen.getByText('AI投資戦略')).toBeInTheDocument();
      
      // 他のタブは表示されない
      expect(screen.queryByTestId('navlink-/')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navlink-/settings')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navlink-/data-import')).not.toBeInTheDocument();
    });

    test('初期設定未完了状態で中央配置レイアウトが適用される', () => {
      const { container } = renderWithContext(emptyPortfolioContext);
      
      const centerContainer = container.querySelector('.justify-center');
      expect(centerContainer).toBeInTheDocument();
      expect(centerContainer).toHaveClass('max-w-sm', 'sm:max-w-lg', 'mx-auto');
    });

    test('初期設定未完了状態でもiPhone home indicator spaceが表示される', () => {
      const { container } = renderWithContext(emptyPortfolioContext);
      
      const homeIndicator = container.querySelector('.h-safe-bottom');
      expect(homeIndicator).toBeInTheDocument();
      expect(homeIndicator).toHaveClass('bg-dark-200/95');
    });
  });

  describe('初期設定完了後の状態', () => {
    test('初期設定完了フラグがある場合、設定が空でも全タブが表示される', () => {
      localStorage.setItem('initialSetupCompleted', 'true');
      renderWithContext(emptyPortfolioContext);
      
      expect(screen.getByTestId('navlink-/')).toBeInTheDocument();
      expect(screen.getByTestId('navlink-/ai-advisor')).toBeInTheDocument();
      expect(screen.getByTestId('navlink-/settings')).toBeInTheDocument();
      expect(screen.getByTestId('navlink-/data-import')).toBeInTheDocument();
    });
  });

  describe('アクティブ状態の表示', () => {
    test('アクティブなタブに適切なスタイルが適用される', () => {
      const { container } = renderWithContext();
      
      // ダッシュボードタブがアクティブ（モックで'/'をアクティブに設定）
      const activeTab = screen.getByTestId('navlink-/');
      expect(activeTab).toHaveClass('text-primary-400');
      
      // アクティブインジケーターが表示される
      const activeIndicator = container.querySelector('.bg-primary-400.rounded-full');
      expect(activeIndicator).toBeInTheDocument();
      expect(activeIndicator).toHaveClass('w-8', 'sm:w-10', 'h-1');
    });

    test('非アクティブなタブに適切なスタイルが適用される', () => {
      renderWithContext();
      
      const inactiveTab = screen.getByTestId('navlink-/settings');
      expect(inactiveTab).toHaveClass('text-gray-400');
      expect(inactiveTab).toHaveClass('hover:text-gray-300');
    });

    test('アクティブなタブのアイコンに特別なスタイルが適用される', () => {
      const { container } = renderWithContext();
      
      // アクティブタブ内のアイコンコンテナを確認
      const activeTab = screen.getByTestId('navlink-/');
      const iconContainer = activeTab.querySelector('.scale-110');
      expect(iconContainer).toBeInTheDocument();
      
      const iconBackground = activeTab.querySelector('.bg-primary-500\\/10');
      expect(iconBackground).toBeInTheDocument();
    });

    test('アクティブなタブのラベルに特別なスタイルが適用される', () => {
      renderWithContext();
      
      const activeTab = screen.getByTestId('navlink-/');
      const label = activeTab.querySelector('.text-primary-400.font-semibold');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('ダッシュボード');
    });
  });

  describe('設定データに基づく状態判定', () => {
    test('currentAssetsがある場合は通常状態', () => {
      const contextWithAssets = {
        currentAssets: [{ ticker: 'AAPL' }],
        targetPortfolio: [],
        additionalBudget: null
      };
      
      renderWithContext(contextWithAssets);
      
      expect(screen.getByTestId('navlink-/')).toBeInTheDocument();
      expect(screen.getAllByTestId(/navlink-/)).toHaveLength(4);
    });

    test('targetPortfolioがある場合は通常状態', () => {
      const contextWithTarget = {
        currentAssets: [],
        targetPortfolio: [{ ticker: 'MSFT' }],
        additionalBudget: null
      };
      
      renderWithContext(contextWithTarget);
      
      expect(screen.getByTestId('navlink-/')).toBeInTheDocument();
      expect(screen.getAllByTestId(/navlink-/)).toHaveLength(4);
    });

    test('additionalBudgetがある場合は通常状態', () => {
      const contextWithBudget = {
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 1000 }
      };
      
      renderWithContext(contextWithBudget);
      
      expect(screen.getByTestId('navlink-/')).toBeInTheDocument();
      expect(screen.getAllByTestId(/navlink-/)).toHaveLength(4);
    });

    test('additionalBudgetのamountが0の場合は設定なし状態', () => {
      const contextWithZeroBudget = {
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      };
      
      renderWithContext(contextWithZeroBudget);
      
      expect(screen.queryByTestId('navlink-/')).not.toBeInTheDocument();
      expect(screen.getByTestId('navlink-/ai-advisor')).toBeInTheDocument();
      expect(screen.getAllByTestId(/navlink-/)).toHaveLength(1);
    });
  });

  describe('レスポンシブデザイン', () => {
    test('レスポンシブなタブの高さクラスが適用される', () => {
      const { container } = renderWithContext();
      
      const tabContainer = container.querySelector('.h-16.sm\\:h-18');
      expect(tabContainer).toBeInTheDocument();
    });

    test('レスポンシブなアイコンサイズクラスが適用される', () => {
      const { container } = renderWithContext();
      
      const iconContainers = container.querySelectorAll('.w-6.h-6.sm\\:w-7.sm\\:h-7');
      expect(iconContainers.length).toBeGreaterThan(0);
    });

    test('レスポンシブなテキストサイズクラスが適用される', () => {
      const { container } = renderWithContext();
      
      const labels = container.querySelectorAll('.text-xs.sm\\:text-sm');
      expect(labels.length).toBeGreaterThan(0);
    });

    test('レスポンシブなインジケーター幅クラスが適用される', () => {
      const { container } = renderWithContext();
      
      const indicator = container.querySelector('.w-8.sm\\:w-10');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('アクセシビリティとインタラクション', () => {
    test('各タブに適切なNavLinkプロパティが設定される', () => {
      renderWithContext();
      
      const dashboardTab = screen.getByTestId('navlink-/');
      const aiTab = screen.getByTestId('navlink-/ai-advisor');
      const settingsTab = screen.getByTestId('navlink-/settings');
      const dataTab = screen.getByTestId('navlink-/data-import');
      
      expect(dashboardTab).toBeInTheDocument();
      expect(aiTab).toBeInTheDocument();
      expect(settingsTab).toBeInTheDocument();
      expect(dataTab).toBeInTheDocument();
    });

    test('トランジション関連のクラスが適用される', () => {
      const { container } = renderWithContext();
      
      const transitionElements = container.querySelectorAll('.transition-all.duration-200');
      expect(transitionElements.length).toBeGreaterThan(0);
    });

    test('ホバー効果のクラスが適用される', () => {
      renderWithContext();
      
      const inactiveTab = screen.getByTestId('navlink-/settings');
      expect(inactiveTab).toHaveClass('hover:text-gray-300');
    });

    test('アクティブ状態の効果クラスが適用される', () => {
      renderWithContext();
      
      const inactiveTab = screen.getByTestId('navlink-/settings');
      expect(inactiveTab).toHaveClass('active:text-gray-200');
    });
  });

  describe('アイコンの詳細検証', () => {
    test('ダッシュボードアイコンが正しいpathを持つ', () => {
      const { container } = renderWithContext();
      
      const dashboardTab = screen.getByTestId('navlink-/');
      const svg = dashboardTab.querySelector('svg');
      const path = svg.querySelector('path');
      
      expect(path).toHaveAttribute('strokeLinecap', 'round');
      expect(path).toHaveAttribute('strokeLinejoin', 'round');
      expect(path).toHaveAttribute('strokeWidth', '2');
    });

    test('AI投資戦略アイコンが正しいpathを持つ', () => {
      const { container } = renderWithContext();
      
      const aiTab = screen.getByTestId('navlink-/ai-advisor');
      const svg = aiTab.querySelector('svg');
      const path = svg.querySelector('path');
      
      expect(path).toHaveAttribute('strokeLinecap', 'round');
      expect(path).toHaveAttribute('strokeLinejoin', 'round');
      expect(path).toHaveAttribute('strokeWidth', '2');
    });

    test('設定アイコンが複数のpathを持つ', () => {
      const { container } = renderWithContext();
      
      const settingsTab = screen.getByTestId('navlink-/settings');
      const svg = settingsTab.querySelector('svg');
      const paths = svg.querySelectorAll('path');
      
      expect(paths).toHaveLength(2); // 設定アイコンは2つのpathを持つ
    });
  });

  describe('エラーハンドリング', () => {
    test('PortfolioContextが不正な値でもエラーが発生しない', () => {
      const invalidContext = {
        currentAssets: null,
        targetPortfolio: undefined,
        additionalBudget: 'invalid'
      };
      
      expect(() => {
        renderWithContext(invalidContext);
      }).not.toThrow();
    });

    test('localStorageアクセスエラーでも動作する', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => {
        renderWithContext(emptyPortfolioContext);
      }).not.toThrow();
      
      localStorage.getItem = originalGetItem;
    });

    test('翻訳関数がキーを返してもエラーが発生しない', () => {
      jest.doMock('react-i18next', () => ({
        useTranslation: () => ({
          t: (key) => key // キーをそのまま返す
        })
      }));
      
      expect(() => {
        renderWithContext();
      }).not.toThrow();
    });
  });

  describe('iPhone home indicator space', () => {
    test('iPhone home indicator spaceが表示される', () => {
      const { container } = renderWithContext();
      
      const homeIndicator = container.querySelector('.h-safe-bottom');
      expect(homeIndicator).toBeInTheDocument();
      expect(homeIndicator).toHaveClass('bg-dark-200/95');
    });

    test('初期設定未完了状態でもhome indicator spaceが表示される', () => {
      const { container } = renderWithContext(emptyPortfolioContext);
      
      const homeIndicator = container.querySelector('.h-safe-bottom');
      expect(homeIndicator).toBeInTheDocument();
    });
  });
});