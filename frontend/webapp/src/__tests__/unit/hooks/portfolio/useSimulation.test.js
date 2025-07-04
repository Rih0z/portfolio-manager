import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSimulation } from '../../../../hooks/portfolio/useSimulation';
import { PortfolioContext } from '../../../../context/PortfolioContext';

describe('useSimulation', () => {
  const createWrapper = (contextValue) => ({ children }) => (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );

  test('コンテキストの外で使用するとエラーをスローする', () => {
    const { result } = renderHook(() => useSimulation());
    
    expect(result.error).toEqual(
      new Error('useSimulation must be used within a PortfolioProvider')
    );
  });

  test('シミュレーション機能を正しく返す', () => {
    const mockRunSimulation = jest.fn();
    const mockExecutePurchase = jest.fn();
    const mockSetIncludeCurrentHoldings = jest.fn();
    const mockSimulationResult = {
      purchases: [
        { ticker: 'AAPL', quantity: 10, amount: 1500 }
      ],
      totalAmount: 1500,
      remainingBudget: 500
    };

    const mockContext = {
      runSimulation: mockRunSimulation,
      executePurchase: mockExecutePurchase,
      simulationResult: mockSimulationResult,
      includeCurrentHoldings: true,
      setIncludeCurrentHoldings: mockSetIncludeCurrentHoldings,
      // 他のプロパティ（公開されないもの）
      currentAssets: [],
      targetPortfolio: [],
      internalMethod: jest.fn()
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => useSimulation(), { wrapper });

    // 必要な機能のみが公開されていることを確認
    expect(result.current).toEqual({
      runSimulation: mockRunSimulation,
      executePurchase: mockExecutePurchase,
      simulationResult: mockSimulationResult,
      includeCurrentHoldings: true,
      setIncludeCurrentHoldings: mockSetIncludeCurrentHoldings
    });

    // 内部プロパティが公開されていないことを確認
    expect(result.current.currentAssets).toBeUndefined();
    expect(result.current.targetPortfolio).toBeUndefined();
    expect(result.current.internalMethod).toBeUndefined();
  });

  test('runSimulation関数を呼び出せる', () => {
    const mockRunSimulation = jest.fn().mockResolvedValue({
      success: true,
      purchases: []
    });

    const mockContext = {
      runSimulation: mockRunSimulation,
      executePurchase: jest.fn(),
      simulationResult: null,
      includeCurrentHoldings: false,
      setIncludeCurrentHoldings: jest.fn()
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => useSimulation(), { wrapper });

    act(() => {
      result.current.runSimulation({ budget: 1000 });
    });

    expect(mockRunSimulation).toHaveBeenCalledWith({ budget: 1000 });
    expect(mockRunSimulation).toHaveBeenCalledTimes(1);
  });

  test('executePurchase関数を呼び出せる', () => {
    const mockExecutePurchase = jest.fn().mockResolvedValue({
      success: true
    });

    const mockContext = {
      runSimulation: jest.fn(),
      executePurchase: mockExecutePurchase,
      simulationResult: {
        purchases: [{ ticker: 'AAPL', quantity: 10 }]
      },
      includeCurrentHoldings: true,
      setIncludeCurrentHoldings: jest.fn()
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => useSimulation(), { wrapper });

    act(() => {
      result.current.executePurchase(result.current.simulationResult.purchases);
    });

    expect(mockExecutePurchase).toHaveBeenCalledWith([
      { ticker: 'AAPL', quantity: 10 }
    ]);
    expect(mockExecutePurchase).toHaveBeenCalledTimes(1);
  });

  test('setIncludeCurrentHoldings関数を呼び出せる', () => {
    const mockSetIncludeCurrentHoldings = jest.fn();

    const mockContext = {
      runSimulation: jest.fn(),
      executePurchase: jest.fn(),
      simulationResult: null,
      includeCurrentHoldings: false,
      setIncludeCurrentHoldings: mockSetIncludeCurrentHoldings
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => useSimulation(), { wrapper });

    act(() => {
      result.current.setIncludeCurrentHoldings(true);
    });

    expect(mockSetIncludeCurrentHoldings).toHaveBeenCalledWith(true);
    expect(mockSetIncludeCurrentHoldings).toHaveBeenCalledTimes(1);
  });

  test('シミュレーション結果がnullの場合', () => {
    const mockContext = {
      runSimulation: jest.fn(),
      executePurchase: jest.fn(),
      simulationResult: null,
      includeCurrentHoldings: false,
      setIncludeCurrentHoldings: jest.fn()
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => useSimulation(), { wrapper });

    expect(result.current.simulationResult).toBeNull();
  });

  test('コンテキストの値が更新されると新しい値を返す', () => {
    const mockContext1 = {
      runSimulation: jest.fn(),
      executePurchase: jest.fn(),
      simulationResult: null,
      includeCurrentHoldings: false,
      setIncludeCurrentHoldings: jest.fn()
    };

    const mockSimulationResult = {
      purchases: [
        { ticker: 'VOO', quantity: 5, amount: 2000 },
        { ticker: 'TQQQ', quantity: 20, amount: 1000 }
      ],
      totalAmount: 3000,
      remainingBudget: 2000
    };

    const mockContext2 = {
      ...mockContext1,
      simulationResult: mockSimulationResult,
      includeCurrentHoldings: true
    };

    const { result, rerender } = renderHook(
      () => useSimulation(),
      { wrapper: createWrapper(mockContext1) }
    );

    expect(result.current.simulationResult).toBeNull();
    expect(result.current.includeCurrentHoldings).toBe(false);

    // コンテキストを更新
    rerender({
      wrapper: createWrapper(mockContext2)
    });

    expect(result.current.simulationResult).toEqual(mockSimulationResult);
    expect(result.current.includeCurrentHoldings).toBe(true);
  });

  test('実際の使用シナリオをシミュレート', async () => {
    const mockSimulationResult = {
      purchases: [
        { ticker: 'VOO', quantity: 10, amount: 4000, price: 400 },
        { ticker: 'TQQQ', quantity: 50, amount: 2500, price: 50 }
      ],
      totalAmount: 6500,
      remainingBudget: 3500,
      allocations: [
        { ticker: 'VOO', currentPercentage: 60, targetPercentage: 70 },
        { ticker: 'TQQQ', currentPercentage: 30, targetPercentage: 20 }
      ]
    };

    const mockRunSimulation = jest.fn().mockResolvedValue({
      success: true,
      result: mockSimulationResult
    });

    const mockExecutePurchase = jest.fn().mockResolvedValue({
      success: true,
      message: '購入が完了しました'
    });

    const mockSetIncludeCurrentHoldings = jest.fn();

    const mockContext = {
      runSimulation: mockRunSimulation,
      executePurchase: mockExecutePurchase,
      simulationResult: null,
      includeCurrentHoldings: true,
      setIncludeCurrentHoldings: mockSetIncludeCurrentHoldings
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => useSimulation(), { wrapper });

    // シミュレーション実行
    await act(async () => {
      const simResult = await result.current.runSimulation({
        budget: 10000,
        currency: 'USD',
        targetAllocations: [
          { ticker: 'VOO', percentage: 70 },
          { ticker: 'TQQQ', percentage: 20 },
          { ticker: 'CASH', percentage: 10 }
        ]
      });
      expect(simResult.success).toBe(true);
    });

    expect(mockRunSimulation).toHaveBeenCalledWith({
      budget: 10000,
      currency: 'USD',
      targetAllocations: [
        { ticker: 'VOO', percentage: 70 },
        { ticker: 'TQQQ', percentage: 20 },
        { ticker: 'CASH', percentage: 10 }
      ]
    });

    // includeCurrentHoldingsの変更
    act(() => {
      result.current.setIncludeCurrentHoldings(false);
    });

    expect(mockSetIncludeCurrentHoldings).toHaveBeenCalledWith(false);

    // 購入実行
    await act(async () => {
      const purchaseResult = await result.current.executePurchase(
        mockSimulationResult.purchases
      );
      expect(purchaseResult.success).toBe(true);
    });

    expect(mockExecutePurchase).toHaveBeenCalledWith(
      mockSimulationResult.purchases
    );
  });

  test('関数が未定義の場合でも動作する', () => {
    const mockContext = {
      runSimulation: undefined,
      executePurchase: undefined,
      simulationResult: undefined,
      includeCurrentHoldings: undefined,
      setIncludeCurrentHoldings: undefined
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => useSimulation(), { wrapper });

    expect(result.current.runSimulation).toBeUndefined();
    expect(result.current.executePurchase).toBeUndefined();
    expect(result.current.simulationResult).toBeUndefined();
    expect(result.current.includeCurrentHoldings).toBeUndefined();
    expect(result.current.setIncludeCurrentHoldings).toBeUndefined();
  });
});