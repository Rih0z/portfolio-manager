/**
 * TickerSearch.jsx のテストファイル
 * ティッカー検索・追加機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TickerSearch from '../../../../components/settings/TickerSearch';

// usePortfolioContextフックのモック
const mockAddAsset = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// japaneseStockNamesのモック
jest.mock('../../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: jest.fn((ticker) => {
    const names = {
      '2557': 'S&P500 ETF',
      '7203': 'トヨタ自動車',
      '9984': 'ソフトバンクグループ'
    };
    return names[ticker] || null;
  })
}));

describe('TickerSearch Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  const { getJapaneseStockName } = require('../../../../utils/japaneseStockNames');
  
  const defaultMockData = {
    addAsset: mockAddAsset,
    currentAssets: [
      { id: '1', ticker: 'VTI', name: '米国株式ETF' },
      { id: '2', ticker: '2557', name: 'S&P500 ETF' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<TickerSearch />);
      
      expect(screen.getByText('銘柄検索・追加')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)')).toBeInTheDocument();
      expect(screen.getByText('追加')).toBeInTheDocument();
      expect(screen.getByText('米国株: VTI, VOO, QQQ')).toBeInTheDocument();
      expect(screen.getByText('日本株: 2557, 1655, 7203')).toBeInTheDocument();
    });
  });

  describe('入力機能', () => {
    test('ティッカーシンボルの入力', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      
      expect(input).toHaveValue('AAPL');
    });

    test('大文字への自動変換', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      fireEvent.change(input, { target: { value: 'aapl' } });
      
      expect(input).toHaveValue('AAPL');
    });

    test('空白の自動除去', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      fireEvent.change(input, { target: { value: ' VTI ' } });
      
      expect(input).toHaveValue('VTI');
    });

    test('Enterキーでの追加', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });
      
      await waitFor(() => {
        expect(mockAddAsset).toHaveBeenCalledWith('AAPL');
      });
    });
  });

  describe('追加機能', () => {
    test('新規銘柄の追加成功', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.click(addButton);
      
      expect(addButton).toBeDisabled();
      expect(addButton).toHaveTextContent('追加中...');
      
      await waitFor(() => {
        expect(mockAddAsset).toHaveBeenCalledWith('AAPL');
        expect(screen.getByText('銘柄を追加しました')).toBeInTheDocument();
        expect(input).toHaveValue('');
      });
    });

    test('日本株の追加（日本語名付き）', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: '7203' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockAddAsset).toHaveBeenCalledWith('7203');
        expect(screen.getByText('トヨタ自動車 (7203) を追加しました')).toBeInTheDocument();
      });
    });

    test('既存銘柄の重複エラー', async () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'VTI' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockAddAsset).not.toHaveBeenCalled();
        expect(screen.getByText('この銘柄は既に追加されています')).toBeInTheDocument();
      });
    });

    test('空のティッカーでの追加防止', async () => {
      render(<TickerSearch />);
      
      const addButton = screen.getByText('追加');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockAddAsset).not.toHaveBeenCalled();
        expect(screen.getByText('ティッカーシンボルを入力してください')).toBeInTheDocument();
      });
    });

    test('追加失敗時のエラー表示', async () => {
      mockAddAsset.mockResolvedValue({ success: false, error: 'APIエラー' });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'INVALID' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('追加に失敗しました: APIエラー')).toBeInTheDocument();
      });
    });

    test('ネットワークエラー時の処理', async () => {
      mockAddAsset.mockRejectedValue(new Error('Network error'));
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('メッセージ表示', () => {
    test('成功メッセージの自動消去', async () => {
      jest.useFakeTimers();
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('銘柄を追加しました')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(screen.queryByText('銘柄を追加しました')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    test('エラーメッセージの自動消去', async () => {
      jest.useFakeTimers();
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'VTI' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('この銘柄は既に追加されています')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(screen.queryByText('この銘柄は既に追加されています')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });

  describe('入力例の表示', () => {
    test('米国株と日本株の例が表示される', () => {
      render(<TickerSearch />);
      
      expect(screen.getByText('米国株: VTI, VOO, QQQ')).toBeInTheDocument();
      expect(screen.getByText('日本株: 2557, 1655, 7203')).toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    test('特殊文字の除去', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      fireEvent.change(input, { target: { value: 'VTI@#$' } });
      
      // 特殊文字が除去されることを期待
      expect(input).toHaveValue('VTI');
    });

    test('数字のみの入力（日本株）', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: '1234' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(mockAddAsset).toHaveBeenCalledWith('1234');
      });
    });

    test('大文字小文字の混在', () => {
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      fireEvent.change(input, { target: { value: 'VtI' } });
      
      expect(input).toHaveValue('VTI');
    });
  });

  describe('ローディング状態', () => {
    test('追加中はボタンが無効化される', async () => {
      mockAddAsset.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.click(addButton);
      
      expect(addButton).toBeDisabled();
      expect(addButton).toHaveTextContent('追加中...');
      
      await waitFor(() => {
        expect(addButton).not.toBeDisabled();
        expect(addButton).toHaveTextContent('追加');
      });
    });

    test('ローディング中は入力が無効化される', async () => {
      mockAddAsset.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'AAPL' } });
      fireEvent.click(addButton);
      
      expect(input).toBeDisabled();
      
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('エッジケース', () => {
    test('日本語名が取得できない場合', async () => {
      getJapaneseStockName.mockReturnValue(null);
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: '9999' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('銘柄を追加しました')).toBeInTheDocument();
      });
    });

    test('currentAssetsが空の場合', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: []
      });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'VTI' } });
      fireEvent.click(addButton);
      
      expect(mockAddAsset).toHaveBeenCalledWith('VTI');
    });

    test('currentAssetsがnullの場合', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: null
      });
      
      render(<TickerSearch />);
      
      const input = screen.getByPlaceholderText('ティッカーシンボル (例: VTI, 2557)');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'VTI' } });
      fireEvent.click(addButton);
      
      expect(mockAddAsset).toHaveBeenCalledWith('VTI');
    });
  });
});