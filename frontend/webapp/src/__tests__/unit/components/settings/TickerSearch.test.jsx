/**
 * TickerSearch.jsx のテストファイル
 * ティッカーシンボル検索・追加コンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TickerSearch from '../../../../components/settings/TickerSearch';

// usePortfolioContextのモック
const mockUsePortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockUsePortfolioContext()
}));

// japaneseStockNamesのモック
jest.mock('../../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: jest.fn((ticker) => {
    const names = {
      '7203': 'トヨタ自動車',
      '9984': 'ソフトバンクグループ',
      '0331418A': 'eMAXIS Slim 米国株式(S&P500)',
      '03311187': 'eMAXIS Slim 全世界株式(オール・カントリー)'
    };
    return names[ticker] || '未知の銘柄';
  })
}));

// setTimeout のモック
jest.useFakeTimers();

describe('TickerSearch', () => {
  const mockAddTicker = jest.fn();
  
  const defaultPortfolioContext = {
    addTicker: mockAddTicker
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePortfolioContext.mockReturnValue(defaultPortfolioContext);
  });

  describe('基本レンダリング', () => {
    test('ティッカー検索フォームが表示される', () => {
      render(<TickerSearch />);
      
      expect(screen.getByPlaceholderText('例: AAPL, 7203.T')).toBeInTheDocument();
      expect(screen.getByText('追加')).toBeInTheDocument();
    });

    test('銘柄例が表示される', () => {
      render(<TickerSearch />);
      
      expect(screen.getByText('米国株:')).toBeInTheDocument();
      expect(screen.getByText('日本株:')).toBeInTheDocument();
      expect(screen.getByText('投資信託:')).toBeInTheDocument();
      
      expect(screen.getByText('AAPL (アップル), MSFT (マイクロソフト)')).toBeInTheDocument();
      expect(screen.getByText(/7203\.T \(トヨタ自動車\), 9984\.T \(ソフトバンクグループ\)/)).toBeInTheDocument();
      expect(screen.getByText(/0331418A \(eMAXIS Slim 米国株式\(S&P500\)\)/)).toBeInTheDocument();
    });

    test('入力フィールドに適切な属性が設定される', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveClass('flex-1', 'p-2', 'border', 'rounded-l');
    });

    test('追加ボタンに適切な属性が設定される', () => {
      render(<TickerSearch />);
      
      const button = screen.getByText('追加');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveClass('p-2', 'rounded-r', 'bg-blue-600', 'hover:bg-blue-700', 'text-white');
    });
  });

  describe('入力処理', () => {
    test('ティッカーシンボルを入力できる', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      
      expect(input).toHaveValue('AAPL');
    });

    test('小文字のティッカーシンボルを入力できる', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'aapl' } });
      
      expect(input).toHaveValue('aapl');
    });

    test('数字を含むティッカーシンボルを入力できる', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: '7203.T' } });
      
      expect(input).toHaveValue('7203.T');
    });
  });

  describe('バリデーション', () => {
    test('空の入力でフォーム送信するとエラーメッセージが表示される', () => {
      render(<TickerSearch />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText('ティッカーシンボルを入力してください')).toBeInTheDocument();
    });

    test('空白のみの入力でフォーム送信するとエラーメッセージが表示される', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: '   ' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText('ティッカーシンボルを入力してください')).toBeInTheDocument();
    });

    test('無効な文字を含むティッカーでエラーメッセージが表示される', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'INVALID@TICKER' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText('無効なティッカーシンボル形式です')).toBeInTheDocument();
    });

    test('21文字以上のティッカーでエラーメッセージが表示される', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'VERYLONGTICKERSYMBOL12345' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      expect(screen.getByText('無効なティッカーシンボル形式です')).toBeInTheDocument();
    });

    test('有効なティッカーシンボル（ハイフン含む）が受け入れられる', async () => {
      mockAddTicker.mockResolvedValue({ success: true, message: '追加成功' });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'BRK-A' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockAddTicker).toHaveBeenCalledWith('BRK-A');
      });
    });

    test('有効なティッカーシンボル（ドット含む）が受け入れられる', async () => {
      mockAddTicker.mockResolvedValue({ success: true, message: '追加成功' });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: '7203.T' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockAddTicker).toHaveBeenCalledWith('7203.T');
      });
    });

    test('有効なティッカーシンボル（キャレット含む）が受け入れられる', async () => {
      mockAddTicker.mockResolvedValue({ success: true, message: '追加成功' });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: '^VIX' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockAddTicker).toHaveBeenCalledWith('^VIX');
      });
    });
  });

  describe('銘柄追加処理', () => {
    test('正常な銘柄追加が成功する', async () => {
      mockAddTicker.mockResolvedValue({ 
        success: true, 
        message: 'AAPL を追加しました' 
      });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'aapl' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockAddTicker).toHaveBeenCalledWith('AAPL');
        expect(screen.getByText('AAPL を追加しました')).toBeInTheDocument();
      });
    });

    test('銘柄追加成功後に入力フィールドがクリアされる', async () => {
      mockAddTicker.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('銘柄追加が失敗した場合にエラーメッセージが表示される', async () => {
      mockAddTicker.mockResolvedValue({ 
        success: false, 
        message: '銘柄が見つかりません' 
      });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'INVALID' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('銘柄が見つかりません')).toBeInTheDocument();
      });
    });

    test('addTicker例外発生時にエラーメッセージが表示される', async () => {
      mockAddTicker.mockRejectedValue(new Error('Network error'));
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('銘柄の追加中にエラーが発生しました')).toBeInTheDocument();
      });
    });

    test('成功時のデフォルトメッセージが表示される', async () => {
      mockAddTicker.mockResolvedValue({ success: true }); // messageなし
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('銘柄を追加しました')).toBeInTheDocument();
      });
    });

    test('失敗時のデフォルトメッセージが表示される', async () => {
      mockAddTicker.mockResolvedValue({ success: false }); // messageなし
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'INVALID' } });
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('銘柄の追加に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('ローディング状態', () => {
    test('追加処理中はローディング状態になる', async () => {
      let resolveAddTicker;
      mockAddTicker.mockReturnValue(new Promise(resolve => {
        resolveAddTicker = resolve;
      }));
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      const button = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.submit(screen.getByRole('form'));
      
      // ローディング状態の確認
      expect(screen.getByText('検索中...')).toBeInTheDocument();
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
      expect(button).toHaveClass('bg-gray-400', 'cursor-not-allowed');
      
      // Promise を解決
      resolveAddTicker({ success: true });
      
      await waitFor(() => {
        expect(screen.getByText('追加')).toBeInTheDocument();
      });
    });

    test('ローディング完了後に通常状態に戻る', async () => {
      mockAddTicker.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      const button = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.submit(screen.getByRole('form'));
      
      await waitFor(() => {
        expect(screen.getByText('追加')).toBeInTheDocument();
        expect(input).not.toBeDisabled();
        expect(button).not.toBeDisabled();
        expect(button).toHaveClass('bg-blue-600');
      });
    });
  });

  describe('メッセージ表示', () => {
    test('成功メッセージが正しいスタイルで表示される', async () => {
      mockAddTicker.mockResolvedValue({ success: true, message: '追加成功' });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.submit(screen.getByRole('form'));
      
      await waitFor(() => {
        const message = screen.getByText('追加成功');
        expect(message).toHaveClass('bg-green-100', 'text-green-700');
      });
    });

    test('エラーメッセージが正しいスタイルで表示される', () => {
      render(<TickerSearch />);
      
      fireEvent.submit(screen.getByRole('form'));
      
      const message = screen.getByText('ティッカーシンボルを入力してください');
      expect(message).toHaveClass('bg-red-100', 'text-red-700');
    });

    test('メッセージが5秒後に自動的に消える', async () => {
      mockAddTicker.mockResolvedValue({ success: true, message: '追加成功' });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.submit(screen.getByRole('form'));
      
      await waitFor(() => {
        expect(screen.getByText('追加成功')).toBeInTheDocument();
      });
      
      // 5秒経過
      jest.advanceTimersByTime(5000);
      
      expect(screen.queryByText('追加成功')).not.toBeInTheDocument();
    });
  });

  describe('フォーム送信', () => {
    test('Enterキーでフォーム送信される', async () => {
      mockAddTicker.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(mockAddTicker).toHaveBeenCalledWith('AAPL');
      });
    });

    test('追加ボタンクリックでフォーム送信される', async () => {
      mockAddTicker.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      const button = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockAddTicker).toHaveBeenCalledWith('AAPL');
      });
    });
  });

  describe('日本株名取得機能', () => {
    test('日本株の企業名が正しく表示される', () => {
      render(<TickerSearch />);
      
      expect(screen.getByText(/7203\.T \(トヨタ自動車\)/)).toBeInTheDocument();
      expect(screen.getByText(/9984\.T \(ソフトバンクグループ\)/)).toBeInTheDocument();
    });

    test('投資信託の名前が正しく表示される', () => {
      render(<TickerSearch />);
      
      expect(screen.getByText(/0331418A \(eMAXIS Slim 米国株式\(S&P500\)\)/)).toBeInTheDocument();
      expect(screen.getByText(/03311187 \(eMAXIS Slim 全世界株式\(オール・カントリー\)\)/)).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    test('addTickerが存在しない場合でもエラーが発生しない', () => {
      mockUsePortfolioContext.mockReturnValue({
        addTicker: undefined
      });

      expect(() => {
        render(<TickerSearch />);
      }).not.toThrow();
    });

    test('console.errorが呼ばれることを確認する', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockAddTicker.mockRejectedValue(new Error('Network error'));
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.submit(screen.getByRole('form'));
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Add ticker error:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('アクセシビリティ', () => {
    test('フォームにrole属性が設定される', () => {
      render(<TickerSearch />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    test('入力フィールドにplaceholder属性が設定される', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      expect(input).toHaveAttribute('placeholder', '例: AAPL, 7203.T');
    });

    test('ボタンにtype属性が設定される', () => {
      render(<TickerSearch />);
      
      const button = screen.getByText('追加');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('エッジケース', () => {
    test('非常に長い入力値でも処理される', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      const longValue = 'A'.repeat(100);
      
      fireEvent.change(input, { target: { value: longValue } });
      expect(input).toHaveValue(longValue);
    });

    test('特殊文字を含む入力でも適切にバリデーションされる', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'TICKER!@#$%' } });
      fireEvent.submit(screen.getByRole('form'));
      
      expect(screen.getByText('無効なティッカーシンボル形式です')).toBeInTheDocument();
    });

    test('空白文字が含まれる入力でも適切にバリデーションされる', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
      fireEvent.change(input, { target: { value: 'AAP L' } });
      fireEvent.submit(screen.getByRole('form'));
      
      expect(screen.getByText('無効なティッカーシンボル形式です')).toBeInTheDocument();
    });
  });
});