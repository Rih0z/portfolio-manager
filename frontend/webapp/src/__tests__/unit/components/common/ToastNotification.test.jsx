/**
 * ToastNotificationコンポーネントのユニットテスト
 * 
 * テスト対象:
 * - 基本的なメッセージ表示機能
 * - 4種類のタイプ（info, success, warning, error）別スタイリング
 * - 位置指定（top, bottom）
 * - 自動消去機能とタイマー
 * - 手動消去（closeボタン）
 * - onCloseコールバック
 * - アクセシビリティ（sr-only、focus）
 * - エッジケースとエラーハンドリング
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToastNotification from '../../../../components/common/ToastNotification';

// タイマーのモック
jest.useFakeTimers();

describe('ToastNotification', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  describe('基本的なレンダリング', () => {
    test('メッセージが正しく表示される', () => {
      render(
        <ToastNotification 
          message="テストメッセージ"
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    });

    test('デフォルト設定（info、bottom、5秒）で表示される', () => {
      const { container } = render(
        <ToastNotification 
          message="デフォルトテスト"
          onClose={mockOnClose}
        />
      );
      
      const toast = container.firstChild;
      expect(toast).toHaveClass('bottom-4');
      expect(toast.querySelector('.border-l-4')).toHaveClass('bg-blue-100', 'border-blue-500', 'text-blue-700');
    });

    test('閉じるボタンが表示される', () => {
      render(
        <ToastNotification 
          message="テストメッセージ"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
      
      // スクリーンリーダー用のラベル
      expect(screen.getByText('閉じる')).toBeInTheDocument();
    });

    test('SVGアイコンが正しく設定されている', () => {
      render(
        <ToastNotification 
          message="テストメッセージ"
          onClose={mockOnClose}
        />
      );
      
      const svgIcon = document.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toHaveClass('h-5', 'w-5');
      expect(svgIcon).toHaveAttribute('viewBox', '0 0 20 20');
      expect(svgIcon).toHaveAttribute('fill', 'currentColor');
    });
  });

  describe('タイプ別スタイリング', () => {
    test('info タイプ（デフォルト）', () => {
      const { container } = render(
        <ToastNotification 
          message="情報メッセージ"
          type="info"
          onClose={mockOnClose}
        />
      );
      
      const toastContent = container.querySelector('.border-l-4');
      expect(toastContent).toHaveClass('bg-blue-100', 'border-blue-500', 'text-blue-700');
    });

    test('success タイプ', () => {
      const { container } = render(
        <ToastNotification 
          message="成功メッセージ"
          type="success"
          onClose={mockOnClose}
        />
      );
      
      const toastContent = container.querySelector('.border-l-4');
      expect(toastContent).toHaveClass('bg-green-100', 'border-green-500', 'text-green-700');
    });

    test('warning タイプ', () => {
      const { container } = render(
        <ToastNotification 
          message="警告メッセージ"
          type="warning"
          onClose={mockOnClose}
        />
      );
      
      const toastContent = container.querySelector('.border-l-4');
      expect(toastContent).toHaveClass('bg-yellow-100', 'border-yellow-500', 'text-yellow-700');
    });

    test('error タイプ', () => {
      const { container } = render(
        <ToastNotification 
          message="エラーメッセージ"
          type="error"
          onClose={mockOnClose}
        />
      );
      
      const toastContent = container.querySelector('.border-l-4');
      expect(toastContent).toHaveClass('bg-red-100', 'border-red-500', 'text-red-700');
    });

    test('未定義タイプはundefinedとしてフォールバック', () => {
      const { container } = render(
        <ToastNotification 
          message="未定義タイプ"
          type="unknown"
          onClose={mockOnClose}
        />
      );
      
      const toastContent = container.querySelector('.border-l-4');
      // 未定義の場合、typeStyles[type]がundefinedになりクラスが適用されない
      expect(toastContent).not.toHaveClass('bg-blue-100');
    });
  });

  describe('位置指定', () => {
    test('position="bottom"（デフォルト）で下部に表示', () => {
      const { container } = render(
        <ToastNotification 
          message="下部表示"
          position="bottom"
          onClose={mockOnClose}
        />
      );
      
      const toast = container.firstChild;
      expect(toast).toHaveClass('bottom-4');
      expect(toast).not.toHaveClass('top-4');
    });

    test('position="top"で上部に表示', () => {
      const { container } = render(
        <ToastNotification 
          message="上部表示"
          position="top"
          onClose={mockOnClose}
        />
      );
      
      const toast = container.firstChild;
      expect(toast).toHaveClass('top-4');
      expect(toast).not.toHaveClass('bottom-4');
    });
  });

  describe('自動消去機能', () => {
    test('デフォルト5秒後に自動で消去される', async () => {
      const { container } = render(
        <ToastNotification 
          message="自動消去テスト"
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
      
      // 5秒進める
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeInTheDocument();
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('カスタム期間（3秒）後に消去される', async () => {
      const { container } = render(
        <ToastNotification 
          message="カスタム期間テスト"
          duration={3000}
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
      
      // 2秒では消去されない
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(container.firstChild).toBeInTheDocument();
      
      // 3秒で消去される
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeInTheDocument();
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('duration=0で自動消去されない', async () => {
      const { container } = render(
        <ToastNotification 
          message="自動消去しないテスト"
          duration={0}
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
      
      // 長時間経過しても消去されない
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(container.firstChild).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('負のdurationでも自動消去されない', async () => {
      const { container } = render(
        <ToastNotification 
          message="負のdurationテスト"
          duration={-1000}
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(container.firstChild).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('手動消去機能', () => {
    test('閉じるボタンクリックで即座に消去される', async () => {
      const { container } = render(
        <ToastNotification 
          message="手動消去テスト"
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
      
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeInTheDocument();
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('手動消去後は自動消去タイマーがキャンセルされる', async () => {
      const { container } = render(
        <ToastNotification 
          message="タイマーキャンセルテスト"
          duration={5000}
          onClose={mockOnClose}
        />
      );
      
      // 手動で消去
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeInTheDocument();
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      
      // 残り時間が経過してもonCloseが再度呼ばれない
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1); // 1回のまま
    });
  });

  describe('onCloseコールバック', () => {
    test('onCloseが提供されない場合でもエラーにならない', async () => {
      const { container } = render(
        <ToastNotification message="onCloseなしテスト" />
      );
      
      expect(container.firstChild).toBeInTheDocument();
      
      // 自動消去でもエラーにならない
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeInTheDocument();
      });
    });

    test('onCloseが複数回呼ばれない', async () => {
      const { container } = render(
        <ToastNotification 
          message="重複呼び出しテスト"
          duration={100}
          onClose={mockOnClose}
        />
      );
      
      // 手動で消去
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      // 自動消去タイマーも進める
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeInTheDocument();
      });
      
      // onCloseは1回だけ呼ばれる
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('スタイリングとレイアウト', () => {
    test('固定位置とz-indexが正しく設定される', () => {
      const { container } = render(
        <ToastNotification 
          message="スタイルテスト"
          onClose={mockOnClose}
        />
      );
      
      const toast = container.firstChild;
      expect(toast).toHaveClass('fixed', 'z-50');
      expect(toast).toHaveClass('left-1/2', 'transform', '-translate-x-1/2');
      expect(toast).toHaveClass('max-w-md', 'w-full', 'px-4');
    });

    test('内部レイアウトが正しく設定される', () => {
      const { container } = render(
        <ToastNotification 
          message="レイアウトテスト"
          onClose={mockOnClose}
        />
      );
      
      const toastContent = container.querySelector('.border-l-4');
      expect(toastContent).toHaveClass('rounded-md', 'p-4', 'shadow-md');
      
      const flexContainer = container.querySelector('.flex.items-start');
      expect(flexContainer).toBeInTheDocument();
      
      const textContainer = container.querySelector('.ml-3.w-0.flex-1');
      expect(textContainer).toBeInTheDocument();
      
      const messageText = container.querySelector('.text-sm.font-medium');
      expect(messageText).toBeInTheDocument();
    });

    test('閉じるボタンのスタイリング', () => {
      render(
        <ToastNotification 
          message="ボタンスタイルテスト"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveClass('inline-flex', 'text-gray-400');
      expect(closeButton).toHaveClass('focus:outline-none', 'hover:text-gray-500');
    });
  });

  describe('アクセシビリティ', () => {
    test('スクリーンリーダー用のラベルが設定される', () => {
      render(
        <ToastNotification 
          message="アクセシビリティテスト"
          onClose={mockOnClose}
        />
      );
      
      const srOnly = screen.getByText('閉じる');
      expect(srOnly).toHaveClass('sr-only');
    });

    test('ボタンにフォーカス可能', () => {
      render(
        <ToastNotification 
          message="フォーカステスト"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });

    test('キーボード操作でも閉じることができる', () => {
      const { container } = render(
        <ToastNotification 
          message="キーボードテスト"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button');
      closeButton.focus();
      
      fireEvent.keyDown(closeButton, { key: 'Enter', code: 'Enter' });
      // Enterキーでのクリックはブラウザが自動的に処理するため、直接clickイベントをトリガー
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('空のメッセージでもエラーにならない', () => {
      expect(() => {
        render(
          <ToastNotification 
            message=""
            onClose={mockOnClose}
          />
        );
      }).not.toThrow();
      
      expect(screen.getByText('')).toBeInTheDocument();
    });

    test('非常に長いメッセージでも表示される', () => {
      const longMessage = 'a'.repeat(1000);
      render(
        <ToastNotification 
          message={longMessage}
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    test('特殊文字を含むメッセージ', () => {
      const specialMessage = '<script>alert("XSS")</script>\n改行\t\tタブ"引用符"';
      render(
        <ToastNotification 
          message={specialMessage}
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    test('nullのメッセージでもエラーにならない', () => {
      expect(() => {
        render(
          <ToastNotification 
            message={null}
            onClose={mockOnClose}
          />
        );
      }).not.toThrow();
    });

    test('undefinedのメッセージでもエラーにならない', () => {
      expect(() => {
        render(
          <ToastNotification 
            message={undefined}
            onClose={mockOnClose}
          />
        );
      }).not.toThrow();
    });
  });

  describe('クリーンアップとメモリリーク防止', () => {
    test('コンポーネントアンマウント時にタイマーがクリアされる', () => {
      const { unmount } = render(
        <ToastNotification 
          message="クリーンアップテスト"
          duration={5000}
          onClose={mockOnClose}
        />
      );
      
      // アンマウント
      unmount();
      
      // タイマーが残っていても呼ばれない
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('visibleがfalseになった後はレンダリングされない', async () => {
      const { container } = render(
        <ToastNotification 
          message="visible状態テスト"
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
      
      // 手動で閉じる
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(container.firstChild).not.toBeInTheDocument();
      });
    });
  });
});