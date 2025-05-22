import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { PortfolioProvider } from '@/context/PortfolioContext';
import usePortfolioContext from '@/hooks/usePortfolioContext';

// Provider なしで使用した場合にエラーが投げられるか確認
it('throws error when used outside PortfolioProvider', () => {
  expect(() => renderHook(() => usePortfolioContext())).toThrow(
    'usePortfolioContext must be used within a PortfolioProvider'
  );
});

// 通常の利用: baseCurrency の初期値と toggleCurrency の動作を検証
it('provides context values and toggleCurrency works', () => {
  const wrapper = ({ children }) => <PortfolioProvider>{children}</PortfolioProvider>;
  const { result } = renderHook(() => usePortfolioContext(), { wrapper });

  expect(result.current.baseCurrency).toBe('JPY');

  act(() => {
    result.current.toggleCurrency();
  });

  expect(result.current.baseCurrency).toBe('USD');
});
