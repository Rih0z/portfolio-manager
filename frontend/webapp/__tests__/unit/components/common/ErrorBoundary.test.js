/**
 * ファイルパス: __test__/unit/components/common/ErrorBoundary.test.js
 *
 * ErrorBoundaryコンポーネントの単体テスト
 * 子コンポーネントで発生した例外のハンドリング、再読み込み機能、
 * カスタムフォールバック、開発環境での詳細表示をテスト
 *
 * @author プロジェクトチーム
 * @created 2025-05-21
 * @updated 2025-07-02
 */

import React from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { logErrorToService, sanitizeError } from '@/utils/errorHandler';

// エラーハンドラーのモック
jest.mock('@/utils/errorHandler', () => ({
  logErrorToService: jest.fn().mockResolvedValue(),
  sanitizeError: jest.fn((error) => ({ 
    message: error?.message || 'エラーが発生しました' 
  }))
}));

// エラーを投げるテスト用コンポーネント
const BrokenComponent = ({ error = new Error('Test error') }) => {
  throw error;
};

// 正常なテスト用コンポーネント
const WorkingComponent = () => {
  return <div>正常に動作しています</div>;
};

// カウンターコンポーネント（状態リセットテスト用）
const CounterComponent = ({ shouldError = false }) => {
  const [count, setCount] = React.useState(0);
  
  if (shouldError && count > 2) {
    throw new Error('Counter error');
  }
  
  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

describe('ErrorBoundary コンポーネント', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // React ErrorBoundary のコンソールエラーを抑制
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.env.NODE_ENV = originalEnv;
  });

  describe('基本機能', () => {
    it('エラーが発生しない場合は子要素を正常に表示する', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('正常に動作しています')).toBeInTheDocument();
      expect(logErrorToService).not.toHaveBeenCalled();
    });

    it('子コンポーネントでエラーが発生した場合にフォールバックUIを表示する', () => {
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
    });

    it('エラー情報を sanitizeError で処理する', () => {
      const customError = new Error('Sensitive error details');
      
      render(
        <ErrorBoundary>
          <BrokenComponent error={customError} />
        </ErrorBoundary>
      );
      
      expect(sanitizeError).toHaveBeenCalledWith(customError);
    });

    it('エラーログを非同期で送信する', async () => {
      const error = new Error('Logged error');
      
      render(
        <ErrorBoundary>
          <BrokenComponent error={error} />
        </ErrorBoundary>
      );
      
      await waitFor(() => {
        expect(logErrorToService).toHaveBeenCalledWith(
          error,
          expect.objectContaining({ componentStack: expect.any(String) })
        );
      });
    });

    it('ログ送信に失敗してもアプリケーションはクラッシュしない', async () => {
      logErrorToService.mockRejectedValueOnce(new Error('Logging failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'エラーログの送信に失敗:',
          expect.any(Error)
        );
      });
      
      // フォールバックUIは表示されたまま
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('再読み込み機能', () => {
    it('再読み込みボタンをクリックするとエラー状態がリセットされる', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      
      // 再読み込みボタンをクリック
      fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
      
      // 正常なコンポーネントで再レンダリング
      rerender(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('正常に動作しています')).toBeInTheDocument();
      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
    });

    it('resetError メソッドが状態を正しくリセットする', () => {
      render(
        <ErrorBoundary>
          <CounterComponent shouldError={true} />
        </ErrorBoundary>
      );
      
      // エラーが発生するまでカウンターを増やす
      const button = screen.getByRole('button', { name: 'Increment' });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button); // count = 3でエラー発生
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      
      // 再読み込み
      fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
      
      // カウンターが表示される（リセットされた）
      expect(screen.getByText('Count: 0')).toBeInTheDocument();
    });
  });

  describe('カスタムフォールバック', () => {
    it('関数型のカスタムフォールバックを使用できる', () => {
      const customFallback = jest.fn((error, errorInfo, resetError) => (
        <div>
          <h1>カスタムエラー画面</h1>
          <p>{error.message}</p>
          <button onClick={resetError}>リトライ</button>
        </div>
      ));
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('カスタムエラー画面')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(customFallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) }),
        expect.any(Function)
      );
    });

    it('コンポーネント型のカスタムフォールバックを使用できる', () => {
      const CustomFallback = <div>静的なカスタムフォールバック</div>;
      
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('静的なカスタムフォールバック')).toBeInTheDocument();
      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
    });

    it('カスタムフォールバックから resetError を呼び出せる', () => {
      const customFallback = (error, errorInfo, resetError) => (
        <div>
          <button onClick={resetError}>カスタムリセット</button>
        </div>
      );
      
      const { rerender } = render(
        <ErrorBoundary fallback={customFallback}>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      fireEvent.click(screen.getByRole('button', { name: 'カスタムリセット' }));
      
      rerender(
        <ErrorBoundary fallback={customFallback}>
          <WorkingComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('正常に動作しています')).toBeInTheDocument();
    });
  });

  describe('環境別の表示', () => {
    it('開発環境では詳細情報を表示する', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      const detailsElement = screen.getByText('詳細を表示');
      expect(detailsElement).toBeInTheDocument();
      
      // 詳細を展開
      fireEvent.click(detailsElement);
      
      // エラースタックトレースが表示される
      expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();
    });

    it('本番環境では詳細情報を表示しない', () => {
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText('詳細を表示')).not.toBeInTheDocument();
      expect(screen.queryByText(/Error: Test error/)).not.toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    it('nullエラーでもクラッシュしない', () => {
      // nullをthrowする特殊なコンポーネント
      const NullErrorComponent = () => {
        throw null;
      };
      
      render(
        <ErrorBoundary>
          <NullErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    it('複数の子コンポーネントのうち1つがエラーでも全体をキャッチ', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
          <BrokenComponent />
          <WorkingComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.queryByText('正常に動作しています')).not.toBeInTheDocument();
    });

    it('ネストしたErrorBoundaryで内側のエラーをキャッチ', () => {
      render(
        <ErrorBoundary fallback={<div>外側のエラー</div>}>
          <WorkingComponent />
          <ErrorBoundary fallback={<div>内側のエラー</div>}>
            <BrokenComponent />
          </ErrorBoundary>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('内側のエラー')).toBeInTheDocument();
      expect(screen.getByText('正常に動作しています')).toBeInTheDocument();
      expect(screen.queryByText('外側のエラー')).not.toBeInTheDocument();
    });

    it('componentDidCatch で errorInfo を正しく保存', () => {
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      // logErrorToService が errorInfo と共に呼ばれることを確認
      expect(logErrorToService).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.stringContaining('BrokenComponent')
        })
      );
    });

    it('getDerivedStateFromError が正しく動作', () => {
      // このメソッドは静的メソッドなので、直接テストは難しいが
      // エラーが発生したときに hasError が true になることで間接的に確認
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('スタイルとアクセシビリティ', () => {
    it('エラー表示に適切なスタイルクラスが適用される', () => {
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      const errorContainer = screen.getByText('エラーが発生しました').parentElement;
      expect(errorContainer).toHaveClass('p-4', 'border', 'border-red-200', 'rounded-md', 'bg-red-50', 'my-4');
      
      const errorTitle = screen.getByText('エラーが発生しました');
      expect(errorTitle).toHaveClass('text-lg', 'font-semibold', 'text-red-700', 'mb-2');
      
      const errorMessage = screen.getByText('Test error');
      expect(errorMessage).toHaveClass('text-red-600', 'mb-4');
      
      const resetButton = screen.getByRole('button', { name: '再読み込み' });
      expect(resetButton).toHaveClass('mt-4', 'px-4', 'py-2', 'bg-blue-500', 'text-white', 'rounded', 'hover:bg-blue-600');
    });

    it('開発環境の詳細表示に適切なスタイルが適用される', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );
      
      const detailsElement = screen.getByText('詳細を表示').parentElement;
      expect(detailsElement).toHaveClass('text-sm', 'text-gray-700');
      
      fireEvent.click(screen.getByText('詳細を表示'));
      
      const preElement = screen.getByText(/Error: Test error/).parentElement;
      expect(preElement).toHaveClass('mt-2', 'whitespace-pre-wrap', 'overflow-auto', 'p-2', 'bg-gray-100', 'rounded');
    });
  });
});