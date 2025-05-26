import React from 'react';
import { renderHook } from '@testing-library/react';
import { PortfolioProvider, encryptData, decryptData } from '@/context/PortfolioContext';
import usePortfolioContext from '@/hooks/usePortfolioContext';

const wrapper = ({ children }) => <PortfolioProvider>{children}</PortfolioProvider>;

describe('PortfolioContext additional utilities', () => {
  test('encryptData and decryptData work symmetrically', () => {
    const data = { foo: 'bar', num: 1 };
    const encrypted = encryptData(data);
    expect(typeof encrypted).toBe('string');
    const decrypted = decryptData(encrypted);
    expect(decrypted).toEqual(data);
  });

  test('encryptData handles circular structure', () => {
    const obj = {};
    obj.self = obj;
    expect(encryptData(obj)).toBeNull();
  });

  test('decryptData returns null when input is invalid', () => {
    expect(decryptData('not-base64')).toBeNull();
  });

  test('exportData returns current portfolio state', () => {
    const { result } = renderHook(() => usePortfolioContext(), { wrapper });
    const data = result.current.exportData();
    expect(data.baseCurrency).toBe('JPY');
    expect(data.currentAssets).toEqual([]);
    expect(data.targetPortfolio).toEqual([]);
    expect(data.additionalBudget).toEqual({ amount: 300000, currency: 'JPY' });
  });

  test('validateAssetTypes fixes incorrect asset info', () => {
    const { result } = renderHook(() => usePortfolioContext(), { wrapper });
    const assets = [{
      ticker: 'AAPL',
      name: 'Apple',
      fundType: 'ETF（米国）',
      isStock: false,
      annualFee: 0.5,
      feeSource: 'test',
      feeIsEstimated: true,
      dividendYield: 0,
      hasDividend: false,
      dividendFrequency: '',
      dividendIsEstimated: true
    }];

    const { updatedAssets, changes } = result.current.validateAssetTypes(assets);
    expect(updatedAssets[0].fundType).toBe('個別株');
    expect(updatedAssets[0].isStock).toBe(true);
    expect(changes.fundType).toBe(1);
  });
});
