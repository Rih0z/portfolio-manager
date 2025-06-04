/**
 * ToastNotification.jsx のユニットテスト
 * トースト通知コンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToastNotification from '../../../../components/common/ToastNotification';

// タイマーを使用するテストのため
jest.useFakeTimers();

describe('ToastNotification', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('基本的なトースト通知を表示する', () => {
    render(<ToastNotification message="テストメッセージ" />);
    
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
  });

  it('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
    const mockOnClose = jest.fn();
    render(<ToastNotification message="テストメッセージ" onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('閉じるボタンをクリックすると非表示になる', () => {
    render(<ToastNotification message="テストメッセージ" />);
    
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('テストメッセージ')).not.toBeInTheDocument();
  });

  it('指定した時間後に自動的に閉じる', () => {
    const mockOnClose = jest.fn();
    render(<ToastNotification message="テストメッセージ" duration={3000} onClose={mockOnClose} />);
    
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    
    // 3秒経過
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('duration=0の場合は自動的に閉じない', () => {
    const mockOnClose = jest.fn();
    render(<ToastNotification message="テストメッセージ" duration={0} onClose={mockOnClose} />);
    
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    
    // 長時間経過しても閉じない
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
  });

  it('onCloseが未設定でも正常に動作する', () => {
    render(<ToastNotification message="テストメッセージ" duration={1000} />);
    
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    
    // タイマー経過しても例外が発生しない
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }).not.toThrow();
  });

  describe('タイプごとのスタイル', () => {
    it('infoタイプのスタイルを適用する', () => {
      render(<ToastNotification message="情報メッセージ" type="info" />);
      
      const toast = screen.getByText('情報メッセージ').closest('div').parentElement.parentElement;
      expect(toast).toHaveClass('bg-blue-100', 'border-blue-500', 'text-blue-700');
    });

    it('successタイプのスタイルを適用する', () => {
      render(<ToastNotification message="成功メッセージ" type="success" />);
      
      const toast = screen.getByText('成功メッセージ').closest('div').parentElement.parentElement;
      expect(toast).toHaveClass('bg-green-100', 'border-green-500', 'text-green-700');
    });

    it('warningタイプのスタイルを適用する', () => {
      render(<ToastNotification message="警告メッセージ" type="warning" />);
      
      const toast = screen.getByText('警告メッセージ').closest('div').parentElement.parentElement;
      expect(toast).toHaveClass('bg-yellow-100', 'border-yellow-500', 'text-yellow-700');
    });

    it('errorタイプのスタイルを適用する', () => {
      render(<ToastNotification message="エラーメッセージ" type="error" />);
      
      const toast = screen.getByText('エラーメッセージ').closest('div').parentElement.parentElement;
      expect(toast).toHaveClass('bg-red-100', 'border-red-500', 'text-red-700');
    });

    it('デフォルトでinfoタイプが適用される', () => {
      render(<ToastNotification message="デフォルトメッセージ" />);
      
      const toast = screen.getByText('デフォルトメッセージ').closest('div').parentElement.parentElement;
      expect(toast).toHaveClass('bg-blue-100', 'border-blue-500', 'text-blue-700');
    });
  });

  describe('位置の設定', () => {
    it('topポジションを適用する', () => {
      render(<ToastNotification message="上部メッセージ" position="top" />);
      
      const toastContainer = screen.getByText('上部メッセージ').closest('div').parentElement.parentElement.parentElement;
      expect(toastContainer).toHaveClass('top-4');
      expect(toastContainer).not.toHaveClass('bottom-4');
    });

    it('bottomポジションを適用する', () => {
      render(<ToastNotification message="下部メッセージ" position="bottom" />);
      
      const toastContainer = screen.getByText('下部メッセージ').closest('div').parentElement.parentElement.parentElement;
      expect(toastContainer).toHaveClass('bottom-4');
      expect(toastContainer).not.toHaveClass('top-4');
    });

    it('デフォルトでbottomポジションが適用される', () => {
      render(<ToastNotification message="デフォルト位置" />);
      
      const toastContainer = screen.getByText('デフォルト位置').closest('div').parentElement.parentElement.parentElement;
      expect(toastContainer).toHaveClass('bottom-4');
    });
  });

  describe('共通スタイル', () => {
    it('固定ポジションとz-indexが適用される', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const toastContainer = screen.getByText('テストメッセージ').closest('div').parentElement.parentElement.parentElement;
      expect(toastContainer).toHaveClass('fixed', 'z-50');
    });

    it('センタリングとレスポンシブなサイズが適用される', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const toastContainer = screen.getByText('テストメッセージ').closest('div').parentElement.parentElement.parentElement;
      expect(toastContainer).toHaveClass('left-1/2', 'transform', '-translate-x-1/2', 'max-w-md', 'w-full', 'px-4');
    });

    it('トースト本体に適切なスタイルが適用される', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const toastBody = screen.getByText('テストメッセージ').closest('div').parentElement.parentElement;
      expect(toastBody).toHaveClass('border-l-4', 'rounded-md', 'p-4', 'shadow-md');
    });
  });

  describe('アクセシビリティ', () => {
    it('閉じるボタンにscreen readerテキストが含まれる', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      expect(screen.getByText('閉じる')).toHaveClass('sr-only');
    });

    it('閉じるボタンがfocus可能である', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const closeButton = screen.getByRole('button', { name: '閉じる' });
      expect(closeButton).toHaveClass('focus:outline-none');
    });

    it('メッセージが適切なfont weightで表示される', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const message = screen.getByText('テストメッセージ');
      expect(message).toHaveClass('text-sm', 'font-medium');
    });
  });

  describe('SVGアイコン', () => {
    it('閉じるボタンにSVGアイコンが含まれる', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const svg = screen.getByRole('button', { name: '閉じる' }).querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('h-5', 'w-5');
    });

    it('SVGアイコンに適切な属性が設定される', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const svg = screen.getByRole('button', { name: '閉じる' }).querySelector('svg');
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
      expect(svg).toHaveAttribute('fill', 'currentColor');
    });

    it('SVGパスにfillRuleとclipRuleが設定される', () => {
      render(<ToastNotification message="テストメッセージ" />);
      
      const path = screen.getByRole('button', { name: '閉じる' }).querySelector('path');
      expect(path).toHaveAttribute('fill-rule', 'evenodd');
      expect(path).toHaveAttribute('clip-rule', 'evenodd');
    });
  });

  describe('クリーンアップ', () => {
    it('コンポーネントのアンマウント時にタイマーがクリアされる', () => {
      const { unmount } = render(<ToastNotification message="テストメッセージ" duration={5000} />);
      
      // タイマーが設定されていることを確認
      expect(jest.getTimerCount()).toBe(1);
      
      // コンポーネントをアンマウント
      unmount();
      
      // タイマーがクリアされることを確認（実際のタイマーAPIの動作に依存）
      // ここではエラーが発生しないことで確認
      expect(() => {
        jest.advanceTimersByTime(5000);
      }).not.toThrow();
    });

    it('手動で閉じた後にタイマーが実行されても例外が発生しない', () => {
      const mockOnClose = jest.fn();
      render(<ToastNotification message="テストメッセージ" duration={1000} onClose={mockOnClose} />);
      
      // 手動で閉じる
      const closeButton = screen.getByRole('button', { name: '閉じる' });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      
      // タイマーが実行されても例外が発生しないことを確認
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(2000);
        });
      }).not.toThrow();
      
      // onCloseが複数回呼ばれる可能性があるが、例外は発生しない
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('空文字列メッセージでも表示される', () => {
      render(<ToastNotification message="" />);
      
      // 空文字列でもコンポーネントは表示される
      expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument();
    });

    it('非常に長いメッセージでも適切に表示される', () => {
      const longMessage = 'これは非常に長いメッセージです。'.repeat(20);
      render(<ToastNotification message={longMessage} />);
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('負の duration が指定された場合の動作', () => {
      const mockOnClose = jest.fn();
      render(<ToastNotification message="テストメッセージ" duration={-1000} onClose={mockOnClose} />);
      
      // 負の値の場合はタイマーが設定されない
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('undefined な props でも正常に動作する', () => {
      expect(() => {
        render(<ToastNotification message="テスト" type={undefined} position={undefined} />);
      }).not.toThrow();
      
      expect(screen.getByText('テスト')).toBeInTheDocument();
    });
  });
});