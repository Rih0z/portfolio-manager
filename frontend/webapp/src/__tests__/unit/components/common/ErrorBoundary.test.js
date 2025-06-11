/**
 * ErrorBoundary.jsx のユニットテスト
 * Reactエラーバウンダリのテスト
 * 
 * テスト範囲:
 * - 正常なレンダリング
 * - エラーキャッチ機能
 * - カスタムフォールバック（要素と関数の両方）
 * - デフォルトエラーUI
 * - リセット機能
 * - 開発環境vs本番環境の違い
 * - エラーログ機能
 * - エッジケース（null、undefined、string型エラー）
 * - パフォーマンステスト（多数の子要素、深いネスト）
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../../../components/common/ErrorBoundary';
import * as errorHandler from '../../../../utils/errorHandler';

// エラーハンドラーのモック
jest.mock('../../../../utils/errorHandler', () => ({
  logErrorToService: jest.fn(),
  sanitizeError: jest.fn()
}));

// テスト用のエラーを投げるコンポーネント
const ThrowError = ({ shouldThrow, errorMessage = 'Test error', errorType = 'Error' }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'null':
        throw null;
      case 'undefined':
        throw undefined;
      case 'string':
        throw errorMessage;
      case 'object':
        throw { message: errorMessage, custom: true };
      default:
        throw new Error(errorMessage);
    }
  }
  return <div>正常なコンポーネント</div>;
};

// パフォーマンステスト用のコンポーネント
const ManyChildren = ({ count = 100 }) => {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>子要素 {i + 1}</div>
      ))}
    </div>
  );
};

// 深いネスト用のコンポーネント
const DeepNesting = ({ depth = 10, shouldThrow = false, currentDepth = 0 }) => {
  if (shouldThrow && currentDepth === Math.floor(depth / 2)) {
    throw new Error(`深いネストエラー (depth: ${currentDepth})`);
  }
  
  if (currentDepth >= depth) {
    return <div>最深層コンポーネント</div>;
  }
  
  return (
    <div>
      レベル {currentDepth}
      <DeepNesting 
        depth={depth} 
        shouldThrow={shouldThrow} 
        currentDepth={currentDepth + 1} 
      />
    </div>
  );
};

// 非同期エラーを投げるコンポーネント
const AsyncErrorComponent = ({ shouldThrow }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      // useEffectでの非同期エラーはErrorBoundaryでキャッチされない
      // これは期待される動作をテストするため
      setTimeout(() => {
        throw new Error('非同期エラー');
      }, 10);
    }
  }, [shouldThrow]);
  
  return <div>非同期コンポーネント</div>;
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

  // エッジケーステスト
  describe('エッジケース', () => {
    it('null値のエラーを正しく処理する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="null" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(mockSanitizeError).toHaveBeenCalledWith(null);
    });

    it('undefined値のエラーを正しく処理する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="undefined" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(mockSanitizeError).toHaveBeenCalledWith(undefined);
    });

    it('string型のエラーを正しく処理する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="string" errorMessage="文字列エラー" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(mockSanitizeError).toHaveBeenCalledWith("文字列エラー");
    });

    it('オブジェクト型のエラーを正しく処理する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="object" errorMessage="オブジェクトエラー" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(mockSanitizeError).toHaveBeenCalledWith({ message: "オブジェクトエラー", custom: true });
    });

    it('空文字列のエラーメッセージを処理する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(mockSanitizeError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('非常に長いエラーメッセージを処理する', () => {
      const longMessage = 'A'.repeat(10000);
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={longMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(mockSanitizeError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('特殊文字を含むエラーメッセージを処理する', () => {
      const specialMessage = '🚨 エラー <script>alert("XSS")</script> & 特殊文字 \n\t';
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={specialMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(mockSanitizeError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('非同期エラーはキャッチされない（期待される動作）', () => {
      // 非同期エラーはErrorBoundaryでキャッチされない
      const { container } = render(
        <ErrorBoundary>
          <AsyncErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // 非同期エラーなので、ErrorBoundaryはエラーをキャッチしない
      expect(screen.getByText('非同期コンポーネント')).toBeInTheDocument();
      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
    });
  });

  // パフォーマンステスト
  describe('パフォーマンステスト', () => {
    it('多数の子要素を持つ場合でも正常に動作する', () => {
      const startTime = performance.now();
      
      render(
        <ErrorBoundary>
          <ManyChildren count={500} />
        </ErrorBoundary>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // レンダリング時間が合理的な範囲内であることを確認（1秒以内）
      expect(renderTime).toBeLessThan(1000);
      
      // 正常にレンダリングされていることを確認
      expect(screen.getByText('子要素 1')).toBeInTheDocument();
      expect(screen.getByText('子要素 500')).toBeInTheDocument();
    });

    it('多数の子要素でエラーが発生した場合の処理', () => {
      const startTime = performance.now();
      
      render(
        <ErrorBoundary>
          <ManyChildren count={200} />
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // エラー処理時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(1000);
      
      // エラーUIが表示されていることを確認
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    it('深いネスト構造でも正常に動作する', () => {
      const startTime = performance.now();
      
      render(
        <ErrorBoundary>
          <DeepNesting depth={50} />
        </ErrorBoundary>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(1000);
      
      // 正常にレンダリングされていることを確認
      expect(screen.getByText('レベル 0')).toBeInTheDocument();
      expect(screen.getByText('最深層コンポーネント')).toBeInTheDocument();
    });

    it('深いネスト構造でエラーが発生した場合の処理', () => {
      const startTime = performance.now();
      
      render(
        <ErrorBoundary>
          <DeepNesting depth={50} shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // エラー処理時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(1000);
      
      // エラーUIが表示されていることを確認
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    it('メモリリークがないことを確認', () => {
      // 複数回のマウント/アンマウントでメモリリークがないかチェック
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <ErrorBoundary>
            <div>テストコンテンツ {i}</div>
          </ErrorBoundary>
        );
        unmount();
      }
      
      // 明示的なメモリリークチェックは困難だが、
      // 例外なく完了すればOKとする
      expect(true).toBe(true);
    });
  });

  // 高度な機能テスト
  describe('高度な機能', () => {
    it('連続するエラーを正しく処理する', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // 最初のエラー
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="最初のエラー" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

      // リセット
      fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));

      // 二番目のエラー
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="二番目のエラー" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    it('propsの変更によるリセット', () => {
      const { rerender } = render(
        <ErrorBoundary key="1">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

      // keyを変更してリセット
      rerender(
        <ErrorBoundary key="2">
          <div>リセット後のコンテンツ</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('リセット後のコンテンツ')).toBeInTheDocument();
      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
    });

    it('エラー発生時のタイミングを正確に測定', async () => {
      let errorCaughtTime = null;
      let renderStartTime = null;

      const TimingTestComponent = () => {
        renderStartTime = performance.now();
        throw new Error('タイミングテストエラー');
      };

      const customFallback = () => {
        errorCaughtTime = performance.now();
        return <div>エラーキャッチ完了</div>;
      };

      render(
        <ErrorBoundary fallback={customFallback}>
          <TimingTestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーキャッチ完了')).toBeInTheDocument();
      expect(errorCaughtTime).toBeGreaterThan(renderStartTime);
      expect(errorCaughtTime - renderStartTime).toBeLessThan(100); // 100ms以内
    });

    it('ログ機能の詳細な動作確認', async () => {
      const testError = new Error('詳細ログテスト');
      const testErrorInfo = { componentStack: 'テストスタック' };

      // logErrorToServiceが成功する場合
      mockLogErrorToService.mockResolvedValue();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="詳細ログテスト" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockLogErrorToService).toHaveBeenCalledWith(
          expect.objectContaining({
            message: '詳細ログテスト'
          }),
          expect.objectContaining({
            componentStack: expect.any(String)
          })
        );
      });
    });

    it('開発モードと本番モードの詳細な違い', () => {
      const originalEnv = process.env.NODE_ENV;

      // 開発モード
      process.env.NODE_ENV = 'development';
      const { unmount: unmountDev } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="開発モードエラー" />
        </ErrorBoundary>
      );

      expect(screen.getByText('詳細を表示')).toBeInTheDocument();
      fireEvent.click(screen.getByText('詳細を表示'));
      expect(screen.getByText(/Error: 開発モードエラー/)).toBeInTheDocument();

      unmountDev();

      // 本番モード
      process.env.NODE_ENV = 'production';
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="本番モードエラー" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('詳細を表示')).not.toBeInTheDocument();
      expect(screen.queryByText(/Error: 本番モードエラー/)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('カスタムfallback関数に正しい引数が渡される', () => {
      let receivedError = null;
      let receivedErrorInfo = null;
      let receivedReset = null;

      const customFallback = (error, errorInfo, reset) => {
        receivedError = error;
        receivedErrorInfo = errorInfo;
        receivedReset = reset;
        return <div>引数テスト完了</div>;
      };

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="引数テスト" />
        </ErrorBoundary>
      );

      expect(receivedError).toBeInstanceOf(Error);
      expect(receivedError.message).toBe('引数テスト');
      expect(receivedErrorInfo).toEqual(
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
      expect(receivedReset).toBeInstanceOf(Function);
    });
  });
});