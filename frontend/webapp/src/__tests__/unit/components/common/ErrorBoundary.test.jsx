/**
 * ErrorBoundary.jsx のテストファイル
 * エラーバウンダリコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../../../components/common/ErrorBoundary';
import { logErrorToService, sanitizeError } from '../../../../utils/errorHandler';

// モック
jest.mock('../../../../utils/errorHandler', () => ({
  logErrorToService: jest.fn(),
  sanitizeError: jest.fn((error) => ({
    message: error?.message || 'エラーが発生しました',
    type: error?.name || 'Error'
  }))
}));

// エラーを投げるテストコンポーネント
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('テストエラー');
  }
  return <div>正常なコンテンツ</div>;
};

// React 18のエラーをコンソールから隠す
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常時の動作', () => {
    test('エラーがない場合は子コンポーネントを表示する', () => {
      render(
        <ErrorBoundary>
          <div>子コンポーネント</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('子コンポーネント')).toBeInTheDocument();
    });

    test('複数の子コンポーネントを正しく表示する', () => {
      render(
        <ErrorBoundary>
          <div>コンポーネント1</div>
          <div>コンポーネント2</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('コンポーネント1')).toBeInTheDocument();
      expect(screen.getByText('コンポーネント2')).toBeInTheDocument();
    });
  });

  describe('エラー時の動作', () => {
    test('エラーが発生した場合はフォールバックUIを表示する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('テストエラー')).toBeInTheDocument();
      expect(screen.queryByText('正常なコンテンツ')).not.toBeInTheDocument();
    });

    test('再読み込みボタンが表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('再読み込み');
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveClass('bg-blue-500');
    });

    test('再読み込みボタンをクリックするとエラー状態がリセットされる', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

      // 再読み込みボタンをクリック
      fireEvent.click(screen.getByText('再読み込み'));

      // エラーを投げないコンポーネントで再レンダリング
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
      expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument();
    });
  });

  describe('開発環境での動作', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('開発環境では詳細情報が表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText('詳細を表示');
      expect(detailsElement).toBeInTheDocument();
    });

    test('詳細を展開するとスタックトレースが表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText('詳細を表示');
      fireEvent.click(detailsElement);

      // エラーの詳細が表示されることを確認
      const preElement = screen.getByRole('textbox', { hidden: true });
      expect(preElement).toBeInTheDocument();
    });
  });

  describe('本番環境での動作', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('本番環境では詳細情報が表示されない', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('詳細を表示')).not.toBeInTheDocument();
    });
  });

  describe('カスタムフォールバック', () => {
    test('関数形式のカスタムフォールバックを使用できる', () => {
      const customFallback = jest.fn((error, errorInfo, resetError) => (
        <div>
          <h1>カスタムエラー</h1>
          <p>{error.message}</p>
          <button onClick={resetError}>リセット</button>
        </div>
      ));

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('カスタムエラー')).toBeInTheDocument();
      expect(screen.getByText('テストエラー')).toBeInTheDocument();
      expect(customFallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('JSX形式のカスタムフォールバックを使用できる', () => {
      const customFallback = <div>静的なカスタムエラー画面</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('静的なカスタムエラー画面')).toBeInTheDocument();
    });

    test('カスタムフォールバックのリセット機能が動作する', () => {
      let resetFunction;
      const customFallback = (error, errorInfo, resetError) => {
        resetFunction = resetError;
        return <button onClick={resetError}>カスタムリセット</button>;
      };

      const { rerender } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('カスタムリセット'));

      rerender(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument();
    });
  });

  describe('エラーログ機能', () => {
    test('エラーが発生した場合はlogErrorToServiceが呼ばれる', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(logErrorToService).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    test('ログ送信に失敗してもアプリケーションはクラッシュしない', async () => {
      logErrorToService.mockRejectedValueOnce(new Error('ログ送信失敗'));

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 0));

      // エラー画面は正常に表示される
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('エラーのサニタイズ', () => {
    test('エラーメッセージがサニタイズされる', () => {
      sanitizeError.mockReturnValueOnce({
        message: 'サニタイズされたメッセージ',
        type: 'CustomError'
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(sanitizeError).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByText('サニタイズされたメッセージ')).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    test('nullエラーでもクラッシュしない', () => {
      const ThrowNull = () => {
        throw null;
      };

      render(
        <ErrorBoundary>
          <ThrowNull />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    test('undefinedエラーでもクラッシュしない', () => {
      const ThrowUndefined = () => {
        throw undefined;
      };

      render(
        <ErrorBoundary>
          <ThrowUndefined />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    test('文字列エラーでもクラッシュしない', () => {
      const ThrowString = () => {
        throw '文字列エラー';
      };

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    test('複数回エラーが発生してもリセットできる', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // 最初のエラー
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

      // リセット
      fireEvent.click(screen.getByText('再読み込み'));

      // 正常な状態
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument();

      // 再度エラー
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('React 18対応', () => {
    test('getDerivedStateFromErrorが正しく動作する', () => {
      const error = new Error('テストエラー');
      const state = ErrorBoundary.getDerivedStateFromError(error);
      
      expect(state).toEqual({
        hasError: true,
        error: error
      });
    });
  });
});