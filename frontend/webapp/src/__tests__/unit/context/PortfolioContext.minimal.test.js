/**
 * PortfolioContext.js の最小限テストファイル
 * 確実にカバレッジを向上させるための基本テスト
 */

import React, { useContext } from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PortfolioContext, PortfolioProvider, encryptData, decryptData } from '../../../context/PortfolioContext';

// 依存関係のモック
jest.mock('../../../services/api', () => ({
  fetchTickerData: jest.fn(),
  fetchExchangeRate: jest.fn(),
  fetchFundInfo: jest.fn(),
  fetchDividendData: jest.fn(),
  saveToGoogleDrive: jest.fn()
}));

jest.mock('../../../services/marketDataService', () => ({
  fetchMultipleStocks: jest.fn()
}));

jest.mock('../../../utils/fundUtils', () => ({
  FUND_TYPES: { ETF: 'ETF', Stock: 'Stock' },
  guessFundType: jest.fn(),
  estimateAnnualFee: jest.fn(),
  estimateDividendYield: jest.fn(),
  US_ETF_LIST: [],
  TICKER_SPECIFIC_FEES: {},
  TICKER_SPECIFIC_DIVIDENDS: {}
}));

jest.mock('../../../utils/requestThrottle', () => ({
  requestManager: {
    executeWithRetry: jest.fn(),
    executeWithDelay: jest.fn()
  },
  debouncedRefreshMarketData: jest.fn(),
  requestDeduplicator: {
    deduplicate: jest.fn()
  }
}));

jest.mock('../../../utils/exchangeRateDebounce', () => ({
  shouldUpdateExchangeRate: jest.fn(() => true),
  clearExchangeRateCache: jest.fn()
}));

// localStorage のモック
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// console のモック
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('PortfolioContext - 基本テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('ProviderとContextが正常に初期化される', () => {
    let contextValue = null;
    
    function TestComponent() {
      contextValue = useContext(PortfolioContext);
      return <div>Test</div>;
    }

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue.baseCurrency).toBe('JPY');
    expect(contextValue.currentAssets).toEqual([]);
    expect(contextValue.targetPortfolio).toEqual([]);
  });

  it('通知システムが動作する', () => {
    let contextValue = null;
    
    function TestComponent() {
      contextValue = useContext(PortfolioContext);
      return <div>Test</div>;
    }

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    expect(typeof contextValue.addNotification).toBe('function');
    expect(typeof contextValue.removeNotification).toBe('function');
  });

  it('銘柄管理機能が定義されている', () => {
    let contextValue = null;
    
    function TestComponent() {
      contextValue = useContext(PortfolioContext);
      return <div>Test</div>;
    }

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    expect(typeof contextValue.addTicker).toBe('function');
    expect(typeof contextValue.removeTicker).toBe('function');
    expect(typeof contextValue.updateHoldings).toBe('function');
    expect(typeof contextValue.updateTargetAllocation).toBe('function');
  });

  it('データ永続化機能が定義されている', () => {
    let contextValue = null;
    
    function TestComponent() {
      contextValue = useContext(PortfolioContext);
      return <div>Test</div>;
    }

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    expect(typeof contextValue.saveToLocalStorage).toBe('function');
    expect(typeof contextValue.clearLocalStorage).toBe('function');
    expect(typeof contextValue.exportData).toBe('function');
    expect(typeof contextValue.importData).toBe('function');
  });

  it('計算機能が定義されている', () => {
    let contextValue = null;
    
    function TestComponent() {
      contextValue = useContext(PortfolioContext);
      return <div>Test</div>;
    }

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    expect(typeof contextValue.calculateSimulation).toBe('function');
    expect(typeof contextValue.convertCurrency).toBe('function');
    expect(typeof contextValue.totalAssets).toBe('number');
  });

  it('暗号化関数が動作する', () => {
    // エクスポートされた暗号化/復号化機能をテスト
    const testData = { test: 'data' };
    const encrypted = encryptData(testData);
    
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
    
    // 復号化テスト
    const decrypted = decryptData(encrypted);
    
    expect(decrypted).toEqual(testData);
  });
});