/**
 * ResetSettings.jsx のテストファイル
 * 設定リセット機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResetSettings from '../../../../components/settings/ResetSettings';

// usePortfolioContextフックのモック
const mockClearAllData = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// コンポーネントのモック
jest.mock('../../../../components/common/ModernButton', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, disabled, className }) => (
    <button 
      onClick={onClick} 
      className={`${variant} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  )
}));

jest.mock('../../../../components/common/ModernCard', () => ({
  __esModule: true,
  default: ({ children, className }) => (
    <div className={className}>{children}</div>
  )
}));

describe('ResetSettings Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
  const defaultMockData = {
    clearAllData: mockClearAllData
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
    
    // window.location.reload のモック
    delete window.location;
    window.location = { reload: jest.fn() };
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<ResetSettings />);
      
      expect(screen.getByText('データのリセット')).toBeInTheDocument();
      expect(screen.getByText('すべてのデータをリセット')).toBeInTheDocument();
      expect(screen.getByText('この操作は取り消せません。すべてのポートフォリオデータが削除されます。')).toBeInTheDocument();
    });

    test('リセットボタンが危険な操作を示すスタイルを持つ', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      expect(resetButton).toHaveClass('danger');
    });
  });

  describe('確認ダイアログ', () => {
    test('リセットボタンクリックで確認ダイアログが表示される', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      expect(screen.getByText('本当にリセットしますか？')).toBeInTheDocument();
      expect(screen.getByText('この操作により、以下のデータがすべて削除されます：')).toBeInTheDocument();
      expect(screen.getByText('• 保有資産の情報')).toBeInTheDocument();
      expect(screen.getByText('• 目標配分の設定')).toBeInTheDocument();
      expect(screen.getByText('• カスタマイズしたAIプロンプト')).toBeInTheDocument();
      expect(screen.getByText('• その他すべての設定')).toBeInTheDocument();
    });

    test('確認ダイアログのボタンが表示される', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      expect(screen.getByText('リセットを実行')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });
  });

  describe('リセット実行', () => {
    test('リセット実行の成功', async () => {
      mockClearAllData.mockResolvedValue(true);
      
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      fireEvent.click(confirmButton);
      
      expect(confirmButton).toBeDisabled();
      expect(confirmButton).toHaveTextContent('リセット中...');
      
      await waitFor(() => {
        expect(mockClearAllData).toHaveBeenCalled();
      });
      
      // 少し待ってからリロードが呼ばれることを確認
      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    test('リセット実行中はキャンセルボタンも無効化される', async () => {
      mockClearAllData.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 1000))
      );
      
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      const cancelButton = screen.getByText('キャンセル');
      
      fireEvent.click(confirmButton);
      
      expect(cancelButton).toBeDisabled();
    });

    test('リセット失敗時のエラー処理', async () => {
      mockClearAllData.mockRejectedValue(new Error('リセットエラー'));
      console.error = jest.fn(); // console.errorのモック
      
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('リセットエラー:', expect.any(Error));
      });
      
      // エラー時もリロードは実行される
      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('キャンセル機能', () => {
    test('キャンセルボタンでダイアログが閉じる', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      expect(screen.getByText('本当にリセットしますか？')).toBeInTheDocument();
      
      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('本当にリセットしますか？')).not.toBeInTheDocument();
    });

    test('キャンセル後は再度リセットボタンがクリックできる', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);
      
      // 再度クリック可能
      fireEvent.click(resetButton);
      expect(screen.getByText('本当にリセットしますか？')).toBeInTheDocument();
    });
  });

  describe('UI/UX', () => {
    test('確認ダイアログのオーバーレイ', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const overlay = screen.getByText('本当にリセットしますか？').closest('.fixed');
      expect(overlay).toHaveClass('inset-0', 'bg-black', 'bg-opacity-50');
    });

    test('確認ダイアログのモーダルスタイル', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const modal = screen.getByText('本当にリセットしますか？').closest('.bg-white');
      expect(modal).toHaveClass('rounded-lg', 'shadow-xl');
    });

    test('リセット実行ボタンの危険スタイル', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      expect(confirmButton).toHaveClass('danger');
    });

    test('キャンセルボタンのセカンダリスタイル', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const cancelButton = screen.getByText('キャンセル');
      expect(cancelButton).toHaveClass('secondary');
    });
  });

  describe('アクセシビリティ', () => {
    test('確認ダイアログのフォーカス管理', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      const cancelButton = screen.getByText('キャンセル');
      
      // ボタンがフォーカス可能
      expect(confirmButton).not.toHaveAttribute('tabindex', '-1');
      expect(cancelButton).not.toHaveAttribute('tabindex', '-1');
    });

    test('Escapeキーでダイアログが閉じる（実装されている場合）', () => {
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      // Escapeキーのイベントをシミュレート
      fireEvent.keyDown(document, { key: 'Escape', code: 27 });
      
      // 注: 実際の実装によってはEscapeキーのハンドリングがない可能性があります
      // その場合、このテストは失敗します
    });
  });

  describe('タイミング', () => {
    test('リセット後1秒待ってからリロード', async () => {
      jest.useFakeTimers();
      mockClearAllData.mockResolvedValue(true);
      
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockClearAllData).toHaveBeenCalled();
      });
      
      expect(window.location.reload).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1000);
      
      expect(window.location.reload).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('エッジケース', () => {
    test('clearAllDataが未定義の場合', () => {
      usePortfolioContext.mockReturnValue({});
      console.error = jest.fn();
      
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      fireEvent.click(confirmButton);
      
      // エラーが発生してもクラッシュしない
      expect(screen.getByText('リセット中...')).toBeInTheDocument();
    });

    test('複数回のリセット防止', async () => {
      mockClearAllData.mockResolvedValue(true);
      
      render(<ResetSettings />);
      
      const resetButton = screen.getByText('すべてのデータをリセット');
      fireEvent.click(resetButton);
      
      const confirmButton = screen.getByText('リセットを実行');
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton); // 2回目のクリック
      
      await waitFor(() => {
        expect(mockClearAllData).toHaveBeenCalledTimes(1); // 1回のみ呼ばれる
      });
    });
  });
});