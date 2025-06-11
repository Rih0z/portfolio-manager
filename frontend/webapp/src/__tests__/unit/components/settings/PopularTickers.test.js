/**
 * PopularTickers.jsx のテストファイル
 * 人気銘柄の一括追加機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PopularTickers from '../../../../components/settings/PopularTickers';

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
      '1655': '日経225 ETF',
      '1343': 'TOPIX ETF',
      '7203': 'トヨタ自動車',
      '6758': 'ソニーグループ',
      '6861': 'キーエンス',
      '0331418A': 'eMAXIS Slim 米国株式(S&P500)',
      '03311187': 'SBI・V・S&P500インデックス・ファンド',
      '0331119A': 'eMAXIS Slim 全世界株式',
      '9C31116A': 'ニッセイ外国株式インデックスファンド',
      '89311199': '楽天・全米株式インデックス・ファンド',
      '9I311179': '楽天・全世界株式インデックス・ファンド'
    };
    return names[ticker] || ticker;
  })
}));

describe('PopularTickers Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
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
      render(<PopularTickers />);
      
      expect(screen.getByText('人気銘柄から選択')).toBeInTheDocument();
      expect(screen.getByText('米国ETF')).toBeInTheDocument();
      expect(screen.getByText('日本ETF')).toBeInTheDocument();
      expect(screen.getByText('米国個別株')).toBeInTheDocument();
      expect(screen.getByText('日本個別株')).toBeInTheDocument();
    });

    test('デフォルトで米国ETFカテゴリが選択されている', () => {
      render(<PopularTickers />);
      
      const usEtfButton = screen.getByText('米国ETF');
      expect(usEtfButton).toHaveClass('bg-primary', 'text-white');
    });

    test('米国ETFの銘柄が表示される', () => {
      render(<PopularTickers />);
      
      expect(screen.getByText('VTI')).toBeInTheDocument();
      expect(screen.getByText('バンガード・トータル・ストック・マーケットETF')).toBeInTheDocument();
      expect(screen.getByText('VOO')).toBeInTheDocument();
      expect(screen.getByText('バンガード・S&P 500 ETF')).toBeInTheDocument();
    });
  });

  describe('カテゴリ切り替え', () => {
    test('日本ETFカテゴリへの切り替え', () => {
      render(<PopularTickers />);
      
      const jpEtfButton = screen.getByText('日本ETF');
      fireEvent.click(jpEtfButton);
      
      expect(jpEtfButton).toHaveClass('bg-primary', 'text-white');
      expect(screen.getByText('2557')).toBeInTheDocument();
      expect(screen.getByText('S&P500 ETF')).toBeInTheDocument();
    });

    test('米国個別株カテゴリへの切り替え', () => {
      render(<PopularTickers />);
      
      const usStockButton = screen.getByText('米国個別株');
      fireEvent.click(usStockButton);
      
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
    });

    test('日本個別株カテゴリへの切り替え', () => {
      render(<PopularTickers />);
      
      const jpStockButton = screen.getByText('日本個別株');
      fireEvent.click(jpStockButton);
      
      expect(screen.getByText('7203')).toBeInTheDocument();
      expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
      expect(screen.getByText('6758')).toBeInTheDocument();
      expect(screen.getByText('ソニーグループ')).toBeInTheDocument();
    });
  });

  describe('銘柄追加機能', () => {
    test('新規銘柄の追加成功', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<PopularTickers />);
      
      const addButton = screen.getAllByText('+')[0]; // VOOの追加ボタン
      fireEvent.click(addButton);
      
      expect(addButton).toBeDisabled();
      
      await waitFor(() => {
        expect(mockAddAsset).toHaveBeenCalledWith('VOO');
        expect(screen.getByText('VOO を追加しました')).toBeInTheDocument();
      });
    });

    test('既存銘柄は追加済みと表示される', () => {
      render(<PopularTickers />);
      
      // VTIは既に追加されている
      const vtiCard = screen.getByText('VTI').closest('.border');
      const addedButton = vtiCard.querySelector('button');
      
      expect(addedButton).toHaveTextContent('追加済み');
      expect(addedButton).toBeDisabled();
    });

    test('追加後は追加済み状態になる', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<PopularTickers />);
      
      const addButton = screen.getAllByText('+')[0]; // VOOの追加ボタン
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(addButton).toHaveTextContent('追加済み');
        expect(addButton).toBeDisabled();
      });
    });

    test('追加失敗時のエラー表示', async () => {
      mockAddAsset.mockResolvedValue({ success: false, error: 'APIエラー' });
      
      render(<PopularTickers />);
      
      const addButton = screen.getAllByText('+')[0];
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('追加に失敗しました: APIエラー')).toBeInTheDocument();
      });
    });

    test('ネットワークエラー時の処理', async () => {
      mockAddAsset.mockRejectedValue(new Error('Network error'));
      
      render(<PopularTickers />);
      
      const addButton = screen.getAllByText('+')[0];
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('日本株名の表示', () => {
    test('日本ETFの正しい表示', () => {
      render(<PopularTickers />);
      
      const jpEtfButton = screen.getByText('日本ETF');
      fireEvent.click(jpEtfButton);
      
      expect(screen.getByText('S&P500 ETF')).toBeInTheDocument();
      expect(screen.getByText('日経225 ETF')).toBeInTheDocument();
      expect(screen.getByText('TOPIX ETF')).toBeInTheDocument();
    });

    test('日本個別株の正しい表示', () => {
      render(<PopularTickers />);
      
      const jpStockButton = screen.getByText('日本個別株');
      fireEvent.click(jpStockButton);
      
      expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
      expect(screen.getByText('ソニーグループ')).toBeInTheDocument();
      expect(screen.getByText('キーエンス')).toBeInTheDocument();
    });
  });

  describe('メッセージ表示', () => {
    test('成功メッセージの自動消去', async () => {
      jest.useFakeTimers();
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<PopularTickers />);
      
      const addButton = screen.getAllByText('+')[0];
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('VOO を追加しました')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('VOO を追加しました')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });

  describe('ローディング状態', () => {
    test('追加中はローディング状態になる', async () => {
      mockAddAsset.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );
      
      render(<PopularTickers />);
      
      const addButton = screen.getAllByText('+')[0];
      fireEvent.click(addButton);
      
      expect(addButton).toBeDisabled();
      
      await waitFor(() => {
        expect(addButton).toHaveTextContent('追加済み');
      });
    });

    test('カテゴリ切り替え時のローディング状態がリセットされる', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<PopularTickers />);
      
      // VOOを追加
      const addButton = screen.getAllByText('+')[0];
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(addButton).toHaveTextContent('追加済み');
      });
      
      // カテゴリを切り替え
      const jpEtfButton = screen.getByText('日本ETF');
      fireEvent.click(jpEtfButton);
      
      // カテゴリが切り替わっても追加済み状態は保持される（2557は既に追加済み）
      const addedButton = screen.getByText('追加済み');
      expect(addedButton).toBeDisabled();
    });
  });

  describe('エッジケース', () => {
    test('currentAssetsが空の場合', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: []
      });
      
      render(<PopularTickers />);
      
      // すべての銘柄が追加可能
      const addButtons = screen.getAllByText('+');
      expect(addButtons.length).toBeGreaterThan(0);
      addButtons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });

    test('currentAssetsがnullの場合', () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: null
      });
      
      render(<PopularTickers />);
      
      // エラーなく表示される
      expect(screen.getByText('人気銘柄から選択')).toBeInTheDocument();
    });

    test('複数の銘柄を連続で追加', async () => {
      mockAddAsset.mockResolvedValue({ success: true });
      
      render(<PopularTickers />);
      
      const addButtons = screen.getAllByText('+');
      
      // 複数のボタンをクリック
      fireEvent.click(addButtons[0]);
      fireEvent.click(addButtons[1]);
      
      await waitFor(() => {
        expect(mockAddAsset).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('UI/UX', () => {
    test('カテゴリボタンのスタイル', () => {
      render(<PopularTickers />);
      
      const activeButton = screen.getByText('米国ETF');
      const inactiveButton = screen.getByText('日本ETF');
      
      expect(activeButton).toHaveClass('bg-primary', 'text-white');
      expect(inactiveButton).toHaveClass('bg-gray-200');
    });

    test('銘柄カードのホバー効果', () => {
      render(<PopularTickers />);
      
      const tickerCards = screen.getAllByText(/VTI|VOO|QQQ/).map(el => 
        el.closest('.border')
      );
      
      tickerCards.forEach(card => {
        expect(card).toHaveClass('hover:bg-gray-50', 'transition-colors');
      });
    });

    test('追加ボタンのスタイル', () => {
      render(<PopularTickers />);
      
      const addButton = screen.getAllByText('+')[0];
      expect(addButton).toHaveClass('bg-primary', 'text-white', 'hover:bg-primary-dark');
      
      const addedButton = screen.getByText('追加済み');
      expect(addedButton).toHaveClass('bg-gray-300', 'text-gray-500');
    });
  });
});