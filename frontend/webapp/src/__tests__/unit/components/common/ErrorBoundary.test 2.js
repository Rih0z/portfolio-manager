/**
 * ErrorBoundary.jsx のユニットテスト
 * Reactエラーバウンダリのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../../../components/common/ErrorBoundary';
import * as errorHandler from '../../../../utils/errorHandler';

// エラーハンドラーのモック
jest.mock('../../../../utils/errorHandler', () => ({
  logErrorToService: jest.fn(),
  sanitizeError: jest.fn()
}));

// テスト用のエラーを投げるコンポーネント
const ThrowError = ({ shouldThrow, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>正常なコンポーネント</div>;
};

// コンソールエラーを抑制
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  let mockLogErrorToService;
  let mockSanitizeError;

  beforeEach(() => {
    // コンソールエラーを抑制（Reactの警告を減らすため）
    console.error = jest.fn();
    
    // モック関数の初期化
    mockLogErrorToService = errorHandler.logErrorToService;
    mockSanitizeError = errorHandler.sanitizeError;
    
    mockLogErrorToService.mockResolvedValue();
    mockSanitizeError.mockReturnValue({
      message: 'エラーが発生しました。しばらくしてから再度お試しください。',
      code: 'UNKNOWN_ERROR',
      userFriendly: true
    });
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('正常な子コンポーネントを表示する', () => {
    render(
      <ErrorBoundary>
        <div>正常なコンテンツ</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument();
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
  });

  it('エラー発生時にデフォルトのエラーUIを表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByText('エラーが発生しました。しばらくしてから再度お試しください。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
  });

  it('エラー発生時にsanitizeErrorを呼び出す', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockSanitizeError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('エラー発生時にlogErrorToServiceを呼び出す', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(mockLogErrorToService).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  it('再読み込みボタンが存在し、クリック可能である', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラーUIが表示されることを確認
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

    // 再読み込みボタンが存在することを確認
    const resetButton = screen.getByRole('button', { name: '再読み込み' });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).not.toBeDisabled();

    // ボタンがクリック可能であることを確認
    fireEvent.click(resetButton);
    // クリックしてもエラーが発生しないことを確認
  });

  it('開発環境でエラー詳細を表示する', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="詳細テストエラー" />
      </ErrorBoundary>
    );

    expect(screen.getByText('詳細を表示')).toBeInTheDocument();

    // 詳細を展開
    fireEvent.click(screen.getByText('詳細を表示'));

    // エラー情報が表示されることを確認
    expect(screen.getByText(/Error: 詳細テストエラー/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('本番環境ではエラー詳細を表示しない', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('詳細を表示')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('カスタムfallback関数を使用する', () => {
    const customFallback = (error, errorInfo, reset) => (
      <div>
        <h1>カスタムエラー</h1>
        <p>カスタムエラーメッセージ</p>
        <button onClick={reset}>カスタム再読み込み</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('カスタムエラー')).toBeInTheDocument();
    expect(screen.getByText('カスタムエラーメッセージ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'カスタム再読み込み' })).toBeInTheDocument();
  });

  it('カスタムfallbackコンポーネントを使用する', () => {
    const customFallback = <div>カスタムフォールバックコンポーネント</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('カスタムフォールバックコンポーネント')).toBeInTheDocument();
  });

  it('カスタムfallback関数でリセット関数が渡される', () => {
    let receivedReset = null;
    
    const customFallback = (error, errorInfo, reset) => {
      receivedReset = reset;
      return (
        <div>
          <button onClick={reset}>カスタムリセット</button>
        </div>
      );
    };

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // reset関数が渡されたことを確認
    expect(receivedReset).toBeInstanceOf(Function);

    // カスタムリセットボタンが存在することを確認
    const resetButton = screen.getByRole('button', { name: 'カスタムリセット' });
    expect(resetButton).toBeInTheDocument();

    // ボタンがクリック可能であることを確認
    fireEvent.click(resetButton);
  });

  it('logErrorToServiceでエラーが発生した場合の処理', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const logError = new Error('ログ送信エラー');
    mockLogErrorToService.mockRejectedValue(logError);

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('エラーログの送信に失敗:', logError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('元のエラー:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('複数の子要素がある場合でも正常に動作する', () => {
    render(
      <ErrorBoundary>
        <div>子要素1</div>
        <div>子要素2</div>
        <div>子要素3</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('子要素1')).toBeInTheDocument();
    expect(screen.getByText('子要素2')).toBeInTheDocument();
    expect(screen.getByText('子要素3')).toBeInTheDocument();
  });

  it('ネストしたエラーバウンダリが正しく動作する', () => {
    render(
      <ErrorBoundary>
        <div>外側の正常なコンテンツ</div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // 外側は正常、内側でエラーが捕捉される
    expect(screen.getByText('外側の正常なコンテンツ')).toBeInTheDocument();
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });

  it('getDerivedStateFromErrorが正しく状態を更新する', () => {
    const error = new Error('テストエラー');
    const result = ErrorBoundary.getDerivedStateFromError(error);

    expect(result).toEqual({
      hasError: true,
      error: error
    });
  });

  it('初期状態が正しく設定される', () => {
    const boundary = new ErrorBoundary({});
    
    expect(boundary.state).toEqual({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  });

  it('resetError メソッドが状態を正しくリセットする', () => {
    const boundary = new ErrorBoundary({});
    
    // 手動でエラー状態を設定
    boundary.state = {
      hasError: true,
      error: new Error('テスト'),
      errorInfo: { componentStack: 'test' },
      retryCount: 1
    };

    // setState をスパイして呼び出し引数を確認
    const setStateSpy = jest.spyOn(boundary, 'setState');

    // リセットを実行
    boundary.resetError();

    // setStateが正しい引数で呼ばれたことを確認
    expect(setStateSpy).toHaveBeenCalledWith({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    setStateSpy.mockRestore();
  });

  it('異なるエラーメッセージを正しく表示する', () => {
    mockSanitizeError.mockReturnValue({
      message: 'カスタムエラーメッセージ',
      code: 'CUSTOM_ERROR',
      userFriendly: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('カスタムエラーメッセージ')).toBeInTheDocument();
  });

  it('className属性が正しく適用される', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByText('エラーが発生しました').closest('div');
    expect(errorContainer).toHaveClass('p-4', 'border', 'border-red-200', 'rounded-md', 'bg-red-50', 'my-4');
  });
});