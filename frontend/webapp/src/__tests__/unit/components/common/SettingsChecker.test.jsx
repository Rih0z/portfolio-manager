/**
 * SettingsChecker.jsx のテストファイル
 * 設定チェッカーコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import SettingsChecker from '../../../../components/common/SettingsChecker';
import { PortfolioContext } from '../../../../context/PortfolioContext';
import i18n from '../../../../i18n';

// ナビゲーションのモック
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// LocalStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// テスト用のコンテキスト値を作成するヘルパー関数
const createMockPortfolioContext = (overrides = {}) => ({
  currentAssets: [],
  targetPortfolio: [],
  additionalBudget: { amount: 0, currency: 'JPY' },
  loading: false,
  isInitialized: true,
  error: null,
  ...overrides
});

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children, portfolioContext }) => (
  <BrowserRouter>
    <I18nextProvider i18n={i18n}>
      <PortfolioContext.Provider value={portfolioContext}>
        {children}
      </PortfolioContext.Provider>
    </I18nextProvider>
  </BrowserRouter>
);

describe('SettingsChecker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('基本機能', () => {
    test('子コンポーネントを表示する', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [{ ticker: 'AAPL', quantity: 10 }]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div data-testid="child-component">子コンポーネント</div>
          </SettingsChecker>
        </TestWrapper>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('子コンポーネント')).toBeInTheDocument();
    });
  });

  describe('設定の有無判定', () => {
    test('設定がある場合（アセットがある）はナビゲートしない', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [{ ticker: 'AAPL', quantity: 10 }],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    test('設定がある場合（目標ポートフォリオがある）はナビゲートしない', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [{ ticker: 'AAPL', allocation: 50 }],
        additionalBudget: { amount: 0 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    test('設定がある場合（追加予算がある）はナビゲートしない', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 100000 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    test('設定がない場合、AIアドバイザーに遷移する', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ai-advisor');
      });
    });

    test('初期設定完了フラグがある場合はナビゲートしない', async () => {
      localStorageMock.getItem.mockReturnValue('true');
      
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('initialSetupCompleted');
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('additionalBudgetの判定', () => {
    test('additionalBudgetがnullの場合は設定なしと判定', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: null
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ai-advisor');
      });
    });

    test('additionalBudgetがundefinedの場合は設定なしと判定', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: undefined
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ai-advisor');
      });
    });

    test('additionalBudgetのamountがない場合は設定なしと判定', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { currency: 'JPY' } // amountなし
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      // 非同期処理を考慮して長めに待つ
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ai-advisor');
      }, { timeout: 3000 });
    });
  });

  describe('エラーハンドリング', () => {
    test('エラーが発生してもアプリケーションがクラッシュしない', async () => {
      // console.errorをモック
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // エラーを発生させるコンテキスト（意図的に不正な値）
      const portfolioContext = createMockPortfolioContext();
      
      // navigateでエラーを発生させる
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div data-testid="child-component">子コンポーネント</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('SettingsChecker error:', expect.any(Error));
      });

      // 子コンポーネントは正常に表示される
      expect(screen.getByTestId('child-component')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('LocalStorageアクセスエラーでもアプリケーションが動作する', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // LocalStorageでエラーを発生させる
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div data-testid="child-component">子コンポーネント</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('SettingsChecker error:', expect.any(Error));
      });

      expect(screen.getByTestId('child-component')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('重複チェック防止', () => {
    test('一度チェックが完了したら再チェックしない', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      const { rerender } = render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ai-advisor');
      });

      // navigateをクリア
      mockNavigate.mockClear();

      // 再レンダリング
      rerender(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      // 2回目のチェックは実行されない
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    test('プロパティが変更されても重複チェックしない', async () => {
      const initialContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      const { rerender } = render(
        <TestWrapper portfolioContext={initialContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ai-advisor');
      });

      mockNavigate.mockClear();

      // 異なるコンテキストで再レンダリング
      const updatedContext = createMockPortfolioContext({
        currentAssets: [{ ticker: 'AAPL', quantity: 10 }],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      rerender(
        <TestWrapper portfolioContext={updatedContext}>
          <SettingsChecker>
            <div>アプリケーション</div>
          </SettingsChecker>
        </TestWrapper>
      );

      // 再チェックされない
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('UIの表示', () => {
    test('常に子コンポーネントを表示する', async () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <div data-testid="main-content">メインコンテンツ</div>
            <button>テストボタン</button>
          </SettingsChecker>
        </TestWrapper>
      );

      // ナビゲーションの前でも子コンポーネントは表示される
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByText('メインコンテンツ')).toBeInTheDocument();
      expect(screen.getByText('テストボタン')).toBeInTheDocument();
    });

    test('複数の子コンポーネントを表示する', () => {
      const portfolioContext = createMockPortfolioContext({
        currentAssets: [{ ticker: 'AAPL' }]
      });

      render(
        <TestWrapper portfolioContext={portfolioContext}>
          <SettingsChecker>
            <header>ヘッダー</header>
            <main>メインコンテンツ</main>
            <footer>フッター</footer>
          </SettingsChecker>
        </TestWrapper>
      );

      expect(screen.getByText('ヘッダー')).toBeInTheDocument();
      expect(screen.getByText('メインコンテンツ')).toBeInTheDocument();
      expect(screen.getByText('フッター')).toBeInTheDocument();
    });
  });
});