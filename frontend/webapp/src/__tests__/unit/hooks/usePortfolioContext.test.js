/**
 * usePortfolioContext.js のテストファイル
 * PortfolioContextカスタムフックの包括的テスト
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePortfolioContext } from '../../../hooks/usePortfolioContext';
import { PortfolioContext } from '../../../context/PortfolioContext';

describe('usePortfolioContext', () => {
  const mockPortfolioContextValue = {
    currentAssets: [
      { 
        id: 'AAPL', 
        ticker: 'AAPL', 
        name: 'Apple Inc.', 
        price: 150, 
        holdings: 10 
      }
    ],
    targetPortfolio: [
      { 
        id: 'AAPL', 
        ticker: 'AAPL', 
        name: 'Apple Inc.', 
        targetPercentage: 50 
      }
    ],
    baseCurrency: 'USD',
    totalAssets: 1500,
    exchangeRate: { rate: 150, source: 'test' },
    isLoading: false,
    lastUpdated: '2025-01-01T12:00:00Z',
    additionalBudget: { amount: 1000, currency: 'USD' },
    
    // Actions
    setCurrentAssets: jest.fn(),
    setTargetPortfolio: jest.fn(),
    setBaseCurrency: jest.fn(),
    setAdditionalBudget: jest.fn(),
    addNotification: jest.fn(),
    refreshMarketPrices: jest.fn(),
    calculateTotalAssets: jest.fn(),
    
    // Features
    features: {
      useProxy: false,
      useMockApi: true,
      useDirectApi: false
    }
  };

  const createWrapper = (contextValue = mockPortfolioContextValue) => {
    return function Wrapper({ children }) {
      return (
        <PortfolioContext.Provider value={contextValue}>
          {children}
        </PortfolioContext.Provider>
      );
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常なケース', () => {
    test('PortfolioContextの値を正しく返す', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current).toEqual(mockPortfolioContextValue);
    });

    test('currentAssetsを正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.currentAssets).toEqual([
        { 
          id: 'AAPL', 
          ticker: 'AAPL', 
          name: 'Apple Inc.', 
          price: 150, 
          holdings: 10 
        }
      ]);
    });

    test('targetPortfolioを正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.targetPortfolio).toEqual([
        { 
          id: 'AAPL', 
          ticker: 'AAPL', 
          name: 'Apple Inc.', 
          targetPercentage: 50 
        }
      ]);
    });

    test('基本設定を正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.baseCurrency).toBe('USD');
      expect(result.current.totalAssets).toBe(1500);
      expect(result.current.isLoading).toBe(false);
    });

    test('exchangeRateを正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.exchangeRate).toEqual({
        rate: 150,
        source: 'test'
      });
    });

    test('additionalBudgetを正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.additionalBudget).toEqual({
        amount: 1000,
        currency: 'USD'
      });
    });

    test('アクション関数を正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(typeof result.current.setCurrentAssets).toBe('function');
      expect(typeof result.current.setTargetPortfolio).toBe('function');
      expect(typeof result.current.setBaseCurrency).toBe('function');
      expect(typeof result.current.setAdditionalBudget).toBe('function');
      expect(typeof result.current.addNotification).toBe('function');
      expect(typeof result.current.refreshMarketPrices).toBe('function');
      expect(typeof result.current.calculateTotalAssets).toBe('function');
    });

    test('機能フラグを正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.features).toEqual({
        useProxy: false,
        useMockApi: true,
        useDirectApi: false
      });
    });
  });

  describe('異なるコンテキスト値', () => {
    test('空の配列データを正しく処理する', () => {
      const emptyContextValue = {
        ...mockPortfolioContextValue,
        currentAssets: [],
        targetPortfolio: []
      };
      
      const wrapper = createWrapper(emptyContextValue);
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.currentAssets).toEqual([]);
      expect(result.current.targetPortfolio).toEqual([]);
    });

    test('null値を正しく処理する', () => {
      const nullContextValue = {
        ...mockPortfolioContextValue,
        exchangeRate: null,
        additionalBudget: null
      };
      
      const wrapper = createWrapper(nullContextValue);
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.exchangeRate).toBeNull();
      expect(result.current.additionalBudget).toBeNull();
    });

    test('異なる通貨設定を正しく処理する', () => {
      const jpyContextValue = {
        ...mockPortfolioContextValue,
        baseCurrency: 'JPY',
        additionalBudget: { amount: 100000, currency: 'JPY' }
      };
      
      const wrapper = createWrapper(jpyContextValue);
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.baseCurrency).toBe('JPY');
      expect(result.current.additionalBudget.currency).toBe('JPY');
    });

    test('ローディング状態を正しく処理する', () => {
      const loadingContextValue = {
        ...mockPortfolioContextValue,
        isLoading: true
      };
      
      const wrapper = createWrapper(loadingContextValue);
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    test('機能フラグの異なる組み合わせを正しく処理する', () => {
      const proxyContextValue = {
        ...mockPortfolioContextValue,
        features: {
          useProxy: true,
          useMockApi: false,
          useDirectApi: true
        }
      };
      
      const wrapper = createWrapper(proxyContextValue);
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.features.useProxy).toBe(true);
      expect(result.current.features.useMockApi).toBe(false);
      expect(result.current.features.useDirectApi).toBe(true);
    });
  });

  describe('エラーケース', () => {
    test('PortfolioProviderなしで使用するとエラーを投げる', () => {
      // エラーをキャッチするためのスパイ
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePortfolioContext());
      }).toThrow('usePortfolioContext must be used within a PortfolioProvider');

      consoleSpy.mockRestore();
    });

    test('PortfolioContextがnullの場合にエラーを投げる', () => {
      const nullWrapper = createWrapper(null);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePortfolioContext(), { wrapper: nullWrapper });
      }).toThrow('usePortfolioContext must be used within a PortfolioProvider');

      consoleSpy.mockRestore();
    });

    test('PortfolioContextがundefinedの場合にエラーを投げる', () => {
      const undefinedWrapper = createWrapper(undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePortfolioContext(), { wrapper: undefinedWrapper });
      }).toThrow('usePortfolioContext must be used within a PortfolioProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('コンテキスト値の参照整合性', () => {
    test('同じコンテキスト値で複数回レンダリングしても同じ参照を返す', () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => usePortfolioContext(), { wrapper });

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    test('配列データの参照が正しく保持される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.currentAssets).toBe(mockPortfolioContextValue.currentAssets);
      expect(result.current.targetPortfolio).toBe(mockPortfolioContextValue.targetPortfolio);
    });

    test('関数の参照が正しく保持される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.setCurrentAssets).toBe(mockPortfolioContextValue.setCurrentAssets);
      expect(result.current.addNotification).toBe(mockPortfolioContextValue.addNotification);
    });
  });

  describe('型の整合性', () => {
    test('アクション関数がすべて関数型である', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      const actionFunctions = [
        'setCurrentAssets',
        'setTargetPortfolio', 
        'setBaseCurrency',
        'setAdditionalBudget',
        'addNotification',
        'refreshMarketPrices',
        'calculateTotalAssets'
      ];

      actionFunctions.forEach(funcName => {
        expect(typeof result.current[funcName]).toBe('function');
      });
    });

    test('データプロパティが期待する型である', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(Array.isArray(result.current.currentAssets)).toBe(true);
      expect(Array.isArray(result.current.targetPortfolio)).toBe(true);
      expect(typeof result.current.baseCurrency).toBe('string');
      expect(typeof result.current.totalAssets).toBe('number');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.lastUpdated).toBe('string');
    });

    test('オブジェクトプロパティが期待する構造である', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result.current.exchangeRate).toHaveProperty('rate');
      expect(result.current.exchangeRate).toHaveProperty('source');
      expect(result.current.additionalBudget).toHaveProperty('amount');
      expect(result.current.additionalBudget).toHaveProperty('currency');
      expect(result.current.features).toHaveProperty('useProxy');
      expect(result.current.features).toHaveProperty('useMockApi');
      expect(result.current.features).toHaveProperty('useDirectApi');
    });
  });

  describe('デフォルトエクスポート', () => {
    test('デフォルトエクスポートがusePortfolioContextと同じ関数である', () => {
      const defaultExport = require('../../../hooks/usePortfolioContext').default;
      const namedExport = require('../../../hooks/usePortfolioContext').usePortfolioContext;
      
      expect(defaultExport).toBe(namedExport);
    });
  });

  describe('複数のhook使用', () => {
    test('複数のコンポーネントで同時に使用しても同じ値を返す', () => {
      const wrapper = createWrapper();
      
      const { result: result1 } = renderHook(() => usePortfolioContext(), { wrapper });
      const { result: result2 } = renderHook(() => usePortfolioContext(), { wrapper });

      expect(result1.current).toBe(result2.current);
    });

    test('ネストしたコンポーネントでも正しく動作する', () => {
      const NestedWrapper = ({ children }) => {
        return (
          <div>
            <PortfolioContext.Provider value={mockPortfolioContextValue}>
              <div>
                {children}
              </div>
            </PortfolioContext.Provider>
          </div>
        );
      };

      const { result } = renderHook(() => usePortfolioContext(), { 
        wrapper: NestedWrapper 
      });

      expect(result.current).toEqual(mockPortfolioContextValue);
    });
  });
});