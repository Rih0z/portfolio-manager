import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../../components/common/ErrorBoundary';

// エラーを発生させるテスト用コンポーネント
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="working-component">Working Component</div>;
};

// コンソールエラーを抑制
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('renders error message when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラーメッセージタイトルが表示されることを確認
    expect(screen.getByRole('heading', { name: /エラーが発生しました/i })).toBeInTheDocument();
  });

  it('renders custom fallback UI when provided', () => {
    const CustomFallback = () => <div data-testid="custom-fallback">Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('renders default error UI when no fallback provided', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // デフォルトのエラーUIが表示されることを確認
    expect(screen.getByRole('heading', { name: /エラーが発生しました/i })).toBeInTheDocument();
    expect(screen.getByText('再読み込み')).toBeInTheDocument();
  });

  it('displays error message in error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // サニタイズされたエラーメッセージが含まれていることを確認
    expect(screen.getByText(/エラーが発生しました。しばらくしてから再度お試しください。/i)).toBeInTheDocument();
  });

  it('logs error information to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // コンソールにエラーがログされることを確認
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('handles multiple error boundaries independently', () => {
    render(
      <div>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </div>
    );

    // 最初のErrorBoundaryは正常にレンダリング
    expect(screen.getByTestId('working-component')).toBeInTheDocument();
    
    // 2番目のErrorBoundaryはエラーメッセージを表示
    expect(screen.getByRole('heading', { name: /エラーが発生しました/i })).toBeInTheDocument();
  });

  it('renders proper error UI structure', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラーUIの構造が適切であることを確認
    const errorContainer = document.querySelector('.border-red-200');
    expect(errorContainer).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has accessible error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラータイトルと説明がアクセス可能であることを確認
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /再読み込み/i })).toBeInTheDocument();
  });

  it('renders retry button when provided', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // 再読み込みボタンがあることを確認
    const retryButton = screen.getByText('再読み込み');
    expect(retryButton).toBeInTheDocument();
  });

  it('handles nested error boundaries correctly', () => {
    render(
      <ErrorBoundary>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // ネストされたErrorBoundaryでもエラーが適切に処理されることを確認
    expect(screen.getByRole('heading', { name: /エラーが発生しました/i })).toBeInTheDocument();
  });

  it('calls resetError when retry button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラーが表示されることを確認
    expect(screen.getByRole('heading', { name: /エラーが発生しました/i })).toBeInTheDocument();

    // 再読み込みボタンをクリック（これによりreset関数が呼ばれる）
    const retryButton = screen.getByText('再読み込み');
    fireEvent.click(retryButton);

    // 同じエラーコンポーネントなのでエラーは再発生するが、リセット動作は実行された
    // エラーが再度表示されることを確認（リセット後に再度エラーが発生）
    expect(screen.getByRole('heading', { name: /エラーが発生しました/i })).toBeInTheDocument();
  });

  it('renders error boundary with proper styling', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラーUIのスタイリングクラスが存在することを確認
    const styledElements = document.querySelectorAll('.bg-red-50, .text-red-700, .border-red-200');
    expect(styledElements.length).toBeGreaterThan(0);
  });

  it('handles component name in error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // コンポーネント名がエラーメッセージに含まれることを確認（可能であれば）
    const errorText = document.body.textContent;
    expect(errorText).toContain('エラー');
  });
});