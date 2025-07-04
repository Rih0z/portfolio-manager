import React from 'react';
import { renderHook } from '@testing-library/react';
import { usePortfolioData } from '../../../../hooks/portfolio/usePortfolioData';
import { PortfolioContext } from '../../../../context/PortfolioContext';

describe('usePortfolioData', () => {
  const createWrapper = (contextValue) => ({ children }) => (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );

  test('コンテキストの外で使用するとエラーをスローする', () => {
    const { result } = renderHook(() => usePortfolioData());
    
    expect(result.error).toEqual(
      new Error('usePortfolioData must be used within a PortfolioProvider')
    );
  });

  test('基本データを正しく返す', () => {
    const mockContext = {
      currentAssets: [
        { ticker: 'AAPL', quantity: 10, price: 150 },
        { ticker: 'GOOGL', quantity: 5, price: 2800 }
      ],
      targetPortfolio: [
        { ticker: 'AAPL', percentage: 60 },
        { ticker: 'GOOGL', percentage: 40 }
      ],
      baseCurrency: 'USD',
      exchangeRate: 150,
      totalAssets: 15500,
      totalAnnualFees: 100,
      totalAnnualDividends: 500,
      additionalBudget: 1000,
      aiPromptTemplate: 'default template',
      isLoading: false,
      lastUpdated: '2025-01-06T12:00:00Z',
      initialized: true,
      // 他のプロパティ（公開されないもの）
      someInternalMethod: jest.fn(),
      privateData: 'should not be exposed'
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => usePortfolioData(), { wrapper });

    // 必要なデータのみが公開されていることを確認
    expect(result.current).toEqual({
      currentAssets: mockContext.currentAssets,
      targetPortfolio: mockContext.targetPortfolio,
      baseCurrency: mockContext.baseCurrency,
      exchangeRate: mockContext.exchangeRate,
      totalAssets: mockContext.totalAssets,
      totalAnnualFees: mockContext.totalAnnualFees,
      totalAnnualDividends: mockContext.totalAnnualDividends,
      additionalBudget: mockContext.additionalBudget,
      aiPromptTemplate: mockContext.aiPromptTemplate,
      isLoading: mockContext.isLoading,
      lastUpdated: mockContext.lastUpdated,
      initialized: mockContext.initialized
    });

    // 内部メソッドやプライベートデータが公開されていないことを確認
    expect(result.current.someInternalMethod).toBeUndefined();
    expect(result.current.privateData).toBeUndefined();
  });

  test('空の配列やnull値を正しく処理する', () => {
    const mockContext = {
      currentAssets: [],
      targetPortfolio: [],
      baseCurrency: 'JPY',
      exchangeRate: 1,
      totalAssets: 0,
      totalAnnualFees: 0,
      totalAnnualDividends: 0,
      additionalBudget: 0,
      aiPromptTemplate: null,
      isLoading: false,
      lastUpdated: null,
      initialized: false
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => usePortfolioData(), { wrapper });

    expect(result.current.currentAssets).toEqual([]);
    expect(result.current.targetPortfolio).toEqual([]);
    expect(result.current.totalAssets).toBe(0);
    expect(result.current.aiPromptTemplate).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
    expect(result.current.initialized).toBe(false);
  });

  test('ローディング状態を正しく反映する', () => {
    const mockContext = {
      currentAssets: [],
      targetPortfolio: [],
      baseCurrency: 'USD',
      exchangeRate: 1,
      totalAssets: 0,
      totalAnnualFees: 0,
      totalAnnualDividends: 0,
      additionalBudget: 0,
      aiPromptTemplate: '',
      isLoading: true,
      lastUpdated: null,
      initialized: false
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => usePortfolioData(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  test('コンテキストの値が更新されると新しい値を返す', () => {
    const mockContext1 = {
      currentAssets: [{ ticker: 'AAPL', quantity: 10, price: 150 }],
      targetPortfolio: [{ ticker: 'AAPL', percentage: 100 }],
      baseCurrency: 'USD',
      exchangeRate: 1,
      totalAssets: 1500,
      totalAnnualFees: 10,
      totalAnnualDividends: 30,
      additionalBudget: 500,
      aiPromptTemplate: 'template 1',
      isLoading: false,
      lastUpdated: '2025-01-06T12:00:00Z',
      initialized: true
    };

    const mockContext2 = {
      ...mockContext1,
      currentAssets: [
        { ticker: 'AAPL', quantity: 10, price: 150 },
        { ticker: 'MSFT', quantity: 20, price: 300 }
      ],
      totalAssets: 7500,
      lastUpdated: '2025-01-06T13:00:00Z'
    };

    const { result, rerender } = renderHook(
      () => usePortfolioData(),
      { wrapper: createWrapper(mockContext1) }
    );

    expect(result.current.currentAssets).toHaveLength(1);
    expect(result.current.totalAssets).toBe(1500);

    // コンテキストを更新
    rerender({
      wrapper: createWrapper(mockContext2)
    });

    expect(result.current.currentAssets).toHaveLength(2);
    expect(result.current.totalAssets).toBe(7500);
    expect(result.current.lastUpdated).toBe('2025-01-06T13:00:00Z');
  });

  test('実際の使用シナリオをシミュレート', () => {
    const mockContext = {
      currentAssets: [
        { ticker: 'VOO', quantity: 100, price: 400, currency: 'USD' },
        { ticker: 'TQQQ', quantity: 50, price: 50, currency: 'USD' },
        { ticker: 'CASH', quantity: 10000, price: 1, currency: 'JPY' }
      ],
      targetPortfolio: [
        { ticker: 'VOO', percentage: 70 },
        { ticker: 'TQQQ', percentage: 20 },
        { ticker: 'CASH', percentage: 10 }
      ],
      baseCurrency: 'JPY',
      exchangeRate: 150,
      totalAssets: 6520000, // (400*100 + 50*50) * 150 + 10000
      totalAnnualFees: 3000,
      totalAnnualDividends: 120000,
      additionalBudget: 100000,
      aiPromptTemplate: 'あなたのポートフォリオを分析してください...',
      isLoading: false,
      lastUpdated: '2025-01-06T12:00:00Z',
      initialized: true
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => usePortfolioData(), { wrapper });

    // データの整合性を確認
    expect(result.current.currentAssets).toHaveLength(3);
    expect(result.current.targetPortfolio).toHaveLength(3);
    expect(result.current.baseCurrency).toBe('JPY');
    expect(result.current.exchangeRate).toBe(150);
    expect(result.current.totalAssets).toBe(6520000);
    expect(result.current.totalAnnualFees).toBe(3000);
    expect(result.current.totalAnnualDividends).toBe(120000);
    expect(result.current.additionalBudget).toBe(100000);
    expect(result.current.aiPromptTemplate).toContain('ポートフォリオを分析');
    expect(result.current.initialized).toBe(true);
  });

  test('未定義のプロパティを持つコンテキストでも動作する', () => {
    const mockContext = {
      // 最小限のプロパティのみ
      currentAssets: undefined,
      targetPortfolio: undefined,
      baseCurrency: undefined,
      exchangeRate: undefined,
      totalAssets: undefined,
      totalAnnualFees: undefined,
      totalAnnualDividends: undefined,
      additionalBudget: undefined,
      aiPromptTemplate: undefined,
      isLoading: undefined,
      lastUpdated: undefined,
      initialized: undefined
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => usePortfolioData(), { wrapper });

    // undefinedの値がそのまま返される
    expect(result.current.currentAssets).toBeUndefined();
    expect(result.current.targetPortfolio).toBeUndefined();
    expect(result.current.baseCurrency).toBeUndefined();
    expect(result.current.exchangeRate).toBeUndefined();
    expect(result.current.totalAssets).toBeUndefined();
    expect(result.current.totalAnnualFees).toBeUndefined();
    expect(result.current.totalAnnualDividends).toBeUndefined();
    expect(result.current.additionalBudget).toBeUndefined();
    expect(result.current.aiPromptTemplate).toBeUndefined();
    expect(result.current.isLoading).toBeUndefined();
    expect(result.current.lastUpdated).toBeUndefined();
    expect(result.current.initialized).toBeUndefined();
  });
});