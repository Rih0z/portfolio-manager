/**
 * usePortfolioActions.js のテストファイル
 * ポートフォリオアクションフックの包括的テスト
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { usePortfolioActions } from '../../../hooks/portfolio/usePortfolioActions';
import { PortfolioContext } from '../../../context/PortfolioContext';

// テスト用のコンテキスト値を作成するヘルパー関数
const createMockContext = (overrides = {}) => ({
  // 資産の操作
  addTicker: jest.fn(),
  updateHolding: jest.fn(),
  removeAsset: jest.fn(),
  
  // 目標配分の操作
  updateTargetAllocation: jest.fn(),
  
  // 基本設定
  setBaseCurrency: jest.fn(),
  setAdditionalBudget: jest.fn(),
  setAiPromptTemplate: jest.fn(),
  
  // データの更新
  refreshMarketData: jest.fn(),
  updateExchangeRate: jest.fn(),
  
  // インポート/エクスポート
  importData: jest.fn(),
  exportData: jest.fn(),
  
  // その他のコンテキスト値（非公開）
  portfolioData: { assets: [] },
  currentUser: null,
  dataSource: 'local',
  
  ...overrides
});

// PortfolioProviderラッパー
const createWrapper = (contextValue) => {
  return ({ children }) => (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
};

describe('usePortfolioActions', () => {
  describe('基本機能', () => {
    test('コンテキスト内で使用した場合、正しいアクションを返す', () => {
      const mockContext = createMockContext();
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      // 資産の操作
      expect(result.current.addTicker).toBe(mockContext.addTicker);
      expect(result.current.updateHolding).toBe(mockContext.updateHolding);
      expect(result.current.removeAsset).toBe(mockContext.removeAsset);
      
      // 目標配分の操作
      expect(result.current.updateTargetAllocation).toBe(mockContext.updateTargetAllocation);
      
      // 基本設定
      expect(result.current.setBaseCurrency).toBe(mockContext.setBaseCurrency);
      expect(result.current.setAdditionalBudget).toBe(mockContext.setAdditionalBudget);
      expect(result.current.setAiPromptTemplate).toBe(mockContext.setAiPromptTemplate);
      
      // データの更新
      expect(result.current.refreshMarketData).toBe(mockContext.refreshMarketData);
      expect(result.current.updateExchangeRate).toBe(mockContext.updateExchangeRate);
      
      // インポート/エクスポート
      expect(result.current.importData).toBe(mockContext.importData);
      expect(result.current.exportData).toBe(mockContext.exportData);
    });
  });

  describe('資産の操作', () => {
    test('addTickerが正しく公開される', () => {
      const mockAddTicker = jest.fn();
      const mockContext = createMockContext({
        addTicker: mockAddTicker
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.addTicker).toBe(mockAddTicker);
    });

    test('updateHoldingが正しく公開される', () => {
      const mockUpdateHolding = jest.fn();
      const mockContext = createMockContext({
        updateHolding: mockUpdateHolding
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.updateHolding).toBe(mockUpdateHolding);
    });

    test('removeAssetが正しく公開される', () => {
      const mockRemoveAsset = jest.fn();
      const mockContext = createMockContext({
        removeAsset: mockRemoveAsset
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.removeAsset).toBe(mockRemoveAsset);
    });
  });

  describe('目標配分の操作', () => {
    test('updateTargetAllocationが正しく公開される', () => {
      const mockUpdateTargetAllocation = jest.fn();
      const mockContext = createMockContext({
        updateTargetAllocation: mockUpdateTargetAllocation
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.updateTargetAllocation).toBe(mockUpdateTargetAllocation);
    });
  });

  describe('基本設定', () => {
    test('setBaseCurrencyが正しく公開される', () => {
      const mockSetBaseCurrency = jest.fn();
      const mockContext = createMockContext({
        setBaseCurrency: mockSetBaseCurrency
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.setBaseCurrency).toBe(mockSetBaseCurrency);
    });

    test('setAdditionalBudgetが正しく公開される', () => {
      const mockSetAdditionalBudget = jest.fn();
      const mockContext = createMockContext({
        setAdditionalBudget: mockSetAdditionalBudget
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.setAdditionalBudget).toBe(mockSetAdditionalBudget);
    });

    test('setAiPromptTemplateが正しく公開される', () => {
      const mockSetAiPromptTemplate = jest.fn();
      const mockContext = createMockContext({
        setAiPromptTemplate: mockSetAiPromptTemplate
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.setAiPromptTemplate).toBe(mockSetAiPromptTemplate);
    });
  });

  describe('データの更新', () => {
    test('refreshMarketDataが正しく公開される', () => {
      const mockRefreshMarketData = jest.fn();
      const mockContext = createMockContext({
        refreshMarketData: mockRefreshMarketData
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.refreshMarketData).toBe(mockRefreshMarketData);
    });

    test('updateExchangeRateが正しく公開される', () => {
      const mockUpdateExchangeRate = jest.fn();
      const mockContext = createMockContext({
        updateExchangeRate: mockUpdateExchangeRate
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.updateExchangeRate).toBe(mockUpdateExchangeRate);
    });
  });

  describe('インポート/エクスポート', () => {
    test('importDataが正しく公開される', () => {
      const mockImportData = jest.fn();
      const mockContext = createMockContext({
        importData: mockImportData
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.importData).toBe(mockImportData);
    });

    test('exportDataが正しく公開される', () => {
      const mockExportData = jest.fn();
      const mockContext = createMockContext({
        exportData: mockExportData
      });
      
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      expect(result.current.exportData).toBe(mockExportData);
    });
  });

  describe('エラーハンドリング', () => {
    test('PortfolioProvider外で使用した場合、エラーを投げる', () => {
      expect(() => {
        renderHook(() => usePortfolioActions());
      }).toThrow('usePortfolioActions must be used within a PortfolioProvider');
    });

    test('コンテキスト値がnullの場合、エラーを投げる', () => {
      const wrapper = ({ children }) => (
        <PortfolioContext.Provider value={null}>
          {children}
        </PortfolioContext.Provider>
      );
      
      expect(() => {
        renderHook(() => usePortfolioActions(), { wrapper });
      }).toThrow('usePortfolioActions must be used within a PortfolioProvider');
    });

    test('コンテキスト値がundefinedの場合、エラーを投げる', () => {
      const wrapper = ({ children }) => (
        <PortfolioContext.Provider value={undefined}>
          {children}
        </PortfolioContext.Provider>
      );
      
      expect(() => {
        renderHook(() => usePortfolioActions(), { wrapper });
      }).toThrow('usePortfolioActions must be used within a PortfolioProvider');
    });
  });

  describe('Interface Segregation Principle', () => {
    test('CRUD操作に関連する機能のみが公開される', () => {
      const mockContext = createMockContext();
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      // CRUD操作関連のプロパティが存在することを確認
      const expectedProperties = [
        // 資産の操作
        'addTicker',
        'updateHolding', 
        'removeAsset',
        // 目標配分の操作
        'updateTargetAllocation',
        // 基本設定
        'setBaseCurrency',
        'setAdditionalBudget',
        'setAiPromptTemplate',
        // データの更新
        'refreshMarketData',
        'updateExchangeRate',
        // インポート/エクスポート
        'importData',
        'exportData'
      ];
      
      const actualProperties = Object.keys(result.current);
      expect(actualProperties).toEqual(expect.arrayContaining(expectedProperties));
      expect(actualProperties).toHaveLength(expectedProperties.length);
      
      // 読み取り専用データは含まれないことを確認
      expect(result.current.portfolioData).toBeUndefined();
      expect(result.current.currentUser).toBeUndefined();
      expect(result.current.dataSource).toBeUndefined();
    });
  });

  describe('アクション関数の一貫性', () => {
    test('すべてのアクションがfunctionである', () => {
      const mockContext = createMockContext();
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      Object.values(result.current).forEach(action => {
        expect(typeof action).toBe('function');
      });
    });

    test('すべてのアクションがコンテキストから正しく取得される', () => {
      const mockFunctions = {
        addTicker: jest.fn().mockName('addTicker'),
        updateHolding: jest.fn().mockName('updateHolding'),
        removeAsset: jest.fn().mockName('removeAsset'),
        updateTargetAllocation: jest.fn().mockName('updateTargetAllocation'),
        setBaseCurrency: jest.fn().mockName('setBaseCurrency'),
        setAdditionalBudget: jest.fn().mockName('setAdditionalBudget'),
        setAiPromptTemplate: jest.fn().mockName('setAiPromptTemplate'),
        refreshMarketData: jest.fn().mockName('refreshMarketData'),
        updateExchangeRate: jest.fn().mockName('updateExchangeRate'),
        importData: jest.fn().mockName('importData'),
        exportData: jest.fn().mockName('exportData')
      };
      
      const mockContext = createMockContext(mockFunctions);
      const wrapper = createWrapper(mockContext);
      const { result } = renderHook(() => usePortfolioActions(), { wrapper });
      
      // 各アクションが対応するモック関数と同じ参照であることを確認
      Object.keys(mockFunctions).forEach(functionName => {
        expect(result.current[functionName]).toBe(mockFunctions[functionName]);
      });
    });
  });
});