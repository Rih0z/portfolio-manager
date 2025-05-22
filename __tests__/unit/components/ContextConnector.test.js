/**
 * ファイルパス: __tests__/unit/components/ContextConnector.test.js
 *
 * ContextConnector コンポーネントの単体テスト
 * AuthContext と PortfolioContext の接続処理を検証
 */

import React from 'react';
import { render } from '@testing-library/react';
import ContextConnector from '@/components/common/ContextConnector';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/usePortfolioContext', () => ({ usePortfolioContext: jest.fn() }));

const { useAuth } = require('@/hooks/useAuth');
const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('ContextConnector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls setPortfolioContextRef with portfolio context', () => {
    const setRef = jest.fn();
    const portfolio = { foo: 'bar' };
    useAuth.mockReturnValue({ setPortfolioContextRef: setRef });
    usePortfolioContext.mockReturnValue(portfolio);

    render(<ContextConnector />);

    expect(setRef).toHaveBeenCalledWith(portfolio);
  });

  it('does nothing when setPortfolioContextRef is undefined', () => {
    const portfolio = { foo: 'bar' };
    useAuth.mockReturnValue({});
    usePortfolioContext.mockReturnValue(portfolio);

    render(<ContextConnector />);

    expect(useAuth).toHaveBeenCalled();
    expect(usePortfolioContext).toHaveBeenCalled();
  });
});
