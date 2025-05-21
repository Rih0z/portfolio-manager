/**
 * ファイルパス: __test__/unit/store/dataStore.test.js
 * 
 * データストアの単体テスト
 * ポートフォリオデータ管理、資産情報更新、目標配分設定、シミュレーション機能のテスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import { PortfolioProvider, PortfolioContext } from '@/context/PortfolioContext';
import { usePortfolioContext } from '@/hooks/usePortfolioContext';

// テスト用ライブラリ
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import React, { useContext, useEffect } from 'react';

// モックデータ
import { mockPortfolioContextData, mockExchangeRate } from '../../mocks/data';

// 市場データサービスのモック
jest.mock('@/services/marketDataService', () => ({
  fetchExchangeRate: jest.fn().mockResolvedValue({
    success: true,
    data: {
      base: 'USD',
      target: 'JPY',
      rate: 150.0,
      source: 'Market Data API',
      lastUpdated: '2025-05-12T14:23:45.678Z'
    }
  }),
  fetchMultipleStocks: jest.fn().mockResolvedValue({
    success: true,
    data: {
      'AAPL': {
        ticker: 'AAPL',
        price: 174.79,
        name: 'Apple Inc.',
        currency: 'USD',
        source: 'Market Data API',
        lastUpdated: '2025-05-12T14:23:45.678Z'
      },
      '7203.T': {
        ticker: '7203.T',
        price: 2100,
        name: 'トヨタ自動車',
        currency: 'JPY',
        source: 'Market Data API',
        lastUpdated: '2025-05-12T14:23:45.678Z'
      }
    },
    sourcesSummary: 'Market Data API: 2件'
  })
}));

// ローカルストレージのモック
const mockLocalStorage = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// テスト用のポートフォリオコンテキストを消費するコンポーネント
const PortfolioConsumer = () => {
  const {
    baseCurrency,
    exchangeRate,
    currentAssets,
    targetPortfolio,
    additionalBudget,
    updateBaseCurrency,
    updateCurrentAssets,
    updateTargetPortfolio,
    updateBudget,
    refreshMarketData,
    getTotalAssets,
    getAnnualFees,
    getSimulationResults
  } = useContext(PortfolioContext);
  
  const totalAssets = getTotalAssets();
  const annualFees = getAnnualFees();
  const simulationResults = getSimulationResults();
  
  return (
    <div>
      <div data-testid="base-currency">{baseCurrency}</div>
      <div data-testid="exchange-rate">{exchangeRate ? exchangeRate.rate : 'N/A'}</div>
      <div data-testid="assets-count">{currentAssets.length}</div>
      <div data-testid="target-count">{targetPortfolio.length}</div>
      <div data-testid="total-assets">{totalAssets}</div>
      <div data-testid="annual-fees">{annualFees}</div>
      <div data-testid="simulation-count">{simulationResults.length}</div>
      
      <button
        onClick={() => updateBaseCurrency(baseCurrency === 'JPY' ? 'USD' : 'JPY')}
        data-testid="toggle-currency"
      >
        通貨切替
      </button>
      
      <button
        onClick={() => refreshMarketData()}
        data-testid="refresh-data"
      >
        データ更新
      </button>
      
      <button
        onClick={() => updateBudget({ amount: 100000, currency: 'JPY' })}
        data-testid="set-budget"
      >
        予算設定
      </button>
      
      <button
        onClick={() => {
          const newAsset = {
            id: 'new-asset',
            ticker: 'GOOG',
            name: 'Alphabet Inc.',
            price: 2800,
            currency: 'USD',
            holdings: 1,
            isStock: true,
            isMutualFund: false
          };
          updateCurrentAssets([...currentAssets, newAsset]);
        }}
        data-testid="add-asset"
      >
        資産追加
      </button>
    </div>
  );
};

describe('データストア', () => {
  // 市場データサービスのインポート
  const marketDataService = require('@/services/marketDataService');
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    localStorage.clear();
    
    // ローカルストレージにポートフォリオデータをセット
    const serializedData = btoa(encodeURIComponent(JSON.stringify({
      baseCurrency: mockPortfolioContextData.baseCurrency,
      exchangeRate: mockPortfolioContextData.exchangeRate,
      currentAssets: mockPortfolioContextData.currentAssets,
      targetPortfolio: mockPortfolioContextData.targetPortfolio,
      additionalBudget: mockPortfolioContextData.additionalBudget,
      version: '1.0',
      timestamp: new Date().toISOString()
    })));
    localStorage.setItem('portfolio-data', serializedData);
  });
  
  describe('初期化', () => {
    it('ローカルストレージからデータをロードする', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // ローカルストレージからデータが読み込まれたことを検証
      expect(localStorage.getItem).toHaveBeenCalledWith('portfolio-data');
      
      // 為替レートのAPIが呼ばれたことを検証
      expect(marketDataService.fetchExchangeRate).toHaveBeenCalled();
      
      // データが正しく設定されていることを検証
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent(mockPortfolioContextData.baseCurrency);
      });
      
      expect(screen.getByTestId('assets-count')).toHaveTextContent(mockPortfolioContextData.currentAssets.length.toString());
      expect(screen.getByTestId('target-count')).toHaveTextContent(mockPortfolioContextData.targetPortfolio.length.toString());
    });
    
    it('ローカルストレージにデータがない場合は初期値を使用する', async () => {
      // ローカルストレージを空にする
      localStorage.clear();
      
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // ローカルストレージが確認されたことを検証
      expect(localStorage.getItem).toHaveBeenCalledWith('portfolio-data');
      
      // 初期値が設定されていることを検証（初期値は実装に依存）
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent(/JPY|USD/);
      });
      
      // 初期値では資産とターゲットが空であることを検証
      expect(screen.getByTestId('assets-count')).toHaveTextContent('0');
      expect(screen.getByTestId('target-count')).toHaveTextContent('0');
    });
  });
  
  describe('基本機能', () => {
    it('通貨を切り替えることができる', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent('JPY');
      });
      
      // 通貨切替ボタンをクリック
      await userEvent.click(screen.getByTestId('toggle-currency'));
      
      // 通貨が切り替わったことを検証
      expect(screen.getByTestId('base-currency')).toHaveTextContent('USD');
      
      // ローカルストレージが更新されたことを検証
      expect(localStorage.setItem).toHaveBeenCalled();
    });
    
    it('市場データを更新できる', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent('JPY');
      });
      
      // データ更新ボタンをクリック
      await userEvent.click(screen.getByTestId('refresh-data'));
      
      // fetchMultipleStocksが呼ばれたことを検証
      expect(marketDataService.fetchMultipleStocks).toHaveBeenCalled();
      
      // fetchExchangeRateが呼ばれたことを検証
      expect(marketDataService.fetchExchangeRate).toHaveBeenCalled();
    });
    
    it('資産を追加できる', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        const assetsCount = parseInt(screen.getByTestId('assets-count').textContent, 10);
        expect(assetsCount).toBe(mockPortfolioContextData.currentAssets.length);
      });
      
      // 資産追加ボタンをクリック
      await userEvent.click(screen.getByTestId('add-asset'));
      
      // 資産が追加されたことを検証
      const newAssetsCount = parseInt(screen.getByTestId('assets-count').textContent, 10);
      expect(newAssetsCount).toBe(mockPortfolioContextData.currentAssets.length + 1);
      
      // ローカルストレージが更新されたことを検証
      expect(localStorage.setItem).toHaveBeenCalled();
    });
    
    it('予算を設定できる', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent('JPY');
      });
      
      // 予算設定ボタンをクリック
      await userEvent.click(screen.getByTestId('set-budget'));
      
      // シミュレーション結果が更新されることを検証
      // (予算変更によりシミュレーション結果が変わる)
      await waitFor(() => {
        expect(screen.getByTestId('simulation-count')).not.toHaveTextContent('0');
      });
      
      // ローカルストレージが更新されたことを検証
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });
  
  describe('ポートフォリオ計算', () => {
    it('総資産額を正しく計算する', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent('JPY');
      });
      
      // 総資産額が計算されていることを検証
      const totalAssets = parseFloat(screen.getByTestId('total-assets').textContent);
      expect(totalAssets).toBeGreaterThan(0);
      
      // 期待される総資産額を計算
      // 円建て資産 + （ドル建て資産 * 為替レート）
      const expectedTotal = mockPortfolioContextData.currentAssets.reduce((total, asset) => {
        if (asset.currency === 'JPY') {
          return total + asset.price * asset.holdings;
        } else {
          return total + asset.price * asset.holdings * mockExchangeRate.rate;
        }
      }, 0);
      
      // 小数点の誤差を考慮して近似値を検証
      expect(totalAssets).toBeCloseTo(expectedTotal, 0);
    });
    
    it('年間手数料を正しく計算する', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent('JPY');
      });
      
      // 年間手数料が計算されていることを検証
      const annualFees = parseFloat(screen.getByTestId('annual-fees').textContent);
      
      // 期待される年間手数料を計算
      // 各資産の（価格 * 保有数 * 手数料率）の合計
      const expectedFees = mockPortfolioContextData.currentAssets.reduce((total, asset) => {
        const value = asset.price * asset.holdings;
        const feeRate = asset.annualFee || 0;
        const feeAmount = value * (feeRate / 100);
        
        if (asset.currency === 'JPY') {
          return total + feeAmount;
        } else {
          return total + feeAmount * mockExchangeRate.rate;
        }
      }, 0);
      
      // 小数点の誤差を考慮して近似値を検証
      expect(annualFees).toBeCloseTo(expectedFees, 0);
    });
    
    it('シミュレーション結果を正しく計算する', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent('JPY');
      });
      
      // 予算設定ボタンをクリック
      await userEvent.click(screen.getByTestId('set-budget'));
      
      // シミュレーション結果が計算されていることを検証
      const simulationCount = parseInt(screen.getByTestId('simulation-count').textContent, 10);
      
      // シミュレーション結果の件数が資産数と同じかそれ以下であることを検証
      // (目標配分がない銘柄はシミュレーション結果に含まれない)
      expect(simulationCount).toBeLessThanOrEqual(mockPortfolioContextData.currentAssets.length + mockPortfolioContextData.targetPortfolio.length);
    });
  });
  
  describe('データ永続化', () => {
    it('ローカルストレージに保存できる', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期値が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('base-currency')).toHaveTextContent('JPY');
      });
      
      // 通貨切替ボタンをクリック（状態変更によりローカルストレージが更新される）
      await userEvent.click(screen.getByTestId('toggle-currency'));
      
      // ローカルストレージに保存されたことを検証
      expect(localStorage.setItem).toHaveBeenCalledWith('portfolio-data', expect.any(String));
      
      // 保存されたデータがBase64+URIエンコードされていることを検証
      const savedData = localStorage.setItem.mock.calls[0][1];
      expect(typeof savedData).toBe('string');
      
      // デコードしてデータ構造を検証
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(savedData)));
        expect(decoded).toHaveProperty('baseCurrency', 'USD');
        expect(decoded).toHaveProperty('currentAssets');
        expect(decoded).toHaveProperty('targetPortfolio');
        expect(decoded).toHaveProperty('version');
        expect(decoded).toHaveProperty('timestamp');
      } catch (e) {
        // デコードに失敗した場合はテスト失敗
        fail('保存されたデータをデコードできませんでした: ' + e.message);
      }
    });
    
    it('データ変更時に自動的に保存される', async () => {
      // テスト実行
      render(
        <PortfolioProvider>
          <PortfolioConsumer />
        </PortfolioProvider>
      );
      
      // 初期化時にローカルストレージが読み込まれることを検証
      expect(localStorage.getItem).toHaveBeenCalledWith('portfolio-data');
      
      // ローカルストレージへの保存呼び出しをリセット
      localStorage.setItem.mockClear();
      
      // 資産追加ボタンをクリック
      await userEvent.click(screen.getByTestId('add-asset'));
      
      // データ変更によりローカルストレージに保存されることを検証
      expect(localStorage.setItem).toHaveBeenCalledWith('portfolio-data', expect.any(String));
    });
  });
  
  describe('認証状態変更ハンドラ', () => {
    it('認証状態変更を処理できる', async () => {
      // レンダーフックを使用してカスタムフックをテスト
      const wrapper = ({ children }) => <PortfolioProvider>{children}</PortfolioProvider>;
      
      // テスト実行
      const { result, waitForNextUpdate } = renderHook(() => usePortfolioContext(), { wrapper });
      
      // 初期化が完了するのを待つ
      await waitForNextUpdate();
      
      // 認証状態変更ハンドラーを実行
      act(() => {
        result.current.handleAuthStateChange(true, { id: 'test-user', name: 'Test User' });
      });
      
      // 認証状態が変更されたことを検証（実装によって効果は異なる）
      // この例では特に変更がないことを確認
      expect(result.current.baseCurrency).toBe(mockPortfolioContextData.baseCurrency);
    });
  });
  
  describe('usePortfolioContextフック', () => {
    it('ポートフォリオコンテキストの値を正しく取得できる', async () => {
      // レンダーフックを使用してカスタムフックをテスト
      const wrapper = ({ children }) => <PortfolioProvider>{children}</PortfolioProvider>;
      
      // テスト実行
      const { result, waitForNextUpdate } = renderHook(() => usePortfolioContext(), { wrapper });
      
      // 初期化が完了するのを待つ
      await waitForNextUpdate();
      
      // コンテキスト値が正しく取得できることを検証
      expect(result.current.baseCurrency).toBe(mockPortfolioContextData.baseCurrency);
      expect(result.current.currentAssets).toHaveLength(mockPortfolioContextData.currentAssets.length);
      expect(result.current.targetPortfolio).toHaveLength(mockPortfolioContextData.targetPortfolio.length);
      
      // 関数が存在することを検証
      expect(typeof result.current.updateBaseCurrency).toBe('function');
      expect(typeof result.current.updateCurrentAssets).toBe('function');
      expect(typeof result.current.updateTargetPortfolio).toBe('function');
      expect(typeof result.current.updateBudget).toBe('function');
      expect(typeof result.current.refreshMarketData).toBe('function');
      expect(typeof result.current.getTotalAssets).toBe('function');
      expect(typeof result.current.getAnnualFees).toBe('function');
      expect(typeof result.current.getSimulationResults).toBe('function');
    });
  });
});
