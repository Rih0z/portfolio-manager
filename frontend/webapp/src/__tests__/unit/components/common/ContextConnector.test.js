import React from 'react';
import { render } from '@testing-library/react';
import ContextConnector from '../../../../components/common/ContextConnector';
import { useAuth } from '../../../../hooks/useAuth';
import { usePortfolioContext } from '../../../../hooks/usePortfolioContext';

// Mock hooks
jest.mock('../../../../hooks/useAuth');
jest.mock('../../../../hooks/usePortfolioContext');

describe('ContextConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('両方のコンテキストが存在する場合に参照を設定する', () => {
    const mockSetPortfolioContextRef = jest.fn();
    const mockPortfolioContext = {
      handleAuthStateChange: jest.fn(),
      someData: 'test'
    };

    useAuth.mockReturnValue({
      setPortfolioContextRef: mockSetPortfolioContextRef,
      user: { email: 'test@example.com' },
      isAuthenticated: true
    });

    usePortfolioContext.mockReturnValue(mockPortfolioContext);

    render(<ContextConnector />);

    expect(mockSetPortfolioContextRef).toHaveBeenCalledWith(mockPortfolioContext);
    expect(mockSetPortfolioContextRef).toHaveBeenCalledTimes(1);
  });

  test('setPortfolioContextRefが存在しない場合は何もしない', () => {
    const mockPortfolioContext = {
      handleAuthStateChange: jest.fn()
    };

    useAuth.mockReturnValue({
      // setPortfolioContextRefがない
      user: null,
      isAuthenticated: false
    });

    usePortfolioContext.mockReturnValue(mockPortfolioContext);

    render(<ContextConnector />);

    // エラーが発生しないことを確認
    expect(() => render(<ContextConnector />)).not.toThrow();
  });

  test('ポートフォリオコンテキストがnullの場合は何もしない', () => {
    const mockSetPortfolioContextRef = jest.fn();

    useAuth.mockReturnValue({
      setPortfolioContextRef: mockSetPortfolioContextRef,
      user: null,
      isAuthenticated: false
    });

    usePortfolioContext.mockReturnValue(null);

    render(<ContextConnector />);

    expect(mockSetPortfolioContextRef).not.toHaveBeenCalled();
  });

  test('両方のコンテキストがnullの場合でもエラーが発生しない', () => {
    useAuth.mockReturnValue(null);
    usePortfolioContext.mockReturnValue(null);

    expect(() => render(<ContextConnector />)).not.toThrow();
  });

  test('コンポーネントは何もレンダリングしない', () => {
    useAuth.mockReturnValue({
      setPortfolioContextRef: jest.fn()
    });
    usePortfolioContext.mockReturnValue({});

    const { container } = render(<ContextConnector />);

    expect(container.firstChild).toBeNull();
  });

  test('依存配列の変更で再実行される', () => {
    const mockSetPortfolioContextRef = jest.fn();
    const mockPortfolioContext1 = { id: 1 };
    const mockPortfolioContext2 = { id: 2 };

    const authValue = {
      setPortfolioContextRef: mockSetPortfolioContextRef
    };

    useAuth.mockReturnValue(authValue);
    usePortfolioContext.mockReturnValueOnce(mockPortfolioContext1);

    const { rerender } = render(<ContextConnector />);

    expect(mockSetPortfolioContextRef).toHaveBeenCalledWith(mockPortfolioContext1);
    expect(mockSetPortfolioContextRef).toHaveBeenCalledTimes(1);

    // ポートフォリオコンテキストを変更
    usePortfolioContext.mockReturnValueOnce(mockPortfolioContext2);
    rerender(<ContextConnector />);

    expect(mockSetPortfolioContextRef).toHaveBeenCalledWith(mockPortfolioContext2);
    expect(mockSetPortfolioContextRef).toHaveBeenCalledTimes(2);
  });

  test('authコンテキストの変更で再実行される', () => {
    const mockSetPortfolioContextRef1 = jest.fn();
    const mockSetPortfolioContextRef2 = jest.fn();
    const mockPortfolioContext = { data: 'test' };

    useAuth.mockReturnValueOnce({
      setPortfolioContextRef: mockSetPortfolioContextRef1
    });
    usePortfolioContext.mockReturnValue(mockPortfolioContext);

    const { rerender } = render(<ContextConnector />);

    expect(mockSetPortfolioContextRef1).toHaveBeenCalledWith(mockPortfolioContext);
    expect(mockSetPortfolioContextRef1).toHaveBeenCalledTimes(1);

    // authコンテキストを変更
    useAuth.mockReturnValueOnce({
      setPortfolioContextRef: mockSetPortfolioContextRef2
    });
    rerender(<ContextConnector />);

    expect(mockSetPortfolioContextRef2).toHaveBeenCalledWith(mockPortfolioContext);
    expect(mockSetPortfolioContextRef2).toHaveBeenCalledTimes(1);
  });

  test('マウント時に一度だけ実行される', () => {
    const mockSetPortfolioContextRef = jest.fn();
    const mockPortfolioContext = { data: 'test' };

    useAuth.mockReturnValue({
      setPortfolioContextRef: mockSetPortfolioContextRef
    });
    usePortfolioContext.mockReturnValue(mockPortfolioContext);

    const { rerender } = render(<ContextConnector />);

    expect(mockSetPortfolioContextRef).toHaveBeenCalledTimes(1);

    // 同じ値で再レンダリング
    rerender(<ContextConnector />);

    // 依存配列が変わっていないので再実行されない
    expect(mockSetPortfolioContextRef).toHaveBeenCalledTimes(1);
  });

  test('アンマウント時にクリーンアップは必要ない', () => {
    const mockSetPortfolioContextRef = jest.fn();
    const mockPortfolioContext = { data: 'test' };

    useAuth.mockReturnValue({
      setPortfolioContextRef: mockSetPortfolioContextRef
    });
    usePortfolioContext.mockReturnValue(mockPortfolioContext);

    const { unmount } = render(<ContextConnector />);

    expect(mockSetPortfolioContextRef).toHaveBeenCalledTimes(1);

    // アンマウント
    unmount();

    // クリーンアップ関数がないので追加の呼び出しはない
    expect(mockSetPortfolioContextRef).toHaveBeenCalledTimes(1);
  });

  test('実際の使用シナリオをシミュレート', () => {
    const mockSetPortfolioContextRef = jest.fn();
    const mockHandleAuthStateChange = jest.fn();
    
    const mockPortfolioContext = {
      handleAuthStateChange: mockHandleAuthStateChange,
      portfolioData: { holdings: [] },
      updatePortfolio: jest.fn()
    };

    const mockAuthContext = {
      setPortfolioContextRef: mockSetPortfolioContextRef,
      user: { email: 'user@example.com', name: 'Test User' },
      isAuthenticated: true,
      loginWithGoogle: jest.fn(),
      logout: jest.fn()
    };

    useAuth.mockReturnValue(mockAuthContext);
    usePortfolioContext.mockReturnValue(mockPortfolioContext);

    render(<ContextConnector />);

    // ポートフォリオコンテキストが正しく設定される
    expect(mockSetPortfolioContextRef).toHaveBeenCalledWith(mockPortfolioContext);
    
    // 設定されたコンテキストにはhandleAuthStateChangeが含まれている
    const passedContext = mockSetPortfolioContextRef.mock.calls[0][0];
    expect(passedContext.handleAuthStateChange).toBe(mockHandleAuthStateChange);
  });
});